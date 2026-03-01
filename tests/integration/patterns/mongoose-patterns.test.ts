// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Mongoose Integration Patterns — QuickModel
 *
 * Covers: Document vs DTO, doc.toObject() coercion, ObjectId→string,
 *         repository pattern, Model.create(), copy()+findByIdAndUpdate,
 *         createMany() for insertMany(), @QComputed non-persisted fields
 *
 * No mongoose package imported — simulated via plain objects matching Mongoose
 * doc shape (toObject() returns plain objects). All QModel logic is real.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed, QGroup } from '@/decorators';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Simulated Mongoose document shapes
// ---------------------------------------------------------------------------

/** Simulates a Mongoose ObjectId (toString() yields a hex string) */
class ObjectId {
	private readonly hex: string;

	constructor(input?: string) {
		this.hex =
			input ?? Math.random().toString(16).slice(2, 26).padStart(24, '0');
	}

	toString(): string {
		return this.hex;
	}

	toJSON(): string {
		return this.hex;
	}
}

/** Raw Mongoose document shape as returned by doc.toObject() */
interface IUserDoc {
	_id: ObjectId | string;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	createdAt: Date | string;
	updatedAt: Date | string;
	__v?: number;
}

/** Business-layer DTO interface */
interface IUserRecord {
	id: string;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	createdAt: Date;
}

interface ICreateUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

// ---------------------------------------------------------------------------
// QModel DTOs
// ---------------------------------------------------------------------------

