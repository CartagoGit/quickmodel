# 💡 Guía de IntelliSense para @Field()

Esta guía muestra cómo TypeScript te ayuda con autocompletado al usar string literals en `@Field()`.

## 🎯 Experiencia de Desarrollo con String Literals

### Paso 1: Escribes `@Field('`

Cuando escribes las comillas simples, TypeScript inmediatamente te muestra todas las opciones disponibles:

```typescript
class MyModel extends QuickModel {
  @Field('█  // ← TypeScript muestra el menú de autocompletado aquí
```

### Paso 2: IntelliSense te sugiere

```
┌─────────────────────────────────────────┐
│ string          ⟶ Para tipo string      │
│ number          ⟶ Para tipo number      │
│ boolean         ⟶ Para tipo boolean     │
│ date            ⟶ Para tipo Date        │
│ bigint          ⟶ Para tipo bigint      │
│ symbol          ⟶ Para tipo symbol      │
│ regexp          ⟶ Para tipo RegExp      │
│ error           ⟶ Para tipo Error       │
│ url             ⟶ Para tipo URL         │
│ urlsearchparams ⟶ Para URLSearchParams  │
│ map             ⟶ Para tipo Map         │
│ set             ⟶ Para tipo Set         │
│ int8array       ⟶ Para Int8Array        │
│ uint8array      ⟶ Para Uint8Array       │
│ int16array      ⟶ Para Int16Array       │
│ uint16array     ⟶ Para Uint16Array      │
│ int32array      ⟶ Para Int32Array       │
│ uint32array     ⟶ Para Uint32Array      │
│ float32array    ⟶ Para Float32Array     │
│ float64array    ⟶ Para Float64Array     │
│ bigint64array   ⟶ Para BigInt64Array    │
│ biguint64array  ⟶ Para BigUint64Array   │
│ arraybuffer     ⟶ Para ArrayBuffer      │
│ dataview        ⟶ Para DataView         │
└─────────────────────────────────────────┘
```

### Paso 3: Seleccionas el tipo

Simplemente navegas con las flechas o escribes las primeras letras:

```typescript
class MyModel extends QuickModel {
  @Field('big█  // TypeScript filtra: bigint, bigint64array, biguint64array
```

### Paso 4: Código completo

```typescript
interface IMyModel {
  balance: bigint;
}

class MyModel extends QuickModel<IMyModel> {
  @Field('bigint')
  balance!: bigint;  // ✅ TypeScript validó que el decorador coincide con el tipo
}
```

## 🎨 Ejemplos Visuales de Uso

### Ejemplo 1: Modelo Financiero

```typescript
interface ITransaction {
  amount: bigint;
  timestamp: Date;
  accountPattern: RegExp;
  description: string;
}

class Transaction extends QuickModel<ITransaction> {
  @Field('bigint')        // ← IntelliSense sugirió 'bigint'
  amount!: bigint;
  
  @Field('date')          // ← IntelliSense sugirió 'date'
  timestamp!: Date;
  
  @Field('regexp')        // ← IntelliSense sugirió 'regexp'
  accountPattern!: RegExp;
  
  @Field()                // ← Auto-detecta string
  description!: string;
}
```

### Ejemplo 2: Modelo de Datos Binarios

```typescript
interface IBinaryData {
  signedBytes: Int8Array;
  unsignedBytes: Uint8Array;
  floats: Float32Array;
  bigInts: BigInt64Array;
  buffer: ArrayBuffer;
}

class BinaryData extends QuickModel<IBinaryData> {
  @Field('int8array')     // ← IntelliSense sugirió 'int8array'
  signedBytes!: Int8Array;
  
  @Field('uint8array')    // ← IntelliSense sugirió 'uint8array'
  unsignedBytes!: Uint8Array;
  
  @Field('float32array')  // ← IntelliSense sugirió 'float32array'
  floats!: Float32Array;
  
  @Field('bigint64array') // ← IntelliSense sugirió 'bigint64array'
  bigInts!: BigInt64Array;
  
  @Field('arraybuffer')   // ← IntelliSense sugirió 'arraybuffer'
  buffer!: ArrayBuffer;
}
```

### Ejemplo 3: Modelo Web

```typescript
interface IWebResource {
  homepage: URL;
  queryParams: URLSearchParams;
  lastError: Error | null;
  urlPattern: RegExp;
}

class WebResource extends QuickModel<IWebResource> {
  @Field('url')              // ← IntelliSense sugirió 'url'
  homepage!: URL;
  
  @Field('urlsearchparams')  // ← IntelliSense sugirió 'urlsearchparams'
  queryParams!: URLSearchParams;
  
  @Field('error')            // ← IntelliSense sugirió 'error'
  lastError!: Error | null;
  
  @Field('regexp')           // ← IntelliSense sugirió 'regexp'
  urlPattern!: RegExp;
}
```

