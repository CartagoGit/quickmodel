# GraphQL / Apollo Server Integration

QuickModel works naturally as the **Input/Output DTO layer** in a GraphQL API. It handles coercion of raw resolver arguments, validates before persisting, serializes clean responses, and provides computed fields without resolver logic.

## Architecture

```
GraphQL Client  ──►  Resolver args  ──►  QModel Input DTO  ──►  Service / DB
GraphQL Client  ◄──  Resolver return  ◄──  QModel Output DTO  ◄──  DB rows
```

## Input DTO in a mutation resolver

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
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name is too short')
	declare name: string;

	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Age out of range')
	declare age: number;

	@QField({ label: 'Role', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;
}

// Apollo Server / GraphQL Yoga resolver
const resolvers = {
	Mutation: {
		createUser: async (_: unknown, args: { input: ICreateUserInput }) => {
			const dto = new CreateUserInput(args.input);
			const { valid, errors } = qCheckRules(dto);

			if (!valid) {
				throw new GraphQLError('Validation failed', {
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

## Async rules — uniqueness check before mutation

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

@Quick({ name: 'string', email: 'string', age: 'number', role: 'string' }, {})
class CreateUserInput extends QModel<ICreateUserInput> {
	declare name: string;

	@QRule(
		(val: string) => Promise.resolve(!existingEmails.has(val)),
		'Email already taken'
	)
	declare email: string;

	declare age: number;
	declare role: string;
}

// In resolver:
const { valid, errors } = await qCheckRulesAsync(dto);
if (!valid)
	throw new GraphQLError('Duplicate email', { extensions: { errors } });
```

## Output DTO with @QComputed fields

Use `@QComputed()` to add derived fields to the response without putting logic in the resolver:

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

// In query resolver:
const resolvers = {
	Query: {
		user: async (_: unknown, { id }: { id: number }) => {
			const raw = await db.users.findById(id);
			return new UserResponse(raw); // @QComputed fields available in response
		},
	},
};
```

## createMany() for list queries

```typescript
const resolvers = {
	Query: {
		users: async () => {
			const rows = await db.users.findAll();
			const { instances, errors } = UserResponse.createMany(rows);

			if (errors.length > 0) {
				console.warn('Skipping invalid rows:', errors);
			}

			return instances.map((dto) => dto.$qSerialize());
		},
	},
};
```

## copy() in update mutations

```typescript
const resolvers = {
	Mutation: {
		updatePost: async (
			_: unknown,
			{ id, input }: { id: number; input: IUpdatePostInput }
		) => {
			const existing = await postRepository.findById(id);
			if (!existing)
				throw new GraphQLError('Not found', {
					extensions: { code: 'NOT_FOUND' },
				});

			const updated = existing.$qCopy(input);
			const { valid, errors } = qCheckRules(updated);
			if (!valid)
				throw new GraphQLError('Validation failed', {
					extensions: { errors },
				});

			await postRepository.update(id, updated.toInterface());
			return updated.$qSerialize();
		},
	},
};
```

## Validation middleware (GraphQL Yoga useValidation pattern)

```typescript
// Generic validator — works with any QModel Input class
function validateInput<T>(
	DtoClass: { new (data: T): QModel<T> },
	input: T
): { dto: QModel<T>; errors: Array<{ field: string; message: string }> } {
	const dto = new DtoClass(input);
	const { errors } = qCheckRules(dto);
	return { dto, errors };
}

// Usage in resolvers:
const { dto, errors } = validateInput(CreateUserInput, args.input);
if (errors.length)
	throw new GraphQLError('Validation failed', { extensions: { errors } });
```

## getSchema() for GraphQL tooling

```typescript
// Generate JSON Schema for code-gen tools (graphql-codegen, Pothos, etc.)
const inputSchema = CreateUserInput.getSchema('json');
const responseSchema = UserResponse.getSchema('openapi');
```

## NestJS Code First — @InputType() compatibility

QModel decorators (`@QField`, `@QRule`, `@QGroup`) are separate from NestJS decorators and can be stacked:

```typescript
import { InputType, Field } from '@nestjs/graphql';
import { QModel, Quick, QField, QRule } from 'quickmodel';

@InputType()
@Quick({ name: 'string', email: 'string' }, { unknownPropertyPolicy: 'strip' })
class CreateUserInput extends QModel<{ name: string; email: string }> {
	@Field()
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.length >= 2, 'Too short')
	declare name: string;

	@Field()
	@QField({ label: 'Email', required: true })
	@QRule((v: string) => v.includes('@'), 'Invalid email')
	declare email: string;
}
```
