````markdown
# Validación con @QRule

QuickModel proporciona un sistema de validación declarativo mediante el decorador `@QRule`. Las reglas se definen directamente sobre las propiedades del modelo y se ejecutan con el método `checkRules()`.

## Uso básico

```typescript
import { Quick, QType, QModel, QRule } from '@cartago-git/quickmodel';

interface IUsuario {
	nombre: string;
	edad: number;
	email: string;
}

@Quick()
class Usuario extends QModel<IUsuario> {
	@QRule(
		(v: string) => v.length >= 3,
		'El nombre debe tener al menos 3 caracteres'
	)
	declare nombre: string;

	@QRule((v: number) => v >= 0, 'La edad no puede ser negativa')
	@QRule((v: number) => v <= 120, 'La edad debe ser realista')
	declare edad: number;

	@QRule((v: string) => v.includes('@'), 'Debe ser un email válido')
	declare email: string;
}
```

```typescript
const user = new Usuario({ nombre: 'Jo', edad: -1, email: 'noesemail' });

const result = user.checkRules();

console.log(result.valid); // false
console.log(result.errors);
// [
//   { field: 'nombre', message: 'El nombre debe tener al menos 3 caracteres', value: 'Jo' },
//   { field: 'edad',   message: 'La edad no puede ser negativa',              value: -1 },
//   { field: 'email',  message: 'Debe ser un email válido',                   value: 'noesemail' }
// ]
```

## Apilar múltiples reglas

Puedes aplicar varios `@QRule` a la misma propiedad. **Se recogen todos los fallos**, no solo el primero.

```typescript
@QRule((v: number) => v >= 18, 'Debes tener al menos 18 años')
@QRule((v: number) => v <= 65, 'Debes tener menos de 65 años')
@QRule((v: number) => Number.isInteger(v), 'La edad debe ser un número entero')
declare edad: number;
```

```typescript
const u = new Usuario({ ..., edad: 17.5 });
const result = u.checkRules();
// errors incluye dos mensajes: 'Debes tener al menos 18...' y 'La edad debe ser un número entero'
```

## Resultado válido

Cuando todas las reglas pasan, `checkRules()` devuelve `{ valid: true, errors: [] }`.

```typescript
const user = new Usuario({
	nombre: 'Alice',
	edad: 30,
	email: 'alice@example.com',
});
const result = user.checkRules();
// { valid: true, errors: [] }
```

## Referencia API

### `@QRule(fn, message)`

| Parámetro | Tipo                          | Descripción                                                                                     |
| --------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `fn`      | `(value: unknown) => boolean` | Función de validación. Debe devolver `true` para que la regla pase.                             |
| `message` | `string \| (() => string)`    | Mensaje estático, clave i18n, o función lazy evaluada en el momento de llamar a `checkRules()`. |

Se puede apilar — cada decorador aplica una sola regla.

### `checkRules()`

Ejecuta todas las reglas `@QRule` declaradas en las propiedades del modelo.

**Devuelve:** `IQRulesResult`

```typescript
interface IQRulesResult {
	valid: boolean;
	errors: Array<{
		field: string; // nombre de la propiedad
		message: string; // mensaje resuelto (string o valor retornado por () => string)
		value: unknown; // valor actual del campo en el momento de la validación
	}>;
}
```

### `hasIntegrity()`

Atajo booleano para `checkIntegrity().length === 0`.

Devuelve `true` cuando todos los valores de campo se ajustan al tipo de transformer declarado (sin límites DoS superados, sin incompatibilidades de tipo).

```typescript
if (!usuario.hasIntegrity()) {
	const errors = usuario.checkIntegrity();
	// gestionar violaciones a nivel de transformer...
}
```

### `isValid()`

Comprobación booleana unificada que combina ambos niveles: `hasIntegrity() && checkRules().valid`.

Devuelve `true` solo cuando la instancia tiene **integridad de tipo completa** y **todas las reglas de negocio pasan**.

