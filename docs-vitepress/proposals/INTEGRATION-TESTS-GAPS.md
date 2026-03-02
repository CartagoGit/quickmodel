# Brechas de Tests de Integración por Sección de Documentación

> **Fecha de análisis:** 1 de marzo de 2026
> **Estado:** En progreso — P0 implementados, P1–P3 + categorías B–I en backlog
> **Contexto:** QuickModel tiene 4 358+ tests, la mayoría unitarios. Existen 38 páginas de guía
> (`docs-vitepress/en/guide/`) y 28 páginas de integraciones de frameworks, pero la cobertura
> de tests de integración por sección de documentación tiene brechas significativas.
> **Criterio de un test de integración por doc:** el test valida exactamente el comportamiento
> que describe la página, usando los mismos snippets de código como base.

---

## 📊 Resumen de brechas

| Prioridad | Bloque                                             | Total  | Implementados | Pendientes |
| --------- | -------------------------------------------------- | ------ | ------------- | ---------- |
| 🔴 P0     | Pilares de la API (por sección doc)                | 7      | 7             | 0          |
| 🟠 P1     | Features frecuentes (por sección doc)              | 7      | 0             | 7          |
| 🟡 P2     | Features específicas y edge cases                  | 8      | 0             | 8          |
| 🟢 P3     | Snippets de ejemplos y MCP individual              | 6      | 0             | 6          |
| 🔵 B      | Combinaciones cross-feature                        | 6      | 0             | 6          |
| 🔵 C      | QConfig global como integración real               | 4      | 0             | 4          |
| 🔵 D      | Estado mutable: flujos completos                   | 4      | 0             | 4          |
| 🔵 E      | Transformers complejos en modelos reales           | 4      | 0             | 4          |
| 🔵 F      | Generación de schema como integración              | 4      | 0             | 4          |
| 🔵 G      | Flujos de error y recuperación                     | 4      | 0             | 4          |
| 🔵 H      | TC39 decorators nivel integración                  | 3      | 0             | 3          |
| 🔵 I      | Mocks con decoradores de negocio                   | 4      | 0             | 4          |
| 🔵 J      | E2E de features documentadas sin escenario usuario | 4      | 0             | 4          |
| **Total** |                                                    | **65** | **7**         | **58**     |

---

## 🔴 P0 — CRÍTICO: Pilares de la API (por sección de documentación)

Son los decoradores más usados en la documentación y ejemplos. Cualquier regresión silenciosa aquí afectaría a todos los usuarios.

| #   | Página doc                                                                                                                                     | Archivo target                               | Estado          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------- |
| 1   | `guide/qalias.md` — `@QAlias`, roundtrip snake_case, fallback camelCase, alias toma precedencia, `@QAlias` + `@QSensitive`                     | `integration/guide/qalias.test.ts`           | ✅ Implementado |
| 2   | `guide/qdefault.md` — primitivos, factories para tipos referencia, null/undefined, no reemplaza false/0/'', `@QDefault` + `@QReadonly`         | `integration/guide/qdefault.test.ts`         | ✅ Implementado |
| 3   | `guide/nested-models.md` — anidado simple, arrays con `[Model]`, 3 niveles recursivos, roundtrip                                               | `integration/guide/nested-models.test.ts`    | ✅ Implementado |
| 4   | `guide/validation.md` — `@QRule`, `$qCheckRules()`, errores múltiples, múltiples rules por campo, `$qCheckRulesAsync()`                        | `integration/guide/validation.test.ts`       | ✅ Implementado |
| 5   | `guide/qfield.md` — `@QField`, `getFormSchema()` estático e instancia, orden de declaración, metadata extra preservada                         | `integration/guide/qfield.test.ts`           | ✅ Implementado |
| 6   | `guide/qreadonly.md` — `@QReadonly`, `$qCopy()`/`$qPatch()` lanzan `ImmutableFieldError`, herencia, `@QReadonly` + `@QSensitive` + `@QDefault` | `integration/guide/qreadonly.test.ts`        | ✅ Implementado |
| 7   | `guide/sensitive-fields.md` — `@QSensitive`, `includeSensitive`, `toInterface()` no afectado, herencia, composición con `@QReadonly`           | `integration/guide/sensitive-fields.test.ts` | ✅ Implementado |

