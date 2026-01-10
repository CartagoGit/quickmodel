# @Quick Decorator

The `@Quick()` decorator is the core of QuickModel's transformation system. It tells QuickModel which properties need type transformation and how to transform them.

## Basic Syntax

```typescript
import { Quick, QModel } from '@cartago-git/quickmodel';

@Quick({
	propertyName: TransformerType,
})
class MyModel extends QModel<IMyModel> {
	// ...
}
```

## Without Arguments

Using `@Quick()` without arguments automatically applies `@QType()` to all properties:

```typescript
interface IUser {
	id: number;
	name: string;
	email: string;
}

@Quick() // Auto-decorates all properties
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
}
```

This is useful for simple models with only primitive types.

## With Transformations

Specify which properties need transformation:

```typescript
interface IUser {
	id: number;
	name: string;
	createdAt: string; // ISO string from API
	balance: string; // BigInt as string
}

@Quick({
	createdAt: Date, // Transform string → Date
	balance: BigInt, // Transform string → bigint
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
}
```

## Supported Transformers

### Primitive Types

```typescript
@Quick({
  amount: BigInt,      // string → bigint
  createdAt: Date,     // string → Date
  pattern: RegExp,     // string/object → RegExp
  uniqueId: Symbol,    // string → Symbol
  error: Error         // object → Error
})
```

### Collections

```typescript
@Quick({
  tags: Set,           // array → Set
  metadata: Map,       // array of tuples → Map
  items: [Product]     // array of objects → array of Product instances
})
```

### Binary Data

```typescript
@Quick({
  buffer: ArrayBuffer,
  bytes: Uint8Array,
  data: Int32Array,
  view: DataView
})
```

### Web APIs

```typescript
@Quick({
  homepage: URL,
  params: URLSearchParams
})
```

## Array Syntax

**Always use bracket notation `[Type]` for arrays of transformed types:**

```typescript
interface IPost {
	dates: string[]; // Array of ISO strings
	tags: string[][]; // Array of string arrays
	authors: IAuthor[]; // Array of author objects
}

@Quick({
	dates: [Date], // string[] → Date[]
	tags: [Set], // string[][] → Set<string>[]
	authors: [Author], // IAuthor[] → Author[]
})
class Post extends QModel<IPost> {
	declare dates: Date[];
	declare tags: Set<string>[];
	declare authors: Author[];
}
```

### Why Bracket Notation?

It provides clear distinction between:

```typescript
// Single Set from array
@Quick({ tags: Set })
class Post extends QModel<IPost> {
	declare tags: Set<string>; // ['a', 'b'] → Set(['a', 'b'])
}

// Array of Sets from nested arrays
@Quick({ tags: [Set] })
class Post extends QModel<IPost> {
	declare tags: Set<string>[]; // [['a'], ['b']] → [Set(['a']), Set(['b'])]
}
```

## Multi-Dimensional Arrays

Nesting depth is explicit:

```typescript
@Quick({
  matrix: [[Date]],      // Date[][] - 2D array
  cube: [[[Date]]],      // Date[][][] - 3D array
  items: [Product],      // Product[] - 1D array
  grid: [[Product]]      // Product[][] - 2D array
})
```

## Nested Models

Transform nested objects into model instances:

```typescript
interface IUser {
	id: number;
	profile: IProfile;
}

interface IProfile {
	name: string;
	birthDate: string;
}

@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
	declare id: number;
	declare profile: Profile;
}

const user = new User({
	id: 1,
	profile: {
		name: 'John',
		birthDate: '1990-01-01',
	},
});

console.log(user.profile instanceof Profile); // true
console.log(user.profile.birthDate instanceof Date); // true
```

## Dot Notation for Deep Properties

Transform nested properties without decorating the nested class:

```typescript
@Quick({
	product: Product,
	'product.price': BigInt,
	'product.createdAt': Date,
})
class CartItem extends QModel<ICartItem> {
	declare product: Product;
}
```

This is useful for:

- Third-party classes you can't modify
- Context-specific transformations
- Avoiding decorator pollution

See [Nested Models](/en/guide/nested-models) for details.

## Combining with @QType

You can mix `@Quick()` with `@QType()` for fine-grained control:

