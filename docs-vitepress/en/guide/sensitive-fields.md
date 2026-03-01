# Sensitive Fields (`@QSensitive`)

The `@QSensitive()` decorator marks model properties that contain confidential data — passwords, API keys, tokens, PII — and automatically excludes them from `serialize()` and `toJSON()` output.

## Why it matters

Without `@QSensitive`, serializing a model easily leaks sensitive data into API responses, logs, or localStorage. The decorator acts as a **zero-cost opt-in** to strip those fields before they leave the model layer.

## Basic usage

```typescript
import { Quick, QModel, QSensitive } from 'quickmodel';

interface IUser {
	id: number;
	email: string;
	password: string;
	apiToken: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	declare id: number;
	declare email: string;

	@QSensitive()
	declare password: string;

	@QSensitive()
	declare apiToken: string;
}

const user = new UserModel({
	id: 1,
	email: 'alice@example.com',
	password: 'supersecret',
	apiToken: 'tok_abc123',
});

user.$qSerialize();
// → { id: 1, email: 'alice@example.com' }
//   password and apiToken are excluded

user.password; // → 'supersecret'  ← still a normal property
user.apiToken; // → 'tok_abc123'   ← fully accessible
```

## Including sensitive fields explicitly

When you need the full payload — for instance, when persisting to a database — pass `{ includeSensitive: true }`:

```typescript
user.$qSerialize({ includeSensitive: true });
// → { id: 1, email: 'alice@example.com', password: 'supersecret', apiToken: 'tok_abc123' }

user.toJSON({ includeSensitive: true });
// → same as serialize but returns a JSON string
```

## What is affected

| Method                 | Sensitive fields excluded by default? |
| ---------------------- | ------------------------------------- |
| `serialize()`          | ✅ Yes                                |
| `toJSON()`             | ✅ Yes                                |
| `toInterface()`        | ❌ No — always returns full data      |
| `checkRules()`         | ❌ No — predicates run on all fields  |
| Direct property access | ❌ No — always accessible             |

## Combining with other decorators

`@QSensitive` composes freely with `@QReadonly`, `@QDefault`, `@QTransform`, and `@Quick` type configuration:

```typescript
@Quick({ createdAt: Date })
class TokenModel extends QModel<IToken> {
	@QReadonly()
	@QSensitive()
	declare secret: string; // immutable and excluded from serialize()

	@QDefault(() => new Date())
	declare createdAt: Date;
}
```

## Inheritance

Sensitive field declarations are inherited — a child class automatically inherits `@QSensitive` fields from its parent:

```typescript
@Quick()
class BaseUser extends QModel<IBaseUser> {
	@QSensitive()
	declare password: string;
}

@Quick()
class AdminUser extends BaseUser {
	declare role: string;
}

new AdminUser({ password: 'x', role: 'admin' }).serialize();
// → { role: 'admin' }  ← password excluded (inherited from BaseUser)
```

## API reference

| Symbol                                  | Description                         |
| --------------------------------------- | ----------------------------------- |
| `@QSensitive()`                         | Marks a property as sensitive       |
| `serialize({ includeSensitive: true })` | Includes sensitive fields in output |
| `toJSON({ includeSensitive: true })`    | Same, returns JSON string           |

## See also

- [Serialization](./serialization) — full serialization options
- [`@QReadonly`](./qreadonly) — immutability after construction
- [`@QDefault`](./qdefault) — default values at construction time
