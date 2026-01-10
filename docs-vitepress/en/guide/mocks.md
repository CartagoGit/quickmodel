# Mock Generation

QuickModel includes built-in mock generation using [@faker-js/faker](https://fakerjs.dev/), making it easy to create test data for your models.

## Installation

Mock generation requires `@faker-js/faker` as a dev dependency:

```bash
npm install --save-dev @faker-js/faker
```

## Basic Usage

Use the static `mock()` method to generate mock data:

```typescript
interface IUser {
	id: number;
	name: string;
	email: string;
}

@Quick()
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
}

// Generate a single mock
const mockUser = User.mock();
console.log(mockUser);
// User {
//   id: 12345,
//   name: 'John Doe',
//   email: 'john.doe@example.com'
// }
```

## Generating Multiple Mocks

Pass a number to generate an array of mocks:

```typescript
// Generate 5 mock users
const users = User.mock(5);
console.log(users.length); // 5
console.log(users[0] instanceof User); // true
```

## Overriding Values

Provide custom values to override the generated data:

```typescript
// Single mock with overrides
const customUser = User.mock({
	name: 'Alice Smith',
	email: 'alice@example.com',
});

console.log(customUser.name); // 'Alice Smith'
console.log(customUser.email); // 'alice@example.com'
console.log(customUser.id); // Random number (generated)
```

## Overriding in Arrays

Override values for all mocks in an array:

```typescript
// Generate 3 users, all with the same name
const users = User.mock(3, { name: 'Test User' });

console.log(users[0].name); // 'Test User'
console.log(users[1].name); // 'Test User'
console.log(users[2].name); // 'Test User'
console.log(users[0].email !== users[1].email); // true (emails are different)
```

## Type-Specific Mocks

QuickModel generates appropriate mock data based on property types:

### Primitives

```typescript
@Quick()
class Example extends QModel<IExample> {
	declare id: number; // Random number
	declare name: string; // Random name
	declare active: boolean; // Random boolean
}

const mock = Example.mock();
```

### Dates

```typescript
@Quick({ createdAt: Date })
class Event extends QModel<IEvent> {
	declare createdAt: Date; // Random recent date
}

const event = Event.mock();
console.log(event.createdAt instanceof Date); // true
```

### BigInt

```typescript
@Quick({ balance: BigInt })
class Account extends QModel<IAccount> {
	declare balance: bigint; // Random large number
}

const account = Account.mock();
console.log(typeof account.balance); // 'bigint'
```

### Collections

```typescript
@Quick({
	tags: Set,
	metadata: Map,
})
class Post extends QModel<IPost> {
	declare tags: Set<string>; // Random set of strings
	declare metadata: Map<string, any>; // Random map
}

const post = Post.mock();
console.log(post.tags instanceof Set); // true
console.log(post.metadata instanceof Map); // true
```

### Arrays

```typescript
@Quick({ dates: [Date] })
class Calendar extends QModel<ICalendar> {
	declare dates: Date[]; // Array of random dates
}

const calendar = Calendar.mock();
console.log(Array.isArray(calendar.dates)); // true
console.log(calendar.dates[0] instanceof Date); // true
```

## Nested Models

Mocks are generated recursively for nested models:

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
}

@Quick({
	profile: Profile,
	createdAt: Date,
})
class User extends QModel<IUser> {
	declare id: number;
	declare email: string;
	declare profile: Profile;
	declare createdAt: Date;
}

const user = User.mock();
console.log(user.profile instanceof Profile); // true
console.log(user.profile.birthDate instanceof Date); // true
console.log(user.createdAt instanceof Date); // true
```

### Override Nested Properties

```typescript
const user = User.mock({
	profile: {
		name: 'Custom Name',
		// birthDate will be generated
	},
});

console.log(user.profile.name); // 'Custom Name'
console.log(user.profile.birthDate instanceof Date); // true
```

## Arrays of Nested Models

```typescript
@Quick({ price: BigInt })
class OrderItem extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number;
	declare price: bigint;
}

@Quick({
	items: [OrderItem],
	createdAt: Date,
})
class Order extends QModel<IOrder> {
	declare id: string;
	declare items: OrderItem[];
	declare createdAt: Date;
}

