# QuickModel - Tareas Pendientes y Propuestas

> **Fecha de revisión:** 26 de julio de 2026 (actualizado)
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)
> **Estado actual:** 4358+ tests passing | Cobertura >97% líneas | v1.0.0 | 38 guías EN+ES

> **Documento único de planificación.** Contiene el historial resumido de tareas completadas y el backlog de
> propuestas para sprints futuros (Mar 2026+).
> Documentos históricos en archivo: [`.archived/PENDING_CONFIGS.md`](../../.archived/PENDING_CONFIGS.md) · [`.archived/REFACTORING.md`](../../.archived/REFACTORING.md)

## 📊 Progreso General

```
✅ Completadas: Tasks #1–#59 + Task #48 + Propuestas A–H, I, J, L, M–Q, R–V (todas las activas)
⚠️ Diferidas:   K (plugin system)
```

---

## ✅ Historial de tareas completadas

| #   | Tarea                                                                                | Commit / Detalle          |
| --- | ------------------------------------------------------------------------------------ | ------------------------- | --- | --- | -------------------------------------------------------------------- | ---------- |
| 1   | Remover `console.log` de producción                                                  | `2be2df2`                 |
| 2   | MCP tools coverage 50% → 80%                                                         | `5e80d64`                 |
| 2.5 | Schema Generation API — 7 formatos                                                   | `b9bb875`                 |
| 3   | Composed transformers — edge cases                                                   | `1c44266` +15 tests       |
| 4   | WeakMap/WeakSet transformers                                                         | +14 tests                 |
| 5   | MCP Prompts/Skills documentados EN+ES                                                | `4457821`                 |
| 6   | `excludeFields` en `@Quick()` — serialización permanente                             | `6de834f` +9 tests        |
| 7   | Error path coverage MCP public tools                                                 | `d698566` 1578→1602 tests |
| 8   | Refactor sidebar `buildMcpSidebar` helper                                            | `55e2a59`                 |
| 9   | Console.log DEBUG eliminados de `config.ts`, imports huérfanos                       | —                         |
| 10  | Docs `excludeFields` + `omit`/`pick` EN+ES                                           | —                         |
| 11  | Truncar `safeStringify` a 500 chars — prevención info-leak                           | —                         |
| 12  | Warning activo cuando `disableSafetyChecks` está habilitado                          | —                         |
| 13  | Script `release:check` en `package.json`                                             | —                         |
| 14  | Tests negativos `JsonSchemaGenerator` con tipos sin transformer                      | ✅ COMPLETADA             |
| 15  | Tests específicos para `disableSafetyChecks`                                         | —                         |
| 16  | Tests de `transformCase` con herencia multinivel                                     | —                         |
| 17  | Performance benchmarks comparativos (Zod + PlainJS) + gráfica landing                | 23 Feb 2026               |
| 18  | `@QComputed()` / `exposeComputedFields` — computed props serialización               | —                         |
| 19  | `QTransformerRegistry.snapshot()/restore()`                                          | —                         |
| 20  | `@QRule` async predicados                                                            | `a714b2e`                 |
| 21  | Guía integración NestJS                                                              | —                         |
| 22  | ~~Deprecation warning `unknownPropertyPolicy` + docs `:::warning` v2.0.0~~           | descartado                |
| 23  | `copy()` + `isDirty(field?)` — estado mutable                                        | `a8089a7`                 |
| 24  | `@QRule` decorator + `checkRules()`                                                  | `8a2910b`                 |
| 25  | `hasIntegrity()` + `isValid()` — convenience shortcuts                               | `cd30a8b`                 |
| 26  | `createMany()` — batch creation con validación                                       | `3faf88b`                 |
| 27  | `@QField` + `validationReport()` + `getFormSchema()`                                 | `00d56c7`                 |
| 28  | `QModel.extends()` — simplificación de generics                                      | `4ff1d55`                 |
| 29  | `@QAlias` + `@QGroup` — alias y agrupación                                           | `a714b2e`                 |
| 30  | `createReadonly()` refactor + async `checkRules()`                                   | `05bcb8c`                 |
| 31  | Docs nuevas features Feb 2026 — `@QAlias`, `@QGroup`, `@QField`, `getFormSchema()`   | —                         |
| 32  | `checkRulesAsync` — timeout, modo serial/paralelo, `IQRule<T>` genérico              | 22 Feb 2026               |
| 33  | Módulo `./forms` — `qCheckRules`, `qCheckRulesAsync`, `qCheckRulesByGroup`           | 22 Feb 2026               |
| 34  | Angular integration patterns                                                         | 37 tests, guías EN+ES     |
| 35  | React/Next.js integration patterns                                                   | 31 tests, guías EN+ES     |
| 36  | Vue 3/Nuxt integration patterns                                                      | 27 tests, guías EN+ES     |
| 37  | Svelte 5/SvelteKit integration patterns                                              | 21 tests, guías EN+ES     |
| 38  | Express/Fastify/Hono backend patterns                                                | 25 tests, guías EN+ES     |
| 39  | TanStack Query — `queryFn`, mutaciones, optimistic updates con `copy()`              | guías EN+ES               |
| 40  | tRPC — DTOs, middleware, `checkRulesAsync` en procedures                             | 30 tests, guías EN+ES     |
| 41  | Prisma ORM — repositorio, transformación de tipos                                    | 32 tests, guías EN+ES     |
| 42  | Formik + migración desde Zod/Yup                                                     | 26 tests, guías EN+ES     |
| 43  | Mobile — React Native/Expo, Capacitor, Cordova, Ionic                                | 33 tests, guías EN+ES     |
| 44  | React Hook Form — `validate` adapter, esquemas dinámicos                             | guías EN+ES               |
| 45  | Zustand — store con `copy()` inmutable, compat `devtools`/`immer`                    | guías EN+ES               |
| 46  | MSW (Mock Service Worker) — `generate_mock` + `HttpResponse`                         | guías EN+ES               |
| 47  | Redux Toolkit (RTK) — `createSlice`, async thunks                                    | 27 tests, guías EN+ES     |
| 49  | Vitest Custom Matchers — `toBeValidQModel`, `toHaveQRuleError`, etc.                 | ~20 tests, guías EN+ES    |
| 50  | TypeORM — Entity/DTO separation, repositorio                                         | guías EN+ES               |
| 51  | GraphQL / Apollo Server — resolver tipado, `@QComputed`                              | guías EN+ES               |
| 52  | OpenAPI / Swagger — `getSchema('json')` auto-doc                                     | guías EN+ES               |
| 53  | Electron IPC — `serialize()`/`populate()` cross-context                              | guías EN+ES               |
| 54  | Mongoose — ODM MongoDB, `ObjectId` coerción                                          | guías EN+ES               |
| 55  | Storage & Persistence — localStorage, IndexedDB, SQLite                              | 39 tests, guías EN+ES     |
| 56  | Benchmarks extendidos — superjson, arktype, class-validator, vest, joi + Bench #7/#8 | 23 Feb 2026               |
| 57  | Test Runners — Jest, Jasmine, Mocha/Chai, Node:test, AVA                             | 147 tests, guías EN+ES    |
| 58  | `fromFormData()` + `toFormData()` + `toReadableStream()` + Blob/File transformers    | 28 Feb 2026               |
| 48  | Drizzle ORM integration patterns — 35 tests, guía EN+ES, skill MCP                   | 1 Mar 2026                |     | O   | `validate()` método unificado — overloads sync/async, soporte groups | 1 Mar 2026 |
| B   | `QModel.diff(other)` — before/after por campo; `equals()` boolean                    | 1 Mar 2026                |
| M   | `QModel.patch(partial)` — mutación in-place con dirty tracking                       | 1 Mar 2026                |
| C   | `getSchema('valibot')` + `getSchema('yup')` — 2 nuevos generadores                   | 1 Mar 2026                |
| S   | `getSchema('prisma')` — Prisma model block desde metadatos QModel                    | 1 Mar 2026                |

