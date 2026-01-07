# @cartago-git/quickmodel

Sistema profesional de serialización/deserialización de modelos TypeScript con arquitectura **SOLID**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![SOLID](https://img.shields.io/badge/Architecture-SOLID-green.svg)]()

> 📚 **[Ver Índice Completo de Documentación](docs/README.md)**

## ✨ Características

- 🏗️ **Arquitectura SOLID** completa
- 🔄 **30+ tipos JavaScript/TypeScript** soportados (Date, BigInt, Symbol, RegExp, Error, URL, TypedArrays, Enums, etc.)
- 🎯 **Type-safe** con TypeScript estricto
- ✅ **Validación automática** en runtime
- 📦 **Modelos anidados** infinitos
- 🔌 **Extensible** vía registry pattern
- 🧪 **100% testado**
- 📚 **Documentación completa**

## 📦 Instalación

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

## 🚀 Uso Básico

### 1. Definir Modelo

```typescript
import { QuickModel, Field, QuickType, BigIntField } from '@cartago-git/quickmodel';

interface IUser {
  id: string;
  name: string;
  balance: string; // BigInt serializado
  createdAt: string; // Date serializado
}

type UserTransforms = {
  balance: bigint;
  createdAt: Date;
};

class User extends QuickModel<IUser> implements QuickType<IUser, UserTransforms> {
  @Field() id!: string;
  @Field() name!: string;
  @Field(BigIntField) balance!: bigint;
  @Field() createdAt!: Date;
}
```

### 2. Usar Modelo

```typescript
// Crear desde interfaz
const user = new User({
  id: '123',
  name: 'John Doe',
  balance: '999999999999999999',
  createdAt: '2024-01-01T00:00:00.000Z',
});

console.log(user.balance); // bigint: 999999999999999999n
console.log(user.createdAt); // Date object

// Serializar a interfaz
const data = user.toInterface();
console.log(data.balance); // string: "999999999999999999"
console.log(data.createdAt); // string: "2024-01-01T00:00:00.000Z"

// JSON round-trip
const json = user.toJSON();
const user2 = User.fromJSON(json);
console.log(user2.balance === user.balance); // true
```

## 🔧 Tipos Soportados

| Tipo                 | Decorador                                    | Serialización          |
| -------------------- | -------------------------------------------- | ---------------------- |
| `string`             | `@Field()`                                   | Directo                |
| `number`             | `@Field()`                                   | Directo                |
| `boolean`            | `@Field()`                                   | Directo                |
| `Date`               | `@Field()`                                   | ISO string             |
| `BigInt`             | `@Field(BigIntField)`                        | string                 |
| `Symbol`             | `@Field(SymbolField)`                        | string (Symbol.for)    |
| `RegExp`             | `@Field(RegExp)` o `@Field(RegExpField)`     | string (`/pattern/flags`) |
| `Error`              | `@Field(Error)` o `@Field(ErrorField)`       | string (`Name: message`) |
| `URL`                | `@Field(URL)` o `@Field(URLField)`           | string (href)          |
| `URLSearchParams`    | `@Field(URLSearchParams)` o `@Field(URLSearchParamsField)` | string |
| `Map<K,V>`           | `@Field()`                                   | Record<K,V>            |
| `Set<T>`             | `@Field()`                                   | T[]                    |
| `Int8Array`          | `@Field(Int8Array)` o `@Field(Int8ArrayField)` | number[]             |
| `Uint8Array`         | `@Field(Uint8Array)` o `@Field(Uint8ArrayField)` | number[]           |
| `Float32Array`       | `@Field(Float32Array)` o `@Field(Float32ArrayField)` | number[]         |
| `BigInt64Array`      | `@Field(BigInt64Array)` o `@Field(BigInt64ArrayField)` | string[]         |
| `ArrayBuffer`        | `@Field(ArrayBufferField)`                   | number[]               |
| `DataView`           | `@Field(DataViewField)`                      | number[]               |
| `Enum` (TypeScript)  | `@Field()`                                   | Directo                |
| Modelo anidado       | `@Field(ModelClass)`                         | Recursivo              |
| `Array<Modelo>`      | `@Field(ModelClass)`                         | Array recursivo        |

> 💡 **Nota**: Los tipos built-in ahora soportan ambas formas: constructor nativo (`@Field(RegExp)`) o symbol especial (`@Field(RegExpField)`). Ambas son equivalentes.

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

Este paquete **REQUIERE** decoradores en tu `tsconfig.json`:

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
