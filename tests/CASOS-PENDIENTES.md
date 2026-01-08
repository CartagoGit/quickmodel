# Casos Pendientes para Futuros Tests

Este documento lista los casos edge y funcionalidades que deberían ser probadas en futuras iteraciones de QuickModel.

## ✅ Casos Actualmente Cubiertos

Los siguientes casos están completamente probados en `e2e/auto-conversion-roundtrip.test.ts`:

- ✅ Primitivos (number, string, boolean, null, undefined)
- ✅ Enums (string, numeric, const)
- ✅ Dates y BigInt
- ✅ Colecciones (Set, Map, Array)
- ✅ Tipos especiales (RegExp, Symbol, Buffer, Error)
- ✅ Objetos plain
- ✅ Nested models (clases e interfaces)
- ✅ Arrays de objetos (con y sin modelos)
- ✅ TypedArrays (Uint8Array, Float32Array, etc.)
- ✅ Clonación de instancias
- ✅ Serialización (toInterface)
- ✅ Roundtrip (Model → Interface → Model)
- ✅ Herencia de modelos
- ✅ Métodos custom

## 🔄 Casos con Comportamiento Conocido

### Default Values

**Estado**: Parcialmente funcional

**Comportamiento actual**:
- ✅ Propiedades con valores explícitos mantienen esos valores
- ⚠️ Propiedades `undefined` explícito NO restauran el default
- ⚠️ Propiedades ausentes NO restauran el default

**Ejemplo**:
```typescript
class User extends QModel<IUser> {
  name: string = 'Anonymous';
}

// Funciona
new User({ name: 'John' }).name // 'John'

// No funciona (debería ser 'Anonymous')
new User({ name: undefined }).name // undefined
new User({}).name // undefined
```

**Posible solución**: Detectar cuando una propiedad es `undefined` o ausente y restaurar el valor default guardado en la dummy instance.

### Arrays de QModels

**Estado**: ✅ **Completamente funcional**

**Comportamiento actual**:
- ✅ Arrays de instancias de QModel se mantienen como instancias
- ✅ Arrays de plain objects SE CONVIERTEN automáticamente a QModel cuando se especifica en typeMap
- ✅ Las propiedades Date dentro de plain objects SÍ se transforman

**Ejemplo**:
```typescript
@Quick({ posts: Post })
class User extends QModel<IUser> {
  posts!: Post[];
}

// Ahora SÍ convierte a Post automáticamente
new User({ posts: [{ id: 1, title: 'Test', createdAt: '2024-01-01' }] })
// posts[0] es una instancia de Post ✅

// También funciona con instancias directas
new User({ posts: [new Post({ id: 1, title: 'Test' })] })
```

**Implementación**: 
- El decorator `@Quick()` detecta si el valor en data es un array
- Si el typeMap especifica un tipo para esa propiedad, establece `arrayElementClass`
- El deserializer usa `arrayElementClass` para convertir cada elemento del array

## 📋 Casos Pendientes de Implementación/Prueba

### 1. Referencias Circulares ⭐⭐⭐

**Prioridad**: Alta

**Descripción**: Objetos que se referencian mutuamente causan stack overflow.

**Ejemplo**:
```typescript
interface INode {
  value: number;
  parent?: INode;
  children: INode[];
}

class Node extends QModel<INode> {
  value!: number;
  parent?: Node;
  children!: Node[];
}

const parent = new Node({ value: 1, children: [] });
const child = new Node({ value: 2, parent, children: [] });
parent.children.push(child); // 💥 Circular reference
```

**Pruebas necesarias**:
- ✅ Detección de referencias circulares
- ✅ Serialización sin stack overflow
- ✅ Deserialización con referencias preservadas
- ✅ toJSON() maneja ciclos correctamente

**Estrategias**:
- WeakSet para tracking de objetos visitados
- Reemplazar ciclos con referencias simbólicas
- Opción `maxDepth` en serialización

---

### 2. Propiedades Readonly ⭐⭐

**Prioridad**: Media

**Descripción**: Propiedades `readonly` deberían ser inmutables después de construcción.

