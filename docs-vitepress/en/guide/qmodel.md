# QModel

`QModel` is the base class for all QuickModel models. It provides serialization, deserialization, and mock generation capabilities.

## Basic Usage

To create a model, extend `QModel` with your interface:

```typescript
import { QModel } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	name: string;
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}

const user = new User({ id: 1, name: 'John' });
```

## Constructor

The constructor accepts data that matches your interface:

```typescript
interface IUser {
	id: number;
	name: string;
	email: string;
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
}

// Create from object
const user = new User({
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
});
```

### Partial Data

You can pass partial data if your properties are optional:

```typescript
interface IUser {
	id?: number;
	name?: string;
}

class User extends QModel<IUser> {
	declare id?: number;
	declare name?: string;
}

const user = new User({ name: 'John' }); // id is undefined
```

## Static Methods

### `create<T>(data: Partial<T>): T`

Factory method for creating instances with better type inference:

```typescript
const user = User.create({ id: 1, name: 'John' });
// Type is automatically inferred
```

This is especially useful when you don't want to declare properties:

```typescript
interface IUser {
	id: number;
	name: string;
}

@Quick()
class User extends QModel<IUser> {}

const user = User.create({ id: 1, name: 'John' });
user.id; // ✅ TypeScript knows this is number
user.name; // ✅ TypeScript knows this is string
```

### `mock(count?: number | Partial<T>, overrides?: Partial<T>): T | T[]`

Generate mock data for testing:

```typescript
// Single mock with defaults
const mockUser = User.mock();

// Single mock with overrides
const customUser = User.mock({ name: 'Custom Name' });

// Array of mocks
const users = User.mock(5);

// Array of mocks with overrides
const customUsers = User.mock(5, { name: 'Same Name' });
```

See [Mock Generation](/en/guide/mocks) for details.

## Instance Methods

### `toJSON(): T`

Serialize the model back to JSON-compatible format:

```typescript
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare createdAt: Date;
}

const user = new User({
	id: 1,
	createdAt: '2026-01-10T00:00:00.000Z',
});

const json = user.toJSON();
// {
//   id: 1,
//   createdAt: '2026-01-10T00:00:00.000Z'  // Date → string
// }
```

This method reverses all transformations, converting:

- `Date` → ISO string
- `bigint` → string
- `Set` → array
- `Map` → array of tuples
- Nested models → plain objects

### `clone(): this`

Create a deep copy of the model:

```typescript
const user = new User({ id: 1, name: 'John' });
const copy = user.clone();

copy.name = 'Jane';
console.log(user.name); // 'John' (original unchanged)
console.log(copy.name); // 'Jane'
```

## Generic Type Parameter

`QModel<T>` accepts a generic type parameter that defines the serialization interface:

```typescript
interface IUser {
	id: number;
	name: string;
	createdAt: string; // JSON type
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date; // Runtime type
}
```

The generic `T` represents the **serialization format** (JSON-compatible types), while the class properties represent the **runtime types**.

## Type Safety with QInterface

For better type safety, use `QInterface` to enforce transformation types:

```typescript
import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	createdAt: string;
}

interface IUserTransform {
	createdAt: Date;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	declare id: number;
	declare createdAt: Date; // Must match IUserTransform
}
```

TypeScript will error if your property types don't match the transformation interface.

## Inheritance

You can extend models to create hierarchies:

```typescript
@Quick({ createdAt: Date })
class BaseModel extends QModel<IBase> {
	declare id: number;
	declare createdAt: Date;
}

@Quick({ updatedAt: Date })
class User extends BaseModel {
	declare name: string;
	declare updatedAt: Date;
}

const user = new User({
	id: 1,
	name: 'John',
	createdAt: '2026-01-01',
	updatedAt: '2026-01-10',
});
```

Both `createdAt` and `updatedAt` will be transformed to `Date` objects.

## Working with APIs

Common pattern for API integration:

```typescript
interface IUserAPI {
	id: number;
	name: string;
	email: string;
	created_at: string;
	updated_at: string;
}

@Quick({
	created_at: Date,
	updated_at: Date,
})
class User extends QModel<IUserAPI> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare created_at: Date;
	declare updated_at: Date;
}

// Fetch from API
async function getUser(id: number): Promise<User> {
	const response = await fetch(`/api/users/${id}`);
	const data = await response.json();
	return new User(data);
}

// Send to API
async function updateUser(user: User): Promise<void> {
	await fetch(`/api/users/${user.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()),
	});
}
```

## Best Practices

### 1. Use `declare` for Properties

The `declare` keyword tells TypeScript the property exists without generating runtime code:

```typescript
// ✅ Recommended
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}

// ❌ Avoid (generates unnecessary code)
class User extends QModel<IUser> {
	id: number = 0;
	name: string = '';
}
```

### 2. Define Interfaces Separately

Keep interfaces separate from classes for better reusability:

```typescript
// ✅ Good
interface IUser {
	id: number;
	name: string;
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}

// ❌ Avoid inline interfaces
class User extends QModel<{ id: number; name: string }> {
	// ...
}
```

### 3. Use Type-Safe Transformations

Always specify transformation interfaces for complex types:

```typescript
// ✅ Type-safe
interface IUser {
	createdAt: string;
}
interface IUserTransform {
	createdAt: Date;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	declare createdAt: Date;
}
```

## Next Steps

- [@Quick Decorator](/en/guide/quick-decorator) - Configure transformations
- [Transformers](/en/guide/transformers) - Available type transformations
- [Serialization](/en/guide/serialization) - Deep dive into toJSON()
- [Nested Models](/en/guide/nested-models) - Work with complex structures
