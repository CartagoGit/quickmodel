# Getting Started

## What is QuickModel?

QuickModel is a TypeScript library that provides automatic serialization and deserialization for your models. It handles complex types like `Date`, `BigInt`, `Map`, `Set`, and more, converting them seamlessly between JavaScript objects and JSON.

## Key Features

- **Zero Configuration**: Works out of the box with TypeScript decorators
- **Type-Safe**: Full TypeScript support with strict type checking
- **Automatic Transformations**: Handles Date, BigInt, Map, Set, RegExp, Buffer, TypedArrays, and more
- **SOLID Architecture**: Clean, extensible design
- **Mock Generation**: Built-in faker.js integration for testing
- **Path Aliases**: Clean imports with `@/*` aliases

## Why QuickModel?

When working with TypeScript and APIs, you often face challenges like:

```typescript
// ❌ Problem: Dates come as strings from APIs
const user = await fetch('/api/user').then(r => r.json());
console.log(user.createdAt instanceof Date); // false! It's a string

// ❌ Problem: Sets and Maps don't survive JSON.stringify
JSON.stringify({ tags: new Set(['a', 'b']) }); // {"tags":{}}

// ❌ Problem: Manual conversion is tedious and error-prone
const user = {
  ...apiData,
  createdAt: new Date(apiData.createdAt),
  tags: new Set(apiData.tags),
  metadata: new Map(Object.entries(apiData.metadata))
};
```

QuickModel solves this:

```typescript
// ✅ Solution: Automatic conversion
@Quick({
  createdAt: Date,
  tags: Set,
  metadata: Map
})
class User extends QModel<IUser> {
  id!: number;
  name!: string;
  createdAt!: Date;
  tags!: Set<string>;
  metadata!: Map<string, any>;
}

const user = new User(apiData);
// Everything is the correct type automatically!
```

## Next Steps

- [Installation](/guide/installation) - Install QuickModel in your project
- [Quick Start](/guide/quick-start) - Build your first model
- [Examples](/examples/basic) - See real-world examples
