# @cartago-git/quickmodel

Professional TypeScript model serialization/deserialization system with **SOLID** architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![SOLID](https://img.shields.io/badge/Architecture-SOLID-green.svg)]()

> 📚 **[See Complete Documentation Index](docs/README.md)**

## ✨ Features

- 🏗️ **Complete SOLID Architecture** with independent services
- 🔄 **30+ JavaScript/TypeScript types** supported (Date, BigInt, Symbol, RegExp, Error, URL, TypedArrays, etc.)
- 🎯 **Type-Safe Serialization**: `toInterface()` automatically returns correct serialized types
- 💡 **Type inference**: TypeScript knows that `RegExp → string`, `BigInt → string`, etc.
- ✨ **3 usage forms**: Q-Symbols, Constructors, String literals with IntelliSense
- 🎭 **Mock System**: 6 mock types + arrays with [@faker-js/faker](https://fakerjs.dev/)
- ✅ **Automatic runtime validation**
- 📦 **Infinite nested models**
- 🔌 **Extensible** via registry pattern
- 🧪 **100% tested** with 136+ expect() calls
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

## 🚀 Basic Usage

### 1. Define Model

```typescript
import { QModel, QType, QInterface, QBigInt } from '@cartago-git/quickmodel';

interface IUser {
  id: string;
  name: string;
  balance: string; // BigInt serialized
  createdAt: string; // Date serialized
}

type UserTransforms = {
  balance: bigint;
  createdAt: Date;
};

class User extends QModel<IUser> implements QInterface<IUser, UserTransforms> {
  @QType() id!: string;
  @QType() name!: string;
  // 3 equivalent forms for special types:
  @QType(QBigInt) balance!: bigint;   // Q-Symbol (recommended)
  // @QType('bigint') balance!: bigint;   // String literal (IntelliSense ✨)
  
  @QType() createdAt!: Date;              // Auto-detected
  // @QType('date') createdAt!: Date;     // String literal
  // @QType(Date) createdAt!: Date;       // Constructor
}

// 💡 Tip: Use string literals for IntelliSense!
// When writing @QType(' TypeScript will suggest all available types:
// 'bigint', 'symbol', 'regexp', 'error', 'url', 'int8array', etc.
```

### 2. Use Model

```typescript
// Create from interface
const user = new User({
  id: '123',
  name: 'John Doe',
  balance: '999999999999999999',
  createdAt: '2024-01-01T00:00:00.000Z',
});

console.log(user.balance); // bigint: 999999999999999999n
console.log(user.createdAt); // Date object

// Serialize to interface
const data = user.toInterface();
console.log(data.balance); // string: "999999999999999999"
console.log(data.createdAt); // string: "2024-01-01T00:00:00.000Z"

// JSON round-trip
const json = user.toJSON();
const user2 = User.fromJSON(json);
console.log(user2.balance === user.balance); // true
```

## 🎭 Mock System for Testing

```typescript
// 6 types of mocks available
const user1 = User.mockEmpty();    // Empty values
const user2 = User.mockRandom();   // Random with faker
const user3 = User.mockSample();   // Predictable for tests
const user4 = User.mock();         // Alias for mockRandom()

// Mock arrays
const users = User.mockArray(10);  // 10 random users
const team = User.mockArray(5, 'sample', (i) => ({ 
  name: `Dev${i}` 
}));

// Mock interfaces (plain objects)
const userData = User.mockInterface();          // Without instantiation
const usersData = User.mockInterfaceArray(50); // For seeders

// See full documentation: docs/MOCK-GENERATOR.md
```

## 🔧 Supported Types

### @QType() Decorator Usage Forms

Each type supports **up to 3 equivalent forms**:

```typescript
import { QModel, QType, QRegExp } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';

interface IModel {
  pattern: RegExp;
}

class Model extends QModel<IModel> implements QInterface<IModel> {
  // Example of the 3 forms for RegExp:
  @QType(QRegExp)   pattern!: RegExp;  // 1. Symbol (original form)
  @QType('regexp')  pattern!: RegExp;  // 2. String literal ✨ (IntelliSense)
  @QType(RegExp)    pattern!: RegExp;  // 3. Native constructor
}
```

**💡 String Literals with IntelliSense**: When typing `@QType('` TypeScript automatically suggests:
```
@QType('
  ↓
  'bigint'         - For bigint
  'symbol'         - For symbol
  'regexp'         - For RegExp
  'error'          - For Error
  'url'            - For URL
  'int8array'      - For Int8Array
  'float32array'   - For Float32Array
  'bigint64array'  - For BigInt64Array
  ... and 30+ more types
```

| Type                 | Symbol                | String Literal ✨     | Constructor         | Serialization         |
| -------------------- | --------------------- | -------------------- | ------------------- | --------------------- |
| `string`             | -                     | `'string'`           | -                   | Direct                |
| `number`             | -                     | `'number'`           | -                   | Direct                |
| `boolean`            | -                     | `'boolean'`          | -                   | Direct                |
| `Date`               | -                     | `'date'`             | `Date`              | ISO string            |
| `BigInt`             | `QBigInt`             | `'bigint'`           | -                   | string                |
| `Symbol`             | `QSymbol`             | `'symbol'`           | -                   | string (Symbol.for)   |
| `RegExp`             | `QRegExp`             | `'regexp'`           | `RegExp`            | `/pattern/flags`      |
| `Error`              | `QError`              | `'error'`            | `Error`             | `Name: message`       |
| `URL`                | `QURL`                | `'url'`              | `URL`               | href                  |
| `URLSearchParams`    | `QURLSearchParams`    | `'urlsearchparams'`  | `URLSearchParams`   | string                |
| `Map<K,V>`           | -                     | `'map'`              | `Map`               | Record<K,V>           |
| `Set<T>`             | -                     | `'set'`              | `Set`               | T[]                   |
| `Int8Array`          | `QInt8Array`          | `'int8array'`        | `Int8Array`         | number[]              |
| `Uint8Array`         | `QUint8Array`         | `'uint8array'`       | `Uint8Array`        | number[]              |
| `Float32Array`       | `QFloat32Array`       | `'float32array'`     | `Float32Array`      | number[]              |
| `BigInt64Array`      | `QBigInt64Array`      | `'bigint64array'`    | `BigInt64Array`     | string[]              |
| `ArrayBuffer`        | `QArrayBuffer`        | `'arraybuffer'`      | -                   | number[]              |
| `DataView`           | `QDataView`           | `'dataview'`         | -                   | number[]              |
| `Enum` (TypeScript)  | -                     | -                    | -                   | Direct                |
| Nested model         | -                     | -                    | `ModelClass`        | Recursive             |
| `Array<Model>`       | -                     | -                    | `ModelClass`        | Recursive array       |

> 💡 **Recommendation**: Use **string literals** (`@QType('bigint')`) to get IntelliSense with all available types while typing.

**+10 more TypedArrays** (Int16Array, Uint16Array, Int32Array, Uint32Array, Float64Array, BigInt64Array, BigUint64Array)

## 📚 Advanced Examples

### Nested Models

```typescript
import { QModel, QType } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';

class Address extends QModel<IAddress> implements QInterface<IAddress> {
  @QType() street!: string;
  @QType() city!: string;
}

class Company extends QModel<ICompany> implements QInterface<ICompany> {
  @QType() name!: string;
  @QType() address!: Address;
  @QType(Address) offices!: Address[];
}
```

### Collections

```typescript
class Config extends QModel<IConfig> implements QInterface<IConfig> {
  @QType() tags!: string[];
  @QType() metadata!: Map<string, any>;
  @QType() uniqueIds!: Set<number>;
}
```

### Binary Data

```typescript
import { QModel, QType, QInt8Array, QArrayBuffer } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';

class BinaryData extends QModel<IBinaryData> implements QInterface<IBinaryData> {
  @QType(QInt8Array) data!: Int8Array;
  @QType(QArrayBuffer) buffer!: ArrayBuffer;
}
```

## 🔌 Extensibility

### Add Custom Transformer

```typescript
import { ITransformer, ITransformContext, transformerRegistry } from '@cartago-git/quickmodel';

// 1. Create transformer
class URLTransformer implements ITransformer<string, URL> {
  transform(value: string, context: ITransformContext): URL {
    return new URL(value);
  }

  serialize(value: URL): string {
    return value.toString();
  }
}

// 2. Create symbol
export const CustomURLField = Symbol('CustomURL');

// 3. Register
transformerRegistry.register(CustomURLField, new URLTransformer());

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
- **I**nterface Segregation: Interfaces específicas (ITransformer, ISerializer, etc.)
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

- `transformerRegistry` - Global transformer registry
- `validatorRegistry` - Global validator registry

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
