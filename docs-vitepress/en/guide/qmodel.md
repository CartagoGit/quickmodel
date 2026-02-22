# QModel

The `QModel` class is the heart of the library. It's an abstract base class that provides all the serialization, deserialization, and mocking capabilities to your models.

## Usage

Extend `QModel` and pass your data interface as a generic type:

```typescript
import { QModel } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	name: string;
}

class User extends QModel<IUser> {
	// Your class properties
}
```

## Instantiation Methods

QuickModel offers several ways to create instances, depending on your needs.

### 1. Constructor (Recommended)

The most common and standard way.

```typescript
const user = new User({
	id: 1,
	name: 'John',
});
```

> [!TIP] Type Safety (Recommended)
> For strict type checking between your interface and your class, it is highly recommended to use `IQImplements`. This helper ensures your class properties match your interface definition. [Learn more](/en/guide/iq-implements).
>
> ```typescript
> class User extends QModel<IUser> implements IQImplements<IUser, IUserTransform> { ... }
> ```

### 2. Factory Method (`create`)

Useful for functional programming patterns or when mapping arrays.

```typescript
const user = User.create({
	id: 1,
	name: 'John',
});

// Mapping example
const users = dataArray.map(User.create);
```

### 3. From JSON String

Automatically parses JSON string and then transforms types.

```typescript
const json = '{"id":1,"name":"John","createdAt":"2024-01-01"}';
const user = User.fromJSON(json);
```

### 4. Cloning

Creates a deep copy of an existing instance.

```typescript
const clone = user.copy();
```

### 5. Readonly Instance

Creates a deeply frozen (immutable) instance. Any attempt to modify it will throw an error in strict mode.

```typescript
const readonlyUser = User.createReadonly({
	id: 1,
	name: 'John',
});

// readonlyUser.name = 'Jane'; // Error!
```

Creates a deep copy of an existing instance.

```typescript
const clone = user.copy();
```

### 6. Bulk Creation (`createMany`)

Creates multiple instances from an array. All items are processed regardless of individual failures — items that fail `isValid()` are collected in `errors[]` and excluded from `instances[]` by default.

```typescript
const rawList = [
	{ name: 'Alice', age: 30 },
	{ name: 'Minor', age: 10 }, // fails @QRule
	{ name: 'Bob', age: 25 },
];

const { instances, errors } = UserModel.createMany(rawList);

console.log(instances.length); // 2  (Alice + Bob)
console.log(errors.length); // 1

console.log(errors[0].index); // 1
console.log(errors[0].instance.name); // 'Minor'
console.log(errors[0].errors); // [{ field: 'age', message: 'Must be adult', value: 10 }]
```

To include invalid instances in the result too:

```typescript
const { instances, errors } = UserModel.createMany(rawList, {
	includeErrorInstances: true,
});
// instances.length === 3 — all three, including Minor
// errors.length   === 1 — error list still populated
```

| Option                  | Type      | Default | Description                                 |
| ----------------------- | --------- | ------- | ------------------------------------------- |
| `includeErrorInstances` | `boolean` | `false` | Also put invalid instances in `instances[]` |

## Lifecycle

When a model is instantiated, the following happens:

1. **Constructor Called**: Data is received.
2. **Initialization**: `this.initialize()` is called internally.
3. **Deserialization**: Data is processed, transformers are applied (`string` -> `Date`).
4. **Hydration**: Properties are assigned to the instance.
5. **Validation**: Optional validation steps are run.

## Core Methods

### `serialize()`

Converts the model back to a plain JavaScript object, reversing transformations (e.g., `Date` -> `ISO string`).

```typescript
const plain = user.serialize();
```

### `toJSON()`

Returns a JSON string representation of the model.

```typescript
const jsonString = user.toJSON();
```

### `toInterface()`

Returns the data in its original raw format (as defined by the interface), preserving original types (e.g., keeping strings as strings). Useful for forms or checking initial state.