```typescript
if (!usuario.isValid()) {
	// desglosar fallos específicos:
	const integrityErrors = usuario.checkIntegrity(); // nivel tipo
	const ruleErrors = usuario.checkRules().errors; // lógica de negocio
}
```

| Método               | Devuelve              | Qué comprueba                                     |
| -------------------- | --------------------- | ------------------------------------------------- |
| `checkIntegrity()`   | `IQIntegrityResult[]` | Restricciones de transformer (tipos, límites DoS) |
| `hasIntegrity()`     | `boolean`             | Atajo: `checkIntegrity().length === 0`            |
| `checkRules()`       | `IQRulesResult`       | Reglas de negocio (predicados `@QRule`)           |
| `isValid()`          | `boolean`             | Ambos: integridad + reglas                        |
| `validationReport()` | `IQValidationReport`  | Ambos, devuelve informe completo                  |

### `validationReport()`

Una sola llamada que ejecuta ambas comprobaciones y devuelve resultados detallados.

```typescript
const informe = usuario.validationReport();

if (!informe.valid) {
	// Fallos a nivel de transformer:
	informe.integrity.forEach((e) => console.error(e.error));
	// Fallos de @QRule:
	informe.rules.errors.forEach((e) => console.error(e.field, e.message));
}
```

**Devuelve:** `IQValidationReport`

```typescript
interface IQValidationReport {
	valid: boolean;
	integrity: IQIntegrityResult[]; // vacío = todo OK
	rules: IQRulesResult; // { valid, errors[] }
}
```

## Soporte para i18n

El parámetro `message` acepta `string | (() => string)`. La forma de función se evalúa de forma **lazy** — en el momento de llamar a `checkRules()` — lo que la hace compatible con i18n en tiempo de ejecución:

```typescript
import { t } from './i18n'; // tu traductor global

@Quick({ nombre: 'string' })
class Usuario extends QModel<IUsuario> {
	// Lazy: se resuelve cuando se llama a checkRules()
	@QRule((v) => (v as string).length >= 3, () => t('validation.nombre.min'))
	declare nombre: string;
}
```

Si el usuario cambia de idioma en runtime, la próxima llamada a `checkRules()` reflejará el nuevo idioma.

### Angular: keys + pipe `| translate`

También puedes guardar claves i18n como mensaje estático y resolverlas en el template — sin necesidad de función lazy:

```typescript
@QRule((v) => (v as string).length >= 3, 'validation.nombre.min')
declare nombre: string;
```

```html
<!-- En tu template Angular -->
<span *ngFor="let e of result.errors">{{ e.message | translate }}</span>
```

Ambos enfoques son válidos; elige el que mejor se adapte a tu arquitectura.

> [!NOTE]
> `checkRules()` es independiente de `checkIntegrity()`. `checkIntegrity()` comprueba restricciones de tipo a nivel de transformer (límites DoS, rangos de tipo). `checkRules()` es para tu lógica de negocio.

## Combinando con seguimiento de cambios

`@QRule` y `checkRules()` funcionan a la perfección junto con `isDirty()`, `merge()` y `patch()`.

```typescript
const user = new Usuario({
	nombre: 'Alice',
	edad: 30,
	email: 'alice@example.com',
});

const updated = user.merge({ edad: -5 });
const result = updated.checkRules();

console.log(result.valid); // false
console.log(result.errors[0].field); // 'edad'
```

## Herencia de reglas

Las reglas `@QRule` se heredan: una subclase también ejecutará las reglas definidas en las propiedades de su clase padre.

```typescript
@Quick()
class Admin extends Usuario {
	@QRule(
		(v: string) => v.startsWith('ADMIN_'),
		'El nombre del admin debe empezar por ADMIN_'
	)
	declare nombre: string; // sobreescribe la regla del padre para 'nombre'
}
```

> [!WARNING]
> Si una subclase redeclara una propiedad con `@QRule`, solo se aplican las **reglas de la subclase** para ese campo (las reglas del padre para ese campo se sobreescriben). Los campos no redeclarados mantienen sus reglas del padre.

