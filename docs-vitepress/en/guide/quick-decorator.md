# @Quick Decorator

The `@Quick()` decorator is the core of the QuickModel library. It defines the mapping between your runtime properties and their serialized forms.

## Usage

You can use `@Quick` to decorate class properties or the class itself.

### Class Decoration (Type Map)

The most common and recommended way. Pass an object mapping property names to types/transformers.

```typescript
@Quick({
	name: String,
	age: 'number', // String literal alias
	birthDate: Date,
	tags: [Set],
	meta: Map,
})
class User extends QModel<IUser> {
	// ...
}
```

## Supported Types

You can specify transformations using:

1. **Constructors** (e.g., `Date`)
2. **String Literals** (e.g., `'date'`)
3. **Other Models** (Nested models)
4. **Arrays** (e.g., `[Date]`)
5. **Inline Functions** (Custom logic)

### String Literals (Aliases)

QuickModel supports descriptive string aliases for all built-in types. This is useful for avoiding imports or cleaner syntax.

| Alias       | Description                | Example Input           | Example Output      |
| ----------- | -------------------------- | ----------------------- | ------------------- |
| `'string'`  | Casts to string            | `123`                   | `"123"`             |
| `'number'`  | Casts to number            | `"123"`                 | `123`               |
| `'boolean'` | Casts to boolean           | `"true"`                | `true`              |
| `'bigint'`  | Transforms to BigInt       | `"9007199254740991"`    | `9007199254740991n` |
| `'date'`    | Transforms ISO string      | `"2024-01-01"`          | `Date object`       |
| `'regexp'`  | Transforms pattern         | `"/^test$/i"`           | `/^test$/i`         |
| `'map'`     | Transforms array of tuples | `[["k","v"]]`           | `Map {"k" => "v"}`  |
| `'set'`     | Transforms array           | `["a", "b"]`            | `Set {"a", "b"}`    |
| `'url'`     | Transforms string          | `"https://example.com"` | `URL object`        |
| `'error'`   | Transforms object          | `{"message":"..."}`     | `Error object`      |

**Binary Types:**
`'arraybuffer'`, `'dataview'`, `'int8array'`, `'uint8array'`, `'float32array'`, etc.

### Array Syntax

Always use bracket notation `[Type]` for arrays.

```typescript
@Quick({
  dates: [Date],         // Array of Dates
  tags: ['string'],      // Array of strings
  matrix: [[BigInt]]     // Array of arrays of BigInts
})
```

### Inline Transformers

You can pass a function for quick, custom transformations directly in the decorator.

```typescript
@Quick({
  // Uppercase names
  name: (val: string) => val.toUpperCase(),

  // Custom parsing
  score: (val: string) => parseInt(val, 10) * 2
})
```

## Nested Models

To use another QuickModel as a property type, simply pass the class constructor.

```typescript
@Quick({ address: Address })
class User extends QModel<IUser> {
	declare address: Address;
}
```

## Property Decorator (Legacy)

You can also decorate properties individually, though class decoration is preferred for cleaner code.

```typescript
class User extends QModel<IUser> {
	@Quick(Date)
	declare createdAt: Date;
}
```

This is functionally equivalent but can be more verbose if you have many properties.
