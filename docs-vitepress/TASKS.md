# QuickModel - Tareas Pendientes

> **Fecha de revisión:** 23 de febrero de 2026 (actualizado)
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)
> **Estado actual:** 2976 tests passing | Cobertura >97% líneas | v1.0.0

## 📊 Progreso General

```
✅ Completadas: Tasks #1–#22, #23–#38, #39–#43, #44, #45, #46, #49, #55, #40, #41, #42 (sprint Feb 2026)
⏳  Backlog:     Tasks #47–#48, #50–#54 (Extended Ecosystem Sprint)
✅ Completada:  Task #17 (benchmarks — comparativa vs Zod/PlainJS + gráfica landing)
```

**Hitos recientes:**

- ✅ Task #1: Console.log removidos (commit `2be2df2`)
- ✅ Task #2: MCP tools coverage 50%→80% (commit `5e80d64`)
- ✅ Task #2.5: Schema Generation API con 7 formatos (commit `b9bb875`)
- ✅ Task #3: Composed transformers edge cases (commit `1c44266`, +15 tests)
- ✅ Task #4: WeakMap/WeakSet transformers (+14 tests)
- ✅ Task #5: MCP Prompts/Skills documentados EN+ES (commit `4457821`)
- ✅ Task #6: `excludeFields` en `@Quick()` — serialización permanente (commit `6de834f`, +9 tests)
- ✅ Task #7: Error path coverage MCP public tools (commit `d698566`, 1578→1602 tests)
- ✅ Task #8: Refactor sidebar `buildMcpSidebar` helper (commit `55e2a59`)
- ✅ Task #9: Console.log DEBUG eliminados de `config.ts`, imports huérfanos limpiados
- ✅ Task #10: Docs `excludeFields` + `omit`/`pick` en guías EN+ES (quick-decorator + serialization)
- ✅ Task #13: Script `release:check` en package.json (ya presente: `"./scripts/pre-release.sh"`)
- ✅ Task #20: `@QRule` async predicados — implementado (commit `a714b2e`)
- ✅ Task #23: `copy()` + `isDirty(field?)` — estado mutable del modelo (commit `a8089a7`)
- ✅ Task #24: `@QRule` decorator + `checkRules()` — validación por reglas (commit `8a2910b`)
- ✅ Task #25: `hasIntegrity()` + `isValid()` — convenience shortcuts (commit `cd30a8b`)
- ✅ Task #26: `createMany()` — batch creation con validación (commit `3faf88b`)
- ✅ Task #27: `@QField` + `validationReport()` + `getFormSchema()` — forms API (commit `00d56c7`)
- ✅ Task #28: `QModel.extends()` — simplificación de generics (commit `4ff1d55`)
- ✅ Task #29: `@QAlias` + `@QGroup` — alias y agrupación de campos (commit `a714b2e`)
- ✅ Task #30: `createReadonly()` refactor + async predicates en `checkRules()` (commit `05bcb8c`)
- ✅ Task #32: `checkRulesAsync` — timeout, modo serial/paralelo, IQRule\<T\> genérico — **COMPLETADA** (22 Feb 2026)
- ✅ Task #33: Módulo `./forms` standalone — `qCheckRules`, `qCheckRulesAsync`, `qCheckRulesByGroup` — **COMPLETADA** (22 Feb 2026)
- ✅ **Sprint #34–#38: Framework Integrations** — Angular (37), React (31), Vue (27), Svelte (21), Backend (25) = **141 nuevos tests** | guías EN+ES para los 5 frameworks | 2406 → 2588 tests (22 Feb 2026)

**Sprint en curso — Ecosystem Integrations (orden de ejecución):**

- ✅ Task #39: TanStack Query — `queryFn`, `useMutation`, optimistic updates con `copy()` — **COMPLETADA** (Feb 2026)
- ✅ **Task #43**: Mobile Integrations — React Native/Expo, Capacitor, Cordova, Ionic — 33 tests | guías EN+ES — **COMPLETADA** (23 Feb 2026)
- ✅ **Task #55**: Storage & Persistence — localStorage, IndexedDB, SQLite, Capacitor Preferences, caching — 39 tests | guías EN+ES — **COMPLETADA** (23 Feb 2026)
- ✅ **Task #40**: tRPC — input/output DTOs, middleware, `checkRulesAsync` en procedures — 30 tests | guías EN+ES — **COMPLETADA** (23 Feb 2026)
- ✅ **Task #41**: Prisma — DTO desde resultado ORM, repositorio, transformación de tipos — 32 tests | guías EN+ES — **COMPLETADA** (23 Feb 2026)
- ✅ **Task #42**: Formik + migración desde Zod/Yup — 26 tests | guías EN+ES — **COMPLETADA** (23 Feb 2026)

