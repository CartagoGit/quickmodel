# JSON Schema Integration

QuickModel can export any model as a **JSON Schema Draft-07** object, and can reconstruct a `QModel` class from an existing JSON Schema. This enables interoperability with any tool that consumes JSON Schema: form generators, API validators, documentation generators, OpenAPI tooling, and more.

## Exporting a JSON Schema from a QModel class

Import `quickmodel/schema` once to register the generators, then call `getSchema('json')` on any model class:

```typescript
import 'quickmodel/schema';
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	birth: Date;
	score: number;
	active: boolean;
}

@Quick({ birth: Date, score: Number, active: Boolean })
class User extends QModel<IUser> {
	declare name: string;
	declare birth: Date;
	declare score: number;
	declare active: boolean;
}

const schema = User.getSchema('json');
/*
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "User",
  "properties": {
    "name":   { "type": "string" },
    "birth":  { "type": "string", "format": "date-time" },
    "score":  { "type": "number" },
    "active": { "type": "boolean" }
  },
  "required": ["name", "birth", "score", "active"]
}
*/
```

The returned value is a plain `Record<string, unknown>` — a live object ready to use directly in any JSON Schema-compatible API.

## `fromSchema`: generating a QModel class from a JSON Schema

`fromSchema('json', ...)` accepts a JSON Schema object and generates TypeScript source code for a `QModel` class:

```typescript
import 'quickmodel/schema';

const existingSchema = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	type: 'object',
	title: 'Product',
	properties: {
		name: { type: 'string' },
		price: { type: 'number' },
		inStock: { type: 'boolean' },
		tags: { type: 'array', items: { type: 'string' } },
	},
	required: ['name', 'price'],
};

const code = QModel.fromSchema('json', existingSchema, 'Product');
// → TypeScript source string for class Product extends QModel<IProduct>

// Save to disk and import:
// fs.writeFileSync('src/models/product.model.ts', code);
```

This is **scaffolding** — the output is code to save as a `.ts` file. Once saved, import and instantiate normally.

## Round-trip: QModel → JSON Schema → QModel class

```typescript
import 'quickmodel/schema';

const jsonSchema = User.getSchema('json'); // export
const code = QModel.fromSchema('json', jsonSchema, 'User'); // regenerate class
// code is valid TypeScript defining class User extends QModel<IUser>
```

## Use cases

### AJV validation

`getSchema('json')` and `getSchema('ajv')` return structurally identical objects — both work with AJV:

```typescript
import Ajv from 'ajv';
import 'quickmodel/schema';

const ajv = new Ajv();
const validate = ajv.compile(User.getSchema('json'));

const isValid = validate(req.body);
if (!isValid) console.error(ajv.errorsText(validate.errors));
```

### Fastify / Hono schema validation

```typescript
// Fastify
fastify.post(
	'/users',
	{
		schema: { body: User.getSchema('json') },
	},
	async (req) => {
		const user = new User(req.body);
		return user.$qSerialize();
	}
);
```

### JSON Schema in OpenAPI documents

```typescript
import 'quickmodel/schema';

const openApiDoc = {
	components: {
		schemas: {
			User: User.getSchema('json'),
			Order: Order.getSchema('json'),
		},
	},
};
```

### Form generation (react-jsonschema-form, etc.)

```typescript
import Form from '@rjsf/core';
import 'quickmodel/schema';

const jsonSchema = User.getSchema('json');

// Use directly with react-jsonschema-form
<Form schema={jsonSchema} onSubmit={({ formData }) => {
  const user = new User(formData);
  // types coerced by QModel
}} />
```

## All 13 schema formats

`getSchema()` supports 13 formats — JSON Schema is the most portable:

| Format            | Use case                                 |
| ----------------- | ---------------------------------------- |
| `'json'`          | JSON Schema Draft-07 — universal         |
| `'openapi'`       | OpenAPI 3.0 component schemas            |
| `'ajv'`           | AJV validator (same structure as `json`) |
| `'typescript'`    | TypeScript interface source string       |
| `'graphql'`       | GraphQL SDL type string                  |
| `'prisma'`        | Prisma model block string                |
| `'mongo'`         | Mongoose schema definition               |
| `'zod'`           | Zod schema source string                 |
| `'valibot'`       | Valibot schema source string             |
| `'yup'`           | Yup schema source string                 |
| `'drizzle'`       | Drizzle ORM table definition string      |
| `'typebox'`       | TypeBox schema source string             |
| `'effect-schema'` | Effect Schema source string              |

## See also

- [OpenAPI Integration](/en/integrations/openapi-integration) — OpenAPI 3.0 schema generation
- [AJV Integration](/en/integrations/ajv-integration) — JSON Schema validation with AJV
- [Schema Generation](/en/guide/schema-generation) — complete `getSchema()` reference
- [Transformers](/en/guide/transformers) — how types map to JSON Schema properties
