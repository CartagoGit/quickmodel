# NestJS Integration

QuickModel works seamlessly with **NestJS** as a drop-in replacement for DTO classes. Because both QuickModel and NestJS rely on `reflect-metadata` and TypeScript decorators, the integration requires zero additional configuration.

## Prerequisites

All NestJS projects already import `reflect-metadata` in `main.ts`. QuickModel uses the same mechanism, so no extra setup is needed.

::: tip No extra setup
If your `main.ts` already contains `import 'reflect-metadata'` (standard in every NestJS app), QuickModel picks it up automatically.
:::

## Installation

```bash
npm install @cartago-git/quickmodel
```

Make sure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in your `tsconfig.json` — they are in any standard NestJS project:

```json
// tsconfig.json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Using QModel as a DTO

Define your DTOs extending `QModel` instead of using plain classes. You get automatic type coercion, validation, and serialization for free:

```typescript
// create-user.dto.ts
import { QModel, Quick } from '@cartago-git/quickmodel';

interface ICreateUserBody {
	name: string;
	email: string;
	birthDate: string;
	age: number;
}

@Quick({ birthDate: Date })
export class CreateUserDto extends QModel<ICreateUserBody> {
	declare name: string;
	declare email: string;
	declare birthDate: Date; // automatically converted from ISO string
	declare age: number;
}
```

In your controller:

```typescript
// users.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Controller('users')
export class UsersController {
	@Post()
	create(@Body() body: CreateUserDto) {
		// body.birthDate is already a Date object — no manual parsing needed
		const user = new CreateUserDto(body);
		return user.serialize();
	}
}
```

## Validation with @QRule

Replace `class-validator` with `@QRule` for business-rule validation. `@QRule` predicates run synchronously or asynchronously:

```typescript
// create-user.dto.ts
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

@Quick({ birthDate: Date })
export class CreateUserDto extends QModel<ICreateUserBody> {
	@QRule((v) => typeof v === 'string' && v.length > 0, 'Name is required')
	@QRule((v) => (v as string).length <= 100, 'Name too long')
	declare name: string;

	@QRule(
		(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v as string),
		'Invalid email format'
	)
	declare email: string;

	declare birthDate: Date;
	declare age: number;
}
```

Validate in a NestJS pipe or service:

```typescript
// users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
	async create(data: object): Promise<object> {
		const dto = new CreateUserDto(data);

		const result = dto.checkRules();
		if (!result.valid) {
			throw new BadRequestException(result.errors);
		}

		// proceed with clean, coerced model
		return dto.serialize();
	}
}
```

## Custom Validation Pipe

You can wrap QuickModel validation in a standard NestJS `PipeTransform` for automatic injection:

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

		return instance;
	}
}
```

Register it globally in `main.ts`:

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

## Integration with @nestjs/swagger

QuickModel's `getSchema('openapi')` generates an OpenAPI schema compatible with the Swagger decorator:

```typescript
// create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

@Quick({ birthDate: Date })
export class CreateUserDto extends QModel<ICreateUserBody> {
	@ApiProperty({ example: 'Alice Smith' })
	declare name: string;

	@ApiProperty({ example: 'alice@example.com' })
	declare email: string;

	@ApiProperty({ example: '1990-06-15T00:00:00.000Z' })
	declare birthDate: Date;
}
```

Or generate the full schema programmatically:

```typescript
import { CreateUserDto } from './create-user.dto';

// Generates OpenAPI 3.x compatible schema
const schema = CreateUserDto.getSchema('openapi');
console.log(JSON.stringify(schema, null, 2));
// {
//   "type": "object",
//   "properties": {
//     "name": { "type": "string" },
//     "email": { "type": "string" },
//     "birthDate": { "type": "string", "format": "date-time" }
//   }
// }
```

## Using QModel in the Service Layer

QuickModel shines in the service layer for domain model validation and transformation:

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	controllers: [UsersController],
	providers: [UsersService],
})
export class UsersModule {}

// users.service.ts
import { Injectable } from '@nestjs/common';
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: string;
	name: string;
	email: string;
	createdAt: string;
}

@Quick({ createdAt: Date })
class UserModel extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
}

@Injectable()
export class UsersService {
	private users: UserModel[] = [];

	create(data: object): object {
		const user = new UserModel(data);
		this.users.push(user);
		return user.serialize(); // returns JSON-safe plain object
	}

	findAll(): object[] {
		return this.users.map((u) => u.serialize());
	}
}
```

## Computed Fields in API Responses

Use `@QComputed()` to include derived data in the serialized response without modifying the stored model:

```typescript
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick({ firstName: String, lastName: String, birthYear: Number })
export class UserResponseDto extends QModel<IUserResponse> {
	declare firstName: string;
	declare lastName: string;
	declare birthYear: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		return new Date().getFullYear() - this.birthYear;
	}
}

// In controller:
// user.serialize() → { firstName, lastName, birthYear, fullName, age }
```

## Pattern Summary

| Concern          | NestJS (class-validator)      | QuickModel                       |
| ---------------- | ----------------------------- | -------------------------------- |
| Type coercion    | Manual / class-transformer    | Automatic via `@Quick`           |
| Field validation | `@IsEmail()`, `@IsNotEmpty()` | `@QRule(predicate, message)`     |
| Nested models    | `@Type(() => NestedDto)`      | `@Quick({ field: NestedModel })` |
| Serialization    | `plainToInstance()`           | `.serialize()` / `.toJSON()`     |
| Schema export    | Manual swagger decorators     | `.getSchema('openapi')`          |
| Computed fields  | Not built-in                  | `@QComputed()`                   |

## Next Steps

- [Validation (@QRule)](./validation) — full predicate API
- [Computed Fields (@QComputed)](./serialization#computed-fields-qcomputed) — derived data in responses
- [Serialization](./serialization) — serialize / toJSON / toPlain options
- [Schema Generation](./qmodel#getschema) — multi-format schema export
