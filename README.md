# @cartago-git/quickmodel

TypeScript model system with automatic type transformation and SOLID architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> 📚 **[Complete Documentation](docs/README.md)**

## ✨ Key Features

- 🔄 **Explicit Type Transformation** - Transform 30+ JavaScript/TypeScript types (Date, BigInt, Symbol, RegExp, Set, Map, etc.)
- 🎯 **Simple API** - Use `@Quick({})` decorator to specify transformations explicitly
- 💡 **Type-Safe** - Full TypeScript support with interface segregation
- 📦 **Nested Models** - Infinite nesting with automatic transformation
- 🏗️ **SOLID Architecture** - Clean, maintainable, extensible code
- 🎭 **Built-in Mocking** - Testing utilities with [@faker-js/faker](https://fakerjs.dev/)
- 🧪 **Well Tested** - 200+ tests covering all features

## 📦 Installation

```bash
npm install @cartago-git/quickmodel
# or: yarn add / pnpm add / bun add
```

## 🚀 Quick Start

### Basic Usage Pattern

QuickModel transforms JSON data into TypeScript runtime types. **All special types must be explicitly declared** - no automatic detection.

#### 1️⃣ **Simplest Case** - Primitives only (no transformations)

```typescript
import { QModel } from '@cartago-git/quickmodel';

interface IUser {
  id: number;
  name: string;
}

class User extends QModel<IUser> {
  declare id: number;
  declare name: string;
}

const user = new User({ id: 1, name: 'John' });
```

#### 2️⃣ **With @Quick()** - Auto-apply QType to all properties

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
  id: number;
  name: string;
}

@Quick()  // Automatically decorates all properties
class User extends QModel<IUser> {
  declare id: number;
  declare name: string;
}
```

#### 3️⃣ **With Type Transformations** - Explicit mapping required

```typescript
import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';

// Backend interface (JSON-compatible types)
interface IUser {
  id: number;
  createdAt: string;           // ISO date string from backend
  balance: string;             // BigInt as string from backend
  tags: string[];              // Array from backend
  metadata: [string, any][];   // Map as array from backend
}

// Specify transformations explicitly
// ⚠️ IMPORTANT: Use [Type] syntax for arrays: [Date], [BigInt], etc.
@Quick({
  createdAt: Date,    // Single Date (not array)
  balance: BigInt,    // Single BigInt (not array)
  tags: Set,          // Single Set (receives array of strings)
  metadata: Map       // Single Map (receives array of tuples)
})
class User extends QModel<IUser> {
  declare id: number;              // No transformation needed
  declare createdAt: Date;         // Explicitly mapped
  declare balance: bigint;         // Explicitly mapped
  declare tags: Set<string>;       // Explicitly mapped
  declare metadata: Map<string, any>; // Explicitly mapped
}

// Use with JSON data
const user = new User({
  id: 1,
  createdAt: '2026-01-08T10:00:00.000Z',
  balance: '999999999999999',
  tags: ['typescript', 'node'],
  metadata: [['key1', 'value1'], ['key2', 'value2']]
});

// Access transformed types
console.log(user.createdAt);  // Date object
console.log(user.balance);    // bigint: 999999999999999n
console.log(user.tags);       // Set<string>
console.log(user.metadata);   // Map<string, any>
```

#### 4️⃣ **Type-Safe with QInterface** - Enforce transformation types

```typescript
import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';

// Backend interface (JSON types)
interface IUser {
  id: number;
  createdAt: string;
  balance: string;
  tags: string[];
  metadata: [string, any][];
}

// Transformation interface (runtime types)
interface IUserTransform {
  createdAt: Date;
  balance: bigint;
  tags: Set<string>;
  metadata: Map<string, any>;
}

@Quick({
  createdAt: Date,
  balance: BigInt,
  tags: Set,
  metadata: Map
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
  declare id: number;
  declare createdAt: Date;          // TypeScript enforces this matches IUserTransform
  declare balance: bigint;          // TypeScript enforces this matches IUserTransform
  declare tags: Set<string>;        // TypeScript enforces this matches IUserTransform
  declare metadata: Map<string, any>; // TypeScript enforces this matches IUserTransform
}
```

## 📖 Core Concepts

### Explicit Type Mapping

QuickModel **does NOT auto-detect** types from data. All special types must be explicitly declared:

```typescript
// ❌ WRONG - Date won't be transformed automatically
@Quick()
class User extends QModel<IUser> {
  declare createdAt: Date;  // Will stay as string!
}

// ✅ CORRECT - Explicit mapping required
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
  declare createdAt: Date;  // Will transform string → Date
}
```

### Two-Interface Pattern

QuickModel uses interface segregation (SOLID principle):

- **`IUser`** - Serialization format (JSON-compatible): `string`, `number`, `boolean`, arrays
- **`IUserTransform`** - Runtime types: `Date`, `bigint`, `RegExp`, `Set`, `Map`

This allows type-safe serialization while maintaining clean runtime code.

### Supported Transformations

**Primitives:**
- `BigInt` - Large integers (from string)
- `Date` - Dates and timestamps (from ISO string)
- `RegExp` - Regular expressions (from string/object)
- `Symbol` - Symbols (using Symbol.for)
- `Error` - Error objects

**Collections:**
- `Set<T>` - Unique values (from array)
- `Map<K, V>` - Key-value pairs (from array of tuples)
- `Array<T>` - Arrays with nested transformations

**Binary:**
- `ArrayBuffer`, TypedArrays (`Int8Array`, etc.), `DataView`

**Web APIs:**
- `URL`, `URLSearchParams`

### Array Syntax (IMPORTANT)

**Always use explicit array syntax `[Type]` for arrays:**

```typescript
// ✅ CORRECT - Explicit array syntax
@Quick({
  dates: [Date],        // Date[] - array of dates
  tags: [Set],          // Set[] - array of sets
  posts: [Post],        // Post[] - array of models
  matrix: [[Date]]      // Date[][] - 2D array of dates
})
class Data extends QModel<IData> {
  declare dates: Date[];
  declare tags: Set<string>[];
  declare posts: Post[];
  declare matrix: Date[][];
}

