# Validación con @QRule

QuickModel proporciona un sistema de validación declarativo mediante el decorador `@QRule`. Las reglas se definen directamente sobre las propiedades del modelo y se ejecutan con el método `checkRules()`.

## Uso básico

```typescript
import { Quick, QType, QModel, QRule } from 'quickmodel';

interface IUsuario {
	nombre: string;
	edad: number;
	email: string;
}

@Quick()
class Usuario extends QModel<IUsuario> {
	@QRule(
		(val: string) => val.length >= 3,
		'El nombre debe tener al menos 3 caracteres'
	)
	declare nombre: string;

	@QRule((val: number) => val >= 0, 'La edad no puede ser negativa')
	@QRule((val: number) => val <= 120, 'La edad debe ser realista')
	declare edad: number;

	@QRule((val: string) => val.includes('@'), 'Debe ser un email válido')
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

## Modo TC39

Cuando se usan decoradores estándar TC39 (`experimentalDecorators` ausente o `false`), sustituye `declare` por `!` en los campos decorados con `@QRule`. La lógica del decorador es idéntica en ambos modos.

```typescript
// Modo TC39 — usa ! en lugar de declare
@Quick()
class Usuario extends QModel<IUsuario> {
	@QRule(
		(val) => val.length >= 3,
		'El nombre debe tener al menos 3 caracteres'
	)
	nombre!: string; // ✅ TC39: usa !

	@QRule((val) => val >= 0, 'La edad no puede ser negativa')
	edad!: number; // ✅ TC39: usa !

	@QRule((val) => val.includes('@'), 'Debe ser un email válido')
	email!: string; // ✅ TC39: usa !
}
```

### `@QType` + `@QRule` en modo TC39 — inferencia automática de tipo

Cuando `@QType` se combina con `@QRule` en el mismo campo, los metadatos de tipo en runtime se registran automáticamente. Coloca `@QType` **debajo** de `@QRule` para que se ejecute primero (los decoradores TC39 en un campo se evalúan de abajo hacia arriba).

```typescript
// Modo TC39 — @QType registra el tipo del campo → @QRule lo hereda
@Quick()
class Post extends QModel<IPost> {
	@QRule(
		(val) => val instanceof Date && !isNaN((val as Date).getTime()),
		'Fecha inválida'
	)
	@QType(Date) // abajo = se ejecuta primero en TC39
	publishedAt!: Date;

	@QRule(
		(val) => typeof val === 'string' && (val as string).length > 0,
		'El título es obligatorio'
	)
	@QType(String)
	title!: string;
}

const post = Post.create({ publishedAt: '2025-01-01', title: 'Hola' });
console.log(post.checkRules().valid); // true
```

## Apilar múltiples reglas

Puedes aplicar varios `@QRule` a la misma propiedad. **Se recogen todos los fallos**, no solo el primero.

```typescript
@QRule((val: number) => val >= 18, 'Debes tener al menos 18 años')
@QRule((val: number) => val <= 65, 'Debes tener menos de 65 años')
@QRule((val: number) => Number.isInteger(val), 'La edad debe ser un número entero')
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

## Validadores integrados

QuickModel incluye un conjunto de decoradores validadores listos para usar que replican la API de `class-validator`, implementados como wrappers sobre `@QRule`. Impórtalos desde el entry point principal:

```typescript
import { IsEmail, Min, IsNotEmpty } from 'quickmodel';
// o con tree-shaking para un bundle más pequeño:
import { IsEmail } from 'quickmodel/validators';
```

```typescript
@Quick()
class Usuario extends QModel<IUsuario> {
	@IsEmail()
	declare email: string;

	@Min(0)
	@Max(120)
	@IsInt()
	declare edad: number;

	@MinLength(3)
	@IsNotEmpty()
	declare nombre: string;
}

const user = new Usuario({ email: 'malo', edad: -1, nombre: '' });
user.checkRules();
// errors → [ email inválido, edad muy pequeña, nombre muy corto, nombre vacío ]
```

> 📖 **[Referencia de validadores integrados](./validators.md)** — Lista completa de los 14 validadores (`IsEmail`, `IsUrl`, `Min`, `Max`, `IsInt`, `Matches`, `IsUuid`, `IsDateString`, …) con firmas y ejemplos.

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

#### Filtrado por grupo con `@QGroup`

Decora los campos con `@QGroup('nombre')` para asignarlos a un grupo con nombre. Luego pasa `{ group }` a `checkRules()` para evaluar solo ese subconjunto — ideal para formularios multi-paso.

