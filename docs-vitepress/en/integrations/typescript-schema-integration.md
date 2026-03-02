# TypeScript Interface Integration

QuickModel can export any model as a **TypeScript interface source string**, and can reconstruct a `QModel` class from an existing TypeScript interface or type definition. This is useful for sharing model contracts between packages, generating `.d.ts` stubs, or scaffolding QModel classes from legacy interfaces.

## Exporting a TypeScript interface from a QModel class

Import `quickmodel/schema` once to register the generators, then call `getSchema('typescript')`:

```typescript
import 'quickmodel/schema';
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	birth: Date;
	score: number;
	tags: string[];
}

@Quick({ birth: Date, score: Number, tags: '[String]' })
class User extends QModel<IUser> {
	declare name: string;
	declare birth: Date;
	declare score: number;
	declare tags: string[];
}

const tsInterface = User.getSchema('typescript');
/*
export interface IUser {
  name: string;
  birth: Date;
  score: number;
  tags: string[];
}
*/
```

The returned value is a **string** — TypeScript source code ready to save to a `.ts` or `.d.ts` file.

## `fromSchema`: generating a QModel class from a TypeScript interface

`fromSchema('typescript', ...)` accepts a TypeScript interface string and generates a full `QModel` class definition:

```typescript
import 'quickmodel/schema';

const tsInterface = `
export interface IProduct {
  name: string;
  price: number;
  createdAt: Date;
  inStock: boolean;
  tags: string[];
}
`;

const code = QModel.fromSchema('typescript', tsInterface, 'Product');
// → TypeScript source string:
// interface IProduct { ... }
// @Quick({ price: Number, createdAt: Date, inStock: Boolean, tags: '[String]' })
// class Product extends QModel<IProduct> { ... }

// Save to disk and import:
// fs.writeFileSync('src/models/product.model.ts', code);
```

This is **scaffolding** — the output is code to save as a `.ts` file.

## Use case: contract sharing between packages

In a monorepo, share model contracts without coupling packages to QuickModel:

```typescript
// packages/shared/src/types.ts — generated from QModel
// fs.writeFileSync('packages/shared/src/types.ts', User.getSchema('typescript'));

export interface IUser {
	name: string;
	birth: Date;
	score: number;
}
```

Any package consuming the shared types stays decoupled from QuickModel internals.

## Use case: migrating legacy interfaces to QModel

If you have existing TypeScript interfaces and want to migrate them to QModel:

```typescript
import 'quickmodel/schema';

// Your existing interface (from a legacy codebase or a third-party type definition)
const legacyInterface = `
interface IOrder {
  id: string;
  total: number;
  createdAt: Date;
  items: string[];
}
`;

const code = QModel.fromSchema('typescript', legacyInterface, 'Order');
// Paste code into src/models/order.model.ts and adjust as needed
```

## Use case: generating `.d.ts` declaration files

```typescript
import 'quickmodel/schema';
import fs from 'node:fs';

const models = [User, Order, Product];

for (const Model of models) {
	const interfaceSrc = Model.getSchema('typescript');
	fs.writeFileSync(`dist/types/${Model.name}.d.ts`, interfaceSrc);
}
```

## Round-trip: QModel → TypeScript interface → QModel class

```typescript
import 'quickmodel/schema';

const tsInterface = User.getSchema('typescript'); // export
const code = QModel.fromSchema('typescript', tsInterface, 'User'); // regenerate
// code is valid TypeScript defining class User extends QModel<IUser>
```

## When to use each format

| Need                                         | Format                          |
| -------------------------------------------- | ------------------------------- |
| Share types between packages (no runtime)    | `getSchema('typescript')`       |
| Validate at runtime across tools             | `getSchema('json')`             |
| Expose to an API spec                        | `getSchema('openapi')`          |
| Generate a QModel from an existing interface | `fromSchema('typescript', ...)` |

## See also

- [Schema Generation](/en/guide/schema-generation) — complete `getSchema()` reference
- [JSON Schema Integration](/en/integrations/json-schema-integration) — portable schema format
- [Transformers](/en/guide/transformers) — how QModel types map to TypeScript types
