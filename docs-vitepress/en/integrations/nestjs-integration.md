# NestJS Integration

QuickModel works seamlessly with **NestJS** as a drop-in replacement for DTO classes backed by `class-validator` + `class-transformer`. Because both rely on `reflect-metadata` and TypeScript decorators, the integration requires zero additional configuration.

## Prerequisites

All NestJS projects already import `reflect-metadata` in `main.ts`. QuickModel uses the same mechanism, so no extra setup is needed.

::: tip No extra setup
If your `main.ts` already contains `import 'reflect-metadata'` (standard in every NestJS app), QuickModel picks it up automatically.
:::

Make sure `experimentalDecorators` and `emitDecoratorMetadata` are enabled — they are in any standard NestJS project:

```json
// tsconfig.json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Installation

```bash
npm install @cartago-git/quickmodel
```

## Using QModel as a DTO

Define your DTOs extending `QModel` instead of plain classes. You get **automatic type coercion**, validation, and serialization for free — no `class-transformer` needed.

```typescript
// create-user.dto.ts
import { QModel, Quick } from '@cartago-git/quickmodel';

interface ICreateUserBody {
	name: string;
	email: string;
	birthDate: string | Date;
	age: number;
	active: boolean;
}

@Quick(
	{ birthDate: Date, active: 'boolean' },
	{ unknownPropertyPolicy: 'strip' }
)
export class CreateUserDto extends QModel<ICreateUserBody> {
	declare name: string;
	declare email: string;
	declare birthDate: Date; // automatically converted from ISO string
	declare age: number;
	declare active: boolean;
}
```

::: tip Type coercion
`@Quick({ birthDate: Date })` tells QuickModel to call `new Date(value)` when populating the field. The JSON body string `"1994-06-15T00:00:00.000Z"` becomes a proper `Date` instance — no manual `new Date(dto.birthDate)` needed.
:::

::: warning Boolean fields
Use `'boolean'` (string literal) in `@Quick` to declare a boolean field — **not** the `Boolean` constructor. The string literal activates the `PrimitiveTransformer` which validates the value is an actual boolean. In a standard NestJS JSON body, `true`/`false` are already parsed as real booleans by the JSON parser.
:::

In your controller:

```typescript
// users.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	create(@Body() body: object) {
		return this.usersService.create(body);
	}
}
```

## Validation with @QRule

Replace `class-validator` with `@QRule` for business-rule validation. Predicates are fully typed using generics — no more `(value as string)` casts:

```typescript
// create-user.dto.ts
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

@Quick(
	{ birthDate: Date, active: 'boolean' },
	{ unknownPropertyPolicy: 'strip' }
)
export class CreateUserDto extends QModel<ICreateUserBody> {
	@QRule((value: string) => value.trim().length > 0, 'Name is required')
	@QRule((value: string) => value.trim().length <= 100, 'Name too long')
	declare name: string;

	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email format'
	)
	declare email: string;

	@QRule((value: number) => value >= 0, 'Age cannot be negative')
	@QRule((value: number) => value <= 130, 'Age must be realistic')
	declare age: number;

	declare birthDate: Date;
	declare active: boolean;
}
```

Validate in the service layer:

```typescript
// users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
	create(data: object): object {
		const dto = new CreateUserDto(data);

		const result = dto.checkRules();
		if (!result.valid) {
			throw new BadRequestException({
				message: 'Validation failed',
				errors: result.errors, // [{ field, message, value }, ...]
			});
		}

		return dto.serialize();
	}
}
```

`result.errors` has the same shape as `class-validator` errors, so it's compatible with any existing NestJS error handler or exception filter.

## Custom ValidationPipe

Wrap QuickModel validation in a standard NestJS `PipeTransform` for automatic injection at the controller level, keeping your controllers clean:

```typescript
// quickmodel-validation.pipe.ts
import {
	PipeTransform,
	Injectable,
	ArgumentMetadata,
	BadRequestException,
} from '@nestjs/common';
import { QModel } from '@cartago-git/quickmodel';

