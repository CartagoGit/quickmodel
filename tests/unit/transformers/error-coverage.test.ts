import { describe, test, expect } from 'bun:test';
import { ErrorTransformer } from '@/transformers/error.transformer';

describe('Transformer Coverage: ErrorTransformer', () => {
	const transformer = new ErrorTransformer();
	const className = 'TestClass';
	const propertyKey = 'testProp';

	describe('deserialize', () => {
		test('should return Error instance as-is', () => {
			const err = new Error('test');
			const result = transformer.deserialize(err, propertyKey, className);
			expect(result).toBe(err);
		});

		test('should deserialize simple string', () => {
			const msg = 'Something went wrong';
			const result = transformer.deserialize(msg, propertyKey, className);
			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe(msg);
			expect(result.name).toBe('Error'); // Default
		});

		test('should deserialize formatted string "Name: message"', () => {
			const raw = 'TypeError: something is null';
			const result = transformer.deserialize(raw, propertyKey, className);
			expect(result).toBeInstanceOf(Error);
			expect(result.name).toBe('TypeError');
			expect(result.message).toBe('something is null');
		});

		test('should deserialize object with message', () => {
			const obj = { message: 'Simple error' };
			const result = transformer.deserialize(obj, propertyKey, className);
			expect(result.message).toBe('Simple error');
		});

		test('should deserialize full error object', () => {
			const obj = {
				message: 'Complex error',
				name: 'CustomError',
				stack: 'line 1\nline 2',
			};
			const result = transformer.deserialize(obj, propertyKey, className);
			expect(result.message).toBe('Complex error');
			expect(result.name).toBe('CustomError');
			expect(result.stack).toBe('line 1\nline 2');
		});

		test('should throw error for invalid types (number)', () => {
			expect(() => {
				// @ts-expect-error - Testing invalid inputs
				transformer.deserialize(123, propertyKey, className);
			}).toThrow(/Error transformer ONLY accepts/);
		});

		test('should throw error for object without message property', () => {
			expect(() => {
				// @ts-expect-error - Testing invalid inputs
				transformer.deserialize({ foo: 'bar' }, propertyKey, className);
			}).toThrow(/Error transformer ONLY accepts/);
		});

		test('should throw error if message is not string', () => {
			expect(() => {
				// @ts-expect-error - Testing invalid inputs
				transformer.deserialize(
					{ message: 123 },
					propertyKey,
					className
				);
			}).toThrow(/Error object must have 'message' as string/);
		});
	});

	describe('serialize', () => {
		test('should serialize Error to formatted string', () => {
			const err = new TypeError('invalid arg');
			const result = transformer.serialize(err);
			expect(result).toBe('TypeError: invalid arg');
		});
	});

	describe('validate', () => {
		test('should validate Error instance', () => {
			const result = transformer.validate(new Error(), {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should validate string', () => {
			const result = transformer.validate('my error', {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should validate valid object', () => {
			const result = transformer.validate(
				{ message: 'ok' },
				{ propertyKey, target: {} }
			);
			expect(result.isValid).toBe(true);
		});

		test('should fail validation for invalid type', () => {
			const result = transformer.validate(123, {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(false);
		});

		test('should fail validation for object without message', () => {
			const result = transformer.validate(
				{ other: 'prop' },
				{ propertyKey, target: {} }
			);
			expect(result.isValid).toBe(false); // Falla porque no tiene message
			// NOTA: El validate actual no chequea que message sea string, solo que exista 'message' in value.
			// Es suficiente por ahora para un validate rápido.
		});
	});
});
