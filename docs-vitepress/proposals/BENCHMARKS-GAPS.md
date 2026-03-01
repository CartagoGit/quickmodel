# Benchmarks — Gaps y propuestas de nuevas comparativas

> **Fecha de análisis:** 1 de marzo de 2026
> **Estado:** Backlog — pendiente de implementación
> **Contexto generado por:** revisión exhaustiva archivo a archivo del proyecto

---

## 🗺️ Mapa de cobertura actual

El sistema de benchmarks tiene **15 benchmarks + featureMatrix**. Cada benchmark vive en
`tests/performance/benchmarks/{key}/{key}.bench.ts` + `{key}.def.ts`.

| #   | Clave                | Qué mide                                               | Competidores                                                       |
| --- | -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| 1   | `validation`         | Validación objetos simples 10k it.                     | TypeBox, Valibot, Zod, Yup, Joi, Arktype, class-validator, PlainJS |
| 2   | `coercion`           | Date + BigInt + Map + Set 1k it.                       | Valibot, Zod, class-transformer, class-validator                   |
| 3   | `serialization`      | Roundtrip serialización 1k                             | superjson, JSON, class-transformer                                 |
| 4   | `batch`              | Validación batch 1k objetos                            | TypeBox, Valibot, Zod, Yup, Plain JS                               |
| 5   | `mocks`              | Mock generation (`QMockGenerator.random()`)            | faker, Plain JS factory                                            |
| 6   | `performanceTargets` | Throughput QM-only (sin competidor)                    | —                                                                  |
| 7   | `typeSerialization`  | Fidelidad tipos en serialización (Date/BigInt/Map/Set) | superjson, Plain JSON, class-transformer                           |
| 8   | `rules`              | `@QRule` + `@QGroup` 5k it.                            | class-validator, vest, joi                                         |
| 9   | `aliasMapping`       | `@QAlias` field mapping 2k it.                         | class-transformer, Plain JS                                        |
| 10  | `isDirty`            | Change detection 5k it.                                | Plain JS `JSON.stringify`, Immer                                   |
| 11  | `nestedConstruct`    | Nested model construction 1k                           | class-transformer, Plain JS                                        |
| 12  | `asyncRules`         | Async rules paralelo 1k                                | yup async, joi async, `Promise.all` manual                         |
| 13  | `bulkConstruct`      | `createMany` 5 ciclos × 500 obj                        | class-transformer, Plain JS                                        |
| 14  | `schemaMultiFormat`  | `getSchema()` **⚠️ solo 7 formatos** 2k it.            | TypeBox (1 fmt), Plain JS (1 fmt)                                  |
| 15  | `validationReport`   | Validation report detallado con mensajes por campo     | yup, joi                                                           |
| —   | `featureMatrix`      | Resumen cualitativo sin datos de perf                  | —                                                                  |

---

## 🔴 GAP CRÍTICO — Benchmark #14 desactualizado

### Problema

`schemaMultiFormat` dice "7 formatos" en el título del `describe`, en el `def.ts` y en los comentarios,
pero el producto ahora tiene **10 formatos** desde las Propuestas C y S (completadas el 1 Mar 2026):

| Formato        | Generator                   | Estado en bench #14 |
| -------------- | --------------------------- | ------------------- |
| `'json'`       | `JsonSchemaGenerator`       | ✅ incluido         |
| `'zod'`        | `ZodSchemaGenerator`        | ✅ incluido         |
| `'openapi'`    | `OpenAPISchemaGenerator`    | ✅ incluido         |
| `'typescript'` | `TypeScriptSchemaGenerator` | ✅ incluido         |
| `'graphql'`    | `GraphQLSchemaGenerator`    | ✅ incluido         |
| `'mongo'`      | `MongoSchemaGenerator`      | ✅ incluido         |
| `'ajv'`        | `AjvSchemaGenerator`        | ✅ incluido         |
| `'prisma'`     | `PrismaSchemaGenerator`     | ❌ **FALTA**        |
| `'valibot'`    | `ValibotSchemaGenerator`    | ❌ **FALTA**        |
| `'yup'`        | `YupSchemaGenerator`        | ❌ **FALTA**        |

### Archivos a modificar

