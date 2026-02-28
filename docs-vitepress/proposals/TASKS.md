# QuickModel - Tareas Pendientes y Propuestas

> **Fecha de revisión:** 28 de febrero de 2026 (actualizado)
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)
> **Estado actual:** 3300+ tests passing | Cobertura >97% líneas | v1.0.0

> **Documento único de planificación.** Contiene el historial resumido de tareas completadas y el backlog de
> propuestas para sprints futuros (Mar 2026+).
> Documentos históricos en archivo: [`.archived/PENDING_CONFIGS.md`](../../.archived/PENDING_CONFIGS.md) · [`.archived/REFACTORING.md`](../../.archived/REFACTORING.md)

## 📊 Progreso General

```
✅ Completadas: Tasks #1–#58 + Propuestas A, D, G, O, R, S
⏳  Backlog:     Propuestas B, C, E, F, H, I, J, K, L, M, N, P, Q (ver sección final)
```

---

## ✅ Historial de tareas completadas

| #   | Tarea                                                                                | Commit / Detalle          |
| --- | ------------------------------------------------------------------------------------ | ------------------------- |
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

---

## ⏳ Task #48: Drizzle ORM integration patterns

**Status:** 📋 Pendiente
**Objetivo:** Suite de tests + guía EN+ES para Drizzle ORM
**Tests a añadir:** ~25 en `tests/integration/patterns/drizzle-patterns.test.ts`
**Docs:** `docs-vitepress/en/guide/drizzle-integration.md` + ES

**Patrones a cubrir:**

1. DTO desde resultado de query — `new UserDto(await db.select().from(users).where(...))`
2. Create input — `dto.toInterface()` como `db.insert(users).values(...)`
3. Patrón repositorio — `DrizzleUserRepository` con QModel layer
4. Tipos Drizzle → QModel — `Date`, `number` (Drizzle no tiene Decimal por defecto)
5. `createMany()` para seed / bulk import
6. `unknownPropertyPolicy: 'strip'` — eliminar columnas internas (timestamps, etc.)
7. `copy()` + `db.update().set(...)` — update parcial inmutable
8. `@QComputed()` para campos calculados no almacenados

---

## 🆕 PROPUESTAS BACKLOG (Mar 2026+)

> **Análisis:** 28 de febrero de 2026
> Task #48 (Drizzle) ya está registrada arriba y no se repite aquí.

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

### Propuesta B — `QModel.diff(other)` method

**Prioridad:** 🔴 Alta
**Impacto:** Alto — auditorías, sincronización, UI de "cambios pendientes"
**Esfuerzo estimado:** 3-4 horas | **Tests estimados:** ~20

Diferencia profunda entre dos instancias QModel independientes. Complementa `isDirty()` (que compara con el estado inicial de la misma instancia).

**API propuesta:**

```typescript
const original = new User({ id: 1, name: 'Alice', email: 'a@b.com' });
const updated = new User({ id: 1, name: 'Alice M.', email: 'alice@new.com' });

const changes = original.diff(updated);
// → {
//     changed: { name: { from: 'Alice', to: 'Alice M.' }, email: { from: 'a@b.com', to: 'alice@new.com' } },
//     added:   {},
//     removed: {}
//   }

original.diff(updated, { deep: true }); // diff recursivo en nested models
original.diffSummary(updated); // array plano de strings legibles
```

**Archivos:**

- `src/core/services/diff.service.ts` — `QModelDiffService`
- `src/core/models/quick.model.ts` — métodos `diff()` y `diffSummary()`
- `src/core/types/diff-types.ts` — `IQDiffResult`, `IQDiffEntry`
- `tests/unit/core/models/diff.test.ts`
- `docs-vitepress/en/guide/qmodel.md` — sección "Diff & Change Detection" + ES

---

### Propuesta C — `getSchema('valibot')` y `getSchema('yup')`

**Prioridad:** 🟡 Media
**Impacto:** Alto estratégico — Valibot es el sucesor moderno de Zod en 2026
**Esfuerzo estimado:** 2h × 2 formatos | **Tests estimados:** ~10 por formato

Los **7 formatos actuales** declarados en `IQSchemaType` son: `json`, `zod`, `mongo`, `typescript`, `graphql`, `openapi`, `ajv`. Esta propuesta añade dos más al mismo patrón establecido en `SchemaGeneratorsService`.

```typescript
User.getSchema('valibot'); // → schema Valibot v1.x
User.getSchema('yup'); // → yup.object().shape({ ... })
```

**Por qué Valibot:** bundle size ~10× menor que Zod, tree-shakeable, TypeScript-first, adopción creciente en Vite/SvelteKit/Hono en 2026.

**Archivos:**

