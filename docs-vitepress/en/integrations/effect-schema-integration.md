# Effect Schema Integration

QuickModel and Effect Schema (`@effect/schema`) are complementary tools. Effect Schema provides **declarative schemas with first-class Effect integration**, parsing, encoding, and transformation. QuickModel adds **decorator-based coercion, serialization, and business rule validation** on top. Use both together in Effect-based backends, or export QuickModel schemas to Effect Schema format for interoperability.

## Core concept: Effect Schema output → QModel instance

After Effect Schema decodes a value, pass the result to the QModel constructor:

```typescript
import { Schema, ParseResult } from '@effect/schema';
import { Effect } from 'effect';
import { QModel, Quick } from 'quickmodel';

// 1. Effect Schema for parsing / decoding
const UserEffectSchema = Schema.Struct({
	name: Schema.String,
	birth: Schema.String, // ISO string from network
	score: Schema.String, // may arrive as string from a form
});

type IUserRaw = Schema.Schema.Type<typeof UserEffectSchema>;

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

// 3. Decode with Effect Schema, then coerce with QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const program = Effect.gen(function* () {
	const validated = yield* Schema.decode(UserEffectSchema)(rawData);
	const user = new User(validated); // coerces types
	return user;
});

// user.birth is a Date, user.score is a number
```

For non-Effect contexts, use the synchronous decode:

```typescript
import { Schema } from '@effect/schema';

const validated = Schema.decodeSync(UserEffectSchema)(rawData);
const user = new User(validated);
```

## Exporting a QModel schema in Effect Schema format

Use `getSchema('effect-schema')` to get the Effect Schema code for any QModel class:

```typescript
import 'quickmodel/schema'; // register schema generators first

const effectCode = User.getSchema('effect-schema');
// → string with Effect Schema source:
// import { Schema } from '@effect/schema';
// export const UserSchema = Schema.Struct({ name: Schema.String, birth: Schema.String, ... });

// Save to disk and import in Effect-native code:
// fs.writeFileSync('src/schemas/user.schema.ts', effectCode);
```

The generated code is a **source string**, not a live schema object. It is meant for scaffolding and interoperability.

## Pattern: Effect pipeline with QModel

QModel's `$qSerialize()` integrates cleanly into Effect pipelines:

```typescript
const processUser = (raw: unknown) =>
	Effect.gen(function* () {
		const validated = yield* Schema.decode(UserEffectSchema)(raw);
		const user = new User(validated);

		// Apply business logic using QModel rules
		const isValid = yield* Effect.promise(() => user.$qCheckRules());
		if (!isValid.passed) {
			yield* Effect.fail(new Error(isValid.errors.join(', ')));
		}

		return user.$qSerialize();
	});
```

## When to use each approach

| Scenario                                    | Tool                                  |
| ------------------------------------------- | ------------------------------------- |
| Declarative parsing / encoding with Effect  | `Schema.decode()` / `Schema.encode()` |
| Coerce strings→Date, strings→number, etc.   | `new User(data)` with `@Quick({...})` |
| Business rule validation                    | `user.$qCheckRules()`                 |
| Serialize a model to plain object / JSON    | `user.$qSerialize()`                  |
| Export an Effect Schema from a QModel class | `User.getSchema('effect-schema')`     |

## Comparison

| Feature                            | Effect Schema   | QuickModel               |
| ---------------------------------- | --------------- | ------------------------ |
| Declarative parsing + encoding     | ✅              | Via `@Quick({...})`      |
| Effect-native integration          | ✅              | Can be wrapped in Effect |
| Type coercion (string→Date, etc.)  | ✅              | ✅ native                |
| Business rule validation           | Via refinements | ✅ `@QRule`              |
| Serialization / round-trip         | Via encoding    | ✅ `$qSerialize()`       |
| OpenAPI / JSON Schema export       | ❌              | ✅ `getSchema()`         |
| Class-based models with decorators | ❌              | ✅                       |

## `fromSchema`: generating a QModel class from an Effect Schema

`QModel.fromSchema('effect-schema', ...)` accepts an Effect `Schema.Struct({...})` source string and generates TypeScript source code for a `QModel` class:

```typescript
import 'quickmodel/schema';

const effectSrc = `
import * as Schema from 'effect/schema';
const ReportSchema = Schema.Struct({
  score: Schema.Number,
  title: Schema.String,
  passed: Schema.Boolean,
  date: Schema.Date,
  amount: Schema.BigIntFromSelf,
});
`;

const code = QModel.fromSchema('effect-schema', effectSrc, 'Report');
// → TypeScript source string for class Report extends QModel<IReport>

// fs.writeFileSync('src/models/report.model.ts', code);
```

`Schema.BigIntFromSelf` is mapped to the `BigInt` transformer.

## Round-trip: QModel → Effect Schema → QModel class

```typescript
import 'quickmodel/schema';

const effectSrc = User.getSchema('effect-schema');
const code = QModel.fromSchema('effect-schema', effectSrc, 'User');
// code is valid TypeScript defining class User extends QModel<IUser>
```

## See also

- [Transformers](/en/guide/transformers) — supported coercion types
- [Validation](/en/guide/validation) — `@QRule` for business rules
- [Schema Generation](/en/guide/schema-generation) — all `getSchema()` formats
- [Zod Integration](/en/integrations/zod-integration) — same bridge pattern