@Injectable()
export class QuickModelValidationPipe implements PipeTransform {
	transform(value: unknown, metadata: ArgumentMetadata) {
		const { metatype } = metadata;

		// Only process classes that extend QModel
		if (!metatype || !(metatype.prototype instanceof QModel)) {
			return value;
		}

		const instance = new (metatype as new (data: object) => QModel<object>)(
			value as object
		);

		const result = instance.checkRules();
		if (!result.valid) {
			throw new BadRequestException({
				message: 'Validation failed',
				errors: result.errors,
			});
		}

		return instance; // controller receives a fully coerced + validated QModel instance
	}
}
```

Register globally in `main.ts`:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QuickModelValidationPipe } from './quickmodel-validation.pipe';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new QuickModelValidationPipe());
	await app.listen(3000);
}
bootstrap();
```

## Nested DTOs

Use a nested `QModel` class in `@Quick` to automatically instantiate and validate nested objects:

```typescript
// address.dto.ts
@Quick({}, { unknownPropertyPolicy: 'strip' })
export class AddressDto extends QModel<IAddress> {
	@QRule((value: string) => value.trim().length > 0, 'Street is required')
	declare street: string;

	@QRule((value: string) => value.trim().length > 0, 'City is required')
	declare city: string;

	@QRule((value: string) => /^\d{5}$/.test(value), 'ZIP must be 5 digits')
	declare zip: string;
}

// create-order.dto.ts
@Quick({ shippingAddress: AddressDto }, { unknownPropertyPolicy: 'strip' })
export class CreateOrderDto extends QModel<ICreateOrderBody> {
	@QRule((value: string) => value.trim().length > 0, 'Product ID required')
	declare productId: string;

	@QRule((value: number) => value >= 1, 'Quantity must be at least 1')
	declare quantity: number;

	declare shippingAddress: AddressDto; // automatically instantiated as AddressDto
}
```

```typescript
// In your service:
const order = new CreateOrderDto(body);
// order.shippingAddress is already an AddressDto instance
const addrResult = order.shippingAddress.checkRules();
if (!addrResult.valid) {
	throw new BadRequestException({ errors: addrResult.errors });
}
```

## Async @QRule (DB Uniqueness)

Use `checkRulesAsync()` when any `@QRule` predicate is asynchronous — typically for database uniqueness checks:

```typescript
// register.dto.ts
@Quick({}, { unknownPropertyPolicy: 'strip' })
export class RegisterDto extends QModel<IRegisterBody> {
	@QRule((value: string) => value.length >= 3, 'Username min 3 chars')
	@QRule(
		(value: string) => /^[a-zA-Z0-9_]+$/.test(value),
		'Only letters, numbers, underscores'
	)
	declare username: string;

	// Async predicate — queries the DB
	@QRule(async (value: string) => {
		const exists = await db.users.findOne({ email: value });
		return !exists;
	}, 'Email already registered')
	declare email: string;

	@QRule((value: string) => value.length >= 8, 'Password min 8 chars')
	@QRule(
		(value: string) => /[A-Z]/.test(value),
		'Password needs uppercase letter'
	)
	@QRule((value: string) => /[0-9]/.test(value), 'Password needs a digit')
	declare password: string;
}
```

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
	async register(data: object): Promise<object> {
		const dto = new RegisterDto(data);

		// evaluates both sync AND async predicates — all in parallel by default
		const result = await dto.checkRulesAsync();
		if (!result.valid) {
			throw new BadRequestException({
				message: 'Registration failed',
				errors: result.errors,
			});
		}

		return this.saveUser(dto.serialize());
	}
}
```

### Timeout and execution mode

`checkRulesAsync()` accepts an optional `IQRulesAsyncOptions` object:

```typescript
// Give each DB predicate a 300 ms budget — prevents hanging requests
const result = await dto.checkRulesAsync({
	timeoutMs: 300,
	timeoutMessage: 'Service temporarily unavailable',
});