**Ejemplo**:
```typescript
class User extends QModel<IUser> {
  readonly id!: number;
  name!: string;
}

const user = new User({ id: 1, name: 'John' });
user.id = 2; // ¿Debería lanzar error?
```

**Pruebas necesarias**:
- ✅ `readonly` previene asignaciones
- ✅ `readonly` se inicializa en constructor
- ✅ Serialización incluye readonly fields
- ✅ Deserialización respeta readonly

---

### 3. Propiedades Private/Protected ⭐⭐

**Prioridad**: Media

**Descripción**: Propiedades privadas no deberían serializarse.

**Ejemplo**:
```typescript
class User extends QModel<IUser> {
  id!: number;
  private _password!: string;
  protected _internal!: string;
}

const user = new User({ id: 1, _password: 'secret' });
const json = user.toInterface();
// json NO debería contener _password
```

**Pruebas necesarias**:
- ✅ `toInterface()` omite private/protected
- ✅ Constructor puede inicializar private/protected
- ✅ Deserialización respeta visibilidad
- ✅ `toJSON()` no expone internals

---

### 4. Partial Updates (PATCH) ⭐⭐⭐

**Prioridad**: Alta

**Descripción**: Actualizar solo algunos campos sin sobrescribir el resto.

**Ejemplo**:
```typescript
const user = new User({ id: 1, name: 'John', email: 'john@example.com' });

// Actualizar solo el nombre
user.update({ name: 'Jane' });

// user.email debería seguir siendo 'john@example.com'
```

**Pruebas necesarias**:
- ✅ Método `update()` o `patch()`
- ✅ Solo campos proporcionados se actualizan
- ✅ Campos ausentes NO se tocan
- ✅ `undefined` vs ausente distinguidos
- ✅ Validación solo en campos modificados

---

### 5. Arrays Heterogéneos ⭐

**Prioridad**: Baja

**Descripción**: Arrays con múltiples tipos diferentes.

**Ejemplo**:
```typescript
interface IMixed {
  items: (string | number | Date | null)[];
}

class Mixed extends QModel<IMixed> {
  items!: (string | number | Date | null)[];
}

new Mixed({ items: ['text', 123, new Date(), null] });
```

**Pruebas necesarias**:
- ✅ Detección correcta de cada tipo
- ✅ Transformación individual por elemento
- ✅ Serialización preserva tipos
- ✅ Roundtrip mantiene heterogeneidad

---

### 6. Transformaciones Bidireccionales Custom ⭐⭐

**Prioridad**: Media

**Descripción**: Custom transformers que funcionan en ambas direcciones.

**Ejemplo**:
```typescript
const encryptionTransformer = {
  fromInterface: (value: string) => decrypt(value),
  toInterface: (value: string) => encrypt(value)
};

@Quick({
  typeMap: {
    password: encryptionTransformer
  }
})
class User extends QModel<IUser> {
  password!: string;
}
```

**Pruebas necesarias**:
- ✅ Transformer con `fromInterface()` y `toInterface()`
- ✅ Deserialización usa `fromInterface()`
- ✅ Serialización usa `toInterface()`
- ✅ Roundtrip funciona correctamente

**Nota**: Actualmente solo funciones unidireccionales (fromInterface) están soportadas.

---

### 7. WeakMap/WeakSet ⭐

**Prioridad**: Baja

**Descripción**: Colecciones débiles no serializables.

**Ejemplo**:
```typescript
class Cache extends QModel<ICache> {
  weakCache!: WeakMap<object, any>;
}
```

**Pruebas necesarias**:
- ✅ Detección de WeakMap/WeakSet
- ✅ Serialización omite o convierte
- ✅ Deserialización maneja ausencia
- ✅ Documentación de limitaciones

---

### 8. Nested Arrays Profundos ⭐⭐

**Prioridad**: Media

**Descripción**: Arrays multi-dimensionales.

**Ejemplo**:
```typescript
interface IMatrix {
  matrix: number[][][];
  grid: User[][];
}
```

**Pruebas necesarias**:
- ✅ Arrays de arrays de primitivos
- ✅ Arrays de arrays de objetos
- ✅ Arrays de arrays de QModels
- ✅ Transformación recursiva correcta

---

### 9. Optional Chaining Profundo ⭐⭐

**Prioridad**: Media

