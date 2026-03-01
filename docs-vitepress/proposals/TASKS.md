# QuickModel - Tareas Pendientes y Propuestas

> **Fecha de revisión:** 1 de marzo de 2026 (actualizado)
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)
> **Estado actual:** 4358+ tests passing | Cobertura >97% líneas | v1.0.0 | 38 guías EN+ES

> **Documento único de planificación.** Contiene el historial resumido de tareas completadas y el backlog de
> propuestas para sprints futuros (Mar 2026+).
> Documentos históricos en archivo: [`.archived/PENDING_CONFIGS.md`](../../.archived/PENDING_CONFIGS.md) · [`.archived/REFACTORING.md`](../../.archived/REFACTORING.md)

## 📊 Progreso General

```
✅ Completadas: Tasks #1–#58 + Task #48 + Propuestas A–H, J, L, M–Q, R–V (todas las activas)
📋 Planificadas: I ($qm.history / audit trail), W (namespace $qm)
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

### Propuesta I — `$qm.history` / Audit Trail _(Planificada para v2.0.0)_

**Prioridad:** 🟡 Media
**Impacto:** Medio-alto — CRUD empresariales, trazabilidad de mutaciones
**Esfuerzo estimado:** ~7 horas | **Tests estimados:** ~25
**Depende de:** Propuesta W (namespace `$qm`)

> ✅ **Re-evaluada y desbloqueada** (1 Mar 2026). El diseño anterior tenía dos problemas: (1) la propiedad `history` colisionaría con campos de dominio del usuario, y (2) parecía solapar con `isDirty()`/`getChanges()`. Ambos resueltos: (1) se ubica bajo `$qm.history` por diseño, y (2) el audit trail cubre la dimensión **temporal** (traza cronológica de mutaciones), que `getChanges()` y `diff()` no cubren.

**Especificación completa:** [AUDIT-TRAIL.md](./AUDIT-TRAIL.md)

```typescript
// Opt-in por clase — zero overhead si no se activa
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> {
	declare name: string;
}

contract.$qm.patch({ name: 'v2' });
contract.$qm.patch({ name: 'v3' });

contract.$qm.history.value;
// → [
//   { field: 'name', from: 'v1', to: 'v2', at: Date, method: 'patch' },
//   { field: 'name', from: 'v2', to: 'v3', at: Date, method: 'patch' },
// ]

contract.$qm.history.stop(); // pausa grabación
contract.$qm.history.start(); // reanuda
contract.$qm.history.clear(); // vacía entradas
contract.$qm.history.configure({ maxEntries: 20 });
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

## 📊 Resumen priorizado de propuestas

| Prop  | Nombre                                                                     | Prioridad      | Esfuerzo | Impacto    | Relación con existente                                 |
| ----- | -------------------------------------------------------------------------- | -------------- | -------- | ---------- | ------------------------------------------------------ |
| ~~A~~ | ~~`@QSensitive`~~                                                          | ✅ Completada  | —        | —          | qsensitive.decorator.ts — 2026                         |
| ~~B~~ | ~~`QModel.diff()` + `equals()`~~                                           | ✅ Completada  | —        | —          | quick.model.ts:3031 — 1 Mar 2026                       |
| ~~C~~ | ~~`getSchema('valibot'/'yup')`~~                                           | ✅ Completada  | —        | —          | valibot/yup generators — 2026                          |
| ~~D~~ | ~~`QModelCollection<T>`~~                                                  | ✅ Completada  | —        | —          | quick-collection.model.ts — 2026                       |
| ~~M~~ | ~~`QModel.patch()`~~                                                       | ✅ Completada  | —        | —          | quick.model.ts:2886 — 1 Mar 2026                       |
| ~~O~~ | ~~`validate()` unificado~~                                                 | ✅ Completada  | —        | —          | quick.model.ts:2159 — 1 Mar 2026                       |
| ~~R~~ | ~~CLI `generate` subcommand~~                                              | ✅ Completada  | —        | —          | generate.command.ts — 2026                             |
| ~~S~~ | ~~`getSchema('prisma')`~~                                                  | ✅ Completada  | —        | —          | prisma-schema-generator — 2026                         |
| ~~G~~ | ~~`fromFormData()` + `toFormData()` + streaming + Blob/File transformers~~ | ✅ Completada  | —        | —          | Task #58 — 28 Feb 2026                                 |
| ~~T~~ | ~~`QModel.fromURL(searchParams)`~~                                         | ✅ Completada  | —        | —          | quick.model.ts:700 — 1 Mar 2026                        |
| ~~N~~ | ~~`@QVersion` + migrations~~                                               | ✅ Completada  | —        | —          | qversion.decorator.ts — 1 Mar 2026                     |
| ~~E~~ | ~~I18n mensajes~~                                                          | ✅ Completada  | —        | —          | i18n resolver en QConfig — 1 Mar 2026                  |
| ~~U~~ | ~~`QModelCollection.toCSV()`~~                                             | ✅ Completada  | —        | —          | quick-collection.model.ts — 1 Mar 2026                 |
| ~~F~~ | ~~`@QDefault`~~                                                            | ✅ Completada  | —        | —          | qdefault.decorator.ts — 1 Mar 2026                     |
| ~~P~~ | ~~`@QReadonly`~~                                                           | ✅ Completada  | —        | —          | qreadonly.decorator.ts — 1 Mar 2026                    |
| ~~H~~ | ~~`@QTransform` pipeline~~                                                 | ✅ Completada  | —        | —          | qtransform.decorator.ts — 1 Mar 2026                   |
| ~~Q~~ | ~~Config per-class `QModel.configure()`~~                                  | ✅ Completada  | —        | —          | quick.model.ts — 1 Mar 2026                            |
| ~~V~~ | ~~`getSchema('effect-schema')`~~                                           | ✅ Completada  | —        | —          | effect-schema-generator — 1 Mar 2026                   |
| ~~J~~ | ~~`getSchema('drizzle'/'typebox')`~~                                       | ✅ Completada  | —        | —          | drizzle/typebox generators — 1 Mar 2026                |
| ~~L~~ | ~~Guía WebSocket / SSE~~                                                   | ✅ Completada  | —        | —          | websocket-sse.md EN+ES — 1 Mar 2026                    |
| W     | Namespace `$qm` (refactor v2.0)                                            | 📋 Planificada | 16-22h   | Alto       | [QM-NAMESPACE-REFACTOR.md](./QM-NAMESPACE-REFACTOR.md) |
| I     | `$qm.history` / Audit Trail                                                | 📋 Planificada | ~7h      | Medio-alto | Depende de W — [AUDIT-TRAIL.md](./AUDIT-TRAIL.md)      |
| K     | Plugin system                                                              | ⚠️ Diferida    | 3-4h     | Bajo ahora | Prematuro sin ecosistema                               |

**Tiempo total sprint v2.0 (W + I):** ~23-29h
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
📋 Siguiente sprint (v2.0): W (namespace $qm) → I ($qm.history / audit trail)
⚠️ Diferida indefinidamente: K (plugin system)
```

---

### Propuesta L — Legitimate Title

### Propuesta Z — Injected entry

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Title

Injected

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Legitimate Title

### Propuesta Z — Injected entry

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Title

Injected

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Legitimate Title

### Propuesta Z — Injected entry

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Title

Injected

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Legitimate Title

### Propuesta Z — Injected entry

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Title

Injected

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Legitimate Title

### Propuesta Z — Injected entry

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc

---

### Propuesta [ — Title

Injected

**Prioridad:** 🟡 Media
**Impacto:** Por definir
**Esfuerzo estimado:** Por estimar

desc
