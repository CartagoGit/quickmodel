# Validación de Formularios (entrada `/forms`)

La subruta `quickmodel/forms` proporciona **helpers standalone de validación** que funcionan en **cualquier clase**—sin necesidad de extender `QModel`. Úsalos en componentes Angular, hooks React, composables Vue o plain TypeScript.

## ¿Por qué una entrada separada?

La entrada raíz (`quickmodel`) incluye todo el runtime: transformers, serialización, el generador de mocks, etc. Para apps que solo necesitan lógica de validación ligera, importar desde `/forms` mantiene el bundle más pequeño.

```ts
// ✅ recomendado para validación de formularios
import { qGroups, qCheckRules } from 'quickmodel/forms';

// también funciona, pero incluye todo el runtime
import { qGroups, qCheckRules } from 'quickmodel/forms';
```

## Requisitos

Los helpers dependen de `reflect-metadata`. Asegúrate de importarlo una vez en el punto de entrada de tu app:

```ts
import 'reflect-metadata';
```

Y que tu `tsconfig.json` tenga:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## `qGroups` — constantes de grupo tipadas

`qGroups` crea un **mapa tipado de nombres de grupo** para obtener autocompletado y soporte de refactoring en todo el código base. También evita errores tipográficos en los nombres de grupo.

### Forma spread (TS 3.4+)

```ts
import { qGroups } from 'quickmodel/forms';

const Groups = qGroups('identidad', 'seguridad', 'direccion');
// { identidad: 'identidad', seguridad: 'seguridad', direccion: 'direccion' }
```

### Forma array con `as const` (TS 3.4+)

```ts
const grupos = ['identidad', 'seguridad'] as const;
const Groups = qGroups(grupos);
```

### Forma array sin `as const` (solo TS 5.0+)

```ts
import { qGroups5 } from 'quickmodel/compat/ts5/forms';

const Groups = qGroups5(['identidad', 'seguridad']);
```

| Estilo                         | Versión TS | Notas                                        |
| ------------------------------ | ---------- | -------------------------------------------- |
| `qGroups('a', 'b')`            | 3.4+       | Spread — explícito, ideal para listas cortas |
| `qGroups(['a', 'b'] as const)` | 3.4+       | Array con `as const`                         |
| `qGroups5(['a', 'b'])`         | 5.0+       | Sin `as const` — usa parámetro `const T`     |

## Definir reglas de validación

Usa `@QRule` y `@QGroup` de la entrada raíz — funcionan en **cualquier clase**, no solo en subclases de `QModel`:

```ts
import { QRule, QGroup } from 'quickmodel';
import { qGroups } from 'quickmodel/forms';

const Groups = qGroups('identidad', 'seguridad');

class FormularioPerfil {
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	@QGroup(Groups.identidad)
	nombre = '';

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Email inválido')
	@QGroup(Groups.identidad)
	email = '';

	@QRule((val: string) => val.length >= 8, 'Contraseña demasiado corta')
	@QRule((val: string) => /[A-Z]/.test(val), 'Debe contener mayúscula')
	@QGroup(Groups.seguridad)
	password = '';

	// Campo sin grupo — tiene @QRule pero no @QGroup
	@QRule((val: string) => val.length > 0, 'Calle requerida')
	calle = '';
}
```

::: tip Múltiples reglas por campo
Apila tantos `@QRule` como necesites. **Se recogen todos los fallos**, no solo el primero.
:::

## `qGetGroups` — listar grupos declarados

Devuelve los nombres de `@QGroup` distintos declarados en una instancia, en orden de primera aparición.

```ts
import { qGetGroups } from 'quickmodel/forms';

const form = new FormularioPerfil();
const grupos = qGetGroups(form);
// ['identidad', 'seguridad']
```

- Devuelve solo los grupos que tienen al menos un campo con `@QRule`.
- Los campos sin grupo quedan excluidos.
- Devuelve `[]` si no hay decoradores `@QGroup`.

