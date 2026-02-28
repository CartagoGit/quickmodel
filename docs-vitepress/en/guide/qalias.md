# Key Aliases with `@QAlias`

`@QAlias` maps a model property to an external key name used at both the **input** (`create()`, `new`, `fromJSON()`) and **output** (`serialize()`, `toJSON()`) levels. This makes it trivial to work with snake_case APIs while keeping camelCase in your model code.

## Basic Example

```typescript
import { Quick, QModel, QAlias } from 'quickmodel';

interface IUser {
	firstName: string;
	lastName: string;
	emailAddress: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	@QAlias('first_name')
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;
}
```

## Input: `create()` with snake_case payload

```typescript
// Works with aliased keys (e.g. from a REST API):
const user = UserModel.create({
	first_name: 'Alice',
	last_name: 'Smith',
	email_address: 'alice@example.com',
} as any);

console.log(user.firstName); // 'Alice'    ✅ camelCase inside the model
console.log(user.emailAddress); // 'alice@example.com'
```

> [!TIP]
> Passing the origincal camelCase keys (`firstName`, etc.) also works as a fallback. When **both** the alias key and the property key are present in the payload, the alias takes precedence.

## Output: `serialize()` emits alias keys

```typescript
const output = user.serialize();
// {
//   first_name: 'Alice',
//   last_name: 'Smith',
//   email_address: 'alice@example.com'
// }

const json = user.toJSON();
// '{"first_name":"Alice","last_name":"Smith","email_address":"alice@example.com"}'
```

Fields **without** `@QAlias` keep their original property name in the output.

## Roundtrip

Because both input and output use the alias keys, the serialized form can be passed directly back to `create()`:

```typescript
const serialized = user.serialize();
const restored = UserModel.create(serialized as any);

restored.firstName === 'Alice'; // ✅
restored.emailAddress === 'alice@example.com'; // ✅
```

`fromJSON()` also supports the roundtrip:

```typescript
const json = user.toJSON();
const restored = UserModel.fromJSON(json);
restored.firstName === 'Alice'; // ✅
```

## Mixed fields

Only properties decorated with `@QAlias` are remapped. Other fields keep their original keys.

```typescript
@Quick({ birthDate: Date })
class ProfileModel extends QModel<IProfile> {
	@QAlias('full_name')
	declare fullName: string;

	declare birthDate: Date; // no alias
}

const p = ProfileModel.create({
	full_name: 'Jane Doe',
	birthDate: '1990-01-01',
} as any);
p.fullName; // 'Jane Doe'  ✅
p.birthDate; // Date object ✅

p.serialize();
// { full_name: 'Jane Doe', birthDate: '1990-01-01T00:00:00.000Z' }
```

## Inheritance

Subclasses inherit parent `@QAlias` entries. Additional aliases can be declared in the subclass.

```typescript
@Quick()
class AdminModel extends UserModel {
	@QAlias('phone_number')
	declare phoneNumber: string;
}

const admin = AdminModel.create({
	first_name: 'Dan',
	last_name: 'Lee',
	email_address: 'dan@example.com',
	phone_number: '555-1234',
} as any);

admin.firstName; // 'Dan'
admin.phoneNumber; // '555-1234'
admin.serialize(); // { first_name: 'Dan', ..., phone_number: '555-1234' }
```

## API Reference

### `@QAlias(alias: string)`

| Parameter | Type     | Description                                          |
| --------- | -------- | ---------------------------------------------------- |
| `alias`   | `string` | External key name (e.g. `'first_name'`, `'user_id'`) |

**Behaviour:**

- **Input remapping**: if `alias` key is present in the payload at creation time, it is renamed to the property name before deserialization. Camelcase key is still accepted as fallback.
- **Output remapping**: `serialize()` and `toJSON()` emit `alias` instead of the property name.
- Inheritance: subclasses inherit aliases via prototype chain walk.

## Common Use-Cases

| Scenario                        | Example                                    |
| ------------------------------- | ------------------------------------------ |
| REST API with snake_case fields | `@QAlias('created_at')` on `createdAt`     |
| External model mapping          | `@QAlias('user_id')` on `userId`           |
| Database column names           | `@QAlias('phone_number')` on `phoneNumber` |
| Legacy field names              | `@QAlias('e_mail')` on `email`             |

## Performance

<BenchmarkChart
  :only-scenarios="['aliasMapping']"
  :only-libs="['QuickModel', 'class-transformer', 'Plain JS']"
  default-tab="performance"
/>
