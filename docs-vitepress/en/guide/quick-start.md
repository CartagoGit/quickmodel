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
```

## The Solution: QuickModel

QuickModel automates these transformations using decorators.

## Step 1: Define Your Interface

Create an interface reflecting the raw JSON structure:

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
```

## Step 2: Create Your Model

Use the `@Quick()` decorator to specify transformations:

```typescript
import { QModel, Quick } from 'quickmodel';

@Quick({
	createdAt: Date,
	balance: BigInt,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> {
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

When you need to send data back to the API, use `$qSerialize()` to get a plain object, or `$qToJSON()` for a JSON string:

```typescript
// $qSerialize() → plain JavaScript object (most common)
const plain = user.$qSerialize();
// {
//   id: 1,
//   name: 'John Doe',
//   createdAt: '2026-01-10T00:00:00.000Z',
//   balance: '999999999999999',
//   tags: ['typescript', 'node'],
//   metadata: [['key1', 'val1'], ['key2', 'val2']]
// }

// $qToJSON() → JSON string (for fetch body, WebSockets, etc.)
const jsonStr = user.$qToJSON();
// '{"id":1,"name":"John Doe",...}'

// JSON.stringify() also works and calls toJSON() automatically:
const jsonStr2 = JSON.stringify(user);
```

## Step 5: Testing with Mocks

Need fake data for testing? QuickModel generates it automatically based on your types:

```typescript
// Get 5 users with random realistic data
const fakeUsers = User.mock().array(5);

console.log(fakeUsers.length); // 5
console.log(fakeUsers[0].name); // "Alice Smith" (Random)
```

## Next Steps

Now that you understand the basics:

- [QModel](/en/guide/qmodel) - Learn about the base model class
- [@Quick Decorator](/en/guide/quick-decorator) - Deep dive into the decorator
- [Transformers](/en/guide/transformers) - See all available transformations
- [Nested Models](/en/guide/nested-models) - Work with complex nested structures
- [Examples](/en/examples/basic) - Real-world use cases
