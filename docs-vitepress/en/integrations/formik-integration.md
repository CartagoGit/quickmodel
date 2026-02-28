# Formik Integration

QuickModel works alongside Formik v2 as the validation and coercion layer — no Zod, no Yup, no resolver package needed. `qCheckRules()` drops in as the `validate` prop, `@QGroup` powers multi-step wizard validation, and `getFormSchema()` drives dynamic form rendering.

## Key Patterns

| Formik concern       | QuickModel pattern                                  |
| -------------------- | --------------------------------------------------- |
| `validate` prop      | `qCheckRules(dto)` → empty `{}` or `{ field: msg }` |
| Field-level validate | `qCheckRulesByGroup(dto)['groupName']`              |
| Initial values       | `dto.serialize()`                                   |
| Async validation     | `qCheckRulesAsync(dto)` with `@QRule(async ...)`    |
| Multi-step wizard    | `@QGroup` per step + `qCheckRulesByGroup(dto)`      |
| Dynamic fields       | `dto.getFormSchema()` → render `<Field>` list       |
| Migration from Zod   | Replace `z.string().min()` → `@QRule`               |
| Migration from Yup   | Replace `yup.string().matches()` → `@QRule`         |

## Model Setup

```typescript
import { QModel, Quick, QRule, QField, QGroup } from 'quickmodel';

interface IRegistrationForm {
	name: string;
	email: string;
	password: string;
	age: number;
	role: string;
}

@Quick(
	{
		name: 'string',
		email: 'string',
		password: 'string',
		age: 'number',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class RegistrationDto extends QModel<IRegistrationForm> {
	@QGroup('personal')
	@QField({ label: 'Full Name', required: true })
	@QRule(
		(val: string) => val.trim().length >= 2,
		'Name must be at least 2 characters'
	)
	declare name: string;

	@QGroup('personal')
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	declare email: string;

	@QGroup('security')
	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule((val: string) => val.length >= 8, 'At least 8 characters')
	@QRule((val: string) => /[A-Z]/.test(val), 'Needs an uppercase letter')
	@QRule((val: string) => /\d/.test(val), 'Needs a digit')
	declare password: string;

	@QGroup('personal')
	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	declare age: number;

	@QGroup('preferences')
	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['user', 'editor', 'admin'].includes(val),
		'Invalid role'
	)
	declare role: string;
}
```

## 1. Formik `validate` Adapter

Formik's `validate` prop receives the form `values` and must return an **empty object** `{}` for valid submissions or `{ fieldName: 'Error message' }` for invalid ones.

```typescript
import { qCheckRules } from 'quickmodel/forms';

// Utility: build a Formik-compatible validate function
function createFormikValidate<TForm extends object>(
	buildDto: (values: Partial<TForm>) => object
) {
	return (values: Partial<TForm>): Record<string, string> => {
		const dto = buildDto(values);
		const { valid, errors } = qCheckRules(dto);
		if (valid) return {};
		return errors.reduce<Record<string, string>>((acc, err) => {
			if (!(err.field in acc)) acc[err.field] = err.message;
			return acc;
		}, {});
	};
}

// Usage in a React component
const validate = createFormikValidate<IRegistrationForm>(
	(values) => new RegistrationDto(values)
);

// <Formik initialValues={...} validate={validate} onSubmit={handleSubmit}>
```

> **Formik vs RHF convention**: Formik expects `{}` for valid (not `true`), while React Hook Form returns `true`. The adapter handles this distinction.

## 2. Field-Level Validation — Multi-Step Wizard

Use `@QGroup` to partition fields by wizard step. `qCheckRulesByGroup(dto)` returns a map of `groupName → { valid, errors }`:

```typescript
import { qCheckRulesByGroup } from 'quickmodel/forms';

// Wizard step 1: validate only the 'personal' group
function validateStep1(
	values: Partial<IRegistrationForm>
): Record<string, string> {
	const dto = new RegistrationDto(values);
	const byGroup = qCheckRulesByGroup(dto);
	const personal = byGroup['personal'];
	if (!personal || personal.valid) return {};
	return personal.errors.reduce<Record<string, string>>((acc, err) => {
		if (!(err.field in acc)) acc[err.field] = err.message;
		return acc;
	}, {});
}

// Wizard step 2: validate only the 'security' group
function validateStep2(
	values: Partial<IRegistrationForm>
): Record<string, string> {
	const dto = new RegistrationDto(values);
	const byGroup = qCheckRulesByGroup(dto);
	const security = byGroup['security'];
	if (!security || security.valid) return {};
	return security.errors.reduce<Record<string, string>>((acc, err) => {
		if (!(err.field in acc)) acc[err.field] = err.message;
		return acc;
	}, {});
}
```

