# @Quick Decorator

The `@Quick()` decorator is the **heart** of QuickModel. It bridges the gap between static TypeScript types and runtime behavior, defining exactly how your data should be serialized, deserialized, and mocked.

## Overview

TypeScript types (`: string`, `: Date`) are **erased** at runtime. Without `@Quick`, the library sees your properties as plain values.

`@Quick` restores this lost type information, allowing QuickModel to:

1.  **Transform** incoming JSON (e.g., string "2024-01-01" -> `Date` object).
2.  **Validate** data structures.
3.  **Generate** accurate mocks.

## Usage

### Class Decoration (Recommended)

The cleanest way to define your model's schema. Pass a **Type Map** object where keys match your property names.

```typescript
@Quick({
	name: String, // Primitive
	age: 'number', // String Literal Alias
	birthDate: Date, // Constructor
	tags: [Set], // Collection
	metadata: Map, // Collection
	avatar: URL, // Web API
})
class User extends QModel<IUser> {
	// ...
}
```

### Property Decoration

Useful for specific cases or if you prefer decorating fields directly.

```typescript
class User extends QModel<IUser> {
	@QType(Date)
	declare createdAt: Date;
}
```

---

## Supported Types Reference

QuickModel supports a vast array of types out of the box.

### Primitives

Explicitly mapping primitives ensures coercions (e.g., `"123"` string becomes `123` number).

| Type        | Syntax                  | Description                                                            |
| :---------- | :---------------------- | :--------------------------------------------------------------------- |
| **String**  | `String` / `'string'`   | Casts value to string.                                                 |
| **Number**  | `Number` / `'number'`   | Casts value to number.                                                 |
| **Boolean** | `Boolean` / `'boolean'` | Casts value to boolean.                                                |
| **BigInt**  | `BigInt` / `'bigint'`   | **Crucial:** Transforms string integers ("900...") to native `BigInt`. |
| **Symbol**  | `Symbol` / `'symbol'`   | Creates a unique symbol.                                               |

### Dates & Time

Native `Date` handling is one of the most useful features.

| Type     | Syntax            | Input (JSON)             | Output (Model)  |
| :------- | :---------------- | :----------------------- | :-------------- |
| **Date** | `Date` / `'date'` | `"2024-01-01T12:00:00Z"` | `new Date(...)` |

### Collections

Automatically transform arrays of data into efficient ES6 Collections.

| Type        | Syntax          | Input (JSON)       | Output (Model)                   |
| :---------- | :-------------- | :----------------- | :------------------------------- |
| **Set**     | `Set` / `'set'` | `["a", "b", "a"]`  | `Set {"a", "b"}` (De-duplicated) |
| **Map**     | `Map` / `'map'` | `[["key", "val"]]` | `Map { "key" => "val" }`         |
| **WeakMap** | `WeakMap`       | `[[obj, val]]`     | `WeakMap`                        |
| **WeakSet** | `WeakSet`       | `[obj1, obj2]`     | `WeakSet`                        |

### Binary Data & Buffers

Handle binary data directly, perfect for file uploads or crypto.

| Type             | Syntax                                           |
| :--------------- | :----------------------------------------------- |
| **ArrayBuffer**  | `ArrayBuffer` / `'arraybuffer'`                  |
| **Uint8Array**   | `Uint8Array` / `'uint8array'`                    |
| **Float32Array** | `Float32Array` / `'float32array'`                |
| **DataView**     | `DataView` / `'dataview'`                        |
| **TypedArrays**  | `Int8Array`, `Int16Array`, `BigInt64Array`, etc. |

### Structural Types

| Type       | Syntax                | Description                                               |
| :--------- | :-------------------- | :-------------------------------------------------------- |
| **RegExp** | `RegExp` / `'regexp'` | Converts string regex (`"/^test$/i"`) to `RegExp` object. |
| **URL**    | `URL` / `'url'`       | Converts URL string to `URL` object.                      |
| **Error**  | `Error` / `'error'`   | Reconstructs `Error` objects.                             |

---

## Cookbook: Common Scenarios

### How do I handle Arrays?

Always use **bracket notation** `[Type]`.

```typescript
@Quick({
  // Array of Dates
  dates: [Date],

  // Array of Custom Models
  posts: [Post],

  // Array of Arrays (Matrix)
  matrix: [[Number]]
})
```

### How do I use Custom Transformers?

You can pass a **function** to any property. This function acts as a **Deserializer**.

**Data Flow:**
`JSON Input` -> **`Transformer Function`** -> `Class Property`

```typescript
@Quick({
  // 1. Data Cleaning
  // Input: "  john@example.com " -> Output: "john@example.com"
  email: (val: string) => val.trim().toLowerCase(),

  // 2. Calculation
  // Input: "100" -> Output: 121 (Adds 21% Tax)
  priceWithTax: (val: string) => Number(val) * 1.21,

  // 3. Parsing Complex Data
  // Input: "{\"a\":1}" (String) -> Output: { a: 1 } (Object)
  config: JSON.parse
})
```

### How do I math?

You can use native `Math` functions directly as transformers!

```typescript
@Quick({
  // Input: 10.567 -> Output: 11
  score: Math.round,

  // Input: -50 -> Output: 50
  distance: Math.abs,

  // Input: 5.9 -> Output: 5
  level: Math.floor
})
```

### How do I nest other models?

Just pass the class constructor.

```typescript
@Quick({
	// Single nested model
	profile: UserProfile,

	// Array of models
	friends: [User],
})
class User extends QModel<IUser> {
	declare profile: UserProfile;
	declare friends: User[];
}
```

---

## Summary Table: String Aliases

Quick reference for all string aliases that activate standard behavior.

| Alias           | Resulting TypeConstructor |
| :-------------- | :------------------------ |
| `'string'`      | `String`                  |
| `'number'`      | `Number`                  |
| `'boolean'`     | `Boolean`                 |
| `'bigint'`      | `BigInt`                  |
| `'date'`        | `Date`                    |
| `'regexp'`      | `RegExp`                  |
| `'symbol'`      | `Symbol`                  |
| `'url'`         | `URL`                     |
| `'error'`       | `Error`                   |
| `'map'`         | `Map`                     |
| `'set'`         | `Set`                     |
| `'arraybuffer'` | `ArrayBuffer`             |
| `'uint8array'`  | `Uint8Array`              |
