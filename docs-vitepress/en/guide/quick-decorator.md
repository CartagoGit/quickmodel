# @Quick Decorator

The `@Quick()` decorator is the **heart** of QuickModel. It bridges the gap between static TypeScript types and runtime behavior, defining exactly how your data should be IQSerialized, deserialized, and mocked.

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

### Advanced Configuration (Second Argument)

You can pass a second options object to `@Quick` for advanced control:

```typescript
@Quick({
  items: [Content, Metadata] // 1. Type Mapping
}, {
  // 2. Advanced Options
  unknownPropertyPolicy: 'error', // Reject unknown properties
  discriminators: { ... }, // Polymorphism config
  transformers: { ... }, // Custom deserializers
  serializers: { ... } // Custom serializers
})
class MyModel extends QModel<IMyInterface> { ... }
```

### Options Reference:

- **[`unknownPropertyPolicy`](#5-unknown-property-policy)**: (Boolean) If `true`, throws an error when unknown properties are present in the input.
- **[`transformers`](#1-custom-transformers-deserialization)**: Custom deserialization logic.
- **[`serializers`](#2-custom-serializers)**: Custom serialization logic.
- **[`mockers`](#3-custom-mockers)**: Custom mock generation.
- **[`discriminators`](#4-discriminators-polymorphism)**: Polymorphic type handling.

### Property Modifiers (`!` vs `declare`)

Because `@Quick()` wraps your class constructor, it automatically handles property initialization.

- ✅ **`!` (Definite Assignment)**: Safe to use. The decorator fixes the "undefined overwrite" issue automatically.
- ✅ **`?` (Optional)**: Safe to use.
- ✅ **`declare`**: Safe to use (and strictly required if using `@QType` _without_ `@Quick`).

```typescript
@Quick({ name: String })
class User extends QModel<IUser> {
	// All valid with @Quick
	name!: string; // initialized by decorator
	age?: number; // optional
	declare email: string; // metadata only
}
```

::: tip ROBUSTNESS
**Recommendation**: Even if you use `@QType` for individual fields, adding `@Quick()` (even empty) to the class is recommended if you use default values (`prop = 123`). It guarantees that QuickModel's logic runs _before_ accidental overwrites occur.
:::

---

## Advanced Options

```typescript
@Quick({
  items: [Content, Metadata] // 1. Type Mapping
}, {
  // 2. Advanced Options
  unknownPropertyPolicy: 'error',
  transformers: { ... },
  serializers: { ... },
  mockers: { ... },
  discriminators: { ... }
})
class MyModel extends QModel<IMyInterface> { ... }
```

### 1. Custom Transformers (Deserialization)

Override the default deserialization logic (JSON -> Model) for specific properties.

```typescript
@Quick({
  status: String
}, {
  transformers: {
    // Force uppercase on receive
    status: (val) => String(val).toUpperCase()
  }
})
```

### 2. Custom Serializers

Override the default serialization logic (Model -> JSON/Object) for specific properties.

```typescript
@Quick({
  date: Date
}, {
  transformers: {
    // Deserialize: seconds -> Date
    date: (val) => new Date(Number(val) * 1000)
  },
  serializers: {
    // Serialize: Date -> seconds
    date: (val) => Math.floor((val as Date).getTime() / 1000)
  }
})
```

### 3. Custom Mockers

Define how to generate mock data for specific fields, especially when using custom transformers where automatic inference might fail.

```typescript
@Quick({
  sku: (val) => `ITEM-${val}`
}, {
  mockers: {
    // Generate valid SKU base
    sku: () => faker.string.alphanumeric(8)
  }
})
```

### 4. Discriminators (Polymorphism)

Handle arrays containing different model types (Union Types).

```typescript
@Quick({
  // Declare ALL possible types
  items: [Content, Metadata]
}, {
  discriminators: {
    // Option A: Field Name (Simple)
    // Uses data.type to decide ('content' -> Content, 'metadata' -> Metadata)
    items: 'type',

    // Option B: Custom Function (Flexible)
    items: (data) => 'text' in (data as any) ? Content : Metadata
  }
})
```

### 5. Unknown Property Policy

QuickModel provides three policies for handling unknown properties: 'keep' (default - preserves them), 'strip' (removes them), or 'error' (throws an error).

```typescript
@Quick({ name: String }, { unknownPropertyPolicy: 'error' })
class User extends QModel<IUser> {}

// Throws Error: "Property 'unknownProp' is not allowed in strict mode"
new User({ name: 'John', unknownProp: 123 });
```

---

## Supported Types Reference

QuickModel supports a vast array of types and string aliases.

> [!TIP]
> For a **complete list** of all supported string aliases (including Web APIs, Binary Data, etc.), see the [Aliases Reference](./aliases.md).

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

::: warning IMCOMPLETE FLOW
Custom transformers only handle **Input** (Deserialization).

If you use them, **QuickModel cannot automatically know** how to:

1.  **Serialize** the data back to its original format (it will just output the transformed value).
2.  **Mock** the data correctly (it will generate a default value that might not satisfy your transformer).

**You MUST explicitly define [`serializers`](#2-custom-serializers) and [`mockers`](#3-custom-mockers) if you need those features.**
:::

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

## Supported Types & Aliases

QuickModel provides string aliases (like `'int8array'`, `'blob'`, `'urlsearchparams'`) for almost every supported type.

👉 **[View the Complete Aliases Reference](./aliases.md)** for the exhaustive list of all 30+ supported aliases.
