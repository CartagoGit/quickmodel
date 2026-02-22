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

## Field Syntax — `declare` vs `!`

The correct field syntax depends on which TypeScript decorator mode you are using.

| Mode       | `tsconfig.json`                | Required field syntax     |
| ---------- | ------------------------------ | ------------------------- |
| **Legacy** | `experimentalDecorators: true` | `declare fieldName: Type` |
| **TC39**   | _(no flag needed)_             | `fieldName!: Type`        |

### Legacy mode — use `declare`

When `experimentalDecorators: true` is set, decorated fields **must** use the `declare` keyword.

```typescript
// Legacy mode (experimentalDecorators: true)
class User extends QModel<IUser> {
	@QType(String)
	declare name: string; // ✅ Emits metadata only — no JS initializer code
}
```

This ensures TypeScript emits the type metadata but does **not** generate property initialization code that would overwrite QuickModel's getters/setters.

#### ❌ Incorrect in legacy mode

```typescript
// ❌ BAD: Without `@Quick`, the '!' initializer runs AFTER the decorator
// and overwrites the getter/setter QuickModel placed on the prototype.
class User extends QModel<IUser> {
	@QType(String)
	name!: string; // initializer sets this.name = undefined → shadows getter ❌
}

// ✅ OK: @Quick() cleans up initializer side-effects.
@Quick()
class User extends QModel<IUser> {
	@QType(String)
	name!: string; // Works — @Quick handles the lifecycle
}

// ❌ BAD: Value initializers also run after deserialization.
class User extends QModel<IUser> {
	@QType(String)
	status = 'Default'; // overwrites deserialized data ❌
}
```

::: tip RECOMMENDATION
**Always use `@Quick()` on the class** if you define default values (`name = "default"`) or strict initialization (`name!`). This ensures robust behaviour by letting QuickModel manage the property lifecycle.
:::

#### Why does this fail?

1. **Decorators run first** — QuickModel replaces the property with a getter/setter on the prototype.
2. **Initializers run second** — `name!: string` or `name = "x"` generates `this.name = void 0` / `this.name = "x"` inside the constructor.
3. **Shadowing** — The direct instance assignment hides the prototype getter/setter. The property becomes a plain, disconnected property.

### TC39 mode — use `!`

In TC39 decorator mode (`experimentalDecorators` absent or `false`), TypeScript **does not call field decorators on `declare` fields**. You must use `!` for every field decorated with `@QType`.

```typescript
// TC39 mode (no experimentalDecorators flag)
@Quick()
class User extends QModel<IUser> {
	@QType(Date)
	createdAt!: Date; // ✅ TC39 mode — use ! (not declare)

	@QType(String)
	name!: string; // ✅
}
```

::: warning TC39 without `@Quick`
Even in TC39 mode, omitting `@Quick()` combined with `useDefineForClassFields: true` (default for ES2022+ targets) can cause the field initializer to shadow QuickModel's getter. Always pair `@Quick()` with `@QType()` in TC39 mode.
:::

## TC39 mode — `addInitializer` behaviour

In TC39 mode `@QType` registers field metadata via the `addInitializer` callback provided by the TC39 decorator context. This means:

- Metadata is registered **on first instance creation**, not at class-definition time.
- Subsequent instantiations are protected by an internal deduplication guard (WeakSet), so the metadata is only written once per class.
- The timing is safe: `addInitializer` fires before `QModel.initialize()` reads the metadata.

```typescript
// TC39 mode — metadata is registered when the first instance is created
@Quick()
class Post extends QModel<IPost> {
	@QType(Date)
	publishedAt!: Date;

	@QType([String]) // array of strings
	tags!: string[];
}

// ← At this point the class is defined but metadata is NOT yet set
const post = Post.create({
	publishedAt: '2025-01-01',
	tags: ['ts', 'decorators'],
});
// ← addInitializer ran: metadata is now registered → publishedAt is a Date ✅
```

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
	@QType((val) => Number(val) * 100)
	declare centAmount: number;
}
```

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
