# @QType Decorator

While the [`@Quick`](./quick-decorator) class decorator is the **recommended** way to define models (it's cleaner and DRYer), QuickModel also provides the `@QType` property decorator for granular control.

::: info RECOMMENDATION
We strongly recommend using **`@Quick`** for 95% of use cases. It keeps valid types in one place and avoids decorator clutter. Use `@QType` only when you need specific overrides for a single field or prefer explicit decoration.
:::

## Usage

Place `@QType` before a property declaration to explicitly tell QuickModel how to handle that property.

```typescript
class User extends QModel<IUser> {
	// 1. Standard Usage (Constructor)
	@QType(Date)
	declare createdAt: Date;

	// 2. String Alias
	@QType('bigint')
	declare balance: bigint;

	// 3. Custom Transformer (Deserializer)
	@QType((val) => String(val).toUpperCase())
	declare code: string;

	// 4. Advanced Options (Transformer + Serializer)
	@QType(Date, {
		serializer: (date) => date.toISOString(),
	})
	declare modifiedAt: Date;
}
```

## The `declare` Keyword (CRITICAL)

When using `@QType` (or `@Quick`), you **MUST** use the `declare` keyword for your properties.

### ✅ Correct Usage

```typescript
class User extends QModel<IUser> {
	@QType(String)
	declare name: string; // ✅ Creates a metadata definition, NO JavaScript code
}
```

This ensures TypeScript emits the type metadata but does **not** generate property initialization code that would overwrite QuickModel's getters/setters.

### ❌ Incorrect Usage

**Do NOT use `!` (Definite Assignment Assertion) or `=` (Initializers).**

````typescript
// ❌ BAD: Without `@Quick`, this fails!
// The '!' operator (with useDefineForClassFields: true) creates a property initializer
// that runs AFTER the decorator, overwriting your getter with 'undefined'.
class User extends QModel<IUser> {
	@QType(String)
	name!: string;
}

// ✅ OK: If you use `@Quick` on the class, it fixes this automatically!
@Quick()
class User extends QModel<IUser> {
  @QType(String)
  name!: string; // Works because @Quick cleans up the instance
}

::: tip RECOMMENDATION
**Always use `@Quick()` on the class** if you plan to define default values (`name = "default"`) or use strict initialization (`name!`). This ensures robust behavior by letting QuickModel manage the property lifecycle.
:::

### Why does this fail?

1.  **Decorators run first**: QuickModel replaces your property with a Getter/Setter to intercept reads/writes and handle the underlying data.
2.  **Initializers run second**: When you do `name!: string` or `name = "x"`, TypeScript/Babel generates code in the constructor: `this.name = void 0` or `this.name = "x"`.
3.  **Shadowing**: This direct assignment on the instance **shadows** (hides) the Getter/Setter defined on the prototype. Your property becomes a dumb, plain property again, disconnected from QuickModel.

**Always use `declare`.**

## When to use @QType?

Although `@Quick` is preferred, `@QType` shines in specific scenarios:

### 1. Mixed Strategies

You want to auto-map everything with `@Quick()` but manually override a specific field inline.

```typescript
@Quick() // Auto-detects most fields
class Product extends QModel<IProduct> {
	declare name: string;
	declare price: number;

	// Override specifically for this field
	@QType((v) => Number(v) * 100)
	declare centAmount: number;
}
````

### 2. Manual Control

You prefer explicit decoration on every field for visibility, similar to other libraries like `TypeORM` or `class-validator`.

### 3. Isolated Usage

You are modifying a legacy class and only want to introduce QuickModel properties one by one.

## Advanced Options

`@QType` accepts a second argument for localized advanced control, similar to the global `@Quick` options but scoped to the single property.

```typescript
@QType(String, {
  // Custom Deserialization (JSON -> Model)
  transformer: (val) => val.trim(),

  // Custom Serialization (Model -> JSON)
  serializer: (val) => val + "_serialized",

  // Custom Mock Generation
  mocker: () => "mocked_value"
})
declare myField: string;
```
