# MSW Integration

Mock Service Worker (MSW) intercepts network requests in tests and the browser. QuickModel
works as the **data layer** inside MSW handlers — coercing request bodies into typed DTOs,
validating them with `@QRule`, and returning well-typed serialized responses.

## Key Patterns

| Pattern                 | QuickModel API                                |
| ----------------------- | --------------------------------------------- |
| Request body coercion   | `new Dto(body)` + `coercionStrategy: 'loose'` |
| Handler-side validation | `dto.checkRules()` → 422 on error             |
| Response serialization  | `dto.serialize()` → `HttpResponse.json()`     |
| Fixture factories       | `new Dto(defaults)` with `serialize()`        |
| Bulk mock data          | `Dto.createMany(seedArray)`                   |
| Private field stripping | `unknownPropertyPolicy: 'strip'`              |

## Installation

```bash
npm install quickmodel msw
```

## Model Setup

Define separate DTOs for read (includes `id`) and write (user-supplied data only):

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IUser {
	id: string;
	username: string;
	email: string;
	age: number;
	role: string;
}

interface ICreateUser {
	username: string;
	email: string;
	age: number;
	role: string;
}

// Read DTO — for GET responses and store
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

// Write DTO — for POST/PUT request bodies
@Quick(
	{ username: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ label: 'Username', required: true })
	@QRule((v: string) => v.length >= 3, 'Username too short')
	@QRule((v: string) => /^[a-z0-9_]+$/.test(v), 'Invalid username format')
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Invalid email address'
	)
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((v: number) => v >= 18, 'Must be 18 or older')
	declare age: number;

	@QField({ label: 'Role' })
	@QRule(
		(v: string) => ['user', 'admin', 'editor'].includes(v),
		'Invalid role'
	)
	declare role: string;
}
```

> **`coercionStrategy: 'loose'`** on `CreateUserDto` handles FormData or JSON requests
> that send `age` as a string (`"25"` → `25`).

## GET Handler

```typescript
import { http, HttpResponse } from 'msw';

// In-memory store — seeded from typed DTOs
const { instances: seedUsers } = UserDto.createMany([
	{
		id: 'u1',
		username: 'alice',
		email: 'alice@example.com',
		age: 30,
		role: 'admin',
	},
	{
		id: 'u2',
		username: 'bob',
		email: 'bob@example.com',
		age: 25,
		role: 'user',
	},
]);
const store = new Map(seedUsers.map((u) => [u.id, u]));

export const handlers = [
	http.get('/api/users/:id', ({ params }) => {
		const user = store.get(params.id as string);
		if (!user) {
			return HttpResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}
		// serialize() strips @QComputed fields and internal state
		return HttpResponse.json(user.$qm.serialize(), { status: 200 });
	}),

	http.get('/api/users', () => {
		const users = [...store.values()].map((u) => u.$qm.serialize());
		return HttpResponse.json(users, { status: 200 });
	}),
];
```

## POST Handler — Validate Request Body

Coerce the request body with `CreateUserDto` then validate with `checkRules()`:

```typescript
http.post('/api/users', async ({ request }) => {
	const body = await request.json();

	// Coerce & sanitize — strips unknown fields automatically
	const dto = new CreateUserDto(body);
	const { valid, errors } = dto.$qm.checkRules();

	if (!valid) {
		return HttpResponse.json({ errors }, { status: 422 });
	}

	// Add server-generated fields and persist
	const created: IUser = {
		...(dto.$qm.serialize() as ICreateUser),
		id: crypto.randomUUID(),
	};
	const savedUser = new UserDto(created);
	store.set(savedUser.id, savedUser);

	return HttpResponse.json(savedUser.$qm.serialize(), { status: 201 });
});
```

## Reusable Fixture Factory

Create typed fixture factories for test data:

```typescript
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

// Usage in tests
const admin = createUserFixture({ role: 'admin', username: 'admin_user' });
const response = HttpResponse.json(admin.$qm.serialize(), { status: 200 });
```

## Using Fixtures in Tests

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
	http.get('/api/users/:id', ({ params }) => {
		const fixture = createUserFixture({ id: params.id as string });
		return HttpResponse.json(fixture.$qm.serialize());
	})
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test('GET /api/users/:id returns typed user', async () => {
	const res = await fetch('/api/users/fixture-id');
	const data = await res.json();
	const user = new UserDto(data);

	expect(user).toBeInstanceOf(QModel);
	expect(user.displayName).toBe('test_user (user)');
});
```

## Stripping Private Fields

`unknownPropertyPolicy: 'strip'` ensures internal server fields (e.g., `_csrf`, `_hash`)
are removed before serialization, preventing accidental exposure:

```typescript
const rawServerResponse = {
	id: 'u1',
	username: 'alice',
	email: 'alice@example.com',
	age: 30,
	role: 'admin',
	_csrf: 'secret-token', // internal — will be stripped
	_hash: 'abc123', // internal — will be stripped
};

const user = new UserDto(rawServerResponse);
const serialized = user.$qm.serialize();
// serialized has no _csrf or _hash — safe to send to client
```

## Date Coercion in Responses

QuickModel transforms ISO strings back to `Date` objects automatically:

```typescript
@Quick(
	{ id: 'string', title: 'string', body: 'string', createdAt: Date },
	{ unknownPropertyPolicy: 'strip' }
)
class PostDto extends QModel<IPost> {
	declare id: string;
	declare title: string;
	declare body: string;
	declare createdAt: Date;

	@QComputed()
	get preview(): string {
		return this.body.length > 100
			? this.body.slice(0, 100) + '...'
			: this.body;
	}
}

// In handler — ISO string from DB becomes Date automatically:
const post = new PostDto({
	id: '1',
	title: 'Hello',
	body: 'World',
	createdAt: '2024-01-15T10:30:00Z',
});
console.log(post.createdAt instanceof Date); // true
```

## See Also

- [QModel API Reference](./qmodel.md)
- [Backend Integration](./backend-integration.md)
- [Serialization](./serialization.md)
