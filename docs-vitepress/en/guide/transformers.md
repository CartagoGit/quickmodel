# Transformers

Transformers are the logic components responsible for converting data between serializable formats (JSON strings, numbers) and runtime types (Date, BigInt, objects).

## Built-in Transformers

QuickModel comes with a comprehensive set of built-in transformers for common JavaScript types.

### Primitives

| Type        | Input (JSON)        | Runtime Type | Alias       |
| ----------- | ------------------- | ------------ | ----------- |
| **BigInt**  | `string` / `number` | `bigint`     | `'bigint'`  |
| **Symbol**  | `string`            | `symbol`     | `'symbol'`  |
| **String**  | `any`               | `string`     | `'string'`  |
| **Number**  | `string`            | `number`     | `'number'`  |
| **Boolean** | `string`            | `boolean`    | `'boolean'` |

**Example:**

```typescript
@Quick({
  balance: 'bigint',   // "100" -> 100n
  id: 'string',        // 123 -> "123"
  active: 'boolean'    // "true" -> true
})
```

### Native Objects

| Type       | Input (JSON)           | Runtime Type | Alias      |
| ---------- | ---------------------- | ------------ | ---------- |
| **Date**   | ISO String / Timestamp | `Date`       | `'date'`   |
| **RegExp** | String / Object        | `RegExp`     | `'regexp'` |
| **URL**    | String                 | `URL`        | `'url'`    |
| **Error**  | Object                 | `Error`      | `'error'`  |

**Example:**

```typescript
@Quick({
  createdAt: Date,
  pattern: RegExp,
  site: URL
})
```

### Collections

| Type    | Input (JSON)              | Runtime Type | Alias   |
| ------- | ------------------------- | ------------ | ------- |
| **Map** | Array of Tuples `[[k,v]]` | `Map<K, V>`  | `'map'` |
| **Set** | Array `[v1, v2]`          | `Set<V>`     | `'set'` |

**Example:**

```typescript
@Quick({
  tags: Set,     // ["a", "b"] -> Set{"a", "b"}
  meta: Map      // [["k", "v"]] -> Map{"k" => "v"}
})
```

### Binary Data

QuickModel supports handling binary data via Base64 strings.

| Type                  | Alias                 |
| --------------------- | --------------------- |
| **ArrayBuffer**       | `'arraybuffer'`       |
| **DataView**          | `'dataview'`          |
| **Int8Array**         | `'int8array'`         |
| **Uint8Array**        | `'uint8array'`        |
| **Uint8ClampedArray** | `'uint8clampedarray'` |
| **Float32Array**      | `'float32array'`      |
| **Float64Array**      | `'float64array'`      |

**Example:**

```typescript
@Quick({
  buffer: ArrayBuffer,
  pixels: Uint8Array
})
```

## Custom Transformers

You can create your own transformers by implementing the transformer interface.

_(See [QTransform definition](../../src/core/interfaces/transformer.interface.ts) for details)_

However, for most cases, **Inline Transformers** are sufficient:

```typescript
@Quick({
  // Custom: Uppercase string
  code: (val: string) => val.toUpperCase(),

  // Custom: Currency formatter
  price: {
    from: (val: number) => `$${val.toFixed(2)}`,
    to: (val: string) => parseFloat(val.replace('$', ''))
  }
})
```
