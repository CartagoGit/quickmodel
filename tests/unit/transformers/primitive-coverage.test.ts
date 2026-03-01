// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, test, expect } from 'bun:test';
import {
	StringTransformer,
	NumberTransformer,
	BooleanTransformer,
} from '@/transformers/primitive.transformer';
import { IQIntegrityContext } from '@/core/interfaces/transformer.interface';

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
			expect(
				StringTransformer.$qCheckIntegrity(
					'ok',
					{} as unknown as IQIntegrityContext // @quickmodel-rule-ignore: no-as-unknown
				).isValid
			).toBe(true);
		});
		test('should ALLOW null (validation passes)', () => {
			expect(
				StringTransformer.$qCheckIntegrity(
					null,
					{} as unknown as IQIntegrityContext // @quickmodel-rule-ignore: no-as-unknown
				).isValid
			).toBe(true);
		});
		test('should serialize valid string', () => {
			expect(StringTransformer.$qSerialize('ok')).toBe('ok');
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
			expect(
				NumberTransformer.$qCheckIntegrity(
					123,
					{} as unknown as IQIntegrityContext // @quickmodel-rule-ignore: no-as-unknown
				).isValid
			).toBe(true);
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
			expect(
				BooleanTransformer.$qCheckIntegrity(
					false,
					{} as unknown as IQIntegrityContext // @quickmodel-rule-ignore: no-as-unknown
				).isValid
			).toBe(true);
		});
	});
});