const order = Order.mock();
console.log(order.items.length > 0); // true
console.log(order.items[0] instanceof OrderItem); // true
console.log(typeof order.items[0].price); // 'bigint'
```

## Custom Mock Generators

Override the default mock generation for specific properties:

```typescript
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;

	static mock(
		countOrOverrides?: number | Partial<IUser>,
		overrides?: Partial<IUser>
	): User | User[] {
		// Custom mock logic
		const customDefaults: Partial<IUser> = {
			email: 'user@company.com', // Always use company domain
			createdAt: new Date().toISOString(), // Always use current date
		};

		if (typeof countOrOverrides === 'number') {
			return Array.from(
				{ length: countOrOverrides },
				() => super.mock({ ...customDefaults, ...overrides }) as User
			);
		}

		return super.mock({ ...customDefaults, ...countOrOverrides }) as User;
	}
}

const user = User.mock();
console.log(user.email.endsWith('@company.com')); // true
```

## Testing Patterns

### Unit Tests

```typescript
import { describe, it, expect } from 'bun:test';

describe('UserService', () => {
	it('should create a user', () => {
		const mockUser = User.mock({
			name: 'Test User',
			email: 'test@example.com',
		});

		const result = userService.create(mockUser);
		expect(result.name).toBe('Test User');
	});

	it('should handle multiple users', () => {
		const mockUsers = User.mock(10);
		const result = userService.bulkCreate(mockUsers);
		expect(result.length).toBe(10);
	});
});
```

### Integration Tests

```typescript
describe('API Integration', () => {
	it('should fetch and transform user data', async () => {
		// Mock API response
		const mockData = User.mock().toJSON();

		fetchMock.mockResponseOnce(JSON.stringify(mockData));

		const user = await api.getUser(1);
		expect(user instanceof User).toBe(true);
		expect(user.createdAt instanceof Date).toBe(true);
	});
});
```

### Fixtures

Create reusable test fixtures:

```typescript
// fixtures/users.ts
export const testUsers = {
	admin: User.mock({
		id: 1,
		name: 'Admin User',
		email: 'admin@example.com',
		role: 'admin',
	}),

	regular: User.mock({
		id: 2,
		name: 'Regular User',
		email: 'user@example.com',
		role: 'user',
	}),

	multiple: User.mock(5, { role: 'user' }),
};

// In tests
import { testUsers } from './fixtures/users';

it('should handle admin users', () => {
	const result = service.process(testUsers.admin);
	expect(result.hasAdminAccess).toBe(true);
});
```

## Seeding Databases

Use mocks to seed test databases:

```typescript
async function seedDatabase() {
	const users = User.mock(100);
	const orders = Order.mock(500);
	const products = Product.mock(50);

	await db.users.insertMany(users.map((u) => u.toJSON()));
	await db.orders.insertMany(orders.map((o) => o.toJSON()));
	await db.products.insertMany(products.map((p) => p.toJSON()));
}

// In tests
beforeAll(async () => {
	await seedDatabase();
});
```

## Faker.js Integration

QuickModel uses Faker.js under the hood. You can access faker directly for custom data:

```typescript
import { faker } from '@faker-js/faker';

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;

	static mock(overrides?: Partial<IUser>): User {
		return super.mock({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			...overrides,
		}) as User;
	}
}
```

## Best Practices

### 1. Use Mocks in Tests Only

Don't use mocks in production code:

```typescript
// ✅ Good - test file
import { describe, it } from 'bun:test';

describe('UserService', () => {
	it('should process user', () => {
		const user = User.mock();
		// ...
	});
});

// ❌ Bad - production code
export function getDefaultUser() {
	return User.mock(); // Don't do this!
}
```

### 2. Override Critical Fields

Always override fields that affect test behavior:

```typescript
// ✅ Good - explicit test data
const user = User.mock({
	role: 'admin', // Test depends on this
	active: true, // Test depends on this
});

// ❌ Bad - random data might break test
const user = User.mock(); // role and active are random
```

### 3. Create Reusable Fixtures

Define common test data once:

```typescript
// test/fixtures.ts
export const fixtures = {
	activeUser: User.mock({ active: true }),
	inactiveUser: User.mock({ active: false }),
	adminUser: User.mock({ role: 'admin' }),
};
```

### 4. Seed Realistic Data

When seeding databases, use realistic data:

```typescript
const users = User.mock(100, {
	createdAt: faker.date
		.between({
			from: '2020-01-01',
			to: new Date(),
		})
		.toISOString(),
});
```

## Next Steps

- [Examples](/en/examples/basic) - See mocks in real examples
- [QModel](/en/guide/qmodel) - Learn more about model methods
- [@faker-js/faker docs](https://fakerjs.dev/) - Explore Faker.js capabilities