- `tests/performance/benchmarks/schemaMultiFormat/schemaMultiFormat.bench.ts`
    - Añadir `'prisma'`, `'valibot'`, `'yup'` al array `ALL_FORMATS`
    - Actualizar el título del `describe()`: "7 formatos" → "10 formatos"
    - Añadir tests individuales para los 3 nuevos competidores:
        - `'prisma'` → comparar con template string Prisma manual
        - `'valibot'` → comparar con `v.object()` construido a mano
        - `'yup'` → comparar con `yup.object()` construido a mano
- `tests/performance/benchmarks/schemaMultiFormat/schemaMultiFormat.def.ts`
    - Actualizar título y actualizar el valor de `QuickModel` con las 10 iteraciones
    - Los valores de `valibot` y `yup` ya están en el `values` record como `null` — cambiarlos a números reales tras ejecutar el bench
- `tests/performance/benchmarks/registry.ts` / `registry.bench.ts`
    - Actualizar comentario de descripción del escenario `schemaMultiFormat`
- `tests/performance/benchmarks/featureMatrix/featureMatrix.bench.ts`
    - Añadir filas de `prisma`, `valibot`, `yup` en la tabla de feature matrix

### Cómo ejecutar tras el cambio

```bash
bun run bench:compare 2>&1 | tee ./tmp/schemaMultiFormat-10.txt
```

---

## 🔴 Propuesta #16 — `binaryTransformers/`

### Contexto