**Descripción**: Cadenas largas de propiedades opcionales.

**Ejemplo**:
```typescript
interface IUser {
  profile?: {
    address?: {
      city?: string;
    };
  };
}

const city = user.profile?.address?.city;
```

**Pruebas necesarias**:
- ✅ Nullish values en cadenas
- ✅ Transformaciones en propiedades opcionales
- ✅ Serialización preserva estructura
- ✅ Deserialización maneja ausencias

---

### 10. Invalid Data Handling ⭐⭐⭐

**Prioridad**: Alta

**Descripción**: Backend envía tipos incorrectos.

**Ejemplo**:
```typescript
interface IUser {
  age: number;
}

// Backend envía string en lugar de number
new User({ age: "invalid" }); // ¿Qué hacer?
```

**Pruebas necesarias**:
- ✅ Modo strict: lanza error
- ✅ Modo permissive: intenta coerción
- ✅ Validación descriptiva
- ✅ Error messages útiles
- ✅ Logging de problemas

**Posibles estrategias**:
```typescript
@Quick({ 
  strict: true,  // throw on type mismatch
  coerce: false  // no auto-conversion
})
```

---

### 11. Performance con Arrays Grandes ⭐⭐

**Prioridad**: Media

**Descripción**: Miles de elementos pueden ser lentos.

**Ejemplo**:
```typescript
const users = new UserList({ 
  items: Array(10000).fill({ id: 1, name: 'Test' })
});
```

**Pruebas necesarias**:
- ✅ Benchmark con 1K, 10K, 100K elementos
- ✅ Lazy loading de arrays
- ✅ Streaming de transformaciones
- ✅ Memory profiling
- ✅ Optimización de loops

**Estrategias**:
- Transformación on-demand
- Virtual scrolling
- Paginación en deserialización

---

### 12. Propiedades Computadas/Getters ⭐⭐

**Prioridad**: Media

**Descripción**: Getters no deberían serializarse pero deben funcionar.

**Ejemplo**:
```typescript
class User extends QModel<IUser> {
  firstName!: string;
  lastName!: string;
  
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

const json = user.toInterface();
// json NO debería contener fullName
```

**Pruebas necesarias**:
- ✅ Getters funcionan en modelo
- ✅ `toInterface()` omite getters
- ✅ Getters con transformaciones
- ✅ Getters con nested models

---

### 13. Symbol Properties ⭐

**Prioridad**: Baja

**Descripción**: Propiedades con keys Symbol.

**Ejemplo**:
```typescript
const metadataKey = Symbol('metadata');

class User extends QModel<IUser> {
  id!: number;
  [metadataKey]: any;
}
```

**Pruebas necesarias**:
- ✅ Detección de Symbol properties
- ✅ Serialización de Symbol keys
- ✅ Deserialización con Symbols
- ✅ JSON limitations handling

---

### 14. Proxy Wrappers ⭐

**Prioridad**: Baja

**Descripción**: Modelos envueltos en Proxy para interceptar accesos.

**Ejemplo**:
```typescript
const proxyUser = new Proxy(user, {
  get(target, prop) {
    console.log(`Accessing ${String(prop)}`);
    return target[prop];
  }
});
```

**Pruebas necesarias**:
- ✅ Serialización de Proxies
- ✅ Deserialización mantiene Proxy
- ✅ Transformaciones funcionan con Proxy
- ✅ `toInterface()` atraviesa Proxy

---

### 15. Async Transformers ⭐⭐⭐

**Prioridad**: Alta

**Descripción**: Transformaciones que requieren operaciones asíncronas.

**Ejemplo**:
```typescript
@Quick({
  typeMap: {
    avatar: async (url) => await fetchImage(url)
  }
})
class User extends QModel<IUser> {
  avatar!: Image;
}

// Necesita soporte async
await User.fromInterfaceAsync({ avatar: 'https://...' });
```

**Pruebas necesarias**:
- ✅ `fromInterfaceAsync()` method
- ✅ Promise-based transformers
- ✅ Parallel async transformations
- ✅ Error handling en async
- ✅ Timeout/cancellation

---

### 16. Multiple Inheritance ⭐⭐

**Prioridad**: Media

