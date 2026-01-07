# QuickModel Decorators - Guía de Ejemplos

Esta guía proporciona ejemplos completos de uso de los decoradores `@Quick()` y `@QType()` de QuickModel.

## 📁 Estructura de Ejemplos

```
src/examples/decorators/
├── quick/                    # Ejemplos de @Quick()
│   ├── 01-basic.example.ts
│   ├── 02-complex-types.example.ts
│   ├── 03-nested-models.example.ts
│   ├── 04-arrays-serialization.example.ts
│   ├── 05-mixed-decorators.example.ts
│   └── index.ts
├── qtype/                    # Ejemplos de @QType()
│   ├── 01-basic.example.ts
│   ├── 02-complex-types.example.ts
│   ├── 03-nested-models.example.ts
│   ├── 04-arrays.example.ts
│   ├── 05-control-and-special-cases.example.ts
│   └── index.ts
├── index.ts
└── README.md (este archivo)
```

## 🚀 Ejecutar Ejemplos

### Opción 1: Ejecutar un ejemplo específico

```bash
# Ejemplos de @Quick()
bun run src/examples/decorators/quick/01-basic.example.ts
bun run src/examples/decorators/quick/02-complex-types.example.ts
bun run src/examples/decorators/quick/03-nested-models.example.ts
bun run src/examples/decorators/quick/04-arrays-serialization.example.ts
bun run src/examples/decorators/quick/05-mixed-decorators.example.ts

# Ejemplos de @QType()
bun run src/examples/decorators/qtype/01-basic.example.ts
bun run src/examples/decorators/qtype/02-complex-types.example.ts
bun run src/examples/decorators/qtype/03-nested-models.example.ts
bun run src/examples/decorators/qtype/04-arrays.example.ts
bun run src/examples/decorators/qtype/05-control-and-special-cases.example.ts
```

### Opción 2: Importar en tu código

```typescript
// Importar todos los ejemplos
import * as DecoratorExamples from './src/examples/decorators';

// Usar ejemplos específicos
import { User } from './src/examples/decorators/quick/01-basic.example';
import { Event } from './src/examples/decorators/qtype/02-complex-types.example';
```

---

## 📚 Ejemplos de @Quick()

### 01 - Uso Básico (`01-basic.example.ts`)

**Qué aprenderás:**
- Uso básico de `@Quick()` en modelos
- Ventajas sobre decorar cada propiedad manualmente
- Sintaxis `declare` para propiedades
- Serialización y deserialización automática

**Conceptos clave:**
```typescript
@Quick()
class User extends QModel<IUser> {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
}
```

**Ejecutar:**
```bash
bun run src/examples/decorators/quick/01-basic.example.ts
```

---

### 02 - Tipos Complejos (`02-complex-types.example.ts`)

**Qué aprenderás:**
- Uso de `@Quick()` con tipos complejos
- Date, BigInt, RegExp, Symbol
- Map, Set, Buffer, TypedArrays
- Transformaciones automáticas

**Tipos cubiertos:**
- ✅ `Date` - Fechas y timestamps
- ✅ `BigInt` - Números grandes
- ✅ `RegExp` - Expresiones regulares
- ✅ `Symbol` - Símbolos únicos
- ✅ `Map<K, V>` - Mapas
- ✅ `Set<T>` - Conjuntos
- ✅ `Buffer` - Datos binarios
- ✅ `Uint8Array`, `Int32Array`, `Float64Array` - Arrays tipados

**Ejecutar:**
```bash
bun run src/examples/decorators/quick/02-complex-types.example.ts
```

---

### 03 - Modelos Anidados (`03-nested-models.example.ts`)

**Qué aprenderás:**
- Modelos anidados con `@Quick()`
- Cuándo usar `@QType(ModelClass)` con `@Quick()`
- Arrays de modelos (requieren `@QType()` explícito)
- Transformaciones recursivas

**Regla importante:**
```typescript
@Quick()
class Post extends QModel<IPost> {
  declare title: string;
  
  // ⚠️ Arrays de modelos SIEMPRE necesitan @QType() explícito
  @QType(Comment)
  declare comments: Comment[];
}
```

**Ejecutar:**
```bash
bun run src/examples/decorators/quick/03-nested-models.example.ts
```

---

### 04 - Arrays y Serialización (`04-arrays-serialization.example.ts`)

