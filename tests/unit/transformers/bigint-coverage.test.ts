import { describe, test, expect } from 'bun:test';
import { BigIntTransformer } from '@/transformers/bigint.transformer';

describe('Transformer Coverage: BigIntTransformer', () => {
	const transformer = new BigIntTransformer();
	const className = 'TestClass';
	const propertyKey = 'testProp';

	describe('deserialize', () => {
		test('should return bigint as-is', () => {
			const val = 123n;
			const result = transformer.deserialize(val, propertyKey, className);
			expect(result).toBe(val);
		});

		test('should deserialize string to bigint', () => {
			const val = '9007199254740991';
			const result = transformer.deserialize(val, propertyKey, className);
			expect(result).toBe(9007199254740991n);
		});

		test('should deserialize number to bigint', () => {
			const val = 123;
			const result = transformer.deserialize(val, propertyKey, className);
			expect(result).toBe(123n);
		});

		test('should deserialize object wrapper {__type: bigint, value}', () => {
			const val = { __type: 'bigint' as const, value: '123456789' };
			const result = transformer.deserialize(val, propertyKey, className);
			expect(result).toBe(123456789n);
		});

		test('should throw error for invalid types (boolean)', () => {
			expect(() => {
				// @ts-expect-error - Testing invalid inputs
				transformer.deserialize(true, propertyKey, className);
			}).toThrow(/Expected string\/number/);
		});

		test('should ALLOW null', () => {
			// @ts-expect-error - Testing invalid inputs
			const result = transformer.deserialize(null, propertyKey, className);
			expect(result).toBeNull();
		});

		test('should throw error for invalid string format', () => {
			expect(() => {
				transformer.deserialize('not-a-number', propertyKey, className);
			}).toThrow(/Invalid BigInt value/);
		});

		test('should throw error for float string', () => {
			expect(() => {
				transformer.deserialize('123.45', propertyKey, className);
			}).toThrow(/Invalid BigInt value/);
		});
	});

	describe('serialize', () => {
		test('should serialize bigint to string', () => {
			const val = 9007199254740991n;
			const result = transformer.serialize(val);
			expect(result).toBe('9007199254740991');
		});
	});

	describe('validate', () => {
		test('should validate bigint instance', () => {
			const result = transformer.validate(123n, {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should validate numeric string', () => {
			const result = transformer.validate('123456', {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should validate number', () => {
			const result = transformer.validate(123, {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should fail validation for non-numeric string', () => {
			const result = transformer.validate('abc', {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(false);
		});

		test('should fail validation for boolean', () => {
			const result = transformer.validate(true, {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(false);
		});

		test('should fail validation for object', () => {
			const result = transformer.validate(
				{},
				{ propertyKey, target: {} }
			);
			expect(result.isValid).toBe(false);
		});
	});
});
