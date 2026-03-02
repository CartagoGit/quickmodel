# Integración con Drizzle ORM

QuickModel funciona junto a Drizzle ORM como una capa DTO con tipado fuerte entre tu base de datos y tu aplicación. Úsalo para coercionar resultados de queries de Drizzle, validar inputs de creación/actualización, implementar patrones repositorio y derivar campos computados — sin instalar Drizzle como dependencia en tus definiciones de modelo.

## Patrones Clave

| Patrón                    | API QuickModel                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Mapear fila Drizzle a DTO | `new UserRowDto(row)` — elimina join artifacts, `updatedAt`, `deletedAt`, etc.        |
| Validar input de creación | `qCheckRules(new CreateUserDto(formData))`                                            |
| Seed masivo / importación | `UserRowDto.createMany(seedData)`                                                     |
| Abstracción repositorio   | `repo.insert(dto)` → `dto.$qToInterface()` → `db.insert(users).values(...)`             |
| Actualización parcial     | `existing.$qCopy({ score: 100 })` → `db.update(users).set({ score: 100 })`              |
| Campo derivado            | `@QComputed() get slug()` — incluido en `serialize()`, excluido de `toInterface()`    |
| Validación unicidad en DB | `qCheckRulesAsync()` con regla async que llama a `db.select().from(users).where(...)` |
| Drizzle timestamp → Date  | `createdAt: Date` en `@Quick()` — ISO strings transformadas automáticamente           |

