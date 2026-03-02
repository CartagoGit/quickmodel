/**
 * MSW (Mock Service Worker) Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used with MSW v2.
 * No MSW packages imported — pure TypeScript logic only (handlers simulated).
 *
 * Key patterns:
 * - GET handler: serialize() produces typed JSON responses
 * - List handler: createMany() for bulk fixture generation
 * - POST handler: new Dto(body) + checkRules() → 422 or 201
 * - Mock factory: reusable typed fixture builders
 * - Error responses: validation errors in MSW handlers
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed } from '@/decorators';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUser {
	id: string;
	username: string;
	email: string;
	age: number;
	role: string;
	displayName?: string;
}

interface ICreateUser {
	username: string;
	email: string;
	age: number;
	role: string;
}

interface IPost {
	id: string;
	title: string;
	body: string;
	authorId: string;
	createdAt: Date;
	preview?: string;
}

@Quick(
	{
		id: 'string',
		username: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserDto extends QModel<IUser> {
	declare id: string;
	declare username: string;
	declare email: string;
	declare age: number;
	declare role: string;

	@QComputed()
	get displayName(): string {
		return `${this.username} (${this.role})`;
	}
}

@Quick(
	{ username: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule((val: string) => val.length >= 3, 'Username too short')
	@QRule((val: string) => /^[a-z0-9_]+$/.test(val), 'Invalid username format')
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	declare email: string;

	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	declare age: number;

	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['user', 'admin', 'editor'].includes(val),
		'Invalid role'
	)
	declare role: string;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		body: 'string',
		authorId: 'string',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class PostDto extends QModel<IPost> {
	declare id: string;
	declare title: string;
	declare body: string;
	declare authorId: string;
	declare createdAt: Date;

	@QComputed()
	get preview(): string {
		return this.body.slice(0, 80) + (this.body.length > 80 ? '...' : '');
	}
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const seedUsers = [
	{
		id: 'u1',
		username: 'alice_01',
		email: 'alice@example.com',
		age: '28',
		role: 'admin',
		_internal: 'x',
	},
	{
		id: 'u2',
		username: 'bob_02',
		email: 'bob@example.com',
		age: '35',
		role: 'editor',
		_internal: 'y',
	},
	{
		id: 'u3',
		username: 'carol_03',
		email: 'carol@example.com',
		age: '22',
		role: 'user',
		_internal: 'z',
	},
];

// ---------------------------------------------------------------------------
// Simulated MSW-style handler factories
// ---------------------------------------------------------------------------

interface IHandlerResponse<T> {
	status: number;
	body: T;
}

// Simulate http.get('/api/users/:id', ...) handler
function createGetUserHandler(
	store: Map<string, UserDto>
): (id: string) => IHandlerResponse<IUser | { error: string }> {
	return (id) => {
		const user = store.get(id);
		if (!user)
			return { status: 404, body: { error: `User ${id} not found` } };
		return { status: 200, body: user.$qSerialize() as IUser };
	};
}

// Simulate http.get('/api/users', ...) handler
function createListUsersHandler(
	rawUsers: Record<string, unknown>[]
): IHandlerResponse<IUser[]> {
	const { instances, errors } = UserDto.createMany(rawUsers);
	if (errors.length > 0) {
		throw new Error(
			`Fixture error: failed to parse ${errors.length} users`
		);
	}
	return {
		status: 200,
		body: instances.map((usr) => usr.$qSerialize() as IUser),
	};
}

// Simulate http.post('/api/users', ...) mutation handler
function createPostUserHandler(
	body: Record<string, unknown>
): IHandlerResponse<
	IUser | { errors: Array<{ field: string; message: string }> }
> {
	const dto = new CreateUserDto(body);
	const { valid, errors } = dto.$qCheckRules();
	if (!valid) {
		return {
			status: 422,
			body: { errors },
		};
	}
	// Simulate DB insert
	const created: IUser = {
		...(dto.$qSerialize() as ICreateUser),
		id: 'new-id-123',
	};
	return { status: 201, body: created };
}

// Reusable fixture factory
function createUserFixture(overrides: Partial<IUser> = {}): UserDto {
	return new UserDto({
		id: 'fixture-id',
		username: 'test_user',
		email: 'test@example.com',
		age: 25,
		role: 'user',
		...overrides,
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. GET handler — single resource
// ---------------------------------------------------------------------------

describe('MSW — GET /api/users/:id handler', () => {
	let store: Map<string, UserDto>;

	beforeEach(() => {
		store = new Map();
		const { instances } = UserDto.createMany(
			seedUsers as Record<string, unknown>[]
		);
		instances.forEach((usr) => store.set(usr.id, usr));
	});

	test('returns 200 with serialized user', () => {
		const handler = createGetUserHandler(store);
		const response = handler('u1');
		expect(response.status).toBe(200);
		expect((response.body as IUser).username).toBe('alice_01');
	});

	test('@QComputed displayName is in the response', () => {
		const handler = createGetUserHandler(store);
		const response = handler('u2');
		expect((response.body as IUser).displayName).toBe('bob_02 (editor)');
	});

	test('returns 404 for unknown id', () => {
		const handler = createGetUserHandler(store);
		const response = handler('unknown');
		expect(response.status).toBe(404);
	});

	test('internal fields are stripped from response', () => {
		const handler = createGetUserHandler(store);
		const response = handler('u3');
		expect(response.body).not.toHaveProperty('_internal');
	});
});

// ---------------------------------------------------------------------------
// 2. GET handler — list with createMany()
// ---------------------------------------------------------------------------

describe('MSW — GET /api/users list handler', () => {
	test('returns 200 with all users', () => {
		const response = createListUsersHandler(seedUsers);
		expect(response.status).toBe(200);
		expect(response.body).toHaveLength(3);
	});

	test('all ages are coerced to numbers', () => {
		const response = createListUsersHandler(seedUsers);
		response.body.forEach((user) => {
			expect(typeof user.age).toBe('number');
		});
	});

	test('internal fields stripped from all users', () => {
		const response = createListUsersHandler(seedUsers);
		response.body.forEach((user) => {
			expect(user).not.toHaveProperty('_internal');
		});
	});

	test('@QComputed displayName in all list items', () => {
		const response = createListUsersHandler(seedUsers);
		response.body.forEach((user) => {
			expect(user.displayName).toBeDefined();
			expect(user.displayName).toContain(user.username);
		});
	});
});

// ---------------------------------------------------------------------------
// 3. POST handler — validation → 422 or 201
// ---------------------------------------------------------------------------

describe('MSW — POST /api/users mutation handler', () => {
	test('valid body returns 201 with created user', () => {
		const response = createPostUserHandler({
			username: 'new_user',
			email: 'new@example.com',
			age: 25,
			role: 'user',
		});
		expect(response.status).toBe(201);
		expect((response.body as IUser).username).toBe('new_user');
	});

	test('invalid body returns 422 with errors', () => {
		const response = createPostUserHandler({
			username: 'ab', // too short
			email: 'not-email',
			age: 15, // under 18
			role: 'hacker', // invalid
		});
		expect(response.status).toBe(422);
		const body = response.body as {
			errors: Array<{ field: string; message: string }>;
		};
		expect(body.errors).toBeDefined();
		expect(body.errors.length).toBeGreaterThan(0);
	});

	test('422 errors reference specific fields', () => {
		const response = createPostUserHandler({
			username: 'ab',
			email: 'bad',
			age: 15,
			role: 'x',
		});
		const body = response.body as {
			errors: Array<{ field: string; message: string }>;
		};
		const fields = body.errors.map((err) => err.field);
		expect(fields).toContain('username');
		expect(fields).toContain('email');
		expect(fields).toContain('age');
	});

	test('extra fields stripped before 201 response', () => {
		const response = createPostUserHandler({
			username: 'clean_user',
			email: 'clean@example.com',
			age: 30,
			role: 'user',
			_csrf: 'token',
		});
		expect(response.body as IUser).not.toHaveProperty('_csrf');
	});

	test('age coercion works in POST body', () => {
		const response = createPostUserHandler({
			username: 'coerced_user',
			email: 'coerced@example.com',
			age: '25', // sent as string from FormData
			role: 'user',
		});
		expect(response.status).toBe(201);
		expect(typeof (response.body as IUser).age).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// 4. Reusable mock factory
// ---------------------------------------------------------------------------

describe('MSW — Reusable fixture factory', () => {
	test('creates user with defaults', () => {
		const user = createUserFixture();
		expect(user.id).toBe('fixture-id');
		expect(user.role).toBe('user');
	});

	test('overrides are applied', () => {
		const admin = createUserFixture({
			id: 'admin-1',
			role: 'admin',
			username: 'admin_user',
		});
		expect(admin.id).toBe('admin-1');
		expect(admin.role).toBe('admin');
	});

	test('fixture serialize() for HttpResponse.json()', () => {
		const user = createUserFixture({
			id: 'u99',
			username: 'fixture_user',
			age: 30,
		});
		const body = user.$qSerialize();
		expect(body).toHaveProperty('id', 'u99');
		expect(body).toHaveProperty('displayName');
	});

	test('fixture can be used in multiple handlers', () => {
		const admin = createUserFixture({
			id: 'a1',
			role: 'admin',
			username: 'super_admin',
		});
		const regular = createUserFixture({
			id: 'r1',
			username: 'regular_user',
		});
		expect(admin.role).toBe('admin');
		expect(regular.role).toBe('user');
	});
});

// ---------------------------------------------------------------------------
// 5. PostDto handlers — Date coercion + @QComputed
// ---------------------------------------------------------------------------

describe('MSW — PostDto: Date coercion and @QComputed preview', () => {
	const rawPosts = [
		{
			id: 'post1',
			title: 'Hello World',
			body: 'This is the first post content that is quite long and should be previewed properly.',
			authorId: 'u1',
			createdAt: '2026-01-15T10:00:00Z',
		},
		{
			id: 'post2',
			title: 'Short Post',
			body: 'Brief.',
			authorId: 'u2',
			createdAt: '2026-01-16T12:00:00Z',
		},
	];

	test('createdAt is coerced to Date', () => {
		const { instances } = PostDto.createMany(
			rawPosts as Record<string, unknown>[]
		);
		instances.forEach((post) => {
			expect(post.createdAt).toBeInstanceOf(Date);
		});
	});

	test('preview truncates long body', () => {
		const { instances } = PostDto.createMany(
			rawPosts as Record<string, unknown>[]
		);
		const longPost = instances[0];
		expect(longPost.preview).toHaveLength(83); // 80 + '...'
	});

	test('preview does not truncate short body', () => {
		const { instances } = PostDto.createMany(
			rawPosts as Record<string, unknown>[]
		);
		const shortPost = instances[1];
		expect(shortPost.preview).toBe('Brief.');
	});

	test('serialized posts include preview', () => {
		const { instances } = PostDto.createMany(
			rawPosts as Record<string, unknown>[]
		);
		const serialized = instances.map((post) => post.$qSerialize());
		serialized.forEach((post) => {
			expect(post).toHaveProperty('preview');
		});
	});
});
