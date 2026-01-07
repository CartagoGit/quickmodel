# 🏗️ @cartago-git/quickmodel - Development Guide

> **Note**: This is the README for development. The public npm package README is in [README.md](README.md)

Complete TypeScript model serialization/deserialization system following **SOLID** principles.

## 📋 Project Structure

```
pruebas/
├── 📄 README.md                          # This file
├── 📄 SOLID-ARCHITECTURE.md              # Detailed SOLID documentation
│
├── 🏛️ core/                              # SOLID core
│   ├── interfaces/                       # Contracts (I, D)
│   │   ├── transformer.interface.ts      # IQTransformer, IQValidator
│   │   ├── serializer.interface.ts       # IQSerializer, IQDeserializer
│   │   └── registry.interface.ts         # IQTransformerRegistry
│   ├── services/                         # Services (S)
│   │   ├── model-deserializer.service.ts
│   │   ├── model-serializer.service.ts
│   │   └── validation.service.ts
│   └── registry/                         # Registries (O)
│       ├── transformer.registry.ts
│       └── validator.registry.ts
│
├── 🔄 transformers/                      # Transformers (S, L)
│   ├── types.ts                          # Type symbols
│   ├── primitive.transformer.ts          # String, Number, Boolean
│   ├── date.transformer.ts               # Date
│   ├── bigint.transformer.ts             # BigInt
│   ├── symbol.transformer.ts             # Symbol
│   ├── regexp.transformer.ts             # RegExp
│   ├── error.transformer.ts              # Error
│   ├── typed-array.transformer.ts        # TypedArrays (10 types)
│   ├── buffer.transformer.ts             # ArrayBuffer, DataView
│   ├── map-set.transformer.ts            # Map, Set
│   ├── bootstrap.ts                      # Auto-registration
│   └── index.ts                          # Exports
│
├── 📦 models/                            # Example models
│   └── examples/
│       ├── simple.model.ts               # Primitives + BigInt + Symbol
│       ├── collections.model.ts          # Arrays, Maps, Sets
│       ├── nested.model.ts               # Nested models
│       ├── binary.model.ts               # TypedArrays, Buffers
│       ├── complex.model.ts              # Combination of all
│       └── index.ts
│
├── 🧪 tests/                             # Organized tests
│   ├── unit/                             # Individual unit tests
│   └── integration/                      # Integration tests
│
├── 🚀 run/                               # Test executables
│   ├── test-all.ts                       # Runs ALL tests
│   ├── test-unit.ts                      # Only unit tests
│   ├── test-integration.ts               # Only integration tests
│   └── test-each.ts                      # Each individual test
│
└── 📦 quick.model.ts                     # QModel (SOLID)
```

## 🎯 Applied SOLID Principles

| Principle                  | Implementation                                      |
| -------------------------- | --------------------------------------------------- |
| **S**ingle Responsibility  | Each class/service has ONE responsibility           |
| **O**pen/Closed            | Extensible (new transformers) without modifying code|
| **L**iskov Substitution    | All transformers are interchangeable                |
| **I**nterface Segregation  | Specific and cohesive interfaces                    |
| **D**ependency Inversion   | Dependencies on abstractions, not implementations   |

## 🚀 Quick Usage

### 1. Create a Model

```typescript
import { QModel, QType, QBigInt } from './quick.model';
import type { QInterface } from './quick.model';

interface IUser {
  id: string;
  name: string;
  balance: string;
  createdAt: string;
}

type UserTransforms = {
  balance: bigint;
  createdAt: Date;
};

class User extends QModel<IUser> implements QInterface<IUser, UserTransforms> {
  @QType() id!: string;
  @QType() name!: string;
  @QType(QBigInt) balance!: bigint;
  @QType() createdAt!: Date;
}
```

### 2. Supported Types (27 types + nested models)

| Type          | Decorator                  | Example                |
| ------------- | -------------------------- | ---------------------- |
| string        | `@QType()`                 | `name!: string`        |
| number        | `@QType()`                 | `age!: number`         |
| boolean       | `@QType()`                 | `active!: boolean`     |
| Date          | `@QType()`                 | `createdAt!: Date`     |
| BigInt        | `@QType(QBigInt)`          | `balance!: bigint`     |
| Symbol        | `@QType(QSymbol)`          | `token!: symbol`       |
| RegExp        | `@QType(QRegExp)`          | `pattern!: RegExp`     |
| Error         | `@QType(QError)`           | `lastError!: Error`    |
| Map           | `@QType()`                 | `metadata!: Map<K, V>` |
| Set           | `@QType()`                 | `tags!: Set<T>`        |
| Int8Array     | `@QType(QInt8Array)`       | `data!: Int8Array`     |
| Uint8Array    | `@QType(QUint8Array)`      | `data!: Uint8Array`    |
| Float32Array  | `@QType(QFloat32Array)`    | `data!: Float32Array`  |
| ArrayBuffer   | `@QType(QArrayBuffer)`     | `buffer!: ArrayBuffer` |
| DataView      | `@QType(QDataView)`        | `view!: DataView`      |
| Model         | `@QType()`                 | `owner!: User`         |
| Array<Model>  | `@QType(ModelClass)`       | `users!: User[]`       |

## 🧪 Run Tests

```bash
# All tests
bun run/test-all.ts

# Only unit tests
bun run/test-unit.ts

# Only integration
bun run/test-integration.ts

# Each individual test
bun run/test-each.ts
```

## 📚 Documentation

- [SOLID-ARCHITECTURE.md](./SOLID-ARCHITECTURE.md) - Detailed SOLID architecture

## 🔌 Extensibility

### Add New Transformer

```typescript
// 1. Implement IQTransformer
class URLTransformer implements IQTransformer<string, URL> {
  transform(value: string, context: IQTransformContext): URL {
    return new URL(value);
  }

  serialize(value: URL): string {
    return value.toString();
  }
}

// 2. Create symbol
export const CustomURLField = Symbol('CustomURL');

// 3. Register
qTransformerRegistry.register(CustomURLField, new URLTransformer());

// 4. Use
import { QModel, QType } from './quick.model';
import type { QInterface } from './quick.model';

class Website extends QModel<IWebsite> implements QInterface<IWebsite> {
  @QType(CustomURLField) url!: URL;
}
```

## 📊 Coverage

- ✅ 27 serializable JavaScript types
- ✅ Infinite nested models
- ✅ Arrays of any type
- ✅ Automatic validation
- ✅ Complete JSON round-trip
- ⚠️ Non-serializable: WeakMap, WeakSet, Promise, Function
