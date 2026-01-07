# SOLID Architecture - Model System

## 📋 Table of Contents

1. [Applied SOLID Principles](#solid-principles)
2. [Project Structure](#structure)
3. [Main Components](#components)
4. [Data Flow](#flow)
5. [Extensibility](#extensibility)

---

## 🎯 SOLID Principles

### **S - Single Responsibility Principle**

Each class has a single responsibility:

- `QModel`: Orchestration of serialization/deserialization
- `ModelSerializer`: Only serializes models to interfaces
- `ModelDeserializer`: Only deserializes interfaces to models
- `ValidationService`: Only validates data
- `TransformerRegistry`: Only manages transformer registration
- `ValidatorRegistry`: Only manages validator registration

### **O - Open/Closed Principle**

The system is **open for extension, closed for modification**:

```typescript
// ✅ Add new transformer WITHOUT modifying QModel
const customTransformer = new MyCustomTransformer();
transformerRegistry.register('custom', customTransformer);
```

### **L - Liskov Substitution Principle**

All transformers are **interchangeable**:

```typescript
// Any ITransformer can substitute another
interface ITransformer<TInput, TOutput> {
  transform(value: TInput, context: ITransformContext): TOutput;
  serialize(value: TOutput): TInput;
}
```

### **I - Interface Segregation Principle**

**Specific and cohesive** interfaces:

- `ITransformer`: Only transformation
- `IValidator`: Only validation
- `ISerializer`: Only serialization
- `IDeserializer`: Only deserialization
- `ITransformerRegistry`: Only registry management

### **D - Dependency Inversion Principle**

Dependencies on **abstractions, not implementations**:

```typescript
// ✅ Depends on ITransformerRegistry (abstraction)
constructor(private readonly transformerRegistry: ITransformerRegistry) {}

// ❌ NOT depends on TransformerRegistry (concrete implementation)
```

---

## 📁 Project Structure

```
pruebas/
├── core/                          # SOLID core
│   ├── interfaces/                # Contracts (Dependency Inversion)
│   │   ├── transformer.interface.ts
│   │   ├── serializer.interface.ts
│   │   └── registry.interface.ts
│   ├── services/                  # Services (Single Responsibility)
│   │   ├── model-deserializer.service.ts
│   │   ├── model-serializer.service.ts
│   │   └── validation.service.ts
│   └── registry/                  # Registries (Open/Closed)
│       ├── transformer.registry.ts
│       └── validator.registry.ts
├── transformers/                  # Specific transformers
│   ├── primitive.transformer.ts   # String, Number, Boolean
│   ├── date.transformer.ts        # Date
│   ├── bigint.transformer.ts      # BigInt
│   ├── symbol.transformer.ts      # Symbol
│   ├── regexp.transformer.ts      # RegExp
│   ├── error.transformer.ts       # Error
│   ├── typed-array.transformer.ts # TypedArrays
│   ├── buffer.transformer.ts      # ArrayBuffer, DataView
│   ├── map-set.transformer.ts     # Map, Set
│   └── bootstrap.ts               # Auto-registration
├── models/examples/               # Example models
│   ├── simple.model.ts
│   ├── collections.model.ts
│   ├── nested.model.ts
│   ├── binary.model.ts
│   └── complex.model.ts
├── tests/                         # Organized tests
│   ├── unit/                      # Unit tests per transformer
│   └── integration/               # Integration tests
└── quick.model.ts                 # QModel (SOLID)
```

---

## 🔧 Main Components

### 1. **Core Interfaces** (`core/interfaces/`)

#### `ITransformer<TInput, TOutput>`

```typescript
interface ITransformer<TInput, TOutput> {
  transform(value: TInput, context: ITransformContext): TOutput;
  serialize(value: TOutput): TInput;
}
```

#### `IValidator`

```typescript
interface IValidator {
  validate(value: any, context: IValidationContext): IValidationResult;
}
```

#### `ITransformerRegistry`

```typescript
interface ITransformerRegistry {
  register(typeKey: string | symbol, transformer: ITransformer): void;
  get(typeKey: string | symbol): ITransformer | undefined;
  has(typeKey: string | symbol): boolean;
  unregister(typeKey: string | symbol): void;
}
```

### 2. **Services** (`core/services/`)

#### `ModelDeserializer`

- **Responsibility**: Convert plain interfaces → typed models
- **Injection**: Receives `ITransformerRegistry` as dependency
- **Usage**:

```typescript
const deserializer = new ModelDeserializer(transformerRegistry);
const model = deserializer.deserialize(data, UserModel);
```

#### `ModelSerializer`

- **Responsibility**: Convert typed models → plain interfaces
- **Injection**: Receives `ITransformerRegistry` as dependency
- **Usage**:

```typescript
const serializer = new ModelSerializer(transformerRegistry);
const interface = serializer.serialize(userModel);
```

#### `ValidationService`

- **Responsibility**: Validate models
- **Injection**: Receives `IValidatorRegistry` as dependency
- **Usage**:

```typescript
const validator = new ValidationService(validatorRegistry);
const errors = validator.validate(model, UserModel);
```

### 3. **Registries** (`core/registry/`)

#### `TransformerRegistry`

```typescript
// Global singleton
export const transformerRegistry = new TransformerRegistry();

// Register transformers
transformerRegistry.register('date', new DateTransformer());
transformerRegistry.register(QBigInt, new BigIntTransformer());
```

#### `ValidatorRegistry`

```typescript
// Global singleton
export const validatorRegistry = new ValidatorRegistry();

// Register validators
validatorRegistry.register('string', new StringValidator());
```

### 4. **QModel** (`quick.model.ts`)

```typescript
export abstract class QModel<TInterface> {
  // Dependency injection (static)
  private static readonly deserializer = new ModelDeserializer(transformerRegistry);
  private static readonly serializer = new ModelSerializer(transformerRegistry);

  constructor(data: TInterface) {
    /* ... */
  }

  toInterface(): TInterface {
    return QModel.serializer.serialize(this);
  }

  toJSON(): string {
    return QModel.serializer.serializeToJson(this);
  }

  static fromInterface<T>(data: any): T {
    return QModel.deserializer.deserialize(data, this);
  }
}
```

---

## 🔄 Data Flow

### Deserialization (Interface → Model)

```
1. User creates model:
   new User({ id: '1', createdAt: '2024-01-01' })

2. QModel.constructor() saves data in __tempData

3.  decorator calls initialize()

4. initialize() delegates to ModelDeserializer

5. ModelDeserializer iterates properties:
   - Reads metadata from @QType()
   - Searches transformer in registry
   - Applies transform() with context

6. Returns model instance with correct types:
   { id: '1', createdAt: Date(2024-01-01) }
```

### Serialization (Model → Interface)

```
1. User calls model.toInterface()

2. QModel delegates to ModelSerializer

3. ModelSerializer iterates properties:
   - Detects value type
   - Searches transformer in registry
   - Applies serialize()

4. Returns plain interface:
   { id: '1', createdAt: '2024-01-01T00:00:00.000Z' }
```

---

## 🔌 Extensibility

### Add New Transformer

```typescript
// 1. Create transformer (implements ITransformer)
class UUIDTransformer implements ITransformer<string, UUID> {
  transform(value: string, context: ITransformContext): UUID {
    return UUID.parse(value);
  }

  serialize(value: UUID): string {
    return value.toString();
  }
}

// 2. Register
export const UUIDField = Symbol('UUID');
transformerRegistry.register(UUIDField, new UUIDTransformer());

// 3. Use in model
import { QModel, QType } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';

class User extends QModel<IUser> implements QInterface<IUser> {
  @QType(UUIDField) id!: UUID;
}
```

### Add New Validator

```typescript
// 1. Create validator (implements IValidator)
class EmailValidator implements IValidator {
  validate(value: any, context: IValidationContext): IValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof value === 'string' && emailRegex.test(value)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Invalid email format`,
    };
  }
}

// 2. Register
validatorRegistry.register('email', new EmailValidator());
```

### Create Custom Service

```typescript
// Implements interfaces, uses dependency injection
class CustomSerializer implements ISerializer<Model, Interface> {
  constructor(private readonly registry: ITransformerRegistry) {}

  serialize(model: Model): Interface {
    // Custom implementation
  }
}

// Usage with injection
const customSerializer = new CustomSerializer(transformerRegistry);
```

---

## ✅ SOLID Benefits

### 1. **Maintainability**

- Isolated changes: modifying one transformer doesn't affect others
- Predictable code: each class does one thing

### 2. **Testability**

- Unit tests: each transformer is tested independently
- Easy mocks: dependency injection allows mocking registries

### 3. **Scalability**

- Add types: just create transformer and register
- Without modifying QModel or existing services

### 4. **Reusability**

- Transformers shared between projects
- Decoupled reusable services

### 5. **Clarity**

- Explicit responsibilities
- Clear data flow
- Less coupling

---

## 🚀 Next Steps

1. ✅ Refactor all transformers to new interfaces
2. ⏳ Create unit tests for each transformer
3. ⏳ Create end-to-end integration tests
4. ⏳ Document each transformer individually
5. ⏳ Create extension examples
6. ⏳ Migrate existing models to new architecture