---

## 🟠 P1 — ALTO: Features frecuentes sin cobertura de integración

| #   | Página doc                             | Escenarios a cubrir                                                                                                                                                                                               | Archivo target                                  | Estado       |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------ |
| 8   | `guide/dot-notation.md`                | Notación punto 1 nivel (`'nested.field': Date`); 2 niveles; comparativa con modelo anidado explícito; sobre clase de terceros sin decoradores                                                                     | `integration/guide/dot-notation.test.ts`        | ❌ Pendiente |
| 9   | `guide/custom-transformers.md`         | Registrar transformer con `QTransformerRegistry.register()`; usarlo en `@Quick()`; serialize produce salida correcta; reconstruct aplica el transformer inverso; deregistrar no rompe instancias ya creadas       | `integration/guide/custom-transformers.test.ts` | ❌ Pendiente |
| 10  | `guide/forms.md` + `guide/formdata.md` | `qCheckRules()` desde módulo `forms`; `qCheckRulesByGroup()`; `qCheckRulesAsync()` con timeout; construcción desde `FormData` con tipos transformados; composición `@QField` + `@QGroup` + `qCheckRulesByGroup()` | `integration/guide/forms-formdata.test.ts`      | ❌ Pendiente |
| 11  | `guide/per-class-config.md`            | `unknownPropertyPolicy: 'strip'/'keep'/'error'` a nivel de clase; `disableSafetyChecks`; `transformCase: 'snake'/'camel'/'kebab'` en input y output; override de config global por clase                          | `integration/guide/per-class-config.test.ts`    | ❌ Pendiente |
| 12  | `guide/collection.md`                  | `QModelCollection.from()`; `.filter()`; `.mapBy()`; `.groupBy()`; `.sortBy()`; métodos `$q*` de la colección; `QModelCollection.fromArray()` roundtrip                                                            | `integration/guide/collection.test.ts`          | ❌ Pendiente |
| 13  | `guide/serialization.md`               | `$qSerialize()` completo con todos los tipos complejos; `toJSON()` / `$qFromJSON()` roundtrip con `BigInt`+`Date`+`Map`+`Set`; `$qToInterface()` devuelve valores originales; `$qDeserializeJson()` static        | `integration/guide/serialization-full.test.ts`  | ❌ Pendiente |
| 14  | `guide/validators.md`                  | `@IsEmail`, `@Min`, `@Max`, `@MaxLength`, `@MinLength`, `@NotEmpty`, `@Pattern`; composición de varios validators en un campo; composición con `@QRule`; `validationReport()` incluye mensajes de validators      | `integration/guide/validators.test.ts`          | ❌ Pendiente |

---

## 🟡 P2 — MEDIO: Features específicas y edge cases

