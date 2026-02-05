import { describe, test, expect } from 'bun:test';
import { PopulationService } from '../../src/core/services/population.service';
import { ValueTransformerService } from '../../src/core/services/value-transformer.service';
import { TransformerLookupService } from '../../src/core/services/transformer-lookup.service';
import { TypedArrayTransformer } from '../../src/transformers/typed-array.transformer';

// Mock Recursive Deserializer
const mockRecursiveDeserializer = {
	deserialize: () => ({}),
	transformValue: (v: any) => v,
} as any;

describe('Core Security Standards', () => {
	// --- Prototype Pollution ---
	describe('Prototype Pollution Prevention', () => {
		test('PopulationService should ignore __proto__ keys', () => {
			const lookup = new TransformerLookupService();
			const valueTransformer = new ValueTransformerService(
				lookup,
				mockRecursiveDeserializer
			);
			const populationService = new PopulationService(
				valueTransformer,
				lookup,
				mockRecursiveDeserializer
			);

			const maliciousPayload = JSON.parse(
				'{"__proto__": {"polluted": true}, "normal": "value"}'
			);
			const targetInstance: any = {};
			class TestModel {}

			populationService.populateInstance(
				targetInstance,
				maliciousPayload,
				TestModel
			);

			// Check that normal property is set
			expect(targetInstance.normal).toBe('value');

			// Check that prototype is NOT polluted
			expect(({} as any).polluted).toBeUndefined();
			expect(
				(Object.prototype as any)['polluted' as any]
			).toBeUndefined();
			expect(targetInstance['polluted']).toBeUndefined();
		});
	});

	// --- Denial of Service (Memory/CPU) ---
	describe('DoS Prevention', () => {
		test('TypedArrayTransformer should enforce MAX_ITEMS limit', () => {
			const transformer = new TypedArrayTransformer(Uint8Array);

			// Create array larger than default 1,000,000 limit
			const bigArray = new Array(1_000_001).fill(0);

			expect(() => {
				transformer.deserialize(bigArray as any, 'prop', 'Test');
			}).toThrow();
		});

		test('TypedArrayTransformer should allow arrays within limit', () => {
			const transformer = new TypedArrayTransformer(Uint8Array);

			const fitArray = new Array(100).fill(0);
			const result = transformer.deserialize(
				fitArray as any,
				'prop',
				'Test'
			);

			expect(result).toBeInstanceOf(Uint8Array);
			expect(result?.length).toBe(100);
		});
	});
});
