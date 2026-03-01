# Performance — Optimizaciones pendientes del hot path

> **Fecha de análisis:** 1 de marzo de 2026
> **Estado:** Backlog — pendiente de implementación
> **Contexto:** Auditoría exhaustiva archivo a archivo del hot path de construcción de `QModel`
> **Benchmarks de referencia:** `tests/performance/comparison-benchmarks.test.ts`

---

## 📊 Estado actual del benchmark principal

| #   | Benchmark      | QuickModel | Competidor               | Ratio   |
| --- | -------------- | ---------- | ------------------------ | ------- |
| 1   | Simple 10k it. | ~100 ms    | Zod ~9 ms                | 11×     |
| 4   | isValid 1k it. | ~78 ms     | TypeBox ~17 ms           | 4.6×    |
| 9   | @QAlias 2k it. | ~24 ms     | class-transformer ~25 ms | ≈1× ✅  |
| 13  | Bulk 5×500 obj | ~489 ms    | Zod ~13 ms               | **37×** |

5 `defineProperty` en el _objeto instancia_, cada vez.

    instance[FORCE_HYDRATION_KEY]();

}

````

### Qué se haría

Pre-computar en tiempo de decoración (una vez por clase) si la clase tiene inicializadores JS.
La técnica ya existe en el mismo fichero: `_hasQTypeGetters` (línea ~707) hace exactamente
eso para los getters de `@QType`. Añadir un flag análogo `_hasJsInitializers`:

```typescript
// En el closure de @Quick — se ejecuta UNA VEZ al decorar la clase
const _hasJsInitializers = (() => {
	// Crear instancia de prueba sin datos para detectar si alguna propiedad
	// tiene valor por defecto asignado por TS (i.e. existe como own property antes de QModel)
	const probe = Object.create(originalConstructor.prototype);
	try {
		originalConstructor.call(probe);
	} catch {
		/* ignorar — solo queremos ver qué propiedades se asignan */
	}
	return Object.keys(probe).some((k) => !k.startsWith('__'));
})();

// En wrappedConstructor
if (_hasJsInitializers && typeof instance[FORCE_HYDRATION_KEY] === 'function') {
	instance[FORCE_HYDRATION_KEY]();
}
````

**Impacto esperado:** Para modelos del estilo `SimpleUser` (solo `declare` fields) — el caso
más común en los benchmarks — elimina el scan completo. Benchmark #1 podría mejorar 5-10%.

---

## 🟡 PROP-Z — Caché del conjunto estático de `propertyNames` por clase

**Prioridad:** 🟡 Media
**Esfuerzo estimado:** 1-2 horas
**Benchmarks afectados:** #1 (Simple 10k)

### Problema

En cada construcción se crea `new Set<string>()` y se rellena con las claves de `typeMap` +
`qTypes`. Estas claves son **completamente estáticas** — no cambian después de que los
decoradores se ejecutan. Solo las claves procedentes de `Object.keys(deserialized)` son
dinámicas por instancia.

```typescript
// src/core/models/quick.model.ts ~L1533 — nuevo Set en cada new UserModel(...)
const propertyNames = new Set<string>();
// loop deserialized (dinámico) ...
// typeMap keys (estáticas) ← podrían estar pre-cacheadas
// qTypes keys (estáticas)  ← ídem
```

### Qué se haría

Añadir un campo `staticPropertyNames: ReadonlySet<string>` al objeto ya existente en
`_CLASS_INIT_CACHE`. Se construye una única vez cuando se procesa la entrada de la clase:

```typescript
// En _CLASS_INIT_CACHE setup block (~L1593)
const staticKeys = new Set<string>();
if (rawTypeMap) for (const k of Object.keys(rawTypeMap)) staticKeys.add(k);
if (rawQTypes) for (const k of rawQTypes) staticKeys.add(String(k));
clsInitCache = { typeMap: rawTypeMap, qTypes: ..., staticKeys: Object.freeze(staticKeys) };