**Descripción**: Cadenas largas de herencia.

**Ejemplo**:
```typescript
class Entity extends QModel<IEntity> {
  id!: number;
}

class Timestamped extends Entity {
  createdAt!: Date;
}

class User extends Timestamped {
  name!: string;
}
```

**Pruebas necesarias**:
- ✅ Metadata en toda la cadena
- ✅ Transformaciones heredadas
- ✅ Conflictos de nombres
- ✅ Super class initialization

---

### 17. Mixins ⭐⭐

**Prioridad**: Media

**Descripción**: Composición de comportamientos.

**Ejemplo**:
```typescript
function Timestamped<T extends Constructor>(Base: T) {
  return class extends Base {
    createdAt!: Date;
    updatedAt!: Date;
  };
}

class User extends Timestamped(QModel<IUser>) {
  name!: string;
}
```

**Pruebas necesarias**:
- ✅ Mixins con QModel
- ✅ Metadata en mixins
- ✅ Transformaciones en mixins
- ✅ Múltiples mixins

---

### 18. Frozen/Sealed Objects ⭐

**Prioridad**: Baja

**Descripción**: Objetos inmutables.

**Ejemplo**:
```typescript
const user = new User({ id: 1, name: 'John' });
Object.freeze(user);

// ¿Debería fallar o ser permitido?
user.name = 'Jane';
```

**Pruebas necesarias**:
- ✅ `Object.freeze()` después de construcción
- ✅ `Object.seal()` después de construcción
- ✅ Serialización de frozen objects
- ✅ Intentos de modificación

---

### 19. Custom toJSON ⭐⭐

**Prioridad**: Media

**Descripción**: Modelos con su propio `toJSON()`.

**Ejemplo**:
```typescript
class User extends QModel<IUser> {
  id!: number;
  password!: string;
  
  toJSON() {
    // Custom serialization - omit password
    return { id: this.id };
  }
}

JSON.stringify(user); // Usa toJSON() custom
```

**Pruebas necesarias**:
- ✅ Custom `toJSON()` respetado
- ✅ Interacción con `toInterface()`
- ✅ JSON.stringify() usa custom
- ✅ Conflictos con serializer

---

### 20. Metadata Pollution ⭐⭐

**Prioridad**: Media

**Descripción**: Muchas clases con decoradores pueden causar memory leaks.

**Ejemplo**:
```typescript
// 10000 clases diferentes
for (let i = 0; i < 10000; i++) {
  eval(`
    class User${i} extends QModel<IUser> {
      id!: number;
    }
  `);
}
// ¿Memory leak en metadata?
```

**Pruebas necesarias**:
- ✅ Memory profiling con muchas clases
- ✅ Cleanup strategies
- ✅ WeakMap para metadata
- ✅ Garbage collection verificado

---

## 📊 Resumen de Prioridades

### Alta Prioridad (⭐⭐⭐)
1. Referencias Circulares
2. Partial Updates (PATCH)
3. Invalid Data Handling
4. Async Transformers

### Media Prioridad (⭐⭐)
2. Propiedades Readonly
3. Propiedades Private/Protected
4. Transformaciones Bidireccionales Custom
5. Nested Arrays Profundos
6. Optional Chaining Profundo
7. Performance con Arrays Grandes
8. Propiedades Computadas/Getters
9. Multiple Inheritance
10. Mixins
11. Custom toJSON
12. Metadata Pollution

### Baja Prioridad (⭐)
1. Arrays Heterogéneos
2. WeakMap/WeakSet
3. Symbol Properties
4. Proxy Wrappers
5. Frozen/Sealed Objects

---

## 🚀 Próximos Pasos

1. **Implementar casos de alta prioridad** en orden
2. **Crear tests específicos** para cada caso
3. **Documentar limitaciones** conocidas
4. **Benchmarks** de performance
5. **Migration guide** para cambios breaking

---

## 📝 Contribuciones

Si encuentras otros casos edge que deberían ser probados, por favor:

1. Agrégalo a este documento
2. Incluye un ejemplo de código
3. Define las pruebas necesarias
4. Asigna una prioridad (⭐/⭐⭐/⭐⭐⭐)

---

**Última actualización**: 2026-01-08