## 3. Migration from Zod

Replace Zod schemas field-by-field with `@QField` + `@QRule` decorators:

| Zod                     | QuickModel                                              |
| ----------------------- | ------------------------------------------------------- |
| `z.string().min(2)`     | `@QRule((v) => v.length >= 2, 'Min 2 chars')`           |
| `z.string().email()`    | `@QRule((v) => /^...@.../.test(v), 'Invalid email')`    |
| `z.number().min(18)`    | `@QRule((v) => v >= 18, 'Must be 18+')`                 |
| `z.enum(['a','b'])`     | `@QRule((v) => ['a','b'].includes(v), 'Invalid value')` |
| `z.string().optional()` | Just `declare field?: string` without `@QRule`          |
| `zodResolver(schema)`   | `validate={createFormikValidate(...)}` (no resolver)    |

```typescript
// Zod version:
// const schema = z.object({
//   name: z.string().min(2),
//   email: z.string().email(),
//   age: z.number().min(18),
// });

// QuickModel equivalent:
@Quick(
	{ name: 'string', email: 'string', age: 'number' },
	{ coercionStrategy: 'loose' }
)
class UserDto extends QModel<{ name: string; email: string; age: number }> {
	@QRule((v: string) => v.length >= 2, 'Min 2 characters')
	declare name: string;

	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	declare email: string;

	@QRule((v: number) => v >= 18, 'Must be 18 or older')
	declare age: number;
}
```

**No `zodResolver` import needed.** Pass `validate={createFormikValidate(...)}` directly to `<Formik>`.

## 4. Migration from Yup

| Yup                           | QuickModel                                              |
| ----------------------------- | ------------------------------------------------------- |
| `yup.string().matches(regex)` | `@QRule((v) => regex.test(v), 'No match')`              |
| `yup.number().integer()`      | `@QRule((v) => Number.isInteger(v), 'Must be integer')` |
| `yup.number().positive()`     | `@QRule((v) => v > 0, 'Must be positive')`              |
| `yup.string().oneOf([...])`   | `@QRule((v) => [...].includes(v), 'Invalid value')`     |
| `yupResolver(schema)`         | `validate={createFormikValidate(...)}` (no resolver)    |

## 5. Dynamic Form Rendering with `getFormSchema()`

`getFormSchema()` returns the `@QField` metadata for all declared fields — use it to generate form fields programmatically:

```typescript
const dto = new RegistrationDto({ ... });
const schema = dto.getFormSchema();

// React rendering (conceptual):
// schema.map(({ field, label, required, widget }) => (
//   <div key={field}>
//     <label htmlFor={field}>{label}{required ? ' *' : ''}</label>
//     <Field
//       id={field}
//       name={field}
//       type={widget === 'email' ? 'email' : widget === 'password' ? 'password' : 'text'}
//     />
//     <ErrorMessage name={field} component="span" />
//   </div>
// ))
```

## 6. Async Validation

Use `@QRule` with an async predicate (returns `Promise<boolean>`) for server-side checks like email uniqueness:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

const takenEmails = new Set(['admin@example.com']);

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UniqueEmailDto extends QModel<IRegistrationForm> {
	declare name: string;
	@QRule(
		(val: string) => Promise.resolve(!takenEmails.has(val)),
		'Email already registered'
	)
	declare email: string;
	declare age: number;
	declare role: string;
}

// In Formik's validate (async variant):
async function asyncValidate(values: Partial<IRegistrationForm>) {
	const dto = new UniqueEmailDto(values);
	const { valid, errors } = await qCheckRulesAsync(dto);
	if (valid) return {};
	return errors.reduce<Record<string, string>>((acc, err) => {
		if (!(err.field in acc)) acc[err.field] = err.message;
		return acc;
	}, {});
}
// <Formik validate={asyncValidate} ...>
```

## 7. `validationReport()` — Rule Traceability

`validationReport()` returns a complete per-field breakdown of every rule applied:

```typescript
const dto = new RegistrationDto({ ... });
const report = dto.validationReport();
// report['password'] → array of { message, passed } for each @QRule on password
```

This is useful for showing inline progress indicators (e.g., a password strength meter listing which requirements are met).

## Summary

- `qCheckRules(dto)` → Formik `validate` prop (returns `{}` for valid)
- `qCheckRulesByGroup(dto)['step']` → per-step wizard validation
- `@QRule(async ...)` + `qCheckRulesAsync(dto)` → async Formik validate
- `getFormSchema()` → dynamic `<Field>` generation
- `validationReport()` → per-rule traceability (password meters, etc.)
- `coercionStrategy: 'loose'` → handles HTML string inputs automatically
- No `zodResolver` or `yupResolver` needed
