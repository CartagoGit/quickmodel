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

### Advanced Configuration (Second Argument)

You can pass a second options object to `@Quick` for advanced control:

```typescript
@Quick({
  items: [Content, Metadata] // 1. Type Mapping
}, {
  // 2. Advanced Options
  strict: true, // Reject unknown properties
  discriminators: { ... }, // Polymorphism config
  transformers: { ... }, // Custom deserializers
  serializers: { ... } // Custom serializers
})
class MyModel extends QModel<IMyInterface> { ... }
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
