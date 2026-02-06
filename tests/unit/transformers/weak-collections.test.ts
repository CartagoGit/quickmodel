import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('WeakMap Transformer', () => {
	describe('Deserialization', () => {
		test('should create WeakMap from array of tuples', () => {
			interface ICache {
				cache: [object, string][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, string>;
			}

			const key1 = {};
			const key2 = {};
			const cache = new Cache({
				cache: [
					[key1, 'value1'],
					[key2, 'value2'],
				],
			});

			expect(cache.cache).toBeInstanceOf(WeakMap);
			expect(cache.cache.get(key1)).toBe('value1');
			expect(cache.cache.get(key2)).toBe('value2');
		});

		test('should handle empty WeakMap', () => {
			interface ICache {
				cache: [object, any][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, any>;
			}

			const cache = new Cache({ cache: [] });
			expect(cache.cache).toBeInstanceOf(WeakMap);
		});

		test('should support complex values in WeakMap', () => {
			interface ICache {
				cache: [object, any][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, { id: number; name: string }>;
			}

			const key = {};
			const cache = new Cache({
				cache: [[key, { id: 1, name: 'test' }]],
			});

			const value = cache.cache.get(key);
			expect(value).toEqual({ id: 1, name: 'test' });
		});

		test('should handle null/undefined values in WeakMap', () => {
			interface ICache {
				cache: [object, any][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, any>;
			}

			const key1 = {};
			const key2 = {};
			const cache = new Cache({
				cache: [
					[key1, null],
					[key2, undefined],
				],
			});

			expect(cache.cache.get(key1)).toBeNull();
			expect(cache.cache.get(key2)).toBeUndefined();
		});
	});

	describe('Serialization Restrictions', () => {
		test('should throw descriptive error when serializing WeakMap', () => {
			interface ICache {
				cache: [object, string][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, string>;
			}

			const cache = new Cache({ cache: [[{}, 'value']] });

			expect(() => cache.toJSON()).toThrow(
				/WeakMap cannot be serialized.*not iterable|enumerable/i
			);
		});

		test('should throw error with serialize() method', () => {
			interface ICache {
				cache: [object, string][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, string>;
			}

			const cache = new Cache({ cache: [[{}, 'value']] });

			expect(() => cache.serialize()).toThrow(
				/WeakMap cannot be serialized.*not iterable|enumerable/i
			);
		});
	});

	describe('Edge Cases', () => {
		test('should reject non-object keys in WeakMap', () => {
			interface ICache {
				cache: [any, any][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, any>;
			}

			// WeakMap keys must be objects (not primitives)
			expect(() => {
				new Cache({
					cache: [
						['string-key', 'value'], // Invalid: string as key
					] as any,
				});
			}).toThrow(/WeakMap keys must be objects/i);
		});

		test('should handle WeakMap with Symbol values', () => {
			interface ICache {
				cache: [object, string][];
			}

			@Quick({ cache: WeakMap })
			class Cache extends QModel<ICache> {
				declare cache: WeakMap<object, symbol>;
			}

			const key = {};
			const _sym = Symbol.for('test'); // Use Symbol.for() to make it retrievable
			const cache = new Cache({
				cache: [[key, 'Symbol.for(test)']],
			});

			// When deserializing string "Symbol.for(test)", it should become Symbol.for('test')
			const retrieved = cache.cache.get(key);
			expect(typeof retrieved).toBe('symbol');
			expect(Symbol.keyFor(retrieved as symbol)).toBe('test');
		});
	});
});

describe('WeakSet Transformer', () => {
	describe('Deserialization', () => {
		test('should create WeakSet from array of objects', () => {
			interface ITracked {
				tracked: object[];
			}

			@Quick({ tracked: WeakSet })
			class Tracked extends QModel<ITracked> {
				declare tracked: WeakSet<object>;
			}

			const obj1 = {};
			const obj2 = {};
			const tracked = new Tracked({
				tracked: [obj1, obj2],
			});

			expect(tracked.tracked).toBeInstanceOf(WeakSet);
			expect(tracked.tracked.has(obj1)).toBe(true);
			expect(tracked.tracked.has(obj2)).toBe(true);
		});

		test('should handle empty WeakSet', () => {
			interface ITracked {
				tracked: object[];
			}

			@Quick({ tracked: WeakSet })
			class Tracked extends QModel<ITracked> {
				declare tracked: WeakSet<object>;
			}

			const tracked = new Tracked({ tracked: [] });
			expect(tracked.tracked).toBeInstanceOf(WeakSet);
		});

		test('should deduplicate objects in WeakSet', () => {
			interface ITracked {
				tracked: object[];
			}

			@Quick({ tracked: WeakSet })
			class Tracked extends QModel<ITracked> {
				declare tracked: WeakSet<object>;
			}

			const obj = {};
			const tracked = new Tracked({
				tracked: [obj, obj, obj], // Same reference 3 times
			});

			expect(tracked.tracked).toBeInstanceOf(WeakSet);
			expect(tracked.tracked.has(obj)).toBe(true);
		});
	});

	describe('Serialization Restrictions', () => {
		test('should throw descriptive error when serializing WeakSet', () => {
			interface ITracked {
				tracked: object[];
			}

			@Quick({ tracked: WeakSet })
			class Tracked extends QModel<ITracked> {
				declare tracked: WeakSet<object>;
			}

			const tracked = new Tracked({ tracked: [{}] });

			expect(() => tracked.toJSON()).toThrow(
				/WeakSet cannot be serialized.*not iterable|enumerable/i
			);
		});
	});

	describe('Edge Cases', () => {
		test('should reject primitive values in WeakSet', () => {
			interface ITracked {
				tracked: any[];
			}

			@Quick({ tracked: WeakSet })
			class Tracked extends QModel<ITracked> {
				declare tracked: WeakSet<object>;
			}

			// WeakSet can only contain objects
			expect(() => {
				new Tracked({
					tracked: ['string', 123, true] as any, // Invalid: primitives
				});
			}).toThrow(/WeakSet values must be objects/i);
		});

		test('should accept objects with any structure', () => {
			interface ITracked {
				tracked: object[];
			}

			@Quick({ tracked: WeakSet })
			class Tracked extends QModel<ITracked> {
				declare tracked: WeakSet<object>;
			}

			const obj1 = { id: 1, name: 'test' };
			const obj2 = { different: 'structure' };
			const tracked = new Tracked({
				tracked: [obj1, obj2],
			});

			expect(tracked.tracked.has(obj1)).toBe(true);
			expect(tracked.tracked.has(obj2)).toBe(true);
		});
	});
});
