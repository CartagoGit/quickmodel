# Kysely Integration

Kysely is a type-safe SQL query builder for Node.js. QuickModel complements Kysely by adding
a **DTO layer** on top of raw query results — coercing types, attaching computed fields and
business rules, and providing a consistent interface for persistence operations.

## Key Patterns

| Pattern                        | QuickModel API                                                     |
| ------------------------------ | ------------------------------------------------------------------ |
| Coerce Kysely selectable rows  | `new Dto(row)` / `createMany(rows)` after `selectFrom().execute()` |
| Serial insert from DTO         | `dto.$qToInterface()` → passed to `insertInto().values()`          |
| Partial update (only dirty)    | `dto.$qGetChangedFields()` → `updateTable().set()`                 |
| Exclude computed from DB write | `@QComputed` fields are omitted from `$qToInterface()`             |
| Async uniqueness validation    | `qCheckRulesAsync()` with a Kysely sub-query as the predicate      |
| Repository pattern             | Encapsulate all queries + DTO conversion in a service class        |

## Installation

```bash
npm install quickmodel kysely
# Plus a Kysely dialect, e.g.:
npm install kysely-bun-sqlite   # Bun
npm install better-sqlite3     # Node
npm install pg                 # PostgreSQL
```

## Database Schema (example)

```typescript
// app/db/types.ts  — Kysely database interface
export interface Database {
	products: ProductTable;
}

export interface ProductTable {
	id: Generated<string>;
	name: string;
	price_cents: number;
	category: string;
	sku: string;
	active: Generated<boolean>;
	created_at: Generated<Date>;
	updated_at: Generated<Date>;
}
```

## Model Setup

```typescript
// app/models/product.dto.ts
import { QModel, Quick, QRule, QField, QComputed, QAlias } from 'quickmodel';

interface IProduct {
	id: string;
	name: string;
	priceCents: number;
	category: string;
	sku: string;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		priceCents: 'number',
		category: 'string',
		sku: 'string',
		active: 'boolean',
		createdAt: Date,
		updatedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class ProductDto extends QModel<IProduct> {
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Name too short')
	@QRule((v: string) => v.trim().length <= 120, 'Name too long')
	@QAlias('name')
	declare name: string;

	@QField({ label: 'Price (cents)', required: true })
	@QRule((v: number) => v >= 0, 'Price must be non-negative')
	@QAlias('price_cents') // DB column → camelCase field
	declare priceCents: number;

	@QField({ label: 'SKU', required: true })
	@QAlias('sku')
	declare sku: string;

	declare id: string;
	declare category: string;
	declare active: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;

	// Computed fields — excluded from $qToInterface(), never written to DB
	@QComputed()
	get priceEur(): string {
		return `€${(this.priceCents / 100).toFixed(2)}`;
	}

	@QComputed()
	get isDiscount(): boolean {
		return this.priceCents < 500;
	}
}
```

::: tip Computed fields stay in the DTO, out of the DB
`$qToInterface()` returns only the declared (non-computed) fields. That means
`priceEur` and `isDiscount` never leak into your `INSERT` or `UPDATE` statements.
:::

## Repository Pattern

```typescript
// app/repositories/product.repository.ts
import { Kysely } from 'kysely';
import { qCheckRules, qCheckRulesAsync } from 'quickmodel/forms';
import { ProductDto } from '~/models/product.dto';
import type { Database } from '~/db/types';

export class ProductRepository {
	constructor(private readonly db: Kysely<Database>) {}

	// ──────────────────────────────────────────────
	// SELECT — coerce rows into typed DTOs
	// ──────────────────────────────────────────────

	async findAll(): Promise<ProductDto[]> {
		const rows = await this.db
			.selectFrom('products')
			.where('active', '=', true)
			.selectAll()
			.execute();

		const { instances } = ProductDto.createMany(rows);
		return instances;
	}

	async findById(id: string): Promise<ProductDto | null> {
		const row = await this.db
			.selectFrom('products')
			.where('id', '=', id)
			.selectAll()
			.executeTakeFirst();

		return row ? new ProductDto(row) : null;
	}

	// ──────────────────────────────────────────────
	// INSERT — validate then write $qToInterface()
	// ──────────────────────────────────────────────

	async create(data: Partial<IProduct>): Promise<ProductDto> {
		const dto = new ProductDto({
			id: crypto.randomUUID(),
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			...data,
		});

		const { valid, errors } = qCheckRules(dto);
		if (!valid)
			throw new Error(
				`Validation failed: ${errors.map((e) => e.message).join(', ')}`
			);

		const row = dto.$qToInterface(); // safe: no computed fields, correct DB column names

		await this.db.insertInto('products').values(row).execute();
		return dto;
	}

	// ──────────────────────────────────────────────
	// UPDATE — persist only the changed fields
	// ──────────────────────────────────────────────

	async update(id: string, patch: Partial<IProduct>): Promise<ProductDto> {
		const existing = await this.findById(id);
		if (!existing) throw new Error(`Product not found: ${id}`);

		const updated = existing.$qCopy({ ...patch, updatedAt: new Date() });

		const { valid, errors } = qCheckRules(updated);
		if (!valid)
			throw new Error(
				`Validation failed: ${errors.map((e) => e.message).join(', ')}`
			);

		// Only send changed fields to the DB
		const changedFields = existing.$qGetChangedFields();
		if (changedFields.length === 0) return existing; // nothing changed — skip DB call

		const diff = existing.$qDiff(updated) as Record<string, unknown>;

		await this.db
			.updateTable('products')
			.set(diff)
			.where('id', '=', id)
			.execute();

		return updated;
	}

	// ──────────────────────────────────────────────
	// DELETE
	// ──────────────────────────────────────────────

	async delete(id: string): Promise<void> {
		await this.db.deleteFrom('products').where('id', '=', id).execute();
	}
}
```

