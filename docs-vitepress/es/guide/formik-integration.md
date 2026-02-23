# Integración con Formik

QuickModel funciona junto a Formik v2 como capa de validación y coerción — sin Zod, sin Yup, sin paquete resolver. `qCheckRules()` se usa directamente como prop `validate`, `@QGroup` impulsa la validación por pasos de wizard, y `getFormSchema()` genera campos de formulario dinámicos.

## Patrones clave

| Problema en Formik   | Patrón QuickModel                                     |
| -------------------- | ----------------------------------------------------- |
| Prop `validate`      | `qCheckRules(dto)` → `{}` vacío o `{ campo: msg }`    |
| Validación por campo | `qCheckRulesByGroup(dto)['grupoPaso']`                |
| Valores iniciales    | `dto.serialize()`                                     |
| Validación async     | `qCheckRulesAsync(dto)` con `@QRule(async ...)`       |
| Wizard multi-paso    | `@QGroup` por paso + `qCheckRulesByGroup(dto)`        |
| Campos dinámicos     | `dto.getFormSchema()` → renderizar lista de `<Field>` |
| Migración desde Zod  | Reemplazar `z.string().min()` → `@QRule`              |
| Migración desde Yup  | Reemplazar `yup.string().matches()` → `@QRule`        |

## Configuración del modelo

```typescript
import { QModel, Quick, QRule, QField, QGroup } from '@cartago-git/quickmodel';

interface IFormularioRegistro {
	nombre: string;
	email: string;
	password: string;
	edad: number;
	rol: string;
}

@Quick(
	{
		nombre: 'string',
		email: 'string',
		password: 'string',
		edad: 'number',
		rol: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class RegistroDto extends QModel<IFormularioRegistro> {
	@QGroup('personal')
	@QField({ label: 'Nombre completo', required: true })
	@QRule(
		(val: string) => val.trim().length >= 2,
		'El nombre debe tener al menos 2 caracteres'
	)
	declare nombre: string;

	@QGroup('personal')
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Dirección de email inválida'
	)
	declare email: string;

	@QGroup('seguridad')
	@QField({ label: 'Contraseña', widget: 'password', required: true })
	@QRule((val: string) => val.length >= 8, 'Mínimo 8 caracteres')
	@QRule((val: string) => /[A-Z]/.test(val), 'Requiere una mayúscula')
	@QRule((val: string) => /\d/.test(val), 'Requiere un dígito')
	declare password: string;

	@QGroup('personal')
	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 18, 'Debe tener 18 años o más')
	declare edad: number;

	@QGroup('preferencias')
	@QField({ label: 'Rol' })
	@QRule(
		(val: string) => ['usuario', 'editor', 'admin'].includes(val),
		'Rol inválido'
	)
	declare rol: string;
}
```

## 1. Adaptador `validate` para Formik

La prop `validate` de Formik recibe los `values` del formulario y debe retornar un **objeto vacío** `{}` si es válido, o `{ campo: 'Mensaje' }` si no lo es.

```typescript
import { qCheckRules } from '@cartago-git/quickmodel/forms';

// Utilidad: crear función validate compatible con Formik
function crearFormikValidate<TForm extends object>(
	construirDto: (values: Partial<TForm>) => object
) {
	return (values: Partial<TForm>): Record<string, string> => {
		const dto = construirDto(values);
		const { valid, errors } = qCheckRules(dto);
		if (valid) return {};
		return errors.reduce<Record<string, string>>((acc, err) => {
			if (!(err.field in acc)) acc[err.field] = err.message;
			return acc;
		}, {});
	};
}

// Uso en componente React
const validate = crearFormikValidate<IFormularioRegistro>(
	(values) => new RegistroDto(values)
);

// <Formik initialValues={...} validate={validate} onSubmit={handleSubmit}>
```

> **Diferencia Formik vs RHF**: Formik espera `{}` para válido (no `true`). El adaptador gestiona esta distinción automáticamente.

## 2. Validación por campo — Wizard multi-paso

Usa `@QGroup` para particionar los campos por paso del wizard. `qCheckRulesByGroup(dto)` devuelve un mapa de `nombreGrupo → { valid, errors }`:

```typescript
import { qCheckRulesByGroup } from '@cartago-git/quickmodel/forms';

// Paso 1 del wizard: validar solo el grupo 'personal'
function validarPaso1(
	values: Partial<IFormularioRegistro>
): Record<string, string> {
	const dto = new RegistroDto(values);
	const porGrupo = qCheckRulesByGroup(dto);
	const personal = porGrupo['personal'];
	if (!personal || personal.valid) return {};
	return personal.errors.reduce<Record<string, string>>((acc, err) => {
		if (!(err.field in acc)) acc[err.field] = err.message;
		return acc;
	}, {});
}

// Paso 2 del wizard: validar solo el grupo 'seguridad'
function validarPaso2(
	values: Partial<IFormularioRegistro>
): Record<string, string> {
	const dto = new RegistroDto(values);
	const porGrupo = qCheckRulesByGroup(dto);
	const seguridad = porGrupo['seguridad'];
	if (!seguridad || seguridad.valid) return {};
	return seguridad.errors.reduce<Record<string, string>>((acc, err) => {
		if (!(err.field in acc)) acc[err.field] = err.message;
		return acc;
	}, {});
}
```

