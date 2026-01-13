import { describe, it, expect } from 'bun:test';
import 'reflect-metadata';
import { QModel } from '../../../src';
import { QUICK_TYPE_MAP_KEY } from '../../../src/core/constants/metadata-keys';

describe('MockGeneratorService Coverage Gaps', () => {
	it('should handle FALLBACK logic by manually injecting metadata (Simulating legacy or dynamic usage)', () => {
		// We define a bare model without decorators to avoid auto-registration
		class ModelFallback extends QModel<any> {
			declare tags: any[];
			declare val: any;
			declare date: any;
			declare arrSyntax: any[];
		}

		// Inject TypeMap manually to simulate "Quick without QType property registration"
		// This targets the fallback logic in MockGenerator lines 130-160
		Reflect.defineMetadata(
			QUICK_TYPE_MAP_KEY,
			{
				tags: Array, // mappedType === Array
				val: 'bigint', // mappedType === 'string'
				date: Date, // mappedType === function
				arrSyntax: [String], // mappedType === Array (syntax)
			},
			ModelFallback
		);

		// Verify that 'getDecoratedProperties' will pick these up because we have no @QType fields
		// Mocking:
		const mock = ModelFallback.mock().random();

		// Assertions for each fallback case

		// 1. tags: Array -> Should be array
		expect(Array.isArray(mock.tags)).toBe(true);

		// 2. val: 'bigint' -> Should be numeric string (IQSerialized format for BigInt)
		// Since the model has no transformers, it stays as string.
		expect(typeof mock.val).toBe('string');
		expect(/^\d+$/.test(mock.val)).toBe(true);

		// 3. date: Date -> Should be ISO string (IQSerialized format for Date)
		// No transformer -> stays string
		expect(typeof mock.date).toBe('string');
		// Check ISO format roughly
		expect(!isNaN(Date.parse(mock.date))).toBe(true);

		// 4. arrSyntax: [String] -> Should be array of strings (or String objects due to MockGenerator treating String as class)
		expect(Array.isArray(mock.arrSyntax)).toBe(true);
		if (mock.arrSyntax.length > 0) {
			const el = mock.arrSyntax[0];
			console.log('DEBUG element:', el, typeof el, el.constructor.name);
			// It should be object wrappers around strings
			expect(typeof el).toBe('object');
		}
	});
});