---

## 🆕 PROPUESTAS BACKLOG (Mar 2026+)

> **Análisis:** 28 de febrero de 2026
> Task #48 (Drizzle) completada — 35 tests passing, docs EN+ES, skill MCP incluida.

---

### ✅ Propuesta A — `@QSensitive` decorator _(Completada)_

**Prioridad:** 🔴 Alta
**Impacto:** Alto — seguridad, GDPR, PII
**Completada:** 2026 — `src/core/decorators/qsensitive.decorator.ts` + filtro en `serialize()`. 11 tests.

Marca campos como sensibles. Los excluye de `serialize()` en producción, de mensajes de error `safeStringify` y de logs. Override explícito con `serialize({ includeSensitive: true })`. El mecanismo de `excludeFields` ya existe en `@Quick`; `@QSensitive` es la solución declarativa y semántica de primera clase.

**API propuesta:**

```typescript
@Quick()
class User extends QModel<IUser> {
	@QSensitive()
	declare password: string;

	@QSensitive()
	declare token: string;
}

user.serialize();
// → { id: 1, email: 'a@b.com' }  ← password y token excluidos automáticamente

user.serialize({ includeSensitive: true }); // override explícito
```

**Archivos:**

- `src/core/decorators/qsensitive.decorator.ts` (nuevo)
- `src/core/constants/metadata-keys.ts` — nueva clave `QSENSITIVE_METADATA_KEY`
- `src/core/services/serializer.service.ts` — skip campos `@QSensitive` salvo opción explícita
- `src/core/services/population.service.ts` — excluir del log `safeStringify`
- `src/index.ts` — export `QSensitive`
- `tests/unit/core/decorators/qsensitive.test.ts`
- `docs-vitepress/en/guide/sensitive-fields.md` + ES

