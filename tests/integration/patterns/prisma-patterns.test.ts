/**
 * Prisma ORM integration patterns
 * Covers: DTO from Prisma result, create input, createMany seed,
 *         repository pattern, copy() partial update, @QComputed, qCheckRulesAsync uniqueness
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField, QComputed, QGroup } from '@/index';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUserRecord {
	uid: string;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	fullLabel?: string;
}

interface ICreateUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

interface IPostRecord {
	pid: string;
	title: string;
	body: string;
	authorId: string;
	published: boolean;
	views: number;
	excerpt?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		active: 'boolean',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserRecordDto extends QModel<IUserRecord> {
	declare uid: string;
	declare name: string;

	@QGroup('identity')
	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Invalid age')
	declare age: number;

	@QGroup('identity')
	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	declare active: boolean;
	declare score: number;

	@QComputed()
	get fullLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name} — ${this.email}`;
	}
}

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email format'
	)
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	declare age: number;

	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;
}

@Quick(
	{
		pid: 'string',
		title: 'string',
		body: 'string',
		authorId: 'string',
		published: 'boolean',
		views: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class PostRecordDto extends QModel<IPostRecord> {
	declare pid: string;
	declare title: string;
	declare body: string;
	declare authorId: string;
	declare published: boolean;
	declare views: number;

	@QComputed()
	get excerpt(): string {
		return this.body.length > 100
			? `${this.body.slice(0, 100)}…`
			: this.body;
	}
}

// ---------------------------------------------------------------------------
// Simulated in-memory stores (replaces Prisma client in tests)
// ---------------------------------------------------------------------------

const userStore = new Map<string, unknown>();
const postStore = new Map<string, unknown>();

// ---------------------------------------------------------------------------
// 1. DTO from Prisma result
// ---------------------------------------------------------------------------

describe('DTO from Prisma result', () => {
	test('maps a Prisma user row to UserRecordDto', () => {
		const prismaRow = {
			uid: 'p1',
			name: 'Alice',
			email: 'alice@prisma.io',
			age: 30,
			role: 'user',
			active: true,
			score: 95,
		};
		const dto = new UserRecordDto(prismaRow);
		expect(dto.uid).toBe('p1');
		expect(dto.email).toBe('alice@prisma.io');
	});

	test('strips internal Prisma fields (_count, _prisma_version, etc.)', () => {
		const prismaRow = {
			uid: 'p2',
			name: 'Bob',
			email: 'bob@prisma.io',
			age: 25,
			role: 'admin',
			active: false,
			score: 50,
			_count: { posts: 3 },
			_prisma: true,
		};
		const dto = new UserRecordDto(prismaRow);
		expect(
			(dto as unknown as Record<string, unknown>)['_count']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['_prisma']
		).toBeUndefined();
	});

	test('coerces string fields from raw Prisma JSON output', () => {
		const prismaRow = {
			uid: 'p3',
			name: 'Carol',
			email: 'carol@prisma.io',
			age: '28',
			role: 'guest',
			active: 1,
			score: '75',
		};
		const dto = new UserRecordDto(prismaRow);
		expect(dto.age).toBe(28);
		expect(dto.active).toBe(true);
		expect(dto.score).toBe(75);
	});

	test('fullLabel @QComputed derived from Prisma row', () => {
		const dto = new UserRecordDto({
			uid: 'p4',
			name: 'Dave',
			email: 'dave@prisma.io',
			age: 40,
			role: 'admin',
			active: true,
			score: 100,
		});
		expect(dto.fullLabel).toBe('[ADMIN] Dave — dave@prisma.io');
	});

	test('toInterface() produces Prisma-compatible create/update input', () => {
		const dto = new UserRecordDto({
			uid: 'p5',
			name: 'Eve',
			email: 'eve@prisma.io',
			age: 22,
			role: 'user',
			active: true,
			score: 60,
		});
		const iface = dto.toInterface();
		expect(iface.uid).toBe('p5');
		expect(iface.role).toBe('user');
	});

	test('checkRules passes for valid Prisma row', () => {
		const dto = new UserRecordDto({
			uid: 'p6',
			name: 'Frank',
			email: 'frank@prisma.io',
			age: 35,
			role: 'guest',
			active: true,
			score: 80,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2. Create input — toInterface() for prisma.create()
// ---------------------------------------------------------------------------

describe('Create input — toInterface() for prisma.create()', () => {
	test('CreateUserDto validates create payload', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@db.io',
			age: 25,
			role: 'user',
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
	});

	test('toInterface() can be passed to prisma.user.create()', () => {
		const dto = new CreateUserDto({
			name: 'Bob',
			email: 'bob@db.io',
			age: 30,
			role: 'admin',
		});
		const createInput = dto.toInterface();
		expect(createInput.name).toBe('Bob');
		expect(createInput.email).toBe('bob@db.io');
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
			email: 'minor@db.io',
			age: 15,
			role: 'user',
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'age')).toBe(true);
	});

	test('extra fields from form are stripped before prisma.create()', () => {
		const formData = {
			name: 'Dave',
			email: 'dave@db.io',
			age: 28,
			role: 'user',
			_csrf: 'token123',
			submit: true,
		};
		const dto = new CreateUserDto(formData);
		const input = dto.toInterface();
		expect(
			(input as unknown as Record<string, unknown>)['_csrf']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 3. createMany() — seed / bulk import
// ---------------------------------------------------------------------------

describe('createMany() — seed / bulk import', () => {
	test('seeds multiple users from CSV/JSON import', () => {
		const seed = [
			{
				uid: 's1',
				name: 'A',
				email: 'a@seed.io',
				age: 25,
				role: 'user',
				active: true,
				score: 10,
			},
			{
				uid: 's2',
				name: 'B',
				email: 'b@seed.io',
				age: 30,
				role: 'admin',
				active: true,
				score: 90,
			},
			{
				uid: 's3',
				name: 'C',
				email: 'c@seed.io',
				age: 22,
				role: 'guest',
				active: false,
				score: 5,
			},
		];
		const { instances, errors } = UserRecordDto.createMany(seed);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
	});

	test('createMany() coerces string fields in seed data', () => {
		const seed = [
			{
				uid: 's4',
				name: 'D',
				email: 'd@seed.io',
				age: '27',
				role: 'user',
				active: 1,
				score: '55',
			},
		];
		const { instances } = UserRecordDto.createMany(seed);
		expect(instances[0]?.age).toBe(27);
		expect(instances[0]?.score).toBe(55);
	});

	test('createMany().instances can be mapped to prisma.createMany() input', () => {
		const seed = [
			{
				uid: 's5',
				name: 'E',
				email: 'e@seed.io',
				age: 40,
				role: 'admin',
				active: true,
				score: 100,
			},
		];
		const { instances } = UserRecordDto.createMany(seed);
		const prismaData = instances.map((dto) => dto.toInterface());
		expect(prismaData[0]?.uid).toBe('s5');
	});
});

// ---------------------------------------------------------------------------
// 4. Repository pattern with QModel layer
// ---------------------------------------------------------------------------

describe('Repository pattern with QModel layer', () => {
	class UserRepository {
		private store = new Map<string, unknown>();

		create(dto: CreateUserDto): UserRecordDto {
			const uid = `uid-${Math.random().toString(36).slice(2, 7)}`;
			const record = {
				...dto.toInterface(),
				uid,
				active: true,
				score: 0,
			};
			this.store.set(uid, record);
			return new UserRecordDto(record);
		}

		findById(uid: string): UserRecordDto | null {
			const raw = this.store.get(uid);
			return raw ? new UserRecordDto(raw as object) : null;
		}

		findAll(): UserRecordDto[] {
			return [...this.store.values()].map(
				(raw) => new UserRecordDto(raw as object)
			);
		}

		delete(uid: string): void {
			this.store.delete(uid);
		}
	}

	let repo: UserRepository;

	beforeEach(() => {
		userStore.clear();
		repo = new UserRepository();
	});

	test('create() stores and returns typed DTO', () => {
		const input = new CreateUserDto({
			name: 'Alice',
			email: 'alice@repo.io',
			age: 28,
			role: 'user',
		});
		const created = repo.create(input);
		expect(created.name).toBe('Alice');
		expect(typeof created.uid).toBe('string');
	});

	test('findById() returns null for unknown uid', () => {
		const found = repo.findById('unknown');
		expect(found).toBeNull();
	});

	test('findAll() returns all stored DTOs', () => {
		repo.create(
			new CreateUserDto({
				name: 'B',
				email: 'b@repo.io',
				age: 20,
				role: 'user',
			})
		);
		repo.create(
			new CreateUserDto({
				name: 'C',
				email: 'c@repo.io',
				age: 22,
				role: 'guest',
			})
		);
		const all = repo.findAll();
		expect(all.length).toBe(2);
	});

	test('delete() removes entry from repository', () => {
		const created = repo.create(
			new CreateUserDto({
				name: 'D',
				email: 'd@repo.io',
				age: 25,
				role: 'admin',
			})
		);
		repo.delete(created.uid);
		const found = repo.findById(created.uid);
		expect(found).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 5. copy() + prisma.update() partial update
// ---------------------------------------------------------------------------

describe('copy() + prisma.update() partial update', () => {
	test('copy() creates updated DTO for prisma.update()', () => {
		const existing = new UserRecordDto({
			uid: 'upd1',
			name: 'Alice',
			email: 'alice@x.io',
			age: 25,
			role: 'user',
			active: true,
			score: 50,
		});
		const updated = existing.copy({ score: 100, role: 'admin' });
		expect(updated.score).toBe(100);
		expect(updated.role).toBe('admin');
		expect(existing.score).toBe(50); // immutable
	});

	test('copy() creates an immutable snapshot', () => {
		const dto = new UserRecordDto({
			uid: 'upd2',
			name: 'Bob',
			email: 'bob@x.io',
			age: 30,
			role: 'user',
			active: false,
			score: 20,
		});
		const patched = dto.copy({ active: true });
		expect(patched.active).toBe(true);
		expect(patched.isDirty()).toBe(false); // copy() sets __initData = merged state
	});

	test('toInterface() of copy() is suitable for prisma.update() data arg', () => {
		const dto = new UserRecordDto({
			uid: 'upd3',
			name: 'Carol',
			email: 'carol@x.io',
			age: 35,
			role: 'guest',
			active: true,
			score: 0,
		});
		const patched = dto.copy({ name: 'Caroline' });
		const updateData = patched.toInterface();
		expect(updateData.name).toBe('Caroline');
		expect(updateData.uid).toBe('upd3');
	});
});

// ---------------------------------------------------------------------------
// 6. @QComputed() for derived fields
// ---------------------------------------------------------------------------

describe('@QComputed() for derived fields', () => {
	test('UserRecordDto fullLabel computed from role + name + email', () => {
		const dto = new UserRecordDto({
			uid: 'c1',
			name: 'Grace',
			email: 'grace@x.io',
			age: 29,
			role: 'admin',
			active: true,
			score: 100,
		});
		expect(dto.fullLabel).toBe('[ADMIN] Grace — grace@x.io');
	});

	test('PostRecordDto excerpt truncates long body', () => {
		const longBody =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
		const post = new PostRecordDto({
			pid: 'post1',
			title: 'Test',
			body: longBody,
			authorId: 'u1',
			published: true,
			views: 0,
		});

		postStore.set('post1', post.serialize());
		expect(post.excerpt.endsWith('…')).toBe(true);
		expect(post.excerpt.length).toBeLessThanOrEqual(101);
	});

	test('PostRecordDto excerpt for short body returns full text', () => {
		const shortBody = 'Short post.';
		const post = new PostRecordDto({
			pid: 'post2',
			title: 'Short',
			body: shortBody,
			authorId: 'u1',
			published: false,
			views: 5,
		});
		expect(post.excerpt).toBe('Short post.');
	});
});

// ---------------------------------------------------------------------------
// 7. qCheckRulesAsync — DB-level validation
// ---------------------------------------------------------------------------

describe('qCheckRulesAsync — DB-level validation', () => {
	const emailRegistry = new Set<string>(['taken@db.io']);

	class UserWithUniqueEmailDto extends CreateUserDto {
		@QRule(
			(val: string) => Promise.resolve(!emailRegistry.has(val)),
			'Email already taken'
		)
		declare email: string;
	}

	test('passes async uniqueness check for new email', async () => {
		const dto = new UserWithUniqueEmailDto({
			name: 'New',
			email: 'fresh@db.io',
			age: 25,
			role: 'user',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(true);
	});

	test('fails async uniqueness check for duplicate email', async () => {
		const dto = new UserWithUniqueEmailDto({
			name: 'Dup',
			email: 'taken@db.io',
			age: 20,
			role: 'user',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(false);
	});
});
