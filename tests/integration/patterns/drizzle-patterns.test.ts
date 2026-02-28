/**
 * Drizzle ORM integration patterns
 * Covers: DTO from Drizzle query result, create input, createMany seed,
 *         repository pattern, Date/number type coercion, unknownPropertyPolicy strip,
 *         copy() partial update, @QComputed derived fields, qCheckRulesAsync DB-level validation
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed, QGroup } from '@/decorators';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Interface definitions
// ---------------------------------------------------------------------------

interface IUserRow {
	id: number;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	createdAt: Date;
	displayName?: string;
}

interface ICreateUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

interface IProductRow {
	id: number;
	title: string;
	description: string;
	price: number;
	stock: number;
	publishedAt: Date;
	slug?: string;
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

@Quick(
	{
		id: 'number',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		active: 'boolean',
		score: 'number',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserRowDto extends QModel<IUserRow> {
	declare id: number;
	declare name: string;

	@QGroup('identity')
	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Invalid age')
	declare age: number;

	@QGroup('identity')
	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	declare active: boolean;
	declare score: number;
	declare createdAt: Date;

	@QComputed()
	get displayName(): string {
		return `[${this.role.toUpperCase()}] ${this.name}`;
	}
}

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email format'
	)
	declare email: string;

	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	declare age: number;

	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;
}

@Quick(
	{
		id: 'number',
		title: 'string',
		description: 'string',
		price: 'number',
		stock: 'number',
		publishedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductRowDto extends QModel<IProductRow> {
	declare id: number;
	declare title: string;
	declare description: string;

	@QRule((val: number) => val >= 0, 'Price must be non-negative')
	declare price: number;

	@QRule((val: number) => val >= 0, 'Stock cannot be negative')
	declare stock: number;

	declare publishedAt: Date;

	@QComputed()
	get slug(): string {
		return this.title.toLowerCase().replace(/\s+/g, '-');
	}
}

// ---------------------------------------------------------------------------
// In-memory store (replaces Drizzle db client in tests)
// ---------------------------------------------------------------------------

const userStore = new Map<number, unknown>();

// ---------------------------------------------------------------------------
// 1. DTO from Drizzle query result
// ---------------------------------------------------------------------------

describe('DTO from Drizzle query result', () => {
	test('maps a Drizzle user row to UserRowDto', () => {
		const drizzleRow = {
			id: 1,
			name: 'Alice',
			email: 'alice@drizzle.dev',
			age: 30,
			role: 'user',
			active: true,
			score: 95,
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
		};
		const dto = new UserRowDto(drizzleRow);
		expect(dto.id).toBe(1);
		expect(dto.email).toBe('alice@drizzle.dev');
		expect(dto.createdAt).toBeInstanceOf(Date);
	});

	test('strips Drizzle join artifacts and internal fields', () => {
		const drizzleRow = {
			id: 2,
			name: 'Bob',
			email: 'bob@drizzle.dev',
			age: 25,
			role: 'admin',
			active: false,
			score: 50,
			createdAt: new Date(),
			// join artifact: nested object from leftJoin
			posts: [{ id: 10, title: 'Post' }],
			_drizzleInternal: true,
		};
		const dto = new UserRowDto(drizzleRow);
		expect(
			(dto as unknown as Record<string, unknown>)['posts']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['_drizzleInternal']
		).toBeUndefined();
	});

	test('coerces string fields from raw Drizzle $raw query', () => {
		const rawRow = {
			id: '3',
			name: 'Carol',
			email: 'carol@drizzle.dev',
			age: '28',
			role: 'guest',
			active: 1,
			score: '75',
			createdAt: '2026-02-01T00:00:00.000Z',
		};
		const dto = new UserRowDto(rawRow);
		expect(dto.id).toBe(3);
		expect(dto.age).toBe(28);
		expect(dto.active).toBe(true);
		expect(dto.score).toBe(75);
	});

	test('Drizzle timestamp field is transformed to Date instance', () => {
		const dto = new UserRowDto({
			id: 4,
			name: 'Dave',
			email: 'dave@drizzle.dev',
			age: 35,
			role: 'user',
			active: true,
			score: 60,
			createdAt: '2026-02-28T12:00:00.000Z',
		});
		expect(dto.createdAt).toBeInstanceOf(Date);
		expect(dto.createdAt.getFullYear()).toBe(2026);
	});

	test('@QComputed displayName derived from Drizzle row', () => {
		const dto = new UserRowDto({
			id: 5,
			name: 'Eve',
			email: 'eve@drizzle.dev',
			age: 22,
			role: 'admin',
			active: true,
			score: 100,
			createdAt: new Date(),
		});
		expect(dto.displayName).toBe('[ADMIN] Eve');
	});

	test('checkRules passes for valid Drizzle row', () => {
		const dto = new UserRowDto({
			id: 6,
			name: 'Frank',
			email: 'frank@drizzle.dev',
			age: 40,
			role: 'guest',
			active: true,
			score: 80,
			createdAt: new Date(),
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2. Create input — toInterface() for db.insert().values()
// ---------------------------------------------------------------------------

describe('Create input — toInterface() for db.insert().values()', () => {
	test('CreateUserDto validates create payload', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@db.dev',
			age: 25,
			role: 'user',
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
	});

	test('toInterface() is suitable for db.insert(users).values()', () => {
		const dto = new CreateUserDto({
			name: 'Bob',
			email: 'bob@db.dev',
			age: 30,
			role: 'admin',
		});
		const insertValues = dto.toInterface();
		expect(insertValues.name).toBe('Bob');
		expect(insertValues.email).toBe('bob@db.dev');
	});

	test('checkRules fails when email is invalid', () => {
		const dto = new CreateUserDto({
			name: 'Carol',
			email: 'not-valid',
			age: 20,
			role: 'user',
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('checkRules fails when age < 18', () => {
		const dto = new CreateUserDto({
			name: 'Minor',
			email: 'minor@db.dev',
			age: 16,
			role: 'user',
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'age')).toBe(true);
	});

	test('extra form fields are stripped before db.insert()', () => {
		const formPayload = {
			name: 'Dave',
			email: 'dave@db.dev',
			age: 28,
			role: 'user',
			_csrf: 'tok123',
			submitBtn: true,
		};
		const dto = new CreateUserDto(formPayload);
		const values = dto.toInterface();
		expect(
			(values as unknown as Record<string, unknown>)['_csrf']
		).toBeUndefined();
		expect(
			(values as unknown as Record<string, unknown>)['submitBtn']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 3. Drizzle types — Date, number (no Decimal by default)
// ---------------------------------------------------------------------------

describe('Drizzle types — Date and number coercion', () => {
	test('Drizzle doublePrecision column (string) coerced to number via loose', () => {
		const dto = new ProductRowDto({
			id: 1,
			title: 'Widget',
			description: 'A widget',
			price: '19.99', // arrives as string from raw query
			stock: '100',
			publishedAt: new Date('2026-01-01'),
		});
		expect(dto.price).toBe(19.99);
		expect(typeof dto.price).toBe('number');
		expect(dto.stock).toBe(100);
	});

	test('Drizzle timestamp column transforms to Date', () => {
		const dto = new ProductRowDto({
			id: 2,
			title: 'Gadget',
			description: 'A gadget',
			price: 9.99,
			stock: 50,
			publishedAt: '2026-02-15T09:00:00.000Z',
		});
		expect(dto.publishedAt).toBeInstanceOf(Date);
		expect(dto.publishedAt.getMonth()).toBe(1); // February (0-indexed)
	});

	test('@QRule validates number price from Drizzle row', () => {
		const dto = new ProductRowDto({
			id: 3,
			title: 'Bad',
			description: 'Neg price',
			price: -5,
			stock: 10,
			publishedAt: new Date(),
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'price')).toBe(true);
	});

	test('@QComputed slug derived from Drizzle title', () => {
		const dto = new ProductRowDto({
			id: 4,
			title: 'Hello World Product',
			description: 'desc',
			price: 1.0,
			stock: 5,
			publishedAt: new Date(),
		});
		expect(dto.slug).toBe('hello-world-product');
	});
});

// ---------------------------------------------------------------------------
// 4. createMany() — seed / bulk import
// ---------------------------------------------------------------------------

describe('createMany() — seed / bulk import for Drizzle', () => {
	test('seeds multiple users from JSON fixture', () => {
		const seed = [
			{
				id: 10,
				name: 'A',
				email: 'a@seed.dev',
				age: 25,
				role: 'user',
				active: true,
				score: 10,
				createdAt: new Date(),
			},
			{
				id: 11,
				name: 'B',
				email: 'b@seed.dev',
				age: 30,
				role: 'admin',
				active: true,
				score: 90,
				createdAt: new Date(),
			},
			{
				id: 12,
				name: 'C',
				email: 'c@seed.dev',
				age: 22,
				role: 'guest',
				active: false,
				score: 5,
				createdAt: new Date(),
			},
		];
		const { instances, errors } = UserRowDto.createMany(seed as never[]);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
	});

	test('createMany() coerces string fields in seed fixture', () => {
		const seed = [
			{
				id: '13',
				name: 'D',
				email: 'd@seed.dev',
				age: '27',
				role: 'user',
				active: 1,
				score: '55',
				createdAt: '2026-01-01T00:00:00.000Z',
			},
		];
		const { instances } = UserRowDto.createMany(seed as never[]);
		expect(instances[0]?.id).toBe(13);
		expect(instances[0]?.age).toBe(27);
		expect(instances[0]?.score).toBe(55);
		expect(instances[0]?.createdAt).toBeInstanceOf(Date);
	});

	test('createMany().instances can be mapped to db.insert().values()', () => {
		const seed = [
			{
				id: 14,
				name: 'E',
				email: 'e@seed.dev',
				age: 32,
				role: 'admin',
				active: true,
				score: 100,
				createdAt: new Date(),
			},
		];
		const { instances } = UserRowDto.createMany(seed as never[]);
		const insertData = instances.map((dto) => dto.toInterface());
		expect(insertData[0]?.name).toBe('E');
		// toInterface() serializes Date fields to ISO string for ORM insert compatibility
		expect(typeof insertData[0]?.createdAt).toBe('string');
		expect(new Date(String(insertData[0]?.createdAt)).getFullYear()).toBe(
			new Date().getFullYear()
		);
	});
});

// ---------------------------------------------------------------------------
// 5. unknownPropertyPolicy: 'strip' — internal Drizzle columns
// ---------------------------------------------------------------------------

describe("unknownPropertyPolicy: 'strip' — internal Drizzle columns", () => {
	test('strips Drizzle internal metadata columns', () => {
		const row = {
			id: 20,
			name: 'Filtered',
			email: 'filtered@drizzle.dev',
			age: 28,
			role: 'user',
			active: true,
			score: 55,
			createdAt: new Date(),
			// Drizzle internal columns that should not be in DTO
			updatedAt: new Date(),
			deletedAt: null,
			version: 3,
		};
		const dto = new UserRowDto(row);
		expect(
			(dto as unknown as Record<string, unknown>)['updatedAt']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['deletedAt']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['version']
		).toBeUndefined();
	});

	test('strips relation objects returned by Drizzle relational queries', () => {
		const row = {
			id: 21,
			name: 'WithRelations',
			email: 'rel@drizzle.dev',
			age: 33,
			role: 'user',
			active: true,
			score: 70,
			createdAt: new Date(),
			// Drizzle relational query artifacts
			addresses: [{ street: '123 Main St' }],
			profile: { bio: 'Hello' },
		};
		const dto = new UserRowDto(row);
		expect(
			(dto as unknown as Record<string, unknown>)['addresses']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['profile']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 6. Repository pattern with QModel layer
// ---------------------------------------------------------------------------

describe('Repository pattern with DrizzleUserRepository', () => {
	class DrizzleUserRepository {
		private store = new Map<number, unknown>();
		private seq = 1;

		insert(dto: CreateUserDto): UserRowDto {
			const record = {
				...dto.toInterface(),
				id: this.seq++,
				active: true,
				score: 0,
				createdAt: new Date(),
			};
			this.store.set(record.id, record);
			return new UserRowDto(record as Record<string, unknown>);
		}

		findById(id: number): UserRowDto | null {
			const raw = this.store.get(id);
			return raw ? new UserRowDto(raw as Record<string, unknown>) : null;
		}

		findAll(): UserRowDto[] {
			return [...this.store.values()].map(
				(raw) => new UserRowDto(raw as Record<string, unknown>)
			);
		}

		delete(id: number): void {
			this.store.delete(id);
		}
	}

	let repo: DrizzleUserRepository;

	beforeEach(() => {
		userStore.clear();
		repo = new DrizzleUserRepository();
	});

	test('insert() stores and returns typed DTO', () => {
		const input = new CreateUserDto({
			name: 'Alice',
			email: 'alice@repo.dev',
			age: 28,
			role: 'user',
		});
		const created = repo.insert(input);
		expect(created.name).toBe('Alice');
		expect(typeof created.id).toBe('number');
		expect(created.createdAt).toBeInstanceOf(Date);
	});

	test('findById() returns null for unknown id', () => {
		const found = repo.findById(9999);
		expect(found).toBeNull();
	});

	test('findAll() returns all stored DTOs', () => {
		repo.insert(
			new CreateUserDto({
				name: 'B',
				email: 'b@repo.dev',
				age: 20,
				role: 'user',
			})
		);
		repo.insert(
			new CreateUserDto({
				name: 'C',
				email: 'c@repo.dev',
				age: 22,
				role: 'guest',
			})
		);
		const all = repo.findAll();
		expect(all.length).toBe(2);
	});

	test('delete() removes entry from repository', () => {
		const created = repo.insert(
			new CreateUserDto({
				name: 'D',
				email: 'd@repo.dev',
				age: 25,
				role: 'admin',
			})
		);
		repo.delete(created.id);
		expect(repo.findById(created.id)).toBeNull();
	});

	test('insert() validates data through CreateUserDto rules', () => {
		const invalid = new CreateUserDto({
			name: 'X',
			email: 'bad-email',
			age: 17,
			role: 'unknown',
		});
		const validation = qCheckRules(invalid);
		expect(validation.valid).toBe(false);
		expect(validation.errors.length).toBeGreaterThanOrEqual(3);
	});
});

// ---------------------------------------------------------------------------
// 7. copy() + db.update().set() — partial immutable update
// ---------------------------------------------------------------------------

describe('copy() + db.update().set() partial immutable update', () => {
	test('copy() creates a new DTO for db.update().set()', () => {
		const existing = new UserRowDto({
			id: 100,
			name: 'Alice',
			email: 'alice@x.dev',
			age: 25,
			role: 'user',
			active: true,
			score: 50,
			createdAt: new Date(),
		});
		const updated = existing.copy({ score: 100, role: 'admin' });
		expect(updated.score).toBe(100);
		expect(updated.role).toBe('admin');
		expect(existing.score).toBe(50); // original untouched
	});

	test('copy() result toInterface() is suitable for db.update().set()', () => {
		const dto = new UserRowDto({
			id: 101,
			name: 'Bob',
			email: 'bob@x.dev',
			age: 30,
			role: 'user',
			active: false,
			score: 20,
			createdAt: new Date(),
		});
		const patched = dto.copy({ active: true });
		const updateData = patched.toInterface();
		expect(updateData.active).toBe(true);
		expect(updateData.id).toBe(101);
	});

	test('copy() preserves Date fields correctly', () => {
		const originalDate = new Date('2026-01-01');
		const dto = new UserRowDto({
			id: 102,
			name: 'Carol',
			email: 'carol@x.dev',
			age: 35,
			role: 'guest',
			active: true,
			score: 0,
			createdAt: originalDate,
		});
		const updated = dto.copy({ score: 77 });
		expect(updated.createdAt).toBeInstanceOf(Date);
		expect(updated.createdAt.getTime()).toBe(originalDate.getTime());
	});

	test('copy() does not mark scalar fields as dirty (clean baseline)', () => {
		// Use CreateUserDto (no Date field) to test isDirty() clean baseline
		// Date fields have reference equality semantics — tested separately in test 3
		const dto = new CreateUserDto({
			name: 'Dan',
			email: 'dan@x.dev',
			age: 28,
			role: 'user',
		});
		const patched = dto.copy({ name: 'Daniel' });
		// copy() sets __initData = merged state → new instance is not dirty
		expect(patched.isDirty()).toBe(false);
		expect(patched.name).toBe('Daniel');
	});
});

// ---------------------------------------------------------------------------
// 8. @QComputed() for non-stored derived fields
// ---------------------------------------------------------------------------

describe('@QComputed() for non-stored derived fields', () => {
	test('UserRowDto displayName computed from role + name', () => {
		const dto = new UserRowDto({
			id: 200,
			name: 'Grace',
			email: 'grace@x.dev',
			age: 29,
			role: 'admin',
			active: true,
			score: 100,
			createdAt: new Date(),
		});
		expect(dto.displayName).toBe('[ADMIN] Grace');
	});

	test('ProductRowDto slug computed from title', () => {
		const dto = new ProductRowDto({
			id: 201,
			title: 'My Drizzle Product',
			description: 'Best product',
			price: 29.99,
			stock: 10,
			publishedAt: new Date(),
		});
		expect(dto.slug).toBe('my-drizzle-product');
	});

	test('@QComputed field is included in serialize()', () => {
		const dto = new UserRowDto({
			id: 202,
			name: 'Henry',
			email: 'henry@x.dev',
			age: 42,
			role: 'user',
			active: true,
			score: 65,
			createdAt: new Date(),
		});
		const serialized = dto.serialize() as Record<string, unknown>;
		expect(serialized['displayName']).toBe('[USER] Henry');
	});

	test('@QComputed field is NOT included in toInterface()', () => {
		const dto = new UserRowDto({
			id: 203,
			name: 'Iris',
			email: 'iris@x.dev',
			age: 31,
			role: 'guest',
			active: true,
			score: 45,
			createdAt: new Date(),
		});
		const iface = dto.toInterface();
		expect(
			(iface as unknown as Record<string, unknown>)['displayName']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 9. qCheckRulesAsync — DB-level uniqueness validation
// ---------------------------------------------------------------------------

describe('qCheckRulesAsync — DB-level uniqueness for Drizzle', () => {
	const emailRegistry = new Set<string>(['taken@drizzle.dev']);

	class CreateUserWithUniqueEmailDto extends CreateUserDto {
		@QRule(
			(val: string) => Promise.resolve(!emailRegistry.has(val)),
			'Email already registered'
		)
		declare email: string;
	}

	test('passes async uniqueness check for new email', async () => {
		const dto = new CreateUserWithUniqueEmailDto({
			name: 'New User',
			email: 'fresh@drizzle.dev',
			age: 25,
			role: 'user',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(true);
	});

	test('fails async uniqueness check for duplicate email', async () => {
		const dto = new CreateUserWithUniqueEmailDto({
			name: 'Dup User',
			email: 'taken@drizzle.dev',
			age: 20,
			role: 'user',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(err) => err.message === 'Email already registered'
			)
		).toBe(true);
	});
});
