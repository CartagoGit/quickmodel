# Getting Started

## What is QuickModel?

QuickModel is a TypeScript library that provides automatic serialization and deserialization for your models. It handles complex types like `Date`, `BigInt`, `Map`, `Set`, and even nested models, converting them seamlessly between JavaScript objects and JSON.

## Key Features

- **Zero Configuration**: Works out of the box with TypeScript decorators.
- **Type-Safe**: Full TypeScript support with strict type checking.
- **Automatic Transformations**: Handles Date, BigInt, Map, Set, RegExp, Buffer, TypedArrays, and more.
- **SOLID Architecture**: Clean, extensible design following best practices.
- **Mock Generation**: Built-in mock data generation for testing (`User.mock().random()`).
- **Clean API**: Intuitive methods for serialization and deserialization.

## Why QuickModel?

When working with TypeScript and APIs, you often face challenges like:

```typescript
// ❌ Problem: Dates come as strings from APIs
const user = await fetch('/api/user').then((res) => res.json());
console.log(user.createdAt instanceof Date); // false! It's a string

// ❌ Problem: Sets and Maps don't survive JSON.stringify
JSON.stringify({ tags: new Set(['a', 'b']) }); // {"tags":{}}

// ❌ Problem: Manual conversion is tedious and error-prone
const user = {
	...apiData,
	createdAt: new Date(apiData.createdAt),
	tags: new Set(apiData.tags),
	metadata: new Map(Object.entries(apiData.metadata)),
};
```

QuickModel solves this elegantly:

```typescript
// ✅ Solution: Automatic conversion
@Quick({
	createdAt: Date,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}

// 1. Instantiation (Auto-transformation)
const user = new User(apiData);
console.log(user.createdAt instanceof Date); // true!

// 2. Serialization (Auto-formatting)
const json = user.toJSON();
// {"createdAt": "2024-01-01T...", "tags": ["a", "b"], ...}
```

## Instantiation Methods

QuickModel provides flexible ways to create model instances:

- **Constructor**: `const user = new User(data);` (Recommended)
- **Factory**: `const user = User.create(data);`
- **JSON Parsing**: `const user = User.fromJSON(jsonString);`

## Next Steps

- [Installation](/en/guide/installation) - Install QuickModel in your project
- [Quick Start](/en/guide/quick-start) - Build your first model
- [Examples](/en/examples/basic) - See real-world examples
