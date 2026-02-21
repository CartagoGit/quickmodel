<div align="center">
  <img src="./assets/quickmodel.png" alt="QuickModel Logo" width="120" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);" />
</div>

# @cartago-git/quickmodel

TypeScript model system with automatic type transformation and SOLID architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/CartagoGit/quickmodel/actions/workflows/ci.yml/badge.svg)](https://github.com/CartagoGit/quickmodel/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/CartagoGit/quickmodel/branch/main/graph/badge.svg)](https://codecov.io/gh/CartagoGit/quickmodel)
[![npm version](https://badge.fury.io/js/@cartago-git%2Fquickmodel.svg)](https://www.npmjs.com/package/@cartago-git/quickmodel)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@cartago-git/quickmodel)](https://bundlephobia.com/package/@cartago-git/quickmodel)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤-ff69b4)](https://github.com/sponsors/CartagoGit)

> 📚 **[Complete Documentation](https://cartagogit.github.io/quickmodel/)**

## ✨ Key Features

- 🔄 **Explicit Type Transformation** - Transform 30+ JavaScript/TypeScript types (Date, BigInt, Symbol, RegExp, Set, Map, WeakMap, WeakSet, etc.)
- 🎯 **Simple API** - Use `@Quick({})` decorator to specify transformations explicitly
- 💡 **Type-Safe** - Full TypeScript support with interface segregation
- 📦 **Nested Models** - Infinite nesting with automatic transformation
- 🔍 **Schema Generation** - Export your model as JSON Schema, Zod, OpenAPI, Mongoose, TypeScript, GraphQL, or AJV via `getSchema()`
- 🤖 **MCP Server** - AI assistant integration with 10 public tools and 4 guided prompts (Claude, Copilot, etc.)
- 🏗️ **SOLID Architecture** - Clean, maintainable, extensible code
- 🎭 **Built-in Mocking** - Testing utilities with [@faker-js/faker](https://fakerjs.dev/)
- 🧪 **Well Tested** - 1500+ tests covering all features

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

@Quick() // Automatically decorates all properties
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}
```

#### 3️⃣ **With Type Transformations** - Explicit mapping required

```typescript
import { QModel, Quick, IQImplements } from '@cartago-git/quickmodel';

// Backend interface (JSON-compatible types)
interface IUser {
	id: number;
	createdAt: string; // ISO date string from backend
	balance: string; // BigInt as string from backend
	tags: string[]; // Array from backend
	metadata: [string, any][]; // Map as array from backend
}

// Specify transformations explicitly
// ⚠️ IMPORTANT: Use [Type] syntax for arrays: [Date], [BigInt], etc.
@Quick({
	createdAt: Date, // Single Date (not array)
	balance: BigInt, // Single BigInt (not array)
	tags: Set, // Single Set (receives array of strings)
	metadata: Map, // Single Map (receives array of tuples)
})
class User extends QModel<IUser> {
	declare id: number; // No transformation needed
	declare createdAt: Date; // Explicitly mapped
	declare balance: bigint; // Explicitly mapped
	declare tags: Set<string>; // Explicitly mapped
	declare metadata: Map<string, any>; // Explicitly mapped
}

// Use with JSON data
const user = new User({
	id: 1,
	createdAt: '2026-01-08T10:00:00.000Z',
	balance: '999999999999999',
	tags: ['typescript', 'node'],
	metadata: [
		['key1', 'value1'],
		['key2', 'value2'],
	],
});

// Access transformed types
console.log(user.createdAt); // Date object
console.log(user.balance); // bigint: 999999999999999n
console.log(user.tags); // Set<string>
console.log(user.metadata); // Map<string, any>
```

#### 4️⃣ **Type-Safe with IQImplements** (Recommended)

> Although optional, using `IQImplements` is **highly recommended** to ensure your class definitions match your data contracts and transformations, preventing silent type errors.

```typescript
import { QModel, Quick, IQImplements } from '@cartago-git/quickmodel';

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
	metadata: Map,
})
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransform>
{
	declare id: number;
	declare createdAt: Date; // TypeScript enforces this matches IUserTransform
	declare balance: bigint; // TypeScript enforces this matches IUserTransform
	declare tags: Set<string>; // TypeScript enforces this matches IUserTransform
	declare metadata: Map<string, any>; // TypeScript enforces this matches IUserTransform
}
```

#### 5️⃣ **Use `create()` for Type-Safety**

The static `create()` method provides a convenient factory for your models.

**Option A: Explicit `declare` (RECOMMENDED)**

For automatic type inference of transformed properties, use `declare` keywords in your class. This is the standard, most robust way and works with both `new User()` and `User.create()`.

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	createdAt: string; // Backend: ISO string
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare createdAt: Date; // ← Explicit runtime type (REQUIRED for inference)
}

// Automatic type inference works perfectly
const user = User.create({ id: 1, createdAt: '2026-01-01' });

user.createdAt; // ✅ Date
```

**Option B: Using `IQTransform` (Alternative)**

If you prefer NOT to use `declare` properties (e.g. to keep classes smaller), you can use the `IQTransform` helper to manually specify the transformed type in the `create()` call.

```typescript
import { QModel, Quick, IQTransform } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	createdAt: string;
}

// 1. Define your runtime transformations
type UserTransforms = { createdAt: Date };

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	// No declare needed
}

// 2. Pass transformation type to create()
const user = User.create<IQTransform<IUser, UserTransforms>>({
	id: 1,
	createdAt: '2026-01-08',
});

user.createdAt; // ✅ Date (inferred via IQTransform)
```

user.email // ✅ TypeScript: string
user.createdAt // ✅ TypeScript: Date (transformed)

```

**When to use `create()`:**
- ✅ You want concise code (no property declarations)
- ✅ Your interface already defines all types
- ✅ You prefer DRY (Don't Repeat Yourself)

**When to use `declare`:**
- ✅ You prefer explicit property declarations
- ✅ You want standard constructor usage (`new`)
- ✅ You need property visibility in IDE
```

## 📖 Core Concepts

### Explicit Type Mapping

QuickModel **does NOT auto-detect** types from data. All special types must be explicitly declared:

```typescript
// ❌ WRONG - Date won't be transformed automatically
@Quick()
class User extends QModel<IUser> {
	declare createdAt: Date; // Will stay as string!
}

// ✅ CORRECT - Explicit mapping required
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare createdAt: Date; // Will transform string → Date
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
- `WeakMap<object, V>` - Runtime-only cache, **not serialized** (GC-friendly)
- `WeakSet<object>` - Runtime-only object set, **not serialized** (GC-friendly)

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
	tags: string[]; // Array → Set (single Set)
	categories: string[][]; // Array → Set[] (array of Sets)
	metadata: [string, any][]; // Tuples → Map (single Map)
}

interface IPostTransform {
	tags: Set<string>;
	categories: Set<string>[];
	metadata: Map<string, any>;
}

// ⚠️ Note the [Set] syntax for arrays of Sets
@Quick({
	tags: Set, // Single Set
	categories: [Set], // Array of Sets - explicit syntax!
	metadata: Map, // Single Map
})
class Post
	extends QModel<IPost>
	implements IQImplements<IPost, IPostTransform>
{
	declare id: string;
	declare tags: Set<string>; // Single Set
	declare categories: Set<string>[]; // Array of Sets
	declare metadata: Map<string, any>; // Single Map
}

const post = new Post({
	id: '1',
	tags: ['typescript', 'node'], // Single Set from array
	categories: [['js', 'ts'], ['node']], // Array of Sets
	metadata: [['key', 'value']], // Single Map from tuples
});

// Access transformed types
console.log(post.tags); // Set { 'typescript', 'node' }
console.log(post.categories[0]); // Set { 'js', 'ts' }
console.log(post.metadata); // Map { 'key' => 'value' }
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
		address: { city: 'NYC' },
	},
});
```

### WeakMap & WeakSet (Runtime-only)

Use `WeakMap` and `WeakSet` for runtime-only data that should **not be serialized** (garbage-collection-friendly caches, event listener sets, etc.).

```typescript
interface ISession {
	id: string;
}

@Quick({
	cache: WeakMap, // Runtime cache — not persisted
	listeners: WeakSet, // Runtime listener set — not persisted
})
class Session extends QModel<ISession> {
	declare id: string;
	declare cache: WeakMap<object, any>; // Auto GC when keys die
	declare listeners: WeakSet<object>; // Auto GC when objects die
}

const session = new Session({ id: 'abc' });

// WeakMap/WeakSet accept tuples on construction, but toJSON() omits them
console.log(session.cache); // WeakMap {}
console.log(session.listeners); // WeakSet {}
console.log(JSON.stringify(session)); // { "id": "abc" } — WeakMap/WeakSet excluded
```

> ⚠️ `WeakMap` and `WeakSet` are **never serialized** to JSON. Use `Map`/`Set` if you need persistence.

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
	product!: Product; // Product already decorated
}

// Option 2: Use dot notation (useful for third-party classes or context-specific transforms)
@Quick({
	product: Product,
	'product.price': BigInt, // ← Dot notation
	'product.createdAt': Date, // ← Dot notation
})
class CartItem extends QModel<ICartItem> {
	product!: Product; // All transformations in one place
}
```

📖 **[Complete Dot Notation Guide](https://cartagogit.github.io/quickmodel/en/guide/dot-notation)** - Learn when and how to use nested transformations

## 🛡️ Robustness & Security

QuickModel includes built-in protections for robust serialization:

- **Circular Reference Protection**: `toJSON()` calls safely handle circular references in Objects, Arrays, Maps, and Sets by returning a `{ __circular: true }` marker instead of crashing.
- **Deep Serialization**: Collections like `Map` and `Set` are IQSerialized recursively, ensuring that nested complex types (like `BigInt` or `Date`) are properly converted to their JSON-compatible formats.
- **Internal Property Protection**: Properties starting with `__` are automatically excluded from serialization to prevent leaking internal state.
- **Injection Protection**: Automatic validation for URLs (blocks `javascript:`) and limits on RegExp length.

> ⚠️ **Security Notice**: QuickModel operates in **Permissive Mode** by default (`unknownPropertyPolicy: 'keep'`). For public APIs, use error policy: `@Quick({}, { unknownPropertyPolicy: 'error' })`. See [SECURITY.md](SECURITY.md) for full security guidelines and best practices.

## ✅ Validation

QuickModel provides built-in validation to ensure runtime integrity. The `validate()` method checks that all transformed properties contain valid values according to their transformers.

```typescript
@Quick({
	birthDate: Date,
	tags: [Set], // Array of Sets
})
class User extends QModel<IUser> {
	declare birthDate: Date;
	declare tags: Set<string>[];
}

// 1. Valid data
const user = new User({
	birthDate: '2024-01-01',
	tags: [['a', 'b']],
});
console.log(user.validate()); // [] (Empty array = valid)

// 2. Invalid data
const invalidUser = new User({
	birthDate: 'invalid-date',
	tags: 'not-an-array', // Should be array of arrays of strings
});

const errors = invalidUser.validate();
if (errors.length > 0) {
	console.log(errors);
	// [
	//   { isValid: false, error: "User.birthDate: Invalid Date string: invalid-date" },
	//   { isValid: false, error: "User.tags: Expected array for Set[], got string" }
	// ]
}
```

## 🔍 Schema Generation

QuickModel can export your model's structure as different schema formats for documentation, validation, and interoperability. Available via the static `getSchema()` method or the instance method:

```typescript
@Quick({ createdAt: Date, tags: Set })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare tags: Set<string>;
}