---

### ✅ Propuesta B — `QModel.diff(other)` + `equals(other)` _(Completada)_

**Prioridad:** 🔴 Alta
**Completada:** 1 Mar 2026 — `quick.model.ts` líneas 3031–3073. `diff()` retorna `Record<string, { before, after }>` usando valores serializados para comparación consistente de `Date`, `bigint`, etc. `equals()` delega en `diff()` y retorna `boolean`.

```typescript
a.diff(b); // → { name: { before: 'John', after: 'Jane' }, age: { before: 30, after: 31 } }
a.equals(b); // → false
```

---

### ✅ Propuesta C — `getSchema('valibot')` y `getSchema('yup')` _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `ValibotSchemaGenerator` en `valibot-schema-generator.service.ts`, `YupSchemaGenerator` en `yup-schema-generator.service.ts`. Tipos `'valibot'` y `'yup'` añadidos a `IQSchemaType`. Schema API ahora soporta **10 formatos**: json, zod, mongo, typescript, graphql, openapi, ajv, prisma, valibot, yup.

---

### ✅ Propuesta D — `QModelCollection<T>` class _(Completada)_

**Prioridad:** 🔴 Alta
**Impacto:** Alto — complementa y cierra el ciclo de `createMany()`
**Completada:** 2026 — `src/core/models/quick-collection.model.ts` + `QModel.collection()` alias estático. 28 tests.

Wrapper tipado para arrays de modelos QModel con métodos de filtrado, paginación, ordenación y agregación. Cierra el ciclo funcional de `createMany()`.

**API propuesta:**

```typescript
const users = QModelCollection.from(User, rawData);

users
	.where((u) => u.age > 18)
	.sortBy('name')
	.paginate(1, 10)
	.toArray(); // → User[]

users.groupBy('role'); // → Record<string, User[]>
users.serialize(); // → serializa todos los modelos
users.checkAllRules(); // → { valid, errors: { index, field, message }[] }
User.collection(rawData); // alias estático
```

**Archivos:**

- `src/core/models/quick-collection.model.ts` (nuevo)
- `src/collection.ts` — subpath export `quickmodel/collection`
- `tests/unit/core/models/collection.test.ts`
- `docs-vitepress/en/guide/collection.md` + ES

---

### ✅ Propuesta E — I18n de mensajes de validación _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `QConfig.i18n.resolver` + `i18n-messages.service.ts`. 7 tests en `tests/unit/core/config/i18n.test.ts`.

Resolver configurable en `QConfig.i18n` para traducir mensajes de `@QRule` y validators built-in.

```typescript
QConfig.configure({
	i18n: {
		resolver: (key: string, params?: Record<string, unknown>) =>
			t(key, params),
	},
});

@Quick()
class User extends QModel<IUser> {
	@QRule((v) => v.length >= 3, 'validation.name.minLength')
	declare name: string;
}
// → los mensajes se resuelven en tiempo de checkRules() en el idioma activo
```

**Archivos:**

- `src/core/config/quick.config.ts` — añadir `i18n.resolver` a `IQConfig`
- `src/core/decorators/validators.ts` — usar resolver para mensajes built-in
- `src/core/helpers/q-check-rules.ts` — resolver mensajes antes de retornarlos
- `tests/unit/core/config/i18n.test.ts`
- `docs-vitepress/en/guide/i18n.md` + ES

---

### ✅ Propuesta F — `@QDefault` decorator _(Completada — ver entrada definitiva abajo)_

> Implementada el 1 Mar 2026. Ver entrada completa más abajo.