## `qCheckRules` — validación síncrona

Evalúa todos los predicados `@QRule` síncronos de cualquier instancia.

```ts
import { qCheckRules } from 'quickmodel/forms';

const form = new FormularioPerfil();
form.nombre = 'A';
form.email = 'noemail';
form.password = 'Secret1!';
form.calle = '42 Calle Mayor';

const result = qCheckRules(form);

result.valid; // false
result.errors;
// [
//   { field: 'nombre', message: 'Nombre demasiado corto', value: 'A' },
//   { field: 'email',  message: 'Email inválido',         value: 'noemail' },
// ]
```

### Filtrar por grupo

Pasa `{ group }` para evaluar solo los campos de ese grupo:

```ts
// Solo valida los campos de 'identidad'
const result = qCheckRules(form, { group: Groups.identidad });
```

- Los campos sin grupo quedan excluidos cuando se especifica filtro.
- Un grupo desconocido devuelve `{ valid: true, errors: [] }`.
- La comparación de grupo es **sensible a mayúsculas**.

::: warning Predicados async
`qCheckRules` es síncrono. Los predicados que devuelven `Promise` se **omiten silenciosamente** (se consideran pasados). Usa `qCheckRulesAsync` cuando haya reglas asíncronas.
:::

### Tipo de retorno

```ts
interface IQRulesResult {
	valid: boolean;
	errors: Array<{
		field: string; // nombre de la propiedad
		message: string; // mensaje resuelto
		value: unknown; // valor actual del campo
		timedOut?: true; // solo lo establece qCheckRulesAsync en timeout
	}>;
}
```

## `qCheckRulesAsync` — validación asíncrona

El equivalente async. Espera tanto predicados síncronos como asíncronos. Soporta timeout por predicado y modos de ejecución serie/paralelo.

```ts
import { qCheckRulesAsync } from 'quickmodel/forms';

const result = await qCheckRulesAsync(form);
result.valid; // false si alguna regla falla
```

### Filtro de grupo

```ts
const result = await qCheckRulesAsync(form, { group: Groups.identidad });
```

### Timeout por predicado

Cada predicado se confronta individualmente contra un temporizador. Los que se exceden fallan con `timedOut: true`:

```ts
const result = await qCheckRulesAsync(form, {
	timeoutMs: 500,
	timeoutMessage: 'Servicio no disponible', // o () => i18n.t('errors.timeout')
});

result.errors.forEach((err) => {
	if (err.timedOut) {
		console.warn(`${err.field}: timeout tras 500 ms`);
	}
});
```

### Modo de ejecución

Por defecto todos los predicados corren **en paralelo** (`mode: 'parallel'`). Pasa `mode: 'serial'` cuando los predicados deban ejecutarse secuencialmente (p.ej. verificar formato antes de consultar la base de datos):

```ts
// Serie — los predicados corren en orden de declaración
const result = await qCheckRulesAsync(form, { mode: 'serial' });
```

| Modo                         | Tiempo total                | Cuándo usarlo                        |
| ---------------------------- | --------------------------- | ------------------------------------ |
| `'parallel'` _(por defecto)_ | `max(tiempos individuales)` | Llamadas I/O independientes          |
| `'serial'`                   | `Σ(tiempos individuales)`   | Efectos secundarios u orden estricto |

### Combinando opciones

Todas las opciones se pueden combinar libremente:

```ts
// Serie dentro del grupo 'seguridad', con 300 ms por predicado
const result = await qCheckRulesAsync(form, {
	group: Groups.seguridad,
	mode: 'serial',
	timeoutMs: 300,
});
```

### `IQCheckRulesAsyncOptions`

