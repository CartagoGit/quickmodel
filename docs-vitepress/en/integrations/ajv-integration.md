# AJV Integration

QuickModel and AJV (Another JSON Validator) work well together. AJV validates JSON data against JSON Schema Draft-07 / Draft-2020-12, while QuickModel adds **type coercion, transformation, and serialization** on top. QuickModel can also generate AJV-compatible schemas from your model definitions, and reconstruct a QModel class from an AJV schema.

## Core concept: AJV-validated data → QModel instance

After AJV validates a plain object, pass it directly to the QModel constructor:

```typescript
import Ajv from 'ajv';
import { QModel, Quick } from 'quickmodel';

const ajv = new Ajv();

// 1. AJV schema for runtime validation
const userAjvSchema = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		birth: { type: 'string', format: 'date-time' },
		score: { type: 'string' },
	},
	required: ['name', 'birth', 'score'],
};

const validate = ajv.compile(userAjvSchema);

// 2. QModel class for coercion + serialization
interface IUser {
	name: string;
	birth: Date;
	score: number;
}

@Quick({ birth: Date, score: Number })
class User extends QModel<IUser> {
	declare name: string;
	declare birth: Date;
	declare score: number;
}

// 3. Validate with AJV, then coerce with QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

if (!validate(rawData)) {
	throw new Error(ajv.errorsText(validate.errors));
}

const user = new User(rawData); // coerces types
console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

## Exporting an AJV-compatible schema from QModel

Use `getSchema('ajv')` to get a JSON Schema object compatible with AJV from any QModel class:

```typescript
import 'quickmodel/schema'; // register schema generators first

const ajvSchema = User.getSchema('ajv');
// → plain object: { type: 'object', properties: { ... }, required: [...] }

const validate = ajv.compile(ajvSchema);
const isValid = validate(rawData);
```

The returned value is a plain `Record<string, unknown>` — a live object you can pass directly to `ajv.compile()`.

## `fromSchema`: generating a QModel class from an AJV schema

`fromSchema('ajv', ...)` accepts an AJV JSON Schema object and generates TypeScript source code for a `QModel` class:

```typescript
import 'quickmodel/schema';

const existingSchema = {
	type: 'object',
	title: 'Product',
	properties: {
		name: { type: 'string' },
		price: { type: 'number' },
		stock: { type: 'integer' },
	},
	required: ['name', 'price'],
};

const code = QModel.fromSchema('ajv', existingSchema, 'Product');
// → TypeScript source string for class Product extends QModel<IProduct>

// fs.writeFileSync('src/models/product.model.ts', code);
```

This is **scaffolding** — the output is a code string to save as a `.ts` file, not a live class.

## Round-trip: QModel → AJV schema → QModel class

```typescript
import 'quickmodel/schema';

// Export from existing model
const ajvSchema = User.getSchema('ajv');

// Regenerate class definition from the schema
const code = QModel.fromSchema('ajv', ajvSchema, 'User');
// code is valid TypeScript defining class User extends QModel<IUser>
```

## When to use each approach

| Scenario                                   | Tool                                            |
| ------------------------------------------ | ----------------------------------------------- |
| Validate shape of untrusted input          | `ajv.compile(schema)(data)`                     |
| Coerce strings→Date, strings→number, etc.  | `new User(data)` with `@Quick({...})`           |
| Serialize a model to plain object / JSON   | `user.$qSerialize()`                            |
| Generate an AJV schema from a QModel class | `User.getSchema('ajv')`                         |
| Generate a QModel class from an AJV schema | `QModel.fromSchema('ajv', schema, 'ClassName')` |

## Comparison

| Feature                            | AJV | QuickModel                  |
| ---------------------------------- | --- | --------------------------- |
| JSON Schema validation             | ✅  | Via `getSchema('ajv')`      |
| Type coercion (string→Date, etc.)  | ❌  | ✅ native                   |
| OpenAPI / JSON Schema export       | ❌  | ✅ `getSchema()`            |
| Serialization / round-trip         | ❌  | ✅ `$qSerialize()`          |
| Class-based models with decorators | ❌  | ✅                          |
| `fromSchema` scaffolding           | ❌  | ✅ `fromSchema('ajv', ...)` |

## See also

- [Transformers](/en/guide/transformers) — supported coercion types
- [Validation](/en/guide/validation) — `@QRule` for business rules
- [Schema Generation](/en/guide/schema-generation) — all `getSchema()` formats
- [Zod Integration](/en/integrations/zod-integration) — same bridge pattern
