# Basic Usage

This example demonstrates the fundamental concepts of QuickModel with simple, practical code.

## Problem

You're fetching user data from an API that returns dates as ISO strings and you want to work with actual `Date` objects in your code.

## Solution

Use QuickModel to automatically transform the data:

```typescript
import { QModel, Quick } from 'quickmodel';

// 1. Define your interface (API format)
interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string; // ISO date string from API
	updatedAt: string; // ISO date string from API
}

// 2. Create your model with transformations
@Quick({
	createdAt: Date,
	updatedAt: Date,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
	declare updatedAt: Date;
}

// 3. Use it with API data
const apiResponse = {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
	createdAt: '2026-01-10T10:00:00.000Z',
	updatedAt: '2026-01-10T15:30:00.000Z',
};

const user = new User(apiResponse);

// 4. Work with transformed types
console.log(user.createdAt instanceof Date); // true
console.log(user.createdAt.getFullYear()); // 2026

// 5. Serialize back to JSON
const json = user.toJSON();
console.log(json.createdAt); // '2026-01-10T10:00:00.000Z'
```

## Step-by-Step Explanation

### 1. Define the Interface

The interface represents the data format from your API (JSON-compatible types):

```typescript
interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string; // Dates come as strings from JSON
	updatedAt: string;
}
```

### 2. Apply the @Quick Decorator

Specify which properties need transformation:

```typescript
@Quick({
  createdAt: Date,  // Transform string → Date
  updatedAt: Date   // Transform string → Date
})
```

### 3. Declare Properties

Use `declare` to define runtime types without generating code:

```typescript
class User extends QModel<IUser> {
	declare id: number; // No transformation needed
	declare name: string; // No transformation needed
	declare email: string; // No transformation needed
	declare createdAt: Date; // Will be transformed
	declare updatedAt: Date; // Will be transformed
}
```

### 4. Create Instances

Pass API data directly to the constructor:

```typescript
const user = new User(apiResponse);
// All transformations happen automatically
```

### 5. Serialize Back

Use `toJSON()` to convert back to API format:

```typescript
const json = user.toJSON();
// Dates are converted back to ISO strings
```

## Working with Arrays

Transform arrays of data:

```typescript
interface IPost {
	id: string;
	title: string;
	publishedAt: string;
	tags: string[];
}

@Quick({
	publishedAt: Date,
	tags: Set, // Transform array → Set
})
class Post extends QModel<IPost> {
	declare id: string;
	declare title: string;
	declare publishedAt: Date;
	declare tags: Set<string>;
}

const posts = [
	{
		id: '1',
		title: 'First Post',
		publishedAt: '2026-01-01',
		tags: ['typescript', 'node'],
	},
	{
		id: '2',
		title: 'Second Post',
		publishedAt: '2026-01-02',
		tags: ['javascript', 'web'],
	},
];

// Transform all posts
const transformedPosts = posts.map((post) => new Post(post));

console.log(transformedPosts[0].publishedAt instanceof Date); // true
console.log(transformedPosts[0].tags instanceof Set); // true
```

## Arrays of Transformed Types

Use bracket notation for arrays of transformed types:

```typescript
interface ICalendar {
	name: string;
	events: string[]; // Array of ISO date strings
}

@Quick({
	events: [Date], // Transform to Date[]
})
class Calendar extends QModel<ICalendar> {
	declare name: string;
	declare events: Date[];
}

const calendar = new Calendar({
	name: 'My Calendar',
	events: [
		'2026-01-10T10:00:00.000Z',
		'2026-01-15T14:00:00.000Z',
		'2026-01-20T09:00:00.000Z',
	],
});

console.log(calendar.events[0] instanceof Date); // true
console.log(calendar.events.length); // 3
```

## Using create() Method

Alternative factory method for creating instances:

```typescript
const user = User.create({
	id: 1,
	name: 'Jane Doe',
	email: 'jane@example.com',
	createdAt: '2026-01-10',
	updatedAt: '2026-01-10',
});

console.log(user instanceof User); // true
```

## Mock Generation

Generate test data easily:

```typescript
// Single mock with random values
const mockUser = User.mock().random();
console.log(mockUser.createdAt instanceof Date); // true ✅ respects transformations

// Multiple random mocks
const mockUsers = User.mock().array(5);
console.log(mockUsers.length); // 5

// Mock with overrides on specific fields
const customUser = User.mock().random({
	name: 'Test User',
	email: 'test@example.com',
});
console.log(customUser.name); // 'Test User'

// Empty mock
const emptyUser = User.mock().empty();
// Predictable mock (for snapshots)
const sampleUser = User.mock().sample();
```

## Complete Example

Here's a complete example with all features:

```typescript
import { QModel, Quick } from 'quickmodel';

interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string;
	updatedAt: string;
	tags: string[];
}

@Quick({
	createdAt: Date,
	updatedAt: Date,
	tags: Set,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare tags: Set<string>;
}

// Simulate API response
const apiData = {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
	createdAt: '2026-01-10T10:00:00.000Z',
	updatedAt: '2026-01-10T15:30:00.000Z',
	tags: ['developer', 'typescript', 'node'],
};

// Create model instance
const user = new User(apiData);

// Work with transformed types
console.log('User created:', user.createdAt.toLocaleDateString());
console.log('Tags:', Array.from(user.tags).join(', '));

// Modify data
user.name = 'Jane Doe';
user.tags.add('quickmodel');

// Serialize back
const updatedData = user.toJSON();
console.log('Updated data:', updatedData);

// Generate mocks for testing
const testUsers = User.mock().array(3, 'random', () => ({ tags: ['test'] }));
console.log('Test users:', testUsers.length);
```

## Best Practices

### 1. Use declare for Properties

```typescript
// ✅ Good - no runtime code
declare;
createdAt: Date;

// ❌ Avoid - generates unnecessary code
createdAt: Date = new Date();
```

### 2. Be Explicit with Transformations

```typescript
// ✅ Good - explicit transformations
@Quick({
  createdAt: Date,
  tags: Set
})

// ❌ Bad - missing transformations
@Quick()  // Dates won't transform!
```

### 3. Use Bracket Notation for Arrays

```typescript
// ✅ Good - clear array syntax
@Quick({
  dates: [Date]
})

// ❌ Bad - ambiguous
@Quick({
  dates: Date  // Single Date or Date[]?
})
```

## Next Steps

- [API Models](/en/examples/api-models) - Integrate with REST APIs
- [Complex Types](/en/examples/complex-types) - Advanced transformations
- [Nested Models](/en/guide/nested-models) - Work with nested data
