# tRPC Integration

QuickModel integrates cleanly into tRPC-based stacks as an input validator, output serializer, and middleware coercion layer — with no dependency on Zod.

## Key Patterns

| tRPC layer          | QuickModel Pattern                               |
| ------------------- | ------------------------------------------------ |
| Input validator     | `new MyInputDto(ctx.rawInput)` + `qCheckRules()` |
| Output serializer   | `dto.serialize()` as procedure return value      |
| Middleware coercion | `new MyDto(input)` + `coercionStrategy: 'loose'` |
| Async DB validation | `qCheckRulesAsync()` with custom async rules     |
| Batch response      | `MyDto.createMany(batchArray)`                   |
| Error mapping       | Map `qCheckRules().errors` to `TRPCError`        |
| Patch mutation      | `existing.copy(patchInput.toInterface())`        |

## Model Setup

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
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QGroup('identity')
	@QField({ label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email format'
	)
	declare email: string;

	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	declare age: number;
}
```

## Input Validation

### As a tRPC Input Schema

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
				message: validation.errors[0]?.message ?? 'Invalid input',
			});
		}
		// ... create user in DB
		return { success: true };
	});
```

### Coercion from URL Query Params

tRPC query inputs from URLs arrive as strings. With `coercionStrategy: 'loose'`, the transformation is automatic:

```typescript
const input = new ListQueryInput({ page: '2', size: '20', tag: 'premium' });
// input.page === 2  (number) ✅
// input.size === 20  (number) ✅
```

### Multiple Validation Errors

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

## Output Serialization

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

// In procedure:
const dbRow = await db.findUser(id); // may have extra SQL columns
const out = new UserOutput(dbRow); // strips unknown fields automatically
return out.$qSerialize(); // { uid, name, email, role, age, label } — clean output
```

## Middleware Coercion

```typescript
const loggingMiddleware = trpc.middleware(async ({ ctx, next, rawInput }) => {
	const coerced = new CreateUserInput(rawInput as object);
	const validation = qCheckRules(coerced);
	if (!validation.valid) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Validation failed in middleware',
		});
	}
	return next({ ctx: { ...ctx, validatedInput: coerced } });
});
```

## Async DB Validation

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
          return !exists; // false = validation error
        }],
      },
    });

    if (!asyncResult.valid) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Email already taken' });
    }

    return db.users.create(input.toInterface());
  });
```

## Batch Queries

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

## Error Mapping

```typescript
import { TRPCError } from '@trpc/server';
import { qCheckRules } from 'quickmodel/forms';

function validateOrThrow<T>(
	dto: T extends QModel<infer I> ? QModel<I> : never
): void {
	const result = qCheckRules(dto);
	if (!result.valid) {
		const firstError = result.errors[0];
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: `${firstError?.field ?? 'field'}: ${firstError?.message ?? 'invalid'}`,
		});
	}
}
```

## Patch Mutations with `copy()`

```typescript
interface IUpdateInput { uid: string; name: string; age: number; }

@Quick({ uid: 'string', name: 'string', age: 'number' }, { coercionStrategy: 'loose' })
class UpdateUserInput extends QModel<IUpdateInput> {
  declare uid: string;
  @QRule((val: string) => val.length >= 2, 'Name too short') declare name: string;
  @QRule((val: number) => val >= 0, 'Invalid age') declare age: number;
}

export const updateUser = trpc.procedure
  .input((raw) => new UpdateUserInput(raw as object))
  .mutation(async ({ input }) => {
    const existing = new UserOutput(await db.users.findById(input.uid));
    const validated = qCheckRules(input);
    if (!validated.valid) throw new TRPCError({ code: 'BAD_REQUEST', ... });

    const updated = existing.$qCopy({ name: input.name, age: input.age });
    await db.users.update(input.uid, updated.toInterface());
    return updated.$qSerialize();
  });
```

## Migration from Zod

QuickModel decorators map 1-to-1 with common Zod schemas:

| Zod                       | QuickModel                                    |
| ------------------------- | --------------------------------------------- |
| `z.string().min(2)`       | `@QRule((v) => v.length >= 2, '...')`         |
| `z.string().email()`      | `@QRule((v) => v.includes('@'), '...')`       |
| `z.number().min(18)`      | `@QRule((v) => v >= 18, '...')`               |
| `z.enum(['a','b'])`       | `@QRule((v) => ['a','b'].includes(v), '...')` |
| `z.object({...}).strip()` | `{ unknownPropertyPolicy: 'strip' }`          |
| `z.coerce.number()`       | `coercionStrategy: 'loose'`                   |