- `src/core/types/schema-types.ts` — añadir `'valibot' | 'yup'` al tipo `IQSchemaType`
- `src/core/services/schema-generators.service.ts` — nuevas clases `ValibotSchemaGenerator` y `YupSchemaGenerator`
- `tests/unit/core/services/schema-generators.test.ts`

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

### Propuesta E — I18n de mensajes de validación

**Prioridad:** 🟡 Media
**Impacto:** Medio — muy demandado en aplicaciones multi-idioma
**Esfuerzo estimado:** 4 horas | **Tests estimados:** ~15

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

### Propuesta F — `@QDefault` decorator

**Prioridad:** 🟢 Baja
**Impacto:** Medio — DX para DTOs con campos opcionales
**Esfuerzo estimado:** 2 horas | **Tests estimados:** ~12

Valores por defecto declarativos por campo. Solo activa cuando el valor entrante es `undefined` o `null`, a diferencia del constructor que siempre ejecuta el default.

```typescript
@Quick({ createdAt: Date })
class Event extends QModel<IEvent> {
	declare id: string;

	@QDefault(() => new Date())
	declare createdAt: Date;

	@QDefault('draft')
	declare status: string;

	@QDefault(() => [])
	declare tags: string[];
}

new Event({ id: '1' });
// → createdAt = new Date(), status = 'draft', tags = []
```

### ✅ Propuesta G — `fromFormData()` + `toFormData()` + transformers Blob/File — **COMPLETADA** (Task #58)

**Completada:** 28 de febrero de 2026
**Resultado:** `BlobTransformer`, `FileTransformer` implementados + API pública `fromFormData()` / `toFormData()` / `toReadableStream()` / `fromStream()` / `pipeStream()` con soporte `fileMode`/`fileSource` (`auto`, `binary`, `reference`, `base64`), per-field overrides via `@QType`, `IQStreamProgress` callback y skill MCP `quickmodel_form_data` documentado EN+ES.

---

### Propuesta H — `@QTransform` pipeline decorator

**Prioridad:** 🟢 Baja
**Impacto:** Medio — DX para transformaciones custom a nivel de campo
**Esfuerzo estimado:** 2-3 horas | **Tests estimados:** ~12

Transformaciones ejecutadas después de deserializar, antes de asignar. Composable. Complementa `coercionStrategy: 'loose'` (global) con transforms por campo.

```typescript
@Quick()
class User extends QModel<IUser> {
	@QTransform((v) => v.trim().toLowerCase())
	declare email: string;

	@QTransform((v) => v.trim())
	@QTransform((v) => v[0].toUpperCase() + v.slice(1)) // composición
	declare name: string;
}
```

---

### Propuesta I — Audit trail / historial de cambios

**Prioridad:** 🟢 Baja — ⚠️ **CUESTIONABLE**
**Impacto:** Medio — CRUD empresariales
**Esfuerzo estimado:** 4-5 horas | **Tests estimados:** ~20

> **⚠️ Overlap significativo** con funcionalidad ya existente: `isDirty()`, `getChanges()`, y la futura Propuesta B (`diff()`). La combinación `copy()` + `diff()` + `@QVersion` cubre el 90% de estos casos. **Considerar eliminar** o diferir hasta que B, M y N estén implementadas y se evalúe si sigue existiendo un hueco real.

Historial completo de mutaciones en una instancia. Opt-in vía `QConfig` para no penalizar rendimiento por defecto.

```typescript
QConfig.configure({ audit: { enabled: true, maxEntries: 100 } });

const user = new User({ id: 1, name: 'Alice' });
user.copy({ name: 'Alice M.' });

user.history;
// → [{ field: 'name', from: 'Alice', to: 'Alice M.', at: Date }]

user.clearHistory();
```

---

### Propuesta J — `getSchema('drizzle')` y `getSchema('typebox')`

**Prioridad:** 🟢 Baja
**Impacto:** Medio estratégico — cierra el círculo con Task #48 / Fastify v5
**Esfuerzo estimado:** 2h × 2 formatos

- **`drizzle`**: produce columnas Drizzle (`pgTable`, `integer`, `varchar`, `timestamp`) desde metadatos QModel. Cierra el círculo con Task #48.
- **`typebox`**: TypeBox es el validador nativo de Fastify v5 — permite `Type.Object(...)` para validación Ajv ultra-rápida.

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

### Propuesta L — Guía WebSocket / SSE en tiempo real

**Prioridad:** 🟢 Baja
**Impacto:** Medio
**Esfuerzo estimado:** 2-3 horas | **Requiere:** Propuesta B (`diff()`)

