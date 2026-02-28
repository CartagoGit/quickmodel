# Integración con Prisma ORM

QuickModel funciona junto a Prisma como una capa DTO con tipado fuerte entre tu base de datos y tu aplicación. Úsalo para coercionar resultados de Prisma, validar inputs de creación/actualización, implementar patrones repositorio y derivar campos computados — sin añadir código específico de Prisma a tus definiciones de modelo.

## Patrones Clave

| Patrón                       | API QuickModel                                                             |
| ---------------------------- | -------------------------------------------------------------------------- |
| Mapear fila Prisma a DTO     | `new UserRecordDto(prismaRow)` — elimina `_count`, `_prisma*`              |
| Validar input de creación    | `qCheckRules(new CreateUserDto(formData))`                                 |
| Seed masivo / importación    | `UserRecordDto.createMany(seedArray)`                                      |
| Abstracción repositorio      | `repo.create(dto)` → `dto.toInterface()` → `prisma.user.create()`          |
| Actualización parcial        | `existing.copy({ score: 100 })` → `prisma.user.update({ data: ... })`      |
| Campo derivado               | `@QComputed() get label()` — incluido en `serialize()`                     |
| Validación de unicidad en DB | `qCheckRulesAsync()` con regla async que llama a `prisma.user.findFirst()` |

## Configuración del Modelo

```typescript
import { QModel, Quick, QRule, QField, QGroup, QComputed } from 'quickmodel';

interface IUserRecord {
	uid: string;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	fullLabel?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		active: 'boolean',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserRecordDto extends QModel<IUserRecord> {
	declare uid: string;
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

	@QComputed()
	get fullLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name} — ${this.email}`;
	}
}
```

La opción `unknownPropertyPolicy: 'strip'` gestiona automáticamente los campos relacionales extras de Prisma (`_count`, `_avg`, modelos relacionados incluidos vía `include`).

## DTO desde un Resultado de Prisma

```typescript
const prismaRow = await prisma.user.findUnique({
	where: { uid },
	include: { _count: { select: { posts: true } } },
});
const dto = new UserRecordDto(prismaRow!);
// _count → eliminado ✅
// dto.fullLabel → '[USER] Alice — alice@example.com' ✅
```

### Coerción desde Campos JSON de Prisma

Si un modelo Prisma devuelve valores de una columna JSON o de una consulta raw, `coercionStrategy: 'loose'` gestiona la conversión:

```typescript
const rawQuery =
	await prisma.$queryRaw`SELECT uid, age::text, active::int FROM users WHERE uid = ${uid}`;
const dto = new UserRecordDto((rawQuery as object[])[0]!);
// dto.age es un número, dto.active es un boolean ✅
```

## Validación de Input de Creación

Define un DTO separado para inputs de creación con reglas más estrictas:

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
	@QRule((val: number) => val >= 18, 'Debe tener 18 años o más')
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

// Pasar a Prisma:
await prisma.user.create({
	data: { ...dto.toInterface(), uid: crypto.randomUUID() },
});
```

## Seed / Importación Masiva

```typescript
import seedData from './seed-users.json';

const { instances } = UserRecordDto.createMany(seedData);
await prisma.user.createMany({
	data: instances.map((dto) => dto.toInterface()),
	skipDuplicates: true,
});
```

## Patrón Repositorio

```typescript
class UserRepository {
	async create(dto: CreateUserDto): Promise<UserRecordDto> {
		const validation = qCheckRules(dto);
		if (!validation.valid) throw new Error(validation.errors[0]?.message!);

		const row = await prisma.user.create({
			data: {
				...dto.toInterface(),
				uid: crypto.randomUUID(),
				active: true,
				score: 0,
			},
		});
		return new UserRecordDto(row);
	}

	async findById(uid: string): Promise<UserRecordDto | null> {
		const row = await prisma.user.findUnique({ where: { uid } });
		return row ? new UserRecordDto(row) : null;
	}

	async findAll(): Promise<UserRecordDto[]> {
		const rows = await prisma.user.findMany();
		const { instances } = UserRecordDto.createMany(rows);
		return instances;
	}
}
```

## Actualizaciones Parciales con `copy()`

```typescript
const existing = new UserRecordDto(
	await prisma.user.findUniqueOrThrow({ where: { uid } })
);

// Aplica solo los campos que cambiaron:
const updated = existing.copy({ score: 100, role: 'admin' });

if (updated.isDirty()) {
	await prisma.user.update({
		where: { uid: updated.uid },
		data: { score: updated.score, role: updated.role },
	});
}
```

## Campos Derivados con `@QComputed`

Los campos computados se incluyen en `serialize()` — ideal para respuestas API basadas en Prisma:

```typescript
interface IPostRecord {
	pid: string;
	title: string;
	body: string;
	authorId: string;
	published: boolean;
	views: number;
	excerpt?: string;
}

@Quick(
	{
		pid: 'string',
		title: 'string',
		body: 'string',
		authorId: 'string',
		published: 'boolean',
		views: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class PostRecordDto extends QModel<IPostRecord> {
	declare pid: string;
	declare title: string;
	declare body: string;
	declare authorId: string;
	declare published: boolean;
	declare views: number;

	@QComputed()
	get excerpt(): string {
		return this.body.length > 100
			? `${this.body.slice(0, 100)}…`
			: this.body;
	}
}

const post = new PostRecordDto(
	await prisma.post.findUniqueOrThrow({ where: { pid } })
);
return post.serialize(); // incluye excerpt ✅
```

## Validación de Unicidad en DB

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

class CreateUserWithUniquenessDto extends CreateUserDto {}

async function createUserSafe(input: object) {
	const dto = new CreateUserWithUniquenessDto(input);

	const result = await qCheckRulesAsync(dto, {
		asyncRules: {
			email: [
				async (val) => {
					const exists = await prisma.user.findFirst({
						where: { email: val as string },
					});
					return !exists; // false = error de validación
				},
			],
		},
	});

	if (!result.valid) {
		throw new Error(`El correo ya está en uso`);
	}

	return prisma.user.create({
		data: {
			...dto.toInterface(),
			uid: crypto.randomUUID(),
			active: true,
			score: 0,
		},
	});
}
```

## Migración desde class-transformer + class-validator

| class-transformer / class-validator | QuickModel                                              |
| ----------------------------------- | ------------------------------------------------------- |
| `@IsEmail()`                        | `@QRule((v) => v.includes('@'), '...')`                 |
| `@Min(18)`                          | `@QRule((v) => v >= 18, '...')`                         |
| `@IsEnum(Role)`                     | `@QRule((v) => Object.values(Role).includes(v), '...')` |
| `plainToClass(User, data)`          | `new UserDto(data)`                                     |
| `validateOrReject(instance)`        | `qCheckRules(instance)`                                 |
| `@Exclude()` en props extras        | `{ unknownPropertyPolicy: 'strip' }`                    |
| `@Type(() => Number)`               | `coercionStrategy: 'loose'`                             |