| #   | Página doc                         | Escenarios a cubrir                                                                                                                                                                                             | Archivo target                                      | Estado       |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------ |
| 15  | `guide/unknown-property-policy.md` | `'strip'` elimina campos extra; `'keep'` los conserva; `'error'` lanza; override por clase vs. global; campos extra en modelos anidados con distintas políticas                                                 | `integration/guide/unknown-property-policy.test.ts` | ❌ Pendiente |
| 16  | `guide/reserved-words.md`          | Campos que colisionan con nombres de métodos de `QModel` (`status`, `create`, `serialize`); campos que empiezan por `$`; campos con nombre de propiedades JS reservadas (`constructor`, `prototype`)            | `integration/guide/reserved-words.test.ts`          | ❌ Pendiente |
| 17  | `guide/fromurl.md`                 | `QModel.fromURL()` con `URL`; con `URLSearchParams`; transformación de tipos (string → number, string → boolean); campos multi-valor en query string; campos ausentes aplican `@QDefault`                       | `integration/guide/fromurl.test.ts`                 | ❌ Pendiente |
| 18  | `guide/i18n.md`                    | Mensajes de error en español e inglés; `setLocale()` cambia mensajes de `QModelError`; mensajes de `@QRule` no se alteran (son del usuario); reset a locale por defecto                                         | `integration/guide/i18n.test.ts`                    | ❌ Pendiente |
| 19  | `guide/tracing.md`                 | `QConfig` trace con `sink` captura eventos `transformer`; campos sin transformación no emiten evento `transformer`; herencia: traza incluye campos de padre y de hijo; `verbosity: 'silent'` no rompe el modelo | `integration/guide/tracing.test.ts`                 | ❌ Pendiente |
| 20  | `guide/migrations.md`              | `@QVersion` en modelo; payload versión 1 → deserialize → modelo versión 2; `migrate()` aplica la función de migración; varios saltos de versión encadenados                                                     | `integration/guide/migrations.test.ts`              | ❌ Pendiente |
| 21  | `guide/iq-implements.md`           | `IQImplements<T, U>` garantiza que tipo de instancia coincide con la interfaz; roundtrip seguro con el type map; `$qToInterface()` devuelve `T` correcto; uso con `IQAliasedSerializedInterface`                | `integration/guide/iq-implements.test.ts`           | ❌ Pendiente |
| 22  | `guide/aliases.md` (`@QGroup`)     | `@QGroup('nombre')` en varios campos; `getFormSchema()` agrupa correctamente; `qCheckRulesByGroup('nombre')` valida solo ese grupo; un campo en múltiples grupos; grupo vacío no lanza                          | `integration/guide/qgroup.test.ts`                  | ❌ Pendiente |

---

## 🟢 P3 — BAJO: Validación de snippets de ejemplos y herramientas MCP

| #   | Sección                                                           | Escenarios a cubrir                                                                                                | Archivo target                                                                                                  | Estado       |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------ |
| 23  | `examples/basic.md`, `computed.md`, `batch-readonly.md`           | Cada snippet de código del ejemplo compila y produce el resultado documentado                                      | `integration/examples/basic.test.ts`, `computed.test.ts`, `batch-readonly.test.ts`                              | ❌ Pendiente |
| 24  | `examples/mocks.md`, `api-models.md`, `forms.md`, `validation.md` | Ídem para los ejemplos de estas páginas                                                                            | `integration/examples/mocks.test.ts`, etc.                                                                      | ❌ Pendiente |
| 25  | `mcp/public/` — herramientas públicas                             | Cada tool MCP con un escenario completo end-to-end: input real → execute → output válido (no solo smoke test)      | `tests/mcp/integration/tools/simulate-transformation.test.ts`, `roundtrip.test.ts`, `search-docs.test.ts`, etc. | ❌ Pendiente |
| 26  | `mcp/internal/` — herramientas internas                           | `manage-proposal`: add + list + get-next-id encadenados; `create-guide-page`: crea par EN+ES + registra en sidebar | `tests/mcp/integration/tools/manage-proposal.test.ts`, `create-guide-page.test.ts`                              | ❌ Pendiente |
| 27  | `integrations/jest-integration.md`                                | Test real usando `expect().toMatchQModel()` contra un modelo con tipos transformados                               | `integration/external/jest-matchers.test.ts`                                                                    | ❌ Pendiente |
| 28  | `integrations/websocket-integration.md`                           | Ciclo completo: modelo → `toJSON()` → simular envío WS → `$qFromJSON()` → valores preservados con tipos correctos  | `integration/external/websocket-cycle.test.ts`                                                                  | ❌ Pendiente |

