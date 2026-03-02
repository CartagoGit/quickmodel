# Proposal: Reactivity & Observable State — `$qSubscribe` + `QModelSignal`

**Estado:** Borrador — en desarrollo  
**Fecha:** 2026-03-02  
**Autor:** GitHub Copilot  
**Prioridad:** Alta  
**Esfuerzo estimado:** 3–4 horas

---

## 1. Problema

QuickModel actualmente gestiona transformación de tipos, validación, serialización, historial de cambios (`$qIsDirty`, `$qGetChangedFields`) y muchas otras cosas. Sin embargo, **no hay mecanismo para que el código externo sea notificado cuando una propiedad del modelo cambia**.

Esto obliga a los consumidores a:

- **Hacer polling** — comprobar `$qIsDirty()` cada X tiempo: ineficiente, imperativo, anti-patrón.
- **Depender de frameworks externos para la reactividad** — envolver el modelo en `reactive()` de Vue, o en un `signal()` de Angular, con los problemas de que `this` apunta al Proxy y los métodos internos de QuickModel fallan (documentado en `vue-integration.md`: hay que usar `toRaw()`).
- **No tener reactividad en absoluto** — en entornos sin framework (Node.js, tests, CLI), no hay ninguna forma de observar cambios sin reimplementar lógica ad-hoc.

El resultado es que QuickModel produce modelos ricos en comportamiento pero **ciegos** desde el punto de vista reactivo. Cualquier formulario, store, o componente que necesite reaccionar a cambios en el modelo tiene que construir su propio mecanismo.

---

## 2. Solución propuesta

### 2.1 Observer nativo: `$qSubscribe` / `$qUnsubscribe`

Añadir a `QModel` dos métodos públicos que implementan el patrón **observer** puro, sin ninguna dependencia externa:

```typescript
// Suscribirse a cualquier cambio en cualquier campo del modelo
const unsubscribe = model.$qSubscribe((change) => {
	console.log(change.field); // nombre del campo modificado
	console.log(change.prev); // valor anterior (ya transformado)
	console.log(change.next); // valor nuevo (ya transformado)
});

// Cancelar la suscripción
unsubscribe();
// o equivalentemente:
model.$qUnsubscribe(callback);
```

El callback recibe un objeto `IQChange<T>` tipado:

```typescript
interface IQChange<T = unknown> {
	/** Nombre del campo que cambió */
	field: string;
	/** Valor anterior después de la transformación de tipos */
	prev: T;
	/** Valor nuevo después de la transformación de tipos */
	next: T;
	/** Snapshot completo del modelo en el momento del cambio */
	snapshot: Record<string, unknown>;
}
```

### 2.2 Signal built-in: `$qSignal`

Además del observer, el modelo expone un **mini-signal** sin dependencias externas que sigue el contrato mínimo que necesita cualquier framework para bridgear con su propio sistema reactivo:

```typescript
interface IQModelSignal<T> {
	/** Devuelve el valor actual sin registrar ningún tracking */
	peek(): T;

	/** Número de versión — incrementa en cada cambio. Frameworks lo usan para invalidar computed() */
	readonly version: number;

	/** Registra un listener. Devuelve la función de cancelación (misma API que $qSubscribe) */
	subscribe(fn: (change: IQChange) => void): () => void;
}
```

Acceso desde el modelo:

```typescript
const sig = model.$qSignal;

// Leer estado actual
const currentState = sig.peek();

// Saber cuántas veces ha cambiado
const ver = sig.version;

// Suscribirse a cambios
const unsub = sig.subscribe((change) => { ... });
```

---

## 3. Por qué esta aproximación y no otras

### Por qué NO RxJS / BehaviorSubject

- Añade **~12kb** minificados al bundle.
- Introduce el paradigma de programación funcional reactiva para algo que se puede resolver con 30 líneas de JS.
- Crea una dependencia de `rxjs` en `package.json` de QuickModel — todos los consumidores la arrastran aunque no usen reactividad.
- Los usuarios que SÍ quieren RxJS pueden hacer su propio adapter en 3 líneas sobre `$qSubscribe`.

