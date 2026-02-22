# Esquema de Formulario con `@QField`

`@QField` es un decorador de propiedades que adjunta metadatos de formulario a los campos del modelo. Usa `getFormSchema()` para obtener un array de esquema listo para cualquier librería de formularios (Angular Reactive Forms, React Hook Form, etc.).

## Ejemplo Básico

```typescript
import { Quick, QModel, QField } from '@cartago-git/quickmodel';

interface IPerfil {
	email: string;
	rol: string;
	activo: boolean;
	fechaNacimiento: Date;
}

@Quick({ fechaNacimiento: Date })
class PerfilModel extends QModel<IPerfil> {
	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	declare email: string;

	@QField({
		widget: 'select',
		label: 'Rol',
		options: ['admin', 'usuario', 'invitado'],
	})
	declare rol: string;

	@QField({ widget: 'checkbox', label: 'Activo' })
	declare activo: boolean;

	@QField({ widget: 'datepicker', label: 'Fecha de nacimiento' })
	declare fechaNacimiento: Date;
}
```

## Obtener el Esquema

Hay una variante **estática** y otra de **instancia** — ambas devuelven el mismo resultado:

```typescript
// Estática — sin necesidad de instancia:
const esquema = PerfilModel.getFormSchema();

// Instancia:
const perfil = PerfilModel.create({
	email: 'a@b.com',
	rol: 'usuario',
	activo: true,
	fechaNacimiento: new Date(),
});
const esquema = perfil.getFormSchema();
```

`getFormSchema()` devuelve un `IQFormSchemaEntry[]` ordenado:

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
		field: 'rol',
		widget: 'select',
		options: ['admin', 'usuario', 'invitado'],
		label: 'Rol',
	},
	{ field: 'activo', widget: 'checkbox', label: 'Activo' },
	{
		field: 'fechaNacimiento',
		widget: 'datepicker',
		label: 'Fecha de nacimiento',
	},
];
```

## Referencia de API

### `@QField(meta: IQFieldMeta)`

| Parámetro     | Tipo            | Descripción                                            |
| ------------- | --------------- | ------------------------------------------------------ |
| `widget`      | `IQFieldWidget` | El tipo de control de formulario (ver abajo)           |
| `label`       | `string`        | Etiqueta legible para el campo                         |
| `placeholder` | `string`        | Texto de marcador de posición para campos de texto     |
| `required`    | `boolean`       | Si el campo es obligatorio en el formulario            |
| `inputType`   | `string`        | Atributo HTML `type` para widgets `<input>`            |
| `options`     | `unknown[]`     | Opciones disponibles para widgets `select` / `radio`   |
| `[key]`       | `unknown`       | Cualquier metadato personalizado adicional se conserva |

### `IQFieldWidget`

| Valor          | Uso típico                                   |
| -------------- | -------------------------------------------- |
| `'input'`      | Campos `<input>` de texto, email, contraseña |
| `'textarea'`   | Texto multilínea                             |
| `'select'`     | Lista desplegable                            |
| `'checkbox'`   | Toggle booleano                              |
| `'radio'`      | Selección única de una lista                 |
| `'datepicker'` | Selector de fecha / datetime                 |
| `'number'`     | Entrada numérica                             |
| `'switch'`     | Toggle tipo Material/UI                      |
| `'mi-widget'`  | Cualquier cadena personalizada es válida     |

### `getFormSchema()`

| Variante  | Firma                         | Descripción                              |
| --------- | ----------------------------- | ---------------------------------------- |
| Estática  | `NombreClase.getFormSchema()` | No requiere instancia                    |
| Instancia | `instancia.getFormSchema()`   | Mismo resultado que la variante estática |

**Devuelve:** `IQFormSchemaEntry[]` — array ordenado de objetos `{ field, ...meta }`.

## Metadatos Extra

Puedes añadir cualquier propiedad adicional y se conservará en el esquema:

```typescript
@QField({
	widget: 'input',
	inputType: 'email',
	label: 'Email',
	placeholder: 'tu@ejemplo.com',
	hint: 'Debe ser único en el sistema',
	cssClass: 'full-width',
})
declare email: string;
```

## Herencia

Las subclases heredan automáticamente las anotaciones `@QField` de su padre. Si una subclase redeclara un campo con `@QField`, sobreescribe la entrada del esquema del padre para ese campo.

```typescript
@Quick()
class AdminModel extends PerfilModel {
	// Sobreescribe: añade hint específico para admins
	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email Admin',
		hint: 'Debe terminar en @empresa.com',
	})
	declare email: string;
}

AdminModel.getFormSchema();
// la entrada email usa el @QField de AdminModel, el resto viene de PerfilModel
```

## Ejemplos de Uso con Frameworks

### Angular

```typescript
@Component({
	template: `
		<form>
			<ng-container *ngFor="let campo of esquema">
				<ng-container [ngSwitch]="campo.widget">
					<input
						*ngSwitchCase="'input'"
						[type]="campo.inputType ?? 'text'"
						[placeholder]="campo.placeholder ?? ''" />
					<textarea
						*ngSwitchCase="'textarea'"
						[placeholder]="campo.placeholder ?? ''"></textarea>
					<select *ngSwitchCase="'select'">
						<option
							*ngFor="let opt of campo.options"
							[value]="opt">
							{{ opt }}
						</option>
					</select>
					<input
						*ngSwitchCase="'checkbox'"
						type="checkbox" />
				</ng-container>
				<label>{{ campo.label }}</label>
			</ng-container>
		</form>
	`,
})
export class FormularioDinamicoComponent {
	esquema = PerfilModel.getFormSchema();
}
```

### React

```tsx
const esquema = PerfilModel.getFormSchema();

function FormularioDinamico() {
	return (
		<form>
			{esquema.map((campo) => (
				<div key={campo.field}>
					<label>{campo.label}</label>
					{campo.widget === 'input' && (
						<input
							type={campo.inputType ?? 'text'}
							placeholder={campo.placeholder as string}
						/>
					)}
					{campo.widget === 'select' && (
						<select>
							{(campo.options as string[]).map((opt) => (
								<option
									key={opt}
									value={opt}>
									{opt}
								</option>
							))}
						</select>
					)}
					{campo.widget === 'checkbox' && <input type="checkbox" />}
				</div>
			))}
		</form>
	);
}
```

## Tipos TypeScript

```typescript
import type {
	IQFieldMeta,
	IQFormSchemaEntry,
	IQFieldWidget,
} from '@cartago-git/quickmodel';

// Una entrada del esquema:
interface IQFormSchemaEntry extends IQFieldMeta {
	field: string; // nombre de la propiedad tal como se declara en el modelo
}

// Metadata del campo:
interface IQFieldMeta {
	widget: IQFieldWidget;
	label?: string;
	placeholder?: string;
	required?: boolean;
	inputType?: string;
	options?: unknown[];
	[key: string]: unknown; // cualquier propiedad extra
}

// Tipo de widget:
type IQFieldWidget =
	| 'input'
	| 'textarea'
	| 'select'
	| 'checkbox'
	| 'radio'
	| 'datepicker'
	| 'number'
	| 'switch'
	| (string & {}); // permite cualquier otra cadena
```