### ✅ Propuesta G — `fromFormData()` + `toFormData()` + transformers Blob/File — **COMPLETADA** (Task #58)

**Completada:** 28 de febrero de 2026
**Resultado:** `BlobTransformer`, `FileTransformer` implementados + API pública `fromFormData()` / `toFormData()` / `toReadableStream()` / `fromStream()` / `pipeStream()` con soporte `fileMode`/`fileSource` (`auto`, `binary`, `reference`, `base64`), per-field overrides via `@QType`, `IQStreamProgress` callback y skill MCP `quickmodel_form_data` documentado EN+ES.

---

### ✅ Propuesta H — `@QTransform` pipeline decorator _(Completada — ver entrada definitiva abajo)_

> Implementada el 1 Mar 2026. Ver entrada completa más abajo.

---

### ✅ Propuesta I — `$qHistory` / History Trail _(Completada — refactorizada 2 Mar 2026)_

**Prioridad:** 🟡 Media
**Completada:** — `quick.model.ts`. Getter `$qHistory` expone `IQHistoryHandle` con soporte para `recordMode: 'operation'` (una entrada por operación, default) y `recordMode: 'field'` (una entrada por campo cambiado). Opt-in por clase o global vía `QConfig`. Tests en `tests/unit/core/services/history.test.ts`.

> ✅ **Re-evaluada y desbloqueada** (1 Mar 2026). La propiedad `history` colisionaría con campos de dominio del usuario; se expone como `$qHistory` siguiendo el patrón `$q*` del resto de la API. El history trail cubre la dimensión **temporal** (traza cronológica de mutaciones), que `$qGetChanges()` y `$qDiff()` no cubren.

> **2 Mar 2026:** Eliminado el sistema `audit` separado — consolidado en `history` con `recordMode: 'field'` para la granularidad por campo.

**Especificación completa:** [AUDIT-TRAIL.md](./AUDIT-TRAIL.md)

```typescript
// Opt-in por clase — zero overhead si no se activa
@Quick({ name: 'string' }, { history: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> {
	declare name: string;
}

contract.$qPatch({ name: 'v2' });
contract.$qPatch({ name: 'v3' });

contract.$qHistory.value;
// → [
//   { method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' } } },
//   { method: 'patch', at: Date, changes: { name: { from: 'v2', to: 'v3' } } },
// ]

// recordMode: 'field' — una entrada por campo cambiado (equivalente al antiguo 'audit')
@Quick({ name: 'string', role: 'string' }, { history: { enabled: true, recordMode: 'field' } })
class Contract2 extends QModel<IContract2> { ... }

contract2.$qPatch({ name: 'v2', role: 'approved' });
contract2.$qHistory.value;
// → [
//   { method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' } } },
//   { method: 'patch', at: Date, changes: { role: { from: 'draft', to: 'approved' } } },
// ]

contract.$qHistory.stop(); // pausa grabación
contract.$qHistory.start(); // reanuda
contract.$qHistory.clear(); // vacía entradas
contract.$qHistory.configure({ maxEntries: 20 });
```

---

### ✅ Propuesta T — `QModel.fromURL(URLSearchParams)` _(Completada)_

**Prioridad:** 🔴 Alta
**Completada:** 1 Mar 2026 — `quick.model.ts` línea 700. Parsea `URLSearchParams` coercionando tipos vía la spec del model (`@Quick()`). Tests en `tests/unit/core/models/from-url.test.ts`. Cierra la triada form/stream/url junto a `fromFormData()` y `toReadableStream()`.

---

### ✅ Propuesta U — `QModelCollection.toCSV()` _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `quick-collection.model.ts`. Exporta la colección a CSV con soporte de `IQCSVOptions` (separador, cabeceras, quote char, columnas). Tests en `tests/unit/model-state/collection-csv.test.ts`.

---

### ✅ Propuesta F — `@QDefault` decorator _(Completada)_

**Prioridad:** 🟢 Baja
**Completada:** 1 Mar 2026 — `src/core/decorators/qdefault.decorator.ts`. Valores por defecto declarativos por campo cuando el valor entrante es `undefined` o `null`. Integrado en `QModel.initialize()` con herencia multinivel. Tests en `tests/unit/core/decorators/qdefault.test.ts`.

---

### ✅ Propuesta P — `@QReadonly` decorator _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `src/core/decorators/qreadonly.decorator.ts`. Campos marcados como readonly lanzan `ImmutableFieldError` si se intenta cambiarlos vía `copy()` o `patch()`. Tests en `tests/unit/core/decorators/qreadonly.test.ts`.