// Check which fields timed out vs. failed logically
result.errors.forEach((err) => {
	if (err.timedOut) {
		// predicate exceeded the 300 ms budget
		this.logger.warn(`${err.field}: async check timed out`);
	}
});
```

By default all predicates run **in parallel**. Use `mode: 'serial'` when predicates must run in order (e.g. validate format locally before making a DB call):

```typescript
// Serial: format check runs first, DB call only happens if format passes
const result = await dto.checkRulesAsync({ mode: 'serial', timeoutMs: 300 });
```

| Option           | Type                     | Default      | Description                                       |
| ---------------- | ------------------------ | ------------ | ------------------------------------------------- |
| `mode`           | `'parallel' \| 'serial'` | `'parallel'` | Execution order of predicates                     |
| `timeoutMs`      | `number`                 | —            | Max ms per predicate; exceeded → `timedOut: true` |
| `timeoutMessage` | `string \| () => string` | rule message | Message on timeout                                |

````

## Bulk Endpoints with createMany

Use `createMany()` for bulk POST endpoints. It returns `{ instances, errors }`, cleanly separating valid from invalid items:

```typescript
// users.service.ts
@Injectable()
export class UsersService {
	createMany(data: object[]): object {
		const { instances, errors } = CreateUserDto.createMany(data);

		// instances → coerced + validated DTOs ready to persist
		// errors    → [{ index, instance, errors: [...] }]

		if (errors.length > 0) {
			throw new BadRequestException({
				message: `${errors.length} items failed validation`,
				errors: errors.map((entry) => ({
					index: entry.index,
					errors: entry.errors,
				})),
			});
		}

		return {
			created: instances.length,
			items: instances.map((dto) => dto.serialize()),
		};
	}
}
````

::: tip Partial success
Pass `{ includeErrorInstances: true }` to `createMany()` to include failed instances in `instances[]` alongside valid ones — useful for bulk-insert-with-partial-failure endpoints.
:::

## Integration with @nestjs/swagger

`getSchema('openapi')` generates an OpenAPI 3.x compatible schema from the `@Quick()` type map. Use it programmatically or alongside `@ApiProperty`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { QModel, Quick } from '@cartago-git/quickmodel';

@Quick(
	{ title: 'string', price: 'number', available: 'boolean', createdAt: Date },
	{ unknownPropertyPolicy: 'strip' }
)
export class ProductDto extends QModel<IProduct> {
	@ApiProperty({ example: 'Laptop Pro' })
	declare title: string;

	@ApiProperty({ example: 999.99 })
	declare price: number;

	@ApiProperty({ example: true })
	declare available: boolean;

	@ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
	declare createdAt: Date;
}
```

Or generate the full schema automatically:

```typescript
const schema = ProductDto.getSchema('openapi');
// {
//   "type": "object",
//   "properties": {
//     "title":     { "type": "string" },
//     "price":     { "type": "number" },
//     "available": { "type": "boolean" },
//     "createdAt": { "type": "string", "format": "date-time" }
//   }
// }
```

::: info Schema generation scope
`getSchema()` generates entries only for fields explicitly typed in `@Quick()` or `@QType()`. Fields declared with `declare name: string` without a corresponding `@Quick({ name: 'string' })` entry are not included — add explicit type mappings for full schema coverage.

Available formats: `'openapi'`, `'json'` (JSON Schema Draft-07), `'ajv'`, `'zod'`, `'mongo'`, `'graphql'`, `'typescript'`.
:::

## Service Layer with Repository Pattern

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'strip' })
class UserModel extends QModel<IUser> {
	declare id: string;
	declare firstName: string;
	declare lastName: string;
	declare email: string;
	declare role: 'admin' | 'user';
	declare createdAt: Date;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get isAdmin(): boolean {
		return this.role === 'admin';
	}
}

@Injectable()
export class UsersService {
	private readonly store = new Map<string, UserModel>();

	create(data: object): object {
		const user = new UserModel(data);
		this.store.set(user.id, user); // id is declared as string on UserModel — no cast needed
		return user.serialize(); // { id, firstName, lastName, ..., fullName, isAdmin }
	}

	findById(id: string): object {
		const user = this.store.get(id);
		if (!user) throw new NotFoundException(`User ${id} not found`);
		return user.serialize();
	}

	findAll(): object[] {
		return [...this.store.values()].map((usr) => usr.serialize());
	}
}
```

