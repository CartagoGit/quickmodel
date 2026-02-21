import { describe, it, expect } from 'bun:test';
import { ValidationService } from '../../../src/core/services/validation.service';
import { Quick } from '../../../src/core/decorators/quick.decorator';
import { QTransformerRegistry } from '../../../src/core/registry/transformer.registry';
import type {
	IQTransformer,
	IQValidator,
	IQValidationContext,
	IQValidationResult,
} from '../../../src/core/interfaces/transformer.interface';
import 'reflect-metadata';

describe('ValidationService Coverage Gaps', () => {
	const service = new ValidationService();

	it('should recursively validate nested array of models', () => {
		@Quick({
			name: 'string',
		})
		class Child {
			declare name: string;
		}

		@Quick({
			children: [Child],
		})
		class Parent {
			[key: string]: any; // Index signature for Record compatibility
			declare children: Child[];
		}

		const p = new Parent();
		const c1 = new Child();
		c1.name = 'valid';

		// Simulate an invalid child.
		// We force invalid data that violates 'string' type expectation.
		const cFail = new Child();
		(cFail as any).name = 123; // Error: should be string

		p.children = [cFail];

		// We are testing that validate() called on Parent recursively checks children array elements
		const results = service.validate(p);

		expect(results.length).toBeGreaterThan(0);
		// The service flattens the path: children[0].name
		expect(results).not.toBeNull();
		expect(results[0]?.error).toContain('children[0].name');
	});

	it('should catch errors thrown by validators and return error result', () => {
		// Create a transformer whose validate() always throws to test the catch block.
		// We register it under a unique string key so ValidationService can find it via fieldType.
		const BROKEN_KEY = 'brokenvalidatortype_test_unique';
		const brokenTransformer: IQTransformer<unknown, unknown> & IQValidator =
			{
				deserialize: (v: unknown) => v,
				serialize: (v: unknown) => v,
				validate(
					_value: unknown,
					_ctx: IQValidationContext
				): IQValidationResult {
					throw new Error('validator exploded');
				},
			};

		// Register under a string key — string keys go through fieldType lookup in getTransformer
		QTransformerRegistry.register(BROKEN_KEY, brokenTransformer as any);

		// Using string key in @Quick triggers QType(string) → sets fieldType = BROKEN_KEY
		@Quick({ field: BROKEN_KEY } as any)
		class ModelWithBrokenValidator {
			[key: string]: any;
			declare field: unknown;
		}

		const instance = new ModelWithBrokenValidator();
		(instance as any).field = 'some-value';

		const results = service.validate(instance as any);

		// The service should have caught the error and returned an error result
		expect(results.length).toBeGreaterThan(0);
		expect(
			results.some((r) => r.error?.includes('validator exploded'))
		).toBe(true);
	});
});
