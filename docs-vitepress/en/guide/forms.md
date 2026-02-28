# Form Validation (`/forms` entry)

The `quickmodel/forms` subpath provides **standalone form-validation helpers** that work on **any class** — no need to extend `QModel`. Use them in Angular components, React hooks, Vue composables, or plain TypeScript objects.

## Why a separate entry?

The root entry (`quickmodel`) includes the full runtime: transformers, serialization, the mock generator, etc. For apps that only need lightweight validation logic, importing the `/forms` subpath keeps the bundle smaller and the dependency graph minimal.

```ts
// ✅ recommended for form-only validation
import { qGroups, qCheckRules } from 'quickmodel/forms';

// also works, but pulls in the full runtime
import { qGroups, qCheckRules } from 'quickmodel/forms';
```

## Prerequisites

The helpers rely on `reflect-metadata`. Make sure it is imported once at your app entry point:

```ts
import 'reflect-metadata';
```

And that your `tsconfig.json` has:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## `qGroups` — typed group constants

`qGroups` creates a **typed map of group name constants** so you get autocomplete and refactoring support across your codebase. It also prevents typos in group names.

### Spread form (TS 3.4+)

```ts
import { qGroups } from 'quickmodel/forms';

const Groups = qGroups('identity', 'security', 'address');
// { identity: 'identity', security: 'security', address: 'address' }
```

### Array form with `as const` (TS 3.4+)

```ts
const groups = ['identity', 'security'] as const;
const Groups = qGroups(groups);
```

### Array form without `as const` (TS 5.0+ only)

```ts
import { qGroups5 } from 'quickmodel/compat/ts5/forms';

const Groups = qGroups5(['identity', 'security']);
```

| Style                          | TS version | Notes                                           |
| ------------------------------ | ---------- | ----------------------------------------------- |
| `qGroups('a', 'b')`            | 3.4+       | Spread — explicit, great for short lists        |
| `qGroups(['a', 'b'] as const)` | 3.4+       | Array with `as const`                           |
| `qGroups5(['a', 'b'])`         | 5.0+       | No `as const` needed — uses `const T` parameter |

## Defining validation rules

Use `@QRule` and `@QGroup` from the root entry — they work on **any class**, not just `QModel` subclasses:

```ts
import { QRule, QGroup } from 'quickmodel';
import { qGroups } from 'quickmodel/forms';

const Groups = qGroups('identity', 'security');

class ProfileForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup(Groups.identity)
	name = '';

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Invalid email')
	@QGroup(Groups.identity)
	email = '';

	@QRule((val: string) => val.length >= 8, 'Password too short')
	@QRule((val: string) => /[A-Z]/.test(val), 'Must contain uppercase')
	@QGroup(Groups.security)
	password = '';

	// Ungrouped field — has @QRule but no @QGroup
	@QRule((val: string) => val.length > 0, 'Street required')
	street = '';
}
```

::: tip Multiple rules per field
Stack as many `@QRule` as needed. **All failing rules are collected** — not just the first one.
:::

## `qGetGroups` — list declared groups

Returns the distinct `@QGroup` names declared on an instance, in order of first appearance.

```ts
import { qGetGroups } from 'quickmodel/forms';

const form = new ProfileForm();
const groups = qGetGroups(form);
// ['identity', 'security']
```

- Returns only groups that have at least one `@QRule`-decorated field.
- Ungrouped fields are excluded.
- Returns `[]` when no `@QGroup` decorators are present.

## `qCheckRules` — synchronous validation

Evaluates all synchronous `@QRule` predicates on any instance.

```ts
import { qCheckRules } from 'quickmodel/forms';

const form = new ProfileForm();
form.name = 'A';
form.email = 'not-an-email';
form.password = 'Secret1!';
form.street = '42 Main St';

const result = qCheckRules(form);

result.valid; // false
result.errors;
// [
//   { field: 'name',  message: 'Name too short',  value: 'A' },
//   { field: 'email', message: 'Invalid email',   value: 'not-an-email' },
// ]
```

### Filtering by group

Pass `{ group }` to evaluate only fields belonging to that group:

```ts
// Only validate 'identity' fields — ignore security, street…
const result = qCheckRules(form, { group: Groups.identity });
```

- Ungrouped fields are excluded when a group filter is given.
- An unknown group returns `{ valid: true, errors: [] }` (no fields to evaluate).
- Group comparison is **case-sensitive**.

::: warning Async predicates
`qCheckRules` is synchronous. Predicates that return a `Promise` are **silently skipped** (treated as passing). Use `qCheckRulesAsync` when async rules are present.
:::

