# Prisma ORM Integration

QuickModel works alongside Prisma as a type-safe DTO layer between your database and your application. Use it to coerce raw Prisma results, validate create/update inputs, implement repository patterns, and derive computed fields — all without adding Prisma-specific code to your model definitions.

## Key Patterns

| Pattern                | QuickModel API                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| Map Prisma row to DTO  | `new UserRecordDto(prismaRow)` — strips `_count`, `_prisma*`           |
| Validate create input  | `qCheckRules(new CreateUserDto(formData))`                             |
| Bulk seed / import     | `UserRecordDto.createMany(seedArray)`                                  |
| Repository abstraction | `repo.create(dto)` → `dto.toInterface()` → `prisma.user.create()`      |
| Partial update         | `existing.copy({ score: 100 })` → `prisma.user.update({ data: ... })`  |
| Derived field          | `@QComputed() get label()` — included in `serialize()`                 |
| DB uniqueness check    | `qCheckRulesAsync()` with async rule hitting `prisma.user.findFirst()` |

## Model Setup

```typescript
import {
	QModel,
	Quick,
	QRule,
	QField,
	QGroup,
	QComputed,
} from '@cartago-git/quickmodel';

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

	@QComputed()
	get fullLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name} — ${this.email}`;
	}
}
```

The `unknownPropertyPolicy: 'strip'` handles Prisma's extra relational fields (`_count`, `_avg`, joined models) automatically.

## DTO from Prisma Result

```typescript
const prismaRow = await prisma.user.findUnique({
	where: { uid },
	include: { _count: { select: { posts: true } } },
});
const dto = new UserRecordDto(prismaRow!);
// _count → stripped ✅
// dto.fullLabel → '[USER] Alice — alice@example.com' ✅
```

### Coercion from Prisma JSON Fields

If a Prisma model returns values from a JSON column or a raw query, `coercionStrategy: 'loose'` handles the conversion:

```typescript
const rawQuery =
	await prisma.$queryRaw`SELECT uid, age::text, active::int FROM users WHERE uid = ${uid}`;
const dto = new UserRecordDto((rawQuery as object[])[0]!);
// dto.age is a number, dto.active is a boolean ✅
```

## Create Input Validation

Define a separate DTO for create inputs with stricter rules:

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

// Pass to Prisma:
await prisma.user.create({
	data: { ...dto.toInterface(), uid: crypto.randomUUID() },
});
```

## Bulk Seed / Import

```typescript
import seedData from './seed-users.json';

const { instances } = UserRecordDto.createMany(seedData);
await prisma.user.createMany({
	data: instances.map((dto) => dto.toInterface()),
	skipDuplicates: true,
});
```

## Repository Pattern

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

## Partial Updates with `copy()`

```typescript
const existing = new UserRecordDto(
	await prisma.user.findUniqueOrThrow({ where: { uid } })
);

// Apply only the fields that changed:
const updated = existing.copy({ score: 100, role: 'admin' });

if (updated.isDirty()) {
	await prisma.user.update({
		where: { uid: updated.uid },
		data: { score: updated.score, role: updated.role },
	});
}
```

## Derived Fields with `@QComputed`

Computed fields are included in `serialize()` — useful for Prisma-based API responses:

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
return post.serialize(); // includes excerpt ✅
```

## DB Uniqueness Validation

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel';

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
					return !exists; // false = validation error
				},
			],
		},
	});

	if (!result.valid) {
		throw new Error(`Email already taken`);
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

## Migration from class-transformer + class-validator

| class-transformer / class-validator | QuickModel                                              |
| ----------------------------------- | ------------------------------------------------------- |
| `@IsEmail()`                        | `@QRule((v) => v.includes('@'), '...')`                 |
| `@Min(18)`                          | `@QRule((v) => v >= 18, '...')`                         |
| `@IsEnum(Role)`                     | `@QRule((v) => Object.values(Role).includes(v), '...')` |
| `plainToClass(User, data)`          | `new UserDto(data)`                                     |
| `validateOrReject(instance)`        | `qCheckRules(instance)`                                 |
| `@Exclude()` on extra props         | `{ unknownPropertyPolicy: 'strip' }`                    |
| `@Type(() => Number)`               | `coercionStrategy: 'loose'`                             |