### Por qué NO `EventTarget` / `EventEmitter`

- `EventTarget` es DOM-only (no funciona en Node.js sin polyfill).
- `EventEmitter` de Node.js no está disponible en browser.
- Ambos tienen una API más verbosa y con strings como nombres de evento (no tipados).

### Por qué NO `Proxy` automático

- Envolver el constructor en un `Proxy` rompería la instancia: `instanceof` fallaría, los métodos internos de QuickModel al hacer `this.someMethod()` tendrían `this` apuntando al Proxy, y los tests de Vue ya documentan este problema.
- Requeriría un factory estático (`QModel.reactive(model)`) en lugar de funcionar automáticamente en constructores normales.

### Por qué SÍ observer nativo

- **Coste cero** para instancias sin suscriptores: el `Set<IQObserver>` se inicializa de forma **lazy** solo cuando alguien llama a `$qSubscribe`. Si nadie se suscribe, la instancia es idéntica a hoy.
- **Sin dependencias externas**: puro ES6 `Set` y funciones.
- **Un único punto de integración**: el setter smart ya centralizado en `installLazyGetters()`. Todos los cambios de propiedades ya pasan por ahí obligatoriamente — agregar la notificación al final es trivial.
- **Compatible con cualquier framework**: el contrato `subscribe(fn) → unsubscribe` es el que React, Vue, Angular, Solid y Svelte esperan de cualquier store externo.

---

## 4. Arquitectura interna

### 4.1 Dónde vive el estado de observadores

```
instancia de QModel
├── __quickValues__       ← backing store existente (propiedades serializables)
├── __initData__          ← snapshot inicial para dirty-tracking existente
├── __quickObservers__    ← Set<IQObserverFn> (NUEVO, lazy-initialized)
└── __quickSignalVersion__← number (NUEVO, conteo de cambios)
```

Ambas propiedades nuevas se inicializan `undefined` por defecto y se crean solo al primer `$qSubscribe`, igual que `__initData__` se crea solo cuando se detecta el primer cambio sucio.

### 4.2 Hook en el setter smart

El setter actualmente termina en dos puntos:

```typescript
// Rama 1: transformación exitosa
this[storageKey] = transformed;
return; // ← AQUÍ se añade la notificación

// Rama 2: fallback sin transformación
this[storageKey] = value; // ← AQUÍ también
```

Después de cada asignación al `storageKey`, se añade:

```typescript
// Notificar observadores si los hay (lazy — no cost if no observers)
_notifyObservers(this, key, prevValue, this[storageKey] as unknown);
```

La función `_notifyObservers` vive a nivel de módulo (como `_resolveHistoryHandle` ya existente) y es así:

```typescript
function _notifyObservers(
	instance: QModel<any>,
	field: string,
	prev: unknown,
	next: unknown
): void {
	// Fast path: sin observadores, cero overhead
	const observers = (instance as any).__quickObservers__ as
		| Set<IQObserverFn>
		| undefined;
	if (!observers || observers.size === 0) return;

	const change: IQChange = {
		field,
		prev,
		next,
		snapshot: (instance as any).$qSerialize(),
	};

	for (const fn of observers) {
		try {
			fn(change);
		} catch {
			// Un observer que falla no debe romper el flujo del setter
		}
	}
}
```

### 4.3 El tipo `IQChange`

Fichero nuevo: `src/core/types/observer.type.ts`

```typescript
/**
 * Payload emitido a cada observer cuando una propiedad del modelo cambia.
 */
export interface IQChange<T = unknown> {
	/** Nombre del campo que cambió */
	field: string;
	/** Valor anterior (ya transformado por el tipo registrado en @Quick) */
	prev: T;
	/** Valor nuevo (ya transformado por el tipo registrado en @Quick) */
	next: T;
	/**
	 * Snapshot serializado del modelo completo en el instante del cambio.
	 * Equivalente a llamar $qSerialize() justo después de la asignación.
	 */
	snapshot: Record<string, unknown>;
}

/** Función callback que recibe cada cambio */
export type IQObserverFn<T = unknown> = (change: IQChange<T>) => void;
```

