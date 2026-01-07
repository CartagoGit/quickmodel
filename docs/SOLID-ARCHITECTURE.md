# Arquitectura SOLID - Sistema de Modelos

## 📋 Índice

1. [Principios SOLID Aplicados](#principios-solid)
2. [Estructura del Proyecto](#estructura)
3. [Componentes Principales](#componentes)
4. [Flujo de Datos](#flujo)
5. [Extensibilidad](#extensibilidad)

---

## 🎯 Principios SOLID

### **S - Single Responsibility Principle**

Cada clase tiene una única responsabilidad:

- `QuickModel`: Orquestación de serialización/deserialización
- `ModelSerializer`: Solo serializa modelos a interfaces
- `ModelDeserializer`: Solo deserializa interfaces a modelos
- `ValidationService`: Solo valida datos
- `TransformerRegistry`: Solo gestiona registro de transformers
- `ValidatorRegistry`: Solo gestiona registro de validadores

### **O - Open/Closed Principle**

El sistema está **abierto para extensión, cerrado para modificación**:

```typescript
// ✅ Agregar nuevo transformer SIN modificar QuickModel
const customTransformer = new MyCustomTransformer();
transformerRegistry.register('custom', customTransformer);
```

### **L - Liskov Substitution Principle**

Todos los transformers son **intercambiables**:

```typescript
// Cualquier ITransformer puede sustituir a otro
interface ITransformer<TInput, TOutput> {
  transform(value: TInput, context: ITransformContext): TOutput;
  serialize(value: TOutput): TInput;
}
```

### **I - Interface Segregation Principle**

Interfaces **específicas y cohesivas**:

- `ITransformer`: Solo transformación
- `IValidator`: Solo validación
- `ISerializer`: Solo serialización
- `IDeserializer`: Solo deserialización
- `ITransformerRegistry`: Solo gestión de registry

### **D - Dependency Inversion Principle**

Dependencias en **abstracciones, no implementaciones**:

```typescript
// ✅ Depende de ITransformerRegistry (abstracción)
constructor(private readonly transformerRegistry: ITransformerRegistry) {}

// ❌ NO depende de TransformerRegistry (implementación concreta)
```

---

## 📁 Estructura del Proyecto

```
pruebas/
├── core/                          # Núcleo SOLID
│   ├── interfaces/                # Contratos (Dependency Inversion)
│   │   ├── transformer.interface.ts
│   │   ├── serializer.interface.ts
│   │   └── registry.interface.ts
│   ├── services/                  # Servicios (Single Responsibility)
│   │   ├── model-deserializer.service.ts
│   │   ├── model-serializer.service.ts
│   │   └── validation.service.ts
│   └── registry/                  # Registros (Open/Closed)
│       ├── transformer.registry.ts
│       └── validator.registry.ts
├── transformers/                  # Transformers específicos
│   ├── primitive.transformer.ts   # String, Number, Boolean
│   ├── date.transformer.ts        # Date
│   ├── bigint.transformer.ts      # BigInt
│   ├── symbol.transformer.ts      # Symbol
│   ├── regexp.transformer.ts      # RegExp
│   ├── error.transformer.ts       # Error
│   ├── typed-array.transformer.ts # TypedArrays
│   ├── buffer.transformer.ts      # ArrayBuffer, DataView
│   ├── map-set.transformer.ts     # Map, Set
│   └── bootstrap.ts               # Auto-registro
├── models/examples/               # Modelos de ejemplo
│   ├── simple.model.ts
│   ├── collections.model.ts
│   ├── nested.model.ts
│   ├── binary.model.ts
│   └── complex.model.ts
├── tests/                         # Tests organizados
│   ├── unit/                      # Tests unitarios por transformer
│   └── integration/               # Tests de integración
└── quick.model.ts                 # QuickModel (SOLID)
```

---

## 🔧 Componentes Principales

### 1. **Interfaces Core** (`core/interfaces/`)

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

### 2. **Servicios** (`core/services/`)

#### `ModelDeserializer`

- **Responsabilidad**: Convertir interfaces planas → modelos tipados
- **Inyección**: Recibe `ITransformerRegistry` como dependencia
- **Uso**:

```typescript
const deserializer = new ModelDeserializer(transformerRegistry);
const model = deserializer.deserialize(data, UserModel);
```

#### `ModelSerializer`

- **Responsabilidad**: Convertir modelos tipados → interfaces planas
- **Inyección**: Recibe `ITransformerRegistry` como dependencia
- **Uso**:

```typescript
const serializer = new ModelSerializer(transformerRegistry);
const interface = serializer.serialize(userModel);
```

#### `ValidationService`

- **Responsabilidad**: Validar modelos
- **Inyección**: Recibe `IValidatorRegistry` como dependencia
- **Uso**:

```typescript
const validator = new ValidationService(validatorRegistry);
const errors = validator.validate(model, UserModel);
```

### 3. **Registros** (`core/registry/`)

#### `TransformerRegistry`

```typescript
// Singleton global
export const transformerRegistry = new TransformerRegistry();

// Registrar transformers
transformerRegistry.register('date', new DateTransformer());
transformerRegistry.register(BigIntField, new BigIntTransformer());
```

#### `ValidatorRegistry`

```typescript
// Singleton global
export const validatorRegistry = new ValidatorRegistry();

// Registrar validadores
validatorRegistry.register('string', new StringValidator());
```

### 4. **QuickModel** (`quick.model.ts`)

```typescript
export abstract class QuickModel<TInterface> {
  // Inyección de dependencias (static)
  private static readonly deserializer = new ModelDeserializer(transformerRegistry);
  private static readonly serializer = new ModelSerializer(transformerRegistry);

  constructor(data: TInterface) {
    /* ... */
  }

  toInterface(): TInterface {
    return QuickModel.serializer.serialize(this);
  }

  toJSON(): string {
    return QuickModel.serializer.serializeToJson(this);
  }

  static fromInterface<T>(data: any): T {
    return QuickModel.deserializer.deserialize(data, this);
  }
}
```

---

## 🔄 Flujo de Datos

### Deserialización (Interface → Model)

```
1. Usuario crea modelo:
   new User({ id: '1', createdAt: '2024-01-01' })

2. QuickModel.constructor() guarda data en __tempData

3.  decorator llama initialize()

4. initialize() delega a ModelDeserializer

5. ModelDeserializer itera propiedades:
   - Lee metadata de @Field()
   - Busca transformer en registry
   - Aplica transform() con contexto

6. Retorna instancia del modelo con tipos correctos:
   { id: '1', createdAt: Date(2024-01-01) }
```

### Serialización (Model → Interface)

```
1. Usuario llama model.toInterface()

2. QuickModel delega a ModelSerializer

3. ModelSerializer itera propiedades:
   - Detecta tipo del valor
   - Busca transformer en registry
   - Aplica serialize()

4. Retorna interfaz plana:
   { id: '1', createdAt: '2024-01-01T00:00:00.000Z' }
```

---

## 🔌 Extensibilidad

### Agregar Nuevo Transformer

```typescript
// 1. Crear transformer (implementa ITransformer)
class UUIDTransformer implements ITransformer<string, UUID> {
  transform(value: string, context: ITransformContext): UUID {
    return UUID.parse(value);
  }

  serialize(value: UUID): string {
    return value.toString();
  }
}

// 2. Registrar
export const UUIDField = Symbol('UUID');
transformerRegistry.register(UUIDField, new UUIDTransformer());

// 3. Usar en modelo

class User extends QuickModel<IUser> {
  @Field(UUIDField) id!: UUID;
}
```

### Agregar Nuevo Validador

```typescript
// 1. Crear validador (implementa IValidator)
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

// 2. Registrar
validatorRegistry.register('email', new EmailValidator());
```

### Crear Servicio Personalizado

```typescript
// Implementa interfaces, usa inyección de dependencias
class CustomSerializer implements ISerializer<Model, Interface> {
  constructor(private readonly registry: ITransformerRegistry) {}

  serialize(model: Model): Interface {
    // Implementación custom
  }
}

// Uso con inyección
const customSerializer = new CustomSerializer(transformerRegistry);
```

---

## ✅ Beneficios de SOLID

### 1. **Mantenibilidad**

- Cambios aislados: modificar un transformer no afecta otros
- Código predecible: cada clase hace una cosa

### 2. **Testabilidad**

- Tests unitarios: cada transformer se prueba independientemente
- Mocks fáciles: inyección de dependencias permite mock de registries

### 3. **Escalabilidad**

- Agregar tipos: solo crear transformer y registrar
- Sin modificar QuickModel ni servicios existentes

### 4. **Reusabilidad**

- Transformers compartidos entre proyectos
- Servicios desacoplados reutilizables

### 5. **Claridad**

- Responsabilidades explícitas
- Flujo de datos claro
- Menos acoplamiento

---

## 🚀 Próximos Pasos

1. ✅ Refactorizar todos los transformers a nuevas interfaces
2. ⏳ Crear tests unitarios para cada transformer
3. ⏳ Crear tests de integración end-to-end
4. ⏳ Documentar cada transformer individualmente
5. ⏳ Crear ejemplos de extensión
6. ⏳ Migrar modelos existentes a nueva arquitectura