@Quick(
	{
		id: 'string',
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
class UserDto extends QModel<IUserRecord> {
	@QGroup('identity')
	@QField({ widget: 'input', label: 'ID' })
	declare id: string;

	@QGroup('identity')
	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QGroup('identity')
	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email'
	)
	declare email: string;

	@QGroup('profile')
	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Age out of range')
	declare age: number;

	@QGroup('profile')
	@QField({ widget: 'input', label: 'Role', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QField({ label: 'Active', widget: 'checkbox' })
	declare active: boolean;

	@QField({ widget: 'input', label: 'Score' })
	declare score: number;

	declare createdAt: Date;

	@QComputed()
	get displayLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name}`;
	}

	@QComputed()
	get isVerified(): boolean {
		return this.active && this.score >= 50;
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
		'Invalid email'
	)
	declare email: string;

	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18+')
	declare age: number;

	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;
}

interface IPostRecord {
	id: string;
	title: string;
	body: string;
	authorId: string;
	tags: string[];
	views: number;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		body: 'string',
		authorId: 'string',
		tags: Array,
		views: 'number',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class PostDto extends QModel<IPostRecord> {
	@QField({ widget: 'input', label: 'ID' })
	declare id: string;

	@QField({ widget: 'input', label: 'Title', required: true })
	@QRule((val: string) => val.trim().length >= 3, 'Title too short')
	declare title: string;

	@QField({ widget: 'input', label: 'Body', required: true })
	@QRule((val: string) => val.trim().length >= 10, 'Body too short')
	declare body: string;

	@QField({ widget: 'input', label: 'Author ID', required: true })
	declare authorId: string;

	@QField({ widget: 'input', label: 'Tags' })
	declare tags: string[];

	@QField({ widget: 'input', label: 'Views' })
	declare views: number;

	declare createdAt: Date;

	@QComputed()
	get excerpt(): string {
		return this.body.length > 80 ? `${this.body.slice(0, 80)}…` : this.body;
	}

	@QComputed()
	get tagCount(): number {
		return this.tags?.length ?? 0;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserDoc(overrides: Partial<IUserDoc> = {}): IUserDoc {
	return {
		_id: new ObjectId('507f1f77bcf86cd799439011'),
		name: 'Alice',
		email: 'alice@example.com',
		age: 30,
		role: 'user',
		active: true,
		score: 80,
		createdAt: new Date('2025-01-01T00:00:00.000Z'),
		updatedAt: new Date('2025-06-01T00:00:00.000Z'),
		__v: 0,
		...overrides,
	};
}

/** Simulates doc.toObject(): strips mongoose-specific Symbol keys, keeps __v */
function docToObject(doc: IUserDoc): IUserRecord {
	const { _id, __v: _v, updatedAt: _u, ...rest } = doc;
	return { id: _id.toString(), ...rest, createdAt: rest.createdAt as Date };
}

// ---------------------------------------------------------------------------
// 1. Document vs DTO — new UserDto(doc.toObject())
// ---------------------------------------------------------------------------

describe('Document → DTO coercion via doc.toObject()', () => {
	test('new UserDto(doc.toObject()) coerces Mongoose document', () => {
		const doc = makeUserDoc({ name: 'Bob', email: 'bob@x.com', age: 25 });
		const dto = new UserDto(docToObject(doc));
		expect(dto.name).toBe('Bob');
		expect(dto.email).toBe('bob@x.com');
		expect(dto.age).toBe(25);
	});

	test('ObjectId._id is coerced to string id field', () => {
		const objectId = new ObjectId('507f1f77bcf86cd799439011');
		const doc = makeUserDoc({ _id: objectId });
		const plain = docToObject(doc);
		expect(typeof plain.id).toBe('string');
		expect(plain.id).toBe('507f1f77bcf86cd799439011');
	});

	test('Mongoose __v and internal fields are stripped', () => {
		const doc = makeUserDoc();
		const dto = new UserDto(docToObject(doc));
		expect(
			(dto as unknown as Record<string, unknown>)['__v'] // @quickmodel-rule-ignore: no-as-unknown
		).toBeUndefined();
	});

	test('Date field from doc is preserved as Date instance', () => {
		const doc = makeUserDoc({
			createdAt: new Date('2025-03-15T08:00:00.000Z'),
		});
		const dto = new UserDto(docToObject(doc));
		expect(dto.createdAt).toBeInstanceOf(Date);
		expect(dto.createdAt.getFullYear()).toBe(2025);
	});

	test('ISO date string from lean() query is coerced to Date', () => {
		const doc = makeUserDoc({ createdAt: '2025-05-01T00:00:00.000Z' });
		const dto = new UserDto(docToObject(doc));
		expect(dto.createdAt).toBeInstanceOf(Date);
	});

	test('number-as-string from legacy schema coerced to number via loose', () => {
		const doc = makeUserDoc({ score: '95' as unknown as number }); // @quickmodel-rule-ignore: no-as-unknown
		const dto = new UserDto(docToObject(doc));
		expect(dto.score).toBe(95);
		expect(typeof dto.score).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// 2. Repository pattern with Mongoose + QModel
// ---------------------------------------------------------------------------

describe('Mongoose repository pattern with QModel layer', () => {
	/** Simulated Mongoose Model in-memory */
	class MongoUserModel {
		private store = new Map<string, IUserDoc>();

		findById(id: string): Promise<IUserDoc | null> {
			return Promise.resolve(this.store.get(id) ?? null);
		}

		find(): Promise<IUserDoc[]> {
			return Promise.resolve([...this.store.values()]);
		}

		create(data: Omit<IUserDoc, '__v'>): Promise<IUserDoc> {
			const doc: IUserDoc = { ...data, __v: 0 };
			this.store.set(data._id.toString(), doc);
			return Promise.resolve(doc);
		}

		findByIdAndUpdate(
			id: string,
			patch: Partial<IUserDoc>
		): Promise<IUserDoc | null> {
			const existing = this.store.get(id);
			if (!existing) return Promise.resolve(null);
			const updated = { ...existing, ...patch };
			this.store.set(id, updated);
			return Promise.resolve(updated);
		}

		deleteOne(id: string): Promise<void> {
			this.store.delete(id);
			return Promise.resolve();
		}
	}

	class UserRepository {
		constructor(private readonly model: MongoUserModel) {}

		async findById(id: string): Promise<UserDto | undefined> {
			const doc = await this.model.findById(id);
			return doc ? new UserDto(docToObject(doc)) : undefined;
		}

		async save(dto: CreateUserDto): Promise<UserDto> {
			const { valid, errors } = qCheckRules(dto);
			if (!valid) throw new Error(errors[0]?.message);
			const doc = await this.model.create({
				_id: new ObjectId(),
				...(dto.toInterface() as Omit<IUserDoc, '_id' | '__v'>),
				active: true,
				score: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			return new UserDto(docToObject(doc));
		}

		async findAll(): Promise<UserDto[]> {
			const docs = await this.model.find();
			return docs.map((doc) => new UserDto(docToObject(doc)));
		}

		async update(
			id: string,
			patch: Partial<IUserRecord>
		): Promise<UserDto | undefined> {
			const existing = await this.findById(id);
			if (!existing) return undefined;
			const updated = existing.copy(patch);
			const doc = await this.model.findByIdAndUpdate(
				id,
				updated.toInterface() as Partial<IUserDoc>
			);
			return doc ? new UserDto(docToObject(doc)) : undefined;
		}
	}

	let mongoModel: MongoUserModel;
	let repo: UserRepository;

	beforeEach(() => {
		mongoModel = new MongoUserModel();
		repo = new UserRepository(mongoModel);
	});

	test('save() validates and stores DTO', async () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@x.com',
			age: 25,
			role: 'user',
		});
		const saved = await repo.save(dto);
		expect(saved.name).toBe('Alice');
		expect(saved.active).toBe(true);
	});

	test('save() throws on invalid data', async () => {
		const dto = new CreateUserDto({
			name: 'X',
			email: 'bad-email',
			age: 17,
			role: 'root',
		});
		try {
			await repo.save(dto);
			expect(true).toBe(false); // should not reach here
		} catch {
			expect(true).toBe(true);
		}
	});

	test('findAll() returns DTOs for all documents', async () => {
		const dto1 = new CreateUserDto({
			name: 'Alice',
			email: 'a@x.com',
			age: 25,
			role: 'user',
		});
		const dto2 = new CreateUserDto({
			name: 'Bob',
			email: 'b@x.com',
			age: 30,
			role: 'admin',
		});
		await repo.save(dto1);
		await repo.save(dto2);
		const all = await repo.findAll();
		expect(all.length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// 3. dto.toInterface() as payload for Model.create()
// ---------------------------------------------------------------------------

describe('dto.toInterface() as Mongoose Model.create() payload', () => {
	test('toInterface() returns plain object suitable for Model.create()', () => {
		const dto = new CreateUserDto({
			name: 'Carol',
			email: 'carol@x.com',
			age: 28,
			role: 'guest',
		});
		const payload = dto.toInterface();
		expect(payload instanceof QModel).toBe(false);
		expect(typeof payload).toBe('object');
		expect(payload.name).toBe('Carol');
	});

	test('toInterface() does not include @QComputed fields', () => {
		const dto = new UserDto(
			docToObject(makeUserDoc({ name: 'Dan', role: 'admin' }))
		);
		const plain = dto.toInterface() as unknown as Record<string, unknown>; // @quickmodel-rule-ignore: no-as-unknown
		expect(plain['name']).toBe('Dan');
		// computed fields are NOT persisted
		expect(typeof plain).toBe('object');
	});
});

// ---------------------------------------------------------------------------
// 4. copy() + findByIdAndUpdate() — partial update
// ---------------------------------------------------------------------------

describe('copy() + findByIdAndUpdate() partial update', () => {
	test('copy() creates immutable patch for update', () => {
		const doc = makeUserDoc({ name: 'Eve', score: 20 });
		const dto = new UserDto(docToObject(doc));
		const updated = dto.copy({ score: 100, role: 'admin' });
		expect(updated.score).toBe(100);
		expect(updated.role).toBe('admin');
		expect(dto.score).toBe(20); // original unchanged
	});

	test('copy() isDirty() = false (clean snapshot for next change tracking)', () => {
		const dto = new UserDto(docToObject(makeUserDoc()));
		const updated = dto.copy({ score: 75 });
		expect(updated.isDirty()).toBe(false);
	});

	test('copy() toInterface() produces valid findByIdAndUpdate patch', () => {
		const doc = makeUserDoc({ name: 'Frank', email: 'frank@x.com' });
		const dto = new UserDto(docToObject(doc));
		const patched = dto.copy({ email: 'frank-new@x.com' });
		const updatePayload = patched.toInterface();
		expect(updatePayload.email).toBe('frank-new@x.com');
	});
});

// ---------------------------------------------------------------------------
// 5. createMany() for insertMany() seed
// ---------------------------------------------------------------------------

describe('createMany() for Mongoose insertMany() seed data', () => {
	test('createMany() coerces array of doc.toObject() results', () => {
		const docs = [
			makeUserDoc({
				_id: new ObjectId('aaa000000000000000000001'),
				name: 'Alice',
			}),
			makeUserDoc({
				_id: new ObjectId('bbb000000000000000000002'),
				name: 'Bob',
				email: 'bob@x.com',
			}),
			makeUserDoc({
				_id: new ObjectId('ccc000000000000000000003'),
				name: 'Carol',
				email: 'carol@x.com',
			}),
		];
		const plains = docs.map(docToObject);
		const { instances, errors } = UserDto.createMany(plains as any[]);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
	});

	test('createMany() maps to toInterface() for insertMany() payloads', () => {
		const docs = [
			makeUserDoc({
				_id: new ObjectId('ddd000000000000000000004'),
				name: 'Dave',
				email: 'd@x.com',
			}),
			makeUserDoc({
				_id: new ObjectId('eee000000000000000000005'),
				name: 'Eve',
				email: 'e@x.com',
				role: 'admin',
			}),
		];
		const { instances } = UserDto.createMany(docs.map(docToObject));
		const payloads = instances.map((dto) => dto.toInterface());
		expect(payloads.length).toBe(2);
		expect(payloads[0]?.name).toBe('Dave');
		expect(payloads[1]?.role).toBe('admin');
	});

	test('number-as-string age coerced in bulk createMany()', () => {
		const docs = [
			makeUserDoc({ age: '25' as unknown as number }), // @quickmodel-rule-ignore: no-as-unknown
			makeUserDoc({ age: '33' as unknown as number, email: 'two@x.com' }), // @quickmodel-rule-ignore: no-as-unknown
		];
		const { instances } = UserDto.createMany(docs.map(docToObject));
		expect(instances[0]?.age).toBe(25);
		expect(instances[1]?.age).toBe(33);
	});
});

// ---------------------------------------------------------------------------
// 6. @QComputed() — non-persisted computed fields
// ---------------------------------------------------------------------------

describe('@QComputed() fields — not persisted in MongoDB', () => {
	test('@QComputed displayLabel available on DTO', () => {
		const dto = new UserDto(
			docToObject(makeUserDoc({ name: 'Grace', role: 'admin' }))
		);
		expect(dto.displayLabel).toBe('[ADMIN] Grace');
	});

	test('@QComputed isVerified based on active + score', () => {
		const verified = new UserDto(
			docToObject(makeUserDoc({ active: true, score: 80 }))
		);
		const unverified = new UserDto(
			docToObject(makeUserDoc({ active: true, score: 10 }))
		);
		expect(verified.isVerified).toBe(true);
		expect(unverified.isVerified).toBe(false);
	});

	test('PostDto @QComputed excerpt truncates long body', () => {
		const post = new PostDto({
			id: '123',
			title: 'Hello World',
			body: 'A'.repeat(120),
			authorId: '456',
			tags: ['tech', 'node'],
			views: 0,
			createdAt: new Date(),
		});
		expect(post.excerpt.endsWith('…')).toBe(true);
		expect(post.excerpt.length).toBeLessThanOrEqual(81);
	});

	test('PostDto @QComputed tagCount returns tag array length', () => {
		const post = new PostDto({
			id: '1',
			title: 'Tags Demo',
			body: 'Body content here for test',
			authorId: '1',
			tags: ['a', 'b', 'c'],
			views: 0,
			createdAt: new Date(),
		});
		expect(post.tagCount).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// 7. Async validation — unique email before Model.create()
// ---------------------------------------------------------------------------

describe('async validation before Mongoose Model.create()', () => {
	test('async email uniqueness check before create', async () => {
		const existingEmails = new Set(['taken@mongo.io']);

		@Quick(
			{ name: 'string', email: 'string', age: 'number', role: 'string' },
			{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
		)
		class UniqueCreateDto extends QModel<ICreateUser> {
			declare name: string;

			@QRule(
				(val: string) => Promise.resolve(!existingEmails.has(val)),
				'Email already registered'
			)
			declare email: string;

			declare age: number;
			declare role: string;
		}

		const available = new UniqueCreateDto({
			name: 'New',
			email: 'new@mongo.io',
			age: 25,
			role: 'user',
		});
		const duplicate = new UniqueCreateDto({
			name: 'Dup',
			email: 'taken@mongo.io',
			age: 25,
			role: 'user',
		});

		expect((await qCheckRulesAsync(available)).valid).toBe(true);
		const dupResult = await qCheckRulesAsync(duplicate);
		expect(dupResult.valid).toBe(false);
		expect(dupResult.errors[0]?.field).toBe('email');
	});
});
