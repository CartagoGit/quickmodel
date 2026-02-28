# Integración con OpenAPI / Swagger

QuickModel expone un método `getSchema()` integrado que genera objetos de esquema compatibles con OpenAPI 3.0, JSON Schema Draft-07 y AJV. No se necesitan paquetes adicionales — el esquema se deriva directamente de los metadatos de los decoradores del modelo.

## Formatos de esquema

| Formato     | Caso de uso                                                       |
| ----------- | ----------------------------------------------------------------- |
| `'openapi'` | OpenAPI 3.0 Schema Object (`type`, `properties`, `required`)      |
| `'json'`    | JSON Schema Draft-07 (añade `$schema`, `title`)                   |
| `'ajv'`     | Variante compatible con AJV (igual que JSON Schema sin `$schema`) |

## Uso básico

```typescript
import { QModel, Quick, QField } from 'quickmodel';

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
	@QField({ label: 'Nombre completo', required: true })
	declare name: string;

	@QField({ label: 'Email', required: true })
	declare email: string;

	@QField({ label: 'Edad' })
	declare age: number;

	@QField({ label: 'Rol', required: true })
	declare role: string;
}

// Esquema OpenAPI 3.0
const openapiSchema = CreateUserDto.getSchema('openapi');
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string' },
//     ...
//   },
//   required: [ ... ]
// }

// JSON Schema Draft-07
const jsonSchema = CreateUserDto.getSchema('json');
// {
//   $schema: 'http://json-schema.org/draft-07/schema#',
//   title: 'CreateUserDto',
//   type: 'object',
//   ...
// }
```

## Mapeo de tipos

| Tipo en QuickModel     | Salida OpenAPI / JSON Schema                           |
| ---------------------- | ------------------------------------------------------ |
| `'string'`             | `{ type: 'string' }`                                   |
| `'number'`             | `{ type: 'number' }`                                   |
| `'boolean'`            | `{ type: 'boolean' }`                                  |
| `Date`                 | `{ type: 'string', format: 'date-time' }`              |
| `Number` (constructor) | `{ type: 'number', format: 'double' }`                 |
| `Array`                | `{ type: 'array', items: { ... } }`                    |
| `Set`                  | `{ type: 'array', items: { ... }, uniqueItems: true }` |

## NestJS Swagger

Usa `getSchema('openapi')` con `@ApiBody()`:

```typescript
import { Controller, Post } from '@nestjs/common';
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
		body: CreateUserDto.getSchema('json'), // JSON Schema para validación en ruta
	},
	async handler(req) {
		const dto = new CreateUserDto(req.body);
		// ...
	},
});
```

## Express + swagger-jsdoc (components/schemas)

```typescript
import { CreateUserDto, OrderDto } from './dto';

const swaggerSpec = {
	openapi: '3.0.0',
	info: { title: 'Mi API', version: '1.0.0' },
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

## Hono + compatibilidad zod-openapi

```typescript
import { Hono } from 'hono';
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

## Generación automática en CI

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

## Método estático vs instancia

Ambas formas devuelven esquemas idénticos:

```typescript
// Estático (sin instanciar)
const schema1 = CreateUserDto.getSchema('openapi');

// Desde instancia
const dto = new CreateUserDto({
	name: 'Alice',
	email: 'alice@x.com',
	age: 25,
	role: 'user',
});
const schema2 = dto.getSchema('openapi');

// schema1 ≡ schema2
```
