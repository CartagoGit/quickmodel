import { describe, test, expect } from 'bun:test';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';

describe('Transformer Coverage: TypedArray (BigInt)', () => {
	const propertyKey = 'testProp';
	const className = 'TestClass';

	// Test with BigInt64Array
	const transformer = new TypedArrayTransformer(BigInt64Array);

	describe('deserialize bigInt array', () => {
		test('should return instance as-is', () => {
			const arr = new BigInt64Array([1n, 2n]);
			const result = transformer.deserialize(arr, propertyKey, className);
			expect(result).toBe(arr);
		});

		test('should deserialize from string array', () => {
			const arr = ['1', '9007199254740991'];
			const result = transformer.deserialize(arr, propertyKey, className);
			expect(result).toBeInstanceOf(BigInt64Array);
			expect(result![0]).toBe(1n);
			expect(result![1]).toBe(9007199254740991n);
		});

		test('should deserialize from number array', () => {
			const arr = [1, 2];
			const result = transformer.deserialize(arr, propertyKey, className);
			expect(result![0]).toBe(1n);
		});

		test('should handle null/undefined/empty string as 0n', () => {
			const arr = ['10', null, undefined, '', '20'];
			const result = transformer.deserialize(
				arr as unknown as string[],
				propertyKey,
				className
			);
			expect(result![0]).toBe(10n);
			expect(result![1]).toBe(0n);
			expect(result![2]).toBe(0n);
			expect(result![3]).toBe(0n);
			expect(result![4]).toBe(20n);
		});

		test('should handle invalid strings as 0n', () => {
			const arr = ['valid', 'foo', '123'];
			// 'foo' throws in BigInt('foo'), catch should return 0n
			const result = transformer.deserialize(arr, propertyKey, className);
			expect(result![0]).toBe(0n);
			expect(result![1]).toBe(0n);
			expect(result![2]).toBe(123n);
		});

		test('should deserialize from object values', () => {
			const obj = { '0': '10', '1': '20' };
			const result = transformer.deserialize(
				obj as unknown as Record<number, number>,
				propertyKey,
				className
			);
			// Object.values order is not strict but for numeric keys usually is
			// Just checking it returns a BigInt64Array with values
			expect(result).toBeInstanceOf(BigInt64Array);
			expect(result!.length).toBe(2);
		});
	});

	describe('serialize bigInt array', () => {
		test('should serialize to string array', () => {
			const arr = new BigInt64Array([10n, 9007199254740991n]);
			const result = transformer.serialize(arr);
			expect(result).toEqual(['10', '9007199254740991']);
		});
	});

	describe('validate', () => {
		test('should validate instance', () => {
			expect(
				transformer.checkIntegrity(new BigInt64Array(), {
					propertyKey,
					target: {},
				}).isValid
			).toBe(true);
		});
		test('should validate array', () => {
			expect(
				transformer.checkIntegrity([], { propertyKey, target: {} })
					.isValid
			).toBe(true);
		});
		test('should validate object (array like)', () => {
			expect(
				transformer.checkIntegrity({}, { propertyKey, target: {} })
					.isValid
			).toBe(true);
		});
		test('should reject invalid primitive', () => {
			expect(
				transformer.checkIntegrity(123, { propertyKey, target: {} })
					.isValid
			).toBe(false);
		});
	});
});
