// @quickmodel-rule-ignore: no-as-unknown — intentional: forcing wrong type onto typed field to test integrity check rejection
import { describe, it, expect } from 'bun:test';
import { IntegrityService } from '../../../src/core/services/integrity.service';
import { Quick } from '../../../src/core/decorators/quick.decorator';
import { QTransformerRegistry } from '../../../src/core/registry/transformer.registry';
import type {
	IQTransformer,
	IQIntegrityChecker,
	IQIntegrityContext,
	IQIntegrityResult,
} from '../../../src/core/interfaces/transformer.interface';
import 'reflect-metadata';

describe('IntegrityService Coverage Gaps', () => {
	const service = new IntegrityService();

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

		const parent = new Parent();
		const child1 = new Child();
		child1.name = 'valid';

		// Simulate an invalid child.
		// We force invalid data that violates 'string' type expectation.
		const cFail = new Child();
		// @quickmodel-rule-ignore: no-as-unknown
		(cFail as unknown as Record<string, unknown>)['name'] = 123; // Error: should be string

		parent.children = [cFail];

		// We are testing that checkIntegrity() called on Parent recursively checks children array elements
		const results = service.checkIntegrity(parent);

		expect(results.length).toBeGreaterThan(0);
		// The service flattens the path: children[0].name
		expect(results).not.toBeNull();
		expect(results[0]?.error).toContain('children[0].name');
	});

	it('should catch errors thrown by validators and return error result', () => {
		// Create a transformer whose validate() always throws to test the catch block.
		// We register it under a unique string key so IntegrityService can find it via fieldType.
		const BROKEN_KEY = 'brokenvalidatortype_test_unique';
		const brokenTransformer: IQTransformer<unknown, unknown> &
			IQIntegrityChecker = {
			deserialize: (value: unknown) => value,
			serialize: (value: unknown) => value,
			checkIntegrity(
				_value: unknown,
				_ctx: IQIntegrityContext
			): IQIntegrityResult {
				throw new Error('validator exploded');
			},
		};

		// Register under a string key — string keys go through fieldType lookup in getTransformer
		QTransformerRegistry.register(BROKEN_KEY, brokenTransformer);

		// Using string key in @Quick triggers QType(string) → sets fieldType = BROKEN_KEY
		@Quick({ field: BROKEN_KEY })
		class ModelWithBrokenValidator {
			[key: string]: any;
			declare field: unknown;
		}

		const instance = new ModelWithBrokenValidator();
		instance['field'] = 'some-value';

		const results = service.checkIntegrity(instance);

		// The service should have caught the error and returned an error result
		expect(results.length).toBeGreaterThan(0);
		expect(
			results.some((result) =>
				result.error?.includes('validator exploded')
			)
		).toBe(true);
	});
});