```typescript
import { QRule, QGroup } from 'quickmodel';

@Quick()
class RegistroModel extends QModel<IRegistro> {
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	@QGroup('identidad')
	declare nombre: string;

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Email inválido')
	@QGroup('identidad')
	declare email: string;

	@QRule((val: string) => val.length >= 8, 'Contraseña demasiado corta')
	@QGroup('seguridad')
	declare password: string;
}

const model = new RegistroModel({
	nombre: 'A',
	email: 'a@b.com',
	password: 'Secret1!',
});

// Todas las reglas:
model.checkRules();
// { valid: false, errors: [{ field: 'nombre', message: 'Nombre demasiado corto', ... }] }

// Solo el grupo 'identidad' (p.ej. paso 1 de 2):
model.checkRules({ group: 'identidad' });
// { valid: false, errors: [{ field: 'nombre', ... }] }

// Solo el grupo 'seguridad':
model.checkRules({ group: 'seguridad' });
// { valid: true, errors: [] }
```

Usa `qGroups()` desde la subruta `/forms` para obtener **constantes de nombre de grupo tipadas** con autocompletado:

```typescript
import { qGroups } from 'quickmodel/forms';

const Groups = qGroups('identidad', 'seguridad');
// Groups.identidad === 'identidad'  (totalmente tipado — sin errores tipográficos)

model.checkRules({ group: Groups.identidad });
```

> [!NOTE]
> Sin filtro de grupo, `checkRules()` evalúa **todos** los campos con `@QRule`, incluidos los no agrupados. Con filtro, solo se evalúan los campos que llevan `@QGroup(nombre)` coincidente.

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
	informe.integrity.forEach((err) => console.error(err.error));
	// Fallos de @QRule:
	informe.rules.errors.forEach((err) =>
		console.error(err.field, err.message)
	);
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
	@QRule(
		(val) => (val as string).length >= 3,
		() => t('validation.nombre.min')
	)
	declare nombre: string;
}
```

Si el usuario cambia de idioma en runtime, la próxima llamada a `checkRules()` reflejará el nuevo idioma.

### Angular: keys + pipe `| translate`

También puedes guardar claves i18n como mensaje estático y resolverlas en el template — sin necesidad de función lazy:

```typescript
@QRule((val) => (val as string).length >= 3, 'validation.nombre.min')
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

`@QRule` y `checkRules()` funcionan a la perfección junto con `isDirty()`, `copy()` y `patch()`.

```typescript
const user = new Usuario({
	nombre: 'Alice',
	edad: 30,
	email: 'alice@example.com',
});

const updated = user.copy({ edad: -5 });
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
		(val: string) => val.startsWith('ADMIN_'),
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
import { QField } from 'quickmodel';

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
	async (val) => !(await bd.emailExiste(val as string)),
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

> [!WARNING]
> **Reglas mixtas: `checkRules()` no puede evaluar predicados async**
>
> Si un campo tiene tanto reglas síncronas como asíncronas, `checkRules()` **ignora los predicados que devuelven `Promise`** — los trata siempre como que pasan. Para alertarte de esto, **emite un `console.warn` por cada campo afectado** (deduplicado: solo una vez por clase y campo por sesión).
>
> ```typescript
> class FormularioRegistro {
> 	@QRule((val: string) => val.length >= 3, 'Demasiado corto') // sync
> 	@QRule(
> 		async (val: string) => !(await bd.usernameExiste(val)),
> 		'Nombre ya registrado' // async — ignorado por checkRules()
> 	)
> 	username = '';
> }
>
> const form = new FormularioRegistro();
> form.username = 'taken_user'; // ≥ 3 chars → sync pasa, async debería fallar
>
> form.checkRules().valid;
> // ⚠️  Consola: [QuickModel] WARN: qCheckRules() skipped an async predicate
> //              on "FormularioRegistro#username". Use checkRulesAsync() ...
> // ⚠️  Devuelve true — el fallo async NO se detecta
>
> await form.checkRulesAsync().then((r) => r.valid);
> // ✅  false — detectado correctamente, sin warning
> ```
>
> El warning aparece **solo la primera vez** que se llama a `checkRules()` para esa combinación clase+campo — no inunda la consola en invocaciones repetidas.
>
> **Resumen:**
>
> | Método              | Reglas sync  | Reglas async                      |
> | ------------------- | ------------ | --------------------------------- |
> | `checkRules()`      | ✅ evaluadas | ⚠️ **ignoradas** + `console.warn` |
> | `checkRulesAsync()` | ✅ evaluadas | ✅ evaluadas                      |
>
> Usa `checkRulesAsync()` siempre que tengas aunque sea **una sola regla async** en el modelo.

#### Modo de ejecución

Por defecto todos los predicados se ejecutan **en paralelo** (`mode: 'parallel'`), así el tiempo total ≈ el predicado más lento. Usa `mode: 'serial'` cuando los predicados deban ejecutarse uno tras otro (p. ej. comprobar formato antes de consultar la base de datos):

```typescript
// Paralelo (por defecto) — todos los predicados arran simultáneamente
const resultado = await usuario.checkRulesAsync();

