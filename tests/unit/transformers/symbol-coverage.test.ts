import { describe, test, expect } from 'bun:test';
import { SymbolTransformer } from '@/transformers/symbol.transformer';

describe('Transformer Coverage: SymbolTransformer', () => {
	const transformer = new SymbolTransformer();
	const className = 'TestClass';
	const propertyKey = 'testProp';

	describe('deserialize', () => {
		test('should return symbol instance as-is', () => {
			const sym = Symbol('test');
			const result = transformer.deserialize(sym, propertyKey, className);
			expect(result).toBe(sym);
		});

		test('should deserialize string to global symbol', () => {
			const key = 'my-symbol';
			const result = transformer.deserialize(key, propertyKey, className);
			expect(typeof result).toBe('symbol');
			expect(Symbol.keyFor(result)).toBe(key);
		});

		test('should deserialize object wrapper', () => {
			const obj = { __type: 'symbol' as const, description: 'wrapped' };
			const result = transformer.deserialize(obj, propertyKey, className);
			expect(Symbol.keyFor(result)).toBe('wrapped');
		});

		test('should throw error for invalid types (number)', () => {
			expect(() => {
				transformer.deserialize(123 as any, propertyKey, className);
			}).toThrow(/Symbol transformer ONLY accepts/);
		});

		test('should throw error for object wrapper with invalid description', () => {
			expect(() => {
				transformer.deserialize(
					{ __type: 'symbol', description: 123 } as any,
					propertyKey,
					className
				);
			}).toThrow(/Symbol object must have 'description' as string/);
		});
	});

	describe('serialize', () => {
		test('should serialize global symbol to object with key', () => {
			const sym = Symbol.for('global-key');
			const result = transformer.serialize(sym);
			expect(result).toEqual({
				__type: 'symbol',
				description: 'global-key',
			});
		});

		test('should serialize local symbol using toString', () => {
			const sym = Symbol('local');
			const result = transformer.serialize(sym);
			expect(result.description).toBe('Symbol(local)');
			expect(result.__type).toBe('symbol');
		});
	});

	describe('validate', () => {
		test('should validate symbol', () => {
			const result = transformer.validate(Symbol(), {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should validate string', () => {
			const result = transformer.validate('key', {
				propertyKey,
				target: {},
			});
			expect(result.isValid).toBe(true);
		});

		test('should validate object wrapper', () => {
			const result = transformer.validate(
				{ __type: 'symbol', description: 'ok' },
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
	});
});
