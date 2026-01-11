# Mock Generation

QuickModel includes a powerful built-in mock generator powered by `@faker-js/faker`, making it incredibly easy to create realistic test data.

## Installation

Mock generation requires `@faker-js/faker` as a development dependency:

```bash
npm install --save-dev @faker-js/faker
```

## Basic Usage

Every QModel has a static `.mock()` method that returns a **Mock Builder**. You must call `.random()` or `.array()` to get the actual data.

```typescript
@Quick({ name: String, email: String })
class User extends QModel<IUser> {
	declare name: string;
	declare email: string;
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

| Type                    | Generated Mock                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `String` / `'string'`   | Random string (or specialized if property name matches common patterns like 'email', 'name') |
| `Number` / `'number'`   | Random number                                                                                |
| `Boolean` / `'boolean'` | Random boolean                                                                               |
| `Date` / `'date'`       | Random recent date                                                                           |
| `BigInt` / `'bigint'`   | Random large integer                                                                         |
| `URL` / `'url'`         | Random URL                                                                                   |

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
// 10 users, all active
const activeUsers = User.mock().array(10, { isActive: true });
```

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
2. **Use in `devDependencies`**: Don't ship faker to production.
3. **Fixtures**: Create a dedicated `fixtures.ts` file to export common mock configurations.

```typescript
// fixtures.ts
export const mockAdmin = User.mock().random({ role: 'admin' });
export const mockGuest = User.mock().random({ role: 'guest' });
```
