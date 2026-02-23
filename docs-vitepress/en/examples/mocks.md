# Mocks & Testing

Generate realistic test data for unit tests, Storybook, and prototypes using QuickModel's `mock()` API.

## Why use mock()?

QuickModel generates mocks that respect your transformations: if the model has `createdAt: Date`, the mock returns a real `Date` instance — not a string.

## Basic API

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: string;
	name: string;
	email: string;
	age: number;
	createdAt: string;
	tags: string[];
	isActive: boolean;
}

@Quick({ createdAt: Date, tags: Set })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare age: number;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare isActive: boolean;
}

// Single instance with realistic random values
const user = User.mock().random();
console.log(user instanceof User); // true
console.log(user.createdAt instanceof Date); // true ✅ respects transformations
console.log(user.tags instanceof Set); // true ✅

// Instance with empty/default values
const emptyUser = User.mock().empty();
console.log(emptyUser.name); // '' (empty string)
console.log(emptyUser.age); // 0

// Instance with predictable sample values
const sampleUser = User.mock().sample();
// Always returns the same data (useful for snapshots)

// Instance with all fields populated (including optional)
const fullUser = User.mock().full();

// Instance with only required fields
const minimalUser = User.mock().minimal();
```

## Arrays of Mocks

```typescript
// 5 random users
const users = User.mock().array(5);
console.log(users.length); // 5
console.log(users[0] instanceof User); // true

// Array with specific type
const samples = User.mock().array(3, 'sample'); // predictable values
const empties = User.mock().array(2, 'empty'); // empty values

// Array with per-index overrides
const namedUsers = User.mock().array(3, 'random', (idx) => ({
	name: `User ${idx + 1}`,
	email: `user${idx + 1}@test.com`,
}));
console.log(namedUsers[0].name); // 'User 1'
console.log(namedUsers[2].name); // 'User 3'
```

## Overrides: Override Specific Fields

```typescript
// Override only the fields you care about
const activeUser = User.mock().random({ isActive: true, tags: [] });
console.log(activeUser.isActive); // true (overridden)
console.log(activeUser.name); // random generated name

// Empty mock with specific values
const testUser = User.mock().empty({
	name: 'Test User',
	email: 'test@example.com',
});
console.log(testUser.name); // 'Test User'
console.log(testUser.age); // 0 (empty default)
```

## Plain Objects (no model instance)

Sometimes you need the plain interface object, not a model instance:

```typescript
// Plain interface object (not a User instance)
const userData = User.mock().interfaceRandom();
// userData.createdAt is string (interface format), not Date

// Array of plain objects
const usersData = User.mock().interfaceArray(5);

// Useful for preparing API fixtures:
const apiFixture = User.mock().interfaceRandom({
	email: 'fixture@test.com',
});
// Pass directly to your fetch() mock
```

## Unit Tests with Vitest / Jest

```typescript
import { describe, it, expect } from 'vitest';
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

interface IOrder {
	id: string;
	total: number;
	status: 'pending' | 'paid' | 'cancelled';
	createdAt: string;
}

@Quick({ createdAt: Date })
class Order extends QModel<IOrder> {
	declare id: string;

	@QRule({
		predicate: (val: number) => val > 0,
		message: 'Total must be positive',
	})
	declare total: number;

	declare status: 'pending' | 'paid' | 'cancelled';
	declare createdAt: Date;
}

describe('Order', () => {
	it('transforms createdAt to Date', () => {
		const order = Order.mock().random();
		expect(order.createdAt).toBeInstanceOf(Date);
	});

	it('fails validation when total is 0', () => {
		const order = Order.mock().random({ total: 0 });
		const result = order.checkRules();
		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('total');
	});

	it('passes validation with correct data', () => {
		const order = Order.mock().random({ total: 99.99, status: 'paid' });
		expect(order.isValid()).toBe(true);
	});

	it('serializes with toJSON()', () => {
		const order = Order.mock().sample({ total: 50 });
		const json = order.toJSON();
		expect(typeof json.createdAt).toBe('string');
		expect(json.total).toBe(50);
	});
});
```

## Storybook: Generate Example Props

```typescript
// UserCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { UserCard } from './UserCard';
import { User } from '../models/user.model';

const meta: Meta<typeof UserCard> = { component: UserCard };
export default meta;
type IStory = StoryObj<typeof UserCard>;

export const Default: IStory = {
	args: { user: User.mock().random() },
};

export const Inactive: IStory = {
	args: { user: User.mock().random({ isActive: false }) },
};

export const NewUser: IStory = {
	args: {
		user: User.mock().random({
			createdAt: new Date().toISOString(),
			tags: [],
		}),
	},
};

export const UserList: IStory = {
	args: { users: User.mock().array(5, 'random') },
};
```

## E2E Test Fixtures

```typescript
// fixtures/users.ts
export const USERS = {
	admin: User.mock().sample({ isActive: true }),

	// For pagination testing
	list: User.mock().array(20, 'random', (idx) => ({
		email: `user${idx}@fixture.com`,
	})),

	// Empty user for blank form testing
	empty: User.mock().empty(),
};
```

## Models with Complex Types

The mock generator respects all transformers:

```typescript
interface IReport {
	title: string;
	createdAt: string;
	tags: string[];
	metadata: [string, unknown][];
	expiresAt: string;
	correlationId: string;
}

@Quick({
	createdAt: Date,
	tags: Set,
	metadata: Map,
	expiresAt: Date,
	correlationId: Symbol,
})
class Report extends QModel<IReport> {
	declare title: string;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare metadata: Map<string, unknown>;
	declare expiresAt: Date;
	declare correlationId: symbol;
}

const report = Report.mock().random();
console.log(report.createdAt instanceof Date); // true ✅
console.log(report.tags instanceof Set); // true ✅
console.log(report.metadata instanceof Map); // true ✅
console.log(typeof report.correlationId); // 'symbol' ✅
```

## Best Practices

```typescript
// ✅ Use .sample() for snapshot tests (predictable data)
const snapshot = User.mock().sample();
expect(snapshot).toMatchSnapshot();

// ✅ Use .random() for unit test data
const user = User.mock().random({ email: 'test@example.com' });

// ✅ Use .array() for list/pagination tests
const page = User.mock().array(10);

// ✅ Use .interfaceRandom() for HTTP mock fixtures
fetchMock.mockResponse(JSON.stringify(User.mock().interfaceRandom()));

// ❌ Avoid hardcoding mocks by hand when QModel can generate them
const user = {
	// ❌ error-prone, gets out of sync with the model
	id: '1',
	name: 'test',
	createdAt: '2026-01-01', // type: string, not Date
};
```

## Next Steps

- [Batch Creation & Readonly](/en/examples/batch-readonly) - `createMany()` and `createReadonly()`
- [Validation](/en/examples/validation) - Testing with `checkRules()`
