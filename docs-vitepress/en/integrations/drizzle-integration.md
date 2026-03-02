# Drizzle ORM Integration

QuickModel works alongside Drizzle ORM as a type-safe DTO layer between your database and your application. Use it to coerce raw Drizzle query results, validate create/update inputs, implement repository patterns, and derive computed fields — all without installing Drizzle as a dependency in your model definitions.

## Key Patterns

| Pattern                  | QuickModel API                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Map Drizzle row to DTO   | `new UserRowDto(row)` — strips join artifacts, `updatedAt`, `deletedAt`, etc.        |
| Validate create input    | `qCheckRules(new CreateUserDto(formData))`                                           |
| Bulk seed / import       | `UserRowDto.createMany(seedData)`                                                    |
| Repository abstraction   | `repo.insert(dto)` → `dto.$qToInterface()` → `db.insert(users).values(...)`            |
| Partial update           | `existing.$qCopy({ score: 100 })` → `db.update(users).set({ score: 100 })`             |
| Derived field            | `@QComputed() get slug()` — included in `serialize()`, excluded from `toInterface()` |
| DB uniqueness check      | `qCheckRulesAsync()` with async rule simulating `db.select().from(users).where(...)` |
| Drizzle timestamp → Date | `createdAt: Date` in `@Quick()` — ISO strings auto-transformed                       |

## Model Setup

```typescript
import { QModel, Quick, QRule, QField, QGroup, QComputed } from 'quickmodel';

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
	declare createdAt: Date;

	@QComputed()
	get displayName(): string {
		return `[${this.role.toUpperCase()}] ${this.name}`;
	}
}
```

The `unknownPropertyPolicy: 'strip'` handles Drizzle join artifacts (`addresses`, `profile`, `_count` from aggregations), internal audit columns (`updatedAt`, `deletedAt`, `version`) and any extra columns from raw queries automatically.

## DTO from Drizzle Query Result

```typescript
// Drizzle query:
const rows = await db.select().from(users).where(eq(users.id, userId));
const dto = new UserRowDto(rows[0]!);
// join artifacts stripped ✅, timestamp coerced to Date ✅, displayName computed ✅

// With relations (leftJoin):
const row = await db
	.select()
	.from(users)
	.leftJoin(posts, eq(posts.authorId, users.id))
	.where(eq(users.id, userId));
const dto2 = new UserRowDto(row[0]!);
// post columns stripped automatically via unknownPropertyPolicy: 'strip' ✅
```

### Coercion from Drizzle Raw Queries

When using `db.$client.query()` or `sql\`...\``raw queries, columns may arrive as strings. The`coercionStrategy: 'loose'` handles this transparently:

```typescript
const raw = await db.execute(
	sql`SELECT id, age::text, active::int, price::text FROM users WHERE id = ${userId}`
);
const dto = new UserRowDto(raw.rows[0]!);
// dto.id → number, dto.age → number, dto.active → boolean ✅
```

## Create Input Validation

Define a separate DTO for create inputs with stricter validation rules:

```typescript
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

// Usage:
const dto = new CreateUserDto(formData);
const validation = qCheckRules(dto);
if (!validation.valid) throw new Error(validation.errors[0]?.message);

// Pass to Drizzle:
await db.insert(users).values({
	...dto.$qToInterface(),
	id: crypto.randomUUID(),
	active: true,
	score: 0,
	createdAt: new Date(),
});
```

## Bulk Seed / Import

```typescript
import seedData from './seed-users.json';

const { instances, errors } = UserRowDto.createMany(seedData);

// Map to Drizzle insert format:
await db.insert(users).values(
	instances.map((dto) => ({
		...dto.$qToInterface(),
		// toInterface() serializes Date → ISO string, compatible with Drizzle's timestamp columns
	}))
);
```

## Repository Pattern

```typescript
class DrizzleUserRepository {
	async insert(dto: CreateUserDto): Promise<UserRowDto> {
		const validation = qCheckRules(dto);
		if (!validation.valid) throw new Error(validation.errors[0]?.message!);

		const [row] = await db
			.insert(users)
			.values({
				...dto.$qToInterface(),
				id: crypto.randomUUID(),
				active: true,
				score: 0,
				createdAt: new Date(),
			})
			.returning();

		return new UserRowDto(row!);
	}

	async findById(id: string): Promise<UserRowDto | null> {
		const [row] = await db.select().from(users).where(eq(users.id, id));

		return row ? new UserRowDto(row) : null;
	}

	async findAll(): Promise<UserRowDto[]> {
		const rows = await db.select().from(users);
		const { instances } = UserRowDto.createMany(rows);
		return instances;
	}
}
```

## Drizzle Types → QModel

Drizzle does not have a dedicated `Decimal` type by default — `doublePrecision` and `real` columns map to `number`. The `coercionStrategy: 'loose'` handles string-to-number coercion when columns arrive as strings from raw queries:

| Drizzle Column                 | `@Quick()` mapping | Notes                                           |
| ------------------------------ | ------------------ | ----------------------------------------------- |
| `integer()`                    | `'number'`         | Auto-coerced from string in raw queries         |
| `doublePrecision()` / `real()` | `'number'`         | String → number via `loose` strategy            |
| `varchar()` / `text()`         | `'string'`         | —                                               |
| `boolean()`                    | `'boolean'`        | `0`/`1` coerced to `false`/`true` via `loose`   |
| `timestamp()`                  | `Date`             | ISO string → `Date` instance auto-transformed   |
| `jsonb()` / `json()`           | `'string'`         | Serialize via `JSON.stringify()` before storing |

