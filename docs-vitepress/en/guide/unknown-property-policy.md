# Unknown Property Policy

QuickModel 1.0 provides three strategies for handling unknown properties in input data through the `unknownPropertyPolicy` option.

::: info Default Behavior
By default, QuickModel uses `'keep'` policy, adopting a flexible stance that allows extra properties to pass through without errors.
:::

::: warning Upcoming Breaking Change in v2.0.0
The default value of `unknownPropertyPolicy` will change from `'keep'` to `'strip'` in **v2.0.0**.

To avoid unexpected behavior when upgrading, **always set `unknownPropertyPolicy` explicitly** in your models or in the global config:

```typescript
// Per-model (recommended for granular control)
@Quick({ name: String }, { unknownPropertyPolicy: 'strip' })
class User extends QModel<IUser> { ... }

// Or globally (applies to all models without an explicit override)
QConfig.configure({
  defaults: { unknownPropertyPolicy: 'strip' },
});
```

If you rely on the `'keep'` behavior, set it explicitly to silence this deprecation and be future-proof.
:::

## What is Unknown Property Policy?

When deserializing data, QuickModel can encounter properties that are not explicitly defined in your model. The `unknownPropertyPolicy` option controls how these properties are handled.

**Three available strategies:**

- **`'keep'`** (default): Preserves extra properties on the instance
- **`'strip'`**: Silently removes extra properties (useful for sanitization)
- **`'error'`**: Throws an error when unknown properties are detected (strictest)

This is useful for:

- Preventing data pollution (policy: `'error'`)
- Sanitizing untrusted input (policy: `'strip'`)
- Detecting typos in backend responses (policy: `'error'`)
- Flexible data handling (policy: `'keep'`)

## How to Configure

### Per Class

You can set the policy by passing `unknownPropertyPolicy` in the second argument of the `@Quick` decorator.

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	name: string;
}

// ✅ Reject unknown properties (strictest)
@Quick({}, { unknownPropertyPolicy: 'error' })
class StrictUser extends QModel<IUser> {
	declare name: string;
}

// ✅ Strip unknown properties (sanitization)
@Quick({}, { unknownPropertyPolicy: 'strip' })
class SanitizedUser extends QModel<IUser> {
	declare name: string;
}

// ✅ Keep unknown properties (default - most flexible)
@Quick({}, { unknownPropertyPolicy: 'keep' })
class FlexibleUser extends QModel<IUser> {
	declare name: string;
}
```

### Globally (Recommended for Security)

You can enforce a global policy for your entire application using `QConfig`. This is the recommended approach for security-critical applications.

```typescript
import { QConfig } from '@cartago-git/quickmodel';

// Call this at the start of your application (e.g. index.ts or server.ts)
QConfig.configure({
	defaults: {
		unknownPropertyPolicy: 'error', // Reject unknown properties by default
	},
});
```

When configured globally, you can still override for specific legacy classes:

```typescript
// Override global policy locally for legacy/flexible models
@Quick({}, { unknownPropertyPolicy: 'keep' })
class LegacyData extends QModel<any> {
	// ...
}
```

## Usage Examples

### Policy: `'error'` (Strictest)

```typescript
@Quick({}, { unknownPropertyPolicy: 'error' })
class User extends QModel<IUser> {
	declare name: string;
}

// Correct usage
User.create({ name: 'Alice' }); // ✅ OK

// Incorrect usage - Throws Error
User.create({
	name: 'Alice',
	isAdmin: true, // ❌ Error: Strict Mode: Property 'isAdmin' is not defined in model User
});
```

### Policy: `'strip'` (Sanitization)

```typescript
@Quick({}, { unknownPropertyPolicy: 'strip' })
class User extends QModel<IUser> {
	declare name: string;
}

const user = User.create({
	name: 'Alice',
	isAdmin: true, // Will be removed silently
});

console.log(user.name); // 'Alice'
console.log((user as any).isAdmin); // undefined (stripped)
```

### Policy: `'keep'` (Default - Flexible)

```typescript
@Quick({}, { unknownPropertyPolicy: 'keep' })
class User extends QModel<IUser> {
	declare name: string;
}

const user = User.create({
	name: 'Alice',
	isAdmin: true, // Will be preserved
});

console.log(user.name); // 'Alice'
console.log((user as any).isAdmin); // true (kept)
```

## Property Requirements for `'error'` Policy

For a property to be "accepted" when using `unknownPropertyPolicy: 'error'`, it must meet at least one of these conditions:

1. **Be in the transformation map**:

    ```typescript
    @Quick({ createdAt: Date }) // 'createdAt' is known
    ```

2. **Be decorated with `@QType`**:

    ```typescript
    @QType() declare name: string; // 'name' is known via metadata
    ```

3. **Exist physically at runtime (initialized)**:
    ```typescript
    class User {
    	role: string = 'guest'; // 'role' is known because it exists on the instance
    }
    ```

::: warning Watch out for `declare`
If you use `declare property: type;` without `@QType` or `@Quick({...})`, that property **does not exist** at runtime (JavaScript). With `unknownPropertyPolicy: 'error'`, attempting to assign a value will fail.

**Solution**: Register the property in `@Quick` (e.g., `{ name: String }`) or use `@QType()`.
:::

## Complete Example

```typescript
interface IProduct {
	id: number;
	tags: string[];
}

@Quick(
	{
		tags: [String], // Explicitly registered
	},
	{
		unknownPropertyPolicy: 'error', // 🛡️ Strict validation
	}
)
class Product extends QModel<IProduct> {
	declare id: number; // ⚠️ WARNING: If not registered, this will fail
	declare tags: string[];
}

// ❌ This will fail because 'id' is 'declare' and not in @Quick
Product.create({ id: 1, tags: ['a'] });

// ✅ Correct Solution:
@Quick(
	{
		id: Number, // Register primitive
		tags: [String],
	},
	{ unknownPropertyPolicy: 'error' }
)
class ProductFixed extends QModel<IProduct> {
	declare id: number;
	declare tags: string[];
}
```

## Migration from deprecated `strict` option

::: info Migrating from older versions
If you're upgrading from a version that used `strict: true/false`:

```typescript
// OLD (deprecated):
@Quick({}, { strict: true })
@Quick({}, { strict: false })

// NEW (current):
@Quick({}, { unknownPropertyPolicy: 'error' })
@Quick({}, { unknownPropertyPolicy: 'keep' })
```

:::

## Security Considerations

For security-critical applications (APIs, data processing):

- ✅ **Use `'error'`** for public-facing APIs to prevent mass-assignment attacks
- ✅ **Use `'strip'`** for sanitizing untrusted input before processing
- ⚠️ **Use `'keep'`** only for internal/trusted data sources

See [SECURITY.md](../../../SECURITY.md) for comprehensive security guidelines.
