# QuickModel - Tareas Pendientes

> **Fecha de revisión:** 22 de febrero de 2026
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)
> **Estado actual:** 1602 tests passing | Cobertura >97% líneas | v1.0.0

## 📊 Progreso General

```
✅ Completadas: todas las tareas críticas hasta Task #10
🔄 En progreso: Tasks #11–#14 (sprint seguridad/robustez)
⏳ Pendientes: Tasks #15–#22 (coverage gaps + features nuevas)
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

**Revisión completa 22 Feb 2026 — Nuevas tareas identificadas (#11–#22):**

- ⏳ Task #11: Truncar `safeStringify` — prevención de info-leak en mensajes de error
- ⏳ Task #12: Warning activo cuando `disableSafetyChecks` está habilitado
- ⏳ Task #13: Corregir script `release:check` (alias en package.json faltante)
- ⏳ Task #14: Tests negativos para `JsonSchemaGenerator` con tipos sin transformer
- ⏳ Task #15: Tests específicos para `disableSafetyChecks` (activación + warning)
- ⏳ Task #16: Tests de `transformCase` con herencia multinivel
- ⏳ Task #17: Performance benchmarks baseline (comparativa vs class-transformer, Zod)
- ⏳ Task #18: `@QComputed()` / `exposeComputedFields` — computed props en serialización
- ⏳ Task #19: `QTransformerRegistry.snapshot()/restore()` — aislamiento de estado en tests
- ⏳ Task #20: `@QRule` async — soporte de predicados asíncronos
- ⏳ Task #21: Guía de integración NestJS
- ⏳ Task #22: Cambiar default de `unknownPropertyPolicy` a `'strip'` en v2.0.0

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

| #   | Tarea                                         | Prioridad | Estado     | Esfuerzo | Impacto         | Fecha Est. |
| --- | --------------------------------------------- | --------- | ---------- | -------- | --------------- | ---------- |
| 11  | `safeStringify` truncado 500 chars            | 🔴 Alta   | ⏳ TODO    | 30min    | Alto (seg.)     | Feb 22-23  |
| 12  | Warning `disableSafetyChecks` activo          | 🔴 Alta   | ⏳ TODO    | 30min    | Alto (seg.)     | Feb 22-23  |
| 13  | Script `release:check` alias en package.json  | 🔴 Alta   | ⏳ TODO    | 15min    | Medio (DX)      | Feb 22-23  |
| 14  | Tests negativos `JsonSchemaGenerator`         | 🟡 Media  | ⏳ TODO    | 1-2h     | Medio           | Feb 24-25  |
| 15  | Tests `disableSafetyChecks` (flag + warning)  | 🟡 Media  | ⏳ TODO    | 1h       | Medio           | Feb 24-25  |
| 16  | Tests `transformCase` herencia multinivel     | 🟡 Media  | ⏳ TODO    | 2h       | Medio           | Feb 24-25  |
| 17  | Performance benchmarks baseline               | 🟡 Media  | ⏳ TODO    | 4-6h     | Alto (mktg.)    | Mar 2026   |
| 18  | `@QComputed()` / `exposeComputedFields`       | 🟡 Media  | ⏸️ BACKLOG | 3-4h     | Alto (DX)       | Mar 2026   |
| 19  | `QTransformerRegistry.snapshot()/restore()`   | 🟡 Media  | ⏸️ BACKLOG | 2h       | Medio (DX)      | Mar 2026   |
| 20  | `@QRule` async predicates                     | 🟢 Baja   | ⏸️ BACKLOG | 4-6h     | Medio           | Abr 2026   |
| 21  | Guía integración NestJS                       | 🟢 Baja   | ⏸️ BACKLOG | 3-4h     | Alto (adop.)    | Mar 2026   |
| 22  | Default `unknownPropertyPolicy: 'strip'` v2.0 | 🟢 Baja   | ⏸️ BACKLOG | 1h       | Alto (breaking) | v2.0.0     |

**Progreso:**

- ✅ Completadas: 10/22 (45%)
- ⏳ Pendientes activas: 7/22 (32%)
- ⏸️ Backlog: 5/22 (23%)

**Tiempo invertido (histórico):** ~15h  
**Tiempo restante estimado (activas):** ~10-15h

---

## � SPRINT SEGURIDAD/ROBUSTEZ (22-25 Feb 2026)

### Contexto

Revisión completa del 22 de febrero identificó vulnerabilidades de seguridad y gaps de cobertura. Estas tareas son prioritarias antes de cualquier feature nueva.

---

### Task #11: Truncar `safeStringify` a 500 chars

**Status:** ⏳ TODO  
**Prioridad:** 🔴 Alta — seguridad  
**Esfuerzo:** 30 minutos  
**Impacto:** Alto — prevención de info-leak de datos sensibles en mensajes de error + DoS via logs

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

### Task #12: Warning cuando `disableSafetyChecks` está activo

**Status:** ⏳ TODO  
**Prioridad:** 🔴 Alta — seguridad  
**Esfuerzo:** 30 minutos  
**Impacto:** Alto — el flag desactiva prototype pollution, recursion guards, array limits y object size de un golpe; el usuario debe ser consciente

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

### Task #13: Script `release:check` como alias en package.json

**Status:** ⏳ TODO  
**Prioridad:** 🔴 Alta — DX/proceso  
**Esfuerzo:** 15 minutos  
**Impacto:** Medio — la doc de releasing referencia `bun run release:check` pero ese script no existe en package.json

**Problema:**  
`docs-vitepress/en/guide/releasing.md` y `docs-vitepress/es/guide/releasing.md` documentan el comando `bun run release:check` como obligatorio antes de un release, pero el script no está declarado en `package.json`. Solo existe `scripts/pre-release.sh` que no es invocable vía `bun run release:check`.

**Fix (no requiere TDD, es config):**

```json
// package.json — añadir en "scripts":
"release:check": "bash scripts/pre-release.sh",
```

**Docs a actualizar:** verificar que releasing.md EN+ES usan exactamente `bun run release:check`.

---

### Task #14: Tests negativos para `JsonSchemaGenerator` con tipos sin transformer

**Status:** ⏳ TODO  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 1-2 horas  
**Impacto:** Medio — el default `{ type: 'string' }` para props con transformer `undefined` es incorrecto para `number`/`boolean`

**Problema:**  
En `schema-generators.service.ts`, el método `_getJsonSchemaType` devuelve `{ type: 'string' }` cuando no hay transformer. Esto causa que un modelo con `declare id: number` sin transformer explícito genere un JSON Schema con `id: { type: 'string' }`, que es incorrecto.

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

**Status:** ⏳ TODO  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 1 hora  
**Impacto:** Medio — verificar que la flag desactiva correctamente los checks (y solo esos)

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

**Status:** ⏳ TODO  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 2 horas  
**Impacto:** Medio — garantizar que la transformación de case funciona correctamente en jerarquías

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

**Status:** ⏳ TODO  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 4-6 horas  
**Impacto:** Alto — credibilidad del proyecto, detección de regresiones

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

**Status:** ⏸️ BACKLOG  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 3-4 horas  
**Impacto:** Alto (DX) — feature muy solicitada en librerías similares

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

**Status:** ⏸️ BACKLOG  
**Prioridad:** 🟡 Media  
**Esfuerzo:** 2 horas  
**Impacto:** Medio (DX tests) — evita polución de estado entre test files cuando se registran transformers custom

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

### Task #20: `@QRule` async predicates

**Status:** ⏸️ BACKLOG  
**Prioridad:** 🟢 Baja  
**Esfuerzo:** 4-6 horas  
**Impacto:** Medio — casos de uso como validación de email contra API, etc.

**API propuesta:**

```typescript
// Async predicate + checkRulesAsync()
@QRule(async (v) => await emailExists(v as string), 'Email already registered')
declare email: string;

