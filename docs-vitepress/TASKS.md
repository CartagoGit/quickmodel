# QuickModel - Tareas Pendientes

> **Fecha de revisión:** 6 de febrero de 2026  
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)  
> **Estado actual:** 1381 tests passing | Cobertura >90% | v1.0.0

## 📊 Progreso General

```
✅ Completadas: 5/6 tareas (83%)
🔄 En progreso: 0/6 tareas
⏳ Pendientes: 1/6 tareas (17%)
```

**Hitos recientes:**

- ✅ Task #1: Console.log removidos (commit `2be2df2`)
- ✅ Task #2: MCP tools coverage 50%→80% (commit `5e80d64`)
- ✅ Task #2.5: Schema Generation API con 7 formatos (commit `b9bb875`)
- ✅ Task #3: Composed transformers edge cases (commit `1c44266`, +15 tests)
- ✅ Task #4: WeakMap/WeakSet transformers (commit PENDING, +14 tests)

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

| #   | Tarea                  | Prioridad | Estado     | Esfuerzo | Impacto    | Fecha Est. |
| --- | ---------------------- | --------- | ---------- | -------- | ---------- | ---------- |
| 1   | Remover console.log    | 🔴 Alta   | ✅ HECHO   | 10min    | Alto       | —          |
| 2   | Cobertura MCP tools    | 🟡 Media  | ✅ HECHO   | 2-3h     | Alto       | —          |
| 2.5 | Schema Generation API  | 🟡 Media  | ✅ HECHO   | 4h       | Muy Alto   | —          |
| 3   | Casos edge compuestos  | 🟡 Media  | ⏳ TODO    | 3-4h     | Medio-Alto | Feb 7-8    |
| 4   | WeakMap/WeakSet docs   | 🟡 Media  | ⏳ TODO    | 1-2h     | Medio      | Feb 9-10   |
| 5   | Performance benchmarks | 🟢 Baja   | ⏸️ BACKLOG | 4-6h     | Bajo       | Mar 2026   |
| 6   | Computed properties    | 🟢 Baja   | ⏸️ BACKLOG | 2-3h     | Bajo       | Mar 2026   |

**Progreso:**

- ✅ Completadas: 3/6 (50%)
- ⏳ Pendientes: 2/6 (33%)
- ⏸️ Backlog: 2/6 (17%)

**Tiempo invertido:** ~6.5 horas  
**Tiempo restante estimado:** 4-6 horas (solo tareas activas)

---

## 🚀 PLAN DE ACCIÓN INMEDIATO

### ✅ Completado (5-6 Feb 2026):

1. ✅ **Tarea #1:** Remover console.log → 10 min
2. ✅ **Tarea #2:** Cobertura MCP tools → 2.5h
3. ✅ **Tarea #2.5:** Schema Generation API → 4h

### 🎯 Esta semana (7-8 Feb 2026):

4. ⏳ **Tarea #3:** Casos edge compuestos → 3-4h
    - Map<Symbol, Date>
    - Set<Map<string, BigInt>>
    - Array<Set<Date>>
    - Validación de tipos compuestos

### 📅 Próxima semana (9-13 Feb 2026):

5. ⏳ **Tarea #4:** WeakMap/WeakSet decisión + docs → 1-2h
    - Decisión: ¿Implementar o documentar limitación?
    - Documentar en README + SECURITY.md
    - Ejemplos de uso (si aplica)

### 🗂️ Backlog (Marzo 2026+):

6. ⏸️ **Tarea #5:** Performance benchmarks → 4-6h
    - Esperar release 1.1.0
    - Comparar con class-transformer, io-ts, zod
7. ⏸️ **Tarea #6:** Computed properties → 2-3h
    - Esperar feedback de comunidad
    - Feature request potencial

---

## 📝 NOTAS

- **Metodología TDD:** SIEMPRE escribir test primero
- **Commits:** Usar Conventional Commits
- **Revisión:** Ejecutar `bun run check` antes de commit
- **Cobertura mínima:** 80% (actual: >90%)

---

## ✅ CHECKLIST PRE-RELEASE v1.1.0

Antes de hacer merge a `main` y release:

**Tests & Calidad:**

- [x] Todas las tareas 🔴 Alta prioridad completadas (3/3)
- [x] Cobertura de tests >90% (actual: >90%, 1352 tests)
- [ ] Tarea #3 completada (casos edge compuestos)
- [ ] Tarea #4 completada (WeakMap/WeakSet docs)
- [ ] `bun run check` pasa sin errores
- [ ] `bun run lint` sin warnings
- [ ] `bun test` 100% passing

**Release Process:**

- [ ] `bun run release:check` revisado
- [ ] Documentación actualizada (README, guides)
- [ ] CHANGELOG.md actualizado con nuevas features
- [ ] Versión bumpeada correctamente (1.0.0 → 1.1.0)
- [ ] Git tag creado: `v1.1.0`

**Features Nuevas en v1.1.0:**

- [x] Schema Generation API (7 formatos)
- [x] MCP tools coverage mejorada
- [ ] Edge cases compuestos validados
- [ ] WeakMap/WeakSet documentados

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

- **Por qué esperar:** No son críticos para v1.1.0
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

**Última actualización:** 6 de febrero de 2026 - 07:22 UTC
