# Integración con Kysely

Kysely es un constructor de consultas SQL type-safe para Node.js. QuickModel complementa
Kysely añadiendo una **capa de DTO** sobre los resultados raw — coercionando tipos, adjuntando
campos calculados y reglas de negocio, y proporcionando una interfaz consistente para las
operaciones de persistencia.

## Patrones clave

| Patrón                            | API QuickModel                                                    |
| --------------------------------- | ----------------------------------------------------------------- |
| Coercionar filas seleccionables   | `new Dto(row)` / `createMany(rows)` tras `selectFrom().execute()` |
| Insert desde DTO                  | `dto.$qToInterface()` → pasado a `insertInto().values()`          |
| Update parcial (sólo dirty)       | `dto.$qGetChangedFields()` → `updateTable().set()`                |
| Excluir computed de escrituras BD | `@QComputed` se omite de `$qToInterface()`                        |
| Validación asíncrona de unicidad  | `qCheckRulesAsync()` con sub-consulta Kysely como predicado       |
| Patrón repositorio                | Encapsular consultas + conversión DTO en una clase de servicio    |

## Instalación

```bash
npm install quickmodel kysely
# Más un dialecto Kysely, por ejemplo:
npm install kysely-bun-sqlite   # Bun
npm install better-sqlite3     # Node
npm install pg                 # PostgreSQL
```

## Esquema de base de datos (ejemplo)

```typescript
// app/db/types.ts  — interfaz de base de datos para Kysely
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

## Configuración del modelo

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
	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'El nombre es demasiado corto')
	@QRule(
		(v: string) => v.trim().length <= 120,
		'El nombre es demasiado largo'
	)
	@QAlias('name')
	declare name: string;

	@QField({ label: 'Precio (centavos)', required: true })
	@QRule((v: number) => v >= 0, 'El precio no puede ser negativo')
	@QAlias('price_cents') // columna BD → campo camelCase
	declare priceCents: number;

	@QField({ label: 'SKU', required: true })
	@QAlias('sku')
	declare sku: string;

	declare id: string;
	declare category: string;
	declare active: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;

	// Campos calculados — excluidos de $qToInterface(), nunca se escriben en BD
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

::: tip Computed en el DTO, fuera de la BD
`$qToInterface()` devuelve sólo los campos declarados (no computed). Eso significa que
`priceEur` e `isDiscount` nunca se filtran en tus sentencias `INSERT` o `UPDATE`.
:::

## Patrón repositorio

```typescript
// app/repositories/product.repository.ts
import { Kysely } from 'kysely';
import { qCheckRules, qCheckRulesAsync } from 'quickmodel/forms';
import { ProductDto } from '~/models/product.dto';
import type { Database } from '~/db/types';

export class ProductRepository {
	constructor(private readonly db: Kysely<Database>) {}

	// ──────────────────────────────────────────────
	// SELECT — coercionar filas a DTOs tipados
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
	// INSERT — validar y escribir $qToInterface()
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
				`Validación fallida: ${errors.map((e) => e.message).join(', ')}`
			);

		const row = dto.$qToInterface(); // seguro: sin campos computed, nombres de columna correctos

		await this.db.insertInto('products').values(row).execute();
		return dto;
	}

	// ──────────────────────────────────────────────
	// UPDATE — persistir sólo los campos cambiados
	// ──────────────────────────────────────────────

	async update(id: string, patch: Partial<IProduct>): Promise<ProductDto> {
		const existing = await this.findById(id);
		if (!existing) throw new Error(`Producto no encontrado: ${id}`);

		const updated = existing.$qCopy({ ...patch, updatedAt: new Date() });

		const { valid, errors } = qCheckRules(updated);
		if (!valid)
			throw new Error(
				`Validación fallida: ${errors.map((e) => e.message).join(', ')}`
			);

		// Sólo enviar los campos cambiados a la BD
		const changedFields = existing.$qGetChangedFields();
		if (changedFields.length === 0) return existing; // sin cambios — saltar la llamada a BD

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

## Validación asíncrona de unicidad

```typescript
// Adjuntar una regla asíncrona basada en Kysely directamente al campo del DTO:
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

		// Para actualización: permitir el mismo SKU si pertenece al mismo producto
		return !row || row.id === excludeId;
	};
}

// Patrón factory para inyectar la regla en tiempo de ejecución
export class ProductDto extends QModel<IProduct> {
	static withDb(
		data: Partial<IProduct>,
		db: Kysely<Database>,
		excludeId?: string
	): ProductDto {
		@QRule(buildSkuRule(db, excludeId), 'SKU ya en uso')
		class ProductDtoWithRule extends ProductDto {}
		return new ProductDtoWithRule(data);
	}
}

// Uso en un servicio:
const dto = ProductDto.withDb(formData, db, existingProduct.id);
const { valid, errors } = await qCheckRulesAsync(dto);
```

## Insert masivo con `createMany()`

```typescript
export async function bulkImport(
	db: Kysely<Database>,
	rawProducts: unknown[]
): Promise<{ inserted: number; invalid: number }> {
	const { instances, failed } = ProductDto.createMany(rawProducts);

	if (instances.length === 0) return { inserted: 0, invalid: failed.length };

	// Validar todos antes de insertar
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

## Transacción — Crear producto con registro de inventario

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
		// 1. Construir y validar DTO del producto
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

		// 2. Construir y validar DTO de inventario
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

## Columnas derivadas como campos DTO

Cuando usas el tag `sql` de Kysely o expresiones calculadas en una consulta, añádelas como
campos `@QComputed` en el DTO para aprovechar la coerción automática:

```typescript
// DTO extendido que recibe una columna agregada de Kysely
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

// Consulta Kysely:
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

## Ver también

- [Integración con Prisma](./prisma-integration) — ORM alternativo
- [Integración con Drizzle](./drizzle-integration) — otro constructor de consultas type-safe
- [Integración con Backend](./backend-integration) — Express, Fastify, Hono
- [Validación](/es/guide/validation) — `@QRule`, `qCheckRules()`, `qCheckRulesAsync()`