11 transformers del proyecto no tienen ninguna cobertura de rendimiento. Solo `Date`, `BigInt`, `Map` y `Set`
están benchmarkeados indirectamente (bench #2). Los transformers de binarios son un diferenciador exclusivo
de QuickModel — ningún otro validador soporta `ArrayBuffer`, `Float32Array`, `DataView`, etc.

**Transformers sin benchmark:**

- `ArrayBufferTransformer` (`src/transformers/buffer.transformer.ts`)
- `DataViewTransformer` (`src/transformers/buffer.transformer.ts`)
- `SharedArrayBufferTransformer` (`src/transformers/buffer.transformer.ts`)
- `TypedArrayTransformer<Float32Array>` (y Int8, Uint8, Int16, etc.)
- `TypedArrayTransformer<BigInt64Array>` y `BigUint64Array`

### Qué medir

| Operación QM                                    | Competidor / baseline                                        | Nota                          |
| ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| Roundtrip `Float32Array` vía QModel             | `Array.from(f32) → serialize → new Float32Array(arr)`        | Manual que los devs hacen hoy |
| Roundtrip `ArrayBuffer` vía QModel              | `btoa(String.fromCharCode(...new Uint8Array(buf)))` + `atob` | base64 manual                 |
| Coerción `Array → Float32Array` en construcción | Sin coerción, el dev hace `new Float32Array(raw)`            | Auto-coerción QM              |
| Fidelidad total roundtrip Int32Array            | Pérdida con `JSON.stringify`                                 | QM ≫ JSON plano               |

### Archivos a crear

```
tests/performance/benchmarks/binaryTransformers/
  binaryTransformers.bench.ts   ← describe Benchmark #16
  binaryTransformers.def.ts     ← IBenchScenario para VitePress
```

### Registro en registries

- `tests/performance/benchmarks/registry.bench.ts` — añadir import + entrada en `allBenches`
- `tests/performance/benchmarks/registry.ts` — añadir import + entrada en `_rawScenarios`

### Template de `_models.ts` a añadir

```typescript
export interface IAudioChunk {
	pcm: Float32Array;
	sampleRate: number;
}

export interface IBinaryPayload {
	data: ArrayBuffer;
	length: number;
}

@Quick({ pcm: Float32Array, data: ArrayBuffer })
export class AudioChunkModel extends QModel<IAudioChunk> {
	declare pcm: Float32Array;
	declare sampleRate: number;
}

@Quick({ data: ArrayBuffer })
export class BinaryPayloadModel extends QModel<IBinaryPayload> {
	declare data: ArrayBuffer;
	declare length: number;
}
```

---

## 🔴 Propuesta #17 — `specialTypes/`

### Contexto

Cuatro transformers con diferenciadores únicos frente a la competencia no tienen benchmark:

| Transformer                                 | Archivo                                         | Diferenciador                                 |
| ------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| `RegExpTransformer`                         | `src/transformers/regexp.transformer.ts`        | superjson lo soporta, class-transformer no    |
| `SymbolTransformer`                         | `src/transformers/symbol.transformer.ts`        | **Ningún competidor lo soporta**              |
| `SpecialFloatTransformer` (NaN/Infinity/-0) | `src/transformers/special-float.transformer.ts` | superjson parcial                             |
| `ErrorTransformer`                          | `src/transformers/error.transformer.ts`         | superjson parcial, JSON.stringify pierde todo |

### Comparativas posibles por tipo

**RegExp:**

- QuickModel roundtrip (serialize → deserialize) → `RegExp` intacto
- superjson (soporta RegExp, buena comparativa)
- Manual: `reg.toString()` → guardar → `new RegExp(str.slice(1, -2), str.split('/').pop())`
- `JSON.stringify` → RegExp se convierte en `{}` ❌

**Symbol:**

- QuickModel → serialize por descripción → `Symbol.for(desc)` en deserialize
- Manual: `Symbol.for(sym.description)` pattern
- JSON.stringify: `undefined` ❌ — ventaja exclusiva QM

**Infinity / NaN / -0:**

- QuickModel roundtrip
- superjson (soporta por protocolo propio)
- Manual `isFinite()` + guard + string fallback
- JSON.stringify: `NaN → null`, `Infinity → null` ❌

**Error:**

- QuickModel roundtrip preserva `message` + `name` + `stack`
- superjson (serializa `message` + `name`)
- `JSON.stringify(err)` → `{}` ❌

### Archivos a crear

```
tests/performance/benchmarks/specialTypes/
  specialTypes.bench.ts
  specialTypes.def.ts
```

---

## 🟠 Propuesta #18 — `webApiTransformers/`

### Contexto

`URLTransformer` y `URLSearchParamsTransformer` (`src/transformers/web-apis.transformer.ts`) permiten
guardar URLs en modelos con roundtrip tipo seguro. Ningún validador de la competencia lo hace nativamente.

### Qué medir

| Operación                                         | Competidor                                   |
| ------------------------------------------------- | -------------------------------------------- |
| QModel roundtrip `URL` (serialize → deserialize)  | `new URL(str).toString()` manual by field    |
| QModel roundtrip `URLSearchParams`                | `new URLSearchParams(str).toString()` manual |
| QM construcción con string crudo → `URL` instance | `new URL(value)` en constructor manual       |

superjson **no** soporta `URL` → ventaja exclusiva de QM documentable.

### Archivos a crear

```
tests/performance/benchmarks/webApiTransformers/
  webApiTransformers.bench.ts
  webApiTransformers.def.ts
```

---

## 🟠 Propuesta #19 — `rulesByGroup/` — `qCheckRulesByGroup` y `qCheckRulesByGroupAsync`

### Contexto

El benchmark #8 (`rules`) solo mide `qCheckRules` (todas las reglas). Pero `quickmodel/forms` exporta:

- `qCheckRulesByGroup(form)` — evalúa las reglas por grupo en una sola llamada
- `qCheckRulesByGroupAsync(form)` — versión async

Estas funciones no tienen ningún benchmark de rendimiento. Son especialmente relevantes para
formularios multi-paso donde cada paso valida un grupo diferente.

### Qué medir

| Operación                       | Descripción                                | Competidor                                       |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `qCheckRulesByGroup(form)`      | Todos los grupos en una llamada            | N llamadas separadas `qCheckRules(f, { group })` |
| `qCheckRulesByGroupAsync(form)` | Async, todos los grupos                    | `Promise.all` con `qCheckRulesAsync` por grupo   |
| `vest` groups                   | `vest.group('identity', () => {})`         | Comparativa directa                              |
| `joi.fork()`                    | `schema.fork(['name'], s => s.required())` | Comparativa directa                              |

### Modelo de test sugerido

```typescript
const Groups = qGroups('identity', 'security', 'address');

class SignupForm {
	@QRule((v: string) => v.length >= 2, 'Too short')
	@QGroup(Groups.identity)
	name = '';

	@QRule((v: string) => /\S+@\S+/.test(v), 'Invalid email')
	@QGroup(Groups.identity)
	email = '';

	@QRule((v: string) => v.length >= 8, 'Too short')
	@QRule((v: string) => /[A-Z]/.test(v), 'Need uppercase')
	@QGroup(Groups.security)
	password = '';

	@QRule((v: string) => v.length >= 5, 'Too short')
	@QGroup(Groups.address)
	street = '';
}
```

### Archivos a crear

```
tests/performance/benchmarks/rulesByGroup/
  rulesByGroup.bench.ts   ← Benchmark #19
  rulesByGroup.def.ts
```

---

## 🟡 Propuesta #20 — `mockBuilder/` — fluent API de `QMockBuilder`

### Contexto

El benchmark #5 (`mocks`) llama directamente a `SimpleUser.mock().random()` pero no aísla los métodos
del fluent builder `QMockBuilder` ni los compara sistemáticamente:

| Método                        | ¿Benchmarkeado?                  |
| ----------------------------- | -------------------------------- |
| `.random()`                   | Solo en #5 junto con otros tests |
| `.array(5)`                   | ❌ No                            |
| `.full()`                     | ❌ No                            |
| `.withOverrides({ age: 30 })` | ❌ No                            |
| `.empty()`                    | ❌ No                            |

### Qué medir

| Operación QM                             | Competidor                           | Nota                         |
| ---------------------------------------- | ------------------------------------ | ---------------------------- |
| `User.mock().array(5)`                   | `Array.from({ length: 5 }, factory)` | Array generation             |
| `User.mock().withOverrides({ age: 30 })` | `{ ...factory(), age: 30 }`          | Override pattern             |
| `User.mock().full()`                     | `faker` full object                  | Determinismo vs aleatoriedad |
| `User.mock().empty()`                    | `new User({})`                       | Empty construction overhead  |
| `User.mock().random()` × 100             | faker × 100                          | Throughput comparison        |

### Archivos a crear

```
tests/performance/benchmarks/mockBuilder/
  mockBuilder.bench.ts   ← Benchmark #20 (QM Exclusive — sin competidores directos para todos los métodos)
  mockBuilder.def.ts
```

---

## 🟡 Propuesta #21 — `integrityCheck/` — `checkIntegrity()` y `hasIntegrity()`

### Contexto

`IntegrityService` (`src/core/services/integrity.service.ts`) y los métodos públicos
`model.checkIntegrity()` / `model.hasIntegrity()` no tienen ningún benchmark de rendimiento.

### Qué medir

| Operación                           | Descripción                    | Competidor                            |
| ----------------------------------- | ------------------------------ | ------------------------------------- |
| `model.hasIntegrity()`              | Boolean check sin detalle      | Manual `typeof` + `instanceof` guards |
| `model.checkIntegrity()`            | Array detallado de errores     | `zod.safeParse(model.serialize())`    |
| Modelo limpio vs modelo con errores | Impacto de la ruta de error    | —                                     |
| class-validator `validate()`        | Decorators approach comparable | Comparativa directa                   |

### Archivos a crear

```
tests/performance/benchmarks/integrityCheck/
  integrityCheck.bench.ts   ← Benchmark #21
  integrityCheck.def.ts
```

---

## 🟡 Propuesta #22 — `toInterface/` — preservación vs serialización

### Contexto

`model.toInterface()` y `model.toJSON()` delegan en `ToInterfaceService`
(`src/core/services/to-interface.service.ts`). A diferencia de `serialize()` que siempre produce
JSON-safe (Date → ISO string, BigInt → string), `toInterface()` preserva los tipos originales.

Este comportamiento diferencial no tiene ningún benchmark de rendimiento.

### Qué medir

| Operación                           | Output                                         | Cuándo usar          |
| ----------------------------------- | ---------------------------------------------- | -------------------- |
| `model.toInterface()`               | Tipos originales preservados (`Date` → `Date`) | Round-trip lossless  |
| `model.serialize()`                 | JSON-safe (`Date` → ISO string)                | Persistencia / API   |
| `structuredClone(plain)`            | Deep copy del plain object                     | Built-in sin tipos   |
| `JSON.parse(JSON.stringify(plain))` | Destructivo (pierde Date, BigInt)              | Baseline destructivo |

### Template modelo

```typescript
@Quick({ createdAt: Date, balance: BigInt })
class Invoice extends QModel<IInvoice> {
	declare id: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare items: string[];
}
```

### Archivos a crear

```
tests/performance/benchmarks/toInterface/
  toInterface.bench.ts   ← Benchmark #22
  toInterface.def.ts
```

---

## 🟢 Propuesta #23 — `customTransformer/` — overhead del registro custom

### Contexto

`QTransformerRegistry.register()` permite al usuario registrar transformers propios.
El overhead de este mecanismo vs una función inline no está medido.

### Qué medir

| Operación                                       | Comparado con                              |
| ----------------------------------------------- | ------------------------------------------ |
| QM + `MoneyTransformer` registrado vía Registry | class-transformer `@Transform()` decorator |
| QM + transformer custom                         | Función inline sin registry                |
| `QTransformerRegistry.get()` lookup overhead    | —                                          |

### Archivos a crear

```
tests/performance/benchmarks/customTransformer/
  customTransformer.bench.ts   ← Benchmark #23
  customTransformer.def.ts
```

---

## 🟢 Propuesta #24 — `modelInheritance/` — cadena de herencia vs modelo plano

### Contexto

No hay ningún benchmark que mida el impacto en rendimiento de la herencia profunda vs un modelo plano
con los mismos campos totales.

### Qué medir

```typescript
// Deep (3 niveles)
class BaseEntity extends QModel<IBase> {
	@Quick({}) id: string;
}
class TypedEntity extends BaseEntity {
	@Quick({}) type: string;
}
class FullUser extends TypedEntity {
	@Quick({}) email: string;
	name: string;
}

// Flat (mismo total de campos)
class FlatUser extends QModel<IFlatUser> {
	@Quick({}) id: string;
	type: string;
	email: string;
	name: string;
}
```

| Medición                                                  | Descripción                               |
| --------------------------------------------------------- | ----------------------------------------- |
| Construcción `new FullUser(data)` vs `new FlatUser(data)` | Overhead del traversal de prototype chain |
| `serialize()` profundo vs plano                           | Serialización con herencia                |
| `isDirty()` profundo vs plano                             | Change detection con herencia             |

### Archivos a crear

```
tests/performance/benchmarks/modelInheritance/
  modelInheritance.bench.ts   ← Benchmark #24
  modelInheritance.def.ts
```

---

## 🟢 Propuesta #25 — `perClassConfig/` — strict mode overhead

### Contexto

La Propuesta Q (`QModel.configure({})`) ya está completada con tests en
`tests/unit/core/models/per-class-config.test.ts`, pero **no tiene benchmark de rendimiento**.

El archivo del usuario actualmente abierto en el editor es ese mismo test.

### Qué medir

| Config                                           | Descripción                                          |
| ------------------------------------------------ | ---------------------------------------------------- |
| `@Quick({ strict: true })`                       | Extra validation en construcción — ¿cuánto overhead? |
| `@Quick({ strict: false })`                      | Modo permisivo                                       |
| `@Quick()` default                               | Línea base                                           |
| class-transformer con validación class-validator | Comparativa equivalente                              |

### Archivos a crear

```
tests/performance/benchmarks/perClassConfig/
  perClassConfig.bench.ts   ← Benchmark #25
  perClassConfig.def.ts
```

---

## 🟢 Propuesta #26 — `qDefaultValues/` — overhead de `@QDefault`

### Contexto

El decorator `@QDefault` (Propuesta F, completada 1 Mar 2026) aplica valores por defecto cuando el
valor entrante es `undefined` o `null`. No tiene benchmark de rendimiento.

### Qué medir

| Comparado                                             | Nota                                   |
| ----------------------------------------------------- | -------------------------------------- |
| Model con `@QDefault` en todos los campos             | Automático desde metadata              |
| Model sin `@QDefault`, defaults en constructor manual | `this.status = data.status ?? 'draft'` |
| class-transformer + `@Transform((v) => v ?? 'draft')` | Equivalente más cercano                |

### Archivos a crear

```
tests/performance/benchmarks/qDefaultValues/
  qDefaultValues.bench.ts   ← Benchmark #26
  qDefaultValues.def.ts
```

---

## 📋 Resumen de archivos impactados por prioritad

### Prioridad 🔴 Crítico (hacer primero)

| Archivo                                                                       | Cambio                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `tests/performance/benchmarks/schemaMultiFormat/schemaMultiFormat.bench.ts`   | `ALL_FORMATS` 7 → 10, título, tests para prisma/valibot/yup |
| `tests/performance/benchmarks/schemaMultiFormat/schemaMultiFormat.def.ts`     | Actualizar título y valores reales tras ejecutar bench      |
| `tests/performance/benchmarks/binaryTransformers/binaryTransformers.bench.ts` | **NUEVO**                                                   |
| `tests/performance/benchmarks/binaryTransformers/binaryTransformers.def.ts`   | **NUEVO**                                                   |
| `tests/performance/benchmarks/specialTypes/specialTypes.bench.ts`             | **NUEVO**                                                   |
| `tests/performance/benchmarks/specialTypes/specialTypes.def.ts`               | **NUEVO**                                                   |

### Prioridad 🟠 Alta

| Archivo                                                                       | Cambio    |
| ----------------------------------------------------------------------------- | --------- |
| `tests/performance/benchmarks/rulesByGroup/rulesByGroup.bench.ts`             | **NUEVO** |
| `tests/performance/benchmarks/rulesByGroup/rulesByGroup.def.ts`               | **NUEVO** |
| `tests/performance/benchmarks/webApiTransformers/webApiTransformers.bench.ts` | **NUEVO** |
| `tests/performance/benchmarks/webApiTransformers/webApiTransformers.def.ts`   | **NUEVO** |

### Prioridad 🟡 Media

| Archivo                                                               | Cambio    |
| --------------------------------------------------------------------- | --------- |
| `tests/performance/benchmarks/mockBuilder/mockBuilder.bench.ts`       | **NUEVO** |
| `tests/performance/benchmarks/integrityCheck/integrityCheck.bench.ts` | **NUEVO** |
| `tests/performance/benchmarks/toInterface/toInterface.bench.ts`       | **NUEVO** |

### Prioridad 🟢 Baja

| Archivo                                                                     | Cambio    |
| --------------------------------------------------------------------------- | --------- |
| `tests/performance/benchmarks/customTransformer/customTransformer.bench.ts` | **NUEVO** |
| `tests/performance/benchmarks/modelInheritance/modelInheritance.bench.ts`   | **NUEVO** |
| `tests/performance/benchmarks/perClassConfig/perClassConfig.bench.ts`       | **NUEVO** |
| `tests/performance/benchmarks/qDefaultValues/qDefaultValues.bench.ts`       | **NUEVO** |

### Siempre al añadir un nuevo benchmark

- `tests/performance/benchmarks/registry.bench.ts` — añadir import del `.bench.ts` + entrada en `allBenches`
- `tests/performance/benchmarks/registry.ts` — añadir import del `.def.ts` + entrada en `_rawScenarios`
- `tests/performance/benchmarks/featureMatrix/featureMatrix.bench.ts` — añadir filas nuevas si aplica
- `tests/performance/benchmarks/_models.ts` — añadir modelos de test si hacen falta nuevos

---

## 🔢 Secuencia de números de benchmark

Los benchmarks actuales llegan hasta el `#15`. Los nuevos deben seguir este orden:

| #   | Propuesta          | Clave                |
| --- | ------------------ | -------------------- |
| 16  | binaryTransformers | `binaryTransformers` |
| 17  | specialTypes       | `specialTypes`       |
| 18  | webApiTransformers | `webApiTransformers` |
| 19  | rulesByGroup       | `rulesByGroup`       |
| 20  | mockBuilder        | `mockBuilder`        |
| 21  | integrityCheck     | `integrityCheck`     |
| 22  | toInterface        | `toInterface`        |
| 23  | customTransformer  | `customTransformer`  |
| 24  | modelInheritance   | `modelInheritance`   |
| 25  | perClassConfig     | `perClassConfig`     |
| 26  | qDefaultValues     | `qDefaultValues`     |

---

## ⚙️ Cómo ejecutar los benchmarks

```bash
# Todos los benchmarks
bun run bench:compare

# Guardar output para revisión
bun run bench:compare 2>&1 | tee ./tmp/bench-full.txt

# Solo un benchmark específico (filtrar por nombre de describe)
bun --expose-gc test tests/performance/comparison-benchmarks.test.ts --grep "Benchmark #16"
```