## Configuración del Modelo

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
	@QField({ label: 'Correo', required: true })
	@QRule((val: string) => val.includes('@'), 'Correo inválido')
	declare email: string;

	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Edad inválida')
	declare age: number;

	@QGroup('identity')
	@QField({ label: 'Rol' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
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

La política `unknownPropertyPolicy: 'strip'` elimina automáticamente los join artifacts de Drizzle (`addresses`, `profile`), columnas internas de auditoría (`updatedAt`, `deletedAt`, `version`) y cualquier columna extra de queries raw.

## DTO desde Resultado de Query Drizzle

```typescript
// Query Drizzle:
const rows = await db.select().from(users).where(eq(users.id, userId));
const dto = new UserRowDto(rows[0]!);
// join artifacts eliminados ✅, timestamp coercionado a Date ✅, displayName computado ✅

// Con relaciones (leftJoin):
const row = await db
	.select()
	.from(users)
	.leftJoin(posts, eq(posts.authorId, users.id))
	.where(eq(users.id, userId));
const dto2 = new UserRowDto(row[0]!);
// Columnas de post eliminadas automáticamente via unknownPropertyPolicy: 'strip' ✅
```

### Coerción desde Queries Raw

Cuando se usa `db.$client.query()` o `sql\`...\``, las columnas pueden llegar como strings. La estrategia `coercionStrategy: 'loose'` lo maneja transparentemente:

```typescript
const raw = await db.execute(
	sql`SELECT id, age::text, active::int, price::text FROM users WHERE id = ${userId}`
);
const dto = new UserRowDto(raw.rows[0]!);
// dto.id → number, dto.age → number, dto.active → boolean ✅
```

## Validación de Input de Creación

Define un DTO separado para inputs de creación con reglas de validación más estrictas:

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
	@QField({ label: 'Nombre', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QField({ label: 'Correo', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Formato de correo inválido'
	)
	declare email: string;

	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 18, 'Debe ser mayor de 18')
	declare age: number;

	@QField({ label: 'Rol' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
	)
	declare role: string;
}

// Uso:
const dto = new CreateUserDto(formData);
const validation = qCheckRules(dto);
if (!validation.valid) throw new Error(validation.errors[0]?.message);

// Pasar a Drizzle:
await db.insert(users).values({
	...dto.$qToInterface(),
	id: crypto.randomUUID(),
	active: true,
	score: 0,
	createdAt: new Date(),
});
```

## Seed Masivo / Importación

```typescript
import seedData from './seed-users.json';

const { instances, errors } = UserRowDto.createMany(seedData);

// Mapear al formato de insert de Drizzle:
await db.insert(users).values(
	instances.map((dto) => ({
		...dto.$qToInterface(),
		// toInterface() serializa Date → ISO string, compatible con columnas timestamp de Drizzle
	}))
);
```

## Patrón Repositorio

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

## Tipos Drizzle → QModel

Drizzle no tiene un tipo `Decimal` dedicado por defecto — las columnas `doublePrecision` y `real` se mapean a `number`. La estrategia `coercionStrategy: 'loose'` maneja la coerción de string a number cuando las columnas llegan como strings desde queries raw:

| Columna Drizzle                | Mapeo en `@Quick()` | Notas                                              |
| ------------------------------ | ------------------- | -------------------------------------------------- |
| `integer()`                    | `'number'`          | Auto-coercionado desde string en queries raw       |
| `doublePrecision()` / `real()` | `'number'`          | String → number vía estrategia `loose`             |
| `varchar()` / `text()`         | `'string'`          | —                                                  |
| `boolean()`                    | `'boolean'`         | `0`/`1` coercionado a `false`/`true` vía `loose`   |
| `timestamp()`                  | `Date`              | ISO string → instancia `Date` auto-transformada    |
| `jsonb()` / `json()`           | `'string'`          | Serializar vía `JSON.stringify()` antes de guardar |

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

## Actualizaciones Parciales con `copy()`

`copy()` crea una nueva instancia inmutable — pasa solo los campos cambiados a `db.update().set()`:

```typescript
const [row] = await db.select().from(users).where(eq(users.id, id));
const existing = new UserRowDto(row!);

// Aplicar solo los campos que cambiaron:
const updated = existing.$qCopy({ score: 100, role: 'admin' });

await db
	.update(users)
	.set({ score: updated.score, role: updated.role })
	.where(eq(users.id, updated.id));
```

## Campos Derivados con `@QComputed`

Los campos computados se incluyen en `serialize()` pero se excluyen de `toInterface()` — **nunca se almacenan** en Drizzle:

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

dto.slug; // → 'mi-producto' (computado, no almacenado)
dto.$qSerialize(); // → { ..., slug: 'mi-producto' } ✅ incluido en respuesta API
dto.$qToInterface(); // → { id, title, ... } ❌ slug excluido — seguro para db.update()
```

## Validación de Unicidad en DB

Usa `qCheckRulesAsync()` con predicados `@QRule` async para simular validaciones de unicidad a nivel de base de datos:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

class CreateUserWithUniqueEmailDto extends CreateUserDto {
	@QRule(async (val: string) => {
		const [existing] = await db
			.select()
			.from(users)
			.where(eq(users.email, val));
		return !existing; // false → la validación falla
	}, 'Correo ya registrado')
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

## Eliminación de Columnas Internas

Los esquemas de Drizzle suelen incluir columnas internas de auditoría (`createdAt`, `updatedAt`, `deletedAt`, `version`) que no deben exponerse en los DTOs. La política `unknownPropertyPolicy: 'strip'` las elimina automáticamente:

```typescript
// Fila completa de Drizzle (desde .returning() o join):
const row = {
	id: 1,
	name: 'Alice',
	email: 'alice@example.com',
	age: 30,
	role: 'user',
	active: true,
	score: 95,
	createdAt: new Date(),
	// Columnas internas — no están en la interfaz UserRowDto:
	updatedAt: new Date(),
	deletedAt: null,
	version: 5,
};

const dto = new UserRowDto(row);
// dto.updatedAt → undefined ✅ (eliminado)
// dto.version   → undefined ✅ (eliminado)
```

## Migración desde Drizzle + Zod

| Patrón Drizzle + Zod             | QuickModel                                   |
| -------------------------------- | -------------------------------------------- |
| `createInsertSchema(users)`      | `CreateUserDto` con validadores `@QRule`     |
| `createSelectSchema(users)`      | `UserRowDto` con `coercionStrategy: 'loose'` |
| `z.parse(row)`                   | `new UserRowDto(row)`                        |
| `z.safeParse(data).error`        | `qCheckRules(dto).errors`                    |
| `.transform()` manual para tipos | `@Quick({ createdAt: Date })`                |
| `z.string().email()`             | `@QRule((v) => v.includes('@'), '...')`      |

## Exportar schema con `getSchema('drizzle')`

Importa `quickmodel/schema` una vez, luego llama a `getSchema('drizzle')` para obtener un string con la definición de tabla Drizzle:

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

### Mantener las definiciones de tabla sincronizadas con tu QModel

Generar la tabla Drizzle desde tu QModel proporciona una única fuente de verdad:

```typescript
import 'quickmodel/schema';
import fs from 'node:fs';

const models = [UserDto, ProductDto, OrderDto];
const tables = models.map((M) => M.getSchema('drizzle')).join('\n\n');
fs.writeFileSync('src/db/schema.generated.ts', tables);
```

> **Nota:** `fromSchema('drizzle', ...)` aún no está soportado. Usa `fromSchema('typescript', ...)` con una interfaz TypeScript en su lugar.

## Ver también

- [Generación de Schema](/es/guide/schema-generation) — referencia completa de `getSchema()`
- [Integración con JSON Schema](/es/integrations/json-schema-integration) — formato de schema portable
- [Integración con TypeScript](/es/integrations/typescript-schema-integration) — scaffolding desde interfaces
