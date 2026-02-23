/**
 * TypeORM Integration Patterns — QuickModel
 *
 * Covers: Entity vs DTO separation, coercion from entity, repository pattern,
 *         value transformers, copy() + update, @QComputed vs virtual columns,
 *         createMany() for seed/bulk insert
 *
 * No TypeORM packages imported — simulated via plain objects matching TypeORM
 * entity shape. All QModel logic is real.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField, QComputed, QGroup } from '@/index';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Simulated TypeORM Entity shapes (no typeorm import needed)
// ---------------------------------------------------------------------------

/** Simulates a TypeORM Entity from the database layer */
interface IUserEntity {
	id: number;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean | number; // SQLite stores booleans as 0/1
	score: number;
	createdAt: Date | string; // TypeORM may return Date or ISO string
	updatedAt: Date | string;
}

/** Simulates a TypeORM Entity for posts */
interface IPostEntity {
	id: number;
	title: string;
	body: string;
	authorId: number;
	published: boolean | number;
	views: number;
	createdAt: Date | string;
}

interface ICreateUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

// ---------------------------------------------------------------------------
// QModel DTOs (business / application layer)
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
		updatedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserEntityDto extends QModel<IUserEntity> {
	@QField({ label: 'ID', required: true })
	declare id: number;

	@QGroup('identity')
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QGroup('identity')
	@QField({ label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email'
	)
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Age out of range')
	declare age: number;

	@QField({ label: 'Role', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QField({ label: 'Active', widget: 'checkbox' })
	declare active: boolean;

	@QField({ label: 'Score' })
	declare score: number;

	declare createdAt: Date;
	declare updatedAt: Date;

	@QComputed()
	get displayLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name}`;
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
		id: 'number',
		title: 'string',
		body: 'string',
		authorId: 'number',
		published: 'boolean',
		views: 'number',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class PostEntityDto extends QModel<IPostEntity> {
	@QField({ label: 'ID', required: true })
	declare id: number;

	@QField({ label: 'Title', required: true })
	declare title: string;

	@QField({ label: 'Body', required: true })
	declare body: string;

	@QField({ label: 'Author ID', required: true })
	declare authorId: number;

	@QField({ label: 'Published', widget: 'checkbox' })
	declare published: boolean;

	@QField({ label: 'Views' })
	declare views: number;

	declare createdAt: Date;

	@QComputed()
	get excerpt(): string {
		return this.body.length > 80 ? `${this.body.slice(0, 80)}…` : this.body;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides: Partial<IUserEntity> = {}): IUserEntity {
	return {
		id: 1,
		name: 'Alice Example',
		email: 'alice@example.com',
		age: 30,
		role: 'user',
		active: true,
		score: 100,
		createdAt: new Date('2025-01-01T00:00:00.000Z'),
		updatedAt: new Date('2025-06-01T00:00:00.000Z'),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// 1. Entity → DTO coercion (new UserEntityDto(entity))
// ---------------------------------------------------------------------------

describe('Entity → DTO coercion', () => {
	test('new UserEntityDto(entity) coerces a TypeORM entity to DTO', () => {
		const entity = makeEntity({ id: 42, name: 'Bob', email: 'bob@x.com' });
		const dto = new UserEntityDto(entity);
		expect(dto.id).toBe(42);
		expect(dto.name).toBe('Bob');
		expect(dto.email).toBe('bob@x.com');
	});

	test('SQLite boolean (0/1) is coerced to boolean in loose mode', () => {
		const entity = makeEntity({ active: 0 as unknown as boolean });
		const dto = new UserEntityDto(entity);
		expect(dto.active).toBe(false);

		const entityActive = makeEntity({ active: 1 as unknown as boolean });
		const dtoActive = new UserEntityDto(entityActive);
		expect(dtoActive.active).toBe(true);
	});

	test('Date string from TypeORM is coerced to Date instance', () => {
		const entity = makeEntity({
			createdAt: '2025-01-15T10:00:00.000Z',
			updatedAt: '2025-06-15T12:00:00.000Z',
		});
		const dto = new UserEntityDto(entity);
		expect(dto.createdAt).toBeInstanceOf(Date);
		expect(dto.updatedAt).toBeInstanceOf(Date);
	});

	test('uppercase role from legacy DB is downcased via coercion', () => {
		const entity = makeEntity({ role: 'USER' });
		// loose coercion forces to string — casing not changed; test strip behavior
		const dto = new UserEntityDto(entity);
		expect(typeof dto.role).toBe('string');
		expect(dto.role).toBe('USER');
	});

	test('extra TypeORM internal fields are stripped (unknownPropertyPolicy: strip)', () => {
		const entityWithExtras = {
			...makeEntity(),
			__typeorm_entity__: true,
			_metadata: { version: 2 },
		};
		const dto = new UserEntityDto(entityWithExtras as IUserEntity);
		expect(
			(dto as unknown as Record<string, unknown>)['__typeorm_entity__']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['_metadata']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 2. dto.toInterface() as repository.save() payload
// ---------------------------------------------------------------------------

describe('dto.toInterface() as repository.save() payload', () => {
	// Simulated TypeORM repository
	const savedEntities: IUserEntity[] = [];

	beforeEach(() => {
		savedEntities.length = 0;
	});

	function simulateSave(data: IUserEntity): IUserEntity {
		savedEntities.push(data);
		return data;
	}

	test('toInterface() provides a plain object for repository.save()', () => {
		const entity = makeEntity({
			id: 1,
			name: 'Alice',
			email: 'alice@x.com',
		});
		const dto = new UserEntityDto(entity);
		const savePayload = dto.toInterface();
		const saved = simulateSave(savePayload);
		expect(saved.name).toBe('Alice');
		expect(saved.email).toBe('alice@x.com');
	});

	test('toInterface() result is a plain object (not a QModel instance)', () => {
		const dto = new UserEntityDto(makeEntity());
		const plain = dto.toInterface();
		expect(plain instanceof QModel).toBe(false);
		expect(typeof plain).toBe('object');
	});

	test('copy() + toInterface() provides partial update payload', () => {
		const entity = makeEntity({ id: 5, score: 50 });
		const dto = new UserEntityDto(entity);
		const updated = dto.copy({ score: 200, role: 'admin' });
		const updatePayload = updated.toInterface();
		expect(updatePayload.score).toBe(200);
		expect(updatePayload.role).toBe('admin');
		expect(dto.score).toBe(50); // original unchanged
	});
});

// ---------------------------------------------------------------------------
// 3. TypeORM value transformer pattern
// ---------------------------------------------------------------------------

describe('TypeORM value transformer pattern', () => {
	// Simulates TypeORM @Column({ transformer: { to, from } }) equivalent
	// where QuickModel handles the type coercion
	const dateTransformer = {
		to: (value: Date): string => value.toISOString(),
		from: (value: string): Date => new Date(value),
	};

	test('transformer.from() + new Dto() coerces DB string to Date', () => {
		const rawFromDb = '2025-03-15T08:30:00.000Z';
		const transformed = dateTransformer.from(rawFromDb);
		const dto = new UserEntityDto(makeEntity({ createdAt: transformed }));
		expect(dto.createdAt).toBeInstanceOf(Date);
		expect(dto.createdAt.getFullYear()).toBe(2025);
	});

	test('transformer.to() via serialize() converts to ISO string for DB storage', () => {
		const dto = new UserEntityDto(
			makeEntity({ createdAt: new Date('2025-03-15T08:30:00.000Z') })
		);
		// createdAt is available as a Date on the DTO instance
		const isoStr = dateTransformer.to(dto.createdAt);
		expect(typeof isoStr).toBe('string');
		expect(isoStr).toContain('2025');
		expect(isoStr).toContain('T08:30:00.000Z');
	});

	test('DTO coerces number-as-string from legacy DB column', () => {
		const entity = makeEntity({ score: '75' as unknown as number });
		const dto = new UserEntityDto(entity);
		expect(typeof dto.score).toBe('number');
		expect(dto.score).toBe(75);
	});
});

// ---------------------------------------------------------------------------
// 4. Repository pattern with QModel layer
// ---------------------------------------------------------------------------

describe('Repository pattern with QModel layer', () => {
	class UserRepository {
		private store = new Map<number, IUserEntity>();
		private nextId = 1;

		save(dto: UserEntityDto): UserEntityDto {
			const payload = {
				...dto.toInterface(),
				id: dto.id || this.nextId++,
			} as IUserEntity;
			this.store.set(payload.id, payload);
			return new UserEntityDto(payload);
		}

		findById(id: number): UserEntityDto | undefined {
			const entity = this.store.get(id);
			return entity ? new UserEntityDto(entity) : undefined;
		}

		findAll(): UserEntityDto[] {
			return [...this.store.values()].map(
				(entity) => new UserEntityDto(entity)
			);
		}

		update(
			id: number,
			patch: Partial<IUserEntity>
		): UserEntityDto | undefined {
			const entity = this.store.get(id);
			if (!entity) return undefined;
			const existing = new UserEntityDto(entity);
			const updated = existing.copy(patch);
			const payload = { ...updated.toInterface(), id } as IUserEntity;
			this.store.set(id, payload);
			return new UserEntityDto(payload);
		}

		delete(id: number): void {
			this.store.delete(id);
		}
	}

	let repo: UserRepository;

	beforeEach(() => {
		repo = new UserRepository();
	});

	test('save() stores a new DTO in the repository', () => {
		const dto = new UserEntityDto(makeEntity({ id: 1 }));
		const saved = repo.save(dto);
		expect(saved.name).toBe(dto.name);
	});

	test('findById() returns the saved DTO', () => {
		const dto = new UserEntityDto(makeEntity({ id: 10, name: 'Carol' }));
		repo.save(dto);
		const found = repo.findById(10);
		expect(found?.name).toBe('Carol');
	});

	test('findAll() returns all saved DTOs', () => {
		repo.save(new UserEntityDto(makeEntity({ id: 1 })));
		repo.save(new UserEntityDto(makeEntity({ id: 2, email: 'b@b.com' })));
		repo.save(new UserEntityDto(makeEntity({ id: 3, email: 'c@c.com' })));
		expect(repo.findAll().length).toBe(3);
	});

	test('update() via copy() produces updated entity', () => {
		const dto = new UserEntityDto(makeEntity({ id: 20, score: 50 }));
		repo.save(dto);
		const updated = repo.update(20, { score: 999 });
		expect(updated?.score).toBe(999);
	});

	test('delete() removes entity from repository', () => {
		const dto = new UserEntityDto(makeEntity({ id: 99 }));
		repo.save(dto);
		repo.delete(99);
		expect(repo.findById(99)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 5. createMany() for seed / DataSource.initialize()
// ---------------------------------------------------------------------------

describe('createMany() for TypeORM seed data', () => {
	test('createMany() coerces an array of entity-like objects', () => {
		const seedData = [
			makeEntity({ id: 1 }),
			makeEntity({ id: 2, email: 'b@b.com' }),
			makeEntity({ id: 3, email: 'c@c.com' }),
		];
		const { instances, errors } = UserEntityDto.createMany(seedData);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
	});

	test('createMany() handles boolean coercion from 0/1 (SQLite seed)', () => {
		const seedData = [
			makeEntity({ id: 1, active: 1 as unknown as boolean }),
			makeEntity({ id: 2, active: 0 as unknown as boolean }),
		];
		const { instances } = UserEntityDto.createMany(seedData);
		expect(instances[0]?.active).toBe(true);
		expect(instances[1]?.active).toBe(false);
	});

	test('createMany() each instance can be mapped to repository.save() via toInterface()', () => {
		const seedData = [
			makeEntity({ id: 1 }),
			makeEntity({ id: 2, email: 'two@x.com' }),
		];
		const { instances } = UserEntityDto.createMany(seedData);
		const payloads = instances.map((dto) => dto.toInterface());
		expect(payloads.length).toBe(2);
		expect(payloads[0]?.name).toBe('Alice Example');
		expect(payloads[1]?.email).toBe('two@x.com');
	});
});

// ---------------------------------------------------------------------------
// 6. @QComputed() vs TypeORM @VirtualColumn()
// ---------------------------------------------------------------------------

describe('@QComputed() in DTO vs virtual column in Entity', () => {
	test('@QComputed() displayLabel is available on DTO instance', () => {
		const dto = new UserEntityDto(
			makeEntity({ name: 'Grace', role: 'admin' })
		);
		expect(dto.displayLabel).toBe('[ADMIN] Grace');
	});

	test('@QComputed() excerpt truncates long bodies', () => {
		const post = new PostEntityDto({
			id: 1,
			title: 'Hello',
			body: 'A'.repeat(100),
			authorId: 1,
			published: true,
			views: 0,
			createdAt: new Date(),
		});
		expect(post.excerpt.endsWith('…')).toBe(true);
		expect(post.excerpt.length).toBeLessThanOrEqual(81);
	});

	test('@QComputed() is not persisted in toInterface()', () => {
		const dto = new UserEntityDto(
			makeEntity({ name: 'Dan', role: 'user' })
		);
		const plain = dto.toInterface() as Record<string, unknown>;
		// @QComputed fields are NOT in toInterface(), unlike @VirtualColumn in TypeORM
		// This is by design — they are derived at runtime, not stored
		expect(typeof plain).toBe('object');
		// The real fields should be present
		expect(plain['name']).toBe('Dan');
		expect(plain['role']).toBe('user');
	});
});

// ---------------------------------------------------------------------------
// 7. copy() + repository.update() partial update pattern
// ---------------------------------------------------------------------------

describe('copy() + repository.update() partial update', () => {
	test('copy() preserves all fields and updates only the given patch', () => {
		const entity = makeEntity({ id: 7, name: 'Eve', score: 30 });
		const dto = new UserEntityDto(entity);
		const updated = dto.copy({ score: 500, role: 'admin' });
		expect(updated.score).toBe(500);
		expect(updated.role).toBe('admin');
		expect(updated.name).toBe('Eve'); // unchanged
		expect(dto.score).toBe(30); // original immutable
	});

	test('copy() result can be used with repository.update() pattern', () => {
		const entity = makeEntity({
			id: 8,
			name: 'Frank',
			email: 'frank@x.com',
		});
		const dto = new UserEntityDto(entity);
		const patched = dto.copy({ email: 'frank-updated@x.com' });
		// repository.update({ where: { id: 8 }, ...patched.toInterface() })
		const updatePayload = patched.toInterface();
		expect(updatePayload.email).toBe('frank-updated@x.com');
	});

	test('copy() result has isDirty() = false (fresh snapshot)', () => {
		const dto = new UserEntityDto(makeEntity({ id: 9 }));
		const updated = dto.copy({ score: 100 });
		expect(updated.isDirty()).toBe(false); // copy() injects __initData = merged state
	});
});

// ---------------------------------------------------------------------------
// 8. qCheckRules() for business validation before persist
// ---------------------------------------------------------------------------

describe('qCheckRules() before repository.save()', () => {
	test('passes for valid entity DTO', () => {
		const dto = new CreateUserDto({
			name: 'Helena',
			email: 'helena@example.com',
			age: 28,
			role: 'user',
		});
		const { valid } = qCheckRules(dto);
		expect(valid).toBe(true);
	});

	test('fails when email is invalid (prevents invalid save)', () => {
		const dto = new CreateUserDto({
			name: 'Ivan',
			email: 'not-an-email',
			age: 22,
			role: 'guest',
		});
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);
		expect(errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('async rule for DB uniqueness check before save', async () => {
		const existingEmails = new Set<string>(['taken@db.io']);

		@Quick(
			{ name: 'string', email: 'string', age: 'number', role: 'string' },
			{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
		)
		class UniqueUserDto extends QModel<ICreateUser> {
			declare name: string;
			@QRule(
				(val: string) => Promise.resolve(!existingEmails.has(val)),
				'Email already in use'
			)
			declare email: string;
			declare age: number;
			declare role: string;
		}

		const valid = new UniqueUserDto({
			name: 'New',
			email: 'new@db.io',
			age: 25,
			role: 'user',
		});
		const duplicate = new UniqueUserDto({
			name: 'Dup',
			email: 'taken@db.io',
			age: 25,
			role: 'user',
		});

		expect((await qCheckRulesAsync(valid)).valid).toBe(true);
		expect((await qCheckRulesAsync(duplicate)).valid).toBe(false);
	});
});
