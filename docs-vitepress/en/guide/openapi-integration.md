# OpenAPI / Swagger Integration

QuickModel exposes a built-in `getSchema()` method that generates standards-compliant schema objects for OpenAPI 3.0, JSON Schema Draft-07, and AJV. No extra packages are required — the schema is derived directly from your model's decorator metadata.

## Schema formats

| Format      | Use case                                                       |
| ----------- | -------------------------------------------------------------- |
| `'openapi'` | OpenAPI 3.0 Schema Object (`type`, `properties`, `required`)   |
| `'json'`    | JSON Schema Draft-07 (adds `$schema`, `title`)                 |
| `'ajv'`     | AJV-compatible variant (same as JSON Schema without `$schema`) |

## Basic usage

```typescript
import { QModel, Quick, QField } from '@cartago-git/quickmodel';

interface ICreateUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ label: 'Full Name', required: true })
	declare name: string;

	@QField({ label: 'Email', required: true })
	declare email: string;

	@QField({ label: 'Age' })
	declare age: number;

	@QField({ label: 'Role', required: true })
	declare role: string;
}

// OpenAPI 3.0 schema
const openapiSchema = CreateUserDto.getSchema('openapi');
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string' },
//     email: { type: 'string' },
//     age: { type: 'number' },
//     role: { type: 'string' }
//   },
//   required: [ ... ]
// }

// JSON Schema Draft-07
const jsonSchema = CreateUserDto.getSchema('json');
// {
//   $schema: 'http://json-schema.org/draft-07/schema#',
//   title: 'CreateUserDto',
//   type: 'object',
//   properties: { ... },
//   required: [ ... ]
// }
```

## Type mappings

| QuickModel type        | OpenAPI / JSON Schema output                           |
| ---------------------- | ------------------------------------------------------ |
| `'string'`             | `{ type: 'string' }`                                   |
| `'number'`             | `{ type: 'number' }`                                   |
| `'boolean'`            | `{ type: 'boolean' }`                                  |
| `Date`                 | `{ type: 'string', format: 'date-time' }`              |
| `Number` (constructor) | `{ type: 'number', format: 'double' }`                 |
| `Array`                | `{ type: 'array', items: { ... } }`                    |
| `Set`                  | `{ type: 'array', items: { ... }, uniqueItems: true }` |

## NestJS Swagger

Use `getSchema('openapi')` with `@ApiBody()` or `@ApiProperty()`:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
	@Post()
	@ApiBody({ schema: CreateUserDto.getSchema('openapi') })
	create(@Body() body: unknown) {
		const dto = new CreateUserDto(body);
		// ...
	}
}
```

## Fastify + @fastify/swagger

```typescript
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { CreateUserDto } from './dto/create-user.dto';

const fastify = Fastify();
await fastify.register(swagger, {
	openapi: { info: { title: 'API', version: '1.0' } },
});

fastify.post('/users', {
	schema: {
		body: CreateUserDto.getSchema('json'), // JSON Schema for validation
	},
	async handler(req) {
		const dto = new CreateUserDto(req.body);
		// ...
	},
});
```

## Express + swagger-jsdoc (components/schemas)

```typescript
import swaggerJSDoc from 'swagger-jsdoc';
import { CreateUserDto, OrderDto } from './dto';

const swaggerSpec = {
	openapi: '3.0.0',
	info: { title: 'My API', version: '1.0.0' },
	components: {
		schemas: {
			CreateUserDto: CreateUserDto.getSchema('json'),
			OrderDto: OrderDto.getSchema('json'),
		},
	},
	paths: {
		'/users': {
			post: {
				requestBody: {
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/CreateUserDto',
							},
						},
					},
				},
			},
		},
	},
};
```

## Hono + zod-openapi compatibility

```typescript
import { Hono } from 'hono';
import { validator } from 'hono/validator';
import Ajv from 'ajv';
import { CreateUserDto } from './dto/create-user.dto';

const ajv = new Ajv();
const validate = ajv.compile(CreateUserDto.getSchema('ajv'));

const app = new Hono();

app.post('/users', async (ctx) => {
	const body = await ctx.req.json();
	if (!validate(body)) {
		return ctx.json({ errors: validate.errors }, 400);
	}
	const dto = new CreateUserDto(body);
	return ctx.json(dto.toInterface());
});
```

## CI / auto-generation

Generate an OpenAPI schema file at build time:

```typescript
// scripts/generate-schemas.ts
import { writeFileSync } from 'fs';
import { CreateUserDto, OrderDto } from '../src/dto';

const schemas = {
	CreateUserDto: CreateUserDto.getSchema('json'),
	OrderDto: OrderDto.getSchema('json'),
};

writeFileSync('openapi-schemas.json', JSON.stringify(schemas, null, 2));
```

```bash
bun run scripts/generate-schemas.ts
```

## Static vs instance method

Both forms return identical schemas:

```typescript
// Static (no instance needed)
const schema1 = CreateUserDto.getSchema('openapi');

// Instance
const dto = new CreateUserDto({
	name: 'Alice',
	email: 'alice@x.com',
	age: 25,
	role: 'user',
});
const schema2 = dto.getSchema('openapi');

// schema1 ≡ schema2
```
