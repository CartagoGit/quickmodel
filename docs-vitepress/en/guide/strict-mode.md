# Strict Mode

QuickModel 3.0 introduces an optional **Strict Mode** (`strict: true`) designed for applications requiring rigorous input data validation, ensuring that **only** explicitly defined properties are accepted.

::: info Default Behavior
By default, Strict Mode is **DISABLED** (`false`). QuickModel adopts a flexible stance, allowing extra properties to pass through without errors.
:::

## What is Strict Mode?

When enabled, QuickModel inspects every property of the input object (`data`) before assigning it to the instance. If it finds a property that is **not** defined in your model, it throws a `QModelError`.

This is useful for:
- Preventing data pollution (injecting unwanted fields).
- Detecting typos in backend responses or interfaces.
- Ensuring the in-memory object matches the class definition exactly.

## How to Enable

You can enable strict mode by passing `{ strict: true }` in the second argument of the `@Quick` decorator.

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
  name: string;
}

// ✅ Enable Strict Mode
@Quick({}, { strict: true })
class User extends QModel<IUser> {
  declare name: string;
}

// Correct usage
User.create({ name: 'Alice' }); // OK

// Incorrect usage - Throws Error
User.create({ 
  name: 'Alice', 
  isAdmin: true // ❌ Error: Property 'isAdmin' is not defined in model User
});
```

## Property Requirements

For a property to be "accepted" in Strict Mode, it must meet at least one of these conditions:

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
If you use `declare property: type;` without `@QType` or `@Quick({...})`, that property **does not exist** at runtime (JavaScript). In Strict Mode, if you try to assign a value to it, QuickModel will treat it as an extra property and throw an error.

**Solution**: Register the property in `@Quick` (e.g., `{ name: String }`) or use `@QType()`.
:::

## Complete Example

```typescript
interface IProduct {
  id: number;
  tags: string[];
}

@Quick({
  tags: [String] // Explicitly registered
}, { 
  strict: true // 🛡️ Enabled
})
class Product extends QModel<IProduct> {
  declare id: number; // ⚠️ WARNING: If not registered, this will fail
  declare tags: string[];
}

// ❌ This will fail because 'id' is 'declare' and not in @Quick
Product.create({ id: 1, tags: ['a'] }); 

// ✅ Correct Solution:
@Quick({
  id: Number,     // Register primitive
  tags: [String]
}, { strict: true })
class ProductFixed extends QModel<IProduct> {
  declare id: number; 
  declare tags: string[];
}
```
