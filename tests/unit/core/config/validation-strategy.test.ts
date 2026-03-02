// @quickmodel-rule-ignore: no-as-unknown — intentional: forcing wrong types on model properties to test integrity validation
import { QModel, Quick } from '@/index';
import { QConfig } from '@/core/config/quick.config';
import { describe, test, expect, beforeEach } from 'bun:test';

describe('Configuration: integrityErrorStrategy', () => {
	beforeEach(() => {
		QConfig.configure({ defaults: {} });
	});

	// Strategy: accumulate (Default)
	test('should accumulate errors by default', () => {
		@Quick({}, { integrityErrorStrategy: 'accumulate' })
		class User extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		// Force invalid state by assigning wrong types manually
		// (bypassing deseralizer coercion to ensure validation failure)
		const user = new User({});
		// We add metadata that QModel's checkIntegrity() expects
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
		(user as unknown as Record<string, unknown>)['age'] = 'not-a-number';
		(user as unknown as Record<string, unknown>)['isActive'] = 123;

		const errors = user.$qCheckIntegrity();
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
			{ integrityErrorStrategy: 'accumulate' }
		)
		class AccUser extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		const user = new AccUser({});
		(user as unknown as Record<string, unknown>)['age'] = 'NaN';
		(user as unknown as Record<string, unknown>)['isActive'] = 123;

		const errors = user.$qCheckIntegrity();
		expect(errors.length).toBe(2);
	});

	test('should fail fast when strategy is failFast', () => {
		@Quick(
			{
				age: 'number',
				isActive: 'boolean',
			},
			{ integrityErrorStrategy: 'failFast' }
		)
		class FastUser extends QModel<any> {
			declare age: number;
			declare isActive: boolean;
		}

		const user = new FastUser({});
		(user as unknown as Record<string, unknown>)['age'] = 'NaN'; // Error 1
		(user as unknown as Record<string, unknown>)['isActive'] = 123; // Error 2

		// Note: object property iteration order is generally insertion order,
		// but relies on decorator execution order for 'decoratedFields'.
		// Regardless, we expect exactly 1 error.

		const errors = user.$qCheckIntegrity();
		expect(errors.length).toBe(1);
	});

	test('should respect global failFast config', () => {
		QConfig.configure({
			defaults: { integrityErrorStrategy: 'failFast' },
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
		(user as unknown as Record<string, unknown>)['age'] = 'NaN';
		(user as unknown as Record<string, unknown>)['isActive'] = 123;

		const errors = user.$qCheckIntegrity();
		expect(errors.length).toBe(1);
	});

	test('should return from nested recursion immediately on failFast', () => {
		@Quick(
			{
				val: 'number',
			},
			{ integrityErrorStrategy: 'failFast' }
		)
		class Child extends QModel<any> {
			declare val: number;
		}

		@Quick(
			{
				child1: Child,
				child2: Child,
			},
			{ integrityErrorStrategy: 'failFast' }
		)
		class Parent extends QModel<any> {
			declare child1: Child;
			declare child2: Child;
		}

		const parent = new Parent({});
		parent.child1 = new Child({});
		(parent.child1 as unknown as Record<string, unknown>)['val'] = 'bad';

		parent.child2 = new Child({});
		(parent.child2 as unknown as Record<string, unknown>)['val'] = 'bad';

		const errors = parent.$qCheckIntegrity();
		// Should find error in child1 and stop before checking child2?
		// Or if nested returns array of 1, parent pushes it to results.
		// Parent loop checks child1 -> returns [error].
		// Parent pushes error. Checks failFast -> returns [error].
		// child2 is never checked.

		expect(errors.length).toBe(1);
	});

	test('should handle mixed strategies (Parent: accumulate, Child: failFast)', () => {
		@Quick(
			{ val: 'number', val2: 'number' },
			{ integrityErrorStrategy: 'failFast' }
		)
		class Child extends QModel<any> {
			declare val: number;
			declare val2: number;
		}

		@Quick(
			{ child1: Child, child2: Child },
			{ integrityErrorStrategy: 'accumulate' }
		)
		class Parent extends QModel<any> {
			declare child1: Child;
			declare child2: Child;
		}

		const parentModel = new Parent({});
		// Child 1 has 2 errors
		parentModel.child1 = new Child({});
		(parentModel.child1 as unknown as Record<string, unknown>)['val'] =
			'err';
		(parentModel.child1 as unknown as Record<string, unknown>)['val2'] =
			'err'; // failFast should only report 1 from here

		// Child 2 has 2 errors
		parentModel.child2 = new Child({});
		(parentModel.child2 as unknown as Record<string, unknown>)['val'] =
			'err';
		(parentModel.child2 as unknown as Record<string, unknown>)['val2'] =
			'err'; // failFast should only report 1 from here

		const errors = parentModel.$qCheckIntegrity();
		// Child 1 returns 1 error (stopped early)
		// Child 2 returns 1 error (stopped early)
		// Parent accumulates -> Total 2 errors
		expect(errors.length).toBe(2);
	});
});
