// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

export interface IBenchScenario {
	key: string;
	/** Número del BENCH # en comparison-benchmarks.test.ts que alimenta este scenario */
	benchNum: number;
	appTypes: string[]; // 'all' | 'api' | 'ddd' | 'testing' | 'data' | 'mock'
	values: Record<string, number | null>; // null = N/A para esa librería
}

export interface ILibraryInfo {
	color: string;
	i18nKey: string;
}

export type IFeatureValue = boolean | 'partial';

export interface IFeatureRow {
	i18nKey: string;
	category: string;
	values: Record<string, IFeatureValue>;
	/** Maps lib display name → lib i18n key, for warning notes lookup in t.benchmark.features[i18nKey].notes */
	notes?: Record<string, string>;
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
		benchNum: 1,
		appTypes: ['all', 'api'],
		values: {
			'Plain JS': 47_961_631,
			TypeBox: 2_090_908,
			valibot: 3_301_085,
			Zod: 1_373_321,
			yup: 80_887,
			arktype: 6_036_446,
			joi: 222_251,
			QuickModel: 89_463,
			'class-transformer': null,
			'class-validator': null,
			superjson: null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'coercion',
		benchNum: 2,
		appTypes: ['all', 'ddd'],
		values: {
			valibot: 541_740,
			Zod: 226_664,
			'class-transformer': 65_778,
			'class-validator': 602_517,
			QuickModel: 40_446,
			'Plain JS': null,
			TypeBox: null,
			yup: null,
			arktype: null,
			joi: null,
			superjson: null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'serialization',
		benchNum: 3,
		appTypes: ['all', 'data'],
		values: {
			'Plain JS': 843_026,
			superjson: 40_394,
			'class-transformer': 36_496,
			QuickModel: 54_627,
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
		benchNum: 4,
		appTypes: ['all', 'data'],
		values: {
			TypeBox: 6_419,
			valibot: 7_831,
			Zod: 2_944,
			yup: 112,
			arktype: 31_407,
			joi: 326,
			QuickModel: 2_388,
			'Plain JS': null,
			'class-transformer': null,
			'class-validator': null,
			superjson: null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'mocks',
		benchNum: 5,
		appTypes: ['all', 'testing', 'mock'],
		values: {
			'Plain JS': 1_184_834,
			QuickModel: 44_144,
			'faker (manual)': 13_919,
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
		key: 'typeSerialization',
		benchNum: 7,
		appTypes: ['all', 'data'],
		values: {
			'Plain JS': 728_172,
			superjson: 39_541,
			QuickModel: 22_699,
			TypeBox: null,
			valibot: null,
			Zod: null,
			'class-transformer': null,
			yup: null,
			arktype: null,
			joi: null,
			'class-validator': null,
			vest: null,
			'faker (manual)': null,
		},
	},
	{
		key: 'rules',
		benchNum: 8,
		appTypes: ['all', 'api'],
		values: {
			QuickModel: 1_261_224,
			'class-validator': 79_684,
			joi: 126_936,
			vest: 8_323,
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
// LIBRERÍAS — color y clave i18n
// Textos (desc, pros, cons) en i18n/en.ts y i18n/es.ts bajo benchmark.libraries
// ─────────────────────────────────────────────────────────────

export const libraries: Record<string, ILibraryInfo> = {
	'Plain JS': { color: '#64748b', i18nKey: 'plainJs' },
	TypeBox: { color: '#0ea5e9', i18nKey: 'typebox' },
	valibot: { color: '#f59e0b', i18nKey: 'valibot' },
	Zod: { color: '#8b5cf6', i18nKey: 'zod' },
	QuickModel: { color: '#3b82f6', i18nKey: 'quickmodel' },
	'class-transformer': { color: '#ef4444', i18nKey: 'classTransformer' },
	yup: { color: '#6b7280', i18nKey: 'yup' },
	'faker (manual)': { color: '#10b981', i18nKey: 'fakerManual' },
	arktype: { color: '#f97316', i18nKey: 'arktype' },
	superjson: { color: '#0d9488', i18nKey: 'superjson' },
	'class-validator': { color: '#ec4899', i18nKey: 'classValidator' },
	vest: { color: '#6366f1', i18nKey: 'vest' },
	joi: { color: '#84cc16', i18nKey: 'joi' },
};

// ─────────────────────────────────────────────────────────────
// TABLA DE CARACTERÍSTICAS
// Labels en i18n/en.ts y i18n/es.ts bajo benchmark.features
// ─────────────────────────────────────────────────────────────

export const featureRows: IFeatureRow[] = [
	{
		i18nKey: 'autoCoercion',
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
			valibot: 'valibot',
			Zod: 'zod',
			'class-transformer': 'classTransformer',
		},
	},
	{
		i18nKey: 'nativeSerialization',
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
		notes: { 'class-transformer': 'classTransformer' },
	},
	{
		i18nKey: 'typedMocks',
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
		i18nKey: 'aiMcp',
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
		i18nKey: 'polymorphicJson',
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
			'class-transformer': 'classTransformer',
			superjson: 'superjson',
		},
	},
	{
		i18nKey: 'copyIsDirty',
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
		i18nKey: 'formSchemas',
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
		notes: { vest: 'vest' },
	},
	{
		i18nKey: 'computedFields',
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
		i18nKey: 'asyncRules',
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
			Zod: 'zod',
			yup: 'yup',
			'class-validator': 'classValidator',
			vest: 'vest',
			joi: 'joi',
		},
	},
	{
		i18nKey: 'runtimeIntegrity',
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
			valibot: 'valibot',
			yup: 'yup',
			'class-validator': 'classValidator',
			vest: 'vest',
			joi: 'joi',
		},
	},
	{
		i18nKey: 'inheritance',
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
		i18nKey: 'schemaExport',
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
		i18nKey: 'tsInference',
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
		i18nKey: 'treeShakeable',
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
		notes: { TypeBox: 'typebox' },
	},
	{
		i18nKey: 'decoratorConstraints',
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
		i18nKey: 'preservesTypes',
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
		i18nKey: 'validationGroups',
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
		notes: { 'class-validator': 'classValidator' },
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
// Labels en i18n/en.ts y i18n/es.ts bajo benchmark.matrixTypes
// ─────────────────────────────────────────────────────────────

export const matrixTypeOptions = [
	{ key: 'all' },
	{ key: 'validation' },
	{ key: 'serialization' },
	{ key: 'forms' },
	{ key: 'mocks' },
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
	{ key: 'all' },
	{ key: 'validation' },
	{ key: 'serialization' },
	{ key: 'forms' },
	{ key: 'model' },
	{ key: 'exclusive' },
];

// ─────────────────────────────────────────────────────────────
// OPCIONES DE FILTRO POR TIPO DE APP
// Labels en i18n/en.ts y i18n/es.ts bajo benchmark.appTypes
// ─────────────────────────────────────────────────────────────

export const appTypeOptions = [
	{ key: 'all' },
	{ key: 'api' },
	{ key: 'ddd' },
	{ key: 'testing' },
	{ key: 'mock' },
	{ key: 'data' },
];
