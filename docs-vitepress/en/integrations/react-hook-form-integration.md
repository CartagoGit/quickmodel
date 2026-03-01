# React Hook Form Integration

QuickModel integrates with React Hook Form by acting as a runtime coercion and validation layer.
Use `@QField` to define form structure, `@QRule` for synchronous validation, and
`qCheckRulesAsync()` for async rules (e.g. server-side email checks).

## Key Patterns

| Pattern                 | QuickModel API                               |
| ----------------------- | -------------------------------------------- |
| Validate on submit      | `dto.checkRules()` → `setError()`            |
| Field schema generation | `Dto.getFormSchema()`                        |
| Type coercion on submit | `@Quick({ ..., coercionStrategy: 'loose' })` |
| Async server validation | `qCheckRulesAsync(dto)`                      |
| Dirty change detection  | `dto.isDirty()`                              |

## Installation

```bash
npm install quickmodel react-hook-form
```

## Model Setup

Use `@QField` to define form metadata (label, widget type, required). Use `@QRule` for
validation logic.

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IUserSignup {
	username: string;
	email: string;
	password: string;
	age: number;
	role: string;
}

@Quick(
	{
		username: 'string',
		email: 'string',
		password: 'string',
		age: 'number',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserSignupDto extends QModel<IUserSignup> {
	@QField({ label: 'Username', required: true })
	@QRule(
		(v: string) => v.length >= 3,
		'Username must be at least 3 characters'
	)
	@QRule(
		(v: string) => /^[a-z0-9_]+$/.test(v),
		'Lowercase letters, numbers, underscores only'
	)
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Invalid email address'
	)
	declare email: string;

	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule((v: string) => v.length >= 8, 'At least 8 characters required')
	@QRule((v: string) => /[A-Z]/.test(v), 'Must contain an uppercase letter')
	declare password: string;

	@QField({ label: 'Age' })
	@QRule((v: number) => v >= 18, 'Must be 18 or older')
	declare age: number;

	@QField({ label: 'Role' })
	@QRule((v: string) => ['user', 'admin'].includes(v), 'Invalid role')
	declare role: string;

	@QComputed()
	get displayName(): string {
		return `${this.username} (${this.role})`;
	}
}
```

> **`coercionStrategy: 'loose'`** — HTML form inputs send all values as strings. This option
> coerces `"25"` → `25` for number fields automatically, preventing construction errors.

::: tip Two patterns available
This guide shows the **`QModel` + `@Quick`** pattern, which includes coercion, serialization, and `@QComputed`. If you only need validation without those features, you can use a **plain class** with `@QRule` and a generic resolver. See [React integration — Plain class resolver](./react-integration#react-hook-form-custom-resolver).
:::

## validate Adapter for React Hook Form

Create a custom validator that runs `checkRules()` and maps errors to RHF's format:

```typescript
function createQModelValidator<T extends object>(
	DtoClass: new (data: object) => T
) {
	return (data: FieldValues): true | FieldErrors => {
		const dto = new (DtoClass as new (data: object) => QModel<T>)(data);
		const { valid, errors } = dto.$qCheckRules();
		if (valid) return true;
		const fieldErrors: FieldErrors = {};
		for (const err of errors) {
			if (!fieldErrors[err.field]) {
				fieldErrors[err.field] = {
					type: 'manual',
					message: err.message,
				};
			}
		}
		return fieldErrors;
	};
}
```

```tsx
import { useForm } from 'react-hook-form';

function SignupForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: async (values) => {
			const dto = new UserSignupDto(values);
			const { valid, errors: ruleErrors } = dto.$qCheckRules();
			if (valid) return { values: dto.$qSerialize(), errors: {} };
			const fieldErrors: Record<string, { message: string }> = {};
			for (const err of ruleErrors) {
				if (!fieldErrors[err.field]) {
					fieldErrors[err.field] = { message: err.message };
				}
			}
			return { values: {}, errors: fieldErrors };
		},
	});

	const onValid = (data: object) => {
		const dto = new UserSignupDto(data);
		console.log(dto.displayName); // QComputed works on valid submit
		// send dto.$qSerialize() to the API
	};

	return (
		<form onSubmit={handleSubmit(onValid)}>
			<input {...register('username')} />
			{errors.username && <span>{errors.username.message}</span>}

			<input
				type="email"
				{...register('email')}
			/>
			{errors.email && <span>{errors.email.message}</span>}

			<input {...register('age', { valueAsNumber: true })} />
			{errors.age && <span>{errors.age.message}</span>}

			<button type="submit">Sign up</button>
		</form>
	);
}
```

## Dynamic Field Rendering with getFormSchema()

`getFormSchema()` returns all `@QField`-decorated fields with their metadata, enabling
fully dynamic form rendering without hardcoding field names:

```typescript
const schema = UserSignupDto.getFormSchema();
// [
//   { field: 'username', label: 'Username', required: true, widget: 'text' },
//   { field: 'email',    label: 'Email',    required: true, widget: 'email' },
//   { field: 'password', label: 'Password', required: true, widget: 'password' },
//   { field: 'age',      label: 'Age',      required: false, widget: 'text' },
//   { field: 'role',     label: 'Role',     required: false, widget: 'text' },
// ]
```

```tsx
function DynamicForm({ DtoClass }: { DtoClass: typeof UserSignupDto }) {
	const schema = DtoClass.getFormSchema();
	const { register, handleSubmit } = useForm();

	return (
		<form onSubmit={handleSubmit(console.log)}>
			{schema.map(({ field, label, required, widget }) => (
				<div key={field}>
					<label htmlFor={field}>
						{label}
						{required && ' *'}
					</label>
					<input
						id={field}
						type={widget ?? 'text'}
						{...register(field, { required })}
					/>
				</div>
			))}
			<button type="submit">Submit</button>
		</form>
	);
}
```

## Tracking Changes with isDirty()

`isDirty()` detects if the model's current state differs from the original snapshot.
Use it to enable/disable a "Save" button or show an "Unsaved changes" indicator:

```tsx
function EditProfileForm({ initialData }: { initialData: IUserSignup }) {
	const [dto, setDto] = useState(() => new UserSignupDto(initialData));

	const handleSave = async () => {
		if (!dto.$qIsDirty()) return; // nothing changed
		await saveProfile(dto.$qSerialize());
		dto.reset(); // clear dirty state
		setDto(new UserSignupDto(dto.$qSerialize() as IUserSignup));
	};

	return (
		<form>
			{/* ... fields ... */}
			<button
				onClick={handleSave}
				disabled={!dto.$qIsDirty()}>
				Save changes
			</button>
		</form>
	);
}
```

> After `copy()`, the resulting instance has `isDirty() === false` — the copied state becomes the new baseline. Call `reset()` on the new instance to revert to the state at the time of the copy.

## Async Field Validation (Server-Side)

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

@Quick({
	username: 'string',
	email: 'string',
	password: 'string',
	age: 'number',
	role: 'string',
})
class UserSignupWithAsyncDto extends UserSignupDto {
	@QRule(async (val: string) => {
		const res = await fetch(
			`/api/users/check-email?email=${encodeURIComponent(val)}`
		);
		const { available } = await res.json();
		return available;
	}, 'Email already registered')
	declare email: string;
}

// In your resolver:
const dto = new UserSignupWithAsyncDto(formValues);
const { valid, errors } = await qCheckRulesAsync(dto);
```

## See Also

- [QField Decorator](./qfield.md)
- [Forms](./forms.md)
- [React Integration](./react-integration.md)
