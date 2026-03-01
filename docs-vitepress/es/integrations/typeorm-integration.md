# Integración con TypeORM

QuickModel se integra de forma natural con TypeORM actuando como la **capa de DTO de aplicación** por encima de las entidades TypeORM. La entidad gestiona la persistencia; el DTO QModel gestiona la validación, coerción y lógica de negocio.

## Arquitectura: Entidad vs DTO

```
Base de datos  ──►  Entidad TypeORM  ──►  DTO QModel  ──►  Controlador / Servicio
                    (tipos crudos de DB)  (tipado, validado)
```

- **Entidad**: clase TypeORM plana — tipos crudos de DB (`0/1` para booleanos, ISO strings para fechas)
- **DTO**: clase QModel — con coerción, validación y reglas de negocio

## Configuración básica

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

// Shape de la entidad TypeORM (capa DB)
interface IUserEntity {
	id: number;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean | number; // SQLite almacena como 0/1
	createdAt: Date | string;
}

// Interface del dominio (capa aplicación)
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
	@QField({ label: 'Nombre', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Email inválido')
	declare email: string;

	@QField({ label: 'Rol', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
	)
	declare role: string;

	@QComputed()
	get displayLabel(): string {
		return `[${this.role.toUpperCase()}] ${this.name}`;
	}
}
```

## Coerción de entidad TypeORM a DTO

```typescript
// Entidad devuelta por TypeORM repository.findOne()
const userEntity = await userRepository.findOne({ where: { id: 1 } });

// Coerciona al DTO — maneja 0/1 de SQLite, ISO strings de fechas, etc.
const dto = new UserDto(userEntity);

console.log(dto.name); // 'Alice'
console.log(dto.active); // true  (coercionado desde 1)
console.log(dto.createdAt); // instancia Date (coercionada desde ISO string)
console.log(dto.displayLabel); // '[USER] Alice'
```

## Guardar un DTO en el repositorio

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

// toInterface() devuelve un objeto plano seguro para TypeORM
await userRepository.save(dto.toInterface());
```

## Actualizaciones parciales con copy()

```typescript
const entity = await userRepository.findOne({ where: { id: 5 } });
const dto = new UserDto(entity);

// Crear copia actualizada — el original es inmutable
const updated = dto.$qm.copy({ role: 'admin', score: 999 });

// Persistir el parche
await userRepository.update(5, updated.toInterface());
```

## Patrón de value transformer de TypeORM

El `@Column({ transformer: { to, from } })` de TypeORM y la coerción de QModel funcionan juntos:

```typescript
// Transformer de TypeORM para fechas
const DateTransformer = {
	to: (value: Date) => value.toISOString(), // antes de escribir en DB
	from: (value: string) => new Date(value), // después de leer de DB
};

// @Column({ type: 'varchar', transformer: DateTransformer })
// createdAt: Date;

// Después de que TypeORM aplica el transformer, QModel maneja el resto
const dto = new UserDto(entity); // createdAt ya es un Date
```

## createMany() para datos semilla

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
];

const { instances, errors } = UserDto.createMany(seedData);

// Inserción masiva con TypeORM
await dataSource.transaction(async (manager) => {
	const payloads = instances.map((dto) => dto.toInterface());
	await manager.save(UserEntity, payloads);
});
```

## Patrón de repositorio tipado

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

		const saved = await this.repo.save(dto.toInterface() as UserEntity);
		return new UserDto(saved);
	}

	async update(id: number, patch: Partial<IUserRecord>): Promise<UserDto> {
		const existing = await this.findById(id);
		if (!existing) throw new Error('No encontrado');

		const updated = existing.$qm.copy(patch);
		const saved = await this.repo.save({
			...updated.toInterface(),
			id,
		} as UserEntity);
		return new UserDto(saved);
	}
}
```

## @QComputed() vs @VirtualColumn() de TypeORM

| Característica     | `@QComputed()` (QuickModel)   | `@VirtualColumn()` (TypeORM)       |
| ------------------ | ----------------------------- | ---------------------------------- |
| Capa de ejecución  | Aplicación / DTO              | Consulta a base de datos           |
| Soporte SQL        | ❌ (solo JS)                  | ✅ (expresión SQL)                 |
| Persistido         | ❌ (no en `toInterface()`)    | ❌ (solo lectura)                  |
| Disponible offline | ✅                            | ❌ (requiere DB)                   |
| Caso de uso        | Etiquetas derivadas, formateo | Agregados, campos computados en DB |

## Validación async antes de persistir

Usa `@QRule` con `Promise.resolve()` para reglas de negocio asíncronas:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

@Quick({ name: 'string', email: 'string' }, {})
class CreateUserDto extends QModel<{ name: string; email: string }> {
	declare name: string;

	@QRule(
		(val: string) => Promise.resolve(!existingEmails.has(val)),
		'Email ya en uso'
	)
	declare email: string;
}

const { valid, errors } = await qCheckRulesAsync(dto);
if (valid) {
	await userRepository.save(dto.toInterface());
}
```