### Return type

```ts
interface IQRulesResult {
	valid: boolean;
	errors: Array<{
		field: string; // property name
		message: string; // resolved message
		value: unknown; // current field value
		timedOut?: true; // only set by qCheckRulesAsync on timeout
	}>;
}
```

## `qCheckRulesAsync` — asynchronous validation

The async counterpart. Awaits sync and async predicates alike. Supports per-predicate timeout and serial/parallel execution modes.

```ts
import { qCheckRulesAsync } from 'quickmodel/forms';

const result = await qCheckRulesAsync(form);
result.valid; // false if any rule failed
```

### Group filter

```ts
const result = await qCheckRulesAsync(form, { group: Groups.identity });
```

### Per-predicate timeout

Each predicate is individually raced against a timer. Exceeded predicates fail with `timedOut: true`:

```ts
const result = await qCheckRulesAsync(form, {
	timeoutMs: 500,
	timeoutMessage: 'Service unavailable', // or () => i18n.t('errors.timeout')
});

result.errors.forEach((err) => {
	if (err.timedOut) {
		console.warn(`${err.field}: timed out after 500 ms`);
	}
});
```

### Execution mode

By default all predicates run **in parallel** (`mode: 'parallel'`). Pass `mode: 'serial'` when predicates must run sequentially (e.g. check format before hitting the database):

```ts
// Serial — predicates run in field-declaration order
const result = await qCheckRulesAsync(form, { mode: 'serial' });
```

| Mode                     | Total time              | When to use                              |
| ------------------------ | ----------------------- | ---------------------------------------- |
| `'parallel'` _(default)_ | `max(individual times)` | Independent I/O calls                    |
| `'serial'`               | `Σ(individual times)`   | Side-effects or strict ordering required |

### Combining options

All options can be combined freely:

```ts
// Serial within 'security' group, with a 300 ms budget per predicate
const result = await qCheckRulesAsync(form, {
	group: Groups.security,
	mode: 'serial',
	timeoutMs: 300,
});
```

### `IQCheckRulesAsyncOptions`

| Option           | Type                     | Default      | Description                                       |
| ---------------- | ------------------------ | ------------ | ------------------------------------------------- |
| `group`          | `string`                 | —            | Evaluate only this group                          |
| `mode`           | `'parallel' \| 'serial'` | `'parallel'` | Execution order                                   |
| `timeoutMs`      | `number`                 | —            | Max ms per predicate; exceeded → `timedOut: true` |
| `timeoutMessage` | `string \| () => string` | rule message | Message used on timeout                           |

## `qCheckRulesByGroup` — per-group sync result map

Validates all groups and returns a `Record<groupName, IQRulesResult>`.

```ts
import { qCheckRulesByGroup } from 'quickmodel/forms';

const form = new ProfileForm();
form.name = 'Alice';
form.email = 'alice@example.com';
form.password = 'weak'; // security fails
form.street = ''; // ungrouped — excluded from the map

const results = qCheckRulesByGroup(form);
// {
//   identity: { valid: true,  errors: [] },
//   security: { valid: false, errors: [{ field: 'password', ... }] },
// }

results[Groups.identity].valid; // true
results[Groups.security].valid; // false
```

- Only grouped fields appear. Ungrouped fields are excluded.
- The map has one key per unique `@QGroup` name.
- Returns `{}` when no `@QGroup` decorators are present.

### Typical use: step-by-step form validation

```ts
function canProceedToStep(step: string): boolean {
	const results = qCheckRulesByGroup(form);
	return results[step]?.valid ?? true;
}

canProceedToStep(Groups.identity); // true / false
canProceedToStep(Groups.security); // true / false
```

## `qCheckRulesByGroupAsync` — per-group async result map

The async counterpart of `qCheckRulesByGroup`. All groups are evaluated concurrently.

```ts
import { qCheckRulesByGroupAsync } from 'quickmodel/forms';

const results = await qCheckRulesByGroupAsync(form);
// { identity: IQRulesResult, security: IQRulesResult }
```

Accepts the same async options as `qCheckRulesAsync` (except `group`, which is applied per group internally):

```ts
const results = await qCheckRulesByGroupAsync(form, {
	timeoutMs: 500,
	mode: 'serial',
});
```

## Framework integration examples

::: code-group