---

### ✅ Propuesta H — `@QTransform` pipeline decorator _(Completada)_

**Prioridad:** 🟢 Baja
**Completada:** 1 Mar 2026 — `src/core/decorators/qtransform.decorator.ts`. Transformaciones post-deserialización composables por campo. Integrado en `QModel.initialize()` 10 tests en `tests/unit/core/decorators/qtransform.test.ts`.

---

### ✅ Propuesta Q — `QModel.configure({})` per-class config _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `quick.model.ts` + `population.service.ts` + `quick.decorator.ts` (explicit options key). Override local por clase sin afectar `QConfig` global. 8 tests en `tests/unit/core/models/per-class-config.test.ts`.

---

### ✅ Propuesta J — `getSchema('drizzle')` y `getSchema('typebox')` _(Completada)_

**Prioridad:** 🟢 Baja
**Completada:** 1 Mar 2026 — `drizzle-schema-generator.service.ts` + `typebox-schema-generator.service.ts`. 10 tests en `tests/unit/core/schemas/drizzle-typebox.test.ts`.

---

### Propuesta K — Plugin system para transformers

**Prioridad:** 🟢 Baja — ⚠️ **RIESGO DE OVER-ENGINEERING**
**Impacto:** Medio — extensibilidad del ecosistema
**Esfuerzo estimado:** 3-4 horas

> **⚠️ Diferida indefinidamente**: El registro ya soporta `QTransformerRegistry.register()` manual. Un sistema de plugins solo aportaría valor real si hubiera un ecosistema de paquetes npm de terceros, lo que requiere una adopción que hoy no existe. **Diferir hasta demanda concreta.**

`QTransformerRegistry.plugin(myPlugin)` para distribuir suites de transformers como paquetes npm. Diferente de `snapshot()/restore()` (que es para test isolation).

```typescript
export const DecimalPlugin: IQTransformerPlugin = {
	name: 'decimal',
	version: '1.0.0',
	transformers: [DecimalTransformer, CurrencyTransformer],
};

QTransformerRegistry.plugin(DecimalPlugin);
```

---

### ✅ Propuesta L — Guía WebSocket / SSE en tiempo real _(Completada)_

**Prioridad:** 🟢 Baja
**Completada:** 1 Mar 2026 — Guía completa con Bun WS, Node.js ws, Next.js App Router SSE, Hono SSE, cliente, validación pre-envío, tips. `docs-vitepress/en/guide/websocket-sse.md` + ES.

---

### ✅ Propuesta M — `QModel.patch(partial)` mutable in-place _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `quick.model.ts` línea 2886. Muta la instancia actual preservando dirty tracking via `isDirty()` / `getChanges()`.

---

### ✅ Propuesta N — `@QVersion` + schema migrations _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `src/core/decorators/qversion.decorator.ts` + `src/core/services/migration.service.ts`. 9 tests en `tests/unit/core/decorators/qversion.test.ts`.

Decorator de versión + sistema de migraciones para reconstruir instancias desde datos de esquemas anteriores. Complementa Task #55.

```typescript
@Quick()
@QVersion(2, {
	migrations: {
		1: (data) => ({
			...data,
			fullName: `${data.firstName} ${data.lastName}`,
		}),
	},
})
class User extends QModel<IUser> {
	declare fullName: string; // v2: campo unificado
}

// Al leer desde localStorage (datos v1):
const user = new User({ firstName: 'Alice', lastName: 'M.', _v: 1 });
// → migración automática: { fullName: 'Alice M.', _v: 2 }
```

**Archivos:**

- `src/core/decorators/qversion.decorator.ts` (nuevo)
- `src/core/services/migration.service.ts` (nuevo)
- `tests/unit/core/decorators/qversion.test.ts`
- `docs-vitepress/en/guide/migrations.md` + ES

---

### ✅ Propuesta O — `validate()` método unificado _(Completada)_

**Prioridad:** 🔴 Alta
**Completada:** 1 Mar 2026 — `quick.model.ts` línea 2159. Overloads para sync/async, soporte `groups`, retorna `IQValidateResult` con `{ valid, integrity, rules }`.

---

### ✅ Propuesta P — `@QReadonly` decorator _(Completada — ver entrada definitiva arriba)_

> Implementada el 1 Mar 2026. Ver entrada completa en la sección anterior.

---

### ✅ Propuesta Q — `User.configure({})` per-class config _(Completada — ver entrada definitiva arriba)_

