# Forms with @QField and @QGroup

Dynamically generate form schemas from your model metadata using `@QField` and `@QGroup`.

## Use Case

You have a user model and want to generate a dynamic form in React, Angular, or Vue without writing the schema by hand.

## Basic Schema with @QField

```typescript
import { QModel, Quick, QField } from '@cartago-git/quickmodel';

interface IContact {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	bio?: string;
	role: string;
	birthDate: string;
	newsletter: boolean;
}

@Quick({ birthDate: Date })
class ContactModel extends QModel<IContact> {
	@QField({
		widget: 'input',
		inputType: 'text',
		label: 'First name',
		required: true,
	})
	declare firstName: string;

	@QField({
		widget: 'input',
		inputType: 'text',
		label: 'Last name',
		required: true,
	})
	declare lastName: string;

	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
		placeholder: 'you@email.com',
	})
	declare email: string;

	@QField({
		widget: 'input',
		inputType: 'tel',
		label: 'Phone',
		placeholder: '+1 555 000 0000',
	})
	declare phone?: string;

	@QField({
		widget: 'textarea',
		label: 'Bio',
		placeholder: 'Tell us about yourself...',
	})
	declare bio?: string;

	@QField({
		widget: 'select',
		label: 'Role',
		required: true,
		options: [
			{ value: 'admin', label: 'Administrator' },
			{ value: 'editor', label: 'Editor' },
			{ value: 'viewer', label: 'Viewer' },
		],
	})
	declare role: string;

	@QField({ widget: 'datepicker', label: 'Birth date' })
	declare birthDate: Date;

	@QField({ widget: 'switch', label: 'Subscribe to newsletter?' })
	declare newsletter: boolean;
}

// Get full schema
const schema = ContactModel.getFormSchema();
console.log(schema);
// [
//   { field: 'firstName', widget: 'input', inputType: 'text', label: 'First name', required: true },
//   { field: 'lastName',  widget: 'input', inputType: 'text', label: 'Last name', required: true },
//   { field: 'email',     widget: 'input', inputType: 'email', label: 'Email', ... },
//   { field: 'phone',     widget: 'input', inputType: 'tel', label: 'Phone', ... },
//   { field: 'bio',       widget: 'textarea', label: 'Bio', ... },
//   { field: 'role',      widget: 'select', label: 'Role', options: [...] },
//   { field: 'birthDate', widget: 'datepicker', label: 'Birth date' },
//   { field: 'newsletter',widget: 'switch', label: 'Subscribe to newsletter?' },
// ]
```

## Section Grouping with @QGroup

```typescript
import { QModel, Quick, QField, QGroup } from '@cartago-git/quickmodel';

interface IUserProfile {
	firstName: string;
	lastName: string;
	email: string;
	street: string;
	city: string;
	country: string;
	bio?: string;
}

@Quick()
class UserProfileModel extends QModel<IUserProfile> {
	@QField({ widget: 'input', label: 'First name', required: true })
	@QGroup('Personal Info')
	declare firstName: string;

	@QField({ widget: 'input', label: 'Last name', required: true })
	@QGroup('Personal Info')
	declare lastName: string;

	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	@QGroup('Personal Info')
	declare email: string;

	@QField({ widget: 'input', label: 'Street', required: true })
	@QGroup('Address')
	declare street: string;

	@QField({ widget: 'input', label: 'City', required: true })
	@QGroup('Address')
	declare city: string;

	@QField({
		widget: 'select',
		label: 'Country',
		required: true,
		options: ['USA', 'UK', 'Canada', 'Australia'],
	})
	@QGroup('Address')
	declare country: string;

	@QField({
		widget: 'textarea',
		label: 'About me',
		placeholder: 'Tell us about yourself...',
	})
	// No @QGroup → appears in undefined group
	declare bio?: string;
}

// Grouped schema
const grouped = UserProfileModel.getFormSchemaGrouped();
console.log(grouped);
// [
//   {
//     group: 'Personal Info',
//     fields: [
//       { field: 'firstName', widget: 'input', label: 'First name', required: true },
//       { field: 'lastName',  widget: 'input', label: 'Last name', required: true },
//       { field: 'email',     widget: 'input', inputType: 'email', label: 'Email', required: true },
//     ]
//   },
//   {
//     group: 'Address',
//     fields: [
//       { field: 'street',  widget: 'input', label: 'Street', required: true },
//       { field: 'city',    widget: 'input', label: 'City', required: true },
//       { field: 'country', widget: 'select', label: 'Country', options: [...] },
//     ]
//   },
//   {
//     group: undefined,
//     fields: [
//       { field: 'bio', widget: 'textarea', label: 'About me' },
//     ]
//   }
// ]
```