// Serie — los predicados se ejecutan en orden de declaración
const resultado = await usuario.checkRulesAsync({ mode: 'serial' });
```

| Modo                         | Tiempo total                | Cuándo usarlo                        |
| ---------------------------- | --------------------------- | ------------------------------------ |
| `'parallel'` _(por defecto)_ | `max(tiempos individuales)` | Llamadas I/O independientes          |
| `'serial'`                   | `Σ(tiempos individuales)`   | Efectos secundarios u orden estricto |

#### Timeout por predicado

Pasa `timeoutMs` para darle a cada predicado un presupuesto máximo. Los que lo superen fallan con `timedOut: true` en la entrada de error. Opcionalmente puedes indicar un `timeoutMessage` personalizado:

```typescript
const resultado = await usuario.checkRulesAsync({
	timeoutMs: 200,
	timeoutMessage: 'Servicio no disponible', // o () => i18n.t('errores.timeout')
});

resultado.errors.forEach((err) => {
	if (err.timedOut) {
		console.warn(`${err.field}: predicado superó los 200 ms`);
	}
});
```

Las opciones se pueden combinar libremente:

```typescript
// Ejecución en serie con presupuesto de 300 ms por predicado
const resultado = await usuario.checkRulesAsync({
	mode: 'serial',
	timeoutMs: 300,
});
```

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
	reporte.integrity.forEach((err) => console.error(err.error));
	reporte.rules.errors.forEach((err) =>
		console.error(err.field, err.message)
	);
}
```

### Resumen API async

| Método                            | Devuelve                      | Notas                               |
| --------------------------------- | ----------------------------- | ----------------------------------- |
| `checkRulesAsync(options?)`       | `Promise<IQRulesResult>`      | Espera predicados síncronos y async |
| `isValidAsync(options?)`          | `Promise<boolean>`            | Integridad + reglas async           |
| `validationReportAsync(options?)` | `Promise<IQValidationReport>` | Reporte completo, compatible async  |

**`options` (`IQRulesAsyncOptions`)**

| Opción           | Tipo                     | Por defecto         | Descripción                                                |
| ---------------- | ------------------------ | ------------------- | ---------------------------------------------------------- |
| `mode`           | `'parallel' \| 'serial'` | `'parallel'`        | Orden de ejecución de los predicados                       |
| `timeoutMs`      | `number`                 | —                   | Tiempo máx. por predicado; si se supera → `timedOut: true` |
| `timeoutMessage` | `string \| () => string` | mensaje de la regla | Mensaje usado cuando un predicado supera el timeout        |

## Validar sin `QModel` — la subruta `/forms`

Todos los helpers de esta página (`checkRules`, `checkRulesAsync`, filtrado por grupo…) están disponibles también como **funciones standalone** que funcionan en cualquier clase plana — sin necesidad de extender `QModel`. Impórtalos desde la entrada `/forms`:

```typescript
import { QRule, QGroup } from 'quickmodel';
import {
	qGroups,
	qCheckRules,
	qCheckRulesAsync,
	qCheckRulesByGroup,
	qCheckRulesByGroupAsync,
} from 'quickmodel/forms';

const Groups = qGroups('identidad', 'seguridad');

class FormularioPerfil {
	// ← clase plana, sin QModel
	@QRule((val: string) => val.length >= 2, 'Demasiado corto')
	@QGroup(Groups.identidad)
	nombre = '';
}

const form = new FormularioPerfil();
const result = qCheckRules(form, { group: Groups.identidad });
```

> 📖 **[Guía de Validación de Formularios](/es/guide/forms)** — Referencia completa: `qGroups`, `qGetGroups`, `qCheckRules`, `qCheckRulesAsync`, `qCheckRulesByGroup`, `qCheckRulesByGroupAsync`, ejemplos Angular/React/Vue.

## Trazas en evaluación de reglas

`@QRule` acepta un tercer argumento opcional — `options: IQRuleOptions` — que permite configurar el comportamiento de traza por regla de forma independiente a la configuración global y por modelo.

El orden de resolución es: **por regla > por modelo > global > silent**.

```typescript
import { QRule } from 'quickmodel';

class PagoModel extends QModel<{ importe: number; moneda: string }> {
	// Siempre muestra fallos aunque el trace global sea 'silent'
	@QRule<number>((val) => val > 0, 'El importe debe ser positivo', {
		trace: { verbosity: 'warn' },
	})
	declare importe: number;

	// Enruta solo los fallos de esta regla a un sink de seguridad
	@QRule<string>(
		(val) => /^[A-Z]{3}$/.test(val),
		'Código de moneda inválido',
		{
			trace: {
				verbosity: 'error',
				events: ['rule-fail', 'rule-error'],
				sink: (entry) => auditoriaSeg.escribir(entry),
			},
		}
	)
	declare moneda: string;
}
```

> 📖 **[Guía de Trazas y Observabilidad](/es/guide/tracing)** — Referencia completa para la configuración global, por modelo y por regla, estructura de `IQTraceEntry` y casos de uso reales.

## Rendimiento

<BenchmarkChart
  :only-scenarios="['validation', 'rules', 'asyncRules', 'validationReport']"
  :only-libs="['QuickModel', 'TypeBox', 'arktype', 'class-validator', 'vest', 'joi', 'yup', 'Zod', 'valibot']"
  :only-feature-categories="['validation']"
  default-tab="performance"
/>