## 🔍 Búsqueda Inteligente

TypeScript filtra las opciones mientras escribes:

### Buscando "array"
```typescript
@Field('arr█  // Filtra: int8array, uint8array, ..., float32array, ..., arraybuffer
```

### Buscando "big"
```typescript
@Field('big█  // Filtra: bigint, bigint64array, biguint64array
```

### Buscando "url"
```typescript
@Field('url█  // Filtra: url, urlsearchparams
```

### Buscando "int"
```typescript
@Field('int█  // Filtra: bigint, int8array, int16array, int32array, bigint64array, biguint64array
```

## ⚡ Ventajas del IntelliSense

### ✅ Descubrimiento de Tipos
No necesitas recordar qué tipos están disponibles - el editor te los muestra todos.

### ✅ Prevención de Errores
Si escribes un tipo incorrecto, TypeScript te lo marca inmediatamente:
```typescript
@Field('intarray')  // ❌ Error: Type '"intarray"' is not assignable to type 'FieldTypeString | ...'
//      ^^^^^^^^^^
//      ¿Quisiste decir 'int8array', 'int16array' o 'int32array'?
```

### ✅ Documentación Inline
Cada opción tiene su documentación integrada (dependiendo del IDE):
```typescript
@Field('bigint')    // ⓘ Para bigint - Serializa como string
@Field('regexp')    // ⓘ Para RegExp - Serializa como /pattern/flags
@Field('int8array') // ⓘ Para Int8Array - Serializa como number[]
```

### ✅ Refactoring Seguro
Si cambias el nombre de un string literal en el futuro, TypeScript encontrará todos los usos:
```typescript
// Buscar todas las referencias de 'bigint'
@Field('bigint')  // ← TypeScript encuentra esto
```

## 🎯 Cuándo Usar Cada Forma

| Forma                  | Cuándo usar                                    | IntelliSense |
| ---------------------- | ---------------------------------------------- | ------------ |
| `@Field('type')`       | **Recomendado** - Máxima ayuda del editor     | ⭐⭐⭐⭐⭐    |
| `@Field(TypeField)`    | Código legacy, o si prefieres imports explícitos | ⭐⭐⭐       |
| `@Field(Constructor)`  | Si prefieres consistencia con el tipo          | ⭐⭐⭐⭐      |
| `@Field()`             | Solo para tipos auto-detectables              | ⭐⭐⭐⭐      |

## 💻 Configuración del Editor

Para obtener el mejor IntelliSense:

### VS Code
- ✅ TypeScript 4.0+
- ✅ Extensión: "TypeScript and JavaScript Language Features" (incluida)

### WebStorm / IntelliJ
- ✅ TypeScript plugin habilitado (por defecto)

### Vim / Neovim
- ✅ Plugin: coc-tsserver o nvim-lspconfig con tsserver

No se requiere configuración especial - el IntelliSense funciona automáticamente con el tipo `FieldTypeString` exportado.

## 🚀 Resultado Final

Con string literals + IntelliSense:

```typescript
interface ICompleteModel {
  id: string;
  count: number;
  active: boolean;
  balance: bigint;
  key: symbol;
  pattern: RegExp;
  lastError: Error;
  homepage: URL;
  params: URLSearchParams;
  bytes1: Int8Array;
  bytes2: Uint8Array;
  floats: Float32Array;
  bigInts: BigInt64Array;
  tags: Map<string, number>;
  roles: Set<string>;
  buffer: ArrayBuffer;
  view: DataView;
}

class CompleteModel extends QuickModel<ICompleteModel> {
  // Primitivos (auto-detección)
  @Field() id!: string;
  @Field() count!: number;
  @Field() active!: boolean;
  
  // Especiales (con IntelliSense)
  @Field('bigint') balance!: bigint;
  @Field('symbol') key!: symbol;
  @Field('regexp') pattern!: RegExp;
  @Field('error') lastError!: Error;
  @Field('url') homepage!: URL;
  @Field('urlsearchparams') params!: URLSearchParams;
  
  // TypedArrays (con IntelliSense)
  @Field('int8array') bytes1!: Int8Array;
  @Field('uint8array') bytes2!: Uint8Array;
  @Field('float32array') floats!: Float32Array;
  @Field('bigint64array') bigInts!: BigInt64Array;
  
  // Colecciones (auto-detección o explícito)
  @Field() tags!: Map<string, number>;
  @Field('set') roles!: Set<string>;
  
  // Buffers (con IntelliSense)
  @Field('arraybuffer') buffer!: ArrayBuffer;
  @Field('dataview') view!: DataView;
}
```

**Resultado**: Código claro, autocompletado perfecto, sin imports de symbols, y TypeScript validando todo. ✨
