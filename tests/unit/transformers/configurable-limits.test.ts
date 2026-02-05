import { describe, expect, test } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Configurable Transformer Limits', () => {
	// Interface
	interface IData {
		buffer: ArrayBuffer;
	}

	test('should enforce default limit of 1MB for ArrayBuffer', () => {
		@Quick({ buffer: ArrayBuffer })
		class DefaultLimitModel extends QModel<IData> {
			declare buffer: ArrayBuffer;
		}

		// Create data slightly larger than 1MB
		const largeData = new Array(1_000_001).fill(0);

		expect(() => {
			new DefaultLimitModel({ buffer: largeData as any });
		}).toThrow('ArrayBuffer input too large');
	});

	test('should allow custom limit via transformerOptions', () => {
		@Quick(
			{ buffer: ArrayBuffer },
			{
				transformerOptions: {
					buffer: { maxBytes: 2_000_000 }, // Raise limit to 2MB
				},
			}
		)
		class CustomLimitModel extends QModel<IData> {
			declare buffer: ArrayBuffer;
		}

		// Create data larger than default but within custom limit (1.5MB)
		const largeData = new Array(1_500_000).fill(0);

		const instance = new CustomLimitModel({ buffer: largeData as any });
		expect(instance.buffer).toBeInstanceOf(ArrayBuffer);
		expect(instance.buffer.byteLength).toBe(1_500_000);
	});

	test('should still enforce the new custom limit', () => {
		@Quick(
			{ buffer: ArrayBuffer },
			{
				transformerOptions: {
					buffer: { maxBytes: 2_000_000 },
				},
			}
		)
		class CustomLimitModel extends QModel<IData> {
			declare buffer: ArrayBuffer;
		}

		const tooLargeData = new Array(2_000_001).fill(0);
		expect(() => {
			new CustomLimitModel({ buffer: tooLargeData as any });
		}).toThrow('ArrayBuffer input too large');
	});

	test('should support TypedArrays configurable limits', () => {
		interface ITyped {
			data: Uint8Array;
		}

		@Quick(
			{ data: Uint8Array },
			{
				transformerOptions: {
					data: { maxItems: 10 }, // Very small limit for testing
				},
			}
		)
		class SmallLimitModel extends QModel<ITyped> {
			declare data: Uint8Array;
		}

		// Pass 11 items
		expect(() => {
			new SmallLimitModel({
				data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as any,
			});
		}).toThrow('TypedArray input too large');

		// Pass 10 items
		const valid = new SmallLimitModel({
			data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as any,
		});
		expect(valid.data).toBeInstanceOf(Uint8Array);
		expect(valid.data.length).toBe(10);
	});
});