La serialización ya funciona con WebSocket/SSE. Solo falta el patrón documentado con tests de simulación (mismo estilo que Electron IPC — Task #53).

Patrones a cubrir: emisión tipada, recepción tipada, `diff()` para enviar solo los campos cambiados, SSE con stream paginado via `createMany()`, reconexión con persistencia de estado via `copy()`.

---

### Propuesta M — `QModel.patch(partial)` mutable in-place

**Prioridad:** 🟡 Media
**Impacto:** Medio — contraparte mutable de `copy()` para casos donde la inmutabilidad no es necesaria
**Esfuerzo estimado:** 2-3 horas | **Tests estimados:** ~15

`copy()` devuelve una nueva instancia (inmutable). `patch()` muta la instancia actual y actualiza el historial de `isDirty()`.

```typescript
const user = new User({ id: 1, name: 'Alice' });
user.patch({ name: 'Alice M.' }); // muta la instancia
user.isDirty('name'); // → true
user.getChanges(); // → { name: { from: 'Alice', to: 'Alice M.' } }
```

**Archivos:**

- `src/core/models/quick.model.ts` — método `patch(partial: Partial<T>)`
- `tests/unit/core/models/patch.test.ts`

---

### Propuesta N — `@QVersion` + schema migrations

**Prioridad:** 🟡 Media
**Impacto:** Medio — esencial para datos persistidos en localStorage/IndexedDB (Task #55)
**Esfuerzo estimado:** 4-5 horas | **Tests estimados:** ~20

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

### Propuesta O — `validate()` método unificado

**Prioridad:** 🔴 Alta
**Impacto:** Alto — simplifica la API de validación (pain point frecuente)
**Esfuerzo estimado:** 1-2 horas | **Tests estimados:** ~10

Unifica `hasIntegrity()` + `checkRules()` + `validationReport()` en una sola llamada. El problema actual: los usuarios deben saber qué función llamar según el contexto.

```typescript
const result = user.validate();
// → { valid: boolean, integrity: boolean, rules: IQRuleError[], report: IQValidationReport }

await user.validate({ async: true }); // incluye checkRulesAsync()
user.validate({ groups: ['address'] }); // solo un grupo de reglas
```

**Archivos:**

- `src/core/models/quick.model.ts` — método `validate(opts?)`
- `src/core/types/validation-types.ts` — `IQValidateResult`
- `tests/unit/core/models/validate.test.ts`

---

### Propuesta P — `@QReadonly` decorator

**Prioridad:** 🟡 Media
**Impacto:** Medio — contratos más estrictos para campos inmutables tras construcción
**Esfuerzo estimado:** 2 horas | **Tests estimados:** ~12

Campos marcados como readonly generan error si se intenta cambiarlos vía `copy()` o `patch()`.

```typescript
@Quick()
class User extends QModel<IUser> {
	@QReadonly()
	declare id: number; // no puede ser modificado tras construcción

	declare name: string;
}

user.copy({ id: 999 }); // → throws ImmutableFieldError
user.copy({ name: 'Bob' }); // ✅ permitido
```

**Archivos:**

- `src/core/decorators/qreadonly.decorator.ts` (nuevo)
- `src/core/models/quick.model.ts` — validación en `copy()` y `patch()`
- `tests/unit/core/decorators/qreadonly.test.ts`

---

### Propuesta Q — `User.configure({})` per-class config

**Prioridad:** 🟡 Media
**Impacto:** Medio — elimina la necesidad de `QConfig.configure()` global para casos puntuales
**Esfuerzo estimado:** 3 horas | **Tests estimados:** ~15

Override local de configuración por clase, sin afectar el `QConfig` global. Útil para diferentes políticas por dominio.

```typescript
@Quick()
class InternalDto extends QModel<IInternalDto> {
	static override config = QModel.configure({
		unknownPropertyPolicy: 'preserve',
		coercionStrategy: 'strict',
	});
}
// No afecta a otras clases que usen el QConfig global
```

**Archivos:**

- `src/core/models/quick.model.ts` — soporte para `static config` override
- `src/core/config/quick.config.ts` — `QModel.configure(opts)` estático
- `tests/unit/core/models/per-class-config.test.ts`

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

### Propuesta S — `getSchema('prisma')`

**Prioridad:** 🟡 Media
**Impacto:** Alto — cierra el circuito con Task #41 (Prisma ya implementada)
**Esfuerzo estimado:** 2-3 horas | **Tests estimados:** ~10

Generar definiciones de columnas Prisma desde los metadatos QModel. Task #41 está completada (patrón de uso documentado) pero no existe ningún generador de schema `.prisma`. El patrón del servicio `SchemaGeneratorsService` ya está establecido — es el único generador que falta para tener cobertura completa del ecosistema de datos.

```typescript
User.getSchema('prisma');
// → `
// model User {
//   id    Int    @id
//   name  String
//   email String
//   birth DateTime?
// }
// `
```

**Archivos:**

- `src/core/types/schema-types.ts` — añadir `'prisma'` al tipo `IQSchemaType`
- `src/core/services/schema-generators.service.ts` — nueva clase `PrismaSchemaGenerator`
- `tests/unit/core/services/schema-generators.test.ts`
- Nota en guía `prisma-integration.md` existente

---

## 📊 Resumen priorizado de propuestas

| Prop  | Nombre                                                                     | Prioridad       | Esfuerzo | Impacto          | Relación con existente           |
| ----- | -------------------------------------------------------------------------- | --------------- | -------- | ---------------- | -------------------------------- |
| ~~A~~ | ~~`@QSensitive`~~                                                          | ✅ Completada   | —        | —                | qsensitive.decorator.ts — 2026   |
| B     | `QModel.diff()`                                                            | 🔴 Alta         | 3-4h     | Alto             | Complementa `isDirty()`/`copy()` |
| ~~D~~ | ~~`QModelCollection<T>`~~                                                  | ✅ Completada   | —        | —                | quick-collection.model.ts — 2026 |
| O     | `validate()` unificado                                                     | 🔴 Alta         | 1-2h     | Alto (DX)        | Unifica API validación           |
| C     | `getSchema('valibot'/'yup')`                                               | 🟡 Media        | 2h×2     | Alto estratégico | +2 a los 7 formatos existentes   |
| E     | I18n mensajes                                                              | 🟡 Media        | 4h       | Medio            | Extiende `QConfig`               |
| M     | `QModel.patch()` mutable                                                   | 🟡 Media        | 2-3h     | Medio            | Contraparte mutable de `copy()`  |
| N     | `@QVersion` + migrations                                                   | 🟡 Media        | 4-5h     | Medio            | Complementa Task #55             |
| P     | `@QReadonly`                                                               | 🟡 Media        | 2h       | Medio            | Nuevo decorator                  |
| Q     | Config per-class                                                           | 🟡 Media        | 3h       | Medio            | Extiende `QConfig`               |
| ~~R~~ | ~~CLI `generate` subcommand~~                                              | ✅ Completada   | —        | —                | generate.command.ts — 2026       |
| S     | `getSchema('prisma')`                                                      | 🟡 Media        | 2-3h     | Alto             | Cierra circuito Task #41         |
| F     | `@QDefault`                                                                | 🟢 Baja         | 2h       | Medio            | Nuevo decorator                  |
| ~~G~~ | ~~`fromFormData()` + `toFormData()` + streaming + Blob/File transformers~~ | ✅ Completada   | —        | —                | Task #58 — 28 Feb 2026           |
| H     | `@QTransform` pipeline                                                     | 🟢 Baja         | 2-3h     | Medio            | Complementa `@QType`             |
| I     | Audit trail                                                                | ⚠️ Cuestionable | 4-5h     | Medio            | Overlap `isDirty()`/`diff()`     |
| J     | `getSchema('drizzle'/'typebox')`                                           | 🟢 Baja         | 2h×2     | Medio            | +2 a Schema API + Task #48       |
| K     | Plugin system                                                              | ⚠️ Diferida     | 3-4h     | Bajo ahora       | Prematuro sin ecosistema         |
| L     | Guía WebSocket / SSE                                                       | 🟢 Baja         | 2-3h     | Medio            | **Requiere Prop B**              |

**Tiempo total propuestas (sin cuestionables):** ~70-85h
**Propuestas alta prioridad (A+B+D+O):** ~12-15h
**Propuestas cuestionables (I, K):** ~7-9h — revisar antes de implementar

---

## 🔁 Orden recomendado de implementación

```
1.  Task #48  → Drizzle ORM (cierra backlog oficial pendiente)
2.  Prop. O   → validate() unificado (1-2h, mayor ROI: alto impacto, mínimo riesgo)
3.  ~~Prop. R~~   ✅ CLI generate subcommand (generate.command.ts — completada 2026)
4.  Prop. A   → @QSensitive (seguridad / GDPR)
5.  Prop. B   → QModel.diff() (complementa copy/isDirty)
6.  Prop. S   → getSchema('prisma') (2-3h, cierra circuito Task #41)
7.  Prop. D   → QModelCollection<T> (cierra ciclo createMany)
8.  Prop. C   → getSchema('valibot') + getSchema('yup') (bajo riesgo, alto valor)
9.  ~~Prop. G~~   ✅ fromFormData() + toFormData() (Task #58 — completada)
10. Prop. M   → patch() mutable (complementa copy, sencillo)
11. Prop. N   → @QVersion + migrations (cierra loop Storage / Task #55)
12. Prop. E   → I18n (requiere decisiones de diseño)
13. P/Q/F/H   → @QReadonly, per-class config, @QDefault, @QTransform
14. J/L       → schemas extra (drizzle/typebox), WebSocket docs
⚠️ Revisar antes de implementar: I (audit trail), K (plugin system)
```
