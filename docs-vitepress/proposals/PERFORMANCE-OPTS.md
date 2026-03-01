# Performance — Optimizaciones pendientes del hot path

> **Fecha de análisis:** 1 de marzo de 2026
> **Estado:** Backlog — pendiente de implementación
> **Contexto:** Auditoría exhaustiva archivo a archivo del hot path de construcción de `QModel`
> **Benchmarks de referencia:** `tests/performance/comparison-benchmarks.test.ts`

---

## 📊 Estado actual del benchmark principal

<<<<<<< Updated upstream
| # | Benchmark | QuickModel | Competidor | Ratio |
| --- | -------------- | ---------- | ------------------------ | ------- |
| 1 | Simple 10k it. | ~100 ms | Zod ~9 ms | 11× |
| 4 | isValid 1k it. | ~78 ms | TypeBox ~17 ms | 4.6× |
| 9 | @QAlias 2k it. | ~24 ms | class-transformer ~25 ms | ≈1× ✅ |
| 13 | Bulk 5×500 obj | ~489 ms | Zod ~13 ms | **37×** |
=======
| # | Benchmark | QuickModel | Competidor | Ratio |
|----|--------------------|------------|-------------|-------|
| 1 | Simple 10k it. | ~100 ms | Zod ~9 ms | 11× |
| 4 | isValid 1k it. | ~78 ms | TypeBox ~17 ms | 4.6× |
| 9 | @QAlias 2k it. | ~24 ms | class-transformer ~25 ms | ≈1× ✅ |
| 13 | Bulk 5×500 obj | ~489 ms | Zod ~13 ms | **37×** |

> > > > > > > Stashed changes

> Las 6 optimizaciones del sprint anterior (Sets de módulo, WeakMap de metadatos, caché de
> accessor) ya están aplicadas y verificadas con 3276 tests passing. Las propuestas de este
> documento son la siguiente capa de mejora.

---

## 🔴 PROP-W — Lazy getters en prototipo en lugar de por instancia

**Prioridad:** 🔴 Alta
**Esfuerzo estimado:** 3-4 horas
**Benchmarks afectados:** #1 (Simple 10k), #13 (Bulk 5×500)

### Problema

`installLazyGetters()` llama a `Object.defineProperty(this, key, {...})` **N veces por instancia**
en cada construcción — una llamada por propiedad decorada. Para un modelo con 5 campos son
<<<<<<< Updated upstream
5 `defineProperty` en el _objeto instancia_, cada vez.
=======
5 `defineProperty` en el _objeto instancia_, cada vez.

> > > > > > > Stashed changes

```typescript
// src/core/models/quick.model.ts — método installLazyGetters (~L1798)
// Estado actual: se ejecuta N veces POR CONSTRUCCIÓN
Object.defineProperty(this, key, {
    get(this: Record<string, unknown>) { ... },
    set(this: any, value: unknown) { ... },
    configurable: true,
    enumerable: true,
});
```

El motor (V8/Bun) tiene que mutar la _hidden class_ del objeto en cada `defineProperty`
de instancia, lo que invalida las optimizaciones de inline-cache para ese objeto.

### Qué se haría

Instalar los descriptores **en `ctor.prototype` una sola vez** (primera construcción de la clase).
Las clausuras usan `this` dinámico, por lo que son igualmente correctas sobre el prototipo.
Desde la segunda instancia en adelante, `installLazyGetters` se convertiría en un no-op total.

```typescript
private installLazyGetters(keys: Iterable<string>): void {
    const proto = this.constructor.prototype as Record<string, unknown>;
    for (const key of keys) {
        // Si el descriptor ya está en el prototipo para esta clase, skip
        if (Object.getOwnPropertyDescriptor(proto, key)?.get) continue;
        // ... resto de guardas existentes (hasAccessor, etc.)
        Object.defineProperty(proto, key, descriptor);  // ← una vez por clase
    }
}
```

**Guardas necesarias:**
<<<<<<< Updated upstream

=======

> > > > > > > Stashed changes

- No sobreescribir getters de `@QType` (ya registrados con `qtype:generated`)
- No sobreescribir accessors de usuario (ya controlado por `_HAS_ACCESSOR_CACHE`)
- Si una subclase extiende la clase padre, instalar los descriptores en el prototipo de la subclase