```ts [Angular Component]
import { Component } from '@angular/core';
import { QRule, QGroup } from 'quickmodel';
import {
	qGroups,
	qCheckRules,
	qCheckRulesByGroup,
	IQRulesResult,
} from 'quickmodel/forms';

const Groups = qGroups('identity', 'security');

class SignupForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup(Groups.identity)
	name = '';

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Invalid email')
	@QGroup(Groups.identity)
	email = '';

	@QRule((val: string) => val.length >= 8, 'Password too short')
	@QRule((val: string) => /[A-Z]/.test(val), 'Must contain uppercase')
	@QGroup(Groups.security)
	password = '';
}

@Component({
	template: `
		<input [(ngModel)]="form.name" />
		<span *ngFor="let e of identityResult.errors">{{ e.message }}</span>

		<button (click)="validateIdentity()">Next</button>
	`,
})
export class SignupComponent {
	form = new SignupForm();
	identityResult: IQRulesResult = { valid: true, errors: [] };

	validateIdentity(): void {
		this.identityResult = qCheckRules(this.form, {
			group: Groups.identity,
		});
		if (this.identityResult.valid) {
			// proceed to next step
		}
	}
}
```

```tsx [React Hook]
import { useState, useCallback } from 'react';
import { QRule, QGroup } from 'quickmodel';
import { qGroups, qCheckRules, IQRulesResult } from 'quickmodel/forms';

const Groups = qGroups('fields');

class ContactForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup(Groups.fields)
	name = '';

	@QRule((val: string) => val.includes('@'), 'Invalid email')
	@QGroup(Groups.fields)
	email = '';
}

function useContactForm() {
	const [form] = useState(() => new ContactForm());
	const [result, setResult] = useState<IQRulesResult>({
		valid: true,
		errors: [],
	});

	const validate = useCallback(() => {
		const res = qCheckRules(form);
		setResult(res);
		return res.valid;
	}, [form]);

	return { form, result, validate };
}
```

```ts [Vue Composable]
import { reactive, ref } from 'vue';
import { QRule, QGroup } from 'quickmodel';
import { qGroups, qCheckRulesAsync, IQRulesResult } from 'quickmodel/forms';

const Groups = qGroups('fields');

class LoginForm {
	@QRule((val: string) => val.length >= 2, 'Username too short')
	@QGroup(Groups.fields)
	username = '';

	@QRule((val: string) => val.length >= 6, 'Password too short')
	@QGroup(Groups.fields)
	password = '';
}

export function useLoginForm() {
	const form = reactive(new LoginForm());
	const result = ref<IQRulesResult>({ valid: true, errors: [] });

	async function validate() {
		result.value = await qCheckRulesAsync(form, { timeoutMs: 500 });
		return result.value.valid;
	}

	return { form, result, validate };
}
```

:::

## Inheritance

`@QRule` rules are **inherited**: a subclass will also run rules defined on its parent's properties.

```ts
class BaseForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup('identity')
	name = '';
}

class ExtendedForm extends BaseForm {
	@QRule((val: number) => val >= 18, 'Must be 18+')
	@QGroup('identity')
	age = 0;
}

const form = new ExtendedForm();
form.name = 'A'; // parent rule fails
form.age = 15; // subclass rule fails

const result = qCheckRules(form);
// { valid: false, errors: [{ field: 'name', ... }, { field: 'age', ... }] }
```

> [!WARNING]
> If a subclass re-declares a property with `@QRule`, only the **subclass rules** apply to that field (the parent rules for that field are overridden). Fields not re-declared keep their parent rules.

## API summary

| Helper                                        | Returns                                  | Async |
| --------------------------------------------- | ---------------------------------------- | ----- |
| `qGroups(...names)`                           | `IQGroupsMap`                            | No    |
| `qGroups5([...names])`                        | `IQGroupsMap`                            | No    |
| `qGetGroups(instance)`                        | `string[]`                               | No    |
| `qCheckRules(instance, options?)`             | `IQRulesResult`                          | No    |
| `qCheckRulesAsync(instance, options?)`        | `Promise<IQRulesResult>`                 | Yes   |
| `qCheckRulesByGroup(instance)`                | `Record<string, IQRulesResult>`          | No    |
| `qCheckRulesByGroupAsync(instance, options?)` | `Promise<Record<string, IQRulesResult>>` | Yes   |

## TypeScript compatibility

| Entry point                   | Minimum TS | Notes                                      |
| ----------------------------- | ---------- | ------------------------------------------ |
| `quickmodel/forms`            | 3.4        | Main entry — all helpers except `qGroups5` |
| `quickmodel/compat/ts5/forms` | 5.0        | Adds `qGroups5` (no `as const` needed)     |