## Esquema de formulario (`@QField`)

Usa `@QField` para anotar propiedades del modelo con metadatos de formulario. Luego llama a `getFormSchema()` para obtener un array de esquema listo para pasarlo a cualquier librería de formularios (Angular, React, etc.).

```typescript
import { QField } from '@cartago-git/quickmodel';

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

// Estático — no necesita instancia:
const esquema = PerfilModel.getFormSchema();
// [
//   { field: 'email',           widget: 'input',      inputType: 'email', label: 'Email', required: true },
//   { field: 'rol',             widget: 'select',     options: [...],     label: 'Rol' },
//   { field: 'activo',          widget: 'checkbox',   label: 'Activo' },
//   { field: 'fechaNacimiento', widget: 'datepicker', label: 'Fecha de nacimiento' },
// ]
```

### Widgets disponibles

| Widget        | Uso típico                               |
| ------------- | ---------------------------------------- |
| `input`       | Texto, email, contraseña                 |
| `textarea`    | Texto multilínea                         |
| `select`      | Lista desplegable                        |
| `checkbox`    | Toggle booleano                          |
| `radio`       | Selección única de una lista             |
| `datepicker`  | Selector de fecha / datetime             |
| `number`      | Entrada numérica                         |
| `switch`      | Toggle tipo Material/UI                  |
| `'mi-widget'` | Cualquier cadena personalizada es válida |

### Metadatos extra

Cualquier propiedad adicional que pases se conserva:

```typescript
@QField({
	widget: 'input',
	inputType: 'email',
	label: 'Email',
	placeholder: 'tu@ejemplo.com',
	hint: 'Debe ser único en el sistema',
	cssClas: 'full-width',
})
declare email: string;
```

### Herencia

Las subclases heredan las entradas `@QField` de sus clases padre. Redeclarar un campo lo sobreescribe.

## Validación Asíncrona

Todos los métodos síncronos tienen equivalentes asíncronos que aceptan predicados que devuelven `Promise<boolean>`.

### `checkRulesAsync()`

Igual que `checkRules()` pero espera cada predicado. Úsalo cuando algún `@QRule` contiene una función async (p. ej. una consulta de unicidad a base de datos).

```typescript
// Predicado async — p. ej. comprueba unicidad en BD
@QRule(
	async (v) => !await bd.emailExiste(v as string),
	'Email ya registrado'
)
declare email: string;

// Evaluar
const resultado = await usuario.checkRulesAsync();
if (!resultado.valid) {
	console.log(resultado.errors); // [{ field: 'email', message: '...', value: '...' }]
}
```

Los predicados síncronos también funcionan — se envuelven internamente en `Promise.resolve()`.

> [!NOTE]
> `checkRules()` (síncrono) sigue funcionando como antes y no espera predicados async. Usa `checkRulesAsync()` cuando tengas reglas asíncronas.

### `isValidAsync()`

Equivalente async de `isValid()`. Devuelve `Promise<boolean>`.

```typescript
if (await usuario.isValidAsync()) {
	// integridad OK + todos los predicados @QRule (incluso async) pasan
}
```

### `validationReportAsync()`

Equivalente async de `validationReport()`. Devuelve `Promise<IQValidationReport>`.

```typescript
const reporte = await usuario.validationReportAsync();
if (!reporte.valid) {
	reporte.integrity.forEach((e) => console.error(e.error));
	reporte.rules.errors.forEach((e) => console.error(e.field, e.message));
}
```

### Resumen API async

| Método                    | Devuelve                      | Notas                               |
| ------------------------- | ----------------------------- | ----------------------------------- |
| `checkRulesAsync()`       | `Promise<IQRulesResult>`      | Espera predicados síncronos y async |
| `isValidAsync()`          | `Promise<boolean>`            | Integridad + reglas async           |
| `validationReportAsync()` | `Promise<IQValidationReport>` | Reporte completo, compatible async  |
````
