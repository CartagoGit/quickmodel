import { describe, test, expect } from 'bun:test';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';

describe('Transformer Coverage: Map & Set', () => {
	const className = 'TestClass';
	const propertyKey = 'testProp';

	describe('MapTransformer', () => {
		const transformer = new MapTransformer<string, unknown>();

		describe('deserialize', () => {
			test('should return Map as-is', () => {
				const map = new Map();
				expect(
					transformer.deserialize(map, propertyKey, className)
				).toBe(map);
			});

			test('should deserialize plain object', () => {
				const obj = { a: 1, b: 2 };
				const result = transformer.deserialize(
					obj,
					propertyKey,
					className
				);
				expect(result).toBeInstanceOf(Map);
				expect(result!.get('a')).toBe(1);
				expect(result!.get('b')).toBe(2);
			});

			test('should deserialize __type wrapper', () => {
				const wrapper = {
					__type: 'Map' as const,
					entries: [['a', 1] as [string, unknown]],
				};
				const result = transformer.deserialize(
					wrapper,
					propertyKey,
					className
				);
				expect(result!.get('a')).toBe(1);
			});

			test('should deserialize array of entries', () => {
				const entries = [
					['a', 1],
					['b', 2],
				] as [string, unknown][];
				const result = transformer.deserialize(
					entries,
					propertyKey,
					className
				);
				expect(result!.get('b')).toBe(2);
			});

			test('should throw error for invalid types', () => {
				expect(() => {
					// @ts-expect-error - testing invalid input
					transformer.deserialize(123, propertyKey, className);
				}).toThrow(/Expected object or array/);
			});

			test('should throw error generic Map creation error in array', () => {
				// Testing that passing invalid array structure triggers the try-catch block
				expect(() => {
					// @ts-expect-error - testing invalid input
					transformer.deserialize([1, 2], propertyKey, className);
					// [1, 2] is array but not array of entries, Map constructor fails with "Iterator value 1 is not an entry object"
				}).toThrow(/Invalid Map data format/);
			});
		});

		describe('serialize', () => {
			test('should serialize to __type wrapper', () => {
				const map = new Map([['key', 'val']]);
				const result = transformer.serialize(map);
				expect(result.__type).toBe('Map');
				expect(result.entries).toEqual([['key', 'val']]);
			});
		});

		describe('validate', () => {
			test('should validate Map', () => {
				expect(
					transformer.validate(new Map(), { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should validate object', () => {
				expect(
					transformer.validate({}, { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should validate array', () => {
				expect(
					transformer.validate([], { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should fail for number', () => {
				expect(
					transformer.validate(123, { propertyKey, target: {} })
						.isValid
				).toBe(false);
			});
		});
	});

	describe('SetTransformer', () => {
		const transformer = new SetTransformer<unknown>();

		describe('deserialize', () => {
			test('should return Set as-is', () => {
				const set = new Set();
				expect(
					transformer.deserialize(set, propertyKey, className)
				).toBe(set);
			});

			test('should deserialize array', () => {
				const arr = [1, 2, 2];
				const result = transformer.deserialize(
					arr,
					propertyKey,
					className
				);
				expect(result).toBeInstanceOf(Set);
				expect(result!.size).toBe(2);
				expect(result!.has(1)).toBe(true);
			});

			test('should deserialize __type wrapper', () => {
				const wrapper = { __type: 'Set' as const, values: [1, 2] };
				const result = transformer.deserialize(
					wrapper,
					propertyKey,
					className
				);
				expect(result!.has(1)).toBe(true);
			});

			test('should throw error for invalid types', () => {
				expect(() => {
					// @ts-expect-error - invalid input
					transformer.deserialize({}, propertyKey, className);
				}).toThrow(/Expected array/);
			});
		});

		describe('serialize', () => {
			test('should serialize to __type wrapper', () => {
				const set = new Set([1, 2]);
				const result = transformer.serialize(set);
				expect(result.__type).toBe('Set');
				expect(result.values).toEqual([1, 2]);
			});
		});

		describe('validate', () => {
			test('should validate Set', () => {
				expect(
					transformer.validate(new Set(), { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should validate array', () => {
				expect(
					transformer.validate([], { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should validate __type wrapper', () => {
				expect(
					transformer.validate(
						{ __type: 'Set', values: [] },
						{ propertyKey, target: {} }
					).isValid
				).toBe(true);
			});
			test('should fail for plain object', () => {
				// Plain object that is not a wrapper
				expect(
					transformer.validate(
						{ foo: 'bar' },
						{ propertyKey, target: {} }
					).isValid
				).toBe(false);
			});
			test('should fail for number', () => {
				expect(
					transformer.validate(123, { propertyKey, target: {} })
						.isValid
				).toBe(false);
			});
		});
	});
});