| Opción           | Tipo                     | Por defecto         | Descripción                                       |
| ---------------- | ------------------------ | ------------------- | ------------------------------------------------- |
| `group`          | `string`                 | —                   | Evaluar solo este grupo                           |
| `mode`           | `'parallel' \| 'serial'` | `'parallel'`        | Orden de ejecución                                |
| `timeoutMs`      | `number`                 | —                   | Máx ms por predicado; excedido → `timedOut: true` |
| `timeoutMessage` | `string \| () => string` | mensaje de la regla | Mensaje usado en timeout                          |

## `qCheckRulesByGroup` — mapa síncrono por grupo

Valida todos los grupos y devuelve un `Record<nombreGrupo, IQRulesResult>`.

```ts
import { qCheckRulesByGroup } from 'quickmodel/forms';

const form = new FormularioPerfil();
form.nombre = 'Alice';
form.email = 'alice@example.com';
form.password = 'debil'; // seguridad falla
form.calle = ''; // sin grupo — excluido del mapa

const results = qCheckRulesByGroup(form);
// {
//   identidad: { valid: true,  errors: [] },
//   seguridad: { valid: false, errors: [{ field: 'password', ... }] },
// }

results[Groups.identidad].valid; // true
results[Groups.seguridad].valid; // false
```

- Solo aparecen campos agrupados. Los campos sin grupo quedan excluidos.
- El mapa tiene una clave por cada nombre `@QGroup` único.
- Devuelve `{}` si no hay decoradores `@QGroup`.

### Uso típico: validación de formulario por pasos

```ts
function puedeContinuar(paso: string): boolean {
	const results = qCheckRulesByGroup(form);
	return results[paso]?.valid ?? true;
}

puedeContinuar(Groups.identidad); // true / false
puedeContinuar(Groups.seguridad); // true / false
```

## `qCheckRulesByGroupAsync` — mapa asíncrono por grupo

El equivalente async de `qCheckRulesByGroup`. Todos los grupos se evalúan concurrentemente.

```ts
import { qCheckRulesByGroupAsync } from 'quickmodel/forms';

const results = await qCheckRulesByGroupAsync(form);
// { identidad: IQRulesResult, seguridad: IQRulesResult }
```

Acepta las mismas opciones async que `qCheckRulesAsync` (excepto `group`, que se aplica por grupo internamente):

```ts
const results = await qCheckRulesByGroupAsync(form, {
	timeoutMs: 500,
	mode: 'serial',
});
```

## Ejemplos de integración con frameworks

::: code-group

```ts [Angular]
import { Component } from '@angular/core';
import { QRule, QGroup } from 'quickmodel';
import {
	qGroups,
	qCheckRules,
	qCheckRulesByGroup,
	IQRulesResult,
} from 'quickmodel/forms';

const Groups = qGroups('identidad', 'seguridad');

class FormularioRegistro {
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	@QGroup(Groups.identidad)
	nombre = '';

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Email inválido')
	@QGroup(Groups.identidad)
	email = '';

	@QRule((val: string) => val.length >= 8, 'Contraseña demasiado corta')
	@QRule((val: string) => /[A-Z]/.test(val), 'Debe contener mayúscula')
	@QGroup(Groups.seguridad)
	password = '';
}

@Component({
	template: `
		<input [(ngModel)]="form.nombre" />
		<span *ngFor="let e of resultadoIdentidad.errors">{{ e.message }}</span>

		<button (click)="validarIdentidad()">Siguiente</button>
	`,
})
export class RegistroComponent {
	form = new FormularioRegistro();
	resultadoIdentidad: IQRulesResult = { valid: true, errors: [] };

	validarIdentidad(): void {
		this.resultadoIdentidad = qCheckRules(this.form, {
			group: Groups.identidad,
		});
		if (this.resultadoIdentidad.valid) {
			// pasar al siguiente paso
		}
	}
}
```

