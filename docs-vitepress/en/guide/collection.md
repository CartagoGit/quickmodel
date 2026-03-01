# Collections (`QModelCollection`)

`QModelCollection<T>` is a typed, **immutable** wrapper around an array of `QModel` instances. It provides a fluent API for filtering, sorting, pagination, grouping, aggregation, serialization, and rule-checking — without mutating the original data.

## Creating a collection

### From raw data

```typescript
import { QModelCollection } from 'quickmodel';

const users = QModelCollection.from(UserModel, rawRows);
// Each row is instantiated via `new UserModel(row)`
```

### From a model's static alias

Every `QModel` subclass exposes a `collection()` static method as a shorthand:

```typescript
const users = UserModel.collection(rawRows);
// Equivalent to QModelCollection.from(UserModel, rawRows)
```

Both produce a `QModelCollection<UserModel>`.

## Fluent API

All operations return **new collections** — the original is never mutated.

### Filtering

```typescript
const admins = users.where((u) => u.role === 'admin');
const alice = users.find((u) => u.name === 'Alice'); // UserModel | undefined
```

### Sorting

```typescript
const byName = users.sortBy('name');
const byAgeDesc = users.sortBy('age', { desc: true });
```

### Pagination

```typescript
const page1 = users.paginate(1, 10); // items 0–9
const page2 = users.paginate(2, 10); // items 10–19
```

### Grouping

```typescript
const byRole = users.groupBy('role');
// → { admin: UserModel[], viewer: UserModel[], ... }
```

## Functional utilities

```typescript
users.size; // total count
users.count((u) => u.active); // conditional count
users.isEmpty; // true when empty
users.first(); // UserModel | undefined
users.last(); // UserModel | undefined
users.every((u) => u.age >= 18); // boolean
users.some((u) => u.role === 'admin'); // boolean

users.map((u) => u.name); // string[]
users.flatMap((u) => [u.name, u.email]); // string[]
users.reduce((acc, u) => acc + u.price, 0); // number
```

### Aggregation helpers

```typescript
users.sum('score'); // sum of numeric field
users.avg('score'); // average
users.min('score'); // minimum
users.max('score'); // maximum
```

## Serialization

```typescript
users.serialize(); // plain object array
users.serialize({ pick: ['id', 'name'] }); // subset of fields
users.toJSON(); // JSON string

users.toCSV();
// id,name,email
// 1,Alice,alice@example.com
// 2,Bob,bob@example.com

users.toCSV({ delimiter: ';', fields: ['name', 'email'] });
```

## Rule checking

```typescript
const result = users.checkAllRules();
// → { valid: boolean, errors: [{ index, field, message }] }

if (!result.valid) {
	result.errors.forEach((e) =>
		console.error(`Row ${e.index}: [${e.field}] ${e.message}`)
	);
}
```

## Accessing raw instances

```typescript
users.toArray(); // UserModel[]  (shallow copy)
```

## Chaining operations

All fluent methods return a new `QModelCollection`, so they chain naturally:

```typescript
const report = UserModel.collection(dbRows)
	.where((u) => u.active)
	.sortBy('lastName')
	.paginate(1, 20)
	.serialize({ pick: ['id', 'firstName', 'lastName', 'email'] });
```

## CSV export options

| Option           | Type       | Default    | Description                              |
| ---------------- | ---------- | ---------- | ---------------------------------------- |
| `delimiter`      | `string`   | `','`      | Column separator                         |
| `includeHeaders` | `boolean`  | `true`     | Whether to emit a header row             |
| `fields`         | `string[]` | all fields | Subset of fields to export, in order     |
| `nullValue`      | `string`   | `''`       | Replacement for `null`/`undefined` cells |

## API reference

| Member                              | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| `QModelCollection.from(Ctor, data)` | Factory — creates collection from raw array |
| `Model.collection(data)`            | Static alias on any `QModel` subclass       |
| `.where(fn)`                        | Filter — returns new collection             |
| `.find(fn)`                         | Find first matching instance                |
| `.sortBy(field, opts?)`             | Sort by field                               |
| `.paginate(page, size)`             | Paginate                                    |
| `.groupBy(field)`                   | Group into a record                         |
| `.size`                             | Total item count                            |
| `.count(fn?)`                       | Conditional count (all if no predicate)     |
| `.isEmpty`                          | `true` when the collection is empty         |
| `.first()`                          | First instance or `undefined`               |
| `.last()`                           | Last instance or `undefined`                |
| `.every(fn)`                        | `true` if all items satisfy the predicate   |
| `.some(fn)`                         | `true` if at least one item matches         |
| `.map(fn)`                          | Map instances to any value                  |
| `.flatMap(fn)`                      | FlatMap instances                           |
| `.reduce(fn, init)`                 | Reduce to a single value                    |
| `.sum(field)`                       | Sum of a numeric field                      |
| `.avg(field)`                       | Average of a numeric field                  |
| `.min(field)`                       | Minimum value of a numeric field            |
| `.max(field)`                       | Maximum value of a numeric field            |
| `.unique(field)`                    | Unique values of a field                    |
| `.toMap(keyField)`                  | Convert to `Map` keyed by a field           |
| `.serialize(opts?)`                 | Array of plain objects                      |
| `.toJSON()`                         | JSON string                                 |
| `.toCSV(opts?)`                     | CSV string                                  |
| `.checkAllRules()`                  | Validate all instances                      |
| `.toArray()`                        | Plain array of model instances              |

## See also

- [QModel](./qmodel) — base class
- [Serialization](./serialization) — serialization options
- [Validation](./validation) — rule-checking API