## Computed Fields in API Responses (@QComputed)

Use `@QComputed()` to include derived fields in the API response without storing them in the database:

```typescript
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick(
	{
		firstName: 'string',
		lastName: 'string',
		birthYear: 'number',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class UserResponseDto extends QModel<IUserResponse> {
	declare firstName: string;
	declare lastName: string;
	declare birthYear: number;
	declare score: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		return new Date().getFullYear() - this.birthYear;
	}

	@QComputed()
	get scoreLabel(): 'excellent' | 'good' | 'average' | 'poor' {
		if (this.score >= 90) return 'excellent';
		if (this.score >= 70) return 'good';
		if (this.score >= 50) return 'average';
		return 'poor';
	}
}

// user.serialize() → { firstName, lastName, birthYear, score, fullName, age, scoreLabel }
```

::: tip @QComputed vs plain getter
A plain `get fullName()` **without** `@QComputed()` exists on the prototype but is invisible to `serialize()` and `toJSON()`. The decorator is the opt-in that tells the serializer to include the getter in the output.
:::

## Testing NestJS Services

Test your service logic without spawning a NestJS application — QuickModel DTOs work in any test runner:

```typescript
// create-user.dto.test.ts
import { describe, test, expect } from 'bun:test'; // or jest/vitest

describe('CreateUserDto', () => {
	test('coerces birthDate from ISO string', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15T00:00:00.000Z',
			active: true,
		});
		expect(dto.birthDate).toBeInstanceOf(Date);
	});

	test('checkRules() validates all fields', () => {
		const invalid = new CreateUserDto({
			name: '',
			email: 'bad',
			age: -1,
			birthDate: '1994-06-15',
			active: true,
		});
		const { valid, errors } = invalid.checkRules();
		expect(valid).toBe(false);
		expect(errors.length).toBeGreaterThan(0);
	});

	test('serialize() produces JSON-safe plain object', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15T00:00:00.000Z',
			active: true,
		});
		expect(() => JSON.stringify(dto.serialize())).not.toThrow();
	});
});
```

## Pattern Summary

| Concern             | NestJS (class-validator)                  | QuickModel                                       |
| ------------------- | ----------------------------------------- | ------------------------------------------------ |
| Type coercion       | `class-transformer` + `@Type()`           | Automatic via `@Quick({ field: Date })`          |
| Field validation    | `@IsEmail()`, `@IsNotEmpty()`, …          | `@QRule(predicate, message)`                     |
| Async validation    | `@ValidatorConstraint({ async: true })`   | `async` predicate + `checkRulesAsync(options?)`  |
| Nested models       | `@Type(() => NestedDto)`                  | `@Quick({ field: NestedModel })`                 |
| Serialization       | `instanceToPlain()` / `plainToInstance()` | `.serialize()` / `.toJSON()`                     |
| Schema export       | Manual `@ApiProperty()` per field         | `.getSchema('openapi')`                          |
| Computed API fields | Not built-in                              | `@QComputed()` getters                           |
| Bulk create         | Manual loop                               | `createMany(array)` → `{ instances, errors }`    |
| Strip unknown props | `@Exclude()` + `excludeExtraneousValues`  | `@Quick({}, { unknownPropertyPolicy: 'strip' })` |

## Next Steps

- [Validation (@QRule)](./validation) — full predicate API, async rules, i18n messages
- [Computed Fields (@QComputed)](./serialization#computed-fields-qcomputed) — derived data in responses
- [Serialization](./serialization) — serialize / toJSON / toPlain options
- [Schema Generation](./qmodel#getschema) — multi-format schema export (`openapi`, `json`, `ajv`, `zod`, …)
- [Mock Generation](./mocks) — generate test fixtures automatically