const result = await user.checkRulesAsync();
```

**Pasos TDD:**

```typescript
// Test: tests/unit/decorators/qrule-async.test.ts
describe('@QRule async predicates', () => {
	test('checkRulesAsync() resolves async predicates', async () => {
		@Quick()
		class User extends QModel<any> {
			@QRule(async (v) => (v as string).length > 3, 'Too short')
			declare name: string;
		}
		const user = new User({ name: 'ab' });
		const result = await user.checkRulesAsync();
		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('name');
	});
});
```

**JSDoc a actualizar:** `@QRule` — documentar soporte async.  
**Docs a actualizar:** guía validation EN+ES — nueva sección "Async rules".

---

### Task #21: Guía integración NestJS

**Status:** ⏸️ BACKLOG  
**Prioridad:** 🟢 Baja  
**Esfuerzo:** 3-4 horas  
**Impacto:** Alto (adopción) — NestJS es el ecosistema más grande de TypeScript backend; no hay guía oficial

**Contenido mínimo de la guía:**

1. Instalación con `reflect-metadata` (compatible con NestJS)
2. Uso como DTO de entrada con `ValidationPipe`
3. Integración con `@nestjs/swagger` y `getSchema('openapi')`
4. `@QRule` como sustituto de `class-validator`
5. Ejemplo de módulo NestJS que usa `QModel` en service layer

**Docs a crear:**

- `docs-vitepress/en/guide/nestjs-integration.md`
- `docs-vitepress/es/guide/nestjs-integration.md`
- Actualizar sidebar EN+ES para incluir la nueva guía

---

### Task #22: Default `unknownPropertyPolicy: 'strip'` en v2.0.0

**Status:** ⏸️ BACKLOG  
**Prioridad:** 🟢 Baja — breaking change planificado para v2.0.0  
**Esfuerzo:** 1 hora  
**Impacto:** Alto (seguridad) — el default actual `'keep'` es inconsistente con el enfoque de seguridad del proyecto

**Problema:** El proyecto tiene protección de prototype pollution, límites DoS, y method shadowing... pero por defecto permite que propiedades no declaradas entren al modelo sin filtrar. Esto puede exponer datos inesperados al serializar de vuelta.

**Plan:**

1. v1.x: Mantener `'keep'` como default. **Añadir deprecation warning** si no se configura explícitamente.
2. v2.0.0: Cambiar default a `'strip'`.
3. Documentar la migration guide.

**Docs a actualizar (ahora, v1.x):** guía configuration EN+ES — añadir nota con `:::warning` recomendando establecer `unknownPropertyPolicy: 'strip'` explícitamente para mayor seguridad.

---

## 🚀 PLAN DE ACCIÓN INMEDIATO

### ✅ Completado (5-6 Feb 2026):

1. ✅ **Tarea #1:** Remover console.log → 10 min
2. ✅ **Tarea #2:** Cobertura MCP tools → 2.5h
3. ✅ **Tarea #2.5:** Schema Generation API → 4h

### 🎯 Esta semana (7-8 Feb 2026 → movido a 22-25 Feb):

4. ⏳ **Tarea #11:** `safeStringify` truncado → 30min
5. ⏳ **Tarea #12:** Warning `disableSafetyChecks` → 30min
6. ⏳ **Tarea #13:** Script `release:check` en package.json → 15min

### 📅 Próxima semana (24-28 Feb 2026):

7. ⏳ **Tarea #14:** Tests negativos `JsonSchemaGenerator` → 1-2h
8. ⏳ **Tarea #15:** Tests `disableSafetyChecks` (activación + warning) → 1h
9. ⏳ **Tarea #16:** Tests `transformCase` herencia multinivel → 2h

### 🗂️ Backlog (Marzo 2026+):

10. ⏸️ **Tarea #17:** Performance benchmarks baseline → 4-6h
    - Comparar con class-transformer, io-ts, zod
    - Integrar en CI como regression test
11. ⏸️ **Tarea #18:** `@QComputed()` / `exposeComputedFields` → 3-4h
    - Esperar feedback de comunidad
12. ⏸️ **Tarea #19:** `QTransformerRegistry.snapshot()/restore()` → 2h
13. ⏸️ **Tarea #20:** `@QRule` async predicates → 4-6h
14. ⏸️ **Tarea #21:** Guía integración NestJS → 3-4h
15. ⏸️ **Tarea #22:** Default `unknownPropertyPolicy: 'strip'` (v2.0.0) → 1h

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

- [x] Todas las tareas 🔴 Alta prioridad completadas (Tasks #1–#10)
- [x] Cobertura de tests >97% (actual: >97%, 1602 tests)
- [x] Edge cases compuestos validados (Task #3)
- [x] WeakMap/WeakSet transformers implementados (Task #4)
- [ ] Task #11 completada (`safeStringify` truncado)
- [ ] Task #12 completada (warning `disableSafetyChecks`)
- [ ] Task #13 completada (script `release:check`)
- [ ] `bun run check` pasa sin errores
- [ ] `bun run lint` sin warnings
- [x] `bun test` 100% passing

**Release Process:**

- [ ] `bun run release:check` funcionando (⚠️ Task #13 pendiente)
- [ ] Documentación actualizada (README, guides)
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
- [x] Documentación bilingüe EN+ES
- [ ] `safeStringify` truncado (Task #11)
- [ ] Warning `disableSafetyChecks` (Task #12)
- [ ] Script `release:check` en package.json (Task #13)

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### Orden sugerido de implementación:

**1. Task #3: Casos edge compuestos** (PRIORITARIO)

- **Por qué ahora:** Complementa la Schema Generation API recién implementada
- **Riesgo:** Bugs en producción con tipos complejos
- **Beneficio:** Robustez y confianza en transformaciones anidadas
- **Tiempo:** 3-4 horas

**2. Task #4: WeakMap/WeakSet docs** (SIGUIENTE)

- **Por qué después:** Decisión arquitectónica importante
- **Impacto:** Evita confusión de usuarios
- **Beneficio:** Documentación completa de limitaciones
- **Tiempo:** 1-2 horas

**3. Task #5 & #6: Backlog** (POSTPONER)

- **Por qué esperar:** No son críticos para el primer release v1.0.0
- **Timing:** Mejor después de feedback de usuarios en producción
- **Beneficio:** Features guiadas por necesidades reales

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

**Última actualización:** 22 de febrero de 2026 - Revisión completa del proyecto (11 nuevas tareas identificadas #11–#22)