```typescript
import { Quick, QType, QModel } from '@cartago-git/quickmodel';

@Quick({
	createdAt: Date,
	balance: BigInt,
})
class User extends QModel<IUser> {
	declare id: number;

	@QType(Date)
	declare createdAt: Date;

	@QType(BigInt)
	declare balance: bigint;

	@QType(String) // Explicit primitive type
	declare name: string;
}
```

However, this is usually unnecessary. `@Quick()` is sufficient for most cases.

## Type Safety with QInterface

Enforce transformation types at compile time:

```typescript
import { Quick, QModel, QInterface } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	createdAt: string;
	balance: string;
}

interface IUserTransform {
	createdAt: Date;
	balance: bigint;
}

@Quick({
	createdAt: Date,
	balance: BigInt,
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	declare id: number;
	declare createdAt: Date; // ✅ Must match IUserTransform
	declare balance: bigint; // ✅ Must match IUserTransform
}
```

TypeScript will error if:

- Property types don't match the transformation interface
- You forget to transform a property
- You transform a property incorrectly

## Common Patterns

### API Response Models

```typescript
interface IUserAPI {
	id: number;
	name: string;
	email: string;
	created_at: string;
	updated_at: string;
	metadata: [string, any][];
}

@Quick({
	created_at: Date,
	updated_at: Date,
	metadata: Map,
})
class User extends QModel<IUserAPI> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare created_at: Date;
	declare updated_at: Date;
	declare metadata: Map<string, any>;
}
```

### Complex Nested Structures

```typescript
interface IOrder {
	id: string;
	items: IOrderItem[];
	createdAt: string;
	metadata: [string, any][];
}

interface IOrderItem {
	productId: string;
	quantity: number;
	price: string;
}

@Quick({ price: BigInt })
class OrderItem extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number;
	declare price: bigint;
}

@Quick({
	items: [OrderItem],
	createdAt: Date,
	metadata: Map,
})
class Order extends QModel<IOrder> {
	declare id: string;
	declare items: OrderItem[];
	declare createdAt: Date;
	declare metadata: Map<string, any>;
}
```

### Polymorphic Models

Use discriminators for union types:

```typescript
interface IAnimal {
	type: 'dog' | 'cat';
	name: string;
}

@Quick()
class Dog extends QModel<IAnimal> {
	declare type: 'dog';
	declare name: string;
	bark() {
		console.log('Woof!');
	}
}

@Quick()
class Cat extends QModel<IAnimal> {
	declare type: 'cat';
	declare name: string;
	meow() {
		console.log('Meow!');
	}
}

@Quick({
	pet: {
		discriminator: (data: IAnimal) => (data.type === 'dog' ? Dog : Cat),
	},
})
class Owner extends QModel<IOwner> {
	declare name: string;
	declare pet: Dog | Cat;
}
```

## Best Practices

### 1. Be Explicit

Always specify transformations explicitly:

```typescript
// ✅ Good - explicit transformations
@Quick({
	createdAt: Date,
	tags: Set,
	items: [Product],
})
// ❌ Bad - relying on auto-detection (doesn't exist)
@Quick()
class User extends QModel<IUser> {
	declare createdAt: Date; // Won't transform!
}
```

### 2. Use Array Syntax

Always use brackets for arrays:

```typescript
// ✅ Good
@Quick({
  dates: [Date],
  items: [Product]
})

// ❌ Bad - ambiguous
@Quick({
  dates: Date,    // Single Date or Date[]?
  items: Product  // Single Product or Product[]?
})
```

### 3. Keep Transformations Close to Data

Define transformations in the decorator, not scattered in code:

```typescript
// ✅ Good - all transformations in one place
@Quick({
	createdAt: Date,
	updatedAt: Date,
	balance: BigInt,
})
class User extends QModel<IUser> {
	// ...
}

// ❌ Bad - transformations scattered
class User extends QModel<IUser> {
	@QType(Date) declare createdAt: Date;
	@QType(Date) declare updatedAt: Date;
	@QType(BigInt) declare balance: bigint;
}
```

## Next Steps

- [Transformers](/en/guide/transformers) - See all available transformers
- [Nested Models](/en/guide/nested-models) - Work with complex structures
- [Custom Transformers](/en/guide/custom-transformers) - Create your own transformers
- [Examples](/en/examples/) - Real-world use cases
