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
	// ARRAYS DE TIPOS QUE CONTIENEN ARRAYS DE OTROS TIPOS (MÚLTIPLES NIVELES)
	// ============================================================================

	describe('Arrays mixtos con diferentes tipos en cada nivel', () => {
		interface ITag {
			name: string;
		}

		interface IComment {
			text: string;
			createdAt: string;
		}

		interface IPost {
			id: number;
			title: string;
			tags: string[];
			comments: IComment[];
			dates: string[];
		}

		interface IUser {
			id: number;
			posts: IPost[];
		}

		class Tag extends QModel<ITag> {
			declare name: string;
		}

		@Quick({ createdAt: Date })
		class Comment extends QModel<IComment> {
			declare text: string;
			declare createdAt: Date;
		}

		@Quick({
			tags: Set,
			comments: Comment,
			dates: Date,
		})
		class Post extends QModel<IPost> {
			declare id: number;
			declare title: string;
			declare tags: Set<string>;
			declare comments: Comment[];
			declare dates: Date[];
		}

		@Quick({ posts: Post })
		class User extends QModel<IUser> {
			declare id: number;
			declare posts: Post[];
		}

		test('User[] → Post[] → (Set, Comment[], Date[]) - múltiples tipos en cada nivel', () => {
			const users = [
				{
					id: 1,
					posts: [
						{
							id: 1,
							title: 'Post 1',
							tags: ['typescript', 'node'],
							comments: [
								{ text: 'Comment 1', createdAt: '2026-01-01T00:00:00.000Z' },
								{ text: 'Comment 2', createdAt: '2026-01-02T00:00:00.000Z' },
							],
							dates: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
						},
					],
				},
				{
					id: 2,
					posts: [
						{
							id: 2,
							title: 'Post 2',
							tags: ['javascript'],
							comments: [{ text: 'Comment 3', createdAt: '2026-01-03T00:00:00.000Z' }],
							dates: ['2026-01-03T00:00:00.000Z'],
						},
					],
				},
			];

			const userModels = users.map((u) => new User(u));

			// Nivel 1: Array de Users
			expect(userModels).toHaveLength(2);

			// Nivel 2: Array de Posts
			expect(userModels[0].posts).toHaveLength(1);
			expect(userModels[0].posts[0]).toBeInstanceOf(Post);

			// Nivel 3a: Set de tags
			expect(userModels[0].posts[0].tags).toBeInstanceOf(Set);
			expect(userModels[0].posts[0].tags.has('typescript')).toBe(true);

			// Nivel 3b: Array de Comments
			expect(userModels[0].posts[0].comments).toHaveLength(2);
			expect(userModels[0].posts[0].comments[0]).toBeInstanceOf(Comment);

			// Nivel 4: Date en Comment
			expect(userModels[0].posts[0].comments[0].createdAt).toBeInstanceOf(Date);

			// Nivel 3c: Array de Dates
			expect(userModels[0].posts[0].dates).toHaveLength(2);
			expect(userModels[0].posts[0].dates[0]).toBeInstanceOf(Date);

			// Segundo usuario
			expect(userModels[1].posts[0].tags).toBeInstanceOf(Set);
			expect(userModels[1].posts[0].comments[0].text).toBe('Comment 3');
		});
	});

	describe('Arrays de TypedArrays anidados', () => {
		interface IData {
			matrices2D: number[][][]; // 3D: arrays de matrices (arrays de arrays)
			singleTypedArrays: number[][]; // Para transformar a Int8Array[]
		}

		@Quick({
			singleTypedArrays: Int8Array,
		})
		class Data extends QModel<IData> {
			declare matrices2D: number[][][];
			declare singleTypedArrays: Int8Array[];
		}

		test('number[][][] - matrices 3D (sin transformación)', () => {
			const data = new Data({
				matrices2D: [
					[
						[1, 2],
						[3, 4],
					],
					[
						[5, 6],
						[7, 8],
					],
				],
				singleTypedArrays: [],
			});

			expect(data.matrices2D).toHaveLength(2);
			expect(data.matrices2D[0][0]).toEqual([1, 2]);
			expect(data.matrices2D[1][1][1]).toBe(8);
		});

		test('Int8Array[] - arrays de TypedArrays (1 nivel)', () => {
			const data = new Data({
				matrices2D: [],
				singleTypedArrays: [
					[1, 2, 3],
					[4, 5, 6],
					[7, 8, 9],
				],
			});

			expect(data.singleTypedArrays).toHaveLength(3);
			expect(data.singleTypedArrays[0]).toBeInstanceOf(Int8Array);
			expect(Array.from(data.singleTypedArrays[0])).toEqual([1, 2, 3]);
			expect(Array.from(data.singleTypedArrays[1])).toEqual([4, 5, 6]);
			expect(Array.from(data.singleTypedArrays[2])).toEqual([7, 8, 9]);
		});
	});

	describe('Arrays de modelos que contienen arrays de transformables anidados', () => {
		interface IMetrics {
			values: string[]; // BigInt[]
			timestamps: string[]; // Date[]
		}

		interface IReport {
			id: number;
			metrics: IMetrics[];
		}

		@Quick({
			values: BigInt,
			timestamps: Date,
		})
		class Metrics extends QModel<IMetrics> {
			declare values: bigint[];
			declare timestamps: Date[];
		}

		@Quick({ metrics: Metrics })
		class Report extends QModel<IReport> {
			declare id: number;
			declare metrics: Metrics[];
		}

		test('Report[] → Metrics[] → (BigInt[], Date[]) - 3 niveles con transformaciones', () => {
			const reports = [
				{
					id: 1,
					metrics: [
						{
							values: ['100', '200', '300'],
							timestamps: [
								'2026-01-01T00:00:00.000Z',
								'2026-01-02T00:00:00.000Z',
								'2026-01-03T00:00:00.000Z',
							],
						},
						{
							values: ['400', '500'],
							timestamps: ['2026-01-04T00:00:00.000Z', '2026-01-05T00:00:00.000Z'],
						},
					],
				},
			];

			const reportModels = reports.map((r) => new Report(r));

			// Nivel 1: Array de Reports
			expect(reportModels).toHaveLength(1);

			// Nivel 2: Array de Metrics
			expect(reportModels[0].metrics).toHaveLength(2);
			expect(reportModels[0].metrics[0]).toBeInstanceOf(Metrics);

			// Nivel 3a: Array de BigInt
			expect(reportModels[0].metrics[0].values).toHaveLength(3);
			expect(typeof reportModels[0].metrics[0].values[0]).toBe('bigint');
			expect(reportModels[0].metrics[0].values[0]).toBe(100n);

			// Nivel 3b: Array de Date
			expect(reportModels[0].metrics[0].timestamps).toHaveLength(3);
			expect(reportModels[0].metrics[0].timestamps[0]).toBeInstanceOf(Date);

			// Segundo metrics
			expect(reportModels[0].metrics[1].values[1]).toBe(500n);
			expect(reportModels[0].metrics[1].timestamps[0]).toBeInstanceOf(Date);
		});
	});

	describe('Arrays de diferentes colecciones anidadas', () => {
		interface IData {
			nestedSets: string[][]; // Set<string>[]
			nestedMaps: [string, number][][]; // Map<string, number>[]
		}

		@Quick({
			nestedSets: Set,
			nestedMaps: Map,
		})
		class Data extends QModel<IData> {
			declare nestedSets: Set<string>[];
			declare nestedMaps: Map<string, number>[];
		}

		test('Set<string>[] - arrays de Sets', () => {
			const data = new Data({
				nestedSets: [
					['a', 'b', 'c'],
					['d', 'e'],
					['f'],
				],
				nestedMaps: [],
			});

			expect(data.nestedSets).toHaveLength(3);
			expect(data.nestedSets[0]).toBeInstanceOf(Set);
			expect(data.nestedSets[0].has('a')).toBe(true);
			expect(data.nestedSets[1].size).toBe(2);
			expect(data.nestedSets[2].has('f')).toBe(true);
		});

		test('Map<string, number>[] - arrays de Maps', () => {
			const data = new Data({
				nestedSets: [],
				nestedMaps: [
					[
						['key1', 1],
						['key2', 2],
					],
					[['key3', 3]],
				],
			});

			expect(data.nestedMaps).toHaveLength(2);
			expect(data.nestedMaps[0]).toBeInstanceOf(Map);
			expect(data.nestedMaps[0].get('key1')).toBe(1);
			expect(data.nestedMaps[1].get('key3')).toBe(3);
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
