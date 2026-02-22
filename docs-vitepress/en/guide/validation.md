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

| Parameter | Type                          | Description                                                                         |
| --------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `fn`      | `(value: unknown) => boolean` | Validation function. Return `true` to pass.                                         |
| `message` | `string \| (() => string)`    | Static message, i18n key, or lazy resolver evaluated when `checkRules()` is called. |

Can be stacked — applies one rule per decorator call.

### `checkRules()`

Runs all `@QRule` rules declared on the model's properties.

**Returns:** `IQRuleValidationResult`

```typescript
interface IQRulesResult {
	valid: boolean;
	errors: Array<{
		field: string; // property name
		message: string; // resolved message (string or return value of () => string)
		value: unknown; // current value of the field
	}>;
}
```

### `hasIntegrity()`

Boolean shortcut for `checkIntegrity().length === 0`.

Returns `true` when every field value conforms to its declared transformer type (no DoS limits exceeded, no type mismatches).

```typescript
if (!user.hasIntegrity()) {
	const errors = user.checkIntegrity();
	// handle transformer-level violations...
}
```

### `isValid()`

Single boolean gate that combines both checks: `hasIntegrity() && checkRules().valid`.

Returns `true` only when the instance has **full type integrity** and **all business rules pass**.

```typescript
if (!user.isValid()) {
	// dig into specific failures:
	const integrityErrors = user.checkIntegrity(); // type-level
	const ruleErrors = user.checkRules().errors; // business-logic
}
```

| Method               | Returns               | What it checks                              |
| -------------------- | --------------------- | ------------------------------------------- |
| `checkIntegrity()`   | `IQIntegrityResult[]` | Transformer constraints (types, DoS limits) |
| `hasIntegrity()`     | `boolean`             | Shortcut: `checkIntegrity().length === 0`   |
| `checkRules()`       | `IQRulesResult`       | Business rules (`@QRule` predicates)        |
| `isValid()`          | `boolean`             | Both: integrity + rules                     |
| `validationReport()` | `IQValidationReport`  | Both, but returns full detail               |

### `validationReport()`

Single call that runs both checks and returns detailed results.

```typescript
const report = user.validationReport();

if (!report.valid) {
	// transformer-level failures:
	report.integrity.forEach((e) => console.error(e.error));
	// @QRule failures:
	report.rules.errors.forEach((e) => console.error(e.field, e.message));
}
```

**Returns:** `IQValidationReport`

```typescript
interface IQValidationReport {
	valid: boolean;
	integrity: IQIntegrityResult[]; // empty = all pass
	rules: IQRulesResult; // { valid, errors[] }
}
```

## i18n Support

The `message` parameter accepts `string | (() => string)`. The function form is evaluated **lazily** — at `checkRules()` call-time — which makes it suitable for runtime i18n:

```typescript
import { t } from './i18n'; // your global translator

@Quick({ name: 'string' })
class User extends QModel<IUser> {
	// Lazy: resolved when checkRules() is called
	@QRule((v) => (v as string).length >= 3, () => t('validation.name.min'))
	declare name: string;
}
```

If the user changes language at runtime, the next `checkRules()` call will reflect the new language.

### Angular: plain keys + `| translate` pipe

You can also store plain i18n keys as the message and resolve them in the template — no lazy function needed:

```typescript
@QRule((v) => (v as string).length >= 3, 'validation.name.min')
declare name: string;
```

```html
<!-- In your Angular template -->
<span *ngFor="let e of result.errors">{{ e.message | translate }}</span>
```

Both approaches are valid; pick the one that fits your architecture.

> [!NOTE]
> `checkRules()` is separate from `checkIntegrity()`. `checkIntegrity()` checks transformer-level constraints (DoS limits, type ranges). `checkRules()` is for your business logic.

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

## Form Schema (`@QField`)

Use `@QField` to annotate model properties with form metadata. Then call `getFormSchema()` to get a schema array ready to pass to any form library (Angular, React, etc.).

```typescript
import { QField } from '@cartago-git/quickmodel';

@Quick({ birthDate: Date })
class ProfileModel extends QModel<IProfile> {
	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	declare email: string;

	@QField({
		widget: 'select',
		label: 'Role',
		options: ['admin', 'user', 'guest'],
	})
	declare role: string;

	@QField({ widget: 'checkbox', label: 'Active' })
	declare active: boolean;

	@QField({ widget: 'datepicker', label: 'Birth date' })
	declare birthDate: Date;
}

// Static — no instance needed:
const schema = ProfileModel.getFormSchema();
// [
//   { field: 'email',     widget: 'input',     inputType: 'email', label: 'Email', required: true },
//   { field: 'role',      widget: 'select',    options: ['admin','user','guest'], label: 'Role' },
//   { field: 'active',    widget: 'checkbox',  label: 'Active' },
//   { field: 'birthDate', widget: 'datepicker',label: 'Birth date' },
// ]
```

### Supported widgets

| Widget        | Typical use                     |
| ------------- | ------------------------------- |
| `input`       | Text, email, password fields    |
| `textarea`    | Multi-line text                 |
| `select`      | Dropdown list                   |
| `checkbox`    | Boolean toggle                  |
| `radio`       | Single-choice from a list       |
| `datepicker`  | Date / datetime picker          |
| `number`      | Numeric input                   |
| `switch`      | Material/UI toggle switch       |
| `'my-widget'` | Any custom string is also valid |

### Extra metadata

Any additional property you pass is preserved:

```typescript
@QField({
	widget: 'input',
	inputType: 'email',
	label: 'Email',
	placeholder: 'you@example.com',
	hint: 'Must be unique in the system',
	cssClass: 'full-width',
})
declare email: string;
```

### Inheritance

Subclasses inherit their parent's `@QField` entries. Re-declaring a field overrides it.
