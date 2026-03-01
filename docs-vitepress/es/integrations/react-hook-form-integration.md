# Integración con React Hook Form

QuickModel se integra con React Hook Form como capa de coerción y validación en tiempo de
ejecución. Usa `@QField` para definir la estructura del formulario, `@QRule` para validación
síncrona y `qCheckRulesAsync()` para reglas asíncronas (p.ej. verificación de email en servidor).

## Patrones Clave

| Patrón                | API de QuickModel                            |
| --------------------- | -------------------------------------------- |
| Validar en submit     | `dto.checkRules()` → `setError()`            |
| Generación de esquema | `Dto.getFormSchema()`                        |
| Coerción de tipos     | `@Quick({ ..., coercionStrategy: 'loose' })` |
| Validación asíncrona  | `qCheckRulesAsync(dto)`                      |
| Detección de cambios  | `dto.isDirty()`                              |

## Instalación

```bash
npm install quickmodel react-hook-form
```

## Configuración del Modelo

Usa `@QField` para metadatos del formulario (etiqueta, tipo de widget, requerido).
Usa `@QRule` para la lógica de validación.

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

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
class RegistroDto extends QModel<IRegistro> {
	@QField({ label: 'Usuario', required: true })
	@QRule(
		(v: string) => v.length >= 3,
		'El usuario debe tener al menos 3 caracteres'
	)
	@QRule(
		(v: string) => /^[a-z0-9_]+$/.test(v),
		'Solo letras minúsculas, números y guiones bajos'
	)
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email no válido'
	)
	declare email: string;

	@QField({ label: 'Contraseña', widget: 'password', required: true })
	@QRule((v: string) => v.length >= 8, 'Mínimo 8 caracteres')
	@QRule(
		(v: string) => /[A-Z]/.test(v),
		'Debe contener al menos una mayúscula'
	)
	declare password: string;

	@QField({ label: 'Edad' })
	@QRule((v: number) => v >= 18, 'Debes tener 18 años o más')
	declare age: number;

	@QField({ label: 'Rol' })
	@QRule((v: string) => ['user', 'admin'].includes(v), 'Rol no válido')
	declare role: string;

	@QComputed()
	get nombreMostrado(): string {
		return `${this.username} (${this.role})`;
	}
}
```

> **`coercionStrategy: 'loose'`** — Los inputs HTML envían todos los valores como strings.
> Esta opción convierte `"25"` → `25` para campos numéricos automáticamente.

::: tip Dos patrones disponibles
Esta guía muestra el patrón **`QModel` + `@Quick`** que incluye coerción, serialización y `@QComputed`. Si solo necesitas validación sin coerción ni serialización, puedes usar una **clase plana** con `@QRule` y el resolver genérico. Ver [React integration — Resolver con clase plana](./react-integration#react-hook-form-adaptador-resolver).
:::

## Adaptador para React Hook Form

```typescript
import { useForm } from 'react-hook-form';

function FormularioRegistro() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: async (values) => {
      const dto = new RegistroDto(values);
      const { valid, errors: ruleErrors } = dto.$qm.checkRules();
      if (valid) return { values: dto.$qm.serialize(), errors: {} };
      const fieldErrors: Record<string, { message: string }> = {};
      for (const err of ruleErrors) {
        if (!fieldErrors[err.field]) {
          fieldErrors[err.field] = { message: err.message };
        }
      }
      return { values: {}, errors: fieldErrors };
    },
  });

  const alEnviar = (data: object) => {
    const dto = new RegistroDto(data);
    console.log(dto.nombreMostrado); // @QComputed disponible tras validar
    // enviar dto.$qm.serialize() a la API
  };

  return (
    <form onSubmit={handleSubmit(alEnviar)}>
      <input {...register('username')} />
      {errors.username && <span>{errors.username.message}</span>}

      <input type="email" {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('age', { valueAsNumber: true })} />
      {errors.age && <span>{errors.age.message}</span>}

      <button type="submit">Registrarse</button>
    </form>
  );
}
```

## Renderizado Dinámico con getFormSchema()

`getFormSchema()` devuelve todos los campos decorados con `@QField` y sus metadatos,
permitiendo un renderizado completamente dinámico sin nombres de campo hardcodeados:

```typescript
const schema = RegistroDto.getFormSchema();
// [
//   { field: 'username', label: 'Usuario',      required: true,  widget: 'text' },
//   { field: 'email',    label: 'Email',         required: true,  widget: 'email' },
//   { field: 'password', label: 'Contraseña',    required: true,  widget: 'password' },
//   { field: 'age',      label: 'Edad',          required: false, widget: 'text' },
//   { field: 'role',     label: 'Rol',           required: false, widget: 'text' },
// ]
```

```tsx
function FormularioDinamico({ DtoClass }: { DtoClass: typeof RegistroDto }) {
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
			<button type="submit">Enviar</button>
		</form>
	);
}
```

## Seguimiento de Cambios con isDirty()

`isDirty()` detecta si el estado actual del modelo difiere del snapshot original.
Úsalo para habilitar/deshabilitar el botón "Guardar" o mostrar un indicador de cambios sin guardar:

```tsx
function FormularioEdicion({ datosIniciales }: { datosIniciales: IRegistro }) {
	const [dto, setDto] = useState(() => new RegistroDto(datosIniciales));

	const handleGuardar = async () => {
		if (!dto.$qm.isDirty()) return; // nada cambió
		await guardarPerfil(dto.$qm.serialize());
		dto.reset(); // limpiar estado sucio
		setDto(new RegistroDto(dto.$qm.serialize() as IRegistro));
	};

	return (
		<form>
			{/* ... campos ... */}
			<button
				onClick={handleGuardar}
				disabled={!dto.$qm.isDirty()}>
				Guardar cambios
			</button>
		</form>
	);
}
```

> Tras `copy()`, la instancia resultante tiene `isDirty() === false` — el estado copiado se convierte en el nuevo baseline. Llama a `reset()` en la nueva instancia para revertir al estado en el momento de la copia.

## Validación Asíncrona (Servidor)

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

// En el resolver del formulario:
const dto = new RegistroConEmailUnicoDto(formValues);
const { valid, errors } = await qCheckRulesAsync(dto);
```

## Ver También

- [Decorador QField](./qfield.md)
- [Formularios](./forms.md)
- [Integración con React](./react-integration.md)
