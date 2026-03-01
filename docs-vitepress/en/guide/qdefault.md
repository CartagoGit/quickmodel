# Default Values (`@QDefault`)

The `@QDefault()` decorator declares a fallback value for a model field. The default is applied during construction **only when** the incoming value is `undefined` or `null` — it never replaces `false`, `0`, or `''`.

## Basic usage

```typescript
import { Quick, QModel, QDefault } from 'quickmodel';

interface IOrder {
	id: string;
	status: string;
	retries: number;
}

@Quick()
class OrderModel extends QModel<IOrder> {
	declare id: string;

	@QDefault('pending')
	declare status: string;

	@QDefault(0)
	declare retries: number;
}

new OrderModel({ id: 'o1' }).status; // → 'pending'
new OrderModel({ id: 'o1', status: 'shipped' }).status; // → 'shipped'
new OrderModel({ id: 'o1', retries: 0 }).retries; // → 0  (not replaced!)
```

## Static vs factory defaults

For **primitive values** (string, number, boolean) — pass the value directly:

```typescript
@QDefault('active')
declare state: string;

@QDefault(100)
declare limit: number;
```

For **reference types** (arrays, objects, `Date`) — always use a **factory function** to ensure each instance gets its own fresh copy:

```typescript
@Quick()
class EventModel extends QModel<IEvent> {
	@QDefault(() => [])
	declare tags: string[]; // fresh array per instance

	@QDefault(() => new Date())
	declare createdAt: Date; // fresh Date per instance

	@QDefault(() => ({ x: 0, y: 0 }))
	declare position: IPoint; // fresh object per instance
}
```

::: warning
Never pass a reference type as a static default — all instances would share the same object:

```typescript
// ❌ Wrong — all instances share the same array
@QDefault([])
declare tags: string[];

// ✅ Correct — each instance gets its own array
@QDefault(() => [])
declare tags: string[];
```

:::

## Null and undefined handling

`@QDefault` kicks in when the incoming value is **`undefined` or `null`**:

```typescript
const a = new OrderModel({ id: 'o1' });
a.status; // → 'pending'  (undefined → default applied)

const b = new OrderModel({ id: 'o1', status: null });
b.status; // → 'pending'  (null → default applied)

const c = new OrderModel({ id: 'o1', status: '' });
c.status; // → ''         (empty string → NOT replaced)
```

## Combining with other decorators

`@QDefault` composes with `@QReadonly`, `@QSensitive`, and `@QTransform`:

```typescript
@Quick()
class ApiKey extends QModel<IApiKey> {
	@QReadonly()
	@QDefault(() => crypto.randomUUID())
	declare id: string; // immutable ID, auto-generated if not supplied

	@QSensitive()
	@QDefault('—')
	declare secret: string; // sensitive + has a safe placeholder default
}
```

## Inheritance

`@QDefault` declarations are inherited — child classes automatically receive all parent defaults:

```typescript
@Quick()
class BaseEntity extends QModel<IBaseEntity> {
	@QDefault(() => new Date())
	declare createdAt: Date;
}

@Quick()
class UserModel extends BaseEntity {
	declare name: string;
}

new UserModel({ name: 'Alice' }).createdAt; // → current Date
```

## copy() and patch()

Defaults are **not** re-applied by `copy()` or `patch()`. They only run on the initial `new Model(data)` construction:

```typescript
const order = new OrderModel({ id: 'o1' });
order.status; // → 'pending'

const updated = order.copy({ retries: 3 });
updated.status; // → 'pending'  (new instance copying from 'pending')
```

## API reference

| Symbol                   | Description                              |
| ------------------------ | ---------------------------------------- |
| `@QDefault(value)`       | Sets a static default (primitives)       |
| `@QDefault(() => value)` | Sets a factory default (reference types) |

## See also

- [`@QReadonly`](./qreadonly) — field immutability after construction
- [`@QTransform`](./qtransform) — post-deserialization transformations
- [`@QSensitive`](./sensitive-fields) — exclude sensitive fields from serialization