**Impacto esperado:** Benchmark #13 podría reducirse un 25-40%; #1 un 15-25%.

---

## 🔴 PROP-X — `structuredClone` de `initData` de forma lazy

**Prioridad:** 🔴 Alta
**Esfuerzo estimado:** 2-3 horas
**Benchmarks afectados:** #1 (Simple 10k), #13 (Bulk 5×500), #10 (isDirty)

### Problema

En el constructor, por cada propiedad no-primitiva del input se ejecuta `structuredClone(value)`
para crear el snapshot `__initData`. Ese snapshot solo es necesario cuando el usuario invoca
`isDirty()` o `reset()`, pero se paga en **cada construcción** aunque ninguna de las dos
funciones sea llamada nunca.

```typescript
// src/core/models/quick.model.ts ~L1497
} else {
    try {
        initDataClone[key] = structuredClone(value);  // ← caro, siempre
    } catch {
        initDataClone[key] = value;
    }
}
```

### Qué se haría

Guardar una referencia al `data` original sin clonar. Marcar el snapshot como pendiente
con un flag `__initDataReady = false`. El clone real se ejecutaría lazy en la primera
llamada a `isDirty()` o `reset()`:

```typescript
// Constructor — sin clone
Object.defineProperty(this, '__initDataSource', { value: data, ... });
Object.defineProperty(this, '__initDataReady', { value: false, writable: true, ... });

// isDirty() / reset() — clone on-demand
private _ensureInitData(): void {
    if (!this.__initDataReady) {
        this.__initData = deepClone(this.__initDataSource);
        this.__initDataReady = true;
    }
}
```

**Riesgo a documentar:** Si el consumidor muta el objeto `data` original antes de llamar a
`isDirty()`, el snapshot reflejaría el estado mutado. Alternativas: `Object.freeze(data)`
en el constructor, o clonar solo el primer nivel (shallow) y hacer deep-clone en `isDirty()`.

**Impacto esperado:** Benchmark #1 podría reducirse un 10-20%; muy visible en #13 con objetos
anidados.

---

## 🟡 PROP-Y — Skip de `FORCE_HYDRATION_KEY` en modelos pure-declare

**Prioridad:** 🟡 Media
**Esfuerzo estimado:** 2 horas
**Benchmarks afectados:** #1 (Simple 10k)

### Problema

`FORCE_HYDRATION_KEY()` es invocado incondicionalmente al final de cada construcción
(`quick.decorator.ts:806`). Internamente, itera `Object.keys(this[QUICK_VALUES_KEY])`
comparando `currentValue !== backupValue` por cada campo — un scan O(N) que para modelos
con solo `declare` (sin inicializadores JS como `name = 'Default'`) nunca restaura nada.

```typescript
// src/core/decorators/quick.decorator.ts ~L806 — SIEMPRE ejecutado
if (typeof instance[FORCE_HYDRATION_KEY] === 'function') {
<<<<<<< Updated upstream
	instance[FORCE_HYDRATION_KEY]();
=======
    instance[FORCE_HYDRATION_KEY]();
>>>>>>> Stashed changes
}
```

### Qué se haría

Pre-computar en tiempo de decoración (una vez por clase) si la clase tiene inicializadores JS.
La técnica ya existe en el mismo fichero: `_hasQTypeGetters` (línea ~707) hace exactamente
eso para los getters de `@QType`. Añadir un flag análogo `_hasJsInitializers`:

