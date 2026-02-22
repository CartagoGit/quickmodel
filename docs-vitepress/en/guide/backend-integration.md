# Backend Integration (Express / Fastify / Hono)

QuickModel works as a **DTO layer** for Node.js backend frameworks. It provides automatic type coercion, unknown-field stripping, validation, and `@QComputed` response enrichment — replacing `class-validator` + `class-transformer` in any runtime.

## Key Patterns

| Concern                 | QuickModel solution                          |
| ----------------------- | -------------------------------------------- |
| Request body coercion   | `@Quick({ ... })` + `new Dto(req.body)`      |
| Unknown field stripping | `unknownPropertyPolicy: 'strip'`             |
| Validation (sync/async) | `dto.checkRules()` / `qCheckRulesAsync(dto)` |
| Response enrichment     | `@QComputed()` + `dto.serialize()`           |
| Bulk data loading       | `Dto.createMany(array)`                      |

## Express

### Validation Middleware Factory

```typescript
// middleware/validate-body.ts
import type { Request, Response, NextFunction } from 'express';
import { QModel } from '@cartago-git/quickmodel';

export function validateBody<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto
) {
	return (
		req: Request & { dto?: TDto },
		res: Response,
		next: NextFunction
	) => {
		try {
			const dto = new DtoClass(req.body);
			const validation = dto.checkRules();
			if (!validation.valid) {
				res.status(422).json({ errors: validation.errors });
				return;
			}
			req.dto = dto; // TDto — inferred from DtoClass, no cast needed
			next();
		} catch {
			res.status(400).json({ error: 'Invalid request body' });
		}
	};
}
```

### DTO Definition

```typescript
// dto/create-user.dto.ts
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
} from '@cartago-git/quickmodel';

@Quick(
	{ username: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class CreateUserDto extends QModel<ICreateUser> {
	@QField({ label: 'Username', required: true })
	@QRule((v: string) => v.length >= 3, 'Username too short')
	declare username: string;

	@QField({ label: 'Email', widget: 'email' })
	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((v: number) => v >= 18, 'Must be at least 18')
	declare age: number;

	@QField({ label: 'Role' })
	@QRule(
		(v: string) => ['admin', 'editor', 'viewer'].includes(v),
		'Invalid role'
	)
	declare role: string;

	@QComputed()
	get displayName(): string {
		return `${this.username} (${this.role})`;
	}
}
```

### Route Handler

```typescript
// routes/users.ts
import { Router } from 'express';
import { validateBody } from '../middleware/validate-body';
import { CreateUserDto } from '../dto/create-user.dto';

const router = Router();

router.post(
	'/users',
	validateBody(CreateUserDto),
	(req: Request & { dto?: CreateUserDto }, res) => {
		const dto = req.dto!; // CreateUserDto — fully typed, inferred from validateBody()
		// dto is coerced, validated, and stripped
		res.status(201).json(dto.serialize());
		// response includes @QComputed displayName
	}
);
```

## Fastify

### Plugin / preHandler Hook

```typescript
// plugins/dto-validation.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { QModel } from '@cartago-git/quickmodel';

export function dtoValidator<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto
) {
	return async (
		request: FastifyRequest & { dto?: TDto },
		reply: FastifyReply
	) => {
		try {
			const dto = new DtoClass(request.body as object);
			const validation = dto.checkRules();
			if (!validation.valid) {
				reply.code(422).send({ errors: validation.errors });
				return;
			}
			request.dto = dto; // TDto — inferred from DtoClass, no cast needed
		} catch {
			reply.code(400).send({ error: 'Malformed request' });
		}
	};
}
```

### Route Registration

```typescript
// routes/invoices.ts
fastify.post('/invoices', {
	preHandler: dtoValidator(CreateInvoiceDto),
	handler: async (
		request: FastifyRequest & { dto?: CreateInvoiceDto },
		reply
	) => {
		const dto = request.dto!; // CreateInvoiceDto — fully typed, inferred from dtoValidator()
		const saved = await invoiceService.save(dto.serialize());
		reply.code(201).send(saved);
	},
});
```