**Qué aprenderás:**
- Manejo de arrays de primitivos
- Serialización a JSON vs Interface
- Deserialización desde datos serializados
- Métodos personalizados en modelos
- Clonación profunda

**Métodos cubiertos:**
- `toJSON()` - Serializa a JSON (strings para dates)
- `toInterface()` - Serializa a interface (ISO strings para dates)
- `clone()` - Clona el modelo profundamente

**Ejecutar:**
```bash
bun run src/examples/decorators/quick/04-arrays-serialization.example.ts
```

---

### 05 - Mezclando Decoradores (`05-mixed-decorators.example.ts`)

**Qué aprenderás:**
- Combinar `@Quick()` con `@QType()` explícito
- Cuándo es necesario usar ambos
- Tipos especiales (Map, Buffer, Symbol, BigInt)
- Preservación de tipos después de clonar

**Patrón híbrido:**
```typescript
@Quick()
class Post extends QModel<IPost> {
  // @Quick() maneja estas automáticamente
  declare title: string;
  declare content: string;
  
  // Pero arrays de modelos necesitan @QType()
  @QType(Comment)
  declare comments: Comment[];
}
```

**Ejecutar:**
```bash
bun run src/examples/decorators/quick/05-mixed-decorators.example.ts
```

---

## 📚 Ejemplos de @QType()

### 01 - Uso Básico (`01-basic.example.ts`)

**Qué aprenderás:**
- Uso explícito de `@QType()` para cada propiedad
- Cuándo preferir `@QType()` sobre `@Quick()`
- Control fino sobre cada propiedad
- Compatibilidad con cualquier configuración

**Comparación:**
```typescript
// Con @QType() (control explícito)
class User extends QModel<IUser> {
  @QType() declare id: string;
  @QType() declare name: string;
  @QType() declare createdAt: Date;
}

// Con @Quick() (automático)
@Quick()
class User extends QModel<IUser> {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
}
```

**Ejecutar:**
```bash
bun run src/examples/decorators/qtype/01-basic.example.ts
```

---

### 02 - Tipos Complejos (`02-complex-types.example.ts`)

**Qué aprenderás:**
- `@QType()` con tipos complejos
- Date, BigInt, RegExp, Symbol
- Map, Set, Buffer, TypedArrays
- Preservación de tipos en serialización

**Ventaja de control explícito:**
- Puedes decorar solo las propiedades que necesitan transformación
- Menos overhead de metadata
- Más eficiente para modelos con pocas propiedades complejas

**Ejecutar:**
```bash
bun run src/examples/decorators/qtype/02-complex-types.example.ts
```

---

### 03 - Modelos Anidados (`03-nested-models.example.ts`)

**Qué aprenderás:**
- Modelos anidados con `@QType(ModelClass)`
- Arrays de modelos con control explícito
- Anidación múltiple niveles
- Métodos personalizados en modelos anidados

**Patrón para anidación:**
```typescript
class Person extends QModel<IPerson> {
  @QType() declare name: string;
  
  // Modelo anidado simple
  @QType(Address)
  declare address: Address;
}

class Order extends QModel<IOrder> {
  @QType() declare id: string;
  
  // Array de modelos
  @QType(OrderItem)
  declare items: OrderItem[];
}
```

**Ejecutar:**
```bash
bun run src/examples/decorators/qtype/03-nested-models.example.ts
```

---

### 04 - Arrays y Colecciones (`04-arrays.example.ts`)

**Qué aprenderás:**
- Arrays de primitivos con `@QType()`
- Arrays de modelos con `@QType(ModelClass)`
- Arrays multidimensionales
- Operaciones con colecciones
- Filtrado, mapeo y reducción

**Tipos de arrays cubiertos:**
- `string[]` - Arrays de strings
- `number[]` - Arrays de números
- `bigint[]` - Arrays de bigints
- `Model[]` - Arrays de modelos
- `number[][]` - Arrays 2D
- `Map<string, string[]>` - Maps con arrays

**Ejecutar:**
```bash
bun run src/examples/decorators/qtype/04-arrays.example.ts
```

---

### 05 - Control Fino y Casos Especiales (`05-control-and-special-cases.example.ts`)

