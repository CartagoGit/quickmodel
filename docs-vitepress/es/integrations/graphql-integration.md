# Integración con GraphQL / Apollo Server

QuickModel funciona de forma natural como la **capa DTO de entrada/salida** en una API GraphQL. Gestiona la coerción de argumentos crudos del resolver, valida antes de persistir, serializa respuestas limpias y proporciona campos calculados sin lógica en el resolver.

## Arquitectura

```
Cliente GraphQL  ──►  Args del resolver  ──►  DTO entrada QModel  ──►  Servicio / DB
Cliente GraphQL  ◄──  Return del resolver  ◄──  DTO salida QModel  ◄──  Filas DB
```

## DTO de entrada en un resolver de mutación

```typescript
import { QModel, Quick, QRule, QField } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

interface ICreateUserInput {
	name: string;
	email: string;
	age: number;
	role: string;
}

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserInput extends QModel<ICreateUserInput> {
	@QField({ label: 'Nombre', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Email inválido')
	declare email: string;

	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Edad fuera de rango')
	declare age: number;

	@QField({ label: 'Rol', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
	)
	declare role: string;
}

// Resolver de Apollo Server / GraphQL Yoga
const resolvers = {
	Mutation: {
		createUser: async (_: unknown, args: { input: ICreateUserInput }) => {
			const dto = new CreateUserInput(args.input);
			const { valid, errors } = qCheckRules(dto);

			if (!valid) {
				throw new GraphQLError('Validación fallida', {
					extensions: {
						code: 'BAD_USER_INPUT',
						errors: errors.map(({ field, message }) => ({
							field,
							message,
						})),
					},
				});
			}

			const saved = await userRepository.save(dto.toInterface());
			return new UserResponse(saved);
		},
	},
};
```

## Reglas asíncronas — comprobación de unicidad antes de mutar

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

@Quick({ name: 'string', email: 'string', age: 'number', role: 'string' }, {})
class CreateUserInput extends QModel<ICreateUserInput> {
	declare name: string;

	@QRule(
		(val: string) => Promise.resolve(!existingEmails.has(val)),
		'Email ya en uso'
	)
	declare email: string;

	declare age: number;
	declare role: string;
}

// En el resolver:
const { valid, errors } = await qCheckRulesAsync(dto);
if (!valid)
	throw new GraphQLError('Email duplicado', { extensions: { errors } });
```

## DTO de salida con campos @QComputed

Usa `@QComputed()` para añadir campos derivados a la respuesta sin lógica en el resolver:

```typescript
@Quick(
	{
		id: 'number',
		name: 'string',
		email: 'string',
		role: 'string',
		bio: 'string',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class UserResponse extends QModel<IUserResponse> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare role: string;
	declare bio: string;

	@QComputed()
	get displayName(): string {
		return `${this.name} (${this.role})`;
	}

	@QComputed()
	get isAdmin(): boolean {
		return this.role === 'admin';
	}

	@QComputed()
	get initials(): string {
		return this.name
			.split(' ')
			.map((w) => w[0] ?? '')
			.join('')
			.toUpperCase();
	}
}

// En el resolver de query:
const resolvers = {
	Query: {
		user: async (_: unknown, { id }: { id: number }) => {
			const raw = await db.users.findById(id);
			return new UserResponse(raw); // campos @QComputed disponibles en la respuesta
		},
	},
};
```

## createMany() para queries de lista

```typescript
const resolvers = {
	Query: {
		users: async () => {
			const rows = await db.users.findAll();
			const { instances, errors } = UserResponse.createMany(rows);

			if (errors.length > 0) {
				console.warn('Filas inválidas omitidas:', errors);
			}

			return instances.map((dto) => dto.$qm.serialize());
		},
	},
};
```

## copy() en mutaciones de actualización

```typescript
const resolvers = {
	Mutation: {
		updatePost: async (
			_: unknown,
			{ id, input }: { id: number; input: IUpdatePostInput }
		) => {
			const existing = await postRepository.findById(id);
			if (!existing)
				throw new GraphQLError('No encontrado', {
					extensions: { code: 'NOT_FOUND' },
				});

			const updated = existing.$qm.copy(input);
			const { valid, errors } = qCheckRules(updated);
			if (!valid)
				throw new GraphQLError('Validación fallida', {
					extensions: { errors },
				});

			await postRepository.update(id, updated.toInterface());
			return updated.$qm.serialize();
		},
	},
};
```

## Middleware de validación (patrón useValidation de GraphQL Yoga)

```typescript
// Validador genérico — funciona con cualquier clase Input de QModel
function validateInput<T>(
	DtoClass: { new (data: T): QModel<T> },
	input: T
): { dto: QModel<T>; errors: Array<{ field: string; message: string }> } {
	const dto = new DtoClass(input);
	const { errors } = qCheckRules(dto);
	return { dto, errors };
}

// Uso en resolvers:
const { dto, errors } = validateInput(CreateUserInput, args.input);
if (errors.length)
	throw new GraphQLError('Validación fallida', { extensions: { errors } });
```

## NestJS Code First — compatibilidad con @InputType()

Los decoradores de QModel (`@QField`, `@QRule`, `@QGroup`) son independientes de los de NestJS y se pueden combinar:

```typescript
import { InputType, Field } from '@nestjs/graphql';
import { QModel, Quick, QField, QRule } from 'quickmodel';

@InputType()
@Quick({ name: 'string', email: 'string' }, { unknownPropertyPolicy: 'strip' })
class CreateUserInput extends QModel<{ name: string; email: string }> {
	@Field()
	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.length >= 2, 'Demasiado corto')
	declare name: string;

	@Field()
	@QField({ label: 'Email', required: true })
	@QRule((v: string) => v.includes('@'), 'Email inválido')
	declare email: string;
}
```
