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

## How It Works

QuickModel automatically infers appropriate fake data based on your type definitions:

| Type                    | Generated Mock                                                        |
| :---------------------- | :-------------------------------------------------------------------- |
| `String` / `'string'`   | Random string / Auto-inferred context ('email', 'name', 'uuid', etc.) |
| `Number` / `'number'`   | Random number                                                         |
| `Boolean` / `'boolean'` | Random boolean                                                        |
| `Date` / `'date'`       | Random recent date                                                    |
| `BigInt` / `'bigint'`   | Random large integer                                                  |
| `RegExp` / `'regexp'`   | Random regex pattern                                                  |
| `Symbol` / `'symbol'`   | Random symbol                                                         |
| `URL` / `'url'`         | Random URL                                                            |
| `Error` / `'error'`     | Random Error object                                                   |
| `Map` / `'map'`         | Map with random entries                                               |
| `Set` / `'set'`         | Set with random values                                                |
| `Buffer` Types          | `ArrayBuffer`, `DataView`, `Uint8Array`, `Float32Array`, etc.         |

### Why do I need to specify types?

You might ask: _"If I already declared `name: string`, why do I need `@Quick({ name: String })`?"_

**Answer:** TypeScript types (`: string`) are **erased** when compiled to JavaScript. At runtime, the library cannot see your TypeScript type definitions. The `@Quick` decorator (or `@QType`) provides the necessary **runtime metadata** so the library knows how to generate mocks and deserialize data.

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
	console.log('Seeded 50 users!');
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