// En el constructor — clonar el set estático como punto de partida
const propertyNames = new Set<string>(clsInitCache.staticKeys);
// A partir de aquí solo añadir las claves dinámicas del loop de deserialized
```

Para clases cuyos campos estático y dinámico coinciden 100% (caso común), el Set resultante
es idéntico al caché — la única asignación es `new Set(iterable)` sobre un `Set` pequeño,
que es más barato que construirlo clave a clave.

**Impacto esperado:** Benchmark #1 podría mejorar 3-8% por reducción de inserciones repetidas.

---

## 🟢 PROP-AA — Guard de registro vacío en `TransformerLookupService`

**Prioridad:** 🟢 Baja
**Esfuerzo estimado:** 30 minutos
**Benchmarks afectados:** todos los que usan transformers (micro-opt)

### Problema

En cada resolución de transformer se llama a `QTransformerRegistry.get(key)`. Ese método
ejecuta `normalizeKey(key)` — que hace `.toLowerCase()` y puede crear string allocations —
antes de consultar el `Map`. Para el 99% de los usuarios (sin transformers custom), el
`Map` siempre está vacío y la llamada siempre devuelve `undefined`.

```typescript
// src/core/services/transformer-lookup.service.ts ~L95
// normalizeKey() se ejecuta SIEMPRE, incluso con registry vacío
const customTransformer = QTransformerRegistry.get(key);
```

### Qué se haría

Exponer `QTransformerRegistry.size` (el `Map` interno ya tiene `.size`) y añadir un guard:

```typescript
// Fast path: si el registro está vacío, saltar normalizeKey() por completo
if (QTransformerRegistry.size > 0) {
	const customTransformer = QTransformerRegistry.get(key);
	if (customTransformer) return customTransformer;
}
```

**Impacto esperado:** Micro-opt uniforme en todos los benchmarks con transformers. Baja
magnitud pero cero riesgo — el cambio es trivialmente correcto.

---

## 🟢 PROP-AB — Reemplazar `Reflect.deleteProperty` por asignación a `undefined`

**Prioridad:** 🟢 Baja
**Esfuerzo estimado:** 15 minutos
**Benchmarks afectados:** leve — micro-opt en construcción

### Problema

Al final del constructor, `Reflect.deleteProperty(this, '__tempData')` elimina la propiedad
temporal. La eliminación de propiedades en V8/Bun es costosa porque obliga al motor a mutar
la _hidden class_ del objeto y puede degradar el inline-cache de todas las propiedades
siguientes del mismo objeto.

```typescript
// src/core/models/quick.model.ts — final del constructor
Reflect.deleteProperty(this, '__tempData'); // ← muta hidden class
```

### Qué se haría

Sustituir la eliminación por una asignación a `undefined`. La propiedad permanece en el
objeto (hidden class estable) pero el valor es limpio. Si es necesario que no aparezca en
`JSON.stringify` u otras enumeraciones, basta con que sea `enumerable: false` — que ya es
el caso dado que `__tempData` empieza por `__`:

```typescript
// Alternativa — sin mutación de hidden class
(this as Record<string, unknown>).__tempData = undefined;
```

**Impacto esperado:** Micro-opt. Más relevante en patrones de construcción masiva (#13 Bulk).

---

## 📊 Resumen priorizado

| Prop    | Nombre                                  | Prioridad | Esfuerzo | Benchmarks   | Impacto estimado    |
| ------- | --------------------------------------- | --------- | -------- | ------------ | ------------------- |
| PROP-W  | Lazy getters en prototipo               | 🔴 Alta   | 3-4 h    | #1, #13      | −25-40% en #13      |
| PROP-X  | `structuredClone` lazy para `initData`  | 🔴 Alta   | 2-3 h    | #1, #13, #10 | −10-20% en #1       |
| PROP-Y  | Skip `FORCE_HYDRATION_KEY` pure-declare | 🟡 Media  | 2 h      | #1           | −5-10% en #1        |
| PROP-Z  | Caché estático de `propertyNames`       | 🟡 Media  | 1-2 h    | #1           | −3-8% en #1         |
| PROP-AA | Guard registro vacío TransformerLookup  | 🟢 Baja   | 0.5 h    | todos        | micro — sin riesgo  |
| PROP-AB | `Reflect.deleteProperty` → asignación   | 🟢 Baja   | 0.25 h   | #1, #13      | micro — cero riesgo |
