# @cartago-git/quickmodel

TypeScript model system with automatic type transformation and SOLID architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> 📚 **[Complete Documentation](docs/README.md)**

## ✨ Key Features

- 🔄 **Automatic Type Transformation** - 30+ JavaScript/TypeScript types (Date, BigInt, Symbol, RegExp, Set, Map, etc.)
- 🎯 **Simple API** - Use `@Quick({})` decorator to specify transformations
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

```typescript
import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';

// Serialization interface (JSON-compatible)
interface IUser {
  id: number;
  name: string;
  balance: string;      // BigInt stored as string
  createdAt: string;    // Date stored as ISO string
}

// Runtime interface (actual types in code)
interface IUserTransform {
  balance: bigint;
  createdAt: Date;
}

// Specify which fields need transformation
@Quick({
  balance: BigInt,
  createdAt: Date
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
  id!: number;
  name!: string;
  balance!: bigint;      // Runtime type
  createdAt!: Date;      // Runtime type
}

// Use with native types
const user = new User({
  id: 1,
  name: 'John Doe',
  balance: '999999999999999',            // String from JSON
  createdAt: '2026-01-08T10:00:00.000Z'  // ISO string
});

// Access transformed types
console.log(user.balance);    // bigint: 999999999999999n
console.log(user.createdAt);  // Date object

// Serialize to JSON-compatible format
const json = user.toInterface();
```

## 📖 Core Concepts

### Two-Interface Pattern

QuickModel uses interface segregation (SOLID principle):

- **`IUser`** - Serialization format (JSON-compatible): `string`, `number`, `boolean`, `object`
- **`IUserTransform`** - Runtime types: `Date`, `bigint`, `RegExp`, `Set`, `Map`

This allows type-safe serialization while maintaining clean runtime code.

### Supported Types

**Primitives:**
- `BigInt` - Large integers
- `Date` - Dates and timestamps
- `RegExp` - Regular expressions
- `Symbol` - Symbols (using Symbol.for)
- `Error` - Error objects

**Collections:**
- `Set<T>` - Unique values
- `Map<K, V>` - Key-value pairs
- `Array<T>` - Arrays with nested transformations

**Binary:**
- `ArrayBuffer`, TypedArrays (`Int8Array`, etc.), `DataView`

**Web APIs:**
- `URL`, `URLSearchParams`

### Property Declaration

Both styles are supported:

```typescript
// Using declare (recommended)
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
  declare id: number;
  declare createdAt: Date;
}

// Using definite assignment (!)
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
  id!: number;
  createdAt!: Date;
}
```

### Collections Example

```typescript
interface IPost {
  tags: string[];              // Array → Set
  metadata: [string, any][];   // Tuples → Map
}

interface IPostTransform {
  tags: Set<string>;
  metadata: Map<string, any>;
}

@Quick({
  tags: Set,
  metadata: Map
})
class Post extends QModel<IPost> implements QInterface<IPost, IPostTransform> {
  id!: string;
  tags!: Set<string>;
  metadata!: Map<string, any>;
}

const post = new Post({
  id: '1',
  tags: ['typescript', 'node'],    // Pass array, get Set
  metadata: [['key', 'value']]      // Pass tuples, get Map
});
```

### Nested Models

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
  birthDate!: Date;
  address!: Address;
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
  id!: string;
  profile!: Profile;
}

const user = new User({
  id: '1',
  profile: {
    birthDate: '1990-01-01',
    address: { city: 'NYC' }
  }
});
```

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
