# TypeORM Integration

QuickModel integrates naturally with TypeORM by acting as the **business/application layer** DTO on top of your TypeORM entities. The entity handles persistence; the QModel DTO handles validation, coercion, and business logic.

## Architecture: Entity vs DTO

```
Database  ──►  TypeORM Entity  ──►  QModel DTO  ──►  Controller / Service
                (raw DB types)       (typed, validated)
```

- **Entity**: plain TypeORM class — raw types from DB (`0/1` for booleans, ISO strings for dates)
- **DTO**: QModel class — coerced, validated, enriched with business rules

## Basic setup

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

// TypeORM Entity (DB layer)
// @Entity() @Column() etc. omitted for brevity — this is the raw shape
interface IUserEntity {
	id: number;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean | number; // SQLite stores as 0/1
	createdAt: Date | string;
}

// QModel DTO (application layer)
interface IUserRecord {
	id: number;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	createdAt: Date;
}

@Quick(
	{
		id: 'number',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		active: 'boolean',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserDto extends QModel<IUserRecord> {
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ label: 'Role', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QComputed()
	get displayLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name}`;
	}
}
```

## Coercing a TypeORM entity into a DTO

```typescript
// Simulated entity returned by TypeORM repository.findOne()
const userEntity = await userRepository.findOne({ where: { id: 1 } });

// Coerce to DTO — handles SQLite 0/1 booleans, ISO date strings, etc.
const dto = new UserDto(userEntity);

console.log(dto.name); // 'Alice'
console.log(dto.active); // true  (coerced from 1)
console.log(dto.createdAt); // Date instance (coerced from ISO string)
console.log(dto.displayLabel); // '[USER] Alice'
```

## Saving a DTO to the repository

```typescript
import { qCheckRules } from 'quickmodel/forms';

const dto = new UserDto({
	id: 0,
	name: 'Alice',
	email: 'alice@x.com',
	age: 30,
	role: 'user',
	active: true,
	createdAt: new Date(),
});

const { valid, errors } = qCheckRules(dto);
if (!valid) {
	throw new Error(errors.map((e) => e.message).join(', '));
}

// $qToInterface() returns a plain object safe for TypeORM
await userRepository.save(dto.$qToInterface());
```

## Partial updates with `$qCopy()`

```typescript
const entity = await userRepository.findOne({ where: { id: 5 } });
const dto = new UserDto(entity);

// Create updated copy — original is immutable
const updated = dto.$qCopy({ role: 'admin', score: 999 });

// Persist the patch
await userRepository.update(5, updated.$qToInterface());
```

## TypeORM value transformer pattern

TypeORM's `@Column({ transformer: { to, from } })` and QModel coercion work together:

```typescript
// TypeORM column transformer for dates
const DateTransformer = {
	to: (value: Date) => value.toISOString(), // before writing to DB
	from: (value: string) => new Date(value), // after reading from DB
};

// @Column({ type: 'varchar', transformer: DateTransformer })
// createdAt: Date;

// After TypeORM applies the transformer, QModel coercion handles the rest
const dto = new UserDto(entity); // createdAt is already a Date
```

## createMany() for seed data

```typescript
const seedData = [
	{
		id: 1,
		name: 'Alice',
		email: 'alice@example.com',
		age: 30,
		role: 'admin',
		active: 1,
		createdAt: '2025-01-01T00:00:00.000Z',
	},
	{
		id: 2,
		name: 'Bob',
		email: 'bob@example.com',
		age: 25,
		role: 'user',
		active: 1,
		createdAt: '2025-01-02T00:00:00.000Z',
	},
	{
		id: 3,
		name: 'Carol',
		email: 'carol@example.com',
		age: 35,
		role: 'guest',
		active: 0,
		createdAt: '2025-01-03T00:00:00.000Z',
	},
];

const { instances, errors } = UserDto.createMany(seedData);

if (errors.length > 0) {
	console.warn('Invalid seed rows:', errors);
}

// Bulk insert via TypeORM
await dataSource.transaction(async (manager) => {
	const payloads = instances.map((dto) => dto.$qToInterface());
	await manager.save(UserEntity, payloads);
});
```

## Typed repository pattern

```typescript
class UserRepository {
	constructor(private readonly repo: Repository<UserEntity>) {}

	async findById(id: number): Promise<UserDto | undefined> {
		const entity = await this.repo.findOne({ where: { id } });
		return entity ? new UserDto(entity) : undefined;
	}

	async save(dto: UserDto): Promise<UserDto> {
		const { valid, errors } = qCheckRules(dto);
		if (!valid) throw new Error(errors[0]?.message);

		const saved = await this.repo.save(dto.$qToInterface() as UserEntity);
		return new UserDto(saved);
	}

	async update(id: number, patch: Partial<IUserRecord>): Promise<UserDto> {
		const existing = await this.findById(id);
		if (!existing) throw new Error('Not found');

		const updated = existing.$qCopy(patch);
		const saved = await this.repo.save({
			...updated.$qToInterface(),
			id,
		} as UserEntity);
		return new UserDto(saved);
	}
}
```

## @QComputed() vs TypeORM @VirtualColumn()

| Feature           | `@QComputed()` (QuickModel)   | `@VirtualColumn()` (TypeORM)   |
| ----------------- | ----------------------------- | ------------------------------ |
| Execution layer   | Application / DTO             | Database query                 |
| SQL support       | ❌ (JS only)                  | ✅ (SQL expression)            |
| Persisted         | ❌ (not in `$qToInterface()`) | ❌ (read-only)                 |
| Available offline | ✅                            | ❌ (needs DB)                  |
| Use case          | Derived labels, formatting    | Aggregates, computed DB fields |

```typescript
@QComputed()
get displayLabel(): string {
  // Computed at runtime in JS — not persisted
  return `[${this.role.toUpperCase()}] ${this.name}`;
}
```

## Async validation before persist

Use `@QRule` with `Promise.resolve()` for async business rules:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

@Quick({ name: 'string', email: 'string' }, {})
class CreateUserDto extends QModel<{ name: string; email: string }> {
	declare name: string;

	@QRule(
		(val: string) => Promise.resolve(!existingEmails.has(val)),
		'Email already in use'
	)
	declare email: string;
}

const { valid, errors } = await qCheckRulesAsync(dto);
if (valid) {
	await userRepository.save(dto.$qToInterface());
}
```
