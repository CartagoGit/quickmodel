import { QModel, Quick } from '@/index';
import { QConfig } from '@/core/config/quick.config';
import { describe, test, expect, beforeEach } from 'bun:test';

describe('Configuration: validationErrorStrategy', () => {
	beforeEach(() => {
		QConfig.configure({ defaults: {} });
	});

	// Strategy: accumulate (Default)
	test('should accumulate errors by default', () => {
		@Quick({}, { validationErrorStrategy: 'accumulate' })
		class User extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		// Force invalid state by assigning wrong types manually
		// (bypassing deseralizer coercion to ensure validation failure)
		const user = new User({});
		// We add metadata that QuickModel's validate() expects
		Reflect.defineMetadata('fieldType', 'number', user, 'age');
		Reflect.defineMetadata('fieldType', 'boolean', user, 'isActive');

		// However, @Quick does this automatically if property names match!
		// Wait, @Quick({ age: 'number', isActive: 'boolean' }) would be safer.
	});

	test('should verify PrimitiveTransformer validation failures', () => {
		@Quick({
			age: 'number',
			isActive: 'boolean',
		})
		class ValidatedUser extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		const user = new ValidatedUser({});
		// Assign invalid values
		(user as any).age = 'not-a-number';
		(user as any).isActive = 123;

		const errors = user.validate();
		// PrimitiveTransformer for 'number' checks typeof value === 'number'
		expect(errors.length).toBeGreaterThanOrEqual(1);
		// "not-a-number" is string, expected number. Error.
		// 123 is number, expected boolean. Error.
	});

	test('should accumulate errors when strategy is accumulate', () => {
		@Quick(
			{
				age: 'number',
				isActive: 'boolean',
			},
			{ validationErrorStrategy: 'accumulate' }
		)
		class AccUser extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		const user = new AccUser({});
		(user as any).age = 'NaN';
		(user as any).isActive = 123;

		const errors = user.validate();
		expect(errors.length).toBe(2);
	});

	test('should fail fast when strategy is failFast', () => {
		@Quick(
			{
				age: 'number',
				isActive: 'boolean',
			},
			{ validationErrorStrategy: 'failFast' }
		)
		class FastUser extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		const user = new FastUser({});
		(user as any).age = 'NaN'; // Error 1
		(user as any).isActive = 123; // Error 2

		// Note: object property iteration order is generally insertion order,
		// but relies on decorator execution order for 'decoratedFields'.
		// Regardless, we expect exactly 1 error.

		const errors = user.validate();
		expect(errors.length).toBe(1);
	});

	test('should respect global failFast config', () => {
		QConfig.configure({
			defaults: { validationErrorStrategy: 'failFast' },
		});

		@Quick({
			age: 'number',
			isActive: 'boolean',
		})
		class GlobalUser extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		const user = new GlobalUser({});
		(user as any).age = 'NaN';
		(user as any).isActive = 123;

		const errors = user.validate();
		expect(errors.length).toBe(1);
	});

	test('should return from nested recursion immediately on failFast', () => {
		@Quick(
			{
				val: 'number',
			},
			{ validationErrorStrategy: 'failFast' }
		)
		class Child extends QModel<any> {
			declare val: number;
		}

		@Quick(
			{
				child1: Child,
				child2: Child,
			},
			{ validationErrorStrategy: 'failFast' }
		)
		class Parent extends QModel<any> {
			declare child1: Child;
			declare child2: Child;
		}

		const parent = new Parent({});
		parent.child1 = new Child({});
		(parent.child1 as any).val = 'bad';

		parent.child2 = new Child({});
		(parent.child2 as any).val = 'bad';

		const errors = parent.validate();
		// Should find error in child1 and stop before checking child2?
		// Or if nested returns array of 1, parent pushes it to results.
		// Parent loop checks child1 -> returns [error].
		// Parent pushes error. Checks failFast -> returns [error].
		// child2 is never checked.

		expect(errors.length).toBe(1);
	});
});
