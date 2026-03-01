# Readonly Fields (`@QReadonly`)

The `@QReadonly()` decorator marks model fields as **immutable after construction**. Any attempt to modify them via `copy()` or `patch()` throws an `ImmutableFieldError`.

## Basic usage

```typescript
import { Quick, QModel, QReadonly } from 'quickmodel';

interface IOrder {
	id: number;
	status: string;
	createdAt: Date;
}

@Quick({ createdAt: Date })
class OrderModel extends QModel<IOrder> {
	@QReadonly()
	declare id: number; // cannot change after creation

	@QReadonly()
	declare createdAt: Date;

	declare status: string; // freely mutable
}

const order = new OrderModel({
	id: 1,
	status: 'pending',
	createdAt: new Date(),
});

order.copy({ status: 'shipped' }); // ✅ OK — status is not readonly
order.copy({ id: 999 }); // ❌ throws ImmutableFieldError
order.patch({ id: 999 }); // ❌ throws ImmutableFieldError
```

## What `@QReadonly` protects

`@QReadonly` guards against mutation only through `copy()` and `patch()`. Other access is unrestricted:

| Operation                     | Protected?                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| `new Model({ field: value })` | ❌ No — construction always allowed                                |
| `copy({ field: value })`      | ✅ Yes — throws `ImmutableFieldError`                              |
| `patch({ field: value })`     | ✅ Yes — throws `ImmutableFieldError`                              |
| Direct read `model.field`     | ❌ No — always readable                                            |
| `serialize()`                 | ❌ No — included in output (combine with `@QSensitive` to exclude) |

## Handling the error

```typescript
import { ImmutableFieldError } from 'quickmodel';

try {
	order.copy({ id: 999 });
} catch (err) {
	if (err instanceof ImmutableFieldError) {
		console.error(err.field); // 'id'
		console.error(err.modelName); // 'OrderModel'
		console.error(err.message); // full descriptive message
	}
}
```

## Use cases

### Immutable IDs

Prevent accidental ID changes after creation:

```typescript
@Quick()
class Entity extends QModel<IEntity> {
	@QReadonly()
	declare id: string;

	@QReadonly()
	declare createdAt: Date;
}
```

### Event sourcing — append-only records

```typescript
@Quick()
class DomainEvent extends QModel<IDomainEvent> {
	@QReadonly()
	declare eventId: string;

	@QReadonly()
	declare aggregateId: string;

	@QReadonly()
	declare occurredAt: Date;

	declare payload: Record<string, unknown>; // payload can be set via copy()
}
```

## Combining with other decorators

`@QReadonly` composes cleanly with `@QDefault`, `@QSensitive`, and `@QTransform`:

```typescript
@Quick()
class ApiKey extends QModel<IApiKey> {
	@QReadonly()
	@QDefault(() => crypto.randomUUID())
	declare id: string; // auto-generated, immutable

	@QReadonly()
	@QSensitive()
	declare secret: string; // immutable + excluded from serialize()

	@QReadonly()
	@QTransform((v: string) => v.trim().toLowerCase())
	declare name: string; // normalized at construction, then immutable
}
```

## Inheritance

`@QReadonly` declarations are inherited — child classes automatically protect all parent readonly fields:

```typescript
@Quick()
class BaseEntity extends QModel<IBaseEntity> {
	@QReadonly()
	declare id: string;
}

@Quick()
class UserModel extends BaseEntity {
	declare email: string;
}

const user = new UserModel({ id: 'u1', email: 'a@b.com' });
user.copy({ id: 'u2' }); // ❌ throws ImmutableFieldError (inherited from BaseEntity)
```

## API reference

| Symbol                          | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `@QReadonly()`                  | Marks a field as immutable after construction |
| `ImmutableFieldError`           | Error thrown when a readonly field is mutated |
| `ImmutableFieldError.field`     | Name of the readonly field                    |
| `ImmutableFieldError.modelName` | Name of the model class                       |

## See also

- [`@QDefault`](./qdefault) — set fallback values at construction time
- [`@QSensitive`](./sensitive-fields) — exclude fields from serialization
- [`@QTransform`](./qtransform) — field value transformations at construction
- [QModel](./qmodel) — `copy()` and `patch()` methods
