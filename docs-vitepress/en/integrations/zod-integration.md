# Zod Integration

QuickModel and Zod serve complementary purposes: Zod excels at **runtime validation and schema declaration**, while QuickModel handles **type coercion, transformation, and serialization** via decorators. You can use both together, or migrate from Zod to QuickModel progressively.

## Core concept: Zod output → QModel instance

`rawData` in the context below means **any plain JavaScript object** — it could come from:

- an HTTP request body (`req.body`)
- a JSON response parsed with `JSON.parse()`
- a database record
- a form submission
- or the output of `ZodSchema.parse()`

Once you have that plain object, you pass it directly to the `QModel` constructor:

```typescript
import { z } from 'zod';
import { QModel, Quick } from 'quickmodel';

// 1. Zod schema for runtime validation / parsing
const UserZodSchema = z.object({
	name: z.string(),
	birth: z.string(), // ISO string from JSON
	score: z.string(), // might arrive as string from a form
});

// 2. QuickModel class for coercion + serialization
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

// 3. Validate with Zod first, then coerce with QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const validated = UserZodSchema.parse(rawData); // throws if invalid
const user = new User(validated); // coerces types

console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number, not string)
```

`rawData` here is just a plain object. After Zod's `.parse()` it is still a plain object — QuickModel's constructor accepts it and applies the `@Quick({...})` transformations on top.

## Pattern: API layer

A common pattern for backend/frontend boundaries:

```typescript
// Validate the raw input from the network
const parsed = UserZodSchema.safeParse(req.body);
if (!parsed.success) {
	return res.status(400).json(parsed.error.flatten());
}

// Coerce and enrich with QModel
const user = new User(parsed.data);

// Serialize back to plain object for the response
return res.json(user.$qSerialize());
```

## Pattern: form data

Form inputs always arrive as strings. Zod validates shape, QModel coerces types:

```typescript
const FormSchema = z.object({
	age: z.string().regex(/^\d+$/),
	createdAt: z.string().datetime(),
});

interface IProfile {
	age: number;
	createdAt: Date;
}

@Quick({ age: Number, createdAt: Date })
class Profile extends QModel<IProfile> {
	declare age: number;
	declare createdAt: Date;
}

const formData = { age: '25', createdAt: '2024-01-15T00:00:00Z' };

const profile = new Profile(FormSchema.parse(formData));
console.log(profile.age); // 25 (number)
console.log(profile.createdAt); // Date object
```

## `fromSchema`: generating a QModel class from a Zod schema

`QModel.fromSchema` is a **code generation** tool — it produces TypeScript source code as a string. It is not related to creating instances at runtime.

Use it when you have a Zod schema and want to generate the corresponding `QModel` class definition to save as a `.ts` file:

```typescript
import 'quickmodel/schema'; // register schema generators

const code = QModel.fromSchema('zod', UserZodSchema, 'User');
// → TypeScript source string:
// interface IUser { ... }
// @Quick({ ... })
// class User extends QModel<IUser> { ... }

// Save to disk, import, and use:
// fs.writeFileSync('src/models/user.model.ts', code);
```

**This is a scaffolding workflow, not a runtime one.** Once you have the generated `.ts` file, you import and instantiate it normally:

```typescript
import { User } from './src/models/user.model';

const user = new User(rawData);
```

## When to use each approach

| Scenario                                            | Tool                                            |
| --------------------------------------------------- | ----------------------------------------------- |
| Validate shape of untrusted input                   | Zod `.parse()` / `.safeParse()`                 |
| Coerce strings→Date, strings→number, etc.           | `new User(data)` with `@Quick({...})`           |
| Serialize a model to plain object / JSON            | `user.$qSerialize()`                            |
| Generate a QModel class from an existing Zod schema | `QModel.fromSchema('zod', schema, 'ClassName')` |

## Comparison

| Feature                               | Zod     | QuickModel         |
| ------------------------------------- | ------- | ------------------ |
| Runtime validation                    | ✅      | ✅ via `@QRule`    |
| Type coercion (string→Date, etc.)     | Partial | ✅ native          |
| Serialization / round-trip            | ❌      | ✅ `$qSerialize()` |
| Schema export (JSON Schema, OpenAPI…) | ❌      | ✅ `getSchema()`   |
| Class-based models with decorators    | ❌      | ✅                 |

## See also

- [Transformers](/en/guide/transformers) — supported coercion types
- [Validation](/en/guide/validation) — `@QRule` for business rules
- [Schema Generation](/en/guide/schema-generation) — `getSchema()` and `fromSchema()`
- [tRPC Integration](/en/integrations/trpc-integration) — end-to-end typed stack