// Static: generate schema from class definition
const jsonSchema = User.getSchema('json'); // JSON Schema Draft-07
const openapiComp = User.getSchema('openapi'); // OpenAPI 3.0 component
const zodSchema = User.getSchema('zod'); // Zod validator string
const mongoSchema = User.getSchema('mongo'); // Mongoose SchemaTypes
const tsInterface = User.getSchema('typescript'); // TypeScript interface
const graphqlType = User.getSchema('graphql'); // GraphQL SDL type
const ajvSchema = User.getSchema('ajv'); // AJV validator schema

// Instance: same output, works on a live model
const user = new User({
	id: 1,
	name: 'Alice',
	createdAt: '2025-01-01',
	tags: ['ts'],
});
const schema = user.getSchema('json');
```

**Supported formats:**

| Format         | Description                     |
| -------------- | ------------------------------- |
| `'json'`       | JSON Schema Draft-07            |
| `'openapi'`    | OpenAPI 3.0 schema component    |
| `'zod'`        | Zod validation schema string    |
| `'mongo'`      | Mongoose / MongoDB SchemaTypes  |
| `'typescript'` | TypeScript interface string     |
| `'graphql'`    | GraphQL SDL type definition     |
| `'ajv'`        | AJV-compatible validator schema |

## 🎭 Testing with Mocks

```typescript
// Generate mock with defaults
const mockUser = User.mock();