// ❌ WRONG - Ambiguous without brackets
@Quick({
  dates: Date,    // This means single Date, not Date[]
  tags: Set,      // This means single Set, not Set[]
  posts: Post     // This means single Post, not Post[]
})
```

**Why?** Clear distinction between:
- `tags: Set` → Single Set receiving `['a', 'b', 'c']`
- `tags: [Set]` → Array of Sets receiving `[['a', 'b'], ['c', 'd']]`
- `metadata: Map` → Single Map receiving `[['k1', 'v1'], ['k2', 'v2']]`
- `metadata: [Map]` → Array of Maps receiving `[[['k1', 'v1']], [['k2', 'v2']]]`

### Multi-Dimensional Arrays

Nesting depth is explicit:

```typescript
@Quick({
  posts: [Post],      // Post[] - 1D array
  matrix: [[Post]],   // Post[][] - 2D array
  cube: [[[Post]]]    // Post[][][] - 3D array
})
```

### Property Declaration

**All three TypeScript property declaration styles work identically:**

```typescript
// ✅ Style 1: declare (cleaner, no runtime code)
@Quick({ createdAt: Date, dates: [Date] })
class User extends QModel<IUser> {
  declare id: number;
  declare createdAt: Date;
  declare dates: Date[];
}

// ✅ Style 2: Definite assignment (!)
@Quick({ createdAt: Date, dates: [Date] })
class User extends QModel<IUser> {
  id!: number;
  createdAt!: Date;
  dates!: Date[];
}

// ✅ Style 3: Optional (?)
@Quick({ createdAt: Date, dates: [Date] })
class User extends QModel<IUser> {
  id?: number;
  createdAt?: Date;
  dates?: Date[];
}
```

All three styles produce **identical behavior** - choose based on your preference or team conventions.

### Collections Example

```typescript
interface IPost {
  tags: string[];              // Array → Set (single Set)
  categories: string[][];      // Array → Set[] (array of Sets)
  metadata: [string, any][];   // Tuples → Map (single Map)
}

interface IPostTransform {
  tags: Set<string>;
  categories: Set<string>[];
  metadata: Map<string, any>;
}

// ⚠️ Note the [Set] syntax for arrays of Sets
@Quick({
  tags: Set,           // Single Set
  categories: [Set],   // Array of Sets - explicit syntax!
  metadata: Map        // Single Map
})
class Post extends QModel<IPost> implements QInterface<IPost, IPostTransform> {
  declare id: string;
  declare tags: Set<string>;           // Single Set
  declare categories: Set<string>[];   // Array of Sets
  declare metadata: Map<string, any>;  // Single Map
}

const post = new Post({
  id: '1',
  tags: ['typescript', 'node'],              // Single Set from array
  categories: [['js', 'ts'], ['node']],      // Array of Sets
  metadata: [['key', 'value']]               // Single Map from tuples
});

// Access transformed types
console.log(post.tags);           // Set { 'typescript', 'node' }
console.log(post.categories[0]);  // Set { 'js', 'ts' }
console.log(post.metadata);       // Map { 'key' => 'value' }
```

### Nested Models

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
  declare birthDate: Date;
  declare address: Address;
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
  declare id: string;
  declare profile: Profile;
}

const user = new User({
  id: '1',
  profile: {
    birthDate: '1990-01-01',
    address: { city: 'NYC' }
  }
});
```

### Dot Notation for Nested Properties

QuickModel supports **dot notation** to specify transformations for nested properties without decorating the nested class:

```typescript
// Option 1: Decorate nested class (recommended for reusable models)
@Quick({ price: BigInt, createdAt: Date })
class Product extends QModel<IProduct> {
  price!: bigint;
  createdAt!: Date;
}

@Quick({ product: Product })
class CartItem extends QModel<ICartItem> {
  product!: Product;  // Product already decorated
}

// Option 2: Use dot notation (useful for third-party classes or context-specific transforms)
@Quick({
  product: Product,
  'product.price': BigInt,      // ← Dot notation
  'product.createdAt': Date     // ← Dot notation
})
class CartItem extends QModel<ICartItem> {
  product!: Product;  // All transformations in one place
}
```

📖 **[Complete Dot Notation Guide](docs/DOT-NOTATION.md)** - Learn when and how to use nested transformations

## 🎭 Testing with Mocks

```typescript
// Generate mock with defaults
const mockUser = User.mock();

// Override specific fields
const customUser = User.mock({
  name: 'Custom Name'
});

// Generate array of mocks
const users = User.mock(5);
```

Powered by [@faker-js/faker](https://fakerjs.dev/).

## 🏗️ Architecture (SOLID)

- **Single Responsibility**: Each transformer handles one type
- **Open/Closed**: Extensible via transformer registry
- **Liskov Substitution**: Models work like TypeScript classes
- **Interface Segregation**: Separate serialization/runtime interfaces
- **Dependency Inversion**: Depends on abstractions

## 📚 Documentation

- [Installation](docs/INSTALLATION.md)
- [API Reference](docs/README.md)
- [Architecture](docs/SOLID-ARCHITECTURE.md)
- [Development Guide](docs/README-DEV.md)

## 📝 License

MIT © Cartago Git

## 🤝 Contributing

Contributions welcome! See [development guide](docs/README-DEV.md).
