# Formularios con @QField y @QGroup

Genera schemas de formulario dinámicamente a partir de los metadatos de tu modelo con `@QField` y `@QGroup`.

## Caso de Uso

Tienes un modelo de usuario y quieres generar un formulario dinámico en React, Angular o Vue sin escribir el schema a mano.

## Schema Básico con @QField

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
		label: 'Nombre',
		required: true,
	})
	declare firstName: string;

	@QField({
		widget: 'input',
		inputType: 'text',
		label: 'Apellido',
		required: true,
	})
	declare lastName: string;

	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
		placeholder: 'tu@email.com',
	})
	declare email: string;

	@QField({
		widget: 'input',
		inputType: 'tel',
		label: 'Teléfono',
		placeholder: '+34 600 000 000',
	})
	declare phone?: string;

	@QField({
		widget: 'textarea',
		label: 'Biografía',
		placeholder: 'Cuéntanos sobre ti...',
	})
	declare bio?: string;

	@QField({
		widget: 'select',
		label: 'Rol',
		required: true,
		options: [
			{ value: 'admin', label: 'Administrador' },
			{ value: 'editor', label: 'Editor' },
			{ value: 'viewer', label: 'Lector' },
		],
	})
	declare role: string;

	@QField({ widget: 'datepicker', label: 'Fecha de nacimiento' })
	declare birthDate: Date;

	@QField({ widget: 'switch', label: '¿Suscribirse a la newsletter?' })
	declare newsletter: boolean;
}

// Obtener el schema completo
const schema = ContactModel.getFormSchema();
console.log(schema);
// [
//   { field: 'firstName', widget: 'input', inputType: 'text', label: 'Nombre', required: true },
//   { field: 'lastName',  widget: 'input', inputType: 'text', label: 'Apellido', required: true },
//   { field: 'email',     widget: 'input', inputType: 'email', label: 'Email', ... },
//   { field: 'phone',     widget: 'input', inputType: 'tel', label: 'Teléfono', ... },
//   { field: 'bio',       widget: 'textarea', label: 'Biografía', ... },
//   { field: 'role',      widget: 'select', label: 'Rol', options: [...] },
//   { field: 'birthDate', widget: 'datepicker', label: 'Fecha de nacimiento' },
//   { field: 'newsletter',widget: 'switch', label: '¿Suscribirse a la newsletter?' },
// ]
```

## Agrupación por Secciones con @QGroup

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
	@QField({ widget: 'input', label: 'Nombre', required: true })
	@QGroup('Datos personales')
	declare firstName: string;

	@QField({ widget: 'input', label: 'Apellido', required: true })
	@QGroup('Datos personales')
	declare lastName: string;

	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	@QGroup('Datos personales')
	declare email: string;

	@QField({ widget: 'input', label: 'Calle', required: true })
	@QGroup('Dirección')
	declare street: string;

	@QField({ widget: 'input', label: 'Ciudad', required: true })
	@QGroup('Dirección')
	declare city: string;

	@QField({
		widget: 'select',
		label: 'País',
		required: true,
		options: ['España', 'México', 'Argentina', 'Colombia'],
	})
	@QGroup('Dirección')
	declare country: string;

	@QField({
		widget: 'textarea',
		label: 'Sobre mí',
		placeholder: 'Cuéntanos sobre ti...',
	})
	// Sin @QGroup → aparece en grupo undefined
	declare bio?: string;
}

// Schema agrupado
const grouped = UserProfileModel.getFormSchemaGrouped();
console.log(grouped);
// [
//   {
//     group: 'Datos personales',
//     fields: [
//       { field: 'firstName', widget: 'input', label: 'Nombre', required: true },
//       { field: 'lastName',  widget: 'input', label: 'Apellido', required: true },
//       { field: 'email',     widget: 'input', inputType: 'email', label: 'Email', required: true },
//     ]
//   },
//   {
//     group: 'Dirección',
//     fields: [
//       { field: 'street',  widget: 'input', label: 'Calle', required: true },
//       { field: 'city',    widget: 'input', label: 'Ciudad', required: true },
//       { field: 'country', widget: 'select', label: 'País', options: [...] },
//     ]
//   },
//   {
//     group: undefined,
//     fields: [
//       { field: 'bio', widget: 'textarea', label: 'Sobre mí' },
//     ]
//   }
// ]
```

## Integración con React (ejemplo práctico)

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

// Uso:
// const schema = ContactModel.getFormSchema();
// <DynamicForm schema={schema} values={formState} onChange={handleChange} />
```

## Integración con Formularios Agrupados (Angular-style)

```typescript
// Para Angular u otros frameworks que usan grupos de formulario:

const grouped = UserProfileModel.getFormSchemaGrouped();

// Renderizar como tabs o secciones colapsables
grouped.forEach(({ group, fields }) => {
	const sectionTitle = group ?? 'Otros campos';
	console.log(`\n== ${sectionTitle} ==`);
	fields.forEach((field) => {
		console.log(`  - ${field.field}: ${field.widget} (${field.label})`);
	});
});

// == Datos personales ==
//   - firstName: input (Nombre)
//   - lastName:  input (Apellido)
//   - email:     input (Email)
// == Dirección ==
//   - street:  input (Calle)
//   - city:    input (Ciudad)
//   - country: select (País)
// == Otros campos ==
//   - bio: textarea (Sobre mí)
```

## Metadatos Personalizados

`@QField` acepta cualquier propiedad extra que tu framework necesite:

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
		label: 'Nombre del producto',
		required: true,
		// Metadatos personalizados para tu sistema de validación:
		minLength: 3,
		maxLength: 100,
		pattern: '^[a-zA-Z0-9 ]+$',
	})
	declare name: string;

	@QField({
		widget: 'number',
		label: 'Precio (€)',
		required: true,
		// Para formularios React Hook Form:
		min: 0,
		step: 0.01,
		currency: 'EUR',
	})
	declare price: number;

	@QField({
		widget: 'input',
		inputType: 'url',
		label: 'URL de imagen',
		// Para upload personalizado:
		accept: 'image/*',
		maxSizeMb: 5,
	})
	declare imageUrl: string;
}

const schema = ProductForm.getFormSchema();
// Cada entrada contiene todos los metadatos que definiste
console.log(schema[1].min); // 0
console.log(schema[1].step); // 0.01
console.log(schema[1].currency); // 'EUR'
```

## Mejores Prácticas

### Separa el modelo de dominio del modelo de formulario

```typescript
// ✅ Bien: modelo de dominio separado del formulario
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare createdAt: Date;
}

// Modelo de formulario solo para el form de creación:
@Quick()
class CreateUserForm extends QModel<Omit<IUser, 'id' | 'createdAt'>> {
	@QField({ widget: 'input', label: 'Nombre', required: true })
	declare name: string;
}
```

### Centraliza las opciones reutilizables

```typescript
const COUNTRY_OPTIONS = [
	{ value: 'ES', label: 'España' },
	{ value: 'MX', label: 'México' },
	{ value: 'AR', label: 'Argentina' },
];

// Reutiliza en múltiples formularios
@QField({ widget: 'select', label: 'País', options: COUNTRY_OPTIONS })
declare country: string;
```

## Próximos Pasos

- [Validación](/es/examples/validation) - Añade reglas de negocio con `@QRule`
- [Alias y Mapeo](/es/examples/alias-mapping) - Mapea campos snake_case con `@QAlias`
