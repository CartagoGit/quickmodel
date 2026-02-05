# QuickModel - Tareas Pendientes

> **Fecha de revisión:** 6 de febrero de 2026
> **Metodología:** TDD - Test-Driven Development (SIEMPRE test primero)

---

## 🔴 ALTA PRIORIDAD (Críticas)

### ✅ Task #1: Remover console.log de código de producción

**Status:** 🔴 TODO  
**Archivo:** `src/core/services/population.service.ts` (líneas 194, 199)  
**Impacto:** Alto - Contamina logs en producción  
**Esfuerzo:** 10 minutos  
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

**Status:** 🟡 TODO  
**Archivos:**

- `src/mcp/tools/public/list-transformers.tool.ts` (50%)
- `src/mcp/tools/public/export-schema.tool.ts` (66.67%)
- `src/mcp/tools/public/generate-mock.tool.ts` (66.67%)
- `src/mcp/tools/public/interface-to-model.tool.ts` (66.67%)
- `src/mcp/tools/public/json-to-model.tool.ts` (66.67%)

**Impacto:** Alto - Son features públicas del MCP  
**Esfuerzo:** 2-3 horas  
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

### Task #2.5: Unified Schema Generation API

**Status:** 🟡 TODO  
**Impacto:** Alto - Feature muy valiosa para ecosistema  
**Esfuerzo:** 3-5 horas  
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

### Task #3: Casos edge para transformers compuestos

**Status:** 🟡 TODO  
**Impacto:** Medio-Alto - Prevención de bugs en producción  
**Esfuerzo:** 3-4 horas

**Casos a testear:**

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

### ✅ Task #4: Documentar WeakMap/WeakSet limitations

**Status:** 🟡 TODO  
**Impacto:** Medio - Evita confusión de usuarios  
**Esfuerzo:** 1-2 horas

**Decisión requerida:**

- ¿Implementar transformer con warning?
- ¿Dejar sin soporte y documentar claramente?

**Pasos TDD (si se implementa):**

```typescript
// Test: tests/unit/transformers/weak-collections.test.ts
describe('WeakMap/WeakSet Transformers', () => {
	test('should throw descriptive error when trying to serialize WeakMap', () => {
		interface ICache {
			cache: WeakMap<object, string>;
		}

		@Quick({ cache: WeakMap })
		class Cache extends QModel<ICache> {
			declare cache: WeakMap<object, string>;
		}

		const obj = {};
		const cache = new Cache({ cache: [[obj, 'value']] });

		// WeakMap no puede serializarse a JSON
		expect(() => cache.serialize()).toThrow(/WeakMap cannot be serialized/);
	});

	test('should support WeakMap for runtime-only caching', () => {
		@Quick(
			{ cache: WeakMap },
			{
				serialization: { excludeFields: ['cache'] },
			}
		)
		class Model extends QModel<any> {
			declare cache: WeakMap<object, string>;
		}

		const obj = {};
		const model = new Model({ cache: [[obj, 'cached']] });
		expect(model.cache.get(obj)).toBe('cached');

		// Serialización ignora cache
		const json = JSON.parse(model.toJSON());
		expect(json).not.toHaveProperty('cache');
	});
});
```

**Documentación necesaria:**

- Agregar sección en README.md
- Agregar ejemplo en docs/examples/weak-collections.md
- Actualizar SECURITY.md con advertencia de memory leaks

---

## 🟢 BAJA PRIORIDAD (Nice to have)

### ✅ Task #5: Performance benchmarks

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

| #   | Tarea                  | Prioridad | Estado | Esfuerzo | Impacto    |
| --- | ---------------------- | --------- | ------ | -------- | ---------- |
| 1   | Remover console.log    | 🔴 Alta   | TODO   | 10min    | Alto       |
| 2   | Cobertura MCP tools    | 🟡 Media  | TODO   | 2-3h     | Alto       |
| 3   | Casos edge compuestos  | 🟡 Media  | TODO   | 3-4h     | Medio-Alto |
| 4   | WeakMap/WeakSet docs   | 🟡 Media  | TODO   | 1-2h     | Medio      |
| 5   | Performance benchmarks | 🟢 Baja   | TODO   | 4-6h     | Bajo       |
| 6   | Computed properties    | 🟢 Baja   | TODO   | 2-3h     | Bajo       |

**Total estimado:** 13-20 horas

---

## 🚀 PLAN DE ACCIÓN INMEDIATO

### Esta semana (Crítico):

1. ✅ **Tarea #1:** Remover console.log (10 min)
2. ✅ **Tarea #2:** Mejorar cobertura MCP tools (2-3h)
3. ✅ **Tarea #3:** Casos edge compuestos (3-4h)

### Próximas 2 semanas (Importante):

4. ✅ **Tarea #4:** WeakMap/WeakSet decisión + docs (1-2h)

### Backlog (Nice to have):

5. ⏸️ **Tarea #5:** Performance benchmarks (esperar release 1.1.0)
6. ⏸️ **Tarea #6:** Computed properties (esperar feedback comunidad)

---

## 📝 NOTAS

- **Metodología TDD:** SIEMPRE escribir test primero
- **Commits:** Usar Conventional Commits
- **Revisión:** Ejecutar `bun run check` antes de commit
- **Cobertura mínima:** 80% (actual: >90%)

---

## ✅ CHECKLIST PRE-RELEASE

Antes de hacer merge a `main` y release:

- [ ] Todas las tareas 🔴 Alta prioridad completadas
- [ ] Cobertura de tests >90%
- [ ] `bun run check` pasa sin errores
- [ ] `bun run release:check` revisado
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] Versión bumpeada correctamente

---

**Última actualización:** 6 de febrero de 2026
