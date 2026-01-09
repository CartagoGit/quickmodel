import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Nested Arrays and Objects - Deep Nesting', () => {
	// ============================================================================
	// ARRAYS DE ARRAYS (N NIVELES)
	// ============================================================================

	describe('Arrays de arrays de primitivos', () => {
		interface IData {
			level2: number[][];
			level3: number[][][];
			level4: string[][][][];
		}

		@Quick()
		class Data extends QModel<IData> {
			declare level2: number[][];
			declare level3: number[][][];
			declare level4: string[][][][];
		}

		test('number[][] - 2 niveles', () => {
			const data = new Data({
				level2: [
					[1, 2, 3],
					[4, 5, 6],
				],
				level3: [],
				level4: [],
			});

			expect(data.level2).toEqual([
				[1, 2, 3],
				[4, 5, 6],
			]);
			expect(Array.isArray(data.level2[0])).toBe(true);
		});

		test('number[][][] - 3 niveles', () => {
			const data = new Data({
				level2: [],
				level3: [
					[
						[1, 2],
						[3, 4],
					],
					[
						[5, 6],
						[7, 8],
					],
				],
				level4: [],
			});

			expect(data.level3[0][0]).toEqual([1, 2]);
			expect(data.level3[1][1]).toEqual([7, 8]);
		});

		test('string[][][][] - 4 niveles', () => {
			const data = new Data({
				level2: [],
				level3: [],
				level4: [
					[
						[
							['a', 'b'],
							['c', 'd'],
						],
					],
				],
			});

			expect(data.level4[0][0][0]).toEqual(['a', 'b']);
			expect(data.level4[0][0][1][1]).toBe('d');
		});
	});

	// ============================================================================
	// ARRAYS DE ARRAYS CON TRANSFORMACIONES
	// ============================================================================

	describe('Arrays de arrays con tipos transformables', () => {
		interface IData {
			dates2D: string[][];
			bigints3D: string[][][];
		}

		@Quick({
			dates2D: Date,
			bigints3D: BigInt,
		})
		class Data extends QModel<IData> {
			declare dates2D: Date[][];
			declare bigints3D: bigint[][][];
		}

		test('Date[][] - arrays de dates anidados', () => {
			const data = new Data({
				dates2D: [
					['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
					['2026-12-31T23:59:59.999Z'],
				],
				bigints3D: [],
			});

			expect(Array.isArray(data.dates2D)).toBe(true);
			expect(Array.isArray(data.dates2D[0])).toBe(true);
			
			// ✅ Ahora funciona con recursión
			expect(data.dates2D[0][0]).toBeInstanceOf(Date);
			expect(data.dates2D[0][1]).toBeInstanceOf(Date);
			expect(data.dates2D[1][0]).toBeInstanceOf(Date);
		});
	});

	// ============================================================================
	// ARRAYS DE MODELOS ANIDADOS
	// ============================================================================

	describe('Arrays de arrays de modelos', () => {
		interface ITag {
			name: string;
		}

		interface IPost {
			id: number;
			title: string;
		}

		interface IData {
			posts2D: IPost[][];
			tags3D: ITag[][][];
		}

		class Tag extends QModel<ITag> {
			declare name: string;
		}

		class Post extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		@Quick({
			posts2D: Post,
			tags3D: Tag,
		})
		class Data extends QModel<IData> {
			declare posts2D: Post[][];
			declare tags3D: Tag[][][];
		}

		test('Post[][] - 2 niveles de modelos', () => {
			const data = new Data({
				posts2D: [
					[
						{ id: 1, title: 'Post 1' },
						{ id: 2, title: 'Post 2' },
					],
					[{ id: 3, title: 'Post 3' }],
				],
				tags3D: [],
			});

			expect(Array.isArray(data.posts2D)).toBe(true);
			expect(Array.isArray(data.posts2D[0])).toBe(true);
			
			// Debe transformar modelos en arrays anidados
			expect(data.posts2D[0][0]).toBeInstanceOf(Post);
			expect(data.posts2D[0][0].id).toBe(1);
			expect(data.posts2D[1][0].title).toBe('Post 3');
		});

		test('Tag[][][] - 3 niveles de modelos', () => {
			const data = new Data({
				posts2D: [],
				tags3D: [
					[
						[{ name: 'tag1' }, { name: 'tag2' }],
						[{ name: 'tag3' }],
					],
				],
			});

			expect(data.tags3D[0][0][0]).toBeInstanceOf(Tag);
			expect(data.tags3D[0][0][1].name).toBe('tag2');
			expect(data.tags3D[0][1][0].name).toBe('tag3');
		});
	});

	// ============================================================================
	// OBJETOS ANIDADOS PROFUNDOS
	// ============================================================================

	describe('Objetos anidados profundos', () => {
		interface IAddress {
			street: string;
			city: string;
		}

		interface IProfile {
			bio: string;
			address: IAddress;
		}

		interface IUser {
			id: number;
			profile: IProfile;
		}

		class Address extends QModel<IAddress> {
			declare street: string;
			declare city: string;
		}

		@Quick({ address: Address })
		class Profile extends QModel<IProfile> {
			declare bio: string;
			declare address: Address;
		}

		@Quick({ profile: Profile })
		class User extends QModel<IUser> {
			declare id: number;
			declare profile: Profile;
		}

		test('User → Profile → Address (3 niveles)', () => {
			const user = new User({
				id: 1,
				profile: {
					bio: 'Developer',
					address: {
						street: '123 Main St',
						city: 'NYC',
					},
				},
			});

			expect(user.profile).toBeInstanceOf(Profile);
			expect(user.profile.address).toBeInstanceOf(Address);
			expect(user.profile.address.city).toBe('NYC');
		});
	});

	// ============================================================================
	// MEZCLA: ARRAYS DE OBJETOS CON OBJETOS DE ARRAYS
	// ============================================================================

	describe('Mezcla de arrays y objetos anidados', () => {
		interface IComment {
			text: string;
		}

		interface IPost {
			id: number;
			comments: IComment[];
		}

		interface IUser {
			id: number;
			posts: IPost[];
		}

		class Comment extends QModel<IComment> {
			declare text: string;
		}

		@Quick({ comments: Comment })
		class Post extends QModel<IPost> {
			declare id: number;
			declare comments: Comment[];
		}

		@Quick({ posts: Post })
		class User extends QModel<IUser> {
			declare id: number;
			declare posts: Post[];
		}

		test('User[] → Post[] → Comment[] (arrays en cada nivel)', () => {
			const user = new User({
				id: 1,
				posts: [
					{
						id: 1,
						comments: [{ text: 'Comment 1' }, { text: 'Comment 2' }],
					},
					{
						id: 2,
						comments: [{ text: 'Comment 3' }],
					},
				],
			});

			expect(user.posts).toHaveLength(2);
			expect(user.posts[0]).toBeInstanceOf(Post);
			expect(user.posts[0].comments).toHaveLength(2);
			expect(user.posts[0].comments[0]).toBeInstanceOf(Comment);
			expect(user.posts[0].comments[1].text).toBe('Comment 2');
			expect(user.posts[1].comments[0].text).toBe('Comment 3');
		});
	});

	// ============================================================================
	// CASOS EDGE
	// ============================================================================

	describe('Edge cases con anidamiento profundo', () => {
		interface IData {
			empty2D: any[][];
			mixed: (number | string)[][];
			nulls: (number | null)[][];
		}

		@Quick()
		class Data extends QModel<IData> {
			declare empty2D: any[][];
			declare mixed: (number | string)[][];
			declare nulls: (number | null)[][];
		}

		test('arrays vacíos anidados', () => {
			const data = new Data({
				empty2D: [[], [], []],
				mixed: [],
				nulls: [],
			});

			expect(data.empty2D).toHaveLength(3);
			expect(data.empty2D[0]).toEqual([]);
		});

		test('arrays con tipos mixtos anidados', () => {
			const data = new Data({
				empty2D: [],
				mixed: [
					[1, 'a', 2],
					['b', 3, 'c'],
				],
				nulls: [],
			});

			expect(data.mixed[0]).toEqual([1, 'a', 2]);
			expect(data.mixed[1][2]).toBe('c');
		});

		test('arrays con nulls anidados', () => {
			const data = new Data({
				empty2D: [],
				mixed: [],
				nulls: [
					[1, null, 2],
					[null, null],
				],
			});

			expect(data.nulls[0][1]).toBeNull();
			expect(data.nulls[1][0]).toBeNull();
		});
	});
});
