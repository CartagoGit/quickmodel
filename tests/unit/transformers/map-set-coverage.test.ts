// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, test, expect } from 'bun:test';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';
import type { IQIntegrityContext } from '@/core/interfaces/transformer.interface';

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
			test('should serialize to plain object', () => {
				const map = new Map([['key', 'val']]);
				const result = transformer.serialize(map);
				expect(result).toEqual({ key: 'val' });
			});
		});

		describe('checkIntegrity', () => {
			test('should validate Map', () => {
				expect(
					transformer.checkIntegrity(new Map(), {
						propertyKey,
						target: {},
					}).isValid
				).toBe(true);
			});
			test('should validate object', () => {
				expect(
					transformer.checkIntegrity({}, { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should validate array', () => {
				expect(
					transformer.checkIntegrity([], { propertyKey, target: {} })
						.isValid
				).toBe(true);
			});
			test('should fail for number', () => {
				expect(
					transformer.checkIntegrity(123, { propertyKey, target: {} })
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
			test('should serialize to array', () => {
				const set = new Set([1, 2]);
				const result = transformer.serialize(set);
				expect(Array.isArray(result)).toBe(true);
				expect(result).toEqual([1, 2]);
			});
		});

		describe('checkIntegrity', () => {
			test('should validate Set', () => {
				expect(
					transformer.checkIntegrity(new Set(), {
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
			test('should validate __type wrapper', () => {
				expect(
					transformer.checkIntegrity(
						{ __type: 'Set', values: [] },
						{ propertyKey, target: {} }
					).isValid
				).toBe(true);
			});
			test('should fail for plain object', () => {
				// Plain object that is not a wrapper
				expect(
					transformer.checkIntegrity(
						{ foo: 'bar' },
						{ propertyKey, target: {} }
					).isValid
				).toBe(false);
			});
			test('should fail for number', () => {
				expect(
					transformer.checkIntegrity(123, { propertyKey, target: {} })
						.isValid
				).toBe(false);
			});
		});
	});
});

// ===========================================================================
// Coverage gaps: MapTransformer — checkIntegrity, serializeValue complex types,
// autoTransformValue nested Map/BigInt, serialize with Symbol keys
// ===========================================================================

describe('MapTransformer — coverage gaps', () => {
	const ctx: IQIntegrityContext = {
		propertyKey: 'testProp',
		className: 'TestClass',
	};
	const transformer = new MapTransformer<any, any>();

	describe('checkIntegrity()', () => {
		test('should return isValid=true for an array input', () => {
			const result = transformer.checkIntegrity([['a', 1]], ctx);
			expect(result.isValid).toBe(true);
		});

		test('should return isValid=false for a number', () => {
			const result = transformer.checkIntegrity(42, ctx);
			expect(result.isValid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test('should return isValid=false for a string', () => {
			const result = transformer.checkIntegrity('not-a-map', ctx);
			expect(result.isValid).toBe(false);
		});
	});

	describe('serialize() — serializeValue with complex nested types', () => {
		test('should serialize Map values containing nested Date → ISO string', () => {
			const date = new Date('2024-06-01T00:00:00.000Z');
			const map = new Map([['date', date]]);
			const result = transformer.serialize(map) as Record<
				string,
				unknown
			>;
			expect(result['date']).toBe('2024-06-01T00:00:00.000Z');
		});

		test('should serialize Map values containing nested BigInt → string', () => {
			const map = new Map([['big', 999999999999999n]]);
			const result = transformer.serialize(map) as Record<
				string,
				unknown
			>;
			expect(result['big']).toBe('999999999999999');
		});

		test('should serialize Map values containing nested Error → plain object', () => {
			const err = new Error('boom');
			err.name = 'CustomError';
			const map = new Map([['err', err]]);
			const result = transformer.serialize(map) as Record<
				string,
				unknown
			>;
			expect((result['err'] as { name: string }).name).toBe(
				'CustomError'
			);
			expect((result['err'] as { message: string }).message).toBe('boom');
		});

		test('should serialize Map values containing nested Set → array', () => {
			const inner = new Set([1, 2, 3]);
			const map = new Map([['items', inner]]);
			const result = transformer.serialize(map) as Record<
				string,
				unknown
			>;
			expect(Array.isArray(result['items'])).toBe(true);
			expect(result['items']).toEqual([1, 2, 3]);
		});

		test('should serialize Map values containing nested Array', () => {
			const arr = [10, 20, 30];
			const map = new Map([['nums', arr]]);
			const result = transformer.serialize(map) as Record<
				string,
				unknown
			>;
			expect(result['nums']).toEqual([10, 20, 30]);
		});

		test('should serialize Map values containing nested Map (no symbols)', () => {
			const inner = new Map([['x', 1]]);
			const outer = new Map([['nested', inner]]);
			const result = transformer.serialize(outer) as Record<
				string,
				unknown
			>;
			expect((result['nested'] as Record<string, unknown>)['x']).toBe(1);
		});

		test('should serialize Map with Symbol keys → array of tuples', () => {
			const symKey = Symbol.for('myKey');
			const map = new Map<any, any>([[symKey, 'value']]);
			const result = transformer.serialize(map);
			// Symbol keys → serialized as array of tuples
			expect(Array.isArray(result)).toBe(true);
			const tuples = result as unknown as [string, unknown][]; // @quickmodel-rule-ignore: no-as-unknown
			expect(tuples[0][0]).toBe('myKey');
			expect(tuples[0][1]).toBe('value');
		});

		test('should serialize Map with nested Map containing Symbol keys', () => {
			const sym = Symbol.for('inner');
			const inner = new Map<any, any>([[sym, 42]]);
			const outer = new Map([['data', inner]]);
			const result = transformer.serialize(outer) as Record<
				string,
				unknown
			>;
			// inner Map has symbol keys → serialized as array of tuples
			expect(Array.isArray(result['data'])).toBe(true);
		});
	});

	describe('autoTransformValue — nested Map and BigInt detection', () => {
		test('deserialized array of tuples inside a Map value becomes a nested Map', () => {
			// When a Map entry's value is itself [[k,v],[k,v]] it should auto-transform to Map
			const data: [string, unknown][] = [
				[
					'nested',
					[
						['a', 1],
						['b', 2],
					] as any,
				],
			];
			const result = transformer.deserialize(data, 'prop', 'Class');
			const nested = result!.get('nested');
			expect(nested).toBeInstanceOf(Map);
			expect((nested as Map<any, any>).get('a')).toBe(1);
		});

		test('deserialized large numeric string inside a Map value becomes BigInt', () => {
			const data: [string, unknown][] = [
				['amount', '999999999999999999'],
			];
			const result = transformer.deserialize(data, 'prop', 'Class');
			expect(typeof result!.get('amount')).toBe('bigint');
		});
	});
});

// ===========================================================================
// Coverage gaps: SetTransformer — serializeSetValue with complex nested types
// ===========================================================================

describe('SetTransformer — coverage gaps', () => {
	const transformer = new SetTransformer<any>();

	describe('serialize() — serializeSetValue with complex nested types', () => {
		test('should serialize Set containing Date → ISO string', () => {
			const date = new Date('2025-01-15T00:00:00.000Z');
			const set = new Set([date]);
			const result = transformer.serialize(set);
			expect(result[0]).toBe('2025-01-15T00:00:00.000Z');
		});

		test('should serialize Set containing BigInt → string', () => {
			const set = new Set([12345678901234567n]);
			const result = transformer.serialize(set);
			expect(result[0]).toBe('12345678901234567');
		});

		test('should serialize Set containing Error → plain object', () => {
			const err = new TypeError('bad type');
			const set = new Set([err]);
			const result = transformer.serialize(set);
			expect(result[0].name).toBe('TypeError');
			expect(result[0].message).toBe('bad type');
		});

		test('should serialize Set containing nested Map (no symbols) → object', () => {
			const inner = new Map([['k', 'v']]);
			const set = new Set([inner]);
			const result = transformer.serialize(set);
			expect(result[0].k).toBe('v');
		});

		test('should serialize Set containing nested Map with Symbol keys → array of tuples', () => {
			const sym = Symbol.for('setKey');
			const inner = new Map<any, any>([[sym, 99]]);
			const set = new Set([inner]);
			const result = transformer.serialize(set);
			expect(Array.isArray(result[0])).toBe(true);
		});

		test('should serialize Set containing nested Set → array', () => {
			const inner = new Set(['a', 'b']);
			const set = new Set([inner]);
			const result = transformer.serialize(set);
			expect(Array.isArray(result[0])).toBe(true);
			expect(result[0]).toEqual(['a', 'b']);
		});

		test('should serialize Set containing Array → array passthrough', () => {
			const arr = [1, 2, 3];
			const set = new Set([arr]);
			const result = transformer.serialize(set);
			expect(result[0]).toEqual([1, 2, 3]);
		});

		test('should handle null/undefined values in Set', () => {
			const set = new Set([null, undefined]);
			const result = transformer.serialize(set);
			expect(result[0]).toBeNull();
			expect(result[1]).toBeUndefined();
		});
	});

	// ========================================================================
	// autoTransformValue — array-of-non-tuples path (lines 495, 498)
	// ========================================================================
	describe('SetTransformer autoTransformValue — non-tuple array elements', () => {
		test('should transform array elements that are NOT map-entry tuples via deserialize', () => {
			// Each element [1,2,3] is an array but NOT [[k,v]] tuples format
			// → autoTransformValue([1,2,3]) → isMapEntries=false → line 498
			const result = transformer.deserialize(
				[
					[1, 2, 3],
					[4, 5, 6],
				],
				'matrix',
				'Model'
			);
			expect(result).toBeInstanceOf(Set);
			const items = Array.from(result!);
			expect(items[0]).toEqual([1, 2, 3]);
			expect(items[1]).toEqual([4, 5, 6]);
		});

		test('should recursively transform elements inside non-tuple array', () => {
			// Array of strings — no special type detected → passthrough
			const result = transformer.deserialize(
				[['a', 'b', 'c']],
				'field',
				'Model'
			);
			expect(result).toBeInstanceOf(Set);
			expect(Array.from(result!)[0]).toEqual(['a', 'b', 'c']);
		});

		test('should auto-transform Date strings inside non-tuple array elements', () => {
			// ['2024-01-01'] → autoTransformValue called on each item → Date
			const result = transformer.deserialize(
				[['2024-01-01', '2025-06-15']],
				'field',
				'Model'
			);
			expect(result).toBeInstanceOf(Set);
			const inner = Array.from(result!)[0] as unknown[]; // @quickmodel-rule-ignore: no-as-unknown
			expect(inner[0]).toBeInstanceOf(Date);
			expect(inner[1]).toBeInstanceOf(Date);
		});
	});
});
