import { describe, test, expect } from 'bun:test';
import {
	StringTransformer,
	NumberTransformer,
	BooleanTransformer,
} from '@/transformers/primitive.transformer';

describe('Transformer Coverage: Primitives', () => {
	const className = 'TestClass';
	const propertyKey = 'testProp';

	describe('StringTransformer', () => {
		test('should deserialize valid string', () => {
			expect(
				StringTransformer.deserialize('ok', propertyKey, className)
			).toBe('ok');
		});
		test('should throw error for invalid type', () => {
			expect(() => {
				StringTransformer.deserialize(123, propertyKey, className);
			}).toThrow(/Expected string/);
		});
		test('should validate valid string', () => {
			expect(StringTransformer.validate('ok', {} as any).isValid).toBe(
				true
			);
		});
		test('should fail valudation for invalid type', () => {
			expect(StringTransformer.validate(null, {} as any).isValid).toBe(
				false
			);
		});
		test('should serialize valid string', () => {
			expect(StringTransformer.serialize('ok')).toBe('ok');
		});
	});

	describe('NumberTransformer', () => {
		test('should deserialize valid number', () => {
			expect(
				NumberTransformer.deserialize(123, propertyKey, className)
			).toBe(123);
		});
		test('should throw error for invalid type', () => {
			expect(() => {
				NumberTransformer.deserialize('123', propertyKey, className);
			}).toThrow(/Expected number/);
		});
		test('should validate valid number', () => {
			expect(NumberTransformer.validate(123, {} as any).isValid).toBe(
				true
			);
		});
	});

	describe('BooleanTransformer', () => {
		test('should deserialize valid boolean', () => {
			expect(
				BooleanTransformer.deserialize(true, propertyKey, className)
			).toBe(true);
		});
		test('should throw error for invalid type', () => {
			expect(() => {
				BooleanTransformer.deserialize(1, propertyKey, className);
			}).toThrow(/Expected boolean/);
		});
		test('should validate valid boolean', () => {
			expect(BooleanTransformer.validate(false, {} as any).isValid).toBe(
				true
			);
		});
	});
});
