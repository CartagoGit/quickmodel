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
	@QRule(
		(val: string) => val.length >= 3,
		'Name must be at least 3 characters'
	)
	declare name: string;

	@QRule((val: number) => val >= 0, 'Age cannot be negative')
	@QRule((val: number) => val <= 120, 'Age must be realistic')
	declare age: number;

	@QRule((val: string) => val.includes('@'), 'Must be a valid email')
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

## TC39 mode

When using TC39 standard decorators (`experimentalDecorators` absent or `false`), replace `declare` with `!` for fields decorated with `@QRule`. The decorator logic is identical in both modes.

```typescript
// TC39 mode — use ! instead of declare
@Quick()
class User extends QModel<IUser> {
	@QRule((val) => val.length >= 3, 'Name must be at least 3 characters')
	name!: string; // ✅ TC39: use !

	@QRule((val) => val >= 0, 'Age cannot be negative')
	age!: number; // ✅ TC39: use !

	@QRule((val) => val.includes('@'), 'Must be a valid email')
	email!: string; // ✅ TC39: use !
}
```

### `@QType` + `@QRule` in TC39 mode — automatic type inference

When `@QType` is combined with `@QRule` on the same field, the runtime type metadata is registered automatically. Place `@QType` **below** `@QRule` so it fires first (TC39 decorators on a field evaluate bottom-up).

```typescript
// TC39 mode — @QType registers field type → @QRule inherits it
@Quick()
class Post extends QModel<IPost> {
	@QRule(
		(val) => val instanceof Date && !isNaN((val as Date).getTime()),
		'Invalid date'
	)
	@QType(Date) // bottom = runs first in TC39
	publishedAt!: Date;

	@QRule(
		(val) => typeof val === 'string' && (val as string).length > 0,
		'Title required'
	)
	@QType(String)
	title!: string;
}

const post = Post.create({ publishedAt: '2025-01-01', title: 'Hello' });
console.log(post.checkRules().valid); // true
```

## Stacking Multiple Rules

You can apply multiple `@QRule` to the same property. **All failing rules are collected** — not just the first one.

```typescript
@QRule((val: number) => val >= 18, 'Must be at least 18 years old')
@QRule((val: number) => val <= 65, 'Must be under 65')
@QRule((val: number) => Number.isInteger(val), 'Age must be a whole number')
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

#### Group filtering with `@QGroup`

Decorate fields with `@QGroup('name')` to assign them to a named group. Then pass `{ group }` to `checkRules()` to evaluate only that subset — useful for multi-step forms.

```typescript
import { QRule, QGroup } from '@cartago-git/quickmodel';

@Quick()
class SignupModel extends QModel<ISignup> {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup('identity')
	declare name: string;

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Invalid email')
	@QGroup('identity')
	declare email: string;

	@QRule((val: string) => val.length >= 8, 'Password too short')
	@QGroup('security')
	declare password: string;
}

const model = new SignupModel({
	name: 'A',
	email: 'a@b.com',
	password: 'Secret1!',
});

// All rules:
model.checkRules();
// { valid: false, errors: [{ field: 'name', message: 'Name too short', ... }] }

// Only 'identity' group — ignore 'security' (e.g. step 1 of 2):
model.checkRules({ group: 'identity' });
// { valid: false, errors: [{ field: 'name', ... }] }

// 'security' group only:
model.checkRules({ group: 'security' });
// { valid: true, errors: [] }
```

Use `qGroups()` from the `/forms` subpath to get **typed group name constants** with autocomplete:

```typescript
import { qGroups } from '@cartago-git/quickmodel/forms';

const Groups = qGroups('identity', 'security');
// Groups.identity === 'identity'  (fully typed — no typos possible)

model.checkRules({ group: Groups.identity });
```

> [!NOTE]
> Without a group filter `checkRules()` evaluates **all** `@QRule`-decorated fields, including ungrouped ones. With a group filter only fields carrying `@QGroup(name)` matching that group are evaluated.

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
	report.integrity.forEach((err) => console.error(err.error));
	// @QRule failures:
	report.rules.errors.forEach((err) => console.error(err.field, err.message));
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
	@QRule((val) => (val as string).length >= 3, () => t('validation.name.min'))
	declare name: string;
}
```

If the user changes language at runtime, the next `checkRules()` call will reflect the new language.

### Angular: plain keys + `| translate` pipe

You can also store plain i18n keys as the message and resolve them in the template — no lazy function needed:

```typescript
@QRule((val) => (val as string).length >= 3, 'validation.name.min')
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

`@QRule` and `checkRules()` work seamlessly alongside `isDirty()`, `copy()`, and `patch()`.

```typescript
const user = new User({ name: 'Alice', age: 30, email: 'alice@example.com' });

const updated = user.copy({ age: -5 });
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
		(val: string) => val.startsWith('ADMIN_'),
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

## Async Validation

