# Valibot Integration

QuickModel and Valibot are complementary tools. Valibot focuses on **lightweight runtime schema validation**, while QuickModel handles **type coercion, transformation, and serialization**. Use them together in the same pipeline or export QuickModel schemas to Valibot format for interoperability.

## Core concept: Valibot output → QModel instance

After Valibot parses and validates a plain object, pass the result directly to the QModel constructor:

```typescript
import * as v from 'valibot';
import { QModel, Quick } from 'quickmodel';

// 1. Valibot schema for runtime validation
const UserValibotSchema = v.object({
	name: v.string(),
	birth: v.string(), // ISO string from network
	score: v.string(), // may arrive as string from a form
});

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

// 3. Validate with Valibot, then coerce with QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const validated = v.parse(UserValibotSchema, rawData); // throws if invalid
const user = new User(validated); // coerces types

console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

`rawData` is any plain JavaScript object — from `req.body`, `JSON.parse()`, a database record, a form submission, or the output of any Valibot parse call.

## Exporting a QModel schema in Valibot format

Use `getSchema('valibot')` to get the Valibot schema code for a QModel class. This is useful for sharing the schema definition with other parts of the codebase that use Valibot natively:

```typescript
import 'quickmodel/schema'; // register schema generators first

const valibotCode = User.getSchema('valibot');
// → string with Valibot schema source:
// import * as v from 'valibot';
// export const UserSchema = v.object({ name: v.string(), birth: v.string(), score: v.number() });

// Save to disk and import in Valibot-native code:
// fs.writeFileSync('src/schemas/user.schema.ts', valibotCode);
```

The generated code is a **source string**, not a live Valibot schema object. It is meant for scaffolding and interoperability, not direct runtime use.

## Pattern: API layer

```typescript
const result = v.safeParse(UserValibotSchema, req.body);
if (!result.success) {
	return res.status(400).json(result.issues);
}

const user = new User(result.output);
return res.json(user.$qSerialize());
```

## Pattern: form data

Form inputs arrive as strings — Valibot validates the shape, QModel coerces the types:

```typescript
const FormSchema = v.object({
	age: v.pipe(v.string(), v.regex(/^\d+$/)),
	createdAt: v.pipe(v.string(), v.isoTimestamp()),
});

@Quick({ age: Number, createdAt: Date })
class Profile extends QModel<{ age: number; createdAt: Date }> {
	declare age: number;
	declare createdAt: Date;
}

const profile = new Profile(v.parse(FormSchema, formData));
```

## When to use each approach

| Scenario                                    | Tool                                  |
| ------------------------------------------- | ------------------------------------- |
| Validate shape of untrusted input           | Valibot `v.parse()` / `v.safeParse()` |
| Coerce strings→Date, strings→number, etc.   | `new User(data)` with `@Quick({...})` |
| Serialize a model to plain object / JSON    | `user.$qSerialize()`                  |
| Export a Valibot schema from a QModel class | `User.getSchema('valibot')`           |

## Comparison

| Feature                               | Valibot       | QuickModel         |
| ------------------------------------- | ------------- | ------------------ |
| Runtime validation                    | ✅            | ✅ via `@QRule`    |
| Bundle size (tree-shakeable)          | ✅ very small | ✅                 |
| Type coercion (string→Date, etc.)     | Partial       | ✅ native          |
| Serialization / round-trip            | ❌            | ✅ `$qSerialize()` |
| Schema export (OpenAPI, JSON Schema…) | ❌            | ✅ `getSchema()`   |
| Class-based models with decorators    | ❌            | ✅                 |

## See also

- [Transformers](/en/guide/transformers) — supported coercion types
- [Validation](/en/guide/validation) — `@QRule` for business rules
- [Zod Integration](/en/integrations/zod-integration) — same pattern with Zod
- [Schema Generation](/en/guide/schema-generation) — `getSchema()` formats
