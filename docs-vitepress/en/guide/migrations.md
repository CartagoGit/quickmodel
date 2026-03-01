# Schema Migrations (`@QVersion`)

The `@QVersion()` decorator enables **transparent schema migration** for versioned data. Attach it to any `QModel` subclass to declare the current schema version and register the migration functions needed to upgrade older data payloads automatically.

## The problem it solves

Data stored in localStorage, databases, or APIs can be in an older format. Without migrations, you end up with defensive code scattered across the application:

```typescript
// ❌ Without @QVersion — manual migration noise everywhere
const raw = JSON.parse(localStorage.getItem('user') ?? '{}');
const data = raw.firstName
	? { ...raw, fullName: `${raw.firstName} ${raw.lastName}` }
	: raw;
const user = new UserModel(data);
```

With `@QVersion`, this happens automatically inside the model:

```typescript
// ✅ With @QVersion — just create the model
const user = new UserModel(JSON.parse(localStorage.getItem('user') ?? '{}'));
```

## Basic usage

```typescript
import { Quick, QModel, QVersion } from 'quickmodel';

interface IUser {
	fullName: string;
	_v?: number;
}

@Quick()
@QVersion(2, {
	migrations: {
		// v1 → v2: merge firstName + lastName into fullName
		1: (data) => ({
			...data,
			fullName:
				`${String(data['firstName'] ?? '')} ${String(data['lastName'] ?? '')}`.trim(),
		}),
	},
})
class UserModel extends QModel<IUser> {
	declare fullName: string;
}

// Reading data stored when schema was v1
const user = new UserModel({ firstName: 'Alice', lastName: 'Smith', _v: 1 });
user.fullName; // → 'Alice Smith'  (auto-migrated, no manual code)
```

## How it works

1. `@QVersion(N, { migrations })` is attached to the class
2. When `new Model(data)` is called, the constructor checks `data._v`
3. If `data._v < N`, migrations are applied sequentially from `data._v` to `N`
4. The result has `_v` set to `N`
5. The model is populated with the migrated data

If `data._v` is absent or `data._v >= N`, the data passes through unchanged.

## Multi-step migrations

Each migration key transforms data FROM that version TO the next one:

```typescript
@Quick()
@QVersion(3, {
	migrations: {
		1: (data) => ({ ...data, body: data['content'] }), // v1 → v2
		2: (data) => ({ ...data, tags: [data['label']] }), // v2 → v3
	},
})
class PostModel extends QModel<IPost> {
	declare body: string;
	declare tags: string[];
}

// Data at v1 goes through both migrations
const post = new PostModel({ content: 'Hello', label: 'news', _v: 1 });
post.body; // → 'Hello'
post.tags; // → ['news']
```

Migration steps are **chained automatically** — if data is at v1 and the current version is v3, both step 1→2 and step 2→3 run in sequence.

## Skipping versions

If a migration step is missing, it is silently skipped. You can omit intermediate steps if no transformation is needed:

```typescript
@QVersion(4, {
  migrations: {
    1: (data) => ({ ...data, name: data['username'] }),  // v1 → v2
    // v2 → v3: no transform needed (field renamed in DB only)
    3: (data) => ({ ...data, role: data['type'] }),       // v3 → v4
  },
})
```

## Data without `_v`

If the input data has no `_v` field, it is treated as **current version** and no migration runs. This handles legacy data that predates versioning:

```typescript
// Data without _v → no migration, treated as current
const user = new UserModel({ fullName: 'Alice Smith' });
user.fullName; // → 'Alice Smith'
```

## Serialization

After migration, `_v` is updated to the current version but **not included** in `serialize()` output by default:

```typescript
const user = new UserModel({ firstName: 'Alice', lastName: 'Smith', _v: 1 });
user.$qm.serialize();
// → { fullName: 'Alice Smith' }  — no _v in output
```

If you need `_v` in the output, declare it as a field on the model:

```typescript
interface IUser {
  fullName: string;
  _v: number;
}

@Quick()
@QVersion(2, { migrations: { ... } })
class UserModel extends QModel<IUser> {
  declare fullName: string;
  declare _v: number;
}
```

## Practical use cases

### localStorage migrations

```typescript
@QVersion(3, {
  migrations: {
    1: (data) => ({ ...data, theme: 'system' }),             // add theme field
    2: (data) => ({ ...data, locale: data['lang'] ?? 'en' }), // rename lang → locale
  },
})
class AppSettings extends QModel<IAppSettings> { ... }

const settings = new AppSettings(
  JSON.parse(localStorage.getItem('settings') ?? '{}')
);
// Always up-to-date, regardless of when the data was stored
```

### API version compatibility

```typescript
@QVersion(2, {
  migrations: {
    1: (data) => ({
      ...data,
      address: {
        street: data['street'],
        city:   data['city'],
      },
    }),
  },
})
class CustomerModel extends QModel<ICustomer> { ... }
```

## API reference

| Symbol                       | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| `@QVersion(version, config)` | Declares schema version and migration functions                         |
| `config.migrations`          | `Record<number, (data) => data>` — map from source version to migration |
| `data._v`                    | Incoming version field (absent = current, no migration)                 |
| `IQVersionConfig`            | Type of the configuration object                                        |

## See also

- [QModel](./qmodel) — base class
- [`@QDefault`](./qdefault) — field default values at construction time
- [Tracing](./tracing) — observability for model construction
