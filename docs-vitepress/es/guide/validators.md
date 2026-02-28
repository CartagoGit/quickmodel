# Validadores Integrados

QuickModel incluye **14 decoradores validadores listos para usar** que ofrecen una API familiar al estilo de `class-validator`, implementados como wrappers delgados sobre `@QRule`. Sin dependencias adicionales: utilizan el mismo motor de reglas que impulsa toda la validación de QuickModel.

## Importación

```typescript
// Entry principal (todos los validadores junto al resto de QuickModel)
import { IsEmail, Min, IsNotEmpty } from 'quickmodel';

// Subpath tree-shakeable (incluye SOLO los validadores que importas)
import { IsEmail } from 'quickmodel/validators';
```

## Validadores de cadena

### `@IsEmail()`

Valida que el valor es una dirección de email sintácticamente correcta.

```typescript
@IsEmail()
declare email: string;
```

### `@IsUrl()`

Valida que el valor es una URL válida (debe empezar por `http://` o `https://`).

```typescript
@IsUrl()
declare sitioWeb: string;
```

### `@IsNotEmpty()`

Valida que la cadena no está vacía ni contiene solo espacios en blanco.

```typescript
@IsNotEmpty()
declare nombre: string;
```

### `@MinLength(n: number)`

Valida que la cadena tiene al menos `n` caracteres.

```typescript
@MinLength(3)
declare usuario: string;
```

### `@MaxLength(n: number)`

Valida que la cadena tiene como máximo `n` caracteres.

```typescript
@MaxLength(50)
declare bio: string;
```

### `@Matches(regex: RegExp)`

Valida que la cadena coincide con la expresión regular indicada.

```typescript
@Matches(/^[a-z0-9_]+$/)
declare handle: string;
```

### `@IsUuid()`

Valida que el valor es un UUID v4 válido.

```typescript
@IsUuid()
declare id: string;
```

### `@IsDateString()`

Valida que el valor es una cadena de fecha ISO 8601 válida.

```typescript
@IsDateString()
declare fechaNacimiento: string;
// "2024-01-15T12:00:00Z" ✅   "no-es-fecha" ❌
```

## Validadores numéricos

### `@Min(n: number)`

Valida que el número es mayor o igual a `n`.

```typescript
@Min(0)
declare edad: number;
```

### `@Max(n: number)`

Valida que el número es menor o igual a `n`.

```typescript
@Max(120)
declare edad: number;
```

### `@IsInt()`

Valida que el valor es un entero (sin parte decimal).

```typescript
@IsInt()
declare cantidad: number;
// 3 ✅   3.14 ❌
```

### `@IsPositive()`

Valida que el valor es mayor que 0.

```typescript
@IsPositive()
declare precio: number;
```

### `@IsNegative()`

Valida que el valor es menor que 0.

```typescript
@IsNegative()
declare penalizacion: number;
```

## Validador de enumeración

### `@IsIn(values: unknown[])`

Valida que el valor es uno de los valores permitidos.

```typescript
@IsIn(['admin', 'editor', 'viewer'])
declare rol: string;
```

## Ejemplo completo

```typescript
import {
	Quick,
	QModel,
	IsEmail,
	IsNotEmpty,
	MinLength,
	MaxLength,
	Min,
	Max,
	IsInt,
	IsPositive,
	IsIn,
} from 'quickmodel';

interface IUsuario {
	nombre: string;
	email: string;
	edad: number;
	rol: string;
}

@Quick()
class Usuario extends QModel<IUsuario> {
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(80)
	declare nombre: string;

	@IsEmail()
	declare email: string;

	@Min(18)
	@Max(120)
	@IsInt()
	declare edad: number;

	@IsIn(['admin', 'editor', 'viewer'])
	declare rol: string;
}

const user = new Usuario({
	nombre: 'A',
	email: 'malo',
	edad: 17.5,
	rol: 'hacker',
});
const { valid, errors } = user.checkRules();
// valid: false
// errors: [
//   { field: 'nombre', message: 'Debe tener al menos 2 caracteres' },
//   { field: 'email',  message: 'Debe ser un email válido' },
//   { field: 'edad',   message: 'Debe ser al menos 18' },
//   { field: 'edad',   message: 'Debe ser un entero' },
//   { field: 'rol',    message: 'Debe ser uno de los valores permitidos' },
// ]
```

## Apilado de validadores

Todos los validadores integrados se pueden apilar en la misma propiedad. Cada regla que falle se recoge de forma independiente.

```typescript
@Min(0)
@Max(150)
@IsInt()
@IsPositive()
declare puntuacion: number;
```

## Uso sin `QModel`

Los validadores integrados funcionan sobre cualquier clase plana, sin necesidad de extender `QModel`. Combínalos con `qCheckRules` del subpath `/forms`:

```typescript
import { IsEmail, MinLength } from 'quickmodel/validators';
import { qCheckRules } from 'quickmodel/forms';

class FormularioContacto {
	@IsEmail()
	email = '';

	@MinLength(10)
	mensaje = '';
}

const form = new FormularioContacto();
form.email = 'hola@mundo.com';
form.mensaje = 'Hi';

const result = qCheckRules(form);
// { valid: false, errors: [{ field: 'mensaje', ... }] }
```

## Decoradores TC39

En modo TC39 (`experimentalDecorators` ausente o `false`), usa `!` en lugar de `declare`:

```typescript
@Quick()
class Usuario extends QModel<IUsuario> {
	@IsEmail()
	email!: string; // ← TC39: usa !

	@Min(18)
	edad!: number;
}
```

## Todos los validadores de un vistazo

| Decorador         | Valida                                     |
| :---------------- | :----------------------------------------- |
| `@IsEmail()`      | Dirección de email válida                  |
| `@IsUrl()`        | URL que empieza por `http://` o `https://` |
| `@IsNotEmpty()`   | Cadena no vacía ni solo espacios           |
| `@MinLength(n)`   | Longitud de cadena ≥ `n`                   |
| `@MaxLength(n)`   | Longitud de cadena ≤ `n`                   |
| `@Matches(regex)` | Cadena coincide con la RegExp indicada     |
| `@IsUuid()`       | UUID v4 válido                             |
| `@IsDateString()` | Cadena de fecha ISO 8601 válida            |
| `@Min(n)`         | Número ≥ `n`                               |
| `@Max(n)`         | Número ≤ `n`                               |
| `@IsInt()`        | Entero (sin parte decimal)                 |
| `@IsPositive()`   | Número > 0                                 |
| `@IsNegative()`   | Número < 0                                 |
| `@IsIn(values[])` | Valor entre los permitidos                 |

> Todos los validadores son wrappers sobre `@QRule`. Puedes combinarlos libremente con predicados `@QRule` personalizados en la misma propiedad.

## Ver también

- **[Validación con @QRule](./validation.md)** — Reglas personalizadas, apilado, async, grupos
- **[Guía de Formularios](./forms.md)** — Validación por grupos y form schema
- **[Transformadores](./transformers.md)** — Coerción de tipos, incluyendo `special-float` (NaN / Infinity)

## Rendimiento

<BenchmarkChart
  :only-scenarios="['validation', 'validationReport']"
  :only-libs="['QuickModel', 'TypeBox', 'arktype', 'class-validator', 'vest', 'joi', 'yup', 'Zod', 'valibot']"
  :only-feature-categories="['validation']"
  default-tab="performance"
/>