All sync methods have async equivalents that handle predicates returning `Promise<boolean>`.

### `checkRulesAsync()`

Like `checkRules()` but awaits each predicate. Use this when any `@QRule` contains an async function (e.g. a database uniqueness check).

```typescript
// Async predicate — e.g. checks uniqueness against a DB
@QRule(
	async (val) => !(await db.emailExists(val as string)),
	'Email already taken'
)
declare email: string;

// Evaluate
const result = await user.checkRulesAsync();
if (!result.valid) {
	console.log(result.errors); // [{ field: 'email', message: '...', value: '...' }]
}
```

Sync predicates also work seamlessly — they are wrapped in `Promise.resolve()` internally.

> [!NOTE]
> `checkRules()` (sync) still works as before and ignores async predicates — it does NOT await them. Use `checkRulesAsync()` when async rules are present.

#### Execution mode

By default all predicates run **in parallel** (`mode: 'parallel'`), so total time ≈ the slowest individual predicate. Pass `mode: 'serial'` when predicates must run one after the other (e.g. checking format before hitting the database):

```typescript
// Parallel (default) — all predicates race simultaneously
const result = await user.checkRulesAsync();

// Serial — predicates run in field-declaration order
const result = await user.checkRulesAsync({ mode: 'serial' });
```

| Mode                     | Total time              | When to use                              |
| ------------------------ | ----------------------- | ---------------------------------------- |
| `'parallel'` _(default)_ | `max(individual times)` | Independent I/O calls                    |
| `'serial'`               | `Σ(individual times)`   | Side-effects or strict ordering required |

#### Per-predicate timeout

Pass `timeoutMs` to give each predicate a maximum budget. Predicates that exceed it fail with `timedOut: true` in the error entry. Optionally provide a custom `timeoutMessage`:

```typescript
const result = await user.checkRulesAsync({
	timeoutMs: 200,
	timeoutMessage: 'Service unavailable', // or () => i18n.t('errors.timeout')
});

result.errors.forEach((err) => {
	if (err.timedOut) {
		console.warn(`${err.field}: predicate timed out after 200 ms`);
	}
});
```

Options can be combined freely:

```typescript
// Serial execution with a 300 ms budget per predicate
const result = await user.checkRulesAsync({ mode: 'serial', timeoutMs: 300 });
```

### `isValidAsync()`

Async equivalent of `isValid()`. Returns `Promise<boolean>`.

```typescript
if (await user.isValidAsync()) {
	// integrity OK + all async @QRule predicates pass
}
```

### `validationReportAsync()`

Async equivalent of `validationReport()`. Returns `Promise<IQValidationReport>`.

```typescript
const report = await user.validationReportAsync();
if (!report.valid) {
	report.integrity.forEach((err) => console.error(err.error));
	report.rules.errors.forEach((err) => console.error(err.field, err.message));
}
```

### Async API summary

| Method                            | Returns                       | Notes                          |
| --------------------------------- | ----------------------------- | ------------------------------ |
| `checkRulesAsync(options?)`       | `Promise<IQRulesResult>`      | Awaits sync + async predicates |
| `isValidAsync(options?)`          | `Promise<boolean>`            | Integrity + async rules        |
| `validationReportAsync(options?)` | `Promise<IQValidationReport>` | Full report, async-safe        |

**`options` (`IQRulesAsyncOptions`)**

| Option           | Type                     | Default      | Description                                       |
| ---------------- | ------------------------ | ------------ | ------------------------------------------------- |
| `mode`           | `'parallel' \| 'serial'` | `'parallel'` | Execution order of predicates                     |
| `timeoutMs`      | `number`                 | —            | Max ms per predicate; exceeded → `timedOut: true` |
| `timeoutMessage` | `string \| () => string` | rule message | Message used when a predicate times out           |

## Validating without `QModel` — the `/forms` subpath

All helpers on this page (`checkRules`, `checkRulesAsync`, group filtering…) are also available as **standalone functions** that work on any plain class — no need to extend `QModel`. Import them from the `/forms` entry point:

```typescript
import { QRule, QGroup } from '@cartago-git/quickmodel';
import {
	qGroups,
	qCheckRules,
	qCheckRulesAsync,
	qCheckRulesByGroup,
	qCheckRulesByGroupAsync,
} from '@cartago-git/quickmodel/forms';

const Groups = qGroups('identity', 'security');

class ProfileForm {
	// ← plain class, no QModel
	@QRule((val: string) => val.length >= 2, 'Too short')
	@QGroup(Groups.identity)
	name = '';
}

const form = new ProfileForm();
const result = qCheckRules(form, { group: Groups.identity });
```

> 📖 **[Form Validation guide](/en/guide/forms)** — Full reference: `qGroups`, `qGetGroups`, `qCheckRules`, `qCheckRulesAsync`, `qCheckRulesByGroup`, `qCheckRulesByGroupAsync`, Angular/React/Vue examples.
