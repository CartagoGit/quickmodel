# TypeBox Integration

QuickModel and TypeBox are complementary tools. TypeBox builds **JSON Schema-compatible type objects** at zero runtime cost, providing static TypeScript types and runtime validation from the same definition. QuickModel adds **type coercion, transformation, and serialization** on top via decorators. Use both together, or export QuickModel schemas to TypeBox format for interoperability.

## Core concept: TypeBox-validated data → QModel instance

After TypeBox validates a plain object, pass it directly to the QModel constructor:

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { QModel, Quick } from 'quickmodel';

// 1. TypeBox schema for static types + runtime validation
const UserTypeBox = Type.Object({
	name: Type.String(),
	birth: Type.String({ format: 'date-time' }),
	score: Type.String(),
});

type IUserRaw = Static<typeof UserTypeBox>;

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

// 3. Validate with TypeBox, then coerce with QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

if (!Value.Check(UserTypeBox, rawData)) {
	throw new Error(
		[...Value.Errors(UserTypeBox, rawData)].map((e) => e.message).join(', ')
	);
}

const user = new User(rawData); // coerces types
console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

`rawData` is any plain JavaScript object — from `req.body`, `JSON.parse()`, a database record, a form submission, or the result of any TypeBox check.

## Exporting a QModel schema in TypeBox format

Use `getSchema('typebox')` to get the TypeBox schema code for any QModel class:

```typescript
import 'quickmodel/schema'; // register schema generators first

const typeboxCode = User.getSchema('typebox');
// → string with TypeBox schema source:
// import { Type } from '@sinclair/typebox';
// export const UserSchema = Type.Object({ name: Type.String(), birth: Type.String(), ... });

// Save to disk and import in TypeBox-native code:
// fs.writeFileSync('src/schemas/user.schema.ts', typeboxCode);
```

The generated code is a **source string**, not a live TypeBox schema. It is meant for scaffolding and interoperability.

## Pattern: tRPC + TypeBox

TypeBox is popular as an alternative to Zod in tRPC stacks. QModel handles the coercion layer:

```typescript
import { initTRPC } from '@trpc/server';
import { Value } from '@sinclair/typebox/value';

const t = initTRPC.create();

const createUser = t.procedure
	.input((raw) => {
		if (!Value.Check(UserTypeBox, raw)) throw new Error('Invalid input');
		return raw as Static<typeof UserTypeBox>;
	})
	.mutation(({ input }) => {
		const user = new User(input); // full coercion
		return user.$qSerialize();
	});
```

## When to use each approach

| Scenario                                    | Tool                                  |
| ------------------------------------------- | ------------------------------------- |
| Static types + runtime validation           | TypeBox `Value.Check()`               |
| Coerce strings→Date, strings→number, etc.   | `new User(data)` with `@Quick({...})` |
| Serialize a model to plain object / JSON    | `user.$qSerialize()`                  |
| Export a TypeBox schema from a QModel class | `User.getSchema('typebox')`           |

## Comparison

| Feature                             | TypeBox      | QuickModel         |
| ----------------------------------- | ------------ | ------------------ |
| Static TypeScript types from schema | ✅           | ✅ via interfaces  |
| Runtime validation                  | ✅           | ✅ via `@QRule`    |
| Type coercion (string→Date, etc.)   | Partial      | ✅ native          |
| Serialization / round-trip          | ❌           | ✅ `$qSerialize()` |
| OpenAPI / JSON Schema export        | Via `Type.*` | ✅ `getSchema()`   |
| Class-based models with decorators  | ❌           | ✅                 |

## `fromSchema`: generating a QModel class from a TypeBox schema

`QModel.fromSchema('typebox', ...)` accepts a TypeBox `Type.Object({...})` source string and generates TypeScript source code for a `QModel` class:

```typescript
import 'quickmodel/schema';

const typeboxSrc = `
import { Type, Static } from '@sinclair/typebox';
const ProductSchema = Type.Object({
  price: Type.Number(),
  label: Type.String(),
  active: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  amount: Type.BigInt(),
});
`;

const code = QModel.fromSchema('typebox', typeboxSrc, 'Product');
// → TypeScript source string for class Product extends QModel<IProduct>

// fs.writeFileSync('src/models/product.model.ts', code);
```

`Type.String({ format: 'date-time' })` is converted to the `Date` transformer, and `Type.BigInt()` to `BigInt`.

## Round-trip: QModel → TypeBox schema → QModel class

```typescript
import 'quickmodel/schema';

const typeboxSrc = User.getSchema('typebox');
const code = QModel.fromSchema('typebox', typeboxSrc, 'User');
// code is valid TypeScript defining class User extends QModel<IUser>
```

## See also

- [Transformers](/en/guide/transformers) — supported coercion types
- [Validation](/en/guide/validation) — `@QRule` for business rules
- [Zod Integration](/en/integrations/zod-integration) — same bridge pattern
- [tRPC Integration](/en/integrations/trpc-integration) — end-to-end typed stack
