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

## 🎭 Sistema de Mocks para Testing

```typescript
// 6 tipos de mocks disponibles
const user1 = User.mockEmpty();    // Valores vacíos
const user2 = User.mockRandom();   // Aleatorios con faker
const user3 = User.mockSample();   // Predecibles para tests
const user4 = User.mock();         // Alias de mockRandom()

// Arrays de mocks
const users = User.mockArray(10);  // 10 usuarios aleatorios
const team = User.mockArray(5, 'sample', (i) => ({ 
  name: `Dev${i}` 
}));

// Interfaces mock (objetos planos)
const userData = User.mockInterface();          // Sin instanciar
const usersData = User.mockInterfaceArray(50); // Para seeders

// Ver documentación completa: docs/MOCK-GENERATOR.md
```

## 🔧 Tipos Soportados

### @Field() Decorator Usage Forms

Each type supports **up to 3 equivalent forms**:

```typescript
interface IModel {
  pattern: RegExp;
}

class Model extends QuickModel<IModel> {
  // Example of the 3 forms for RegExp:
  @Field(RegExpField)   pattern!: RegExp;  // 1. Symbol (forma original)
  @Field('regexp')      pattern!: RegExp;  // 2. String literal ✨ (IntelliSense)
  @Field(RegExp)        pattern!: RegExp;  // 3. Constructor nativo
}
```

**💡 String Literals with IntelliSense**: When typing `@Field('` TypeScript automatically suggests:
```
@Field('
  ↓
  'bigint'         - Para bigint
  'symbol'         - Para symbol
  'regexp'         - Para RegExp
  'error'          - Para Error
  'url'            - Para URL
  'int8array'      - Para Int8Array
  'float32array'   - Para Float32Array
  'bigint64array'  - Para BigInt64Array
  ... y 30+ tipos más
```

| Tipo                 | Symbol                   | String Literal ✨     | Constructor         | Serialización          |
| -------------------- | ------------------------ | -------------------- | ------------------- | ---------------------- |
| `string`             | -                        | `'string'`           | -                   | Directo                |
| `number`             | -                        | `'number'`           | -                   | Directo                |
| `boolean`            | -                        | `'boolean'`          | -                   | Directo                |
| `Date`               | -                        | `'date'`             | `Date`              | ISO string             |
| `BigInt`             | `BigIntField`            | `'bigint'`           | -                   | string                 |
| `Symbol`             | `SymbolField`            | `'symbol'`           | -                   | string (Symbol.for)    |
| `RegExp`             | `RegExpField`            | `'regexp'`           | `RegExp`            | `/pattern/flags`       |
| `Error`              | `ErrorField`             | `'error'`            | `Error`             | `Name: message`        |
| `URL`                | `URLField`               | `'url'`              | `URL`               | href                   |
| `URLSearchParams`    | `URLSearchParamsField`   | `'urlsearchparams'`  | `URLSearchParams`   | string                 |
| `Map<K,V>`           | -                        | `'map'`              | `Map`               | Record<K,V>            |
| `Set<T>`             | -                        | `'set'`              | `Set`               | T[]                    |
| `Int8Array`          | `Int8ArrayField`         | `'int8array'`        | `Int8Array`         | number[]               |
| `Uint8Array`         | `Uint8ArrayField`        | `'uint8array'`       | `Uint8Array`        | number[]               |
| `Float32Array`       | `Float32ArrayField`      | `'float32array'`     | `Float32Array`      | number[]               |
| `BigInt64Array`      | `BigInt64ArrayField`     | `'bigint64array'`    | `BigInt64Array`     | string[]               |
| `ArrayBuffer`        | `ArrayBufferField`       | `'arraybuffer'`      | -                   | number[]               |
| `DataView`           | `DataViewField`          | `'dataview'`         | -                   | number[]               |
| `Enum` (TypeScript)  | -                        | -                    | -                   | Directo                |
| Modelo anidado       | -                        | -                    | `ModelClass`        | Recursivo              |
| `Array<Modelo>`      | -                        | -                    | `ModelClass`        | Array recursivo        |