---

## 🔵 B — Combinaciones cross-feature

Los tests unitarios prueban cada decorador en aislamiento. Los tests cross-feature validan que **varios decoradores interactúan correctamente cuando se aplican juntos** al mismo modelo.

### B-1 — Cuatro decoradores de negocio en el mismo modelo

**Archivo:** `tests/integration/cross-feature/decorators-combined.test.ts`  
**Motivación:** Un bug en el orden de aplicación puede hacer que el `@QDefault` se aplique antes del transformer de tipo, o que `@QRule` reciba el valor pre-alias.

| Caso                                                                   | Descripción                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@QAlias` + `@QDefault` en mismo campo                                 | El alias se resuelve en input; el default se aplica si el valor (por alias o camelCase) es `null`/`undefined` |
| `@QAlias` + `@QRule`                                                   | La rule recibe el valor ya con el nombre interno (camelCase), no el alias                                     |
| `@QDefault` + `@QRule`                                                 | La rule se ejecuta sobre el valor ya con el default aplicado, no sobre `undefined`                            |
| `@QSensitive` + `@QAlias` + `@QRule`                                   | Serialize excluye el campo; `checkRules()` lo valida igualmente                                               |
| Los cuatro juntos (`@QAlias` + `@QDefault` + `@QSensitive` + `@QRule`) | Flujo completo: input por alias → default si ausente → rule valida el valor normalizado → serialize excluye   |

---

### B-2 — Herencia multinivel con múltiples decoradores

**Archivo:** `tests/integration/cross-feature/decorators-combined.test.ts`  
**Motivación:** La herencia de `@QSensitive` e `@QReadonly` estaba rota (ya corregida en P0). Pero 3 niveles con ambos decoradores a la vez no está probado.

| Caso                                                               | Descripción                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `Base(@QSensitive)` → `Middle(@QReadonly en campo base)` → `Child` | El child hereda ambos: serialize excluye Y copy() lanza               |
| `Base(@QDefault)` → `Child(@QRule sobre ese campo)`                | La rule en child se ejecuta sobre el default del padre                |
| `Base(@QAlias)` → `Child` agrega `@QSensitive` al mismo campo      | ¿Se pierde el alias? ¿Se excluye de serialize por alias o por nombre? |

---

### B-3 — Flujo completo de formulario: `@QField` + `@QGroup` + `checkRulesByGroup()`

**Archivo:** `tests/integration/cross-feature/forms-complete-flow.test.ts`  
**Motivación:** `@QField` describe el esquema, `@QGroup` agrupa, y `qCheckRulesByGroup()` valida por grupo. El flujo completo (schema → grupos → validar → error por grupo) nunca se prueba en integración.

| Caso                                                                                     | Descripción                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `getFormSchema()` respeta el orden de `@QGroup`                                          | Los campos agrupados aparecen juntos              |
| `qCheckRulesByGroup('personal')` solo valida ese grupo                                   | Errores de otros grupos no se incluyen            |
| `qCheckRulesByGroup('address')` en un modelo válido en personal pero inválido en address | `valid: false` con solo errores del grupo address |
| Roundtrip: serialize → reconstruct → `getFormSchema()` igual                             | El schema es estable tras reconstruct             |

---

### B-4 — `@QComputed` + serialize + herencia

**Archivo:** `tests/integration/cross-feature/computed-serialization.test.ts`  
**Motivación:** Los campos computados con `@QComputed` tienen lógica de inclusión en serialize que no está probada en combinación con herencia ni con `@QSensitive`.

| Caso                                                     | Descripción                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `@QComputed` aparece en `$qSerialize()` por defecto      | El campo computado se incluye en el output                                           |
| `@QComputed` + `@QSensitive`                             | El campo computado se excluye salvo `includeSensitive: true`                         |
| `Base` tiene `@QComputed`, `Child` lo hereda             | `Child.$qSerialize()` incluye el campo computado del padre                           |
| `@QComputed` depende de otro campo transformado (`Date`) | El valor computado se calcula sobre el `Date` ya transformado, no el string original |

---

### B-5 — `@QAlias` + type transformer + roundtrip completo

**Archivo:** `tests/integration/cross-feature/alias-transformer-roundtrip.test.ts`  
**Motivación:** El P0 de qalias prueba alias sin transformación de tipo. Combinarlos es un escenario real (API snake_case que devuelve fechas como strings).

| Caso                                                           | Descripción                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `@QAlias('created_at')` + `@Quick({ createdAt: Date })`        | Input `{ created_at: '2026-01-01' }` → `model.createdAt` es `Date` |
| Serialize produce `{ created_at: '2026-01-01T00:00:00.000Z' }` | La serialización aplica alias Y serializa el Date a string         |
| `$qFromJSON()` del output → mismo `Date`                       | Roundtrip completo preserva el tipo                                |
| `toJSON()` produce JSON válido con alias snake_case            | El JSON puede parsearse directamente                               |

---

### B-6 — `@QDefault` (factory) + `@QRule` + `$qToInterface()`

**Archivo:** `tests/integration/cross-feature/decorators-combined.test.ts`  
**Motivación:** `$qToInterface()` debe devolver el valor post-default, post-transformación. `@QRule` debe recibir ese mismo valor.

| Caso                                                                     | Descripción                                                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Campo ausente → default aplicado → `$qToInterface()` devuelve el default | `toInterface().tags` es `[]`, no `undefined`                                              |
| `@QRule` recibe el valor post-default                                    | Si la rule valida `val.length > 0`, un campo con default `[]` falla la rule correctamente |
| Default de tipo `Date` → `$qToInterface()` devuelve `Date`, no string    | El transformer no se aplica dos veces                                                     |

---

## 🔵 C — QConfig global como integración real

Los unit tests de `QConfig` prueban la configuración en aislamiento. Estos tests validan que **cambiar la config global afecta el comportamiento de modelos ya definidos** y que no existe contaminación entre tests.

**Archivo:** `tests/integration/qconfig/global-config-propagation.test.ts`

| #   | Caso                                                                       | Descripción                                                                                                           |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| C-1 | `transformCase` global afecta a todos los modelos sin política explícita   | `QConfig.configure({ defaults: { transformCase: 'snake' } })` → modelo sin config propia ya acepta y emite snake_case |
| C-2 | Modelo con config explícita overrides global                               | Modelo con `@Quick({}, { transformCase: 'camel' })` no se ve afectado por el global snake                             |
| C-3 | `unknownPropertyPolicy: 'error'` global → modelo sin política propia lanza | Propiedad desconocida en construcción → `QModelError` con info del campo                                              |
| C-4 | `QConfig.reset()` limpia sin contaminación                                 | Tras `configure()` → `reset()` → nuevo modelo usa defaults de fábrica                                                 |
| C-5 | `validationStrategy: 'lazy'` vs `'eager'`                                  | Con `'lazy'`, `checkRules()` no se ejecuta en construcción; con `'eager'` sí lanza en `new Model()`                   |
| C-6 | Config de `dateStrategy` global                                            | `dateStrategy: 'timestamp'` → `Date` serializa como número; `'iso'` → string ISO                                      |

---

## 🔵 D — Estado mutable: flujos completos

Los unit tests de `isDirty` / `copy` / `patch` / `reset` existen pero de forma aislada. Estos tests validan **flujos completos de ciclo de vida del estado**.

**Archivo:** `tests/integration/model-state/mutable-flow.test.ts`

| #   | Caso                                                                                    | Descripción                                                                                                                                |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | `create()` → `$qPatch()` × 3 → `$qGetDirtyFields()` → `$qReset()` → `$qIsDirty()` false | Flujo completo de edición y reset                                                                                                          |
| D-2 | `$qCopy()` encadenado: original → copia1 → copiar copia1 → el original no se muta       | Inmutabilidad de `$qCopy()` bajo cambios encadenados                                                                                       |
| D-3 | `createMany()` con datos mixtos + `checkRules()` en batch                               | `createMany([valid, invalid, valid])` → los válidos pasan, el inválido tiene errores; el array se crea igualmente                          |
| D-4 | `$qPatch()` en modelo con `@QReadonly` + `@QDefault`                                    | Patch de campo no-readonly: funciona. Campo con default pero no-readonly: el patch cambia el valor (el default no se restablece con patch) |
| D-5 | `$qCopy()` de modelo con `@QAlias` + `@QDefault` + `@QSensitive`                        | La copia hereda alias map, defaults y sensitive fields del original                                                                        |

---

## 🔵 E — Transformers complejos en modelos reales

Los transformers tienen unit tests pero no hay integración que valide combinaciones de transformers en un modelo real con roundtrip completo.

**Archivo:** `tests/integration/transformers/complex-types-roundtrip.test.ts`

| #   | Caso                                                                            | Descripción                                                                                                   |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| E-1 | Modelo con `BigInt` + `Date` + `Map<string, Date>` + `Set<number>`              | Construcción desde plain object → todos los tipos correctos → `$qSerialize()` → reconstrucción → mismo estado |
| E-2 | Modelo con `RegExp` + `Symbol` + `Error`                                        | Serialize preserva la representación; reconstruct produce instancias equivalentes                             |
| E-3 | Modelo anidado con `TypedArray` (`Uint8Array`)                                  | Roundtrip por JSON (`toJSON()` → `$qFromJSON()`) preserva el contenido del array                              |
| E-4 | Custom transformer registrado globalmente → usado en modelo anidado → roundtrip | El transformer se aplica a todos los niveles del anidado; deregister no corrompe instancias existentes        |

---

## 🔵 F — Generación de schema como integración real

Existen unit tests para cada `*SchemaGenerator`, pero no hay tests que validen que **el schema generado es correcto para modelos complejos** (con alias, anidado, etc.) ni que el schema puede usarse directamente para validar.

**Archivo:** `tests/integration/schema/schema-generation-integration.test.ts`

| #   | Caso                                                                 | Descripción                                                                                          |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| F-1 | Modelo con `@QAlias` + tipos complejos → `getSchema('json')`         | El JSON Schema resultante usa los nombres alias en `properties`, no los nombres camelCase del modelo |
| F-2 | `getSchema('zod')` → código ejecutable                               | El string generado es código Zod válido que acepta los mismos datos que el modelo                    |
| F-3 | `getSchema('openapi')` de modelo con `@QField({ required: true })`   | Los campos `required: true` en `@QField` se mapean a `required[]` en el schema OpenAPI               |
| F-4 | `$qFromSchema({ format: 'json', schema: {...} })` → modelo funcional | El modelo generado desde schema acepta datos válidos y rechaza los inválidos                         |
| F-5 | Schema de modelo anidado incluye `$defs` / `$ref` correctos          | El schema JSON del modelo con `profile: Profile` referencia correctamente la definición de `Profile` |

---

## 🔵 G — Flujos de error y recuperación

Existen unit tests de errores, pero no tests que validen que **un error en construcción no corrompe el estado global** ni que el sistema se recupera correctamente.

**Archivo:** `tests/integration/errors/error-recovery.test.ts`

| #   | Caso                                                                         | Descripción                                                                                       |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| G-1 | Construcción fallida no contamina el modelo de la siguiente construcción     | `try { new Model(badData) } catch {}` → `new Model(goodData)` funciona correctamente              |
| G-2 | `$qDeserializeJson()` con JSON inválido → `QModelError` con información útil | El error incluye el campo problemático y el valor recibido                                        |
| G-3 | `@QRule` async con timeout configurado → `QRuleTimeoutError` controlado      | Predicate que tarda más que `timeoutMs` → error síncrono descriptivo, no promise pendiente        |
| G-4 | Error en transformer custom → no corrompe el registry                        | Si el transformer lanza en `transform()`, otros modelos con otros transformers siguen funcionando |
| G-5 | `unknownPropertyPolicy: 'error'` en modelo anidado                           | El error identifica en qué nivel del anidado se encontró la propiedad desconocida                 |

---

## 🔵 H — TC39 decorators a nivel de integración

Solo existen unit tests en `tests/compat/ts5/`. No hay tests de integración end-to-end con los decoradores estándar TC39 en combinación con features de negocio.

**Archivo:** `tests/integration/tc39/decorators-tc39-integration.test.ts`

| #   | Caso                                                            | Descripción                                                                                    |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| H-1 | Modelo TC39 con `@QAlias` + `@QDefault` + roundtrip completo    | Los decoradores TC39 producen el mismo comportamiento que los legacy en input/output/roundtrip |
| H-2 | Modelo TC39 heredando modelo TC39 padre con `@QSensitive`       | El hijo hereda los campos sensibles; `$qSerialize()` los excluye                               |
| H-3 | Modelo TC39 + `@QRule` + `$qCheckRulesAsync()`                  | Las rules async funcionan con la syntax de campos `!` (sin `declare`)                          |
| H-4 | Mezcla: clase padre con `experimentalDecorators`, hijo con TC39 | La herencia cross-syntax no rompe los metadatos de ninguna de las dos                          |

---

## 🔵 I — Mocks con decoradores de negocio

Solo existe `tests/integration/mocks/mock-generator-real-world.test.ts` con un caso básico. No hay tests que validen la interacción del generador de mocks con decoradores de negocio.

**Archivo:** `tests/integration/mocks/mock-with-decorators.test.ts`

| #   | Caso                                                                 | Descripción                                                                              |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| I-1 | `random()` en modelo con `@QDefault`                                 | Los campos sin transformer respetan el default si el mock no genera valor para ellos     |
| I-2 | `random()` en modelo con `@QReadonly`                                | Los campos readonly tienen valores generados al mockear (la construcción está permitida) |
| I-3 | `seed(n)` → dos llamadas con mismo seed → mismos valores             | La función de seed produce resultados deterministas en un modelo complejo                |
| I-4 | `createMany(50, 'random')` → todos válidos según `$qCheckRules()`    | El generador aleatorio respeta las constraints de las rules cuando es posible inferirlas |
| I-5 | Mock de modelo anidado → cada nivel es instancia del modelo correcto | `random()` en `User` con `profile: Profile` → `result.profile instanceof Profile`        |

---

## 🔵 J — E2E de features documentadas sin escenario usuario

Los e2e existentes (`e-commerce-flow`, `user-registration-flow`) son simples. Faltan escenarios que ejerciten combinaciones de features documentadas.

**Archivo:** `tests/integration/e2e/complete-workflows.test.ts`

| #   | Caso                                                                                           | Descripción                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J-1 | API REST simulada: JSON snake_case → aplicar transformaciones → validar → serializar respuesta | Input: `{ user_id: '1', created_at: '2026-01-01', api_key: 'sk...' }` → modelo con `@QAlias`+`@QSensitive`+`Date` → `checkRules()` → serialize (sin api_key) → en formato snake_case    |
| J-2 | Formulario web completo                                                                        | `@QField` + `@QGroup` + `@QRule` → `getFormSchema()` → simular submit → `qCheckRulesByGroup()` por sección del formulario → errores por grupo → corregir → re-validar → `$qSerialize()` |
| J-3 | Migración de versión de payload                                                                | Payload legado v1 → `@QVersion` con función migrate → modelo v2 con campos nuevos → serialize v2 → reconstruct v2 → valores correctos                                                   |
| J-4 | Importación masiva con validación parcial                                                      | `createMany(100, predefinedData)` donde 20% tienen errores → `checkRules()` en batch → conteo de válidos/inválidos → solo serializar los válidos                                        |

---

## 🗂️ Estructura de carpetas completa

```
tests/integration/
├── guide/                              ← por sección de documentación
│   ├── qalias.test.ts                  ✅ P0
│   ├── qdefault.test.ts                ✅ P0
│   ├── nested-models.test.ts           ✅ P0
│   ├── validation.test.ts              ✅ P0
│   ├── qfield.test.ts                  ✅ P0
│   ├── qreadonly.test.ts               ✅ P0
│   ├── sensitive-fields.test.ts        ✅ P0
│   ├── dot-notation.test.ts            ← P1
│   ├── custom-transformers.test.ts     ← P1
│   ├── forms-formdata.test.ts          ← P1
│   ├── per-class-config.test.ts        ← P1
│   ├── collection.test.ts              ← P1
│   ├── serialization-full.test.ts      ← P1
│   ├── validators.test.ts              ← P1
│   ├── unknown-property-policy.test.ts ← P2
│   ├── reserved-words.test.ts          ← P2
│   ├── fromurl.test.ts                 ← P2
│   ├── i18n.test.ts                    ← P2
│   ├── tracing.test.ts                 ← P2
│   ├── migrations.test.ts              ← P2
│   ├── iq-implements.test.ts           ← P2
│   └── qgroup.test.ts                  ← P2
├── examples/                           ← P3: snippets de docs/examples/
│   ├── basic.test.ts
│   ├── computed.test.ts
│   ├── batch-readonly.test.ts
│   ├── mocks.test.ts
│   ├── api-models.test.ts
│   └── forms.test.ts
├── cross-feature/                      ← B: combinaciones de decoradores
│   ├── decorators-combined.test.ts
│   ├── forms-complete-flow.test.ts
│   ├── computed-serialization.test.ts
│   └── alias-transformer-roundtrip.test.ts
├── qconfig/                            ← C: config global como integración
│   └── global-config-propagation.test.ts
├── model-state/                        ← D: flujos de estado mutable
│   └── mutable-flow.test.ts
├── transformers/                       ← E: transformers complejos combinados
│   └── complex-types-roundtrip.test.ts
├── schema/                             ← F: generación de schema como integración
│   └── schema-generation-integration.test.ts
├── errors/                             ← G: flujos de error y recuperación
│   └── error-recovery.test.ts
├── tc39/                               ← H: TC39 level integración
│   └── decorators-tc39-integration.test.ts
├── mocks/                              ← I: mocks con decoradores de negocio
│   └── mock-with-decorators.test.ts
└── e2e/                                ← J: escenarios de usuario completos
    └── complete-workflows.test.ts
```

---

## 📏 Criterios de calidad para todos los tests de integración

1. **Traza directa a la doc** — el `describe()` raíz cita explícitamente la página (`guide/qalias.md`) o la categoría (`cross-feature/B-1`).
2. **Snippets reales** — los modelos y llamadas son los mismos que aparecen en la documentación.
3. **Sin mocks del core** — se usa la API pública real (`@Quick`, `@QAlias`, etc.), no stubs internos.
4. **Cross-feature** — al menos un test por archivo combina la feature con otra decoradora.
5. **Roundtrip** — cuando la doc muestra un roundtrip (serializar → reconstruir), el test lo valida.
6. **`unknownPropertyPolicy: 'keep'`** — los modelos declarados en scope de `describe()` (antes del `beforeEach`) deben incluir esta opción para evitar que el setup global de `QConfig.reset()` afecte al modelo ya registrado.
7. **Sin efectos secundarios en el registry** — si el test registra un custom transformer, debe deregistrarlo en `afterEach` para no contaminar otros tests.
