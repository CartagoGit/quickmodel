# Hono

[Hono](https://hono.dev) is a lightweight, edge-ready web framework that runs on Cloudflare Workers, Deno, Bun, Node.js, and more. QuickModel DTOs serve as the typed request/response layer — coercion, validation, and serialization happen at the edge without any build tooling overhead.

## Quick Reference

| Feature                  | Hono alone   | With QuickModel                           |
| ------------------------ | ------------ | ----------------------------------------- |
| Request body typing      | Manual       | ✅ `new Dto(body)` — coercion + stripping |
| Validation               | Zod / custom | ✅ `qCheckRules()` / `qCheckRulesAsync()` |
| Response serialization   | Manual       | ✅ `dto.$qSerialize()`                    |
| Computed response fields | Manual       | ✅ `@QComputed`                           |
| Bulk creation            | Manual       | ✅ `createMany()`                         |
| Form data parsing        | Manual       | ✅ `Dto.fromFormData(formData)`           |

## Installation

```bash
# Node.js / Bun
npm install hono quickmodel

# Deno
import { Hono } from 'https://deno.land/x/hono/mod.ts';
```

## Basic Route — Request DTO + Response DTO

```typescript
import { Hono } from 'hono';
import { QModel, Quick, QRule, QComputed, QField } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

const app = new Hono();

interface ICreateUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QRule(
		(val: string) => val.trim().length >= 2,
		'Name must be at least 2 characters'
	)
	declare name: string;

	@QRule((val: string) => val.includes('@'), 'Invalid email format')
	declare email: string;

	@QRule(
		(val: number) => val >= 18 && val <= 120,
		'Age must be between 18 and 120'
	)
	declare age: number;

	declare role: string;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}

// POST /users
app.post('/users', async (c) => {
	const body = await c.req.json<object>();
	const dto = new CreateUserDto(body);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		return c.json(
			{
				errors: errors.map((e) => ({
					field: e.field,
					message: e.message,
				})),
			},
			400
		);
	}

	// dto.$qSerialize() — JSON-safe, includes @QComputed, strips unknowns
	const created = await db.users.insert(dto.$qSerialize());
	return c.json(created, 201);
});
```

## Middleware — Centralized Validation

Extract validation into reusable middleware to avoid repeating `qCheckRules()` in every route:

```typescript
import type { Context, Next } from 'hono';
import { qCheckRules } from 'quickmodel/forms';

// Generic validation middleware factory
function validateDto<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto
) {
	return async (c: Context, next: Next) => {
		const body = await c.req.json<object>();
		const dto = new DtoClass(body);
		const { valid, errors } = qCheckRules(dto);

		if (!valid) {
			return c.json(
				{
					errors: errors.map((e) => ({
						field: e.field,
						message: e.message,
					})),
				},
				400
			);
		}

		// Attach validated DTO to context for the route handler
		c.set('dto', dto);
		return next();
	};
}

// Usage:
app.post('/users', validateDto(CreateUserDto), (c) => {
	const dto = c.get('dto') as CreateUserDto;
	return c.json(dto.$qSerialize(), 201);
});
```

## GET Route — Response DTO

Always pass API responses through a DTO before returning — strips internal fields, coerces types, and adds `@QComputed` fields:

```typescript
interface IUserResponse {
	id: string;
	name: string;
	email: string;
	role: string;
	age: number;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		email: 'string',
		role: 'string',
		age: 'number',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class UserResponseDto extends QModel<IUserResponse> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare role: string;
	declare age: number;
	declare createdAt: Date;

	@QComputed()
	get memberSince(): string {
		return this.createdAt.getFullYear().toString();
	}
}

// GET /users/:id
app.get('/users/:id', async (c) => {
	const user = await db.users.findById(c.req.param('id'));
	if (!user) return c.json({ error: 'Not found' }, 404);

	// Wrap in DTO — strips private DB fields, adds computed fields
	return c.json(new UserResponseDto(user).$qSerialize());
});
```

## Bulk GET — `createMany()`

```typescript
// GET /users
app.get('/users', async (c) => {
	const rows = await db.users.findAll();

	// createMany() coerces and strips all rows in one pass
	const { instances } = UserResponseDto.createMany(rows);
	return c.json(instances.map((dto) => dto.$qSerialize()));
});
```

## Async Validation — Server-Side Uniqueness

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

interface IRegister {
	email: string;
	password: string;
	name: string;
}

@Quick(
	{ email: 'string', password: 'string', name: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class RegisterDto extends QModel<IRegister> {
	@QRule(async (val: string) => {
		const existing = await db.users.findByEmail(val);
		return existing === null;
	}, 'Email already registered')
	declare email: string;

	@QRule(
		(val: string) => val.length >= 8,
		'Password must be at least 8 characters'
	)
	declare password: string;

	declare name: string;
}

app.post('/register', async (c) => {
	const body = await c.req.json<object>();
	const dto = new RegisterDto(body);
	const { valid, errors } = await qCheckRulesAsync(dto);

	if (!valid) return c.json({ errors }, 422);

	const user = await db.users.create(dto.$qSerialize());
	return c.json(new UserResponseDto(user).$qSerialize(), 201);
});
```

## FormData Routes

Hono is common for form-handling APIs. Use `Dto.fromFormData()` to parse `FormData` directly:

```typescript
app.post('/upload-profile', async (c) => {
	const formData = await c.req.formData();

	// fromFormData() coerces all string values to declared types
	const dto = CreateUserDto.fromFormData(formData);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) return c.json({ errors }, 400);
	return c.json(dto.$qSerialize(), 201);
});
```

## Error Handler — Uniform Error Shape

```typescript
app.onError((err, c) => {
	console.error(err);
	return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));
```

## Cloudflare Workers — Edge Deployment

QuickModel has no Node.js dependencies — it runs natively on Cloudflare Workers, Deno Deploy, and Bun:

```typescript
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-workers';
import { CreateUserDto } from './dtos/user';
import { qCheckRules } from 'quickmodel/forms';

const app = new Hono();

app.post('/api/users', async (c) => {
	const body = await c.req.json<object>();
	const dto = new CreateUserDto(body);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) return c.json({ errors }, 400);
	return c.json(dto.$qSerialize(), 201);
});

export default handle(app);
```

## Hono vs Express vs NestJS

| Feature              | Hono      | Express      | NestJS                |
| -------------------- | --------- | ------------ | --------------------- |
| Edge-ready           | ✅ Native | ❌ Node-only | ❌ Node-only          |
| Bundle size          | ~12 KB    | ~200 KB      | ~5 MB+                |
| TypeScript-first     | ✅        | Partial      | ✅                    |
| Dependency injection | ❌        | ❌           | ✅                    |
| QModel integration   | ✅ Direct | ✅ Direct    | ✅ Interceptors/Pipes |

## See Also

- [Backend Integration](./backend-integration) — Express / Fastify / Hono overview
- [NestJS Integration](./nestjs-integration) — enterprise-grade server with DI
- [tRPC Integration](./trpc-integration) — end-to-end type safety
- [MSW Integration](./msw-integration) — mock Hono APIs in tests