### Response Serialization with @QComputed

```typescript
@Quick(
	{
		id: 'string',
		amount: 'number',
		currency: 'string',
		dueDate: Date,
		paid: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class InvoiceDto extends QModel<IInvoice> {
	declare id: string;
	declare amount: number;
	declare currency: string;
	declare dueDate: Date;
	declare paid: boolean;

	@QComputed()
	get formattedAmount(): string {
		return `${this.amount.toFixed(2)} ${this.currency.toUpperCase()}`;
	}

	@QComputed()
	get isOverdue(): boolean {
		return !this.paid && this.dueDate < new Date();
	}
}
```

## Hono

### Validator Middleware

```typescript
// middleware/q-validator.ts
import type { Context, Next } from 'hono';
import { QModel } from '@cartago-git/quickmodel';

export function qValidator<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto,
	onSuccess: (dto: TDto, c: Context) => Promise<Response>
) {
	return async (c: Context, next: Next) => {
		const body = await c.req.json<object>();
		try {
			const dto = new DtoClass(body);
			const validation = dto.checkRules();
			if (!validation.valid) {
				return c.json({ errors: validation.errors }, 422);
			}
			return await onSuccess(dto, c);
		} catch {
			return c.json({ error: 'Bad request' }, 400);
		}
	};
}
```

### Route Definition

```typescript
// routes/users.ts
import { Hono } from 'hono';
import { qValidator } from '../middleware/q-validator';

const app = new Hono();

app.post(
	'/users',
	qValidator(CreateUserDto, async (dto, c) => {
		return c.json(dto.serialize(), 201);
	})
);
```

## Async Validation — Duplicate Checks

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

class RegistrationDto extends QModel<IRegistration> {
	@QRule(async (email: string) => {
		const exists = await db.users.exists({ email });
		return !exists;
	}, 'Email already registered')
	declare email: string;

	// ... other fields
}

// In your route handler
const dto = new RegistrationDto(req.body);
const result = await qCheckRulesAsync(dto, { mode: 'parallel' });
if (!result.valid) {
	return res.status(422).json({ errors: result.errors });
}
```

## Repository Pattern

```typescript
// repositories/blog-post.repository.ts
export class BlogPostRepository {
	private store = new Map<string, BlogPostModel>();

	create(data: object): object {
		const post = new BlogPostModel(data);
		this.store.set(post.id, post);
		return post.serialize();
	}

	publish(id: string): object | null {
		const post = this.store.get(id);
		if (!post) return null;
		// copy() is IMMUTABLE — capture the new instance
		const published = post.copy({ publishedAt: new Date() });
		this.store.set(id, published);
		return published.serialize();
	}
}
```

## Batch Processing with createMany()

```typescript
// Process incoming bulk data from message queues or batch APIs
const rawItems: unknown[] = await queue.receive();
const { instances, errors } = OrderItemDto.createMany(rawItems);

// Handle coercion errors
if (errors.length) {
	logger.warn(`${errors.length} items failed coercion`, errors);
}

// Process valid instances
await orderService.bulkCreate(instances.map((i) => i.serialize()));
```

::: tip coercionStrategy: 'loose'
When receiving data from external APIs or message queues, add `coercionStrategy: 'loose'` to automatically convert strings to the expected primitive types. This avoids throwing on `"3"` when `3` is expected.
:::

## JSON Schema for OpenAPI / Swagger

QuickModel can generate a JSON schema for your DTOs:

```typescript
const schema = new CreateUserDto({ ... }).getSchema('json');
// Integrate with @fastify/swagger or swagger-jsdoc
fastify.addSchema({
  $id: 'CreateUserBody',
  ...schema,
});
```
