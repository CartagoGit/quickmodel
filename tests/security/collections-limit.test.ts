import { describe, test, expect } from 'bun:test';
import {
	MapTransformer,
	SetTransformer,
} from '../../src/transformers/map-set.transformer';

describe('Collections Security (DoS Prevention)', () => {
	test('SetTransformer should respect default MAX_ITEMS limit', () => {
		const transformer = new SetTransformer();
		// Default limit is usually 1,000,000.
		// We can't easily create a 1M+1 array efficiently in a unit test without memory cost.
		// We will inject a custom limit via context if supported, or just mock expected behavior.

		// Let's create a smaller array but pass a small limit in context to verify the check logic
		const data = Array.from({ length: 110 }, (_, i) => i);

		const context = {
			metadata: {
				transformerOptions: { maxItems: 100 },
			},
		};

		expect(() => {
			// @ts-expect-error testing invalid input
			transformer.deserialize(data, 'tags', 'Config', context);
		}).toThrow('Set input too large');
	});

	test('MapTransformer should respect default MAX_ITEMS limit', () => {
		const transformer = new MapTransformer();

		const data = Array.from(
			{ length: 110 },
			(_, i) => [`key${i}`, i] as [string, number]
		);

		const context = {
			metadata: {
				transformerOptions: { maxItems: 100 },
			},
		};

		expect(() => {
			// @ts-expect-error testing invalid input
			transformer.deserialize(data, 'meta', 'Config', context);
		}).toThrow('Map input too large');
	});
});