```typescript
// If User was created with { createdAt: '2024-01-01' }
const rawData = user.toInterface();
// rawData.createdAt is '2024-01-01' (string)
```

### `static getMetadata()`

Returns a map of all decorated properties and their configuration. Useful for building dynamic forms or inspection tools.

```typescript
const meta = User.getMetadata();
console.log(meta.get('createdAt').type); // 'Date'
```

### `static deserialize(data)`

Low-level method to hydrate a plain object into a model instance. Equivalent to `new Model(data)`.

```typescript
const user = User.deserialize(plainObject);
```

### `validate()`

Runs all validations defined on properties (if verification middleware is enabled).

```typescript
const errors = user.validate();
if (errors.length) {
	console.error(errors);
}
```

## State Management & Change Tracking

QModel includes powerful built-in tools to track changes, compare states, and manage updates.

### `hasChanges()` / `isDirty(field?)`

Without arguments, returns `true` if **any** field has changed since instantiation.

With a field name, returns `true` if **that specific field** is dirty.

```typescript
const user = new User({ name: 'John', age: 30 });
console.log(user.isDirty()); // false
console.log(user.isDirty('name')); // false

user.name = 'Jane';
console.log(user.isDirty()); // true  — something changed
console.log(user.isDirty('name')); // true  — 'name' changed
console.log(user.isDirty('age')); // false — 'age' did NOT change
```

> [!TIP]
> `hasChanges()` and `isDirty()` (no argument) are equivalent. `isDirty(field)` is the new per-field variant.

### `getChanges()`

Returns a partial object containing **only the fields that have changed**. Perfect for generating PATCH payloads.

```typescript
const user = new User({ id: 1, name: 'John', age: 30 });

user.age = 31;

const changes = user.getChanges();
// Result: { age: 31 }
```

### `getChangedFields()`

Returns an array of the names of modified properties.

```typescript
const fields = user.getChangedFields();
// Result: ['age']
```

### `reset()`

Reverts the model instance back to its **initial state** (the data provided to the constructor).

```typescript
user.name = 'Modified';
user.reset();
console.log(user.name); // 'John' (Original value)
```

### `patch(data)`

Applies partial updates to the model. Useful for processing API responses or partial form updates.

```typescript
user.patch({ age: 32 });
// Only 'age' is updated, other fields remain unchanged
```

### `getInitInterface()`

Returns the **original data** used to create the instance, in its original format (preserving strings instead of Dates, etc.).

```typescript
// Initial input: { createdAt: '2024-01-01' }
const original = user.getInitInterface();
console.log(original.createdAt); // '2024-01-01' (String)
```

### `copy(partial)`

Creates a **new instance** (immutable) by merging current state with the provided partial data. The original instance is never modified.

```typescript
const user = new User({ id: 1, name: 'John', age: 30 });

const updated = user.copy({ age: 31 });

console.log(user.age); // 30  — original untouched
console.log(updated.age); // 31  — new instance
console.log(updated.name); // 'John' — preserved

// The new instance has its own change tracking
updated.name = 'Jane';
console.log(updated.isDirty()); // true
console.log(updated.isDirty('age')); // false — 31 is its baseline
console.log(updated.isDirty('name')); // true  — changed after merge
```

> [!NOTE]
> `copy()` returns a fully independent instance with its own change tracking. The copied state becomes the new baseline — `isDirty()` is `false` immediately after `copy()`, and `reset()` reverts to the copied state (not the original).

### `copy()`

Creates a deep copy of the model instance. The new instance is completely independent.

```typescript
const copy = user.copy();
```

## Mocking

Every QModel has a built-in static mock generator.

```typescript
// Generate one instance
const fakeUser = User.mock().random();

// Generate array of 10 instances
const fakeUsers = User.mock().array(10);

// Generate with specific overrides
// Generate with specific overrides
const admin = User.mock().random({ role: 'admin' });
```

> [!TIP]
> For more details on powerful mock generation features, check out the [Mocks Guide](/en/guide/mocks).