## Async Uniqueness Validation

```typescript
// Attach a Kysely-based async rule directly to the DTO field:
import { Kysely } from 'kysely';
import { QModel, Quick, QRule } from 'quickmodel';
import { qCheckRulesAsync } from 'quickmodel/forms';
import type { Database } from '~/db/types';

function buildSkuRule(db: Kysely<Database>, excludeId?: string) {
	return async (sku: string): Promise<boolean> => {
		const row = await db
			.selectFrom('products')
			.select('id')
			.where('sku', '=', sku)
			.executeTakeFirst();

		// For update: allow the same SKU if it belongs to the same product
		return !row || row.id === excludeId;
	};
}

// At creation time
const dto = new ProductDto(rawData);
dto['_skuRule'] = buildSkuRule(db); // attach at runtime

// Or inject it via a factory method
export class ProductDto extends QModel<IProduct> {
	static withDb(
		data: Partial<IProduct>,
		db: Kysely<Database>,
		excludeId?: string
	): ProductDto {
		@QRule(buildSkuRule(db, excludeId), 'SKU already in use')
		class ProductDtoWithRule extends ProductDto {}
		return new ProductDtoWithRule(data);
	}
}

// Usage in a service:
const dto = ProductDto.withDb(formData, db, existingProduct.id);
const { valid, errors } = await qCheckRulesAsync(dto);
```

## Batch Insert with `createMany()`

```typescript
export async function bulkImport(
	db: Kysely<Database>,
	rawProducts: unknown[]
): Promise<{ inserted: number; invalid: number }> {
	const { instances, failed } = ProductDto.createMany(rawProducts);

	if (instances.length === 0) return { inserted: 0, invalid: failed.length };

	// Validate all before inserting
	const validInstances = instances.filter((dto) => {
		const { valid } = qCheckRules(dto);
		return valid;
	});

	const rows = validInstances.map((dto) => dto.$qToInterface());

	await db.insertInto('products').values(rows).execute();

	return {
		inserted: validInstances.length,
		invalid: failed.length + (instances.length - validInstances.length),
	};
}
```

## Transaction — Create with Inventory Record

```typescript
import { Kysely, Transaction } from 'kysely';
import { ProductDto } from '~/models/product.dto';
import { InventoryDto } from '~/models/inventory.dto';

export async function createProductWithInventory(
	db: Kysely<Database>,
	productData: Partial<IProduct>,
	initialStock: number
): Promise<ProductDto> {
	return db.transaction().execute(async (trx: Transaction<Database>) => {
		// 1. Build and validate product DTO
		const product = new ProductDto({
			id: crypto.randomUUID(),
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			...productData,
		});

		const { valid, errors } = qCheckRules(product);
		if (!valid) throw new Error(errors.map((e) => e.message).join(', '));

		await trx
			.insertInto('products')
			.values(product.$qToInterface())
			.execute();

		// 2. Build and validate inventory DTO
		const inventory = new InventoryDto({
			id: crypto.randomUUID(),
			productId: product.id,
			stock: initialStock,
			updatedAt: new Date(),
		});

		await trx
			.insertInto('inventory')
			.values(inventory.$qToInterface())
			.execute();

		return product;
	});
}
```

## Derived / Computed Columns as DTO Fields

When you use Kysely's `sql` tag or computed expressions in a query, add them as
`@QComputed` fields in the DTO to take advantage of automatic coercion:

```typescript
// Extended DTO that receives a joined column from Kysely
@Quick(
	{ id: 'string', name: 'string', priceCents: 'number', totalSold: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class ProductWithSalesDto extends ProductDto {
	declare totalSold: number;

	@QComputed()
	get revenueEur(): string {
		return `€${((this.totalSold * this.priceCents) / 100).toFixed(2)}`;
	}
}

// Kysely query:
const rows = await db
	.selectFrom('products as p')
	.leftJoin('order_items as oi', 'oi.product_id', 'p.id')
	.select([
		'p.id',
		'p.name',
		'p.price_cents',
		db.fn.count('oi.id').as('total_sold'),
	])
	.groupBy('p.id')
	.execute();

const { instances } = ProductWithSalesDto.createMany(rows);
```

## See Also

- [Prisma Integration](./prisma-integration) — ORM alternative
- [Drizzle Integration](./drizzle-integration) — another type-safe query builder
- [Backend Integration](./backend-integration) — Express, Fastify, Hono
- [Validation](/en/guide/validation) — `@QRule`, `qCheckRules()`, `qCheckRulesAsync()`
