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
const admins = users.$qWhere((u) => u.role === 'admin');
const alice = users.$qFind((u) => u.name === 'Alice'); // UserModel | undefined
```

### Sorting

```typescript
const byName = users.$qSortBy('name');
const byAgeDesc = users.$qSortBy('age', { order: 'desc' });
```

### Pagination

```typescript
const page1 = users.$qPaginate(1, 10); // items 0–9
const page2 = users.$qPaginate(2, 10); // items 10–19
```

### Grouping

```typescript
const byRole = users.$qGroupBy('role');
// → { admin: UserModel[], viewer: UserModel[], ... }
```

## Functional utilities

```typescript
users.$qSize; // total count
users.$qCount((u) => u.active); // conditional count
users.$qIsEmpty; // true when empty
users.$qFirst(); // UserModel | undefined
users.$qLast(); // UserModel | undefined
users.$qEvery((u) => u.age >= 18); // boolean
users.$qSome((u) => u.role === 'admin'); // boolean

users.$qMap((u) => u.name); // string[]
users.$qFlatMap((u) => [u.name, u.email]); // string[]
users.$qReduce((acc, u) => acc + u.price, 0); // number
```

### Aggregation helpers

```typescript
users.$qSum('score'); // sum of numeric field
users.$qAvg('score'); // average
users.$qMin('score'); // minimum
users.$qMax('score'); // maximum
```

## Serialization

```typescript
users.$qSerialize(); // plain object array
users.$qSerialize({ pick: ['id', 'name'] }); // subset of fields
users.$qToJSON(); // JSON string

users.$qToCSV();
// id,name,email
// 1,Alice,alice@example.com
// 2,Bob,bob@example.com

users.$qToCSV({ delimiter: ';', fields: ['name', 'email'] });
```

## Rule checking

```typescript
const result = users.$qCheckAllRules();
// → { valid: boolean, errors: [{ index, field, message }] }

if (!result.valid) {
	result.errors.forEach((e) =>
		console.error(`Row ${e.index}: [${e.field}] ${e.message}`)
	);
}
```

## Accessing raw instances

```typescript
users.$qToArray(); // UserModel[]  (shallow copy)
```

## Chaining operations

All fluent methods return a new `QModelCollection`, so they chain naturally:

```typescript
const report = UserModel.collection(dbRows)
	.$qWhere((u) => u.active)
	.$qSortBy('lastName')
	.$qPaginate(1, 20)
	.$qSerialize({ pick: ['id', 'firstName', 'lastName', 'email'] });
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
| `.$qWhere(fn)`                      | Filter — returns new collection             |
| `.$qFind(fn)`                       | Find first matching instance                |
| `.$qSortBy(field, opts?)`           | Sort by field                               |
| `.$qPaginate(page, size)`           | Paginate                                    |
| `.$qGroupBy(field)`                 | Group into a record                         |
| `.$qSize`                           | Total item count                            |
| `.$qCount(fn?)`                     | Conditional count (all if no predicate)     |
| `.$qIsEmpty`                        | `true` when the collection is empty         |
| `.$qFirst()`                        | First instance or `undefined`               |
| `.$qLast()`                         | Last instance or `undefined`                |
| `.$qEvery(fn)`                      | `true` if all items satisfy the predicate   |
| `.$qSome(fn)`                       | `true` if at least one item matches         |
| `.$qMap(fn)`                        | Map instances to any value                  |
| `.$qFlatMap(fn)`                    | FlatMap instances                           |
| `.$qReduce(fn, init)`               | Reduce to a single value                    |
| `.$qSum(field)`                     | Sum of a numeric field                      |
| `.$qAvg(field)`                     | Average of a numeric field                  |
| `.$qMin(field)`                     | Minimum value of a numeric field            |
| `.$qMax(field)`                     | Maximum value of a numeric field            |
| `.$qUnique(field)`                  | Unique values of a field                    |
| `.$qToMap(keyField)`                | Convert to `Map` keyed by a field           |
| `.$qSerialize(opts?)`               | Array of plain objects                      |
| `.$qToJSON()`                       | JSON string                                 |
| `.$qToCSV(opts?)`                   | CSV string                                  |
| `.$qCheckAllRules()`                | Validate all instances                      |
| `.$qToArray()`                      | Plain array of model instances              |

## See also

- [QModel](./qmodel) — base class
- [Serialization](./serialization) — serialization options
- [Validation](./validation) — rule-checking API