```typescript
// En el closure de @Quick — se ejecuta UNA VEZ al decorar la clase
const _hasJsInitializers = (() => {
<<<<<<< Updated upstream
	// Crear instancia de prueba sin datos para detectar si alguna propiedad
	// tiene valor por defecto asignado por TS (i.e. existe como own property antes de QModel)
	const probe = Object.create(originalConstructor.prototype);
	try {
		originalConstructor.call(probe);
	} catch {
		/* ignorar — solo queremos ver qué propiedades se asignan */
	}
	return Object.keys(probe).some((k) => !k.startsWith('__'));
=======
    // Crear instancia de prueba sin datos para detectar si alguna propiedad
    // tiene valor por defecto asignado por TS (i.e. existe como own property antes de QModel)
    const probe = Object.create(originalConstructor.prototype);
    try {
        originalConstructor.call(probe);
    } catch { /* ignorar — solo queremos ver qué propiedades se asignan */ }
    return Object.keys(probe).some(k => !k.startsWith('__'));
>>>>>>> Stashed changes
})();

// En wrappedConstructor
if (_hasJsInitializers && typeof instance[FORCE_HYDRATION_KEY] === 'function') {
<<<<<<< Updated upstream
	instance[FORCE_HYDRATION_KEY]();
=======
    instance[FORCE_HYDRATION_KEY]();
>>>>>>> Stashed changes
}
```

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
<<<<<<< Updated upstream
	const customTransformer = QTransformerRegistry.get(key);
	if (customTransformer) return customTransformer;
=======
    const customTransformer = QTransformerRegistry.get(key);
    if (customTransformer) return customTransformer;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
Reflect.deleteProperty(this, '__tempData'); // ← muta hidden class
=======
Reflect.deleteProperty(this, '__tempData');  // ← muta hidden class
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
| Prop | Nombre | Prioridad | Esfuerzo | Benchmarks | Impacto estimado |
| ------- | --------------------------------------- | --------- | -------- | ------------ | ------------------- |
| PROP-W | Lazy getters en prototipo | 🔴 Alta | 3-4 h | #1, #13 | −25-40% en #13 |
| PROP-X | `structuredClone` lazy para `initData` | 🔴 Alta | 2-3 h | #1, #13, #10 | −10-20% en #1 |
| PROP-Y | Skip `FORCE_HYDRATION_KEY` pure-declare | 🟡 Media | 2 h | #1 | −5-10% en #1 |
| PROP-Z | Caché estático de `propertyNames` | 🟡 Media | 1-2 h | #1 | −3-8% en #1 |
| PROP-AA | Guard registro vacío TransformerLookup | 🟢 Baja | 0.5 h | todos | micro — sin riesgo |
| PROP-AB | `Reflect.deleteProperty` → asignación | 🟢 Baja | 0.25 h | #1, #13 | micro — cero riesgo |
=======
| Prop | Nombre | Prioridad | Esfuerzo | Benchmarks | Impacto estimado |
|--------|-----------------------------------------|------------|----------|---------------|---------------------------|
| PROP-W | Lazy getters en prototipo | 🔴 Alta | 3-4 h | #1, #13 | −25-40% en #13 |
| PROP-X | `structuredClone` lazy para `initData` | 🔴 Alta | 2-3 h | #1, #13, #10 | −10-20% en #1 |
| PROP-Y | Skip `FORCE_HYDRATION_KEY` pure-declare | 🟡 Media | 2 h | #1 | −5-10% en #1 |
| PROP-Z | Caché estático de `propertyNames` | 🟡 Media | 1-2 h | #1 | −3-8% en #1 |
| PROP-AA | Guard registro vacío TransformerLookup | 🟢 Baja | 0.5 h | todos | micro — sin riesgo |
| PROP-AB | `Reflect.deleteProperty` → asignación | 🟢 Baja | 0.25 h | #1, #13 | micro — cero riesgo |

> > > > > > > Stashed changes

**Tiempo total:** ~9-12 horas
**Impacto acumulado potencial (W+X):** Benchmark #13 (Bulk 489ms → estimado ~280-350ms),
Benchmark #1 (100ms → estimado ~65-80ms).

## 🔁 Orden recomendado de implementación

```
1. PROP-W  → lazy getters en prototipo  (mayor impacto, requiere cuidado con herencia)
2. PROP-X  → structuredClone lazy       (segundo mayor impacto, riesgo de mutación a documentar)
3. PROP-Y  → skip FORCE_HYDRATION       (fácil, precedente ya existe en el mismo fichero)
4. PROP-Z  → caché staticPropertyNames  (fácil, reutiliza _CLASS_INIT_CACHE ya existente)
5. PROP-AA → guard registro vacío       (trivial, 30 min)
6. PROP-AB → deleteProperty → assign    (trivial, 15 min)
```

> **Metodología:** TDD siempre — escribir tests de benchmark como regresión antes de tocar
> el código. Verificar con `bun run check` + comparativa de benchmarks antes/después.
