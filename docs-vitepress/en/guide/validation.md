# Validation with @QRule

QuickModel provides a declarative validation system via the `@QRule` decorator. Rules are defined directly on model properties and executed via the `checkRules()` method.

## Basic Usage

```typescript
import { Quick, QType, QModel, QRule } from '@cartago-git/quickmodel';

interface IUser {
	name: string;
	age: number;
	email: string;
}

@Quick()
class User extends QModel<IUser> {
	@QRule((v: string) => v.length >= 3, 'Name must be at least 3 characters')
	declare name: string;

	@QRule((v: number) => v >= 0, 'Age cannot be negative')
	@QRule((v: number) => v <= 120, 'Age must be realistic')
	declare age: number;

	@QRule((v: string) => v.includes('@'), 'Must be a valid email')
	declare email: string;
}
```

```typescript
const user = new User({ name: 'Jo', age: -1, email: 'notanemail' });

const result = user.checkRules();

console.log(result.valid); // false
console.log(result.errors);
// [
//   { field: 'name',  message: 'Name must be at least 3 characters', value: 'Jo' },
//   { field: 'age',   message: 'Age cannot be negative',             value: -1 },
//   { field: 'email', message: 'Must be a valid email',              value: 'notanemail' }
// ]
```

## Stacking Multiple Rules

You can apply multiple `@QRule` to the same property. **All failing rules are collected** — not just the first one.

```typescript
@QRule((v: number) => v >= 18, 'Must be at least 18 years old')
@QRule((v: number) => v <= 65, 'Must be under 65')
@QRule((v: number) => Number.isInteger(v), 'Age must be a whole number')
declare age: number;
```

```typescript
const u = new User({ ..., age: 17.5 });
const result = u.checkRules();
// errors includes two messages: 'Must be at least 18...' and 'Age must be a whole number'
```

## Valid Result

When all rules pass, `checkRules()` returns `{ valid: true, errors: [] }`.

```typescript
const user = new User({ name: 'Alice', age: 30, email: 'alice@example.com' });
const result = user.checkRules();
// { valid: true, errors: [] }
```

## API Reference

### `@QRule(fn, message)`

| Parameter | Type                          | Description                                 |
| --------- | ----------------------------- | ------------------------------------------- |
| `fn`      | `(value: unknown) => boolean` | Validation function. Return `true` to pass. |
| `message` | `string`                      | Error message shown when the rule fails.    |

Can be stacked — applies one rule per decorator call.

### `checkRules()`

Runs all `@QRule` rules declared on the model's properties.

**Returns:** `IQRuleValidationResult`

```typescript
interface IQRuleValidationResult {
	valid: boolean;
	errors: IQRuleError[];
}

interface IQRuleError {
	field: string; // property name
	message: string; // from @QRule(fn, message)
	value: unknown; // current value of the field
}
```

> [!NOTE]
> `checkRules()` is separate from `validate()`. The existing `validate()` checks transformer-level constraints (DoS limits, type ranges). `checkRules()` is for your business logic.

## Combining with Change Tracking

`@QRule` and `checkRules()` work seamlessly alongside `isDirty()`, `merge()`, and `patch()`.

```typescript
const user = new User({ name: 'Alice', age: 30, email: 'alice@example.com' });

const updated = user.merge({ age: -5 });
const result = updated.checkRules();

console.log(result.valid); // false
console.log(result.errors[0].field); // 'age'
```

## Inheriting Rules

`@QRule` rules are inherited: a subclass will also run rules defined on its parent's properties.

```typescript
@Quick()
class Admin extends User {
	@QRule(
		(v: string) => v.startsWith('ADMIN_'),
		'Admin name must start with ADMIN_'
	)
	declare name: string; // overrides parent rule for 'name'
}
```

> [!WARNING]
> If a subclass re-declares a property with `@QRule`, only the **subclass rules** apply to that field (the parent rules for that field are overridden). Fields not re-declared keep their parent rules.
