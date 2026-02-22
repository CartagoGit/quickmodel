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
	@QRule((v: string) => v.length >= 3, 'El nombre debe tener al menos 3 caracteres')
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
const user = new Usuario({ nombre: 'Alice', edad: 30, email: 'alice@example.com' });
const result = user.checkRules();
// { valid: true, errors: [] }
```

## Referencia API

### `@QRule(fn, message)`

| Parámetro | Tipo                          | Descripción                                                                                             |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `fn`      | `(value: unknown) => boolean` | Función de validación. Debe devolver `true` para que la regla pase.                                     |
| `message` | `string \| (() => string)`    | Mensaje estático, clave i18n, o función lazy evaluada en el momento de llamar a `checkRules()`. |

Se puede apilar — cada decorador aplica una sola regla.

### `checkRules()`

Ejecuta todas las reglas `@QRule` declaradas en las propiedades del modelo.

**Devuelve:** `IQRulesResult`

```typescript
interface IQRulesResult {
	valid: boolean;
	errors: Array<{
		field: string;   // nombre de la propiedad
		message: string; // mensaje resuelto (string o valor retornado por () => string)
		value: unknown;  // valor actual del campo en el momento de la validación
	}>;
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
<span *ngFor="let e of result.errors">
  {{ e.message | translate }}
</span>
```

Ambos enfoques son válidos; elige el que mejor se adapte a tu arquitectura.

> [!NOTE]
> `checkRules()` es independiente de `checkIntegrity()`. `checkIntegrity()` comprueba restricciones de tipo a nivel de transformer (límites DoS, rangos de tipo). `checkRules()` es para tu lógica de negocio.

## Combinando con seguimiento de cambios

`@QRule` y `checkRules()` funcionan a la perfección junto con `isDirty()`, `merge()` y `patch()`.

```typescript
const user = new Usuario({ nombre: 'Alice', edad: 30, email: 'alice@example.com' });

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
````
