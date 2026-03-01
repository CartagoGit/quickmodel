# Bun.js Integration

QuickModel works as a zero-dependency **DTO and validation layer** inside Bun servers. It coerces raw JSON bodies into typed models, strips unknown fields for security, runs sync and async `@QRule` checks, and serializes computed responses — all without any external library.

## Key Patterns

| Concern                 | QuickModel solution                                    |
| ----------------------- | ------------------------------------------------------ |
| Request body coercion   | `@Quick({ ... })` + `new Dto(await req.json())`        |
| Unknown field stripping | `unknownPropertyPolicy: 'strip'`                       |
| Validation (sync)       | `dto.checkRules()`                                     |
| Validation (async)      | `qCheckRulesAsync(dto)` (DB uniqueness, remote checks) |
| Response enrichment     | `@QComputed()` + `dto.serialize()`                     |
| Bulk seed / import      | `Dto.createMany(await Bun.file(path).json())`          |

## DTO Definition

```typescript
// dto/product.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IProduct {
	id: string;
	name: string;
	price: number;
	stock: number;
	tags: string[];
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		price: 'number',
		stock: 'number',
		tags: Array,
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class ProductDto extends QModel<IProduct> {
	@QField({ label: 'ID', required: true })
	declare id: string;

	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	@QRule((val: string) => val.trim().length <= 100, 'Name too long')
	declare name: string;

	@QField({ label: 'Price', widget: 'number' })
	@QRule((val: number) => val >= 0, 'Price cannot be negative')
	declare price: number;

	@QField({ label: 'Stock' })
	@QRule(
		(val: number) => Number.isInteger(val) && val >= 0,
		'Stock must be a non-negative integer'
	)
	declare stock: number;

	declare tags: string[];
	declare createdAt: Date;

	@QComputed()
	get isAvailable(): boolean {
		return this.stock > 0;
	}

	@QComputed()
	get formattedPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}
```

## Bun.serve — fetch handler

```typescript
// server.ts
import { ProductDto } from './dto/product.dto';

Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);

		// POST /products
		if (req.method === 'POST' && url.pathname === '/products') {
			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				return Response.json(
					{ error: 'Invalid JSON body' },
					{ status: 400 }
				);
			}

			const dto = new ProductDto(raw as Record<string, unknown>);
			const { valid, errors } = dto.$qm.checkRules();

			if (!valid) {
				return Response.json({ errors }, { status: 422 });
			}

			// dto is coerced, validated, unknown fields stripped
			return Response.json(dto.$qm.serialize(), { status: 201 });
		}

		return new Response('Not Found', { status: 404 });
	},
});
```

### Request / Response flow

```
POST /products  { name: "Keyboard", price: "149", stock: "50", __admin: true }
                                 ↓
                     new ProductDto(body)
                    ┌────────────────────────────────┐
                    │  price: 149      (string→number) │
                    │  stock: 50       (string→number) │
                    │  createdAt: Date (auto-set)       │
                    │  __admin stripped automatically   │
                    └────────────────────────────────┘
                                 ↓
                          dto.$qm.checkRules()
                                 ↓
                    dto.$qm.serialize()  →  { isAvailable: true, formattedPrice: "$149.00", ... }
                                 ↓
                    Response.json(...)  201 Created
```

## WebSocket handler

```typescript
import { OrderDto } from './dto/order.dto';

Bun.serve({
	port: 3001,
	fetch(req, server) {
		if (server.upgrade(req)) return;
		return new Response('WebSocket expected', { status: 426 });
	},
	websocket: {
		message(ws, rawMsg) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(String(rawMsg));
			} catch {
				ws.send(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
				return;
			}

			const dto = new OrderDto(parsed as Record<string, unknown>);
			const { valid, errors } = dto.$qm.checkRules();

			if (!valid) {
				ws.send(JSON.stringify({ ok: false, errors }));
				return;
			}

			// Broadcast serialized DTO to all subscribers
			ws.publish('orders', JSON.stringify(dto.$qm.serialize()));
			ws.send(JSON.stringify({ ok: true, summary: dto.summary }));
		},
	},
});
```

## Bulk loading with Bun.file()

```typescript
// seed.ts
import { ProductDto } from './dto/product.dto';

// Bun's native file API — no fs import needed
const raw = (await Bun.file('./data/products.json').json()) as unknown[];

const { instances: products } = ProductDto.createMany(raw);

// All items coerced and typed — insert into DB, push to API, etc.
for (const product of products) {
	console.log(product.id, product.formattedPrice, product.isAvailable);
}
```

## Async validation (DB uniqueness)

Use `qCheckRulesAsync` for rules that need to hit a database or external service without blocking the event loop.

```typescript
// dto/register.dto.ts
import { QModel, Quick, QRule } from 'quickmodel';
import { qCheckRulesAsync } from 'quickmodel/forms';
import { db } from './db';

@Quick(
	{ email: 'string', username: 'string' },
	{ unknownPropertyPolicy: 'strip' }
)
export class RegisterDto extends QModel<{ email: string; username: string }> {
	@QRule(
		async (val: string) => !(await db.users.exists({ email: val })),
		'Email already registered'
	)
	declare email: string;

	@QRule(
		async (val: string) => !(await db.users.exists({ username: val })),
		'Username taken'
	)
	declare username: string;
}

// server.ts — POST /register
const dto = new RegisterDto((await req.json()) as Record<string, unknown>);
const { valid, errors } = await qCheckRulesAsync(dto);

if (!valid) {
	return Response.json({ errors }, { status: 422 });
}
return Response.json(dto.$qm.serialize(), { status: 201 });
```

## JSON Response serialization

`dto.serialize()` returns a plain object safe for `Response.json()`. `Date` fields become ISO strings, and `@QComputed` getters are included automatically.

```typescript
const dto = new ProductDto({
	id: 'prod-1',
	name: 'Ergonomic Chair',
	price: 399.0,
	stock: 10,
	tags: ['furniture'],
	createdAt: new Date(),
});

// Produces a plain object — safe for JSON transport:
const payload = dto.$qm.serialize();
// {
//   id: 'prod-1',
//   name: 'Ergonomic Chair',
//   price: 399,
//   stock: 10,
//   tags: ['furniture'],
//   createdAt: '2025-01-01T00:00:00.000Z',  ← ISO string
//   isAvailable: true,                       ← @QComputed
//   formattedPrice: '$399.00'                ← @QComputed
// }

return Response.json(payload, { status: 200 });
```

Restoring from a Bun Response on the client side is equally clean:

```typescript
const raw = await res.json(); // plain object from JSON
const product = new ProductDto(raw); // createdAt → Date ✅
```

## Date fields across HTTP

Dates are serialized as ISO strings by `serialize()` and automatically re-hydrated when you pass them back to a `QModel` constructor with `coercionStrategy: 'loose'` (the default):

```typescript
// Server → client: Date becomes ISO string in JSON body
const serverDto = new ProductDto(dbRow);
return Response.json(serverDto.$qm.serialize()); // createdAt: "2025-01-15T..."

// Client: re-instantiate — QuickModel coerces the ISO string back to Date
const clientDto = new ProductDto(await res.json()); // createdAt: Date ✅
```

## Quick Links

- [Installation](/en/guide/installation)
- [Transformers](/en/guide/transformers)
- [Validation](/en/guide/validation)
- [Backend Integration (Express / Fastify / Hono)](/en/integrations/backend-integration)
