# Quick Start

This guide will walk you through creating your first QuickModel in 5 minutes.

## The Problem

When working with APIs, data comes as JSON with primitive types only. Complex types like `Date`, `BigInt`, `Set`, and `Map` are serialized as strings or arrays:

```typescript
// API Response
const apiResponse = {
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z', // ❌ String, not Date
	balance: '999999999999999', // ❌ String, not BigInt
	tags: ['typescript', 'node'], // ❌ Array, not Set
	metadata: [['key1', 'val1']], // ❌ Array, not Map
};

// Manual conversion is tedious
const user = {
	...apiResponse,
	createdAt: new Date(apiResponse.createdAt),
	balance: BigInt(apiResponse.balance),
	tags: new Set(apiResponse.tags),
	metadata: new Map(apiResponse.metadata),
};
```

## The Solution: QuickModel

QuickModel automates these transformations using decorators.

## Step 1: Define Your Interfaces

Create two interfaces following the **Two-Interface Pattern**:

```typescript
// Backend interface (JSON-compatible types)
interface IUser {
	id: number;
	name: string;
	createdAt: string; // ISO date string
	balance: string; // BigInt as string
	tags: string[]; // Array
	metadata: [string, any][]; // Map as array of tuples
}

// Runtime transformation interface (optional but recommended)
interface IUserTransform {
	createdAt: Date;
	balance: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
}
```

## Step 2: Create Your Model

Use the `@Quick()` decorator to specify transformations:

```typescript
import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';

@Quick({
	createdAt: Date,
	balance: BigInt,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}
```

## Step 3: Use Your Model

Now you can create instances with automatic type transformation:

```typescript
const user = new User({
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z',
	balance: '999999999999999',
	tags: ['typescript', 'node'],
	metadata: [
		['key1', 'val1'],
		['key2', 'val2'],
	],
});

// All types are automatically transformed! ✅
console.log(user.createdAt instanceof Date); // true
console.log(typeof user.balance); // 'bigint'
console.log(user.tags instanceof Set); // true
console.log(user.metadata instanceof Map); // true
```

## Step 4: Serialize Back to JSON

When you need to send data back to the API:

```typescript
const json = user.toJSON();
// {
//   id: 1,
//   name: 'John Doe',
//   createdAt: '2026-01-10T00:00:00.000Z',
//   balance: '999999999999999',
//   tags: ['typescript', 'node'],
//   metadata: [['key1', 'val1'], ['key2', 'val2']]
// }
```

## Understanding the Decorator

The `@Quick()` decorator tells QuickModel which properties need transformation:

```typescript
@Quick({
  createdAt: Date,    // Transform string → Date
  balance: BigInt,    // Transform string → bigint
  tags: Set,          // Transform array → Set
  metadata: Map       // Transform array of tuples → Map
})
```

**Important:** Only properties listed in `@Quick()` are transformed. Properties not listed remain as-is.

## Array Syntax

For arrays of transformed types, use bracket notation:

```typescript
interface IPost {
	dates: string[]; // Array of ISO strings
	tags: string[][]; // Array of arrays
}

@Quick({
	dates: [Date], // Transform to Date[]
	tags: [Set], // Transform to Set<string>[]
})
class Post extends QModel<IPost> {
	declare dates: Date[];
	declare tags: Set<string>[];
}

const post = new Post({
	dates: ['2026-01-01', '2026-01-02'],
	tags: [
		['js', 'ts'],
		['node', 'deno'],
	],
});

console.log(post.dates[0] instanceof Date); // true
console.log(post.tags[0] instanceof Set); // true
```

## Property Declaration Styles

All three TypeScript property declaration styles work identically:

```typescript
// ✅ Style 1: declare (recommended - no runtime code)
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare createdAt: Date;
}

// ✅ Style 2: Definite assignment (!)
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	id!: number;
	createdAt!: Date;
}

// ✅ Style 3: Optional (?)
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	id?: number;
	createdAt?: Date;
}
```

## Next Steps

Now that you understand the basics:

- [QModel](/en/guide/qmodel) - Learn about the base model class
- [@Quick Decorator](/en/guide/quick-decorator) - Deep dive into the decorator
- [Transformers](/en/guide/transformers) - See all available transformations
- [Nested Models](/en/guide/nested-models) - Work with complex nested structures
- [Examples](/en/examples/) - Real-world use cases