### 4.4 `QModelSignal` — el objeto signal reutilizable

Fichero nuevo: `src/core/models/q-model-signal.ts`

```typescript
export class QModelSignal<T extends QModel<any>> {
	private _version = 0;

	constructor(private readonly _model: T) {}

	/** Valor actual sin tracking — seguro para llamar desde cualquier contexto */
	peek(): T {
		return this._model;
	}

	/** Versión actual — incrementa en cada cambio de cualquier campo */
	get version(): number {
		return this._version;
	}

	/**
	 * Registra un observer. Devuelve la función de cancelación.
	 * API compatible con React useSyncExternalStore, Vue watchEffect, etc.
	 */
	subscribe(fn: IQObserverFn): () => void {
		// Incrementar versión en cada cambio (para frameworks que trackean versiones)
		const wrapped: IQObserverFn = (change) => {
			this._version++;
			fn(change);
		};
		return this._model.$qSubscribe(wrapped);
	}
}
```

---

## 5. API pública en `QModel`

### Métodos nuevos

```typescript
class QModel<I> {
	/**
	 * Registra un callback que se invocará cada vez que cualquier propiedad del modelo
	 * cambie a través del setter (asignación directa o $qCopy/$qPatch).
	 *
	 * @returns función de cancelación — llámala para deregistrar el callback
	 *
	 * @example
	 * const user = new UserModel({ name: 'Alice', age: 30 });
	 * const unsub = user.$qSubscribe(({ field, prev, next }) => {
	 *   console.log(`${field}: ${String(prev)} → ${String(next)}`);
	 * });
	 * user.name = 'Bob';   // → logs: "name: Alice → Bob"
	 * unsub();             // → deja de recibir notificaciones
	 */
	$qSubscribe(fn: IQObserverFn): () => void;

	/**
	 * Elimina un callback previamente registrado con $qSubscribe.
	 * No-op si el callback no está registrado.
	 */
	$qUnsubscribe(fn: IQObserverFn): void;

	/**
	 * Signal built-in del modelo. Permite bridgear con sistemas reactivos externos
	 * (Angular signals, Vue computed, React useSyncExternalStore, Solid stores)
	 * usando el contrato mínimo: subscribe(fn) + peek() + version.
	 */
	get $qSignal(): QModelSignal<this>;
}
```

### Comportamiento en `$qReset()` y `$qCopy()`

- **`$qReset()`**: Las propiedades se restauran una a una, lo cual ya pasa por los setters → cada campo restaurado dispara su notificación individual. Si se prefiere una sola notificación "bulk", se puede añadir un flag interno `__suppressObservers__` durante el reset y emitir un evento sintético `{ field: '*', prev: snapshot, next: newSnapshot }` al final.
- **`$qCopy(partial)`**: Devuelve una **nueva instancia** — los observadores del modelo original NO se copian a la nueva instancia (correcto: son subscripciones al objeto específico, no a la clase).

---

## 6. Bridges con frameworks — sin dependencias en QuickModel

La clave es que QuickModel solo necesita `$qSubscribe(fn) → unsub`. El usuario (o un sub-paquete opcional) escribe el adapter de 3–6 líneas para su framework.

### React

```typescript
// hooks/use-q-model.ts — en el proyecto del usuario
import { useSyncExternalStore } from 'react';
import type { QModel } from 'quickmodel';

export function useQModel<T extends QModel<any>>(model: T) {
	return useSyncExternalStore(
		(notify) => model.$qSubscribe(notify as any),
		() => model.$qSerialize()
	);
}
```

`useSyncExternalStore` es parte de React 18+ core. Solo necesita:

- `subscribe(onStoreChange): unsubscribe` → `$qSubscribe`
- `getSnapshot(): serializable` → `$qSerialize()`

### Vue 3

