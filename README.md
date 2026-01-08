# @cartago-git/quickmodel

Professional TypeScript model system with automatic type transformation and **SOLID** architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![SOLID](https://img.shields.io/badge/Architecture-SOLID-green.svg)]()

> 📚 **[See Complete Documentation Index](docs/README.md)**

## ✨ Features

- 🎯 **Simple API**: Use `@Quick({})` decorator and implement interfaces
- 🔄 **30+ JavaScript/TypeScript types** automatically handled (Date, BigInt, Symbol, RegExp, Error, etc.)
- 🏗️ **Complete SOLID Architecture** with independent services
- 💡 **Type-Safe Serialization**: Automatic conversion to JSON-compatible formats
- 📦 **Infinite nested models** with automatic transformation
- 🎭 **Mock System**: Built-in testing utilities with [@faker-js/faker](https://fakerjs.dev/)
- 🔌 **Extensible** via transformer registry pattern
- 🧪 **Comprehensive test suite** with 199+ passing tests
- 📚 **Complete documentation**

## 📦 Installation

```bash
# npm
npm install @cartago-git/quickmodel

# yarn
yarn add @cartago-git/quickmodel

# pnpm
pnpm add @cartago-git/quickmodel

# bun
bun add @cartago-git/quickmodel
```

## 🚀 Quick Start

### Simple Example

```typescript
import { QModel, Quick, QTransform } from '@cartago-git/quickmodel';

// Define serialization interface (JSON-compatible types)
interface IUser {
  id: number;
  name: string;
  email: string;
  balance: string;      // bigint serializes to string
  createdAt: string;    // Date serializes to ISO string
}

// Define runtime interface (transformed types)
interface IUserTransform {
  id: number;
  name: string;
  email: string;
  balance: bigint;
  createdAt: Date;
}

// Create model specifying which types need transformation
@Quick({
  balance: BigInt,
  createdAt: Date
})
class User extends QModel<IUser> implements QTransform<IUser, IUserTransform> {
  id!: number;
  name!: string;
  email!: string;
  balance!: bigint;      // Runtime type
  createdAt!: Date;      // Runtime type
}

// Use with native JavaScript/TypeScript types
const user = new User({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  balance: 999999999999999999n,    // Pass bigint literal
  createdAt: new Date(),            // Pass Date instance
});

// Access properties - fully typed
console.log(user.balance);    // bigint: 999999999999999999n
console.log(user.createdAt);  // Date object

// Serialize to JSON-compatible format
const json = user.toInterface();
console.log(json.balance);    // string: "999999999999999999"
console.log(json.createdAt);  // string: "2026-01-08T..."
```

### Core Principle

**QuickModel uses two interfaces pattern:**
- **`IUser`**: Serialization interface (JSON-compatible types: `string`, `number`, etc.)
- **`IUserTransform`**: Runtime interface (transformed types: `Date`, `bigint`, `RegExp`)
- **`@Quick({})`**: Specify which properties need transformation
- **`QTransform<IUser, IUserTransform>`**: Type-safe contract between both interfaces

**Automatic transformations:**
- Pass native instances when creating models (`new Date()`, `1000n`, `/regex/gi`)
- Get proper types when accessing properties (Date, bigint, RegExp)
- Automatic serialization to JSON with `toInterface()`
- Type-safe with both runtime and compile-time checks

## 🔧 Supported Types

QuickModel automatically handles these JavaScript/TypeScript types:

### Primitives
- `string`, `number`, `boolean` - Passed through as-is

### Special Types (Automatic Detection)
- `Date` → ISO string serialization
- `BigInt` → String serialization  
- `RegExp` → Structured format with source and flags
- `Symbol` → Symbol.for() key serialization
- `Error` → String format with name and message
- `URL` → href string
- `URLSearchParams` → Query string

### Collections
- `Array<T>` → Array with transformed elements
- `Map<K,V>` → Object with __type marker
- `Set<T>` → Array with __type marker

### Binary Data
- `ArrayBuffer`, `Int8Array`, `Uint8Array`, `Int16Array`, `Uint16Array`
- `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array`
- `BigInt64Array`, `BigUint64Array`
- `DataView`

### Nested Models
- Any class extending `QModel` is automatically handled recursively

## 📚 Advanced Examples

### Nested Models

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IAddress {
  street: string;
  city: string;
  country: string;
}

interface IUser {
  name: string;
  address: IAddress;
  createdAt: Date;
}

interface IUserTransform {
  name: string;
  address: IAddress;
  createdAt: string;
}

@Quick({})
class Address extends QModel<IAddress> implements IAddress {
  street!: string;
  city!: string;
  country!: string;
}

@Quick({})
class User extends QModel<IUser> implements IUser, IUserTransform {
  name!: string;
  address!: Address;
  createdAt!: Date;
}

// Use with nested data
const user = new User({
  name: 'John',
  address: new Address({
    street: '123 Main St',
    city: 'NYC',
    country: 'USA'
  }),
  createdAt: new Date()
});

// Automatic nested serialization
const json = user.toInterface();
// json.address is a plain object
// json.createdAt is an ISO string
```

### Arrays and Collections

```typescript
interface IPost {
  title: string;
  tags: string[];
  dates: Date[];
  metadata: Map<string, any>;
}

interface IPostTransform {
  title: string;
  tags: string[];
  dates: string[];
  metadata: Record<string, any>;
}

@Quick({})
class Post extends QModel<IPost> implements IPost, IPostTransform {
  title!: string;
  tags!: string[];
  dates!: Date[];
  metadata!: Map<string, any>;
}

const post = new Post({
  title: 'My Post',
  tags: ['typescript', 'nodejs'],
  dates: [new Date('2024-01-01'), new Date('2024-01-02')],
  metadata: new Map([['views', 100], ['likes', 50]])
});
```

### Binary Data

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IBinaryData {
  data: Int8Array;
  buffer: ArrayBuffer;
}

interface IBinaryDataTransform {
  data: number[];
  buffer: number[];
}

@Quick({})
class BinaryData extends QModel<IBinaryData> implements IBinaryData, IBinaryDataTransform {
  data!: Int8Array;
  buffer!: ArrayBuffer;
}
```

## 🔌 Extensibility

### Add Custom Transformer

```typescript
import { IQTransformer, IQTransformContext, qTransformerRegistry } from '@cartago-git/quickmodel';

// 1. Create transformer
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

// 4. Use in models
import { QModel, QType } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';

class Website extends QModel<IWebsite> implements QInterface<IWebsite> {
  @QType(CustomURLField) url!: URL;
}
```

## 🎯 Arquitectura SOLID

Este paquete implementa los 5 principios SOLID:

- **S**ingle Responsibility: Cada servicio/clase tiene una responsabilidad
- **O**pen/Closed: Extensible vía registry sin modificar código
- **L**iskov Substitution: Transformers intercambiables
- **I**nterface Segregation: Interfaces específicas (IQTransformer, IQSerializer, etc.)
- **D**ependency Inversion: Servicios dependen de abstracciones

[Ver documentación detallada](./SOLID-ARCHITECTURE.md)

## 📖 API Reference

### QModel<TInterface>

Base class for all models.

**Methods:**

- `toInterface(): TInterface` - Serializes to plain interface
- `toJSON(): string` - Serializes to JSON string
- `static fromInterface<T>(data: any): T` - Creates instance from interface
- `static fromJSON<T>(json: string): T` - Creates instance from JSON

### Decorators

- `@QType()` - Field decorator for auto-detectable types
- `@QType(Symbol)` - Decorator with specific type (QBigInt, etc.)
- `@QType(ModelClass)` - Decorator for model arrays
- `@QType('string-literal')` - Decorator with string literal (IntelliSense support)

### Registries

- `qTransformerRegistry` - Global transformer registry
- `qValidatorRegistry` - Global validator registry

## 🧪 Testing

```bash
# Ejecutar tests
bun test

# Ejecutar todos los tests
bun run test:all
```

## 📝 TypeScript Configuration

This package **REQUIRES** decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 Licencia

MIT © 2026 Cartago

## 📚 Documentation

### For Users

- **[SOLID Architecture](docs/SOLID-ARCHITECTURE.md)** - Detailed system architecture and applied SOLID principles
- **[Installation Guide](docs/INSTALLATION.md)** - Complete installation guide, project usage and publishing

### For Developers

- **[Development Guide](docs/README-DEV.md)** - Guide for contributing to package development
- **[Changelog](CHANGELOG)** - Version history and changes

### Resources

- **[Cleanup Summary](docs/CLEANUP-SUMMARY.md)** - Summary of the last cleanup and organization
- **[Examples](models/examples/)** - Example models (SimpleModel, CollectionsModel, NestedModel, BinaryModel, ComplexModel)

## 🔗 Enlaces

- [GitHub Repository](https://github.com/CartagoGit/quickmodel)
- [Report Issues](https://github.com/CartagoGit/quickmodel/issues)
- [NPM Package](https://www.npmjs.com/package/@cartago-git/quickmodel)

---

Hecho con ❤️ siguiendo principios SOLID