> Implementada el 1 Mar 2026. Ver entrada completa en la sección anterior.

---

### ✅ Propuesta R — CLI `bunx quickmodel generate` _(Completada)_

**Prioridad:** 🟡 Media
**Impacto:** Medio-alto — DX para nuevos usuarios, scaffolding rápido
**Esfuerzo estimado:** ~~6-8 horas~~ **2-3 horas** — la infraestructura ya existía
**Completada:** 2026 — `src/cli/generate.command.ts` + rama `generate` en `mcp-cli.ts`. 35 tests.

> **✅ Infraestructura existente:** `bin.quickmodel` ya está declarado en `package.json` y `src/mcp-cli.ts` ya tiene el esqueleto del CLI con el comando `mcp`. Solo falta añadir el subcomando `generate` al mismo fichero o en un módulo auxiliar.

```bash
bunx quickmodel generate model User --fields "id:number,name:string,email:string"
bunx quickmodel generate transformer Decimal
bunx quickmodel generate integration prisma
```

**Archivos:**

- `src/mcp-cli.ts` — añadir rama `else if (command === 'generate')` (el fichero ya existe)
- `src/cli/generate.command.ts` (nuevo) — lógica del subcomando

---

### ✅ Propuesta S — `getSchema('prisma')` _(Completada)_

**Prioridad:** 🟡 Media
**Completada:** 1 Mar 2026 — `prisma-schema-generator.service.ts` + `'prisma'` en `IQSchemaType`. Cierra el circuito con Task #41.

---

### 🆕 Propuesta W — Actualizar majors de devDependencies _(Rama `chore/update-majors`)_

**Prioridad:** 🟠 Alta (técnica)
**Impacto:** Medio — alinea con el ecosistema 2026 y elimina deuda de mantenimiento
**Esfuerzo:** ~2 h realizadas (toolchain estabilizado) + trabajo futuro cuando el ecosistema se actualice
**Rama:** `chore/update-majors` (en origin, trabajo parcial completado)
**Estado:** ⏸️ Toolchain estabilizado — majors no viables quedan diferidos

#### Contexto