```typescript
// composables/use-q-model.ts — en el proyecto del usuario
import { customRef } from 'vue';
import type { QModel } from 'quickmodel';

export function useQModel<T extends QModel<any>>(model: T) {
	return customRef<T>((track, trigger) => ({
		get() {
			track();
			return model;
		},
		set() {}, // readonly — mutations go through model directly
	})).also(() => {
		model.$qSubscribe(trigger as any);
	});
}

// Alternativa más simple: shallowRef + $qSubscribe
export function useQModelRef<T extends QModel<any>>(model: T) {
	const ref = shallowRef(model);
	model.$qSubscribe(() => {
		ref.value = model; /* misma ref, Vue no re-renderiza */
	});
	// Para forzar re-render con misma referencia, usar triggerRef:
	model.$qSubscribe(() => triggerRef(ref));
	return readonly(ref);
}
```

### Angular 17+

```typescript
// utils/qmodel-to-signal.ts — en el proyecto del usuario
import { signal } from '@angular/core';
import type { QModel } from 'quickmodel';

export function qModelToSignal<T extends QModel<any>>(model: T) {
	const sig = signal(model);
	// Cada cambio en el modelo actualiza el signal de Angular
	// Angular detecta el cambio porque sig.set() incrementa la versión interna del signal
	model.$qSubscribe(() => sig.set(model));
	return sig.asReadonly();
}
```

### Solid.js

```typescript
// utils/use-q-model.ts — en el proyecto del usuario
import { createSignal } from 'solid-js';
import type { QModel } from 'quickmodel';

export function useQModel<T extends QModel<any>>(model: T) {
	const [version, setVersion] = createSignal(0);
	model.$qSubscribe(() => setVersion((v) => v + 1));
	// version() actúa como trigger — los efectos que lo lean se re-ejecutan
	return { model, version };
}
```

### Svelte 5

```typescript
// stores/q-model-store.ts — en el proyecto del usuario
import { writable } from 'svelte/store';
import type { QModel } from 'quickmodel';

export function qModelStore<T extends QModel<any>>(model: T) {
	const { subscribe, set } = writable(model);
	model.$qSubscribe(() => set(model));
	return { subscribe }; // read-only store
}
```

---

## 7. Estructura de ficheros nuevos

```
src/
├── core/
│   ├── types/
│   │   └── observer.type.ts          ← IQChange, IQObserverFn (NUEVO)
│   └── models/
│       ├── q-model-signal.ts         ← QModelSignal<T> (NUEVO)
│       └── quick.model.ts            ← modificado: $qSubscribe, $qUnsubscribe, $qSignal getter, hook en setter
tests/
└── unit/
    └── core/
        ├── observer.test.ts          ← tests de $qSubscribe/$qUnsubscribe (NUEVO)
        └── q-model-signal.test.ts    ← tests de QModelSignal (NUEVO)
```

---

## 8. Plan de implementación (TDD)

### Fase 1: Tipos

1. Crear `src/core/types/observer.type.ts` con `IQChange` y `IQObserverFn`.

### Fase 2: Tests primero (Red)

2. Crear `tests/unit/core/observer.test.ts`:
    - `$qSubscribe` llama al callback cuando cambia un campo.
    - `$qSubscribe` recibe `field`, `prev`, `next` correctos.
    - `$qSubscribe` recibe `snapshot` con el estado completo después del cambio.
    - El unsubscribe devuelto evita recibir más notificaciones.
    - `$qUnsubscribe` con la función directa también cancela.
    - Múltiples subscriptores reciben todos la notificación.
    - Un observer que lanza una excepción no rompe los demás observers.
    - Instancias sin observers tienen coste cero (no se crea `__quickObservers__`).
    - La transformación de tipos ocurre ANTES de notificar (observer recibe el tipo correcto).
    - `$qCopy()` NO copia los observers a la nueva instancia.
    - `$qReset()` notifica por cada campo restaurado.

3. Crear `tests/unit/core/q-model-signal.test.ts`:
    - `$qSignal.peek()` devuelve el modelo.
    - `$qSignal.version` incrementa en cada cambio.
    - `$qSignal.subscribe(fn)` delega a `$qSubscribe`.
    - El unsubscribe de `$qSignal.subscribe` funciona correctamente.
    - `$qSignal` es la misma instancia en accesos repetidos (no se crea nueva cada vez).

