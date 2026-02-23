// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

export interface IBenchScenario {
	key: string;
	labelEn: string;
	labelEs: string;
	notesEn: string;
	notesEs: string;
	values: Record<string, number | null>; // null = N/A para esa librería
	appTypes: string[]; // 'all' | 'api' | 'ddd' | 'testing' | 'data' | 'mock'
}

export interface ILibraryInfo {
	color: string;
	descEn: string;
	descEs: string;
	prosEn: string[];
	prosEs: string[];
	consEn: string[];
	consEs: string[];
}

export type IFeatureValue = boolean | 'partial';

export interface IFeatureNote {
	textEn: string;
	textEs: string;
}

export interface IFeatureRow {
	featureEn: string;
	featureEs: string;
	category: string;
	values: Record<string, IFeatureValue>;
	notes?: Record<string, IFeatureNote>;
	/** Key del escenario de benchmark asociado a esta feature, para el coverage map */
	scenarioKey?: string;
}

// ─────────────────────────────────────────────────────────────
// ESCENARIOS DE BENCHMARK
// Valores aproximados obtenidos de los tests en hardware típico.
// Ejecutar `bun run bench:compare` para ver los valores exactos.
// ─────────────────────────────────────────────────────────────

export const scenarios: IBenchScenario[] = [
	{
		key: 'validation',
		labelEn: 'Schema Validation (10k)',
		labelEs: 'Validación de Esquemas (10k)',
		notesEn:
			'10k validations — TypeBox compiles to raw JSON Schema checks (fastest), valibot is tree-shakeable, Zod is the most popular, yup is mature. QM adds auto-coercion on top of validation. Plain JS and class-transformer excluded: no schema validation. arktype is fastest TypeScript-native validator. joi is mature but slower.',
		notesEs:
			'10k validaciones — TypeBox compila a checks JSON Schema nativo (más rápido), valibot es tree-shakeable, Zod es el más popular, yup es maduro. QM añade coerción automática sobre la validación. Plain JS y class-transformer excluidos: sin validación de esquemas. arktype es el validador TypeScript-nativo más rápido. joi es maduro pero más lento.',
		appTypes: ['all', 'api'],
		values: {
			TypeBox: 2_082_986,
			arktype: 6_719_527,
			valibot: 3_864_734,
			Zod: 1_221_717,
			yup: 64_157,
			joi: 204_429,
			QuickModel: 94_960,
			'Plain JS': null,
			'class-transformer': null,
			'class-validator': null,
			superjson: null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'coercion',
		labelEn: 'Type Coercion (Date + BigInt + Map + Set)',
		labelEs: 'Coerción de Tipos (Date + BigInt + Map + Set)',
		notesEn:
			'1k objects — auto vs manual coercion. QM: one decorator, zero extra code. Zod/valibot: manual transform per field. class-transformer: only Date via @Type, not BigInt/Map/Set. Plain JS, TypeBox, yup, joi, vest, superjson and arktype cannot do model-level coercion.',
		notesEs:
			'1k objetos — coerción automática vs manual. QM: un decorador, cero código extra. Zod/valibot: transform manual por campo. class-transformer: solo Date via @Type, no BigInt/Map/Set. Plain JS, TypeBox, yup, joi, vest, superjson y arktype no hacen coerción a nivel de modelo.',
		appTypes: ['all', 'ddd'],
		values: {
			valibot: 524_686,
			'class-transformer': 63_422,
			Zod: 216_085,
			QuickModel: 38_622,
			'Plain JS': null,
			TypeBox: null,
			yup: null,
			arktype: null,
			joi: null,
			superjson: null,
			'class-validator': null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'serialization',
		labelEn: 'Serialization Roundtrip (type-safe)',
		labelEs: 'Roundtrip Serialización (con tipos)',
		notesEn:
			'1k round-trips. Plain JS (JSON.parse/stringify) is the fastest but loses Date→string, BigInt→error, Map/Set→{}. class-transformer preserves Date only via @Type. superjson preserves Date, BigInt, Set, Map, RegExp and more. QuickModel preserves all types natively — bars for Plain JS and arktype are clipped for readability.',
		notesEs:
			'1k roundtrips. Plain JS (JSON.parse/stringify) es el más rápido pero pierde Date→string, BigInt→error, Map/Set→{}. class-transformer preserva solo Date via @Type. superjson preserva Date, BigInt, Set, Map, RegExp y más. QuickModel preserva todos los tipos nativamente — barras de Plain JS y arktype recortadas para legibilidad.',
		appTypes: ['all', 'data'],
		values: {
			'Plain JS': 1_669_449,
			'class-transformer': 50_434,
			superjson: 45_600,
			QuickModel: 37_698,
			TypeBox: null,
			valibot: null,
			Zod: null,
			yup: null,
			arktype: null,
			joi: null,
			'class-validator': null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'batch',
		labelEn: 'Batch Validation (1k objects)',
		labelEs: 'Validación Batch (1k objetos)',
		notesEn:
			'10 cycles of 1k objects — throughput validation. class-transformer excluded (not a validator — needs class-validator separately). Plain JS excluded (no validation). arktype is fastest native TS validator. joi and vest are focused on form/business logic rules.',
		notesEs:
			'10 ciclos de 1k objetos — rendimiento de validación en masa. class-transformer excluido (no es validador — necesita class-validator por separado). Plain JS excluido (sin validación). arktype es el validador TypeScript-nativo más rápido. joi y vest están orientados a reglas de negocio/formularios.',
		appTypes: ['all', 'data'],
		values: {
			TypeBox: 5_373,
			arktype: 44_248,
			valibot: 8_062,
			Zod: 3_473,
			'class-validator': 120_000,
			joi: 325,
			yup: 111,
			QuickModel: 2_377,
			'Plain JS': null,
			'class-transformer': null,
			superjson: null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'mocks',
		labelEn: 'Test Data Generation (100 instances)',
		labelEs: 'Generación de Datos para Tests (100 instancias)',
		notesEn:
			'100 typed instances per cycle. faker (manual) is raw-faster but requires 10-20 lines of per-model factory code, no type constraints, needs manual maintenance on schema changes. QM is built-in: zero setup, fully typed, respects field constraints automatically. Bar for faker is clipped — it runs at 80k ops/s. arktype, joi, superjson, class-validator and vest have no built-in mock generation.',
		notesEs:
			'100 instancias tipadas por ciclo. faker (manual) es más rápido en bruto pero requiere 10-20 líneas de factory por modelo, sin restricciones de tipo, requiere mantenimiento manual al cambiar el schema. QM está integrado: cero setup, totalmente tipado, respeta restricciones automáticamente. La barra de faker está recortada — corre a 80k ops/s. arktype, joi, superjson, class-validator y vest no tienen generación de mocks integrada.',
		appTypes: ['all', 'testing', 'mock'],
		values: {
			'faker (manual)': 80_000,
			QuickModel: 101_657,
			'Plain JS': null,
			TypeBox: null,
			valibot: null,
			Zod: null,
			'class-transformer': null,
			yup: null,
			arktype: null,
			joi: null,
			superjson: null,
			'class-validator': null,
			vest: null,
		},
	},
	{
		key: 'rules',
		labelEn: 'Business Rules / @QRule (5k iterations)',
		labelEs: 'Reglas de Negocio / @QRule (5k iteraciones)',
		notesEn:
			'5k iterations. QuickModel @QRule: inline co-located decorators, zero external setup. class-validator: @IsEmail/@MinLength/@Matches with validateSync(). joi: schema.validate() with fluent API. vest: new suite per field via create() + test() assertions.',
		notesEs:
			'5k iteraciones. QuickModel @QRule: decoradores co-localizados, sin setup externo. class-validator: @IsEmail/@MinLength/@Matches con validateSync(). joi: schema.validate() con API fluida. vest: nueva suite por campo con create() + aserciones test().',
		appTypes: ['all', 'api'],
		values: {
			QuickModel: 1_249_750,
			'class-validator': 130_378,
			joi: 112_905,
			vest: 8_218,
			'Plain JS': null,
			TypeBox: null,
			valibot: null,
			Zod: null,
			'class-transformer': null,
			yup: null,
			arktype: null,
			superjson: null,
			'faker (manual)': null,
		},
	},
];

// ─────────────────────────────────────────────────────────────
// LIBRERÍAS — colores, descripciones y pros/contras
// ─────────────────────────────────────────────────────────────

export const libraries: Record<string, ILibraryInfo> = {
	'Plain JS': {
		color: '#64748b',
		descEn: 'Raw JavaScript objects — maximum speed, zero safety',
		descEs: 'Objetos JavaScript puros — velocidad máxima, sin seguridad',
		prosEn: [
			'Blazing fast (~100% baseline)',
			'Zero dependencies',
			'No overhead at all',
		],
		prosEs: [
			'Ultra rápido (~100% baseline)',
			'Sin dependencias',
			'Sin overhead',
		],
		consEn: [
			'No type coercion (Date, BigInt, Map, Set)',
			'No serialization / deserialization',
			'No runtime type integrity',
			'No mock generation',
			'No AI / MCP integration',
			'No model state (copy, isDirty)',
			'No form schemas',
			'No computed fields',
			'No business rules (@QRule)',
		],
		consEs: [
			'Sin coerción de tipos (Date, BigInt, Map, Set)',
			'Sin serialización / deserialización',
			'Sin integridad de tipos en runtime',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo (copy, isDirty)',
			'Sin form schemas',
			'Sin campos computados',
			'Sin reglas de negocio (@QRule)',
		],
	},
	TypeBox: {
		color: '#0ea5e9',
		descEn: 'Ultra-fast JSON Schema validation — compiled checks, zero overhead',
		descEs: 'Validación JSON Schema ultra-rápida — checks compilados, sin overhead',
		prosEn: [
			'Fastest validation (~70% of Plain JS) ✅',
			'Compiled JSON Schema checks ✅',
			'Type inference from schemas ✅',
			'Tiny bundle size ✅',
			'JSON Schema export ✅',
		],
		prosEs: [
			'Validación más rápida (~70% de Plain JS) ✅',
			'Checks JSON Schema compilados ✅',
			'Inferencia de tipos desde schemas ✅',
			'Bundle muy pequeño ✅',
			'Exportar JSON Schema ✅',
		],
		consEn: [
			'No type coercion (Date, BigInt, Map, Set)',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No form schemas or computed fields',
		],
		consEs: [
			'Sin coerción de tipos (Date, BigInt, Map, Set)',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin form schemas ni campos computados',
		],
	},
	valibot: {
		color: '#f59e0b',
		descEn: 'Modular, tree-shakeable validation — smallest bundle in the ecosystem',
		descEs: 'Validación modular y tree-shakeable — bundle más pequeño del ecosistema',
		prosEn: [
			'Tree-shakeable (tiny bundle) ✅',
			'Fast validation (~32% of Plain JS) ✅',
			'pipe() transforms for type coercion ✅',
			'Type-safe schemas ✅',
		],
		prosEs: [
			'Tree-shakeable (bundle mínimo) ✅',
			'Validación rápida (~32% de Plain JS) ✅',
			'pipe() con transforms para coerción ✅',
			'Schemas con seguridad de tipos ✅',
		],
		consEn: [
			'Coercion requires manual pipe(transform()) per field',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No model state, form schemas, or computed fields',
		],
		consEs: [
			'Coerción requiere pipe(transform()) manual por campo',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado, form schemas ni campos computados',
		],
	},
	Zod: {
		color: '#8b5cf6',
		descEn: 'Schema validation library — great for validation, not full modeling',
		descEs: 'Librería de validación — excelente para validar, no para modelado completo',
		prosEn: [
			'Fast validation',
			'Type-safe schemas',
			'Runtime integrity ✅',
			'Large ecosystem',
		],
		prosEs: [
			'Validación rápida',
			'Schemas tipados',
			'Integridad en runtime ✅',
			'Gran ecosistema',
		],
		consEn: [
			'No built-in serialization (needs superjson or similar)',
			'Date/BigInt/Map/Set require manual .transform() per field',
			'No mock generation (needs @faker-js/faker + manual mapping)',
			'No built-in AI / MCP Server',
			'No model state (copy, isDirty, hasIntegrity)',
			'No polymorphic JSON (subclass instantiation)',
			'No form schemas from decorators',
			'No computed fields',
		],
		consEs: [
			'Sin serialización built-in (necesita superjson u otro)',
			'Date/BigInt/Map/Set requieren .transform() manual por campo',
			'Sin mocks (necesita @faker-js/faker + mapeo manual)',
			'Sin servidor IA / MCP integrado',
			'Sin estado de modelo (copy, isDirty, hasIntegrity)',
			'Sin JSON polimórfico (instanciación de subclases)',
			'Sin form schemas desde decoradores',
			'Sin campos computados',
		],
	},
	QuickModel: {
		color: '#3b82f6',
		descEn: 'Full TypeScript modeling platform with AI built-in',
		descEs: 'Plataforma de modelado TypeScript completa con IA integrada',
		prosEn: [
			'Auto coercion Date/BigInt/Map/Set ✅',
			'Native serialize() / deserialize() ✅',
			'Typed mock generation built-in ✅',
			'AI/MCP Server built-in ✅',
			'Automatic polymorphic JSON ✅',
			'Model state: copy(), isDirty(), hasIntegrity() ✅',
			'Form schemas: @QField, @QGroup, getFormSchema() ✅',
			'Computed fields: @QComputed ✅',
			'Async business rules: @QRule, checkRulesAsync() ✅',
			'Multi-level inheritance inference ✅',
			'Schema export: JSON / Zod / OpenAPI / GraphQL ✅',
			'Zero-dep core ✅',
		],
		prosEs: [
			'Coerción automática Date/BigInt/Map/Set ✅',
			'serialize() / deserialize() nativo ✅',
			'Generación de mocks tipados built-in ✅',
			'Servidor IA/MCP integrado ✅',
			'JSON polimórfico automático ✅',
			'Estado: copy(), isDirty(), hasIntegrity() ✅',
			'Form schemas: @QField, @QGroup, getFormSchema() ✅',
			'Campos computados: @QComputed ✅',
			'Reglas async: @QRule, checkRulesAsync() ✅',
			'Inferencia de herencia multinivel ✅',
			'Exportar schemas: JSON / Zod / OpenAPI / GraphQL ✅',
			'Core sin dependencias externas ✅',
		],
		consEn: [
			'~4x slower than plain JS for simple primitives',
			'(still <0.1ms per typical API operation — not noticeable in practice)',
		],
		consEs: [
			'~4x más lento que Plain JS para primitivos simples',
			'(sigue siendo <0.1ms por operación típica de API — imperceptible en práctica)',
		],
	},
	'class-transformer': {
		color: '#ef4444',
		descEn: 'Annotation-based class serialization — @Type decorators for Date, not BigInt/Map/Set',
		descEs: 'Serialización de clases por anotaciones — @Type para Date, sin soporte BigInt/Map/Set',
		prosEn: [
			'instanceToPlain() / plainToInstance() ✅',
			'@Type(() => Date) for Date fields ✅',
			'Polymorphic deserializeation with @Type ✅',
			'Works with existing class definitions ✅',
		],
		prosEs: [
			'instanceToPlain() / plainToInstance() ✅',
			'@Type(() => Date) para campos Date ✅',
			'Deserialización polimórfica con @Type ✅',
			'Funciona con clases existentes ✅',
		],
		consEn: [
			'No validation — needs class-validator separately',
			'BigInt, Map, Set require manual @Transform per field',
			'No mock generation',
			'No AI / MCP integration',
			'No form schemas or computed fields',
			'No async business rules',
		],
		consEs: [
			'Sin validación — necesita class-validator por separado',
			'BigInt, Map, Set requieren @Transform manual por campo',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin form schemas ni campos computados',
			'Sin reglas de negocio async',
		],
	},
	yup: {
		color: '#6b7280',
		descEn: 'Schema-based validation with async support — mature but heavy',
		descEs: 'Validación basada en schemas con soporte async — maduro pero pesado',
		prosEn: [
			'Async validation support ✅',
			'Mixed schemas (any/lazy) ✅',
			'Large ecosystem / well-known ✅',
		],
		prosEs: [
			'Soporte validación async ✅',
			'Schemas mixtos (any/lazy) ✅',
			'Gran ecosistema / muy conocido ✅',
		],
		consEn: [
			'~20x slower than TypeBox for simple validation',
			'No type coercion for BigInt, Map, Set',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No form schemas or computed fields',
		],
		consEs: [
			'~20x más lento que TypeBox para validación simple',
			'Sin coerción para BigInt, Map, Set',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin form schemas ni campos computados',
		],
	},
	'faker (manual)': {
		color: '#10b981',
		descEn: '@faker-js/faker — fast random data generation, manual model mapping required',
		descEs: '@faker-js/faker — generación rápida de datos, requiere mapping manual por modelo',
		prosEn: [
			'Very fast raw generation (~80k/s) ✅',
			'Huge variety of data types ✅',
			'Well-known, large ecosystem ✅',
		],
		prosEs: [
			'Generación raw muy rápida (~80k/s) ✅',
			'Gran variedad de tipos de datos ✅',
			'Muy conocido, gran ecosistema ✅',
		],
		consEn: [
			'Must write a manual factory function per model',
			'Factory breaks on every schema change — manual maintenance',
			'No type constraints (min/max, regex, enum) automatically',
			'No model state, validation, or coercion',
			'No relationship between fields (e.g. createdAt < updatedAt)',
		],
		consEs: [
			'Hay que escribir una factory manual por cada modelo',
			'La factory rompe en cada cambio de schema — mantenimiento manual',
			'Sin restricciones de tipo automáticas (min/max, regex, enum)',
			'Sin estado de modelo, validación ni coerción',
			'Sin relación entre campos (p.ej. createdAt < updatedAt)',
		],
	},
	arktype: {
		color: '#f97316',
		descEn: 'TypeScript-native validator with compile-time inference — blazing fast schema validation',
		descEs: 'Validador TypeScript-nativo con inferencia en compile-time — validación de schemas ultra rápida',
		prosEn: [
			'Fastest TypeScript-native validator (5M+ ops/s) ✅',
			'Compile-time type inference from string syntax ✅',
			'Tiny bundle footprint ✅',
			'Expressive syntax: "string | number", "string[]" ✅',
		],
		prosEs: [
			'Validador TypeScript-nativo más rápido (5M+ ops/s) ✅',
			'Inferencia de tipos en compile-time desde sintaxis string ✅',
			'Peso en bundle muy pequeño ✅',
			'Sintaxis expresiva: "string | number", "string[]" ✅',
		],
		consEn: [
			'No type coercion (Date, BigInt, Map, Set)',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No model state (copy, isDirty)',
			'No form schemas or computed fields',
			'No async business rules',
		],
		consEs: [
			'Sin coerción de tipos (Date, BigInt, Map, Set)',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo (copy, isDirty)',
			'Sin form schemas ni campos computados',
			'Sin reglas de negocio async',
		],
	},
	superjson: {
		color: '#0d9488',
		descEn: 'JSON superset that preserves Date, BigInt, Map, Set, RegExp, undefined across serialization',
		descEs: 'Superconjunto de JSON que preserva Date, BigInt, Map, Set, RegExp, undefined en serialización',
		prosEn: [
			'Preserves Date, BigInt, Map, Set, RegExp, undefined ✅',
			'Drop-in replacement for JSON.stringify/parse ✅',
			'Works with any existing class or plain object ✅',
			'Small bundle, well-maintained ✅',
		],
		prosEs: [
			'Preserva Date, BigInt, Map, Set, RegExp, undefined ✅',
			'Reemplazo directo de JSON.stringify/parse ✅',
			'Funciona con cualquier clase u objeto plano ✅',
			'Bundle pequeño, bien mantenido ✅',
		],
		consEn: [
			'No schema validation',
			'No type coercion via decorators',
			'No mock generation',
			'No AI / MCP integration',
			'No model state or computed fields',
			'No form schemas or business rules',
			'Requires superjson on both client and server',
		],
		consEs: [
			'Sin validación de schemas',
			'Sin coerción de tipos por decoradores',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo ni campos computados',
			'Sin form schemas ni reglas de negocio',
			'Requiere superjson tanto en cliente como servidor',
		],
	},
	'class-validator': {
		color: '#ec4899',
		descEn: 'Decorator-based validation for TypeScript classes — typically paired with class-transformer',
		descEs: 'Validación basada en decoradores para clases TypeScript — habitualmente junto a class-transformer',
		prosEn: [
			'Rich set of built-in decorators (@IsEmail, @MinLength…) ✅',
			'Async validation support ✅',
			'Custom constraint decorators ✅',
			'Works with existing class definitions ✅',
		],
		prosEs: [
			'Amplio conjunto de decoradores built-in (@IsEmail, @MinLength…) ✅',
			'Soporte de validación asíncrona ✅',
			'Decoradores de restricciones personalizados ✅',
			'Funciona con definiciones de clases existentes ✅',
		],
		consEn: [
			'No type coercion — needs class-transformer separately',
			'No serialization beyond class-transformer combination',
			'No mock generation',
			'No AI / MCP integration',
			'No model state (copy, isDirty)',
			'No form schemas or computed fields',
		],
		consEs: [
			'Sin coerción de tipos — necesita class-transformer por separado',
			'Sin serialización más allá de la combinación con class-transformer',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo (copy, isDirty)',
			'Sin form schemas ni campos computados',
		],
	},
	vest: {
		color: '#6366f1',
		descEn: 'Form validation framework inspired by testing suites — groups and async rules for UI forms',
		descEs: 'Framework de validación de formularios inspirado en suites de test — grupos y reglas async para UI',
		prosEn: [
			'Suite/group structure mirrors @QGroup concept ✅',
			'Async rule support ✅',
			'Great DX for form validation scenarios ✅',
			'Framework-agnostic ✅',
		],
		prosEs: [
			'Estructura suite/group paralela al concepto @QGroup ✅',
			'Soporte de reglas async ✅',
			'Excelente DX para escenarios de validación de formularios ✅',
			'Agnóstico al framework ✅',
		],
		consEn: [
			'~130x slower than @QRule for business rules',
			'No schema validation or type coercion',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No model state or inheritance inference',
		],
		consEs: [
			'~130x más lento que @QRule para reglas de negocio',
			'Sin validación de schemas ni coerción de tipos',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo ni inferencia de herencia',
		],
	},
	joi: {
		color: '#84cc16',
		descEn: 'Battle-tested schema description and data validator for Node.js — expressive API, mature ecosystem',
		descEs: 'Validador y descriptor de schemas para Node.js con amplia trayectoria — API expresiva, ecosistema maduro',
		prosEn: [
			'Very expressive, chainable API ✅',
			'Async validation and custom rules ✅',
			'Conditional validation (.when()) ✅',
			'Large ecosystem / battle-tested ✅',
		],
		prosEs: [
			'API muy expresiva y encadenable ✅',
			'Validación async y reglas personalizadas ✅',
			'Validación condicional (.when()) ✅',
			'Gran ecosistema / amplia trayectoria ✅',
		],
		consEn: [
			'~75x slower than TypeBox for validation',
			'No type coercion for BigInt, Map, Set',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No model state or computed fields',
			'No decorator-based approach',
		],
		consEs: [
			'~75x más lento que TypeBox para validación',
			'Sin coerción para BigInt, Map, Set',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo ni campos computados',
			'Sin enfoque basado en decoradores',
		],
	},
};

// ─────────────────────────────────────────────────────────────
// TABLA DE CARACTERÍSTICAS
// ─────────────────────────────────────────────────────────────

export const featureRows: IFeatureRow[] = [
	{
		featureEn: 'Auto coercion',
		featureEs: 'Coerción automática',
		category: 'serialization',
		scenarioKey: 'coercion',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: 'partial',
			Zod: 'partial',
			'class-transformer': 'partial',
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
		notes: {
			valibot: {
				textEn: 'Requires manual pipe + transform per field',
				textEs: 'Requiere pipe + transform manual por campo',
			},
			Zod: {
				textEn: 'Requires z.coerce or .transform() per field',
				textEs: 'Requiere z.coerce o .transform() por campo',
			},
			'class-transformer': {
				textEn: 'Only Date via @Type — no BigInt, Map or Set',
				textEs: 'Solo Date mediante @Type — sin BigInt, Map ni Set',
			},
		},
	},
	{
		featureEn: 'Native serialization (toJSON)',
		featureEs: 'Serialización nativa (toJSON)',
		category: 'serialization',
		scenarioKey: 'serialization',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': 'partial',
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: true,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
		notes: {
			'class-transformer': {
				textEn: 'Only Date via @Type — no BigInt, Map, Set or RegExp',
				textEs: 'Solo Date mediante @Type — sin BigInt, Map, Set ni RegExp',
			},
		},
	},
	{
		featureEn: 'Typed mock generation',
		featureEs: 'Generación de mocks tipados',
		category: 'exclusive',
		scenarioKey: 'mocks',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Built-in AI / MCP Server',
		featureEs: 'IA / Servidor MCP integrado',
		category: 'exclusive',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Polymorphic JSON',
		featureEs: 'JSON polimórfico',
		category: 'serialization',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': 'partial',
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: 'partial',
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
		notes: {
			'class-transformer': {
				textEn: 'Possible with custom discriminator but requires extra boilerplate',
				textEs: 'Posible con discriminador custom pero requiere boilerplate extra',
			},
			superjson: {
				textEn: 'Preserves types but requires an already-typed object in memory',
				textEs: 'Preserva tipos pero necesita el objeto ya tipado en memoria',
			},
		},
	},
	{
		featureEn: 'copy() / isDirty()',
		featureEs: 'copy() / isDirty()',
		category: 'model',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Form schemas (@QField)',
		featureEs: 'Form schemas (@QField)',
		category: 'forms',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: 'partial',
			joi: false,
			'faker (manual)': false,
		},
		notes: {
			vest: {
				textEn: 'Suite-based form structure but no decorator integration with model classes',
				textEs: 'Estructura de formulario basada en suites, sin integración con decoradores de clase',
			},
		},
	},
	{
		featureEn: 'Computed fields (@QComputed)',
		featureEs: 'Campos computados (@QComputed)',
		category: 'exclusive',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Async business rules (@QRule)',
		featureEs: 'Reglas de negocio async (@QRule)',
		category: 'forms',
		scenarioKey: 'rules',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: 'partial',
			'class-transformer': false,
			QuickModel: true,
			yup: 'partial',
			arktype: false,
			superjson: false,
			'class-validator': 'partial',
			vest: 'partial',
			joi: 'partial',
			'faker (manual)': false,
		},
		notes: {
			Zod: {
				textEn: 'Async refinements supported but not co-located with model definition',
				textEs: 'Soporta refinements async pero no están co-localizados con la definición del modelo',
			},
			yup: {
				textEn: 'Async .test() supported but defined separately from the model',
				textEs: 'Soporta .test() async pero se define separado del modelo',
			},
			'class-validator': {
				textEn: 'Via @ValidateIf + async custom validators; extra dependency required',
				textEs: 'Mediante @ValidateIf + validadores async; requiere dependencia extra',
			},
			vest: {
				textEn: 'External validation suite, not integrated with model class',
				textEs: 'Suite de validación externa, no integrada con la clase del modelo',
			},
			joi: {
				textEn: 'External validation suite, not integrated with model class',
				textEs: 'Suite de validación externa, no integrada con la clase del modelo',
			},
		},
	},
	{
		featureEn: 'Runtime integrity',
		featureEs: 'Integridad en runtime',
		category: 'validation',
		scenarioKey: 'validation',
		values: {
			'Plain JS': false,
			TypeBox: true,
			valibot: 'partial',
			Zod: true,
			'class-transformer': false,
			QuickModel: true,
			yup: 'partial',
			arktype: true,
			superjson: false,
			'class-validator': 'partial',
			vest: 'partial',
			joi: 'partial',
			'faker (manual)': false,
		},
		notes: {
			valibot: {
				textEn: 'Possible with manual parse calls, not enforced by the model itself',
				textEs: 'Posible con llamadas parse manuales, no aplicado por el modelo',
			},
			yup: {
				textEn: 'Possible with manual .validate() calls, not built into the model lifecycle',
				textEs: 'Posible con llamadas .validate() manuales, no integrado en el ciclo de vida del modelo',
			},
			'class-validator': {
				textEn: 'Requires explicit validate() call; not automatic on assignment',
				textEs: 'Requiere llamada explícita a validate(); no automático en la asignación',
			},
			vest: {
				textEn: 'External suite — must be called manually, not bound to model lifecycle',
				textEs: 'Suite externa — debe llamarse manualmente, no está ligada al ciclo de vida del modelo',
			},
			joi: {
				textEn: 'External suite — must be called manually, not bound to model lifecycle',
				textEs: 'Suite externa — debe llamarse manualmente, no está ligada al ciclo de vida del modelo',
			},
		},
	},
	{
		featureEn: 'Multi-level inheritance inference',
		featureEs: 'Herencia multinivel con inferencia',
		category: 'model',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Schema export (JSON/Zod/OpenAPI)',
		featureEs: 'Exportar schema (JSON/Zod/OpenAPI)',
		category: 'validation',
		values: {
			'Plain JS': false,
			TypeBox: true,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Compile-time TS inference',
		featureEs: 'Inferencia TS compile-time',
		category: 'validation',
		values: {
			'Plain JS': false,
			TypeBox: true,
			valibot: true,
			Zod: true,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: true,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Tree-shakeable',
		featureEs: 'Tree-shakeable',
		category: 'validation',
		values: {
			'Plain JS': true,
			TypeBox: 'partial',
			valibot: true,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: true,
			superjson: false,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': true,
		},
		notes: {
			TypeBox: {
				textEn: 'Most types are tree-shakeable but the internal compiler/runtime is always included',
				textEs: 'La mayoría de tipos son tree-shakeable pero el compilador/runtime interno siempre se incluye',
			},
		},
	},
	{
		featureEn: 'Decorator constraints (@IsEmail…)',
		featureEs: 'Restricciones (@IsEmail…)',
		category: 'validation',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': true,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Preserves RegExp/undefined/NaN',
		featureEs: 'Preserva RegExp/undefined/NaN',
		category: 'serialization',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: true,
			'class-validator': false,
			vest: false,
			joi: false,
			'faker (manual)': false,
		},
	},
	{
		featureEn: 'Validation groups / suites',
		featureEs: 'Grupos de validación',
		category: 'forms',
		values: {
			'Plain JS': false,
			TypeBox: false,
			valibot: false,
			Zod: false,
			'class-transformer': false,
			QuickModel: true,
			yup: false,
			arktype: false,
			superjson: false,
			'class-validator': 'partial',
			vest: true,
			joi: false,
			'faker (manual)': false,
		},
		notes: {
			'class-validator': {
				textEn: 'Supported via groups option but requires verbose @ValidateIf setup',
				textEs: 'Soportado mediante la opción groups pero requiere configuración verbosa con @ValidateIf',
			},
		},
	},
];

// ─────────────────────────────────────────────────────────────
// ORDEN DE VISUALIZACIÓN DE LIBRERÍAS
// ─────────────────────────────────────────────────────────────

export const libNames: string[] = [
	'TypeBox',
	'arktype',
	'valibot',
	'Zod',
	'class-transformer',
	'class-validator',
	'yup',
	'joi',
	'superjson',
	'vest',
	'QuickModel',
	'Plain JS',
	'faker (manual)',
];

// ─────────────────────────────────────────────────────────────
// CATEGORÍAS DE LIBRERÍAS (para filtro de la tabla de características)
// ─────────────────────────────────────────────────────────────

export const matrixTypeOptions = [
	{ key: 'all', labelEn: 'All libraries', labelEs: 'Todas las librerías' },
	{ key: 'validation', labelEn: 'Validators', labelEs: 'Validadores' },
	{
		key: 'serialization',
		labelEn: 'Serialization',
		labelEs: 'Serialización',
	},
	{ key: 'forms', labelEn: 'Forms / Rules', labelEs: 'Formularios / Reglas' },
	{ key: 'mocks', labelEn: 'Mocks', labelEs: 'Mocks' },
];

export const libCategories: Record<string, string[]> = {
	'Plain JS': ['serialization'],
	TypeBox: ['validation'],
	valibot: ['validation'],
	Zod: ['validation'],
	'class-transformer': ['serialization'],
	yup: ['validation', 'forms'],
	arktype: ['validation'],
	superjson: ['serialization'],
	'class-validator': ['validation', 'forms'],
	vest: ['forms'],
	joi: ['validation', 'forms'],
	QuickModel: ['validation', 'serialization', 'forms', 'mocks'],
	'faker (manual)': ['mocks'],
};

export const featureCategoryOptions = [
	{
		key: 'all',
		labelEn: 'All features',
		labelEs: 'Todas las características',
	},
	{ key: 'validation', labelEn: 'Validation', labelEs: 'Validación' },
	{
		key: 'serialization',
		labelEn: 'Serialization',
		labelEs: 'Serialización',
	},
	{ key: 'forms', labelEn: 'Forms & Rules', labelEs: 'Formularios y Reglas' },
	{ key: 'model', labelEn: 'Model State', labelEs: 'Estado del Modelo' },
	{
		key: 'exclusive',
		labelEn: 'QuickModel Only',
		labelEs: 'Solo QuickModel',
	},
];

// ─────────────────────────────────────────────────────────────
// OPCIONES DE FILTRO POR TIPO DE APP
// ─────────────────────────────────────────────────────────────

export const appTypeOptions = [
	{ key: 'all', labelEn: 'All contexts', labelEs: 'Todos los contextos' },
	{
		key: 'api',
		labelEn: 'REST API / Backend',
		labelEs: 'REST API / Backend',
	},
	{
		key: 'ddd',
		labelEn: 'Domain Modeling / DDD',
		labelEs: 'Modelado de Dominio / DDD',
	},
	{ key: 'testing', labelEn: 'Testing', labelEs: 'Testing' },
	{
		key: 'mock',
		labelEn: 'Mock / Test Data',
		labelEs: 'Mock / Datos de test',
	},
	{ key: 'data', labelEn: 'Data Pipeline', labelEs: 'Data Pipeline' },
];
