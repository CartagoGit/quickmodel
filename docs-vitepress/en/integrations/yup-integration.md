# Yup Integration

QuickModel and Yup are complementary tools. Yup focuses on **schema declaration and object validation** with a chainable API, while QuickModel handles **type coercion, transformation, and serialization** via decorators. Use them together in the same pipeline, or export QuickModel schemas to Yup format for interoperability.

## Core concept: Yup output → QModel instance

After Yup validates a plain object, pass the result directly to the QModel constructor:

```typescript
import * as yup from 'yup';
import { QModel, Quick } from 'quickmodel';

// 1. Yup schema for runtime validation
const UserYupSchema = yup.object({
	name: yup.string().required(),
	birth: yup.string().required(), // ISO string from network
	score: yup.string().required(), // may arrive as string from a form
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

// 3. Validate with Yup, then coerce with QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const validated = await UserYupSchema.$qValidate(rawData); // throws if invalid
const user = new User(validated); // coerces types

console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

`rawData` is any plain JavaScript object — from `req.body`, `JSON.parse()`, a database record, a form submission, or the result of any Yup `.validate()` call.

## Exporting a QModel schema in Yup format

Use `getSchema('yup')` to get the Yup schema code for a QModel class. Useful for sharing domain model definitions with services that use Yup natively:

```typescript
import 'quickmodel/schema'; // register schema generators first

const yupCode = User.getSchema('yup');
// → string with Yup schema source:
// import * as yup from 'yup';
// export const UserSchema = yup.object({ name: yup.string().required(), ... });

// Save to disk and import in Yup-native code:
// fs.writeFileSync('src/schemas/user.schema.ts', yupCode);
```

The generated code is a **source string**, not a live Yup schema object. It is meant for scaffolding and interoperability.

## Pattern: API layer

```typescript
try {
	const validated = await UserYupSchema.$qValidate(req.body, {
		abortEarly: false,
	});
	const user = new User(validated);
	return res.json(user.$qSerialize());
} catch (err) {
	if (err instanceof yup.ValidationError) {
		return res.status(400).json({ errors: err.errors });
	}
	throw err;
}
```

## Pattern: React Hook Form + Yup resolver

When migrating from `yupResolver` to QuickModel as the validation layer:

```typescript
// Before (Yup-only)
const { register } = useForm({ resolver: yupResolver(UserYupSchema) });

// After (QuickModel validation, QModel coercion on submit)
const { register, handleSubmit } = useForm();
const onSubmit = (data: unknown) => {
	const user = new User(data as Record<string, unknown>);
	// user.birth is already a Date, user.score is already a number
};
```

## When to use each approach

| Scenario                                  | Tool                                  |
| ----------------------------------------- | ------------------------------------- |
| Validate shape of untrusted input         | Yup `.validate()` / `.validateSync()` |
| Coerce strings→Date, strings→number, etc. | `new User(data)` with `@Quick({...})` |
| Serialize a model to plain object / JSON  | `user.$qSerialize()`                  |
| Export a Yup schema from a QModel class   | `User.getSchema('yup')`               |

## Comparison

| Feature                               | Yup     | QuickModel         |
| ------------------------------------- | ------- | ------------------ |
| Runtime validation                    | ✅      | ✅ via `@QRule`    |
| Type coercion (string→Date, etc.)     | Partial | ✅ native          |
| Async validation                      | ✅      | ✅ via `@QRule`    |
| Serialization / round-trip            | ❌      | ✅ `$qSerialize()` |
| Schema export (OpenAPI, JSON Schema…) | ❌      | ✅ `getSchema()`   |
| Class-based models with decorators    | ❌      | ✅                 |

## `fromSchema`: generating a QModel class from a Yup schema

`QModel.fromSchema('yup', ...)` accepts a Yup `yup.object({...})` source string and generates TypeScript source code for a `QModel` class:

```typescript
import 'quickmodel/schema';

const yupSrc = `
import * as yup from 'yup';
export const ProductSchema = yup.object({
  price: yup.number().required(),
  label: yup.string().required(),
  active: yup.boolean().required(),
  createdAt: yup.date().required(),
});
`;

const code = QModel.fromSchema('yup', yupSrc, 'Product');
// → TypeScript source string for class Product extends QModel<IProduct>

// fs.writeFileSync('src/models/product.model.ts', code);
```

::: warning BigInt limitation
Yup represents `bigint` as `yup.string()`, so the round-trip for `BigInt` fields is lossy. Use `fromSchema('prisma', ...)` or `fromSchema('typescript', ...)` if you need exact BigInt mapping.
:::

## Round-trip: QModel → Yup schema → QModel class

```typescript
import 'quickmodel/schema';

const yupSrc = User.getSchema('yup');
const code = QModel.fromSchema('yup', yupSrc, 'User');
// code is valid TypeScript defining class User extends QModel<IUser>
```

## See also

- [Transformers](/en/guide/transformers) — supported coercion types
- [Validation](/en/guide/validation) — `@QRule` for business rules
- [Zod Integration](/en/integrations/zod-integration) — same pattern with Zod
- [Formik Integration](/en/integrations/formik-integration) — using QModel as Formik validator