## React Integration (practical example)

```typescript
// DynamicForm.tsx
import React from 'react';
import type { IQFormSchemaEntry } from '@cartago-git/quickmodel';

interface IDynamicFormProps {
	schema: IQFormSchemaEntry[];
	values: Record<string, unknown>;
	onChange: (field: string, value: unknown) => void;
}

function DynamicField({ entry, value, onChange }: {
	entry: IQFormSchemaEntry;
	value: unknown;
	onChange: (val: unknown) => void;
}) {
	const { widget, label, placeholder, inputType, options, required } = entry;

	switch (widget) {
		case 'input':
			return (
				<div>
					<label>{label}{required && ' *'}</label>
					<input
						type={inputType ?? 'text'}
						placeholder={placeholder}
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
					/>
				</div>
			);
		case 'textarea':
			return (
				<div>
					<label>{label}</label>
					<textarea
						placeholder={placeholder}
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
					/>
				</div>
			);
		case 'select':
			return (
				<div>
					<label>{label}{required && ' *'}</label>
					<select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
						{(options as string[]).map((opt) =>
							typeof opt === 'string'
								? <option key={opt} value={opt}>{opt}</option>
								: <option key={opt.value as string} value={opt.value as string}>{opt.label}</option>
						)}
					</select>
				</div>
			);
		case 'switch':
			return (
				<div>
					<label>
						<input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
						{' '}{label}
					</label>
				</div>
			);
		default:
			return null;
	}
}

export function DynamicForm({ schema, values, onChange }: IDynamicFormProps) {
	return (
		<form>
			{schema.map((entry) => (
				<DynamicField
					key={entry.field}
					entry={entry}
					value={values[entry.field]}
					onChange={(val) => onChange(entry.field, val)}
				/>
			))}
		</form>
	);
}

// Usage:
// const schema = ContactModel.getFormSchema();
// <DynamicForm schema={schema} values={formState} onChange={handleChange} />
```

## Custom Metadata

`@QField` accepts any extra property your framework needs:

```typescript
interface IProductForm {
	name: string;
	price: number;
	imageUrl: string;
}

@Quick()
class ProductForm extends QModel<IProductForm> {
	@QField({
		widget: 'input',
		label: 'Product name',
		required: true,
		// Custom metadata for your validation system:
		minLength: 3,
		maxLength: 100,
	})
	declare name: string;

	@QField({
		widget: 'number',
		label: 'Price ($)',
		required: true,
		// For React Hook Form:
		min: 0,
		step: 0.01,
		currency: 'USD',
	})
	declare price: number;

	@QField({
		widget: 'input',
		inputType: 'url',
		label: 'Image URL',
	})
	declare imageUrl: string;
}

const schema = ProductForm.getFormSchema();
console.log(schema[1].min); // 0
console.log(schema[1].step); // 0.01
console.log(schema[1].currency); // 'USD'
```

## Best Practices

```typescript
// ✅ Good: separate domain model from form model
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare createdAt: Date;
}

// Form model only for the creation form:
@Quick()
class CreateUserForm extends QModel<Omit<IUser, 'id' | 'createdAt'>> {
	@QField({ widget: 'input', label: 'Name', required: true })
	declare name: string;
}

// ✅ Centralize reusable options
const COUNTRY_OPTIONS = [
	{ value: 'US', label: 'United States' },
	{ value: 'GB', label: 'United Kingdom' },
	{ value: 'CA', label: 'Canada' },
];

@QField({ widget: 'select', label: 'Country', options: COUNTRY_OPTIONS })
declare country: string;
```

## Next Steps

- [Validation](/en/examples/validation) - Add business rules with `@QRule`
- [Alias Mapping](/en/examples/alias-mapping) - Map snake_case fields with `@QAlias`
