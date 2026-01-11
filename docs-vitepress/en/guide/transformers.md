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

### 1. Implicit (Inline) Transformers

For simple cases, you can define the transformer logic directly in the property definition. This is the **implicit** approach.

> [!NOTE]
> Implicit transformers act **ONLY as Deserializers** (JSON -> Model).

```typescript
@Quick({
  // Custom: Uppercase string
  // NOTE: Inline functions act ONLY as Deserializers (JSON -> Model)
  code: (val: string) => val.toUpperCase(),

  // Custom parsing
  config: JSON.parse
})
```

> [!WARNING] Important
> Inline functions `(val) => ...` are used **only for Deserialization** (from JSON to your Model instance).
>
> If you need bidirectional transformation (also serializing back to JSON with a specific format), you must create a class implementing `IQTransformer`.

## Advanced: Transformers & Serializers via Options

For cleaner code, or when you need bidirectional custom logic, you can use the **Advanced Options** object (second argument of `@Quick`).

This explicit approach allows you to:

1.  **Implicit vs Explicit**: Use transformers in the second argument instead of inline.
2.  **Independent Serializers**: Define serializers without transformers (or vice versa).
3.  **Separation of Concerns**: Keep type definitions clean.

This allows you to separate the type definition from the transformation logic and define explicit **serializers**.

```typescript
@Quick(
	{
		// 1. Define types normally
		status: String,
		date: Date,
	},
	{
		// 2. Define custom transformers (Deserialization: JSON -> Model)
		transformers: {
			status: (val) => String(val).toUpperCase(), // "active" -> "ACTIVE"
			date: (val) => new Date(Number(val) * 1000), // Unix timestamp -> Date
		},

		// 3. Define custom serializers (Serialization: Model -> JSON)
		serializers: {
			// ACTIVE -> "ACTIVE" (no change needed usually, but can override)
			date: (val: Date) => Math.floor(val.getTime() / 1000), // Date -> Unix timestamp
		},
	}
)
class MyModel extends QModel<IMyInterface> {
	declare status: string;
	declare date: Date;
}
```

### Independent Serializers

You don't need to define a transformer to define a serializer. You can use them independently!

```typescript
@Quick({
    date: Date // Standard Date transformer
}, {
    serializers: {
        // Custom serialization logic ONLY
        // Deserialization will still use the standard Date transformer
        date: (val: Date) => val.getTime()
    }
})
```

This approach is recommended when:

- You want to keep the type definition clean (`status: String`).
- You need specific serialization logic (e.g. converting Date back to Unix timestamp instead of ISO string).
- You want to separate concerns.
