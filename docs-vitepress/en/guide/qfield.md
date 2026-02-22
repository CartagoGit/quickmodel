# Form Schema with `@QField`

`@QField` is a property decorator that attaches form metadata to model fields. Use `getFormSchema()` to retrieve a ready-to-use schema array for any form library (Angular Reactive Forms, React Hook Form, etc.).

## Basic Example

```typescript
import { Quick, QModel, QField } from '@cartago-git/quickmodel';

interface IProfile {
	email: string;
	role: string;
	active: boolean;
	birthDate: Date;
}

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
```

## Retrieving the Schema

Both a **static** and an **instance** variant are available — they return the same result:

```typescript
// Static — no instance needed:
const schema = ProfileModel.getFormSchema();

// Instance:
const profile = ProfileModel.create({
	email: 'a@b.com',
	role: 'user',
	active: true,
	birthDate: new Date(),
});
const schema = profile.getFormSchema();
```

`getFormSchema()` returns an ordered `IQFormSchemaEntry[]`:

```typescript
[
	{
		field: 'email',
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	},
	{
		field: 'role',
		widget: 'select',
		options: ['admin', 'user', 'guest'],
		label: 'Role',
	},
	{ field: 'active', widget: 'checkbox', label: 'Active' },
	{ field: 'birthDate', widget: 'datepicker', label: 'Birth date' },
];
```

## API Reference

### `@QField(meta: IQFieldMeta)`

| Parameter     | Type            | Description                                      |
| ------------- | --------------- | ------------------------------------------------ |
| `widget`      | `IQFieldWidget` | The form control type (see below)                |
| `label`       | `string`        | Human-readable label for the field               |
| `placeholder` | `string`        | Placeholder text for text-based inputs           |
| `required`    | `boolean`       | Whether the field is required in the form        |
| `inputType`   | `string`        | HTML `type` attribute for `<input>` widgets      |
| `options`     | `unknown[]`     | Available options for `select` / `radio` widgets |
| `[key]`       | `unknown`       | Any additional custom metadata is preserved      |

### `IQFieldWidget`

| Value          | Typical use                            |
| -------------- | -------------------------------------- |
| `'input'`      | Text, email, password `<input>` fields |
| `'textarea'`   | Multi-line text                        |
| `'select'`     | Dropdown list                          |
| `'checkbox'`   | Boolean toggle                         |
| `'radio'`      | Single-choice from a list              |
| `'datepicker'` | Date / datetime picker                 |
| `'number'`     | Numeric input                          |
| `'switch'`     | Material/UI toggle switch              |
| `'my-widget'`  | Any custom string is also valid        |

### `getFormSchema()`

| Variant  | Signature                   | Description                       |
| -------- | --------------------------- | --------------------------------- |
| Static   | `ClassName.getFormSchema()` | No instance required              |
| Instance | `instance.getFormSchema()`  | Same output as the static variant |

**Returns:** `IQFormSchemaEntry[]` — an ordered array of `{ field, ...meta }` objects.

## Extra Metadata

You can attach any additional properties and they will be preserved in the schema:

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

## Inheritance

Subclasses automatically inherit the `@QField` annotations of their parent. If a subclass re-declares a field with `@QField`, it overrides the parent's schema entry for that field.

```typescript
@Quick()
class AdminModel extends ProfileModel {
	// Override: add a specific hint for admins
	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Admin Email',
		hint: 'Must end in @company.com',
	})
	declare email: string;
}

AdminModel.getFormSchema();
// email entry uses AdminModel's @QField, all others come from ProfileModel
```

## Framework Usage Examples

### Angular

```typescript
@Component({
	template: `
		<form>
			<ng-container *ngFor="let field of schema">
				<ng-container [ngSwitch]="field.widget">
					<input
						*ngSwitchCase="'input'"
						[type]="field.inputType ?? 'text'"
						[placeholder]="field.placeholder ?? ''" />
					<textarea
						*ngSwitchCase="'textarea'"
						[placeholder]="field.placeholder ?? ''"></textarea>
					<select *ngSwitchCase="'select'">
						<option
							*ngFor="let opt of field.options"
							[value]="opt">
							{{ opt }}
						</option>
					</select>
					<input
						*ngSwitchCase="'checkbox'"
						type="checkbox" />
				</ng-container>
				<label>{{ field.label }}</label>
			</ng-container>
		</form>
	`,
})
export class DynamicFormComponent {
	schema = ProfileModel.getFormSchema();
}
```

### React

```tsx
const schema = ProfileModel.getFormSchema();

function DynamicForm() {
	return (
		<form>
			{schema.map((field) => (
				<div key={field.field}>
					<label>{field.label}</label>
					{field.widget === 'input' && (
						<input
							type={field.inputType ?? 'text'}
							placeholder={field.placeholder}
						/>
					)}
					{field.widget === 'select' && (
						<select>
							{(field.options as string[]).map((opt) => (
								<option
									key={opt}
									value={opt}>
									{opt}
								</option>
							))}
						</select>
					)}
					{field.widget === 'checkbox' && <input type="checkbox" />}
				</div>
			))}
		</form>
	);
}
```

## TypeScript Types

```typescript
import type {
	IQFieldMeta,
	IQFormSchemaEntry,
	IQFieldWidget,
} from '@cartago-git/quickmodel';

// A schema entry:
interface IQFormSchemaEntry extends IQFieldMeta {
	field: string; // property name as declared on the model
}

// Field metadata:
interface IQFieldMeta {
	widget: IQFieldWidget;
	label?: string;
	placeholder?: string;
	required?: boolean;
	inputType?: string;
	options?: unknown[];
	[key: string]: unknown; // any extra properties
}

// Widget type:
type IQFieldWidget =
	| 'input'
	| 'textarea'
	| 'select'
	| 'checkbox'
	| 'radio'
	| 'datepicker'
	| 'number'
	| 'switch'
	| (string & {}); // allow any other string
```