### Fase 3: Implementación (Green)

4. Añadir `$qSubscribe`, `$qUnsubscribe`, `$qSignal` a `QModel`.
5. Crear `QModelSignal` en `src/core/models/q-model-signal.ts`.
6. Añadir `_notifyObservers` a nivel de módulo en `quick.model.ts`.
7. Hookear el setter en `installLazyGetters()`.

### Fase 4: Exports y verificación

8. Exportar `IQChange`, `IQObserverFn`, `QModelSignal` en `src/core/index.ts`.
9. Re-exportar desde `src/index.ts`.
10. Ejecutar `bun run check` — lint + typecheck + tests.

---

## 9. Impacto en bundle

| Fichero nuevo               | Tamaño estimado (minificado)              |
| --------------------------- | ----------------------------------------- |
| `observer.type.ts`          | 0 bytes (solo tipos TS, tree-shaken)      |
| `q-model-signal.ts`         | ~180 bytes                                |
| Cambios en `quick.model.ts` | ~250 bytes (métodos + `_notifyObservers`) |
| **Total añadido al bundle** | **~430 bytes**                            |

El coste para usuarios que no usan reactividad es **estrictamente cero** en runtime (el `Set` de observers no se crea), y **~430 bytes** en bundle para quienes sí la usan.

---

## 10. Consideraciones de diseño adicionales

### Thread safety / Reentrancia

Si un observer modifica el mismo modelo (reentrancia), el setter volverá a llamar a `_notifyObservers` desde dentro del loop. Para evitar stack overflow en ciclos accidentales, se puede añadir un flag `__notifying__` que proteja contra reentrancia:

```typescript
if ((instance as any).__notifying__) return;
(instance as any).__notifying__ = true;
try {
	/* notificar */
} finally {
	(instance as any).__notifying__ = false;
}
```

Si se añade, se documenta claramente: los cambios hechos desde dentro de un observer no disparan nuevos eventos.

### Observers en `$qReset()`

`$qReset()` llama a los setters individualmente → cada campo restaurado dispara su propio evento. Esto es coherente con el comportamiento general (cada setter es independiente). Si alguien necesita batching ("notifícame solo una vez al final del reset"), puede implementarlo añadiendo un `batching` flag o usando `queueMicrotask`:

```typescript
// Patrón de batching en el lado del consumidor
let pending = false;
model.$qSubscribe(() => {
	if (pending) return;
	pending = true;
	queueMicrotask(() => {
		pending = false;
		updateUI();
	});
});
```

Este patrón es suficientemente sencillo para documentarlo; no necesita estar en el core.

### Compatibilidad con `$qIsDirty()` / `$qGetChangedFields()`

Los observers notifican **después** de que el valor se guarda en `storageKey` pero el dirty-tracking existente sigue funcionando igual que hoy. No hay conflicto porque ambos sistemas leen de `storageKey` y de `__initData__`, que no se tocan en la nueva implementación.

---

## 11. Preguntas abiertas antes de cerrar el proposal

1. **¿El `snapshot` es necesario en `IQChange`?** Añade la llamada a `$qSerialize()` en cada cambio, lo que puede ser costoso para modelos grandes con muchos campos. Alternativa: dejarlo fuera del core y que el consumidor llame a `model.$qSerialize()` si lo necesita. → **Decisión: incluirlo pero lazy** (getter que evalúa `$qSerialize()` solo si se accede, usando `Object.defineProperty` con getter lazy en el objeto `change`).

2. **¿Exportar `QModelSignal` públicamente?** Es un detalle de implementación que el usuario raramente necesita instanciar directamente. Podría ser solo accesible via `model.$qSignal`. → **Decisión: exportar el tipo `IQModelSignal` para que el consumidor pueda tipar la variable, pero no el constructor.**

3. **¿`$qSignal` es un getter o propiedad?** Getter: se puede cachear la instancia de `QModelSignal` en `__quickSignal__` para que siempre devuelva la misma. → **Decisión: getter que crea lazy y cachea.**