> 💡 **Recomendación**: Usa **string literals** (`@Field('bigint')`) para obtener IntelliSense con todos los tipos disponibles mientras escribes.

**+10 TypedArrays más** (Int16Array, Uint16Array, Int32Array, Uint32Array, Float64Array, BigInt64Array, BigUint64Array)

## 📚 Ejemplos Avanzados

### Modelos Anidados

```typescript
class Address extends QuickModel<IAddress> {
  @Field() street!: string;
  @Field() city!: string;
}

class Company extends QuickModel<ICompany> {
  @Field() name!: string;
  @Field() address!: Address;
  @Field(Address) offices!: Address[];
}
```

### Colecciones

```typescript
class Config extends QuickModel<IConfig> {
  @Field() tags!: string[];
  @Field() metadata!: Map<string, any>;
  @Field() uniqueIds!: Set<number>;
}
```

### Datos Binarios

```typescript
import { Int8ArrayField, ArrayBufferField } from '@cartago-git/quickmodel';

class BinaryData extends QuickModel<IBinaryData> {
  @Field(Int8ArrayField) data!: Int8Array;
  @Field(ArrayBufferField) buffer!: ArrayBuffer;
}
```

## 🔌 Extensibilidad

### Agregar Transformer Personalizado

```typescript
import { ITransformer, ITransformContext, transformerRegistry } from '@cartago-git/quickmodel';

// 1. Crear transformer
class URLTransformer implements ITransformer<string, URL> {
  transform(value: string, context: ITransformContext): URL {
    return new URL(value);
  }

  serialize(value: URL): string {
    return value.toString();
  }
}

// 2. Crear símbolo
export const URLField = Symbol('URL');

// 3. Registrar
transformerRegistry.register(URLField, new URLTransformer());

// 4. Usar en modelos

class Website extends QuickModel<IWebsite> {
  @Field(URLField) url!: URL;
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

### QuickModel<TInterface>

Clase base para todos los modelos.

**Métodos:**

- `toInterface(): TInterface` - Serializa a interfaz plana
- `toJSON(): string` - Serializa a JSON string
- `static fromInterface<T>(data: any): T` - Crea instancia desde interfaz
- `static fromJSON<T>(json: string): T` - Crea instancia desde JSON

### Decoradores

- `` - Decorador de clase para auto-inicialización
- `@Field()` - Decorador de campo para tipos auto-detectables
- `@Field(Symbol)` - Decorador con tipo específico (BigIntField, etc.)
- `@Field(ModelClass)` - Decorador para arrays de modelos

### Registries

- `transformerRegistry` - Registry global de transformers
- `validatorRegistry` - Registry global de validadores

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

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT © 2026 Cartago

## � Documentación

### Para Usuarios

- **[SOLID Architecture](docs/SOLID-ARCHITECTURE.md)** - Arquitectura detallada del sistema y principios SOLID aplicados
- **[Installation Guide](docs/INSTALLATION.md)** - Guía completa de instalación, uso en proyectos y publicación

### Para Desarrolladores

- **[Development Guide](docs/README-DEV.md)** - Guía para contribuir al desarrollo del paquete
- **[Changelog](CHANGELOG)** - Historial de versiones y cambios

### Recursos

- **[Cleanup Summary](docs/CLEANUP-SUMMARY.md)** - Resumen de la última limpieza y organización
- **[Examples](models/examples/)** - Modelos de ejemplo (SimpleModel, CollectionsModel, NestedModel, BinaryModel, ComplexModel)

## 🔗 Enlaces

- [GitHub Repository](https://github.com/CartagoGit/quickmodel)
- [Report Issues](https://github.com/CartagoGit/quickmodel/issues)
- [NPM Package](https://www.npmjs.com/package/@cartago-git/quickmodel)

---

Hecho con ❤️ siguiendo principios SOLID
