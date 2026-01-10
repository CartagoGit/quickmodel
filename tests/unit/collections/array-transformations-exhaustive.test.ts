import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QType } from '@/index';

describe('Array Transformations - Exhaustive Tests', () => {
	// ============================================================================
	// PRIMITIVES
	// ============================================================================

	describe('Arrays of primitives', () => {
		interface IData {
			numbers: number[];
			strings: string[];
			booleans: boolean[];
			mixed: (string | number)[];
		}

		@Quick()
		class Data extends QModel<IData> {
			declare numbers: number[];
			declare strings: string[];
			declare booleans: boolean[];
			declare mixed: (string | number)[];
		}

		test('number[]', () => {
			const data = new Data({
				numbers: [1, 2, 3],
				strings: [],
				booleans: [],
				mixed: [],
			});
			expect(data.numbers).toEqual([1, 2, 3]);
			expect(Array.isArray(data.numbers)).toBe(true);
		});

		test('string[]', () => {
			const data = new Data({
				numbers: [],
				strings: ['a', 'b', 'c'],
				booleans: [],
				mixed: [],
			});
			expect(data.strings).toEqual(['a', 'b', 'c']);
		});

		test('boolean[]', () => {
			const data = new Data({
				numbers: [],
				strings: [],
				booleans: [true, false, true],
				mixed: [],
			});
			expect(data.booleans).toEqual([true, false, true]);
		});

		test('mixed array', () => {
			const data = new Data({
				numbers: [],
				strings: [],
				booleans: [],
				mixed: ['hello', 42, 'world', 100],
			});
			expect(data.mixed).toEqual(['hello', 42, 'world', 100]);
		});
	});

	// ============================================================================
	// NULL, UNDEFINED
	// ============================================================================

	describe('Arrays with null/undefined', () => {
		interface IData {
			withNull: (string | null)[];
			withUndefined: (number | undefined)[];
			mixed: (string | null | undefined)[];
		}

		@Quick()
		class Data extends QModel<IData> {
			declare withNull: (string | null)[];
			declare withUndefined: (number | undefined)[];
			declare mixed: (string | null | undefined)[];
		}

		test('array with null values', () => {
			const data = new Data({
				withNull: ['a', null, 'b', null],
				withUndefined: [],
				mixed: [],
			});
			expect(data.withNull).toEqual(['a', null, 'b', null]);
		});

		test('array with undefined values', () => {
			const data = new Data({
				withNull: [],
				withUndefined: [1, undefined, 2, undefined],
				mixed: [],
			});
			expect(data.withUndefined).toEqual([1, undefined, 2, undefined]);
		});

		test('array with mixed null/undefined', () => {
			const data = new Data({
				withNull: [],
				withUndefined: [],
				mixed: ['a', null, undefined, 'b'],
			});
			expect(data.mixed).toEqual(['a', null, undefined, 'b']);
		});
	});

	// ============================================================================
	// DATE
	// ============================================================================

	describe('Arrays of Date', () => {
		interface IData {
			dates: string[];
		}

		@Quick({ dates: [Date] })
		class Data extends QModel<IData> {
			declare dates: Date[];
		}

		test('Date[] from ISO strings', () => {
			const data = new Data({
				dates: ['2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.999Z'],
			});

			expect(data.dates).toHaveLength(2);
			expect(data.dates[0]).toBeInstanceOf(Date);
			expect(data.dates[1]).toBeInstanceOf(Date);
			expect(data.dates[0]?.getFullYear()).toBe(2026);
		});

		test('Date[] with null values', () => {
			const data = new Data({
				dates: [
					'2026-01-01T00:00:00.000Z',
					null as any,
					'2026-12-31T23:59:59.999Z',
				],
			});

			expect(data.dates[0]).toBeInstanceOf(Date);
			expect(data.dates[1]).toBeNull();
			expect(data.dates[2]).toBeInstanceOf(Date);
		});
	});

	// ============================================================================
	// BIGINT
	// ============================================================================

	describe('Arrays of BigInt', () => {
		interface IData {
			bigints: string[];
		}

		@Quick({ bigints: BigInt })
		class Data extends QModel<IData> {
			declare bigints: bigint[];
		}

		test('bigint[] from strings', () => {
			const data = new Data({
				bigints: ['123', '456', '789'],
			});

			expect(data.bigints).toHaveLength(3);
			expect(typeof data.bigints[0]).toBe('bigint');
			expect(data.bigints[0]).toBe(123n);
			expect(data.bigints[2]).toBe(789n);
		});

		test('bigint[] with large numbers', () => {
			const data = new Data({
				bigints: [
					'9007199254740991',
					'9007199254740992',
					'9007199254740993',
				],
			});

			expect(data.bigints[0]).toBe(9007199254740991n);
			expect(data.bigints[1]).toBe(9007199254740992n);
			expect(data.bigints[2]).toBe(9007199254740993n);
		});
	});

	// ============================================================================
	// REGEXP
	// ============================================================================

	describe('Arrays of RegExp', () => {
		interface IData {
			patterns: string[];
		}

		@Quick({ patterns: [RegExp] })
		class Data extends QModel<IData> {
			declare patterns: RegExp[];
		}

		test('RegExp[] from strings', () => {
			const data = new Data({
				patterns: [
					'^test\\d+$',
					'hello.*world',
					'\\d{4}-\\d{2}-\\d{2}',
				],
			});

			expect(data.patterns).toHaveLength(3);
			expect(data.patterns[0]).toBeInstanceOf(RegExp);
			expect(data.patterns[0]?.test('test123')).toBe(true);
			expect(data.patterns[1]?.test('hello beautiful world')).toBe(true);
		});
	});

	// ============================================================================
	// SYMBOL
	// ============================================================================

	describe('Arrays of Symbol', () => {
		interface IData {
			symbols: string[];
		}

		@Quick({ symbols: [Symbol] })
		class Data extends QModel<IData> {
			declare symbols: symbol[];
		}

		test('symbol[] from strings', () => {
			const data = new Data({
				symbols: ['id', 'name', 'age'],
			});

			expect(data.symbols).toHaveLength(3);
			expect(typeof data.symbols[0]).toBe('symbol');
			expect(data.symbols[0]).toBe(Symbol.for('id'));
			expect(data.symbols[2]).toBe(Symbol.for('age'));
		});
	});

	// ============================================================================
	// SET
	// ============================================================================

	describe('Arrays of Set', () => {
		interface IData {
			sets: string[][];
		}

		@Quick({ sets: Set })
		class Data extends QModel<IData> {
			declare sets: Set<string>[];
		}

		test('Set<string>[] from arrays', () => {
			const data = new Data({
				sets: [
					['a', 'b', 'c'],
					['x', 'y', 'z'],
				],
			});

			expect(data.sets).toHaveLength(2);
			expect(data.sets[0]).toBeInstanceOf(Set);
			expect(data.sets[0]).toEqual(new Set(['a', 'b', 'c']));
			expect(data.sets[1]).toEqual(new Set(['x', 'y', 'z']));
		});
	});

	// ============================================================================
	// MAP
	// ============================================================================

	describe('Arrays of Map', () => {
		interface IData {
			maps: [string, any][][];
		}

		@Quick({ maps: Map })
		class Data extends QModel<IData> {
			declare maps: Map<string, any>[];
		}

		test('Map<string, any>[] from tuples', () => {
			const data = new Data({
				maps: [
					[
						['key1', 'value1'],
						['key2', 'value2'],
					],
					[
						['name', 'John'],
						['age', 30],
					],
				],
			});

			expect(data.maps).toHaveLength(2);
			expect(data.maps[0]).toBeInstanceOf(Map);
			expect(data.maps[0]?.get('key1')).toBe('value1');
			expect(data.maps[1]?.get('name')).toBe('John');
		});
	});

	// ============================================================================
	// TYPED ARRAYS
	// ============================================================================

	describe('Arrays of TypedArrays', () => {
		interface IData {
			int8arrays: number[][];
			uint8arrays: number[][];
			float32arrays: number[][];
		}

		@Quick({
			int8arrays: Int8Array,
			uint8arrays: Uint8Array,
			float32arrays: Float32Array,
		})
		class Data extends QModel<IData> {
			declare int8arrays: Int8Array[];
			declare uint8arrays: Uint8Array[];
			declare float32arrays: Float32Array[];
		}

		test('Int8Array[] from number arrays', () => {
			const data = new Data({
				int8arrays: [
					[1, 2, 3],
					[4, 5, 6],
				],
				uint8arrays: [],
				float32arrays: [],
			});

			expect(data.int8arrays).toHaveLength(2);
			expect(data.int8arrays[0]).toBeInstanceOf(Int8Array);
			expect(Array.from(data.int8arrays[0]!)).toEqual([1, 2, 3]);
		});

		test('Uint8Array[] from number arrays', () => {
			const data = new Data({
				int8arrays: [],
				uint8arrays: [
					[10, 20, 30],
					[40, 50, 60],
				],
				float32arrays: [],
			});

			expect(data.uint8arrays[0]).toBeInstanceOf(Uint8Array);
			expect(Array.from(data.uint8arrays[1]!)).toEqual([40, 50, 60]);
		});

		test('Float32Array[] from number arrays', () => {
			const data = new Data({
				int8arrays: [],
				uint8arrays: [],
				float32arrays: [
					[1.5, 2.5, 3.5],
					[4.5, 5.5, 6.5],
				],
			});

			expect(data.float32arrays[0]).toBeInstanceOf(Float32Array);
			expect(Array.from(data.float32arrays[0]!)).toEqual([1.5, 2.5, 3.5]);
		});
	});

	// ============================================================================
	// URL
	// ============================================================================

	describe('Arrays of URL', () => {
		interface IData {
			urls: string[];
		}

		@Quick({ urls: [URL] })
		class Data extends QModel<IData> {
			declare urls: URL[];
		}

		test('URL[] from strings', () => {
			const data = new Data({
				urls: ['https://example.com', 'https://test.org/path?query=1'],
			});

			expect(data.urls).toHaveLength(2);
			expect(data.urls[0]).toBeInstanceOf(URL);
			expect(data.urls[0]!.hostname).toBe('example.com');
			expect(data.urls[1]!.pathname).toBe('/path');
		});
	});

	// ============================================================================
	// ERROR
	// ============================================================================

	describe('Arrays of Error', () => {
		interface IData {
			errors: { message: string; name?: string }[];
		}

		@Quick({ errors: [Error] })
		class Data extends QModel<IData> {
			declare errors: Error[];
		}

		test('Error[] from objects', () => {
			const data = new Data({
				errors: [
					{ message: 'Error 1', name: 'TypeError' },
					{ message: 'Error 2', name: 'ReferenceError' },
				],
			});

			expect(data.errors).toHaveLength(2);
			expect(data.errors[0]).toBeInstanceOf(Error);
			expect(data.errors[0]?.message).toBe('Error 1');
			expect(data.errors[1]?.message).toBe('Error 2');
		});
	});

	// ============================================================================
	// NESTED MODELS
	// ============================================================================

	describe('Arrays of nested models', () => {
		interface IPost {
			id: number;
			title: string;
		}

		interface IUser {
			id: number;
			posts: IPost[];
		}

		class Post extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		@Quick({ posts: Post })
		class User extends QModel<IUser> {
			declare id: number;
			declare posts: Post[];
		}

		test('Model[] - Syntax: @Quick({ posts: [Post] })', () => {
			const user = new User({
				id: 1,
				posts: [
					{ id: 1, title: 'Post 1' },
					{ id: 2, title: 'Post 2' },
				],
			});

			expect(user.posts).toHaveLength(2);
			expect(user.posts[0]).toBeInstanceOf(Post);
			expect(user.posts[0]!.id).toBe(1);
			expect(user.posts[1]!.title).toBe('Post 2');
		});

		test('Model[] with empty array', () => {
			const user = new User({
				id: 1,
				posts: [],
			});

			expect(user.posts).toEqual([]);
			expect(Array.isArray(user.posts)).toBe(true);
		});

		test('Model[] with null values filtered', () => {
			const user = new User({
				id: 1,
				posts: [
					{ id: 1, title: 'Post 1' },
					null as any,
					{ id: 2, title: 'Post 2' },
				],
			});

			// Null values should be filtered out
			expect(user.posts).toHaveLength(2);
			expect(user.posts[0]!.id).toBe(1);
			expect(user.posts[1]!.id).toBe(2);
		});
	});

	// ============================================================================
	// SYNTAX VALIDATION: [Type] is required for arrays
	// ============================================================================

	describe('Array syntax validation', () => {
		interface IPost {
			id: number;
		}
		interface IUser {
			id: number;
			posts: IPost[];
		}

		class Post extends QModel<IPost> {
			declare id: number;
		}

		test('✅ CORRECT: @Quick({ posts: [Post] }) with explicit array syntax', () => {
			@Quick({ posts: [Post] })
			class User1 extends QModel<IUser> {
				declare id: number;
				declare posts: Post[];
			}

			const user = new User1({
				id: 1,
				posts: [{ id: 1 }, { id: 2 }],
			});

			expect(user.posts[0]).toBeInstanceOf(Post);
		});

		test('✅ CORRECT: @QType([Post]) with explicit array syntax', () => {
			class User2 extends QModel<IUser> {
				declare id: number;

				@QType([Post])
				declare posts: Post[];
			}

			const user = new User2({
				id: 1,
				posts: [{ id: 1 }, { id: 2 }],
			});

			expect(user.posts[0]).toBeInstanceOf(Post);
		});

		test('❌ WRONG: @QType(Post) without array syntax should NOT instantiate models', () => {
			class User3 extends QModel<IUser> {
				declare id: number;

				@QType(Post) // ❌ Missing array syntax [Post]
				declare posts: Post[];
			}

			const user = new User3({
				id: 1,
				posts: [{ id: 1 }, { id: 2 }],
			});

			// Should NOT instantiate Post objects (plain objects remain)
			expect(user.posts[0]).not.toBeInstanceOf(Post);
			expect(user.posts[0]).toMatchObject({ id: 1 });
			expect(typeof user.posts[0]).toBe('object');
			// Verify it's a plain object, not a Post instance
			expect(user.posts[0]?.constructor.name).toBe('Object');
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge cases', () => {
		interface IData {
			empty: any[];
			single: number[];
			nested: number[][];
		}

		@Quick()
		class Data extends QModel<IData> {
			declare empty: any[];
			declare single: number[];
			declare nested: number[][];
		}

		test('empty array', () => {
			const data = new Data({
				empty: [],
				single: [],
				nested: [],
			});

			expect(data.empty).toEqual([]);
			expect(data.single).toEqual([]);
		});

		test('single element array', () => {
			const data = new Data({
				empty: [],
				single: [42],
				nested: [],
			});

			expect(data.single).toEqual([42]);
		});

		test('nested arrays', () => {
			const data = new Data({
				empty: [],
				single: [],
				nested: [
					[1, 2],
					[3, 4],
					[5, 6],
				],
			});

			expect(data.nested).toHaveLength(3);
			expect(data.nested[0]).toEqual([1, 2]);
			expect(data.nested[2]).toEqual([5, 6]);
		});
	});
});
