# 🏗️ @cartago-git/quickmodel - Development Guide

> **Nota**: Este es el README para desarrollo. El README público del paquete npm está en [README.md](README.md)

Sistema completo de serialización/deserialización de modelos TypeScript siguiendo principios **SOLID**.

## 📋 Estructura del Proyecto

```
pruebas/
├── 📄 README.md                          # Este archivo
├── 📄 SOLID-ARCHITECTURE.md              # Documentación detallada SOLID
│
├── 🏛️ core/                              # Núcleo SOLID
│   ├── interfaces/                       # Contratos (I, D)
│   │   ├── transformer.interface.ts      # ITransformer, IValidator
│   │   ├── serializer.interface.ts       # ISerializer, IDeserializer
│   │   └── registry.interface.ts         # ITransformerRegistry
│   ├── services/                         # Servicios (S)
│   │   ├── model-deserializer.service.ts
│   │   ├── model-serializer.service.ts
│   │   └── validation.service.ts
│   └── registry/                         # Registros (O)
│       ├── transformer.registry.ts
│       └── validator.registry.ts
│
├── 🔄 transformers/                      # Transformers (S, L)
│   ├── types.ts                          # Símbolos de tipos
│   ├── primitive.transformer.ts          # String, Number, Boolean
│   ├── date.transformer.ts               # Date
│   ├── bigint.transformer.ts             # BigInt
│   ├── symbol.transformer.ts             # Symbol
│   ├── regexp.transformer.ts             # RegExp
│   ├── error.transformer.ts              # Error
│   ├── typed-array.transformer.ts        # TypedArrays (10 tipos)
│   ├── buffer.transformer.ts             # ArrayBuffer, DataView
│   ├── map-set.transformer.ts            # Map, Set
│   ├── bootstrap.ts                      # Auto-registro
│   └── index.ts                          # Exportaciones
│
├── 📦 models/                            # Modelos de ejemplo
│   └── examples/
│       ├── simple.model.ts               # Primitivos + BigInt + Symbol
│       ├── collections.model.ts          # Arrays, Maps, Sets
│       ├── nested.model.ts               # Modelos anidados
│       ├── binary.model.ts               # TypedArrays, Buffers
│       ├── complex.model.ts              # Combinación de todos
│       └── index.ts
│
├── 🧪 tests/                             # Tests organizados
│   ├── unit/                             # Tests unitarios individuales
│   └── integration/                      # Tests de integración
│
├── 🚀 run/                               # Ejecutables de test
│   ├── test-all.ts                       # Ejecuta TODOS los tests
│   ├── test-unit.ts                      # Solo tests unitarios
│   ├── test-integration.ts               # Solo tests de integración
│   └── test-each.ts                      # Cada test individual
│
├── 📦 base.model.solid.ts                # QuickModel SOLID
├── 📦 base.model.ts                      # QuickModel v2 (compatible)
└── 📦 base.model.old.ts                  # Backup versión anterior
```

## 🎯 Principios SOLID Aplicados

| Principio                 | Implementación                                        |
| ------------------------- | ----------------------------------------------------- |
| **S**ingle Responsibility | Cada clase/servicio tiene UNA responsabilidad         |
| **O**pen/Closed           | Extensible (nuevos transformers) sin modificar código |
| **L**iskov Substitution   | Todos los transformers son intercambiables            |
| **I**nterface Segregation | Interfaces específicas y cohesivas                    |
| **D**ependency Inversion  | Dependencias en abstracciones, no implementaciones    |

## 🚀 Uso Rápido

### 1. Crear un Modelo

```typescript
import { QuickModel, Field, QuickType } from './base.model.solid';
import { BigIntField } from './transformers';

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

class User extends QuickModel<IUser> implements QuickType<IUser, UserTransforms> {
  @Field() id!: string;
  @Field() name!: string;
  @Field(BigIntField) balance!: bigint;
  @Field() createdAt!: Date;
}
```

### 2. Tipos Soportados (27 tipos + modelos anidados)

| Tipo          | Decorador                   | Ejemplo                |
| ------------- | --------------------------- | ---------------------- |
| string        | `@Field()`                  | `name!: string`        |
| number        | `@Field()`                  | `age!: number`         |
| boolean       | `@Field()`                  | `active!: boolean`     |
| Date          | `@Field()`                  | `createdAt!: Date`     |
| BigInt        | `@Field(BigIntField)`       | `balance!: bigint`     |
| Symbol        | `@Field(SymbolField)`       | `token!: symbol`       |
| RegExp        | `@Field(RegExpField)`       | `pattern!: RegExp`     |
| Error         | `@Field(ErrorField)`        | `lastError!: Error`    |
| Map           | `@Field()`                  | `metadata!: Map<K, V>` |
| Set           | `@Field()`                  | `tags!: Set<T>`        |
| Int8Array     | `@Field(Int8ArrayField)`    | `data!: Int8Array`     |
| Uint8Array    | `@Field(Uint8ArrayField)`   | `data!: Uint8Array`    |
| Float32Array  | `@Field(Float32ArrayField)` | `data!: Float32Array`  |
| ArrayBuffer   | `@Field(ArrayBufferField)`  | `buffer!: ArrayBuffer` |
| DataView      | `@Field(DataViewField)`     | `view!: DataView`      |
| Modelo        | `@Field()`                  | `owner!: User`         |
| Array<Modelo> | `@Field(ModelClass)`        | `users!: User[]`       |

## 🧪 Ejecutar Tests

```bash
# Todos los tests
bun run/test-all.ts

# Solo unitarios
bun run/test-unit.ts

# Solo integración
bun run/test-integration.ts

# Cada test individual
bun run/test-each.ts
```

## 📚 Documentación

- [SOLID-ARCHITECTURE.md](./SOLID-ARCHITECTURE.md) - Arquitectura detallada SOLID

## 🔌 Extensibilidad

### Agregar Nuevo Transformer

```typescript
// 1. Implementar ITransformer
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

// 4. Usar

class Website extends QuickModel<IWebsite> {
  @Field(URLField) url!: URL;
}
```

## 📊 Cobertura

- ✅ 27 tipos JavaScript serializables
- ✅ Modelos anidados infinitos
- ✅ Arrays de cualquier tipo
- ✅ Validación automática
- ✅ Round-trip JSON completo
- ⚠️ No serializables: WeakMap, WeakSet, Promise, Function