**Qué aprenderás:**
- Cuándo usar `@QType()` vs `@Quick()`
- Decoración selectiva de propiedades
- Propiedades opcionales
- Compatibilidad con diferentes configuraciones
- Enfoque híbrido

**Guía de decisión:**

**USA `@QType()` CUANDO:**
- ✅ Solo algunas propiedades necesitan transformación
- ✅ Necesitas compatibilidad máxima
- ✅ Trabajas con código legacy
- ✅ Quieres control explícito
- ✅ El modelo tiene pocas propiedades (< 5)

**USA `@Quick()` CUANDO:**
- ✅ Todas las propiedades necesitan transformación
- ✅ El modelo tiene muchas propiedades (> 10)
- ✅ Quieres código más limpio
- ✅ Puedes usar `useDefineForClassFields: true`
- ✅ Prefieres convención sobre configuración

**USA AMBOS CUANDO:**
- ✅ `@Quick()` para propiedades simples
- ✅ `@QType(ModelClass)` para arrays de modelos
- ✅ Quieres lo mejor de ambos mundos

**Ejecutar:**
```bash
bun run src/examples/decorators/qtype/05-control-and-special-cases.example.ts
```

---

## 🎯 Casos de Uso Recomendados

### Proyecto Nuevo y Moderno

```typescript
// Usa @Quick() para la mayoría de modelos
@Quick()
class User extends QModel<IUser> {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  
  // Solo arrays de modelos necesitan @QType()
  @QType(Post)
  declare posts: Post[];
}
```

### Proyecto Legacy o con Restricciones

```typescript
// Usa @QType() para compatibilidad total
class User extends QModel<IUser> {
  @QType() declare id: string;
  @QType() declare name: string;
  @QType() declare createdAt: Date;
  
  @QType(Post)
  declare posts: Post[];
}
```

### Modelo con Pocas Propiedades Complejas

```typescript
// Usa @QType() solo donde sea necesario
class Config extends QModel<IConfig> {
  id!: string;         // No necesita @QType()
  name!: string;       // No necesita @QType()
  
  @QType()            // Solo Date necesita transformación
  declare updatedAt: Date;
}
```

---

## 📖 Documentación Adicional

- [Documentación de @Quick()](../../docs/QUICK-DECORATOR.md)
- [Documentación de @QType()](../../docs/QTYPE-DECORATOR.md)
- [Bug de useDefineForClassFields en Bun](../../BUN-USEDEFINEFORCLASSFIELDS-BUG.md)
- [Arquitectura SOLID](../../docs/SOLID-ARCHITECTURE.md)

---

## 🧪 Testing

Todos estos ejemplos están cubiertos por tests:
- `tests/integration/quick-decorator.test.ts` - Tests de @Quick()
- `tests/unit/decorators/` - Tests unitarios de decoradores

Para ejecutar los tests:
```bash
bun test
```

---

## 💡 Tips y Mejores Prácticas

### 1. Usa `declare` con @Quick()
```typescript
// ✅ Correcto
@Quick()
class User extends QModel<IUser> {
  declare id: string;
}

// ❌ Incorrecto (se sobrescribe a undefined)
@Quick()
class User extends QModel<IUser> {
  id!: string;
}
```

### 2. Arrays de modelos SIEMPRE necesitan @QType()
```typescript
@Quick()
class Post extends QModel<IPost> {
  declare title: string;
  
  // ⚠️ Esto es obligatorio para arrays de modelos
  @QType(Comment)
  declare comments: Comment[];
}
```

### 3. Elige el decorador según tu caso
```typescript
// Muchas propiedades → @Quick()
@Quick()
class BigModel extends QModel<IBigModel> {
  declare prop1: string;
  declare prop2: number;
  // ... 20 propiedades más
}

// Pocas propiedades → @QType()
class SmallModel extends QModel<ISmallModel> {
  @QType() declare id: string;
  @QType() declare date: Date;
}
```

---

## 🤝 Contribuir

¿Tienes un caso de uso interesante? ¡Añade un ejemplo!

1. Crea un nuevo archivo en la carpeta apropiada
2. Sigue el patrón de numeración (`06-`, `07-`, etc.)
3. Documenta bien con comentarios
4. Añade el ejemplo a este README
5. Crea un PR

---

## 📝 Licencia

Estos ejemplos están bajo la misma licencia que QuickModel (MIT).
