import { describe, test, expect } from 'bun:test';
import {
	ArrayBufferTransformer,
	DataViewTransformer,
	SharedArrayBufferTransformer,
} from '@/transformers/buffer.transformer';

describe('Unit: Buffer Transformers Coverage', () => {
	const context = { propertyKey: 'testProp', className: 'TestClass' };

	describe('ArrayBufferTransformer', () => {
		const transformer = new ArrayBufferTransformer();

		test('deserialize: should accept number array', () => {
			const input = [1, 2, 3];
			const result = transformer.deserialize(input, 'p', 'C');
			expect(result).toBeInstanceOf(ArrayBuffer);
			expect(result!.byteLength).toBe(3);
			expect(new Uint8Array(result!)[1]).toBe(2);
		});

		test('deserialize: should return same instance', () => {
			const buf = new ArrayBuffer(8);
			expect(transformer.deserialize(buf, 'p', 'C')).toBe(buf);
		});

		test('deserialize: should throw on non-array', () => {
			expect(() => {
				transformer.deserialize(
					'invalid' as unknown as number[],
					'p',
					'C'
				);
			}).toThrow(/Expected array/);
		});

		test('serialize: should return number array', () => {
			const buf = new Uint8Array([10, 20]).buffer;
			expect(transformer.serialize(buf)).toEqual([10, 20]);
		});

		test('validate: should accept valid types', () => {
			expect(
				transformer.checkIntegrity(new ArrayBuffer(1), context).isValid
			).toBe(true);
			expect(transformer.checkIntegrity([1, 2], context).isValid).toBe(
				true
			);
		});

		test('validate: should reject invalid types', () => {
			expect(transformer.checkIntegrity('string', context).isValid).toBe(
				false
			);
			expect(transformer.checkIntegrity(123, context).isValid).toBe(
				false
			);
		});
	});

	describe('DataViewTransformer', () => {
		const transformer = new DataViewTransformer();

		test('deserialize: should accept number array', () => {
			const input = [1, 2, 3];
			const result = transformer.deserialize(input, 'p', 'C');
			expect(result).toBeInstanceOf(DataView);
			expect(result!.byteLength).toBe(3);
		});

		test('deserialize: should accept ArrayBuffer', () => {
			const buf = new ArrayBuffer(4);
			const result = transformer.deserialize(buf, 'p', 'C');
			expect(result).toBeInstanceOf(DataView);
			expect(result!.byteLength).toBe(4);
		});

		test('deserialize: should return same instance', () => {
			const view = new DataView(new ArrayBuffer(4));
			expect(transformer.deserialize(view, 'p', 'C')).toBe(view);
		});

		test('deserialize: should throw on invalid type', () => {
			expect(() => {
				transformer.deserialize(
					'invalid' as unknown as number[],
					'p',
					'C'
				);
			}).toThrow(/Expected array/);
		});

		test('serialize: should return number array', () => {
			const view = new DataView(new Uint8Array([5, 6]).buffer);
			expect(transformer.serialize(view)).toEqual([5, 6]);
		});

		test('validate: should accept valid types', () => {
			expect(
				transformer.checkIntegrity(
					new DataView(new ArrayBuffer(1)),
					context
				).isValid
			).toBe(true);
			expect(
				transformer.checkIntegrity(new ArrayBuffer(1), context).isValid
			).toBe(true);
			expect(transformer.checkIntegrity([], context).isValid).toBe(true);
		});

		test('validate: should reject invalid types', () => {
			expect(transformer.checkIntegrity(123, context).isValid).toBe(
				false
			);
		});
	});

	describe('SharedArrayBufferTransformer', () => {
		const transformer = new SharedArrayBufferTransformer();

		// Check if SharedArrayBuffer is supported in this environment
		const isSupported = typeof SharedArrayBuffer !== 'undefined';

		if (isSupported) {
			test('deserialize: should accept number array', () => {
				const input = [1, 2, 3];
				const result = transformer.deserialize(input, 'p', 'C');
				expect(result).toBeInstanceOf(SharedArrayBuffer);
				expect(result!.byteLength).toBe(3);
			});

			test('deserialize: should return same instance', () => {
				const buf = new SharedArrayBuffer(4);
				expect(transformer.deserialize(buf, 'p', 'C')).toBe(buf);
			});

			test('deserialize: should throw on invalid input', () => {
				expect(() => {
					transformer.deserialize(
						'invalid' as unknown as number[],
						'p',
						'C'
					);
				}).toThrow(/SharedArrayBuffer transformer accepts/);
			});

			test('serialize: should return number array', () => {
				const buf = new SharedArrayBuffer(2);
				const view = new Uint8Array(buf);
				view[0] = 10;
				view[1] = 20;
				expect(transformer.serialize(buf)).toEqual([10, 20]);
			});

			test('validate: should accept valid types', () => {
				expect(
					transformer.checkIntegrity(
						new SharedArrayBuffer(1),
						context
					).isValid
				).toBe(true);
				expect(transformer.checkIntegrity([], context).isValid).toBe(
					true
				);
			});
		}

		test('validate: should reject invalid types', () => {
			expect(transformer.checkIntegrity('bad', context).isValid).toBe(
				false
			);
		});
	});
});