```tsx [React Hook]
import { useState, useCallback } from 'react';
import { QRule, QGroup } from 'quickmodel';
import { qGroups, qCheckRules, IQRulesResult } from 'quickmodel/forms';

const Groups = qGroups('campos');

class FormularioContacto {
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	@QGroup(Groups.campos)
	nombre = '';

	@QRule((val: string) => val.includes('@'), 'Email inválido')
	@QGroup(Groups.campos)
	email = '';
}

function useFormularioContacto() {
	const [form] = useState(() => new FormularioContacto());
	const [resultado, setResultado] = useState<IQRulesResult>({
		valid: true,
		errors: [],
	});

	const validar = useCallback(() => {
		const res = qCheckRules(form);
		setResultado(res);
		return res.valid;
	}, [form]);

	return { form, resultado, validar };
}
```

```ts [Vue Composable]
import { reactive, ref } from 'vue';
import { QRule, QGroup } from 'quickmodel';
import { qGroups, qCheckRulesAsync, IQRulesResult } from 'quickmodel/forms';

const Groups = qGroups('campos');

class FormularioLogin {
	@QRule((val: string) => val.length >= 2, 'Usuario demasiado corto')
	@QGroup(Groups.campos)
	usuario = '';

	@QRule((val: string) => val.length >= 6, 'Contraseña demasiado corta')
	@QGroup(Groups.campos)
	password = '';
}

export function useFormularioLogin() {
	const form = reactive(new FormularioLogin());
	const resultado = ref<IQRulesResult>({ valid: true, errors: [] });

	async function validar() {
		resultado.value = await qCheckRulesAsync(form, { timeoutMs: 500 });
		return resultado.value.valid;
	}

	return { form, resultado, validar };
}
```

:::

## Herencia

Las reglas `@QRule` se **heredan**: una subclase también ejecutará las reglas definidas en las propiedades de su clase padre.

```ts
class FormularioBase {
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	@QGroup('identidad')
	nombre = '';
}

class FormularioExtendido extends FormularioBase {
	@QRule((val: number) => val >= 18, 'Debe ser mayor de edad')
	@QGroup('identidad')
	edad = 0;
}

const form = new FormularioExtendido();
form.nombre = 'A'; // falla la regla del padre
form.edad = 15; // falla la regla de la subclase

const result = qCheckRules(form);
// { valid: false, errors: [{ field: 'nombre', ... }, { field: 'edad', ... }] }
```

> [!WARNING]
> Si una subclase re-declara una propiedad con `@QRule`, solo aplican las reglas de la **subclase** para ese campo (las del padre quedan sobreescritas). Los campos no re-declarados conservan las reglas del padre.

## Resumen de la API

| Helper                                          | Retorna                                  | Async |
| ----------------------------------------------- | ---------------------------------------- | ----- |
| `qGroups(...nombres)`                           | `IQGroupsMap`                            | No    |
| `qGroups5([...nombres])`                        | `IQGroupsMap`                            | No    |
| `qGetGroups(instancia)`                         | `string[]`                               | No    |
| `qCheckRules(instancia, opciones?)`             | `IQRulesResult`                          | No    |
| `qCheckRulesAsync(instancia, opciones?)`        | `Promise<IQRulesResult>`                 | Sí    |
| `qCheckRulesByGroup(instancia)`                 | `Record<string, IQRulesResult>`          | No    |
| `qCheckRulesByGroupAsync(instancia, opciones?)` | `Promise<Record<string, IQRulesResult>>` | Sí    |

## Compatibilidad con TypeScript

| Entrada                       | TS mínimo | Notas                                                  |
| ----------------------------- | --------- | ------------------------------------------------------ |
| `quickmodel/forms`            | 3.4       | Entrada principal — todos los helpers salvo `qGroups5` |
| `quickmodel/compat/ts5/forms` | 5.0       | Añade `qGroups5` (sin necesidad de `as const`)         |

## Rendimiento

<BenchmarkChart
  :only-scenarios="['rules', 'asyncRules', 'validationReport']"
  :only-libs="['QuickModel', 'class-validator', 'vest', 'joi', 'yup']"
  default-tab="performance"
/>
