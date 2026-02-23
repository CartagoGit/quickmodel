# Built-in Validators

QuickModel ships **14 ready-to-use validator decorators** that provide a familiar `class-validator`-style API, implemented as thin wrappers over `@QRule`. No extra dependencies — they use the same rule engine that powers all QuickModel validation.

## Import

```typescript
// Main entry (all validators bundled with the rest of QuickModel)
import { IsEmail, Min, IsNotEmpty } from '@cartago-git/quickmodel';

// Tree-shakeable subpath (includes ONLY the validators you import)
import { IsEmail } from '@cartago-git/quickmodel/validators';
```

## String Validators

### `@IsEmail()`

Validates that the value is a syntactically valid email address.

```typescript
@IsEmail()
declare email: string;
```

### `@IsUrl()`

Validates that the value is a valid URL (must start with `http://` or `https://`).

```typescript
@IsUrl()
declare website: string;
```

### `@IsNotEmpty()`

Validates that the string is not empty or whitespace-only.

```typescript
@IsNotEmpty()
declare name: string;
```

### `@MinLength(n: number)`

Validates that the string has at least `n` characters.

```typescript
@MinLength(3)
declare username: string;
```

### `@MaxLength(n: number)`

Validates that the string has at most `n` characters.

```typescript
@MaxLength(50)
declare bio: string;
```

### `@Matches(regex: RegExp)`

Validates that the string matches the given regular expression.

```typescript
@Matches(/^[a-z0-9_]+$/)
declare handle: string;
```

### `@IsUuid()`

Validates that the value is a valid UUID v4.

```typescript
@IsUuid()
declare id: string;
```

### `@IsDateString()`

Validates that the value is a valid ISO 8601 date string.

```typescript
@IsDateString()
declare birthDate: string;
// "2024-01-15T12:00:00Z" ✅   "not-a-date" ❌
```

## Numeric Validators

### `@Min(n: number)`

Validates that the number is greater than or equal to `n`.

```typescript
@Min(0)
declare age: number;
```

### `@Max(n: number)`

Validates that the number is less than or equal to `n`.

```typescript
@Max(120)
declare age: number;
```

### `@IsInt()`

Validates that the value is an integer (no decimal part).

```typescript
@IsInt()
declare quantity: number;
// 3 ✅   3.14 ❌
```

### `@IsPositive()`

Validates that the value is greater than 0.

```typescript
@IsPositive()
declare price: number;
```

### `@IsNegative()`

Validates that the value is less than 0.

```typescript
@IsNegative()
declare penalty: number;
```

## Enumeration Validator

### `@IsIn(values: unknown[])`

Validates that the value is one of the allowed values.

```typescript
@IsIn(['admin', 'editor', 'viewer'])
declare role: string;
```

## Full Example

```typescript
import {
	Quick,
	QModel,
	IsEmail,
	IsNotEmpty,
	MinLength,
	MaxLength,
	Min,
	Max,
	IsInt,
	IsPositive,
	IsIn,
} from '@cartago-git/quickmodel';

interface IUser {
	name: string;
	email: string;
	age: number;
	role: string;
}

@Quick()
class User extends QModel<IUser> {
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(80)
	declare name: string;

	@IsEmail()
	declare email: string;

	@Min(18)
	@Max(120)
	@IsInt()
	declare age: number;

	@IsIn(['admin', 'editor', 'viewer'])
	declare role: string;
}

const user = new User({ name: 'A', email: 'bad', age: 17.5, role: 'hacker' });
const { valid, errors } = user.checkRules();
// valid: false
// errors: [
//   { field: 'name',  message: 'Must be at least 2 characters' },
//   { field: 'email', message: 'Must be a valid email' },
//   { field: 'age',   message: 'Must be at least 18' },
//   { field: 'age',   message: 'Must be an integer' },
//   { field: 'role',  message: 'Must be one of the allowed values' },
// ]
```

## Stacking Validators

All built-in validators can be stacked on the same property. Every failing rule is collected independently.

```typescript
@Min(0)
@Max(150)
@IsInt()
@IsPositive()
declare score: number;
```

## Using Without `QModel`

Built-in validators work on any plain class — no need to extend `QModel`. Combine them with `qCheckRules` from the `/forms` subpath:

```typescript
import { IsEmail, MinLength } from '@cartago-git/quickmodel/validators';
import { qCheckRules } from '@cartago-git/quickmodel/forms';

class ContactForm {
	@IsEmail()
	email = '';

	@MinLength(10)
	message = '';
}

const form = new ContactForm();
form.email = 'hello@world.com';
form.message = 'Hi';

const result = qCheckRules(form);
// { valid: false, errors: [{ field: 'message', ... }] }
```

## TC39 Decorators

In TC39 mode (`experimentalDecorators` absent or `false`), use `!` instead of `declare`:

```typescript
@Quick()
class User extends QModel<IUser> {
	@IsEmail()
	email!: string; // ← TC39: use !

	@Min(18)
	age!: number;
}
```

## All Validators at a Glance

| Decorator         | Validates                                 |
| :---------------- | :---------------------------------------- |
| `@IsEmail()`      | Valid email address                       |
| `@IsUrl()`        | URL starting with `http://` or `https://` |
| `@IsNotEmpty()`   | Non-empty, non-blank string               |
| `@MinLength(n)`   | String length ≥ `n`                       |
| `@MaxLength(n)`   | String length ≤ `n`                       |
| `@Matches(regex)` | String matches the given RegExp           |
| `@IsUuid()`       | Valid UUID v4                             |
| `@IsDateString()` | Valid ISO 8601 date string                |
| `@Min(n)`         | Number ≥ `n`                              |
| `@Max(n)`         | Number ≤ `n`                              |
| `@IsInt()`        | Integer (no decimal part)                 |
| `@IsPositive()`   | Number > 0                                |
| `@IsNegative()`   | Number < 0                                |
| `@IsIn(values[])` | Value is one of the allowed values        |

> All validators are thin wrappers over `@QRule`. You can mix them freely with custom `@QRule` predicates on the same property.

## See Also

- **[Validation with @QRule](./validation.md)** — Custom rules, stacking, async, groups
- **[Forms Guide](./forms.md)** — Group validation and form schema
- **[Transformers](./transformers.md)** — Type coercion including `special-float` (NaN / Infinity)