El 26 de julio de 2026, dependabot abrió 6 PRs de bumps de major. Tras verificar el [GitHub Advisory Database](https://github.com/advisories), **ninguno aporta valor de seguridad** (0 CVEs abiertos en versiones actuales). Se mergeó a la rama `chore/update-majors` y se diagnosticó empíricamente qué falla.

#### Hallazgos del diagnóstico empírico (26 Jul 2026)

La combinación completa de majors propuesta por dependabot **no es viable** porque el ecosistema no está alineado:

| Majors propuestos                         | Estado real | Razón                                                                                                                                    |
| ----------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| typescript 5.9.3 → **7.0.2**              | ❌ **Roto** | `typescript-eslint@8.65` rechaza TS7 explícitamente: _"typescript-eslint does not support TS 7.0"_. No existe `typescript-eslint@9` aún. |
| typescript 5.9.3 → **6.0.3**              | ❌ **Roto** | TS6.0.3 tiene un typo en `lib.dom.d.ts` (`0x000tfff00001` con una `t` extra) que lo hace no parseable. La 6.0.2 también.                 |
| eslint 9.39.5 → **10.8.0**                | ❌ **Roto** | ESLint 10 elimina `.eslintrc.js` y no tiene peer compatible con `typescript-eslint@8`.                                                   |
| @types/node 25.2.1 → **26.1.1**           | ❌ **Roto** | Requiere TS ≥6.5; incompatible con TS5.9.3 y con TS6.0.3.                                                                                |
| @semantic-release/git 10.0.1 → **11.0.1** | ✅ **OK**   | Sin conflictos de peer deps.                                                                                                             |
| lint-staged 16.4.0 → **17.2.0**           | ✅ **OK**   | Requiere Node ≥20. Validado.                                                                                                             |
| vest 5.4.6 → **6.3.2**                    | ✅ **OK**   | No se usa en `src/`, solo en benchmarks.                                                                                                 |

#### Trabajo realizado en `chore/update-majors` (commits)

- `c9216d4` W.1 (revertido): migración a TS7 — era válido pero dejó el repo en estado roto por las incompatibilidades posteriores.
- `159353b` Propuesta W inicial — análisis optimista previo al diagnóstico empírico.
- `648ecbd`–`ede8bc5` (×6) Bumps de majors de dependabot mergeados.
- `2aa67cf` **Estabilización**: pin del toolchain a la última combinación viable (TS5.9.3 + ESLint 9.39.5 + @types/node 24.13.3 + @typescript-eslint 8.54.0) y conservación de los majors sin conflictos (@semantic-release/git 11, lint-staged 17, vest 6, @commitlint 21, class-validator 0.15, eslint-plugin-security 4).

**Validación del commit `2aa67cf`:**

- `tsc --noEmit` (6 tsconfigs) → 0 errores
- `bun run lint` → 0 errores, 0 warnings
- 414 transformers + 43 decorators + 57 collections + 1130 core tests → todos pasan

#### Trabajo pendiente (cuando el ecosistema esté listo)

```
W.A  Cuando se publique typescript-eslint@9:
      - Bump typescript a 7.x
      - Bump eslint a 10.x
      - Bumpear @typescript-eslint/*@9
      - Aplicar reglas nuevas (ej. no-unnecessary-type-assertion) y corregir
        las 291 ocurrencias en src/ y tests/.

W.B  Cuando TS7 sea adoptable:
      - W.1 ya está hecho (tsconfig.json migrado a paths con ./).
      - Aplicarlo de nuevo ahora que el resto está alineado.

W.C  Cuando se publique @types/node@26 (o >) compatible con TS5.9.3:
      - Bump @types/node a la última 24.x o esperar a 26.x con TS7.
```

#### Cómo retomar el trabajo

```bash
git fetch origin
git checkout chore/update-majors
git log --oneline  # ver el historial de estabilización
bun install        # regenera lockfile
bunx tsc --noEmit -p tsconfig.json  # debe pasar limpio
bun run lint                          # debe pasar limpio
```

#### Estado de los PRs originales

Las 6 ramas `origin/dependabot/npm_and_yarn/*` y sus 6 PRs se cerraron con comentario enlazando a esta propuesta. Se borraron del remoto.

## 📊 Resumen priorizado de propuestas

| Prop  | Nombre                                                                     | Prioridad     | Esfuerzo | Impacto    | Relación con existente                             |
| ----- | -------------------------------------------------------------------------- | ------------- | -------- | ---------- | -------------------------------------------------- |
| ~~A~~ | ~~`@QSensitive`~~                                                          | ✅ Completada | —        | —          | qsensitive.decorator.ts — 2026                     |
| ~~B~~ | ~~`QModel.diff()` + `equals()`~~                                           | ✅ Completada | —        | —          | quick.model.ts:3031 — 1 Mar 2026                   |
| ~~C~~ | ~~`getSchema('valibot'/'yup')`~~                                           | ✅ Completada | —        | —          | valibot/yup generators — 2026                      |
| ~~D~~ | ~~`QModelCollection<T>`~~                                                  | ✅ Completada | —        | —          | quick-collection.model.ts — 2026                   |
| ~~M~~ | ~~`QModel.patch()`~~                                                       | ✅ Completada | —        | —          | quick.model.ts:2886 — 1 Mar 2026                   |
| ~~O~~ | ~~`validate()` unificado~~                                                 | ✅ Completada | —        | —          | quick.model.ts:2159 — 1 Mar 2026                   |
| ~~R~~ | ~~CLI `generate` subcommand~~                                              | ✅ Completada | —        | —          | generate.command.ts — 2026                         |
| ~~S~~ | ~~`getSchema('prisma')`~~                                                  | ✅ Completada | —        | —          | prisma-schema-generator — 2026                     |
| ~~G~~ | ~~`fromFormData()` + `toFormData()` + streaming + Blob/File transformers~~ | ✅ Completada | —        | —          | Task #58 — 28 Feb 2026                             |
| ~~T~~ | ~~`QModel.fromURL(searchParams)`~~                                         | ✅ Completada | —        | —          | quick.model.ts:700 — 1 Mar 2026                    |
| ~~N~~ | ~~`@QVersion` + migrations~~                                               | ✅ Completada | —        | —          | qversion.decorator.ts — 1 Mar 2026                 |
| ~~E~~ | ~~I18n mensajes~~                                                          | ✅ Completada | —        | —          | i18n resolver en QConfig — 1 Mar 2026              |
| ~~U~~ | ~~`QModelCollection.toCSV()`~~                                             | ✅ Completada | —        | —          | quick-collection.model.ts — 1 Mar 2026             |
| ~~F~~ | ~~`@QDefault`~~                                                            | ✅ Completada | —        | —          | qdefault.decorator.ts — 1 Mar 2026                 |
| ~~P~~ | ~~`@QReadonly`~~                                                           | ✅ Completada | —        | —          | qreadonly.decorator.ts — 1 Mar 2026                |
| ~~H~~ | ~~`@QTransform` pipeline~~                                                 | ✅ Completada | —        | —          | qtransform.decorator.ts — 1 Mar 2026               |
| ~~Q~~ | ~~Config per-class `QModel.configure()`~~                                  | ✅ Completada | —        | —          | quick.model.ts — 1 Mar 2026                        |
| ~~V~~ | ~~`getSchema('effect-schema')`~~                                           | ✅ Completada | —        | —          | effect-schema-generator — 1 Mar 2026               |
| ~~J~~ | ~~`getSchema('drizzle'/'typebox')`~~                                       | ✅ Completada | —        | —          | drizzle/typebox generators — 1 Mar 2026            |
| ~~L~~ | ~~Guía WebSocket / SSE~~                                                   | ✅ Completada | —        | —          | websocket-sse.md EN+ES — 1 Mar 2026                |
| ~~I~~ | ~~`$qHistory` / History Trail~~                                            | ✅ Completada | —        | —          | history.service.ts — 2 Mar 2026                    |
| K     | Plugin system                                                              | ⚠️ Diferida   | 3-4h     | Bajo ahora | Prematuro sin ecosistema                           |
| W     | Majors devDependencies (TS7/ESLint10/Node26/...)                           | 🆕 Nueva      | 6-10h    | Medio      | Rama `chore/update-majors` lista — ver propuesta W |

**Sprint v2.0 (I):** ✅ Completado — 2 Mar 2026
**Diferidas indefinidamente (K):** ~3-4h — revisar cuando haya ecosistema

---

## 🔁 Orden recomendado de implementación

```
✅  Task #48  Drizzle ORM (1 Mar 2026)
✅  Prop. A   @QSensitive (2026)
✅  Prop. B   QModel.diff() + equals() (1 Mar 2026)
✅  Prop. C   getSchema('valibot'/'yup') (1 Mar 2026)
✅  Prop. D   QModelCollection<T> (2026)
✅  Prop. G   fromFormData() + toFormData() (Task #58 — 28 Feb 2026)
✅  Prop. M   patch() mutable (1 Mar 2026)
✅  Prop. O   validate() unificado (1 Mar 2026)
✅  Prop. R   CLI generate subcommand (2026)
✅  Prop. S   getSchema('prisma') (1 Mar 2026)

✅  Prop. F   → @QDefault — 1 Mar 2026
✅  Prop. P   → @QReadonly — 1 Mar 2026
✅  Prop. H   → @QTransform pipeline — 1 Mar 2026
✅  Prop. Q   → Config per-class — 1 Mar 2026
✅  Prop. U   → QModelCollection.toCSV() — 1 Mar 2026
✅  Prop. E   → I18n mensajes — 1 Mar 2026
✅  Prop. N   → @QVersion + migrations — 1 Mar 2026
✅  Prop. V   → getSchema('effect-schema') — 1 Mar 2026
✅  Prop. J   → getSchema('drizzle'/'typebox') — 1 Mar 2026
✅  Prop. L   → Guía WebSocket / SSE — 1 Mar 2026
✅  Prop. I   → $qHistory / History Trail — completada (2 Mar 2026)
⚠️ Diferida indefinidamente: K (plugin system)
```

---

## ✅ Bugs resueltos

### Task #59 — Bug: `TS2339 Property '_qCallDepth' does not exist` en `quick.model.ts:2570` — **RESUELTO**

**Prioridad:** 🟠 Alta — error de typecheck en el archivo core más crítico del proyecto
**Detectado:** 1 Mar 2026 — durante auditoría de prompts de coordinación
**Resuelto:** refactor `$q*` namespace — el sistema de guard (`_qCallDepth`, `_withQFlag`, `_assertQCall`) fue eliminado completamente; los métodos `$q*` son ahora implementaciones directas sin overhead.

**Causa:** La variable `_qCallDepth` era parte del sistema de guarda interno que verificaba que los métodos `$q*` se llamaban correctamente. Al promover todos los métodos `$q*` a implementaciones directas, el sistema de guarda completo fue eliminado, resolviendo el error de typecheck y simplificando la arquitectura.

**Verificación:** `bun run typecheck` → 0 errores. `bun test tests/unit/ tests/integration/ tests/e2e/ tests/system/` → 3714 pass, 0 fail.