## 3. Migración desde Zod

Reemplaza los schemas de Zod campo a campo con decoradores `@QField` + `@QRule`:

| Zod                     | QuickModel                                               |
| ----------------------- | -------------------------------------------------------- |
| `z.string().min(2)`     | `@QRule((v) => v.length >= 2, 'Mínimo 2 chars')`         |
| `z.string().email()`    | `@QRule((v) => /^...@.../.test(v), 'Email inválido')`    |
| `z.number().min(18)`    | `@QRule((v) => v >= 18, 'Mínimo 18 años')`               |
| `z.enum(['a','b'])`     | `@QRule((v) => ['a','b'].includes(v), 'Valor inválido')` |
| `z.string().optional()` | Solo `declare campo?: string` sin `@QRule`               |
| `zodResolver(schema)`   | `validate={crearFormikValidate(...)}` (sin resolver)     |

```typescript
// Versión Zod:
// const schema = z.object({
//   nombre: z.string().min(2),
//   email: z.string().email(),
//   edad: z.number().min(18),
// });

// Equivalente en QuickModel:
@Quick(
	{ nombre: 'string', email: 'string', edad: 'number' },
	{ coercionStrategy: 'loose' }
)
class UsuarioDto extends QModel<{
	nombre: string;
	email: string;
	edad: number;
}> {
	@QRule((v: string) => v.length >= 2, 'Mínimo 2 caracteres')
	declare nombre: string;

	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	declare email: string;

	@QRule((v: number) => v >= 18, 'Debe tener 18 años o más')
	declare edad: number;
}
```

**No se necesita importar `zodResolver`.** Pasa `validate={crearFormikValidate(...)}` directamente a `<Formik>`.

## 4. Migración desde Yup

| Yup                           | QuickModel                                              |
| ----------------------------- | ------------------------------------------------------- |
| `yup.string().matches(regex)` | `@QRule((v) => regex.test(v), 'No coincide')`           |
| `yup.number().integer()`      | `@QRule((v) => Number.isInteger(v), 'Debe ser entero')` |
| `yup.number().positive()`     | `@QRule((v) => v > 0, 'Debe ser positivo')`             |
| `yup.string().oneOf([...])`   | `@QRule((v) => [...].includes(v), 'Valor inválido')`    |
| `yupResolver(schema)`         | `validate={crearFormikValidate(...)}` (sin resolver)    |

## 5. Renderizado dinámico con `getFormSchema()`

`getFormSchema()` devuelve los metadatos de `@QField` de todos los campos declarados — úsalo para generar los campos de forma programática:

```typescript
const dto = new RegistroDto({ ... });
const schema = dto.getFormSchema();

// Renderizado en React (conceptual):
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

## 6. Validación asíncrona

Usa `@QRule` con un predicado asíncrono (que devuelva `Promise<boolean>`) para verificaciones del lado del servidor, como la unicidad de email:

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/forms';

const emailsRegistrados = new Set(['admin@ejemplo.com']);

@Quick(
	{ nombre: 'string', email: 'string', edad: 'number', rol: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class EmailUnicoDto extends QModel<IFormularioRegistro> {
	declare nombre: string;
	@QRule(
		(val: string) => Promise.resolve(!emailsRegistrados.has(val)),
		'Email ya registrado'
	)
	declare email: string;
	declare edad: number;
	declare rol: string;
}

// En validate de Formik (versión async):
async function validarAsync(values: Partial<IFormularioRegistro>) {
	const dto = new EmailUnicoDto(values);
	const { valid, errors } = await qCheckRulesAsync(dto);
	if (valid) return {};
	return errors.reduce<Record<string, string>>((acc, err) => {
		if (!(err.field in acc)) acc[err.field] = err.message;
		return acc;
	}, {});
}
// <Formik validate={validarAsync} ...>
```

## 7. `validationReport()` — Trazabilidad de reglas

`validationReport()` devuelve un desglose completo por campo de cada regla aplicada:

```typescript
const dto = new RegistroDto({ ... });
const reporte = dto.validationReport();
// reporte['password'] → array de { message, passed } por cada @QRule en password
```

Esto es útil para mostrar indicadores de progreso en línea (p.ej., un medidor de fortaleza de contraseña que lista qué requisitos ya se cumplen).

## Resumen

- `qCheckRules(dto)` → prop `validate` de Formik (devuelve `{}` para válido)
- `qCheckRulesByGroup(dto)['paso']` → validación por paso de wizard
- `@QRule(async ...)` + `qCheckRulesAsync(dto)` → validate asíncrono en Formik
- `getFormSchema()` → generación dinámica de `<Field>`
- `validationReport()` → trazabilidad de reglas (medidores de contraseña, etc.)
- `coercionStrategy: 'loose'` → gestiona automáticamente los strings de inputs HTML
- No se necesita `zodResolver` ni `yupResolver`
