# Transformadores

Los transformadores son los componentes lógicos responsables de convertir datos entre formatos serializables (strings JSON, números) y tipos en tiempo de ejecución (Date, BigInt, objetos).

## Transformadores Integrados

QuickModel viene con un conjunto completo de transformadores para tipos comunes de JavaScript.

### Primitivos

| Tipo        | Entrada (JSON)      | Tipo Runtime | Alias       |
| ----------- | ------------------- | ------------ | ----------- |
| **BigInt**  | `string` / `number` | `bigint`     | `'bigint'`  |
| **Symbol**  | `string`            | `symbol`     | `'symbol'`  |
| **String**  | `any`               | `string`     | `'string'`  |
| **Number**  | `string`            | `number`     | `'number'`  |
| **Boolean** | `string`            | `boolean`    | `'boolean'` |

**Ejemplo:**

```typescript
@Quick({
  balance: 'bigint',   // "100" -> 100n
  id: 'string',        // 123 -> "123"
  active: 'boolean'    // "true" -> true
})
```

### Objetos Nativos

| Tipo       | Entrada (JSON)         | Tipo Runtime | Alias      |
| ---------- | ---------------------- | ------------ | ---------- |
| **Date**   | ISO String / Timestamp | `Date`       | `'date'`   |
| **RegExp** | String / Objeto        | `RegExp`     | `'regexp'` |
| **URL**    | String                 | `URL`        | `'url'`    |
| **Error**  | Objeto                 | `Error`      | `'error'`  |

**Ejemplo:**

```typescript
@Quick({
  createdAt: Date,
  pattern: RegExp,
  site: URL
})
```

### Colecciones

| Tipo    | Entrada (JSON)            | Tipo Runtime | Alias   |
| ------- | ------------------------- | ------------ | ------- |
| **Map** | Array de Tuplas `[[k,v]]` | `Map<K, V>`  | `'map'` |
| **Set** | Array `[v1, v2]`          | `Set<V>`     | `'set'` |

**Ejemplo:**

```typescript
@Quick({
  tags: Set,     // ["a", "b"] -> Set{"a", "b"}
  meta: Map      // [["k", "v"]] -> Map{"k" => "v"}
})
```

### Datos Binarios

QuickModel soporta el manejo de datos binarios a través de cadenas Base64.

| Tipo                  | Alias                 |
| --------------------- | --------------------- |
| **ArrayBuffer**       | `'arraybuffer'`       |
| **DataView**          | `'dataview'`          |
| **Int8Array**         | `'int8array'`         |
| **Uint8Array**        | `'uint8array'`        |
| **Uint8ClampedArray** | `'uint8clampedarray'` |
| **Float32Array**      | `'float32array'`      |
| **Float64Array**      | `'float64array'`      |

**Ejemplo:**

```typescript
@Quick({
  buffer: ArrayBuffer,
  pixels: Uint8Array
})
```

## Transformadores Personalizados

Puedes crear tus propios transformadores implementando la interfaz de transformador.

Sin embargo, para la mayoría de los casos, los **Transformadores en Línea** son suficientes:

```typescript
@Quick({
  // Personalizado: String a mayúsculas
  code: (val: string) => val.toUpperCase(),

  // Personalizado: Formateador de moneda
  price: {
    from: (val: number) => `$${val.toFixed(2)}`,
    to: (val: string) => parseFloat(val.replace('$', ''))
  }
})
```