// Override specific fields
const customUser = User.mock({
	name: 'Custom Name',
});

// Generate array of mocks
const users = User.mock(5);
```

Powered by [@faker-js/faker](https://fakerjs.dev/).

## 🤖 MCP Server Integration

QuickModel ships a built-in **Model Context Protocol (MCP) server** that gives AI assistants (Claude, GitHub Copilot, etc.) direct access to QuickModel capabilities.

### Start the MCP server

```bash
bun run mcp:start
# or: npx @cartago-git/quickmodel mcp
```

### Configure in Claude Desktop (`~/.config/claude/claude_desktop_config.json`)

```json
{
	"mcpServers": {
		"quickmodel": {
			"command": "npx",
			"args": ["-y", "@cartago-git/quickmodel", "mcp"]
		}
	}
}
```

### Public tools (10)

| Tool                      | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `create_model`            | Generate TypeScript `QModel` class from properties        |
| `validate_usage`          | Validate a code snippet against QuickModel best practices |
| `list_transformers`       | List all available type transformers                      |
| `generate_mock`           | Generate mock data for a model                            |
| `inspect_model`           | Inspect a model's properties and transformations          |
| `search_docs`             | Search the QuickModel documentation                       |
| `interface_to_model`      | Convert a TypeScript interface to a QModel class          |
| `export_json_schema`      | Export a model as JSON Schema                             |
| `explain_error`           | Explain a validation error in plain language              |
| `simulate_transformation` | Simulate a type transformation on sample data             |
| `json_to_model`           | Generate a QModel class from a JSON object                |

### AI-guided prompts / skills (4)

| Skill                           | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `quickmodel_from_typescript`    | Generate a QModel from a TypeScript interface (step-by-step) |
| `quickmodel_debug`              | Diagnose and fix a QuickModel issue                          |
| `quickmodel_generate_test_data` | Create test data strategies for a model                      |
| `quickmodel_inspect_and_schema` | Inspect a model and export its schema in all formats         |

> 📚 **[MCP Documentation](https://cartagogit.github.io/quickmodel/en/mcp/)** — Full tool reference and AI integration guide

## 🏗️ Architecture (SOLID)

- **Single Responsibility**: Each transformer handles one type
- **Open/Closed**: Extensible via transformer registry
- **Liskov Substitution**: Models work like TypeScript classes
- **Interface Segregation**: Separate serialization/runtime interfaces
- **Dependency Inversion**: Depends on abstractions

## 📚 Documentation

- [Installation](https://cartagogit.github.io/quickmodel/en/guide/installation)
- [API Reference](https://cartagogit.github.io/quickmodel/tsdoc/)
- [Architecture](https://cartagogit.github.io/quickmodel/en/guide/contributing#architecture)
- [Development Guide](https://cartagogit.github.io/quickmodel/en/guide/contributing)
- [MCP Integration](https://cartagogit.github.io/quickmodel/en/mcp/)

## 🤝 Contributing

Contributions welcome! See [development guide](https://cartagogit.github.io/quickmodel/en/guide/contributing).

## 👤 Author

**Mario Cabrero Volarich**

- GitHub: [@CartagoGit](https://github.com/CartagoGit)

## 📝 License

MIT © Cartago Git
