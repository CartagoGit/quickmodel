# Integración con tRPC

QuickModel se integra de forma limpia en stacks basados en tRPC como validador de inputs, serializador de outputs y capa de coerción en middleware — sin depender de Zod.

## Patrones Clave

| Capa tRPC               | Patrón QuickModel                                           |
| ----------------------- | ----------------------------------------------------------- |
| Validador de input      | `new MyInputDto(ctx.rawInput)` + `qCheckRules()`            |
| Serializador de output  | `dto.$qSerialize()` como valor de retorno del procedimiento |
| Coerción en middleware  | `new MyDto(input)` + `coercionStrategy: 'loose'`            |
| Validación asíncrona DB | `qCheckRulesAsync()` con reglas async personalizadas        |
| Respuesta en batch      | `MyDto.createMany(batchArray)`                              |
| Mapeo de errores        | Mapear `qCheckRules().errors` a `TRPCError`                 |
| Mutación parcial        | `existing.$qCopy(patchInput.$qToInterface())`               |

## Configuración del Modelo

```typescript
import { QModel, Quick, QRule, QField, QGroup, QComputed } from 'quickmodel';

interface ICreateUserInput {
	name: string;
	email: string;
	role: string;
	age: number;
}

@Quick(
	{ name: 'string', email: 'string', role: 'string', age: 'number' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserInput extends QModel<ICreateUserInput> {
	@QGroup('identity')
	@QField({ label: 'Nombre', required: true })
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QGroup('identity')
	@QField({ label: 'Correo', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Formato de correo inválido'
	)
	declare email: string;

	@QField({ label: 'Rol' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
	)
	declare role: string;

	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 18, 'Debe tener 18 años o más')
	declare age: number;
}
```

## Validación de Input

### Como Esquema de Input en tRPC

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { qCheckRules } from 'quickmodel/forms';

const trpc = initTRPC.create();

export const createUser = trpc.procedure
	.input((rawInput) => new CreateUserInput(rawInput as object))
	.mutation(({ input }) => {
		const validation = qCheckRules(input);
		if (!validation.valid) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: validation.errors[0]?.message ?? 'Input inválido',
			});
		}
		// ... crear usuario en DB
		return { success: true };
	});
```

### Coerción desde Parámetros de URL

Los inputs de consultas tRPC provenientes de URLs llegan como strings. Con `coercionStrategy: 'loose'`, la transformación es automática:

```typescript
const input = new ListQueryInput({ page: '2', size: '20', tag: 'premium' });
// input.page === 2  (number) ✅
// input.size === 20  (number) ✅
```

### Múltiples Errores de Validación

```typescript
const input = new CreateUserInput({
	name: 'X',
	email: 'bad',
	role: 'superuser',
	age: 10,
});
const result = qCheckRules(input);
// result.valid === false
// result.errors → [{ field: 'name', ... }, { field: 'email', ... }, { field: 'role', ... }, { field: 'age', ... }]
```

## Serialización de Output

```typescript
interface IUserOutput {
	uid: string;
	name: string;
	email: string;
	role: string;
	age: number;
	label?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		role: 'string',
		age: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserOutput extends QModel<IUserOutput> {
	declare uid: string;
	declare name: string;
	declare email: string;
	declare role: string;
	declare age: number;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}

// En el procedimiento:
const dbRow = await db.findUser(id); // puede tener columnas SQL extra
const out = new UserOutput(dbRow); // elimina campos desconocidos automáticamente
return out.$qSerialize(); // { uid, name, email, role, age, label } — output limpio
```

## Coerción en Middleware

```typescript
const loggingMiddleware = trpc.middleware(async ({ ctx, next, rawInput }) => {
	const coerced = new CreateUserInput(rawInput as object);
	const validation = qCheckRules(coerced);
	if (!validation.valid) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Validación fallida en middleware',
		});
	}
	return next({ ctx: { ...ctx, validatedInput: coerced } });
});
```

## Validación Asíncrona en DB

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

export const createUser = trpc.procedure
  .input((raw) => new CreateUserInput(raw as object))
  .mutation(async ({ input }) => {
    const syncResult = qCheckRules(input);
    if (!syncResult.valid) throw new TRPCError({ code: 'BAD_REQUEST', ... });

    const asyncResult = await qCheckRulesAsync(input, {
      asyncRules: {
        email: [async (val) => {
          const exists = await db.users.findByEmail(val as string);
          return !exists; // false = error de validación
        }],
      },
    });

    if (!asyncResult.valid) {
      throw new TRPCError({ code: 'CONFLICT', message: 'El correo ya está en uso' });
    }

    return db.users.create(input.$qToInterface());
  });
```

## Consultas en Batch

```typescript
export const listUsers = trpc.procedure
	.input((raw) => new ListQueryInput(raw as object))
	.query(async ({ input }) => {
		const rows = await db.users.findMany({
			skip: (input.page - 1) * input.size,
			take: input.size,
			where: { tag: input.tag },
		});

		const { instances } = UserOutput.createMany(rows);
		return instances.map((dto) => dto.$qSerialize());
	});
```

## Mapeo de Errores

```typescript
import { TRPCError } from '@trpc/server';
import { qCheckRules } from 'quickmodel/forms';

function validateOrThrow(dto: QModel<object>): void {
	const result = qCheckRules(dto);
	if (!result.valid) {
		const firstError = result.errors[0];
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: `${firstError?.field ?? 'field'}: ${firstError?.message ?? 'inválido'}`,
		});
	}
}
```

## Mutaciones Parciales con `$qCopy()`

```typescript
interface IUpdateInput { uid: string; name: string; age: number; }

@Quick({ uid: 'string', name: 'string', age: 'number' }, { coercionStrategy: 'loose' })
class UpdateUserInput extends QModel<IUpdateInput> {
  declare uid: string;
  @QRule((val: string) => val.length >= 2, 'Nombre demasiado corto') declare name: string;
  @QRule((val: number) => val >= 0, 'Edad inválida') declare age: number;
}

export const updateUser = trpc.procedure
  .input((raw) => new UpdateUserInput(raw as object))
  .mutation(async ({ input }) => {
    const existing = new UserOutput(await db.users.findById(input.uid));
    const validated = qCheckRules(input);
    if (!validated.valid) throw new TRPCError({ code: 'BAD_REQUEST', ... });

    const updated = existing.$qCopy({ name: input.name, age: input.age });
    await db.users.update(input.uid, updated.$qToInterface());
    return updated.$qSerialize();
  });
```

## Migración desde Zod

Los decoradores de QuickModel se mapean 1-a-1 con los esquemas comunes de Zod:

| Zod                       | QuickModel                                    |
| ------------------------- | --------------------------------------------- |
| `z.string().min(2)`       | `@QRule((v) => v.length >= 2, '...')`         |
| `z.string().email()`      | `@QRule((v) => v.includes('@'), '...')`       |
| `z.number().min(18)`      | `@QRule((v) => v >= 18, '...')`               |
| `z.enum(['a','b'])`       | `@QRule((v) => ['a','b'].includes(v), '...')` |
| `z.object({...}).strip()` | `{ unknownPropertyPolicy: 'strip' }`          |
| `z.coerce.number()`       | `coercionStrategy: 'loose'`                   |
