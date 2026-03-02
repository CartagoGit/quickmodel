# Integración con JSON Schema

QuickModel puede exportar cualquier modelo como un objeto **JSON Schema Draft-07**, y puede reconstruir una clase `QModel` desde un JSON Schema existente. Esto permite interoperabilidad con cualquier herramienta que consuma JSON Schema: generadores de formularios, validadores de API, generadores de documentación, herramientas OpenAPI, y más.

## Exportar un JSON Schema desde una clase QModel

Importa `quickmodel/schema` una vez para registrar los generadores, luego llama a `getSchema('json')` en cualquier clase modelo:

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

El valor retornado es un `Record<string, unknown>` plano — un objeto vivo listo para usar directamente en cualquier API compatible con JSON Schema.

## `fromSchema`: generar una clase QModel desde un JSON Schema

`fromSchema('json', ...)` acepta un objeto JSON Schema y genera código fuente TypeScript para una clase `QModel`:

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
// → string de código TypeScript para class Product extends QModel<IProduct>

// Guardar en disco e importar:
// fs.writeFileSync('src/models/product.model.ts', code);
```

Esto es **scaffolding** — el resultado es código para guardar como archivo `.ts`. Una vez guardado, se importa e instancia normalmente.

## Round-trip: QModel → JSON Schema → clase QModel

```typescript
import 'quickmodel/schema';

const jsonSchema = User.getSchema('json'); // exportar
const code = QModel.fromSchema('json', jsonSchema, 'User'); // regenerar clase
// code es TypeScript válido que define class User extends QModel<IUser>
```

## Casos de uso

### Validación con AJV

`getSchema('json')` y `getSchema('ajv')` devuelven objetos estructuralmente idénticos — ambos funcionan con AJV:

```typescript
import Ajv from 'ajv';
import 'quickmodel/schema';

const ajv = new Ajv();
const validate = ajv.compile(User.getSchema('json'));

const isValid = validate(req.body);
if (!isValid) console.error(ajv.errorsText(validate.errors));
```

### Validación de schema en Fastify / Hono

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

### JSON Schema en documentos OpenAPI

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

### Generación de formularios (react-jsonschema-form, etc.)

```typescript
import Form from '@rjsf/core';
import 'quickmodel/schema';

const jsonSchema = User.getSchema('json');

<Form schema={jsonSchema} onSubmit={({ formData }) => {
  const user = new User(formData);
  // tipos coercionados por QModel
}} />
```

## Los 13 formatos de schema

`getSchema()` soporta 13 formatos — JSON Schema es el más portable:

| Formato           | Caso de uso                                 |
| ----------------- | ------------------------------------------- |
| `'json'`          | JSON Schema Draft-07 — universal            |
| `'openapi'`       | Schemas de componentes OpenAPI 3.0          |
| `'ajv'`           | Validador AJV (misma estructura que `json`) |
| `'typescript'`    | String de interfaz TypeScript               |
| `'graphql'`       | String de tipo GraphQL SDL                  |
| `'prisma'`        | String de bloque modelo Prisma              |
| `'mongo'`         | Definición de schema Mongoose               |
| `'zod'`           | String de schema Zod                        |
| `'valibot'`       | String de schema Valibot                    |
| `'yup'`           | String de schema Yup                        |
| `'drizzle'`       | String de definición de tabla Drizzle       |
| `'typebox'`       | String de schema TypeBox                    |
| `'effect-schema'` | String de Effect Schema                     |

## Ver también

- [Integración con OpenAPI](/es/integrations/openapi-integration) — generación de schema OpenAPI 3.0
- [Integración con AJV](/es/integrations/ajv-integration) — validación JSON Schema con AJV
- [Generación de Schema](/es/guide/schema-generation) — referencia completa de `getSchema()`
- [Transformadores](/es/guide/transformers) — cómo los tipos se mapean a propiedades JSON Schema
