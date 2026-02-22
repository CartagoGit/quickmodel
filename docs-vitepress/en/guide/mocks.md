# Mock Generation

QuickModel includes a powerful built-in mock generator powered by `@faker-js/faker`, which is **included automatically** with the library. You don't need to install anything extra.

## Basic Usage

Every QModel has a static `.mock()` method that returns a **Mock Builder**. You must call `.random()` or `.array()` to get the actual data.

```typescript
@Quick({ name: String, email: String, isActive: Boolean })
class User extends QModel<IUser> {
	declare name: string;
	declare email: string;
	declare isActive: boolean;
}

// 1. Generate a single random instance
const user = User.mock().random();
console.log(user instanceof User); // true

// 2. Generate an array of 10 instances
const users = User.mock().array(10);
console.log(users.length); // 10

// 3. Generate with partial overrides (fixed data)
const admin = User.mock().random({ role: 'admin' });
console.log(admin.role); // 'admin'
```

> [!NOTE] IMPORTING MOCK TYPES
> If you need to type the `type` parameter explicitly (e.g. `'random' | 'empty'`), you can import `IQMockType` from types:
>
> ```typescript
> import type { IQMockType } from '@cartago-git/quickmodel/types';
> ```
>
> For advanced custom usage, `QMockGenerator` is available in advanced:
>
> ```typescript
> import { QMockGenerator } from '@cartago-git/quickmodel/advanced';
> ```

## How It Works

QuickModel automatically infers appropriate fake data based on your type definitions:

QuickModel supports generating mocks for all standard types, including Primitives, Dates, Collections, and Binary data.

> [!TIP]
> For a full list of supported types and aliases, see the **[Aliases Reference](./aliases.md)**.

**Example:**

| Type                  | Generated Mock   |
| :-------------------- | :--------------- |
| `String` / `'string'` | `"Hello World!"` |
| `Date` / `'date'`     | `2024-01-01T...` |

### Implicit vs Explicit Types

**Implicit (Inferred):**
In most cases, **you don't need to do anything!** QuickModel automatically reads the TypeScript metadata.

**Explicit (Recommended):**
We recommend being explicit in the decorator to ensure consistent behavior across all environments.

```typescript
@Quick({
  name: String, // Explicit
  age: 'number' // Explicit alias
})
```

### Smart Inference

The mock generator is smart enough to guess context from property names.

```typescript
@Quick({
  email: String,       // Generates "alice@example.com"
  firstName: String,   // Generates "Alice"
  avatar: URL,         // Generates "https://placeimg.com..."
  createdAt: Date      // Generates "2023-11-20T..."
})
```

### Custom Transformers & Mocking

::: warning CUSTOM TRANSFORMERS
If you use **Custom Transformers** to handle input (Deserialization), QuickModel **cannot** guess how to generate data for them.

**You MUST providing a custom `mocker`**:

```typescript
@Quick({
  // Transformer expects uppercase
  sku: (val) => String(val).toUpperCase()
}, {
  mockers: {
    // Explicitly generate compatible mock data
    sku: () => 'ITEM-123'
  }
})
```

If you forget this, QuickModel will warn you at runtime and generate a default value that might be invalid for your app logic.
:::

## Advanced Usage

### Nested Models

Mocks are generated recursively. Nested models will also be fully mocked.

```typescript
@Quick({ address: Address })
class User extends QModel<IUser> {
	declare address: Address;
}

const user = User.mock().random();
console.log(user.address.city); // "New York" (Random)
```

### Partial Arrays

You can create arrays where all items share some common properties:

```typescript
// 10 users, all with isActive = true
const activeUsers = User.mock().array(10, { isActive: true });
```

This generates 10 unique users, but **forces** `isActive: true` on all of them.

## Testing Patterns

### Unit Tests

```typescript
describe('UserService', () => {
	it('should create a valid user', () => {
		const mockUser = User.mock().random({
			name: 'Test User',
		});

		const savedUser = service.save(mockUser);
		expect(savedUser.name).toBe('Test User');
	});
});
```

### Database Seeding

Perfect for populating local databases:

```typescript
async function seedKeywords() {
	const users = User.mock().array(50);
	await db.insertMany('users', users);
	// output: 'Seeded 50 users!'
}
```

## Best Practices

1. **Explicit Overrides**: If a test depends on a specific value (e.g., `role: 'admin'`), ALWAYS override it. rely on random chance.
2. **Fixtures**: Create a dedicated `fixtures.ts` file to export common mock configurations.

```typescript
// fixtures.ts
export const mockAdmin = User.mock().random({ role: 'admin' });
export const mockGuest = User.mock().random({ role: 'guest' });
```

---

## Mock Builder API Reference

The `.mock()` method returns a `QMockBuilder` with a fluent API.

### Model Instance Generation

Returns actual instances of your class (`instanceof User` will be true).

| Method                                | Description                                                                            | Signature                                                       |
| :------------------------------------ | :------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| **`random(overrides?)`**              | Generates 1 instance with **random** realistic data (Faker).                           | `(overrides?: Partial<T>) => T`                                 |
| **`empty(overrides?)`**               | Generates 1 instance with **empty/null** values.                                       | `(overrides?: Partial<T>) => T`                                 |
| **`minimal(overrides?)`**             | Generates 1 instance with only **required** fields populated.                          | `(overrides?: Partial<T>) => T`                                 |
| **`full(overrides?)`**                | Generates 1 instance with **all** fields (req + optional) populated.                   | `(overrides?: Partial<T>) => T`                                 |
| **`sample(overrides?)`**              | Generates 1 instance with **deterministic/static** sample data.                        | `(overrides?: Partial<T>) => T`                                 |
| **`array(count, type?, overrides?)`** | Generates `count` instances. `type` defaults to `'random'`. `overrides` is a callback. | `(n: number, type?: IQMockType, fn?: (i) => Partial<T>) => T[]` |

```typescript
// Array with custom overrides per item
User.mock().array(5, 'random', (index) => ({
	name: `User ${index}`,
}));
```

### Plain Interface Generation

Returns plain JavaScript objects (POJOs), **not** class instances. Useful for API response mocking where you don't want class methods.

| method                             | description                     |
| :--------------------------------- | :------------------------------ |
| **`interfaceRandom(overrides?)`**  | Plain object with random data.  |
| **`interfaceEmpty(overrides?)`**   | Plain object with empty data.   |
| **`interfaceSample(overrides?)`**  | Plain object with sample data.  |
| **`interfaceMinimal(overrides?)`** | Plain object with minimal data. |
| **`interfaceFull(overrides?)`**    | Plain object with full data.    |
| **`interfaceArray(count, ...)`**   | Array of plain objects.         |

```typescript
// Returns { name: "..." } instead of User { name: "..." }
const userJson = User.mock().interfaceRandom();
```