```typescript
@Quick(
	{ id: 'number', price: 'number', publishedAt: Date },
	{ coercionStrategy: 'loose' }
)
class ProductDto extends QModel<IProduct> {
	declare id: number;
	declare price: number; // Drizzle doublePrecision → number ✅
	declare publishedAt: Date; // Drizzle timestamp → Date ✅
}
```

## Partial Updates with `copy()`

`copy()` creates an immutable new instance — pass only changed fields to `db.update().set()`:

```typescript
const [row] = await db.select().from(users).where(eq(users.id, id));
const existing = new UserRowDto(row!);

// Apply only changed fields:
const updated = existing.$qCopy({ score: 100, role: 'admin' });

await db
	.update(users)
	.set({ score: updated.score, role: updated.role })
	.where(eq(users.id, updated.id));
```

## Derived Fields with `@QComputed`

Computed fields are included in `serialize()` but excluded from `toInterface()` — they are **never stored** in Drizzle:

```typescript
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
class ProductDto extends QModel<IProduct> {
	declare id: number;
	declare title: string;
	declare description: string;
	declare price: number;
	declare stock: number;
	declare publishedAt: Date;

	@QComputed()
	get slug(): string {
		return this.title.toLowerCase().replace(/\s+/g, '-');
	}
}

const [row] = await db.select().from(products).where(eq(products.id, id));
const dto = new ProductDto(row!);

dto.slug; // → 'my-product-name' (computed, not stored)
dto.$qSerialize(); // → { ..., slug: 'my-product-name' } ✅ included in API response
dto.$qToInterface(); // → { id, title, ... } ❌ slug excluded — safe for db.update()
```

## DB-Level Uniqueness Validation

Use `qCheckRulesAsync()` with async `@QRule` predicates to simulate DB-level uniqueness checks:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

class CreateUserWithUniqueEmailDto extends CreateUserDto {
	@QRule(async (val: string) => {
		const [existing] = await db
			.select()
			.from(users)
			.where(eq(users.email, val));
		return !existing; // false → validation fails
	}, 'Email already registered')
	declare email: string;
}

async function createUser(input: object) {
	const dto = new CreateUserWithUniqueEmailDto(input);
	const result = await qCheckRulesAsync(dto);

	if (!result.valid) {
		throw new Error(result.errors[0]?.message);
	}

	const [created] = await db
		.insert(users)
		.values({
			...dto.$qToInterface(),
			createdAt: new Date(),
		})
		.returning();

	return new UserRowDto(created!);
}
```

## Internal Columns Stripping

Drizzle schemas often include internal audit columns (`createdAt`, `updatedAt`, `deletedAt`, `version`) that should not be exposed in DTOs. `unknownPropertyPolicy: 'strip'` removes them automatically:

```typescript
// Drizzle full row (from .returning() or join):
const row = {
	id: 1,
	name: 'Alice',
	email: 'alice@example.com',
	age: 30,
	role: 'user',
	active: true,
	score: 95,
	createdAt: new Date(),
	// Internal columns — not in UserRowDto interface:
	updatedAt: new Date(),
	deletedAt: null,
	version: 5,
};

const dto = new UserRowDto(row);
// dto.updatedAt → undefined ✅ (stripped)
// dto.version   → undefined ✅ (stripped)
```

## Migration from Drizzle + Zod

| Drizzle + Zod pattern           | QuickModel                                    |
| ------------------------------- | --------------------------------------------- |
| `createInsertSchema(users)`     | `CreateUserDto` with `@QRule` validators      |
| `createSelectSchema(users)`     | `UserRowDto` with `coercionStrategy: 'loose'` |
| `z.parse(row)`                  | `new UserRowDto(row)`                         |
| `z.safeParse(data).error`       | `qCheckRules(dto).errors`                     |
| Manual `.transform()` for types | `@Quick({ createdAt: Date })`                 |
| `z.string().email()`            | `@QRule((v) => v.includes('@'), '...')`       |

## Schema export with `getSchema('drizzle')`

Import `quickmodel/schema` once, then call `getSchema('drizzle')` to get a Drizzle table definition string:

```typescript
import 'quickmodel/schema';
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	email: string;
	createdAt: Date;
	score: number;
}

@Quick({ createdAt: Date, score: Number })
class User extends QModel<IUser> {
	declare name: string;
	declare email: string;
	declare createdAt: Date;
	declare score: number;
}

const drizzleTable = User.getSchema('drizzle');
/*
export const users = pgTable('users', {
  name:      text('name').notNull(),
  email:     text('email').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  score:     real('score').notNull(),
});
*/
```

### Keep table definitions in sync with your QModel

Generating the Drizzle table from your QModel definition gives you a single source of truth:

```typescript
import 'quickmodel/schema';
import fs from 'node:fs';

const models = [UserDto, ProductDto, OrderDto];
const tables = models.map((M) => M.getSchema('drizzle')).join('\n\n');
fs.writeFileSync('src/db/schema.generated.ts', tables);
```

> **Note:** `fromSchema('drizzle', ...)` is not yet supported. Use `fromSchema('typescript', ...)` with a TypeScript interface instead.

## See also

- [Schema Generation](/en/guide/schema-generation) — full `getSchema()` reference
- [JSON Schema Integration](/en/integrations/json-schema-integration) — portable schema format
- [TypeScript Schema Integration](/en/integrations/typescript-schema-integration) — interface scaffolding