**Extended Ecosystem Sprint — completadas parcialmente (#44–#54):**

- ✅ Task #44: React Hook Form — `validate` adapter, `@QRule` sin resolver externo, `getFormSchema()` → campos dinámicos — **COMPLETADA** (Feb 2026)
- ✅ Task #45: Zustand — store con `copy()` inmutable, `QModel` como slice, `devtools` + `immer` compat — **COMPLETADA** (Feb 2026)
- ✅ Task #46: MSW (Mock Service Worker) — `generate_mock` + `HttpResponse`, fixtures tipados, tests de integración real — **COMPLETADA** (Feb 2026)
- ⏳ Task #47: Redux Toolkit (RTK) — `createSlice` con QModel, `serialize()` como payload, `copy()` en reducers
- ⏳ Task #48: Drizzle ORM — DTO desde resultado de query, repositorio, tipos Drizzle → QModel
- ✅ Task #49: Vitest Custom Matchers — `toBeValidQModel`, `toHaveQField`, `toMatchQModel`, setup helper — **COMPLETADA** (Feb 2026)
- ✅ Task #50: TypeORM — Entity vs DTO separation, repositorio con QModel, transformación de columnas — **COMPLETADA** (Feb 2026)
- ✅ Task #51: GraphQL / Apollo Server — `@InputType()` DTO, resolver tipado, `@QComputed` en respuesta — **COMPLETADA** (Feb 2026)
- ✅ Task #52: OpenAPI / Swagger — `getSchema('json')` → `@nestjs/swagger`, `@fastify/swagger`, documentación automática — **COMPLETADA** (Feb 2026)
- ✅ Task #53: Electron IPC — `serialize()`/`populate()` en boundary main↔renderer, tipado cross-context — **COMPLETADA** (Feb 2026)
- ✅ Task #54: Mongoose — ODM sobre MongoDB, DTO encima del documento Mongoose, coerción de `ObjectId` — **COMPLETADA** (Feb 2026)
- ✅ Task #55: Storage & Persistence — localStorage, IndexedDB, SQLite, Capacitor Preferences, caching layers — **COMPLETADA** (23 Feb 2026)

**Revisión completa 22 Feb 2026 — Tareas actualizadas:**

- ✅ Task #11: Truncar `safeStringify` — prevención de info-leak en mensajes de error
- ✅ Task #12: Warning activo cuando `disableSafetyChecks` está habilitado
- ✅ Task #13: Corregir script `release:check` — **COMPLETADA**
- ✅ Task #14: Tests negativos para `JsonSchemaGenerator` con tipos sin transformer — **COMPLETADA** (fix array types)
- ✅ Task #15: Tests específicos para `disableSafetyChecks` (activación + warning) — **COMPLETADA**
- ✅ Task #16: Tests de `transformCase` con herencia multinivel — **COMPLETADA**
- ✅ **Task #17**: Performance benchmarks comparativos (Zod + PlainJS) + gráfica interactiva en landing — **COMPLETADA** (23 Feb 2026)
- ✅ Task #18: `@QComputed()` / `exposeComputedFields` — computed props en serialización — **COMPLETADA**
- ✅ Task #19: `QTransformerRegistry.snapshot()/restore()` — **COMPLETADA**
- ✅ Task #20: `@QRule` async — **COMPLETADA** (commit `a714b2e`)
- ✅ Task #21: Guía de integración NestJS — **COMPLETADA**
- ✅ Task #22: Deprecation warning para `unknownPropertyPolicy` + docs :::warning v2.0.0 — **COMPLETADA**
- ✅ Task #31: Docs nuevas features (Feb 2026) — `@QAlias`, `@QGroup`, `@QField`, `getFormSchema()`, etc. — **COMPLETADA** (docs ya presentes)
- ✅ Task #32: `checkRulesAsync` avanzado — timeout + modo serial/paralelo — **COMPLETADA** (ver detalles abajo)
- ✅ Task #33: Módulo `./forms` standalone — `qGroups`, `qGetGroups`, `qCheckRules`, `qCheckRulesAsync`, `qCheckRulesByGroup`, `qCheckRulesByGroupAsync` — **COMPLETADA** (22 Feb 2026)

---

---

## ✅ Task #32: `checkRulesAsync` — timeout, modo serial/paralelo, `IQRule<T>` genérico

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests añadidos:** +99 tests (1903 → 2002)  
**Archivos modificados:**

- `src/core/decorators/qrule.decorator.ts` — `IQRule<T>`, `IQRulesAsyncOptions` con `mode`
- `src/core/models/quick.model.ts` — `checkRulesAsync` paralelo+serial, timeout por predicado
- `src/index.ts` — export `IQRulesAsyncOptions`
- `docs-vitepress/en/guide/validation.md` — sección async ampliada
- `docs-vitepress/es/guide/validation.md` — ídem en español

**Funcionalidad entregada:**

1. **`IQRule<T>` genérico** — el predicado está tipado con el valor del campo (`(value: T) => boolean | Promise<boolean>`). El usuario puede anotar el parámetro en lugar de castear: `(value: string) => ...`.

2. **`IQRulesAsyncOptions.mode`** — `'parallel'` (default) | `'serial'`:
    - `parallel`: todos los predicados arrancan simultáneamente (`Promise.all`). Tiempo total ≈ `max(tiempos)`.
    - `serial`: los predicados se ejecutan uno tras otro en orden de declaración. Tiempo total ≈ `Σ(tiempos)`. Útil cuando hay efectos secundarios o el orden importa.

3. **`IQRulesAsyncOptions.timeoutMs`** — presupuesto máximo por predicado. Predicados que superan el límite fallan con `timedOut: true` en la entrada de error.

4. **`IQRulesAsyncOptions.timeoutMessage`** — `string | (() => string)`. Mensaje estático o lazy que reemplaza el de la regla cuando se produce timeout.

5. **`isValidAsync(options?)` y `validationReportAsync(options?)`** — propagan `options` a `checkRulesAsync`.

**Semántica de errores:**

| Situación                                     | `timedOut` | `message`                                                     |
| --------------------------------------------- | ---------- | ------------------------------------------------------------- |
| Predicado falla lógicamente dentro del budget | ausente    | mensaje de la regla                                           |
| Predicado rechaza (throw) dentro del budget   | ausente    | mensaje de la regla                                           |
| Predicado supera `timeoutMs`                  | `true`     | `timeoutMessage` si se proporcionó, si no mensaje de la regla |

**Tests cubiertos:**

- `tests/unit/validation/async-qrule.test.ts` — deferred helpers, timeout básico
- `tests/integration/models/qrule-timeout.test.ts` — 13 tests (delays reales, abandon semantics)
- `tests/integration/models/qrule-async-combinations.test.ts` — 40 tests (matriz completa: sin timeout, budget uniforme, budget variable, múltiples reglas por campo, crash vs timeout, instant, sync+async, timeoutMessage, combinación heterogénea, isValidAsync/validationReportAsync)
- `tests/integration/models/qrule-execution-mode.test.ts` — 35 tests (parallel/serial: corrección, orden, timing O(Σ) vs O(max), crash, múltiples reglas, serial+timeout)

---

## 🔴 ALTA PRIORIDAD (Críticas)

### ✅ Task #1: Remover console.log de código de producción

**Status:** ✅ COMPLETADA  
**Commit:** `2be2df2` - fix(population): replace console.log with Logger.debug  
**Fecha:** 5 de febrero de 2026  
**Resultado:** Console.log reemplazados por Logger.debug en population.service.ts  
**Tests:** Todos los tests pasan (1330 total)

<details>
<summary>Detalles de implementación (clic para expandir)</summary>

**Archivo modificado:** `src/core/services/population.service.ts` (líneas 194, 199)  
**Impacto:** Alto - Contamina logs en producción  
**Esfuerzo real:** 10 minutos  
**Pasos TDD:**

1. Escribir test que verifique ausencia de console.log
2. Reemplazar con `Logger.debug()`
3. Verificar que funciona con `enableDebugLogs: false`

```typescript
// Test: tests/unit/core/services/population-debug-removal.test.ts
describe('PopulationService: Debug code removal', () => {
	test('should not contain console.log in production code', async () => {
		const file = await Bun.file(
			'src/core/services/population.service.ts'
		).text();
		expect(file).not.toMatch(/console\.log/);
	});
});
```

---

## 🟡 MEDIA PRIORIDAD (Importantes)

### ✅ Task #2: Mejorar cobertura MCP tools (50% → 80%)

**Status:** ✅ COMPLETADA  
**Commit:** `5e80d64` - test(mcp): add comprehensive coverage for public tools  
**Fecha:** 5 de febrero de 2026  
**Resultado:** 45 nuevos tests agregados, cobertura aumentada a >80%  
**Tests totales:** 1285 → 1330 (+45 nuevos)

<details>
<summary>Detalles de implementación (clic para expandir)</summary>

**Archivos cubiertos:**

- ✅ `src/mcp/tools/public/list-transformers.tool.ts` (80%+)
- ✅ `src/mcp/tools/public/export-schema.tool.ts` (80%+)
- ✅ `src/mcp/tools/public/generate-mock.tool.ts` (80%+)
- ✅ `src/mcp/tools/public/interface-to-model.tool.ts` (80%+)
- ✅ `src/mcp/tools/public/json-to-model.tool.ts` (80%+)

**Impacto:** Alto - Son features públicas del MCP  
**Esfuerzo real:** 2-3 horas  
**ROI:** Alto (features ya implementadas, solo falta testing)

**Pasos TDD:**

```typescript
// Test: tests/mcp/integration/public-tools-coverage.test.ts
describe('MCP Public Tools - Full Coverage', () => {
	describe('list-transformers', () => {
		test('should list all registered transformers', async () => {
			const result = await listTransformersTool.execute({});
			expect(result.content[0].text).toContain('date');
			expect(result.content[0].text).toContain('bigint');
		});

		test('should include aliases in output', async () => {
			const result = await listTransformersTool.execute({});
			expect(result.content[0].text).toMatch(/Alias.*string/);
		});
	});

	describe('generate-mock', () => {
		test('should generate multiple mocks with count parameter', async () => {
			const result = await generateMockTool.execute({
				schema: { name: 'string', age: 'number' },
				count: 5,
			});
			const mocks = JSON.parse(result.content[0].text);
			expect(mocks).toHaveLength(5);
		});

		test('should handle nested schema definitions', async () => {
			const result = await generateMockTool.execute({
				schema: {
					user: { name: 'string', birth: 'date' },
					tags: 'set',
				},
			});
			const mock = JSON.parse(result.content[0].text);
			expect(mock.user).toHaveProperty('name');
			expect(mock.user.birth).toMatch(/^\d{4}-\d{2}-\d{2}/);
		});
	});
});
```

---

### ✅ Task #2.5: Unified Schema Generation API

**Status:** ✅ COMPLETADA  
**Commit:** `b9bb875` - feat(schema): add unified schema generation API with 7 formats  
**Fecha:** 6 de febrero de 2026  
**Resultado:** API unificada con 7 formatos de schema implementada  
**Tests:** 22 nuevos tests (1330 → 1352 total)  
**Archivos creados:**

- `src/core/types/schema-types.ts`
- `src/core/services/schema-generators.service.ts` (~400 líneas)
- `tests/unit/core/models/schema-generation.test.ts` (22 tests)

**Archivos modificados:**

- `src/core/models/quick.model.ts` - Métodos getSchema() estático e instancia

<details>
<summary>Detalles de implementación (clic para expandir)</summary>

**Impacto:** Alto - Feature muy valiosa para ecosistema  
**Esfuerzo real:** 4 horas  
**ROI:** Muy Alto (aumenta usabilidad y valor del proyecto)

**Descripción:**

API unificada con método `.getSchema(type)` para generar diferentes tipos de schemas:

**API Propuesta:**

```typescript
// Estático (sobre la clase)
User.getSchema('json'); // → JSON Schema (draft-07)
User.getSchema('zod'); // → Zod schema object
User.getSchema('mongo'); // → MongoDB/Mongoose schema
User.getSchema('typescript'); // → TypeScript interface string
User.getSchema('graphql'); // → GraphQL type definition
User.getSchema('openapi'); // → OpenAPI 3.0 schema
User.getSchema('ajv'); // → AJV-compatible schema

// Instancia (con ejemplos de valores)
user.getSchema('json'); // → JSON Schema + examples
user.getSchema('zod'); // → Zod schema (mismo que estático)
```

**Schema Types Implementados:**

1. **`'json'`** - JSON Schema Draft-07 (estándar universal)
2. **`'zod'`** - Zod validation schema (muy popular en TS)
3. **`'mongo'`** - MongoDB/Mongoose schema definition
4. **`'typescript'`** - TypeScript interface code string
5. **`'graphql'`** - GraphQL SDL type definition
6. **`'openapi'`** - OpenAPI 3.0 compatible schema
7. **`'ajv'`** - AJV validator schema (fast validation)

**Beneficios:**

- ✅ API limpia y extensible (`getSchema(type)`)
- ✅ Un solo método, múltiples formatos
- ✅ Fácil añadir nuevos tipos en el futuro
- ✅ Type-safe con union types: `'json' | 'zod' | 'mongo' | ...`
- ✅ Integración con todo el ecosistema TypeScript/Node

**Pasos TDD:**

```typescript
// Test: tests/unit/core/models/schema-generation.test.ts
import { z } from 'zod';

describe('QModel Unified Schema Generation API', () => {
	interface IUser {
		id: number;
		name: string;
		email: string;
		birth: string; // ISO date
		balance: string; // BigInt as string
		tags: string[]; // Set as array
	}

	@Quick({ birth: Date, balance: BigInt, tags: Set })
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare email: string;
		declare birth: Date;
		declare balance: bigint;
		declare tags: Set<string>;
	}

	// 1. JSON Schema (universal standard)
	test('User.getSchema("json") - generate JSON Schema', () => {
		const schema = User.getSchema('json');

		expect(schema).toMatchObject({
			$schema: 'http://json-schema.org/draft-07/schema#',
			type: 'object',
			title: 'User',
			properties: {
				id: { type: 'number' },
				name: { type: 'string' },
				email: { type: 'string' },
				birth: { type: 'string', format: 'date-time' },
				balance: { type: 'string', pattern: '^-?\\d+$' },
				tags: {
					type: 'array',
					items: { type: 'string' },
					uniqueItems: true,
				},
			},
			required: ['id', 'name', 'email', 'birth', 'balance', 'tags'],
		});
	});

	// 2. Zod Schema (validation)
	test('User.getSchema("zod") - generate Zod schema', () => {
		const zodSchema = User.getSchema('zod');

		expect(zodSchema).toBeInstanceOf(z.ZodObject);

		const validData = {
			id: 1,
			name: 'John',
			email: 'john@example.com',
			birth: '1990-01-01T00:00:00.000Z',
			balance: '999999999999',
			tags: ['typescript', 'node'],
		};

		expect(() => zodSchema.parse(validData)).not.toThrow();
	});

	// 3. MongoDB Schema
	test('User.getSchema("mongo") - generate MongoDB schema', () => {
		const mongoSchema = User.getSchema('mongo');

		expect(mongoSchema).toMatchObject({
			id: { type: Number, required: true },
			name: { type: String, required: true },
			email: { type: String, required: true },
			birth: { type: Date, required: true },
			balance: { type: String, required: true },
			tags: { type: [String], required: true },
		});
	});

	// 4. TypeScript Interface
	test('User.getSchema("typescript") - generate TS interface', () => {
		const tsInterface = User.getSchema('typescript');

		expect(tsInterface).toContain('interface IUser {');
		expect(tsInterface).toContain('id: number;');
		expect(tsInterface).toContain('birth: Date;');
		expect(tsInterface).toContain('balance: bigint;');
		expect(tsInterface).toContain('tags: Set<string>;');
	});

	// 5. GraphQL SDL
	test('User.getSchema("graphql") - generate GraphQL type', () => {
		const graphqlType = User.getSchema('graphql');

		expect(graphqlType).toContain('type User {');
		expect(graphqlType).toContain('id: Int!');
		expect(graphqlType).toContain('name: String!');
		expect(graphqlType).toContain('birth: DateTime!');
		expect(graphqlType).toContain('tags: [String!]!');
	});

	// 6. OpenAPI 3.0 Schema
	test('User.getSchema("openapi") - generate OpenAPI schema', () => {
		const openapiSchema = User.getSchema('openapi');

		expect(openapiSchema).toMatchObject({
			type: 'object',
			properties: {
				id: { type: 'integer' },
				name: { type: 'string' },
				birth: { type: 'string', format: 'date-time' },
			},
			required: ['id', 'name', 'email', 'birth', 'balance', 'tags'],
		});
	});

	// 7. AJV Schema (fast validation)
	test('User.getSchema("ajv") - generate AJV schema', () => {
		const ajvSchema = User.getSchema('ajv');

		expect(ajvSchema).toHaveProperty('type', 'object');
		expect(ajvSchema).toHaveProperty('properties');
		expect(ajvSchema).toHaveProperty('required');
	});

	// 8. Instance with examples
	test('user.getSchema("json") - JSON Schema with examples', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@test.com',
			birth: '1990-01-01',
			balance: '123456789',
			tags: ['ts', 'node'],
		});

		const schema = user.getSchema('json');

		expect(schema.properties.id).toHaveProperty('example', 1);
		expect(schema.properties.name).toHaveProperty('example', 'John');
		expect(schema.properties.birth).toHaveProperty('example');
	});

	// 9. Invalid schema type
	test('should throw on invalid schema type', () => {
		expect(() => User.getSchema('invalid' as any)).toThrow(
			'Unknown schema type: invalid'
		);
	});
});
```

**Implementación Sugerida:**

````typescript
// src/core/types/schema-types.ts
export type QSchemaType =
	| 'json' // JSON Schema Draft-07
	| 'zod' // Zod validation
	| 'mongo' // MongoDB/Mongoose
	| 'typescript' // TypeScript interface
	| 'graphql' // GraphQL SDL
	| 'openapi' // OpenAPI 3.0
	| 'ajv'; // AJV validator

// src/core/models/quick.model.ts
import type { QSchemaType } from '@/core/types/schema-types';

export class QModel<TInterface = any> {
	// Existing code...

	/**
	 * Generate schema in multiple formats
	 * @param type - Schema type: 'json' | 'zod' | 'mongo' | 'typescript' | 'graphql' | 'openapi' | 'ajv'
	 * @static
	 * @example
	 * ```ts
	 * const jsonSchema = User.getSchema('json');
	 * const zodSchema = User.getSchema('zod');
	 * const mongoSchema = User.getSchema('mongo');
	 * ```
	 */
	static getSchema<T extends typeof QModel>(this: T, type: QSchemaType): any {
		const decoratorConfig =
			Reflect.getMetadata(QUICK_METADATA_KEY, this.prototype) || {};

		switch (type) {
			case 'json':
				return this._generateJsonSchema(decoratorConfig);
			case 'zod':
				return this._generateZodSchema(decoratorConfig);
			case 'mongo':
				return this._generateMongoSchema(decoratorConfig);
			case 'typescript':
				return this._generateTypeScriptInterface(decoratorConfig);
			case 'graphql':
				return this._generateGraphQLType(decoratorConfig);
			case 'openapi':
				return this._generateOpenAPISchema(decoratorConfig);
			case 'ajv':
				return this._generateAjvSchema(decoratorConfig);
			default:
				throw new Error(`Unknown schema type: ${type}`);
		}
	}

	/**
	 * Generate schema with examples from instance values
	 * @param type - Schema type
	 * @example
	 * ```ts
	 * const user = new User({ id: 1, name: 'John' });
	 * const schema = user.getSchema('json'); // Includes examples
	 * ```
	 */
	getSchema(type: QSchemaType): any {
		const classSchema = (this.constructor as typeof QModel).getSchema(type);

		// For JSON/OpenAPI, add examples from instance
		if (type === 'json' || type === 'openapi') {
			return this._addExamplesToSchema(classSchema);
		}

		return classSchema;
	}

	// Private helper methods
	private static _generateJsonSchema(config: any): object {
		// Implementation...
	}

	private static _generateZodSchema(config: any): z.ZodObject<any> {
		// Implementation...
	}

	private static _generateMongoSchema(config: any): object {
		// Implementation...
	}

	private static _generateTypeScriptInterface(config: any): string {
		// Implementation...
	}

	private static _generateGraphQLType(config: any): string {
		// Implementation...
	}

	private static _generateOpenAPISchema(config: any): object {
		// Implementation...
	}

	private static _generateAjvSchema(config: any): object {
		// Implementation...
	}

	private _addExamplesToSchema(schema: any): object {
		// Add example values from this instance
		// Implementation...
	}

	/**
	 * Generate MongoDB schema definition
	 * @static
	 */
	static getMongoSchema<T extends typeof QModel>(
		this: T
	): Record<string, any> {
		// Convert to Mongoose-compatible schema...
		return mongoSchema;
	}

	/**
	 * Generate JSON Schema from instance with examples
	 */
	getSchema(): Record<string, any> {
		const classSchema = (this.constructor as typeof QModel).getSchema();
		// Add example values from instance...
		return enhancedSchema;
	}

	/**
	 * Get Zod schema with current instance data
	 */
	getZodSchema(): z.ZodObject<any> {
		return (this.constructor as typeof QModel).getZodSchema();
	}

	/**
	 * Get MongoDB schema from instance
	 */
	getMongoSchema(): Record<string, any> {
		return (this.constructor as typeof QModel).getMongoSchema();
	}
}
````

---

### ✅ Task #3: Casos edge para transformers compuestos

**Status:** ✅ COMPLETADA  
**Commit:** `1c44266` - test(transformers): add composed transformers edge cases coverage  
**Fecha:** 6 de febrero de 2026  
**Resultado:** 15 tests comprehensivos, auto-detección de tipos en Map/Set, serialización con Symbol keys  
**Tests:** 1352 → 1367 (+15 nuevos)

<details>
<summary>Detalles de implementación (clic para expandir)</summary>

**Casos implementados:**

1. ✅ `Map<Symbol, Date>` - tipos compuestos con Symbol keys
2. ✅ `Set<Map<string, BigInt>>` - 3 niveles de anidamiento
3. ✅ `Array<Set<Date>>` - manejo de sets vacíos y poblados
4. ✅ `Map<string, Error[]>` - arrays de tipos complejos en Maps
5. ✅ Null/undefined en colecciones anidadas
6. ✅ Arrays 3D con transformers de Date
7. ✅ Múltiples tipos compuestos simultáneamente
8. ✅ Referencias circulares en estructuras compuestas

**Mejoras implementadas:**

- Auto-detección en MapTransformer/SetTransformer:
    - Date (strings ISO: "2024-01-01" o "2024-01-01T00:00:00Z")
    - BigInt (strings numéricos >15 dígitos)
    - Symbol (Symbol.for con strings tipo "global.key")
    - Error (objetos con name/message)
    - Maps anidados (arrays de tuples)
    - Transformación recursiva de valores

- Serialización inteligente de Maps:
    - Maps con Symbol keys → array de tuples (preserva info)
    - Maps sin Symbol keys → objeto plano (JSON estándar)
    - Serialización recursiva de valores complejos

**Impacto:** Alto - Prevención de bugs en producción  
**Esfuerzo real:** 1.5 horas (estimado: 3-4h)  
**ROI:** Excelente - Detecta casos edge antes de llegar a producción

</details>

**Casos a testear (LEGACY - mantener para referencia):**

1. `Map<Symbol, Date>` - tipos compuestos
2. `Set<Map<string, BigInt>>` - 3 niveles de anidamiento
3. `Array<Set<Date>>` - manejo de sets vacíos
4. `Map<string, Error[]>` - arrays de tipos complejos

**Pasos TDD:**

```typescript
// Test: tests/unit/transformers/composed-edge-cases.test.ts
describe('Composed Transformers Edge Cases', () => {
	test('Map<Symbol, Date> - composed types', () => {
		interface IComplex {
			timeline: [string, string][]; // Backend: [[symbolKey, isoDate]]
		}

		@Quick({ timeline: Map })
		class Complex extends QModel<IComplex> {
			declare timeline: Map<symbol, Date>;
		}

		const model = new Complex({
			timeline: [
				['global.key1', '2024-01-01'],
				['global.key2', '2024-12-31'],
			],
		});

		const key1 = Symbol.for('global.key1');
		expect(model.timeline.get(key1)).toBeInstanceOf(Date);
	});

	test('Set<Map<string, BigInt>> - 3-level nesting', () => {
		interface IDeep {
			data: [[string, string][]][]; // Array of arrays of tuples
		}

		@Quick({ data: [Set] })
		class Deep extends QModel<IDeep> {
			declare data: Set<Map<string, bigint>>[];
		}

		const model = new Deep({
			data: [[[['a', '123n']], [['b', '456n']]], [[['c', '789n']]]],
		});

		expect(model.data[0]).toBeInstanceOf(Set);
		const firstMap = Array.from(model.data[0])[0];
		expect(firstMap).toBeInstanceOf(Map);
		expect(firstMap.get('a')).toBe(123n);
	});

	test('Array<Set<Date>> - handles empty sets gracefully', () => {
		@Quick({ calendars: [Set] })
		class Calendars extends QModel<any> {
			declare calendars: Set<Date>[];
		}

		const model = new Calendars({
			calendars: [[], ['2024-01-01'], []],
		});

		expect(model.calendars).toHaveLength(3);
		expect(model.calendars[0].size).toBe(0);
		expect(model.calendars[1].size).toBe(1);
		expect(model.calendars[2].size).toBe(0);
	});
});
```

---

### ✅ Task #4: WeakMap/WeakSet Transformers

**Status:** ✅ COMPLETADA  
**Commit:** PENDING - feat(transformers): add WeakMap/WeakSet support with serialization restrictions  
**Fecha:** 6 de febrero de 2026  
**Resultado:** 14 tests comprehensivos, transformers funcionales con restricciones de serialización  
**Tests:** 1367 → 1381 (+14 nuevos)

<details>
<summary>Detalles de implementación (clic para expandir)</summary>

**Decisión:** Enfoque híbrido - Transformers funcionales con restricciones claras

**Archivos creados:**

- `src/transformers/weak-collections.transformer.ts` - WeakMapTransformer y WeakSetTransformer
- `tests/unit/transformers/weak-collections.test.ts` - 14 tests comprehensivos

**Features implementadas:**

1. ✅ **WeakMapTransformer**
    - Deserialización: array de tuples `[[key, value]]` → WeakMap
    - Validación: Solo acepta objetos como keys (no primitives)
    - Auto-transformación: Detecta y convierte `"Symbol.for(key)"` → Symbol
    - Serialización: **BLOQUEADA** con error descriptivo
    - Mensaje de error: Guía al usuario para usar Map o excludeFields

2. ✅ **WeakSetTransformer**
    - Deserialización: array de objetos → WeakSet
    - Validación: Solo acepta objetos (no primitives)
    - Deduplicación automática (comportamiento nativo de Set)
    - Serialización: **BLOQUEADA** con error descriptivo
    - Mensaje de error: Guía al usuario para usar Set o excludeFields

3. ✅ **Integración en sistema**
    - Registrados en TransformerLookupService
    - Registrados en Serializer service
    - Registrados en ValidationService
    - Detección en Serializer.serializeValue() para lanzar error temprano

**Casos edge cubiertos:**

1. ✅ WeakMap vacío
2. ✅ WeakMap con valores complejos (objetos, null, undefined)
3. ✅ WeakMap con Symbol values (auto-transformación)
4. ✅ Rechazo de keys no-object en WeakMap
5. ✅ WeakSet vacío
6. ✅ WeakSet con deduplicación
7. ✅ WeakSet con objetos de cualquier estructura
8. ✅ Rechazo de valores primitivos en WeakSet
9. ✅ Error descriptivo al intentar serializar WeakMap
10. ✅ Error descriptivo al intentar serializar WeakSet

**Use case legítimo:**

```typescript
// Runtime-only cache con garbage collection automático
@Quick({ cache: WeakMap })
class UserService extends QModel<IUser> {
	declare cache: WeakMap<HTMLElement, User>;

	// Cache se limpia automáticamente cuando elements son removed del DOM
}

// NOTA: Para serialización, usar excludeFields (feature futura)
// o simplemente no serializar modelos con WeakMap/WeakSet
```

**Impacto:** Medio - Previene confusión y proporciona guía clara  
**Esfuerzo real:** 1.5 horas (estimado: 1-2h)  
**ROI:** Alto - Evita errores y documenta limitaciones técnicas

</details>

**Limitaciones técnicas (documentadas):**

- WeakMap y WeakSet **NO son serializables** (keys/values no-enumerables)
- Diseñados para caché runtime con GC automático
- Para serialización, usar Map/Set normales

---

### Task #5: Performance benchmarks

**Status:** 🟢 TODO  
**Impacto:** Bajo - Marketing y credibilidad  
**Esfuerzo:** 4-6 horas

**Métricas a medir:**

1. Transformación de 10k Date objects (<100ms)
2. Serialization roundtrip de 1k models (<50ms)
3. Memory leaks en referencias circulares
4. Comparación con class-transformer, io-ts, zod

**Pasos TDD:**

```typescript
// Test: tests/performance/transformation-benchmarks.test.ts
describe('Performance Benchmarks', () => {
	test('should transform 10k Date objects under 100ms', () => {
		interface IData {
			dates: string[];
		}

		@Quick({ dates: [Date] })
		class Data extends QModel<IData> {
			declare dates: Date[];
		}

		const dates = Array(10000).fill('2024-01-01T00:00:00Z');

		const start = performance.now();
		const model = new Data({ dates });
		const elapsed = performance.now() - start;

		expect(model.dates).toHaveLength(10000);
		expect(elapsed).toBeLessThan(100);
	});

	test('should serialize/deserialize roundtrip 1k models under 50ms', () => {
		@Quick({ created: Date, balance: BigInt })
		class User extends QModel<any> {
			declare id: number;
			declare created: Date;
			declare balance: bigint;
		}

		const users = Array(1000)
			.fill(0)
			.map((_, i) => ({
				id: i,
				created: '2024-01-01',
				balance: '99999999999',
			}));

		const start = performance.now();
		const models = users.map((u) => new User(u));
		const serialized = models.map((m) => m.serialize());
		const elapsed = performance.now() - start;

		expect(serialized).toHaveLength(1000);
		expect(elapsed).toBeLessThan(50);
	});

	test('memory: should not leak on circular references', () => {
		const before = process.memoryUsage().heapUsed;

		for (let i = 0; i < 1000; i++) {
			const circular: any = { self: null };
			circular.self = circular;

			@Quick()
			class Circular extends QModel<any> {
				declare self: any;
			}

			new Circular(circular);
		}

		global.gc?.();
		const after = process.memoryUsage().heapUsed;
		const leak = (after - before) / 1024 / 1024; // MB

		expect(leak).toBeLessThan(10);
	});
});
```

**Nuevo script:**

```json
// package.json
{
	"scripts": {
		"bench": "bun --expose-gc test tests/performance",
		"bench:compare": "bun run scripts/compare-libs.ts"
	}
}
```

---

### ✅ Task #6: Computed properties serialization

**Status:** 🟢 TODO  
**Impacto:** Bajo - Feature request potencial  
**Esfuerzo:** 2-3 horas  
**Decisión:** Esperar feedback de comunidad

**Pasos TDD:**

```typescript
// Test: tests/unit/serialization/computed-properties.test.ts
describe('Computed Properties & Getters', () => {
	test('should NOT serialize getters by default', () => {
		@Quick({ birthDate: Date })
		class User extends QModel<any> {
			declare birthDate: Date;
			declare firstName: string;
			declare lastName: string;

			get age(): number {
				const now = new Date();
				return now.getFullYear() - this.birthDate.getFullYear();
			}

			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = new User({
			firstName: 'John',
			lastName: 'Doe',
			birthDate: '1990-01-01',
		});

		expect(user.age).toBeGreaterThan(30);
		expect(user.fullName).toBe('John Doe');

		const json = JSON.parse(user.toJSON());
		expect(json).not.toHaveProperty('age');
		expect(json).not.toHaveProperty('fullName');
	});

	test('should include computed properties with exposeComputedFields option', () => {
		@Quick(
			{ birthDate: Date },
			{
				serialization: {
					exposeComputedFields: ['age', 'fullName'],
				},
			}
		)
		class User extends QModel<any> {
			declare birthDate: Date;
			declare firstName: string;
			declare lastName: string;

			get age(): number {
				const now = new Date();
				return now.getFullYear() - this.birthDate.getFullYear();
			}

			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = new User({
			firstName: 'Jane',
			lastName: 'Smith',
			birthDate: '1995-06-15',
		});

		const json = JSON.parse(user.toJSON());
		expect(json.age).toBeGreaterThan(25);
		expect(json.fullName).toBe('Jane Smith');
	});
});
```

---

## 📊 RESUMEN DE TAREAS

### Tareas históricas (v1.0.0)

| #   | Tarea                         | Prioridad | Estado   | Esfuerzo | Impacto  |
| --- | ----------------------------- | --------- | -------- | -------- | -------- |
| 1   | Remover console.log           | 🔴 Alta   | ✅ HECHO | 10min    | Alto     |
| 2   | Cobertura MCP tools           | 🟡 Media  | ✅ HECHO | 2-3h     | Alto     |
| 2.5 | Schema Generation API         | 🟡 Media  | ✅ HECHO | 4h       | Muy Alto |
| 3   | Casos edge compuestos         | 🟡 Media  | ✅ HECHO | 1.5h     | Alto     |
| 4   | WeakMap/WeakSet transformers  | 🟡 Media  | ✅ HECHO | 1.5h     | Medio    |
| 5   | MCP Prompts documentados      | 🟡 Media  | ✅ HECHO | 2h       | Alto     |
| 6   | `excludeFields` serialización | 🟡 Media  | ✅ HECHO | 2h       | Alto     |
| 7   | Error path coverage MCP       | 🟡 Media  | ✅ HECHO | 2h       | Medio    |
| 8   | Refactor sidebar MCP          | 🟢 Baja   | ✅ HECHO | 1h       | Bajo     |
| 9   | Debug console.log config      | 🔴 Alta   | ✅ HECHO | 30min    | Medio    |
| 10  | Docs excludeFields EN+ES      | 🟡 Media  | ✅ HECHO | 2h       | Medio    |

### Tareas sprint seguridad/robustez (Feb 2026 — identificadas en revisión completa)

| #   | Tarea                                         | Prioridad | Estado        | Esfuerzo  | Impacto         | Fecha Est. |
| --- | --------------------------------------------- | --------- | ------------- | --------- | --------------- | ---------- |
| 11  | `safeStringify` truncado 500 chars            | 🔴 Alta   | ✅ COMPLETADA | 30min     | Alto (seg.)     | Feb 22     |
| 12  | Warning `disableSafetyChecks` activo          | 🔴 Alta   | ✅ COMPLETADA | 30min     | Alto (seg.)     | Feb 22     |
| 13  | Script `release:check` alias en package.json  | 🔴 Alta   | ✅ COMPLETADA | 0min      | Medio (DX)      | Feb 22     |
| 14  | Tests negativos `JsonSchemaGenerator`         | 🟡 Media  | ⏳ TODO       | 1-2h      | Medio           | Feb 24-25  |
| 15  | Tests `disableSafetyChecks` (flag + warning)  | 🟡 Media  | ✅ COMPLETADA | `c615290` | +7              |
| 16  | Tests `transformCase` herencia multinivel     | 🟡 Media  | ✅ COMPLETADA | pendiente | +10             |
| 17  | Performance benchmarks baseline               | 🟡 Media  | ⏸️ BACKLOG    | 4-6h      | Alto (mktg.)    | Mar 2026   |
| 18  | `@QComputed()` / `exposeComputedFields`       | 🟡 Media  | ✅ COMPLETADA | 3h        | Alto (DX)       | Feb 2026   |
| 19  | `QTransformerRegistry.snapshot()/restore()`   | 🟡 Media  | ✅ COMPLETADA | pendiente | +10             |
| 20  | `@QRule` async predicates                     | 🟢 Baja   | ✅ COMPLETADA | —         | Medio           | Feb 2026   |
| 21  | Guía integración NestJS                       | 🟢 Baja   | ✅ COMPLETADA | 3h        | Alto (adop.)    | Feb 2026   |
| 22  | Default `unknownPropertyPolicy: 'strip'` v2.0 | 🟢 Baja   | ✅ COMPLETADA | 2h        | Alto (breaking) | Feb 2026   |

### Nuevas features implementadas en sprint Feb 2026 (no registradas previamente)

| #   | Tarea                                                | Prioridad | Estado        | Commit     | Tests |
| --- | ---------------------------------------------------- | --------- | ------------- | ---------- | ----- |
| 23  | `copy()` + `isDirty(field?)`                         | 🔴 Alta   | ✅ COMPLETADA | `a8089a7`  | +10   |
| 24  | `@QRule` decorator + `checkRules()`                  | 🔴 Alta   | ✅ COMPLETADA | `8a2910b`  | +12   |
| 25  | `hasIntegrity()` + `isValid()`                       | 🔴 Alta   | ✅ COMPLETADA | `cd30a8b`  | +8    |
| 26  | `createMany()` con batch validation                  | 🟡 Media  | ✅ COMPLETADA | `3faf88b`  | +14   |
| 27  | `@QField` + `validationReport()` + `getFormSchema()` | 🟡 Media  | ✅ COMPLETADA | `00d56c7`  | +15   |
| 28  | `QModel.extends()` simplificación de generics        | 🟡 Media  | ✅ COMPLETADA | `4ff1d55`  | +6    |
| 29  | `@QAlias` + `@QGroup` decorators                     | 🟡 Media  | ✅ COMPLETADA | `a714b2e`  | +18   |
| 30  | `createReadonly()` refactor + async `checkRules()`   | 🟡 Media  | ✅ COMPLETADA | `05bcb8c`  | +8    |
| 31  | Docs nuevas features (Feb 2026)                      | 🔴 Alta   | ✅ COMPLETADA | ya escrita | —     |

**Progreso:**

- ✅ Completadas: 28/31 (90%) — 1826 tests passing
- ⏳ Pendientes activas: 0/31 (0%)
- ⏸️ Backlog: 4/31 (13%)

**Tiempo invertido (histórico):** ~31h  
**Tiempo restante estimado (activas):** ~6-8h

---

## � SPRINT SEGURIDAD/ROBUSTEZ (22-25 Feb 2026)

### Contexto

Revisión completa del 22 de febrero identificó vulnerabilidades de seguridad y gaps de cobertura. Estas tareas son prioritarias antes de cualquier feature nueva.

---

### ✅ Task #11: Truncar `safeStringify` a 500 chars

**Status:** ✅ COMPLETADA  
**Commit:** `f6324ec` — fix(security): Task #11 safeStringify truncation + Task #12 disableSafetyChecks warning  
**Fecha:** 22 de febrero de 2026  
**Resultado:** `safeStringify` acepta `maxLength = 500` (por defecto); salida truncada con `...[truncated]`; 7 nuevos tests  
**Tests:** 1765 → 1772 (+7)

**Archivos modificados:**

- `src/core/helpers/transform-helpers.ts` — añadido parámetro `maxLength = 500`
- `tests/unit/core/helpers/transform-helpers.test.ts` — 7 nuevos tests en `describe('safeStringify', ...)`

**Problema:**  
`safeStringify` se usa en todos los transformers para mensajes de error. Sin límite de longitud, un payload de 100MB válido JSON-serializable genera mensajes de error del mismo tamaño, saturando logs y exponiendo datos sensibles.

**Pasos TDD:**

```typescript
// Test: tests/unit/core/helpers/transform-helpers.test.ts (agregar casos)
describe('safeStringify: output truncation', () => {
	test('should truncate output at 500 chars by default', () => {
		const huge = { data: 'x'.repeat(1000) };
		const result = safeStringify(huge);
		expect(result.length).toBeLessThanOrEqual(503); // 500 + '...'
		expect(result).toMatch(/\.\.\.\[truncated\]$/);
	});

	test('should allow custom maxLength', () => {
		const result = safeStringify({ a: 'x'.repeat(200) }, undefined, 100);
		expect(result.length).toBeLessThanOrEqual(103);
	});

	test('should not truncate short values', () => {
		const result = safeStringify({ id: 1, name: 'test' });
		expect(result).not.toContain('[truncated]');
	});
});
```

**Implementación:**

```typescript
// src/core/helpers/transform-helpers.ts
export function safeStringify(
	value: unknown,
	space?: number,
	maxLength = 500
): string {
	const visited = new WeakSet();
	try {
		const result = JSON.stringify(
			value,
			(_key, val) => {
				if (typeof val === 'object' && val !== null) {
					if (visited.has(val)) return '[Circular]';
					visited.add(val);
				}
				return val;
			},
			space
		);
		if (result && result.length > maxLength) {
			return result.slice(0, maxLength) + '...[truncated]';
		}
		return result ?? 'undefined';
	} catch {
		return `[Unserializable: ${typeof value}]`;
	}
}
```

**JSDoc a actualizar:** `safeStringify` en `src/core/helpers/transform-helpers.ts`  
**Docs a actualizar:** ninguna doc pública (es helper interno)

---

### ✅ Task #12: Warning cuando `disableSafetyChecks` está activo

**Status:** ✅ COMPLETADA  
**Commit:** `f6324ec` — fix(security): Task #11 safeStringify truncation + Task #12 disableSafetyChecks warning  
**Fecha:** 22 de febrero de 2026  
**Resultado:** `PopulationService` emite `Logger.warn` al instanciar un modelo con `disableSafetyChecks: true`; solo en depth=0 para evitar spam; 5 nuevos tests  
**Tests:** 1772 → 1777 (+5)

**Archivos modificados:**

- `src/core/services/population.service.ts` — warning en `populateInstance()` cuando `disableSafetyChecks && depth === 0`
- `tests/unit/core/config/system-performance.test.ts` — 5 nuevos tests en `describe('disableSafetyChecks: security warning', ...)`

**Problema:**  
`performance.disableSafetyChecks: true` en `@Quick()` o `QConfig.configure()` desactiva **todas** las protecciones de seguridad silenciosamente. Un developer de back-end que lo active "para performance" en producción abre un vector de prototype pollution y DoS.

**Pasos TDD:**

```typescript
// Test: tests/unit/core/services/population-safety-warning.test.ts
import { Logger } from '@/core/helpers/logger.helper';

describe('disableSafetyChecks warning', () => {
	test('should emit Logger.warn when disableSafetyChecks is true', () => {
		const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

		@Quick({ performance: { disableSafetyChecks: true } })
		class Dangerous extends QModel<any> {
			declare id: number;
		}

		new Dangerous({ id: 1 });

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks')
		);
		warnSpy.mockRestore();
	});

	test('should NOT warn when disableSafetyChecks is false (default)', () => {
		const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

		@Quick()
		class Safe extends QModel<any> {
			declare id: number;
		}

		new Safe({ id: 1 });
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
```

**Implementación** en `src/core/services/population.service.ts` y `src/core/models/quick.model.ts`:

```typescript
if (disableSafetyChecks) {
	Logger.warn(
		'QuickModel [SECURITY]: disableSafetyChecks is ENABLED on ' +
			`"${(modelClass as Function).name}". ` +
			'All security protections (prototype pollution, recursion limits, size limits) are bypassed. ' +
			'Do NOT use this in production with untrusted input.'
	);
}
```

**JSDoc a actualizar:** `IQAdvancedOptions.performance.disableSafetyChecks` en `src/core/interfaces/quick-options.interface.ts` y `IQConfig.defaults.performance.disableSafetyChecks` en `src/core/config/quick.config.ts` — añadir `@remarks` con advertencia de seguridad.  
**Docs a actualizar:** guía de configuration EN+ES → añadir sección de advertencia con `:::danger` adblock de VitePress.

---

### ✅ Task #13: Script `release:check` como alias en package.json

**Status:** ✅ COMPLETADA  
**Prioridad:** 🔴 Alta — DX/proceso  
**Esfuerzo:** 0 minutos — ya estaba en package.json  
**Resultado:** El script ya existe: `"release:check": "./scripts/pre-release.sh"`

**Verificado:** `package.json` línea ~88 ya contiene el alias correcto.

---

### Task #14: Tests negativos para `JsonSchemaGenerator` con tipos sin transformer

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests:** 1794 → 1807 (+13)  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 1-2 horas  
**Impacto:** Medio — fix real descubierto: los tipos array `[String]`, `[Date]`, `[Number]` producían `{ type: 'string' }` en lugar de `{ type: 'array' }` en el JSON Schema

**Hallazgos TDD:**

1. `_getJsonSchemaType(undefined)` devuelve `{ type: 'string' }` — comportamiento documentado, consistente (no es un bug, es un fallback intencionado)
2. Propiedades no declaradas en el type map de `@Quick` NO aparecen en el schema — comportamiento documentado
3. **BUG REAL:** tipos array (`[String]`, `[Number]`, `[Date]`) producían `{ type: 'string' }` en lugar de `{ type: 'array' }` — CORREGIDO

**Fix implementado** en `src/core/services/schema-generators.service.ts`:

- Añadido bloque `if (Array.isArray(transformer))` antes del switch
- Detecta notación `[Type]` y devuelve `{ type: 'array', items: <tipo_inferido> }`
- Recursivo: `[Date]` → `{ type: 'array', items: { type: 'string', format: 'date-time' } }`

**Archivos:**

- `tests/unit/core/services/schema-generators-fallback.test.ts` — 13 nuevos tests (documentación + regression)
- `src/core/services/schema-generators.service.ts` — fix en `_getJsonSchemaType`

**Pasos TDD:**

```typescript
// Test: tests/unit/core/services/schema-generators.test.ts (agregar casos)
describe('JsonSchemaGenerator: tipos sin transformer', () => {
	test('number property without transformer should NOT produce type:string', () => {
		@Quick()
		class Item extends QModel<any> {
			declare id: number;
			declare name: string;
			declare active: boolean;
		}

		const schema = Item.getSchema('json');
		// Debe inferir de design:type metadata en lugar de devolver string
		expect(schema.properties.id.type).not.toBe('string');
		expect(schema.properties.active.type).not.toBe('string');
	});

	test('should throw or return unknown type for completely unresolvable types', () => {
		// Asegurar que el fallback está documentado y es predecible
		const result = JsonSchemaGenerator['_getJsonSchemaType'](undefined);
		// Al menos debe ser consistente (no random)
		expect(result).toBeDefined();
	});
});
```

**Implementación sugerida** en `schema-generators.service.ts`:

- Usar `Reflect.getMetadata('design:type', prototype, key)` como fallback antes de devolver `{ type: 'string' }`
- Si no hay metadata de diseño, devolver `{}` (schema vacío, acepta cualquier tipo) en lugar de `{ type: 'string' }`

**JSDoc a actualizar:** `JsonSchemaGenerator._getJsonSchemaType` — documentar el comportamiento de fallback explícitamente.

---

### Task #15: Tests específicos para la flag `disableSafetyChecks`

**Status:** ✅ COMPLETADA  
**Commit:** `c615290`  
**Fecha:** 22 de febrero de 2026  
**Resultado:** 7 tests documentando comportamiento exacto: prototype pollution siempre bloqueada (3 casos), checks de tamaño bypasseados (2 casos), mensaje de warning correcto (1 caso), funcionalidad normal con flag (1 caso)  
**Tests:** 1784 → 1794 (en sesión, +10 con Task #16)  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 1 hora  
**Impacto:** Medio — documenta explícitamente qué checks se desactivan/mantienen con `disableSafetyChecks: true`

**Pasos TDD:**

```typescript
// Test: tests/security/disable-safety-checks.test.ts
describe('disableSafetyChecks: behavior verification', () => {
	test('should bypass maxArrayLength limit when disableSafetyChecks is true', () => {
		@Quick({ performance: { disableSafetyChecks: true } })
		class BigModel extends QModel<any> {
			declare items: unknown[];
		}

		// Con 10001 items (supera el límite de 10000)
		const bigArray = Array(10001).fill('x');
		expect(() => new BigModel({ items: bigArray })).not.toThrow();
	});

	test('should still throw prototype pollution even with disableSafetyChecks', () => {
		// ⚠️ Verificar que al menos prototype pollution sigue bloqueada
		// O documentar explícitamente que TAMBIÉN se desactiva
		@Quick({ performance: { disableSafetyChecks: true } })
		class Risky extends QModel<any> {
			declare id: number;
		}

		// Este test define qué pasa — puede ser throw o silencioso — pero debe ser explícito
		const dangerous = { id: 1, __proto__: { hacked: true } };
		const result = () => new Risky(dangerous as any);
		// Documentar el comportamiento real aquí
		expect(result).not.toThrow(); // o expect(result).toThrow() — lo que sea, pero documentado
	});
});
```

**Docs a actualizar:** guía de seguridad EN+ES — tabla con qué checks se desactivan/mantienen con `disableSafetyChecks: true`.

---

### Task #16: Tests de `transformCase` con herencia multinivel

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Resultado:** 10 tests — 2-level (3 tests), 3-level (5 tests globales/decorator/overrides), kebab-case (1 test); la implementación ya soportaba herencia correctamente; los tests sirven como regresión y documentación  
**Tests:** +10 sobre base de 1784  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 2 horas  
**Impacto:** Medio — garantiza que la transformación de case funciona correctamente en jerarquías

**Pasos TDD:**

```typescript
// Test: tests/integration/inheritance/transform-case-inheritance.test.ts
describe('transformCase with multi-level inheritance', () => {
	test('snake_case in -> camelCase out with 3-level inheritance', () => {
		QConfig.configure({
			defaults: { transformCase: { in: 'snake_case', out: 'camelCase' } },
		});

		class Base extends QModel<any> {
			declare base_field: string;
		}

		class Middle extends Base {
			declare middle_field: string;
		}

		@Quick()
		class Child extends Middle {
			declare child_field: string;
		}

		const child = new Child({
			base_field: 'a',
			middle_field: 'b',
			child_field: 'c',
		} as any);

		const serialized = child.serialize() as any;
		expect(serialized.baseField).toBe('a');
		expect(serialized.middleField).toBe('b');
		expect(serialized.childField).toBe('c');

		QConfig.reset();
	});
});
```

**JSDoc a actualizar:** `IQConfig.defaults.transformCase` — añadir ejemplo con herencia.  
**Docs a actualizar:** guía de configuration EN+ES — sección de transformCase con nota sobre herencia.

---

## 🟡 SPRINT COVERAGE GAPS + FEATURES (Mar 2026)

---

### Task #17: Performance benchmarks baseline

**Status:** ✅ COMPLETADA  
**Fecha:** 23 de febrero de 2026  
**Prioridad:** 🟡 Media  
**Esfuerzo real:** 3 horas  
**Impacto:** Alto — credibilidad del proyecto, detección de regresiones

**Archivos creados:**

- `tests/performance/comparison-benchmarks.test.ts` — 6 escenarios: objetos simples, tipos complejos, roundtrip, validación batch, mock generation, objetivos #17
- `docs-vitepress/.vitepress/theme/BenchmarkChart.vue` — gráfica interactiva con tabs por escenario, barras animadas, tooltips hover con feature matrix

**Archivos modificados:**

- `package.json` — scripts `bench` y `bench:compare`
- `docs-vitepress/en/index.md` — `<BenchmarkChart />` entre hero y "Why QuickModel?"
- `docs-vitepress/es/index.md` — ídem en español
- `docs-vitepress/.vitepress/theme/index.ts` — registro global del componente

**Métricas objetivo:**

- 10k `Date` objects transformados en < 100ms
- Roundtrip serialize/deserialize de 1k models en < 50ms
- Sin memory leaks en referencias circulares (< 10MB de diferencia tras GC)
- Comparativa vs `class-transformer`, `Zod` pura

**Nuevo script package.json:**

```json
"bench": "bun --expose-gc test tests/performance",
"bench:compare": "bun run scripts/compare-libs.ts"
```

**Pasos TDD:**

```typescript
// Test: tests/performance/transformation-benchmarks.test.ts
describe('Performance Benchmarks', () => {
	test('should transform 10k Date objects under 100ms', () => {
		@Quick({ dates: [Date] })
		class Data extends QModel<any> {
			declare dates: Date[];
		}
		const start = performance.now();
		new Data({ dates: Array(10000).fill('2024-01-01T00:00:00Z') });
		expect(performance.now() - start).toBeLessThan(100);
	});

	test('should roundtrip 1k models serialize+deserialize under 50ms', () => {
		@Quick({ created: Date, balance: BigInt })
		class User extends QModel<any> {
			declare id: number;
			declare created: Date;
			declare balance: bigint;
		}
		const users = Array.from({ length: 1000 }, (_, i) => ({
			id: i,
			created: '2024-01-01',
			balance: '9999999999',
		}));
		const start = performance.now();
		const models = users.map((u) => new User(u));
		models.forEach((m) => m.serialize());
		expect(performance.now() - start).toBeLessThan(50);
	});
});
```

**Docs a actualizar:** README.md — sección de performance con tabla de resultados (una vez obtenidos los números reales).

---

### Task #18: `@QComputed()` / `exposeComputedFields`

**Status:** ✅ COMPLETADA  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 3 horas  
**Impacto:** Alto (DX) — feature muy solicitada en librerías similares

**Implementación:**

- `QCOMPUTED_METADATA_KEY` en `src/core/constants/metadata-keys.ts`
- `QComputed()` decorator en `src/core/decorators/qcomputed.decorator.ts`
- Export añadido en `src/index.ts`
- `serializer.service.ts`: prototype traversal incluye `isQTypeGenerated || isQComputed`
- `population.service.ts`: skip assignment a getters `@QComputed` durante deserialización
- 10 tests TDD en `tests/unit/core/services/computed-properties.test.ts`
- Docs EN+ES en guía serialization — sección "Computed Fields"
- Suite total: 1836 tests passing

**Propósito:** Permitir que getters/propiedades computadas se incluyan en `serialize()` y `toJSON()` opcionalmente.

**API propuesta:**

```typescript
// Opción A — decorator por propiedad
@Quick({ birthDate: Date })
class User extends QModel<IUser> {
	declare birthDate: Date;
	declare firstName: string;
	declare lastName: string;

	@QComputed() // Se incluye en serialize()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}
}

// Opción B — en opciones de @Quick
@Quick({ birthDate: Date }, { exposeComputedFields: ['fullName', 'age'] })
class User extends QModel<IUser> { ... }
```

**Pasos TDD:**

```typescript
// Test: tests/unit/serialization/computed-properties.test.ts
describe('Computed Properties', () => {
	test('getters NOT serialized by default', () => {
		@Quick()
		class User extends QModel<any> {
			declare name: string;
			get upper(): string {
				return this.name.toUpperCase();
			}
		}
		const user = new User({ name: 'alice' });
		expect(user.serialize()).not.toHaveProperty('upper');
	});

	test('@QComputed() includes getter in serialize()', () => {
		@Quick()
		class User extends QModel<any> {
			declare name: string;
			@QComputed()
			get upper(): string {
				return this.name.toUpperCase();
			}
		}
		const user = new User({ name: 'alice' });
		expect(user.serialize()).toHaveProperty('upper', 'ALICE');
	});
});
```

**JSDoc a actualizar:** `QModel.serialize()` — mencionar que getters no se incluyen salvo `@QComputed()`.  
**Docs a actualizar:** guía serialization EN+ES — nueva sección "Computed Fields".

---

### Task #19: `QTransformerRegistry.snapshot()/restore()`

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests:** 1807 → 1817 (+10)  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 2 horas  
**Impacto:** Medio (DX tests) — evita polución de estado entre test files cuando se registran transformers custom

**Implementación:**

- `snapshot()` devuelve `Map<string, IQTransformer>` — copia independiente del estado actual
- `restore(snap)` reemplaza el registry completo con el contenido del snapshot
- 10 tests en `tests/unit/core/registry/transformer-registry-snapshot.test.ts`
- JSDoc completo con ejemplos de `beforeEach`/`afterEach`

**Propósito:** Los tests que registran transformers custom en `QTransformerRegistry` pueden contaminar otros test files si no hay forma de limpiar el estado.

**API propuesta:**

```typescript
QTransformerRegistry.snapshot(); // Guarda estado actual
// ... registrar transformers en tests ...
QTransformerRegistry.restore(); // Revierte al snapshot
// O:
QTransformerRegistry.clear(); // Limpia todo (para afterEach)
```

**Pasos TDD:**

```typescript
// Test: tests/unit/core/registry/transformer-registry.test.ts (agregar casos)
describe('QTransformerRegistry: isolation', () => {
	test('snapshot/restore round-trip preserves original state', () => {
		const snap = QTransformerRegistry.snapshot();
		QTransformerRegistry.register('custom', mockTransformer);
		expect(QTransformerRegistry.has('custom')).toBe(true);
		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has('custom')).toBe(false);
	});
});
```

**JSDoc a actualizar:** `QTransformerRegistry` clase — documentar los métodos nuevos.  
**Docs a actualizar:** guía de advanced usage EN+ES — sección "Testing con transformers custom".

---

### ✅ Task #20: `@QRule` async predicates

**Status:** ✅ COMPLETADA  
**Commit:** `a714b2e` - feat(decorators): add @QAlias, async @QRule, and @QGroup  
**Fecha:** Feb 2026  
**Resultado:** `@QRule` soporta predicados async; `checkRules()` retorna Promise cuando hay reglas async  
**Tests:** incluidos en sprint Feb 2026 (+1765 total)

---

### Task #21: Guía integración NestJS

**Status:** ✅ COMPLETADA  
**Prioridad:** 🟢 Baja  
**Esfuerzo:** 3 horas  
**Impacto:** Alto (adopción) — NestJS es el ecosistema más grande de TypeScript backend; no hay guía oficial

**Implementación:**

- `docs-vitepress/en/guide/nestjs-integration.md` — guía completa EN
- `docs-vitepress/es/guide/nestjs-integration.md` — guía completa ES
- Sidebar EN+ES actualizado — entrada "NestJS Integration" en sección Advanced
- Contenido: instalación, DTOs, `@QRule` como sustito de class-validator, ValidationPipe personalizado, `@nestjs/swagger` + `getSchema('openapi')`, `@QComputed()` en respuestas API, tabla resumen de patrones

**Docs creadas:**

- `docs-vitepress/en/guide/nestjs-integration.md`
- `docs-vitepress/es/guide/nestjs-integration.md`
- Sidebar actualizado en `.vitepress/config.ts`

---

### ✅ Task #22: Default `unknownPropertyPolicy: 'strip'` en v2.0.0

**Status:** ✅ COMPLETADA (v1.x — deprecation warning)  
**Fecha:** 22 de febrero de 2026  
**Prioridad:** 🟢 Baja — breaking change planificado para v2.0.0  
**Esfuerzo real:** 2 horas  
**Resultado:** Deprecation warning implementado + docs `:::warning` EN+ES

**Implementación v1.x:**

1. `src/core/services/population.service.ts` — deprecation warning al detectar ausencia de `unknownPropertyPolicy`:
    - Solo para clases con `@Quick` explícito (detectado via `QUICK_TYPE_MAP_KEY` metadata)
    - Deduplicación por clase con `Set<Function>` estático
    - Se emite una vez por clase, en llamadas root (depth === 0)
    - Mensaje incluye nombre de clase, v2.0.0 y recomendación de `'strip'`
2. `tests/unit/core/services/unknown-policy-deprecation.test.ts` — 9 tests TDD
3. Docs `:::warning` en `unknown-property-policy.md` EN+ES
4. Tests afectados actualizados: `system-performance.test.ts`, `arrow-function-warning.test.ts`

**Pendiente para v2.0.0:** Cambiar el default de `'keep'` a `'strip'` en `population.service.ts`.

---

## � SPRINT FEATURES FEB 2026 (Completado)

> Todas las tareas de este sprint fueron completadas en el período 5–22 Feb 2026.
> Se documentan aquí para registro histórico de lo implementado.

### ✅ Task #23: `copy()` + `isDirty(field?)`

**Status:** ✅ COMPLETADA  
**Commit:** `a8089a7`  
**Resultado:** `copy(partial)` actualiza campos parcialmente; `isDirty(field?)` trackea cambios vs estado inicial; `resetDirty()` limpia el tracking.

### ✅ Task #24: `@QRule` decorator + `checkRules()`

**Status:** ✅ COMPLETADA  
**Commit:** `8a2910b`  
**Resultado:** `@QRule(predicate, message)` decora campos con reglas de negocio; `checkRules()` retorna `{ valid, errors[] }`.

### ✅ Task #25: `hasIntegrity()` + `isValid()`

**Status:** ✅ COMPLETADA  
**Commit:** `cd30a8b`  
**Resultado:** `hasIntegrity()` shortcut para `checkIntegrity().length === 0`; `isValid()` combina integridad + reglas.

### ✅ Task #26: `createMany()` batch creation

**Status:** ✅ COMPLETADA  
**Commit:** `3faf88b`  
**Resultado:** `Model.createMany(data[])` crea instancias en batch, colecta errores por índice; opción `includeErrorInstances`.

### ✅ Task #27: `@QField` + `validationReport()` + `getFormSchema()`

**Status:** ✅ COMPLETADA  
**Commit:** `00d56c7`  
**Resultado:** `@QField({ label, hint, ... })` anota metadatos de formulario; `getFormSchema()` exporta schema compatible con librerías de forms; `validationReport()` genera reporte completo de validación.

### ✅ Task #28: `QModel.extends()` simplificación

**Status:** ✅ COMPLETADA  
**Commit:** `4ff1d55`  
**Resultado:** `QModel.extends()` simplifica la inferencia de generics en herencia; mejora DX al extender modelos existentes.

### ✅ Task #29: `@QAlias` + `@QGroup` decorators

**Status:** ✅ COMPLETADA  
**Commit:** `a714b2e`  
**Resultado:** `@QAlias('backend_name')` mapea campo frontend → backend; `@QGroup('section')` agrupa campos en secciones para forms/schemas.

### ✅ Task #30: `createReadonly()` refactor + async `checkRules()`

**Status:** ✅ COMPLETADA  
**Commit:** `05bcb8c`  
**Resultado:** `createReadonly()` mejorado; `checkRules()` retorna `Promise` cuando hay predicados async, sincrónico en caso contrario.

---

### Task #31: Docs nuevas features Feb 2026

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Resultado:** Revisada toda la documentación EN+ES — todas las features ya estaban documentadas. Las guias `qmodel.md`, `validation.md`, `qalias.md`, `qfield.md` (EN+ES) cubren completamente `@QAlias`, `@QGroup`, `@QField`, `getFormSchema()`, `getFormSchemaGrouped()`, `validationReport()`, `checkRulesAsync()`, `copy()`, `isDirty()`, `createMany()`, `hasIntegrity()`, `isValid()`, `createReadonly()`. Sidebar de VitePress actualizado con todos los enlaces.  
**Prioridad:** 🔴 Alta  
**Esfuerzo:** 0h (ya estaba hecho)  
**Impacto:** Alto — docs completas EN+ES para todas las features

**Features a documentar:**

- `@QAlias` — mapeo de nombres de campo
- `@QGroup` — agrupación de campos
- `@QField` — metadatos de formulario
- `getFormSchema()` — schema para librerías de forms
- `validationReport()` — reporte de validación detallado
- `copy()` + `isDirty()` + `resetDirty()` — estado mutable
- `createMany()` — creación batch con validación
- `hasIntegrity()` + `isValid()` — shortcuts de validación
- `@QRule` async — predicados asíncronos
- `QModel.extends()` — simplificación de generics

**Archivos a crear/actualizar:**

- `docs-vitepress/en/guide/validation.md` — sección `@QRule` async, `validationReport()`, `checkRules()`
- `docs-vitepress/es/guide/validation.md` — ídem en español
- `docs-vitepress/en/guide/quick-decorator.md` — secciones `@QAlias`, `@QGroup`, `@QField`
- `docs-vitepress/es/guide/quick-decorator.md` — ídem en español
- `docs-vitepress/en/guide/qmodel.md` — secciones `copy()`, `isDirty()`, `createMany()`, etc.
- `docs-vitepress/es/guide/qmodel.md` — ídem en español

---

## �🚀 PLAN DE ACCIÓN INMEDIATO

### ✅ Completado (5-6 Feb 2026):

1. ✅ **Tarea #1:** Remover console.log → 10 min
2. ✅ **Tarea #2:** Cobertura MCP tools → 2.5h
3. ✅ **Tarea #2.5:** Schema Generation API → 4h

### ✅ Completado (Sprint Feb 2026 — nuevas features):

4. ✅ **Tarea #13:** `release:check` en package.json → ya estaba presente
5. ✅ **Tarea #20:** `@QRule` async predicates → implementado
6. ✅ **Tarea #23:** `copy()` + `isDirty()` — commit `a8089a7`
7. ✅ **Tarea #24:** `@QRule` + `checkRules()` — commit `8a2910b`
8. ✅ **Tarea #25:** `hasIntegrity()` + `isValid()` — commit `cd30a8b`
9. ✅ **Tarea #26:** `createMany()` batch validation — commit `3faf88b`
10. ✅ **Tarea #27:** `@QField` + `validationReport()` + `getFormSchema()` — commit `00d56c7`
11. ✅ **Tarea #28:** `QModel.extends()` improvements — commit `4ff1d55`
12. ✅ **Tarea #29:** `@QAlias` + `@QGroup` — commit `a714b2e`
13. ✅ **Tarea #30:** `createReadonly()` refactor — commit `05bcb8c`

### 🎯 Esta semana (22-25 Feb 2026 — sprint seguridad + docs):

14. ✅ **Tarea #11:** `safeStringify` truncado → 30min ← **COMPLETADA**
15. ✅ **Tarea #12:** Warning `disableSafetyChecks` → 30min ← **COMPLETADA**
16. ✅ **Tarea #31:** Docs nuevas features Feb 2026 — ya estaban escritas ← **COMPLETADA**

### 📅 Próxima semana (24-28 Feb 2026):

17. ⏳ **Tarea #14:** Tests negativos `JsonSchemaGenerator` → 1-2h
18. ⏳ **Tarea #15:** Tests `disableSafetyChecks` (activación + warning) → 1h
19. ⏳ **Tarea #16:** Tests `transformCase` herencia multinivel → 2h

### 🗂️ Backlog (Marzo 2026+):

20. ⏸️ **Tarea #17:** Performance benchmarks baseline → 4-6h
    - Comparar con class-transformer, io-ts, zod
    - Integrar en CI como regression test
21. ✅ **Tarea #18:** `@QComputed()` / `exposeComputedFields` ← **COMPLETADA**
22. ✅ **Tarea #19:** `QTransformerRegistry.snapshot()/restore()` ← **COMPLETADA**
23. ✅ **Tarea #21:** Guía integración NestJS ← **COMPLETADA**
24. ✅ **Tarea #22:** Default `unknownPropertyPolicy: 'strip'` ← **COMPLETADA** (deprecation warning v1.x)

---

## 📝 NOTAS

- **Metodología TDD:** SIEMPRE escribir test primero
- **Commits:** Usar Conventional Commits
- **Revisión:** Ejecutar `bun run check` antes de commit
- **Cobertura mínima:** 80% (actual: >90%)

---

## ✅ CHECKLIST PRE-RELEASE v1.0.0

> ⚠️ **Este proyecto aún NO está en producción.** v1.0.0 es el primer release público.

Antes de hacer merge a `main` y release:

**Tests & Calidad:**

- [x] Todas las tareas 🔴 Alta prioridad completadas (Tasks #1–#10, #13, #20–#30)
- [x] Cobertura de tests >97% (actual: >97%, 1765 tests)
- [x] Edge cases compuestos validados (Task #3)
- [x] WeakMap/WeakSet transformers implementados (Task #4)
- [x] Task #13 completada (script `release:check` ya en package.json)
- [x] Task #11 completada (`safeStringify` truncado — 22 Feb)
- [x] Task #12 completada (warning `disableSafetyChecks` — 22 Feb)
- [ ] Task #31 completada (docs nuevas features Feb 2026)
- [ ] `bun run check` pasa sin errores
- [ ] `bun run lint` sin warnings
- [x] `bun test` 100% passing (1765 tests)

**Release Process:**

- [x] `bun run release:check` funcionando
- [ ] Documentación actualizada para nuevas features (Task #31)
- [ ] CHANGELOG.md completo
- [ ] Git tag creado: `v1.0.0`

**Features incluidas en v1.0.0:**

- [x] Sistema de serialización/deserialización con 30+ tipos
- [x] Schema Generation API (7 formatos: JSON, Zod, Mongo, TS, GraphQL, OpenAPI, AJV)
- [x] Servidor MCP con 10 herramientas públicas y 4 prompts
- [x] MCP tools coverage >80%
- [x] Edge cases compuestos (Map/Set/Array anidados)
- [x] WeakMap/WeakSet transformers
- [x] `excludeFields` en serialización
- [x] `copy()` + `isDirty()` — estado mutable (Task #23)
- [x] `@QRule` + `checkRules()` — validación por reglas (Tasks #24, #20)
- [x] `hasIntegrity()` + `isValid()` + `createMany()` (Tasks #25, #26)
- [x] `@QField` + `validationReport()` + `getFormSchema()` (Task #27)
- [x] `@QAlias` + `@QGroup` decorators (Task #29)
- [x] Documentación bilingüe EN+ES
- [ ] `safeStringify` truncado (Task #11) — ✅ COMPLETADA
- [ ] Warning `disableSafetyChecks` (Task #12) — ✅ COMPLETADA
- [ ] Docs nuevas features Feb 2026 (Task #31)

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### Orden sugerido de implementación:

**1. ✅ Task #11: `safeStringify` truncado** — COMPLETADA

**2. ✅ Task #12: Warning `disableSafetyChecks`** — COMPLETADA

**3. ✅ Task #31: Docs nuevas features Feb 2026** — COMPLETADA (docs ya estaban escritas con las features)

**4. ✅ Task #14: Tests negativos `JsonSchemaGenerator`** — COMPLETADA (fix array types, +13 tests)

**5. ✅ Task #15: Tests `disableSafetyChecks`** — COMPLETADA (`c615290`)

**6. ✅ Task #16: Tests `transformCase` herencia multinivel** — COMPLETADA

### Comandos útiles:

```bash
# Antes de empezar nueva tarea
bun test                  # Verificar estado actual
bun run lint             # Verificar code style
bun run typecheck        # Verificar tipos

# Durante desarrollo TDD
bun test --watch         # Tests en modo watch
bun test <archivo>       # Test específico

# Antes de commit
bun run check            # Verificación completa
bun run release:check    # Preview de próximo release

# Después de completar tarea
git add .
git commit -m "feat/fix/test: <descripción>"
bun test                 # Verificar todos los tests
```

---

**Última actualización:** 23 de febrero de 2026 (revisión nº20) — Tasks #40–#42 COMPLETADAS: tRPC (30t), Prisma (32t), Formik (26t) | Sprint Ecosystem Integrations ✅ completo | 2976 tests passing

---

## 🚀 Sprint Framework Integrations (Tasks #34–#38)

### ✅ Task #34: Angular integration patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests añadidos:** 37 en `tests/integration/patterns/angular-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/angular-integration.md` + `docs-vitepress/es/guide/angular-integration.md`

**Patrones entregados:**

1. Reactive Forms — `qCheckRules()` como validador de formulario
2. `UserDataService` — repositorio con `copy()` inmutable
3. Angular Signals (v17+) — `signal(new Model())` + `update(prev => prev.copy(patch))`
4. HttpClient interceptor — coerción automática con `unknownPropertyPolicy: 'strip'`
5. `@QGroup` + `qCheckRulesByGroup()` — wizard multi-paso
6. Validación async — `AsyncValidatorFn` con unicidad de email
7. `createMany()` en resolver de lista
8. `QSignal<T>` — simulación de señal con `subscribe()`

---

### ✅ Task #35: React/Next.js integration patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests añadidos:** 31 en `tests/integration/patterns/react-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/react-integration.md` + `docs-vitepress/es/guide/react-integration.md`

**Patrones entregados:**

1. `useState` controlado + `qCheckRules()` — formulario reactivo
2. React Hook Form — `createQuickResolver()` adapter
3. Next.js Server Actions — DTO + `coercionStrategy: 'loose'` para FormData
4. Zustand store — `copy()` inmutable en `updateQty()`
5. `useQModel` hook — `update()` + `validate()` + `isDirty`
6. Validación async — `qCheckRulesAsync()` para unicidad de email
7. `@QComputed()` en `OrderItemDto.total`

---

### ✅ Task #36: Vue 3/Nuxt integration patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests añadidos:** 27 en `tests/integration/patterns/vue-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/vue-integration.md` + `docs-vitepress/es/guide/vue-integration.md`

**Patrones entregados:**

1. Composition API — `useProfileForm()` con `reactive()` + `computed()`
2. Pinia store — `useUserStore` con `copy()` inmutable
3. VeeValidate adapter — `useQField()` composable por campo
4. `v-model` / `defineModel` — binding directo con QModel
5. Nuxt `useAsyncData` + `createMany()` — coerción en masa
6. Nuxt server routes — `defineEventHandler()` + `checkRules()`
7. Validación async — `qCheckRulesAsync()` para unicidad de username

---

### ✅ Task #37: Svelte 5/SvelteKit integration patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests añadidos:** 21 en `tests/integration/patterns/svelte-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/svelte-integration.md` + `docs-vitepress/es/guide/svelte-integration.md`

**Patrones entregados:**

1. Svelte 5 Runes — `$state` + `$derived` simulados con QModel
2. Writable store — `createUserStore()` con `copy()` inmutable
3. SvelteKit Form Actions — `coercionStrategy: 'loose'` para FormData
4. SvelteKit `load()` — `createMany()` para coerción en masa
5. `@QComputed` — `durationDays` calculado en `EventModel`
6. Validación async — `qCheckRulesAsync()` para unicidad de slug

---

### ✅ Task #38: Express/Fastify/Hono backend patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 22 de febrero de 2026  
**Tests añadidos:** 25 en `tests/integration/patterns/backend-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/backend-integration.md` + `docs-vitepress/es/guide/backend-integration.md`

**Patrones entregados:**

1. Express — `validateBody(DtoClass)` middleware factory con `req.dto`
2. Express — `checkRules()` 422 shape unificado
3. Fastify — `dtoValidator()` preHandler hook
4. Fastify — `InvoiceDto` con `@QComputed` `formattedAmount` + `isOverdue`
5. Hono — `honoValidator()` middleware con `onSuccess` callback
6. `checkRulesAsync()` + `{ mode: 'parallel' }` — DB uniqueness
7. `BlogPostRepository` — patrón repositorio con `copy()` inmutable
8. `getSchema('json')` — integración OpenAPI/Swagger
9. `coercionStrategy: 'loose'` para raw HTTP bodies

---

## 🚀 Sprint Ecosystem Integrations (Tasks #39–#43)

### ✅ Task #39: TanStack Query integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para TanStack Query (React, Vue, Svelte)  
**Tests a añadir:** ~30 en `tests/integration/patterns/tanstack-query-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/tanstack-query-integration.md` + ES

**Patrones a cubrir:**

1. `queryFn` — fetch + coerción con `ProductDto.createMany()`
2. `useMutation` — `mutationFn` recibe DTO + `dto.serialize()` para payload
3. Optimistic updates — `copy()` inmutable en `onMutate`
4. `queryClient.setQueryData()` — normalización de caché con QModel
5. `select` option — transformar respuesta con `dto.toInterface()`
6. Infinite queries — `createMany()` en cada página
7. Error handling — `checkRules()` antes de mutación
8. Stale-while-revalidate con `isDirty()` para detectar cambios

---

### ✅ Task #40: tRPC integration patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 23 de febrero de 2026  
**Tests añadidos:** 30 en `tests/integration/patterns/trpc-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/trpc-integration.md` + `docs-vitepress/es/guide/trpc-integration.md`

**Patrones a cubrir:**

1. Input validation — `QModel` como schema de input en `.input()` de procedure
2. Output serialization — `dto.serialize()` como output tipado
3. Middleware — `t.middleware()` con coerción de contexto
4. `createMany()` para batch queries
5. `checkRulesAsync()` en procedures con validación DB
6. `@QComputed()` en respuesta de query
7. Error mapping — `TRPCError` desde `errors` de `checkRules()`
8. Router tipado — input/output con interfaces de QModel

---

### ✅ Task #41: Prisma ORM integration patterns

**Status:** ✅ COMPLETADA  
**Fecha:** 23 de febrero de 2026  
**Tests añadidos:** 32 en `tests/integration/patterns/prisma-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/prisma-integration.md` + `docs-vitepress/es/guide/prisma-integration.md`

**Patrones a cubrir:**

1. DTO desde resultado Prisma — `new UserDto(prismaUser)` con `strip`
2. Create input — `dto.toInterface()` como `prisma.user.create({ data: ... })`
3. `createMany()` para seed / bulk import desde CSV
4. Patrón repositorio con Prisma Client + QModel
5. Transformación de tipos Prisma → QModel (Decimal, DateTime, Json)
6. `@QComputed()` para campos derivados no almacenados en DB
7. `copy()` + `prisma.user.update()` — update parcial inmutable
8. Validación antes de `prisma.create()` — `checkRules()` como guard

---

### ✅ Task #42: Formik + comparativa con Zod / Yup

**Status:** ✅ COMPLETADA  
**Fecha:** 23 de febrero de 2026  
**Tests añadidos:** 26 en `tests/integration/patterns/formik-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/formik-integration.md` + `docs-vitepress/es/guide/formik-integration.md`

**Patrones a cubrir:**

1. Formik `validate` adapter — `qCheckRules()` → objeto `errors` de Formik
2. Field-level validation — `qCheckRules(instance, { group: 'field' })`
3. Migración desde Zod schema → `@QRule` + `@QField`
4. Migración desde Yup schema → `@QRule` + `@QField`
5. Tabla comparativa Zod vs QuickModel (verbosidad, type-safety, coerción)
6. `getFormSchema()` → generación dinámica de campos de UI
7. `validationReport()` → trazabilidad completa de reglas

---

### ✅ Task #43: Mobile Integrations (React Native / Expo / Capacitor / Cordova / Ionic)

**Status:** ✅ COMPLETADA  
**Fecha:** 23 de febrero de 2026  
**Tests añadidos:** 33 en `tests/integration/patterns/mobile-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/mobile-integration.md` + `docs-vitepress/es/guide/mobile-integration.md`

**React Native / Expo:**

1. `TextInput` — coerción de string a number/boolean con `coercionStrategy: 'loose'`
2. `useQModel` hook — reutilización del hook de React
3. Expo Router — validación en route handlers (similar a Server Actions)
4. `AsyncStorage` — serializar/deserializar QModel (`serialize()`/`populate()`) desde almacenamiento local
5. Formularios con `KeyboardAvoidingView` + `checkRules()` on submit
6. Validación async — llamada a API REST con `qCheckRulesAsync()`
7. `createMany()` para listas planas de `FlatList`

**Capacitor:**

8. `@capacitor/preferences` — `Preferences.set({ value: JSON.stringify(dto.serialize()) })` + roundtrip con `populate()`
9. Native plugin typed wrapper — DTO como contrato de entrada/salida de plugins Capacitor
10. Capacitor HTTP plugin — `new UserDto(response.data)` con coerción automática
11. `checkRulesAsync()` con simulación de llamada nativa asíncrona
12. `copy()` inmutable para actualizar estado en `@capacitor/app` lifecycle events

**Ionic:**

13. `ion-input` + coerción `'loose'` — valores de string a tipos nativos
14. `IonList` + `createMany()` — listas tipadas de modelos
15. Ionic `AlertInput` — validación con `qCheckRules()` antes de confirmar diálogo
16. `getFormSchema()` → campos dinámicos en formularios Ionic (`IonItem` / `IonLabel`)
17. Ionic + Angular — `ReactiveFormsModule` + QModel como alternativa a Zod validators
18. Ionic + React — reutilización de `useQModel` hook con `IonPage`

**Cordova (legacy):**

19. `localStorage` + `serialize()`/`populate()` — persistencia en Cordova WebView
20. Cordova `deviceready` — inicialización de DTOs en evento nativo
21. Migración Cordova → Capacitor — mismo patrón de storage, sin cambios en QModel layer

---

### ✅ Task #55: Storage & Persistence

**Status:** ✅ COMPLETADA  
**Fecha:** 23 de febrero de 2026  
**Tests añadidos:** 39 en `tests/integration/patterns/storage-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/storage-integration.md` + `docs-vitepress/es/guide/storage-integration.md`

**Patrones cubiertos:**

1. `localStorage` básico — `serialize()`/`populate()` roundtrip + manejo de claves ausentes
2. `localStorage` — schema versioning con campo `__v` para migraciones
3. `IndexedDB` — object store simulado, `getAll()` → `createMany()`, `put()` con `serialize()`
4. `SQLite` — mapeo de filas a DTOs, `createMany()` para resultsets, coerción de tipos SQL
5. Capacitor Preferences — `Preferences.set/get` + TTL pattern + roundtrip tipado
6. In-memory LRU cache — `copy()` inmutable, `isDirty()` desde caché, `createMany()` en caché
7. `BroadcastChannel` — cross-tab sync con `serialize()`/`populate()` como mensaje
8. OPFS & Service Worker cache — `serialize()` → OPFS write, restore + `qCheckRulesAsync()`

---

## 🚀 Sprint Extended Ecosystem (Tasks #44–#54)

### ✅ Task #44: React Hook Form integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para React Hook Form  
**Tests a añadir:** ~25 en `tests/integration/patterns/react-hook-form-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/react-hook-form-integration.md` + ES

**Patrones a cubrir:**

1. `validate` adapter — `qCheckRules()` como función `validate` nativa de RHF (sin resolver externo)
2. `useForm<IUser>()` + `handleSubmit` — DTO construido en el submit handler
3. `@QRule` field-level — errores por campo mapeados a `setError()` de RHF
4. `getFormSchema()` → campos dinámicos con `register()` iterado
5. `Controller` + QModel — `field.onChange` con coerción `'loose'`
6. Validación async — `qCheckRulesAsync()` + `shouldValidate: true` en `trigger()`
7. `isDirty()` vs `formState.isDirty` — comparativa y complementariedad
8. Migración desde `zodResolver` / `yupResolver` hacia `qCheckRules` directo

---

### ✅ Task #45: Zustand integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para Zustand  
**Tests a añadir:** ~20 en `tests/integration/patterns/zustand-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/zustand-integration.md` + ES

**Patrones a cubrir:**

1. Slice básico — `create<{ user: UserModel; update: (p: Partial<IUser>) => void }>`
2. `copy()` inmutable como updater — `set(s => ({ user: s.user.copy(patch) }))`
3. Multi-slice store — separar entities QModel de UI state
4. `devtools` middleware — `serialize()` como estado inspeccionable
5. Persistencia — `persist` middleware + `serialize()`/`populate()` roundtrip
6. `shallow` selector con `serialize()` — rendimiento en re-renders
7. Store de lista — `createMany()` + `Map<id, QModel>` normalizado
8. `immer` compat — por qué `copy()` es preferible a `produce()`

---

### ✅ Task #46: MSW (Mock Service Worker) integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para MSW v2  
**Tests a añadir:** ~20 en `tests/integration/patterns/msw-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/msw-integration.md` + ES

**Patrones a cubrir:**

1. Handler básico — `http.get('/api/users/:id', () => HttpResponse.json(new UserDto(seedData).serialize()))`
2. `createMany()` en handler de lista — fixtures automáticos tipados
3. Mock de errores de validación — `checkRules()` + `HttpResponse.json(errors, { status: 422 })`
4. `setupServer()` en Vitest/Jest — integración con test suite
5. Fixtures reutilizables — `MockUserFactory` con QModel
6. Mutation handler — `http.post` + `new CreateUserDto(await request.json())`
7. Mock de `checkRulesAsync` response — simulación de DB uniqueness
8. `passthrough()` para requests no mockeados

---

### ⏳ Task #47: Redux Toolkit (RTK) integration patterns

**Status:** 📋 Pendiente  
**Objetivo:** Suite de tests + guía EN+ES para Redux Toolkit  
**Tests a añadir:** ~20 en `tests/integration/patterns/redux-toolkit-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/redux-toolkit-integration.md` + ES

**Patrones a cubrir:**

1. `createSlice` — estado con `serialize()` como forma serializable en Redux
2. Reducer con `copy()` — `state.users[id] = action.payload.model.copy(patch).serialize()`
3. `createAsyncThunk` — fetch + `new UserDto(response)` tipado
4. `createEntityAdapter` — `id` de cada QModel como normalized key
5. RTK Query — `transformResponse: (data) => new UserDto(data).serialize()`
6. `checkRules()` antes de dispatch — validación client-side
7. Selector tipado — `selectUser` devuelve `IUser` desde `serialize()`
8. DevTools — payloads legibles gracias a `serialize()`

---

### ⏳ Task #48: Drizzle ORM integration patterns

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

### ✅ Task #49: Vitest Custom Matchers

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Matchers propios para Vitest que mejoran el DX de tests con QModel  
**Tests a añadir:** ~20 en `tests/unit/vitest-matchers.test.ts`  
**Docs:** `docs-vitepress/en/guide/vitest-matchers.md` + ES

**Matchers a implementar:**

1. `toBeValidQModel()` — `checkRules().valid === true`
2. `toHaveQRuleError(field, message?)` — error concreto en campo
3. `toHaveQField(fieldName)` — campo declarado con `@QField`
4. `toMatchQModel(expected)` — deep equality de `serialize()` outputs
5. `toBeIntact()` — `hasIntegrity() === true`
6. `toHaveDirtyField(field)` — `isDirty(field) === true`
7. Setup helper — `import '@cartago-git/quickmodel/vitest'` en `setupFiles`
8. TypeScript augmentation — `interface Assertion` para autocompletado

---

### ✅ Task #50: TypeORM integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para TypeORM  
**Tests a añadir:** ~20 en `tests/integration/patterns/typeorm-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/typeorm-integration.md` + ES

**Patrones a cubrir:**

1. Entity vs DTO separation — `UserEntity` (TypeORM) + `UserDto` (QModel)
2. `new UserDto(userEntity)` — coerción de entity a DTO con `strip`
3. `dto.toInterface()` como payload de `repository.save()`
4. `createMany()` para seed con `DataSource.initialize()`
5. `@Column({ transformer })` — TypeORM value transformer + QModel coerción
6. Repositorio tipado — `UserRepository` con QModel como capa de negocio
7. `copy()` + `repository.update()` — update parcial
8. `@QComputed()` en DTO vs `@VirtualColumn()` en Entity — comparativa

---

### ✅ Task #51: GraphQL / Apollo Server integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para Apollo Server / GraphQL Yoga  
**Tests a añadir:** ~20 en `tests/integration/patterns/graphql-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/graphql-integration.md` + ES

**Patrones a cubrir:**

1. Input DTO — QModel como tipo de entrada en resolver, `checkRules()` antes de persistir
2. Output serialization — `dto.serialize()` como respuesta de query tipada
3. NestJS Code First — `@InputType()` + QModel (compatibilidad decoradores)
4. Mutation resolver — `new CreateUserDto(args.input)` + `checkRulesAsync()`
5. `@QComputed()` en respuesta — campos calculados sin lógica en resolver
6. Error mapping — `checkRules().errors` → `GraphQLError` con `extensions`
7. `createMany()` en query de lista — coerción en masa desde DB
8. GraphQL Yoga `useValidation` + QModel — middleware de validación

---

### ✅ Task #52: OpenAPI / Swagger auto-generation

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para generación automática de documentación OpenAPI  
**Tests a añadir:** ~15 en `tests/integration/patterns/openapi-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/openapi-integration.md` + ES

**Patrones a cubrir:**

1. `getSchema('json')` → body OpenAPI `requestBody` schema
2. `getSchema('json')` → `@ApiProperty()` con NestJS Swagger
3. `@QField({ label, required })` → `description` + `required[]` en OpenAPI spec
4. `@QComputed()` → campo en `properties` marcado como `readOnly: true`
5. Fastify + `@fastify/swagger` — `schema.body` desde `getSchema('json')`
6. Express + `swagger-jsdoc` — `#/components/schemas/CreateUserDto` reutilizable
7. Hono + `@hono/zod-openapi` compat — adaptación del schema JSON
8. Generación automática en CI — `getSchema('json')` → archivo `.openapi.json`

---

### ✅ Task #53: Electron IPC integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para Electron con IPC serializado  
**Tests a añadir:** ~15 en `tests/integration/patterns/electron-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/electron-integration.md` + ES

**Patrones a cubrir:**

1. IPC boundary — `ipcMain.handle` + `new UserDto(event.sender)` en main
2. `serialize()` en renderer → envío JSON seguro por IPC
3. `populate()` en main — reconstrucción de QModel desde JSON IPC
4. `unknownPropertyPolicy: 'strip'` — prevención de prototype pollution cross-context
5. `checkRules()` en main antes de persistir — validación en el proceso seguro
6. `contextBridge.exposeInMainWorld` — tipos compartidos con QModel interfaces
7. `createMany()` para carga de archivos CSV/JSON locales
8. `isDirty()` en renderer para confirmación de cambios no guardados

---

### ✅ Task #54: Mongoose integration patterns

**Status:** ✅ Completada (Feb 2026)  
**Objetivo:** Suite de tests + guía EN+ES para Mongoose + MongoDB  
**Tests a añadir:** ~20 en `tests/integration/patterns/mongoose-patterns.test.ts`  
**Docs:** `docs-vitepress/en/guide/mongoose-integration.md` + ES

**Patrones a cubrir:**

1. Document vs DTO — `UserDocument` (Mongoose) + `UserDto` (QModel)
2. `new UserDto(doc.toObject())` — coerción de documento Mongoose a DTO
3. `ObjectId` → `string` — coerción con `coercionStrategy: 'loose'`
4. Repositorio — `MongoUserRepository` con QModel como capa de negocio
5. `dto.toInterface()` como payload de `Model.create()`
6. `copy()` + `Model.findByIdAndUpdate()` — update parcial inmutable
7. `createMany()` para seed / `insertMany()`
8. `@QComputed()` para campos calculados no persistidos en MongoDB

---

## ✅ Task #33: Módulo `@cartago-git/quickmodel/forms` — Validación standalone

**Status:** ✅ COMPLETADA
**Fecha:** 22 de febrero de 2026
**Tests añadidos:** +83 tests en `tests/unit/forms/` (q-groups: 24, q-check-rules: 35, q-check-rules-async: 24+)
**Archivos creados/modificados:**

- `src/core/helpers/q-get-groups.ts` — lee `@QGroup` metadata, devuelve nombres de grupo únicos
- `src/core/helpers/q-check-rules.ts` — validación síncrona standalone con filtro de grupo opcional
- `src/core/helpers/q-check-rules-async.ts` — validación asíncrona con grupo, timeout y modos serie/paralelo
- `src/core/helpers/q-check-rules-by-group.ts` — devuelve `Record<group, IQRulesResult>` síncrono
- `src/core/helpers/q-check-rules-by-group-async.ts` — ídem, async (nueva en esta tarea)
- `src/forms.ts` — barrel con todos los helpers + tipos exportados
- `src/core/models/quick.model.ts` — refactor SOLID: `checkRules()` y `checkRulesAsync()` delegan a los helpers
- `docs-vitepress/en/guide/forms.md` — nueva guía EN completa con ejemplos Angular/React/Vue
- `docs-vitepress/es/guide/forms.md` — nueva guía ES completa
- `docs-vitepress/.vitepress/config.ts` — sidebar EN+ES actualizado con entrada `/forms`
- `typedoc.json` — `src/forms.ts` y `src/compat/ts5/forms.ts` añadidos a `entryPoints`
- `tests/unit/forms/q-check-rules.test.ts` — tests de herencia y múltiples `@QRule` por campo
- `tests/unit/forms/q-check-rules-async.test.ts` — edge cases: group+timeout, serial+group, `qCheckRulesByGroupAsync`

**Funcionalidad entregada:**

1. **Helpers standalone** — cualquier clase puede usar `@QRule`/`@QGroup` y validar sin extender `QModel`.

2. **`qGroups` / `qGroups5`** — mapa tipado de nombres de grupo para autocompletado y seguridad de tipos.

3. **`qGetGroups(instance)`** — devuelve los grupos declarados en una instancia.

4. **`qCheckRules(instance, { group? })`** — validación síncrona, opcionalmente filtrada por grupo.

5. **`qCheckRulesAsync(instance, { group?, timeoutMs?, mode?, timeoutMessage? })`** — validación asíncrona con timeout por predicado y modos `'parallel'` / `'serial'`.

6. **`qCheckRulesByGroup(instance)`** — mapa síncrono `{ [grupo]: IQRulesResult }` — útil para formularios por pasos.

7. **`qCheckRulesByGroupAsync(instance, options?)`** — mapa asíncrono equivalente; todos los grupos se evalúan concurrentemente.

8. **SOLID** — `QModel.checkRules()` y `checkRulesAsync()` delegan a los helpers (0 duplicación de lógica).
