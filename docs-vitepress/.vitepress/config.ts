import { defineConfig } from 'vitepress';
import path from 'node:path';
import { getTranslations, type ILocale } from './i18n';

/**
 * Build the MCP sidebar section for a given locale.
 * Two groups: "Using QuickModel" (always visible) and "Developing QuickModel" (internal only).
 * Single source of truth — add items here and all locale sidebars update automatically.
 */
const buildMcpSidebar = (locale: ILocale) => {
	const { mcp: trl } = getTranslations(locale);
	const prefix = `/${locale}/mcp`;
	const showInternal = process.env.VITE_SHOW_INTERNAL_DOCS === 'true';
	return [
		{
			text: trl.sectionUsing,
			collapsed: false,
			items: [
				{ text: trl.overview, link: `${prefix}/` },
				{ text: trl.installation, link: `${prefix}/installation` },
				{ text: trl.publicTools, link: `${prefix}/tools` },
				{ text: trl.publicSkills, link: `${prefix}/skills` },
			],
		},
		...(showInternal
			? [
					{
						text: trl.sectionDeveloping,
						collapsed: false,
						items: [
							{
								text: trl.installationMaintainers,
								link: `${prefix}/contributing/setup`,
							},
							{
								text: trl.internalToolsMaintainers,
								link: `${prefix}/contributing/tools`,
							},
							{
								text: trl.internalSkillsMaintainers,
								link: `${prefix}/contributing/skills`,
							},
						],
					},
				]
			: []),
	];
};

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'QuickModel',
	description: 'Type-safe serialization library for TypeScript models',
	base: '/quickmodel/',
	outDir: '../docs-vitepress/dist',
	ignoreDeadLinks: true,
	srcExclude: ['**/TASKS.md'],
	vite: {
		resolve: {
			alias: {
				'@benchmarks': path.resolve(
					__dirname,
					'../../tests/performance/benchmarks'
				),
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					api: 'modern',
				},
			},
		},
		server: {
			fs: {
				allow: ['..'],
			},
		},
	},
	head: [
		[
			'link',
			{
				rel: 'icon',
				type: 'image/png',
				href: '/quickmodel/quickmodel.png',
			},
		],
	],

	// Global theme config (shared across all locales)
	themeConfig: {
		logo: {
			src: '/quickmodel.png',
			height: 32,
		},
		outline: {
			level: [2, 3],
			label: 'On this page',
		},
		nav: [
			{ text: 'Guide', link: '/en/guide/getting-started' },
			{ text: 'AI (MCP/Skills)', link: '/en/mcp/' },
			{ text: 'API', link: '/tsdoc/' },
			{ text: 'Examples', link: '/en/examples/' },
			{ text: 'Integrations', link: '/en/integrations/' },
		],
		socialLinks: [
			{
				icon: 'github',
				link: 'https://github.com/CartagoGit/quickmodel',
			},
			{
				icon: 'linkedin',
				link: 'https://www.linkedin.com/in/mario-cabrero-volarich/',
			},
			{ icon: 'docker', link: 'https://hub.docker.com/u/cartagodocker' },
			{ icon: 'npm', link: 'https://www.npmjs.com/~cartago-git' },
		],
		sidebar: {
			'/tsdoc/': [
				{
					text: 'API Reference',
					link: '/tsdoc/',
					items: [{ text: 'Overview', link: '/tsdoc/' }],
				},
				{
					text: 'Core',
					collapsed: false,
					items: [
						{ text: 'QModel', link: '/tsdoc/classes/QModel' },
						{ text: '@Quick', link: '/tsdoc/functions/Quick' },
						{ text: 'QConfig', link: '/tsdoc/variables/QConfig' },
						{
							text: 'IQImplements',
							link: '/tsdoc/type-aliases/IQImplements',
						},
					],
				},
				{
					text: 'Decorators',
					collapsed: false,
					items: [
						{ text: '@QType', link: '/tsdoc/functions/QType' },
						{ text: '@QRule', link: '/tsdoc/functions/QRule' },
						{ text: '@QField', link: '/tsdoc/functions/QField' },
						{ text: '@QAlias', link: '/tsdoc/functions/QAlias' },
						{ text: '@QGroup', link: '/tsdoc/functions/QGroup' },
						{
							text: '@QComputed',
							link: '/tsdoc/functions/QComputed',
						},
					],
				},
				{
					text: 'Forms & Validation',
					collapsed: false,
					items: [
						{
							text: 'qCheckRules',
							link: '/tsdoc/functions/qCheckRules',
						},
						{
							text: 'qCheckRulesAsync',
							link: '/tsdoc/functions/qCheckRulesAsync',
						},
						{
							text: 'qCheckRulesByGroup',
							link: '/tsdoc/functions/qCheckRulesByGroup',
						},
						{
							text: 'qCheckRulesByGroupAsync',
							link: '/tsdoc/functions/qCheckRulesByGroupAsync',
						},
						{
							text: 'qGetGroups',
							link: '/tsdoc/functions/qGetGroups',
						},
						{ text: 'qGroups', link: '/tsdoc/functions/qGroups' },
					],
				},
				{
					text: 'Schema Generators',
					collapsed: true,
					items: [
						{
							text: 'All Generators',
							link: '/tsdoc/classes/SchemaGenerators',
						},
					],
				},
				{
					text: 'Mocking',
					collapsed: true,
					items: [
						{
							text: 'QMockGenerator',
							link: '/tsdoc/classes/QMockGenerator',
						},
						{
							text: 'QMockBuilder',
							link: '/tsdoc/classes/QMockBuilder',
						},
					],
				},
				{
					text: 'Advanced',
					collapsed: true,
					items: [
						{
							text: 'QBaseTransformer',
							link: '/tsdoc/classes/QBaseTransformer',
						},
						{
							text: 'QTransformerRegistry',
							link: '/tsdoc/classes/QTransformerRegistry',
						},
						{
							text: 'QSerializer',
							link: '/tsdoc/classes/QSerializer',
						},
						{
							text: 'QDeserializer',
							link: '/tsdoc/classes/QDeserializer',
						},
					],
				},
				{
					text: 'Utilities',
					collapsed: true,
					items: [
						{
							text: 'QModelError',
							link: '/tsdoc/classes/QModelError',
						},
						{ text: 'QLogger', link: '/tsdoc/variables/QLogger' },
					],
				},
				{
					text: 'Testing',
					collapsed: true,
					items: [
						{
							text: 'quickmodelMatchers',
							link: '/tsdoc/functions/quickmodelMatchers',
						},
					],
				},
				{
					text: 'Interfaces',
					collapsed: true,
					items: [
						{
							text: 'IQAdvancedOptions',
							link: '/tsdoc/interfaces/IQAdvancedOptions',
						},
						{
							text: 'IQCreateManyOptions',
							link: '/tsdoc/interfaces/IQCreateManyOptions',
						},
						{
							text: 'IQCreateManyError',
							link: '/tsdoc/interfaces/IQCreateManyError',
						},
						{
							text: 'IQCreateManyResult',
							link: '/tsdoc/interfaces/IQCreateManyResult',
						},
						{
							text: 'IQFormSchemaEntry',
							link: '/tsdoc/interfaces/IQFormSchemaEntry',
						},
						{
							text: 'IQFormSchemaGroup',
							link: '/tsdoc/interfaces/IQFormSchemaGroup',
						},
						{
							text: 'IQValidationReport',
							link: '/tsdoc/interfaces/IQValidationReport',
						},
					],
				},
				{
					text: 'Types',
					collapsed: true,
					items: [
						{
							text: 'IQImplements',
							link: '/tsdoc/type-aliases/IQImplements',
						},
						{
							text: 'IQAliasedSerializedInterface',
							link: '/tsdoc/type-aliases/IQAliasedSerializedInterface',
						},
					],
				},
			],
		},
		search: {
			provider: 'local',
		},
	},

	locales: {
		en: {
			label: 'English',
			lang: 'en',
			themeConfig: {
				outline: {
					level: [2, 3],
					label: 'On this page',
				},
				nav: [
					{ text: 'Guide', link: '/en/guide/getting-started' },
					{ text: 'AI (MCP/Skills)', link: '/en/mcp/' },
					{ text: 'API', link: '/tsdoc/' },
					{ text: 'Examples', link: '/en/examples/' },
					{ text: 'Integrations', link: '/en/integrations/' },
				],
				sidebar: {
					'/en/guide/': [
						{
							text: 'Introduction',
							link: '/en/guide/getting-started',
							items: [
								{
									text: 'Getting Started',
									link: '/en/guide/getting-started',
								},
								{
									text: 'Installation',
									link: '/en/guide/installation',
								},
								{
									text: 'Quick Start',
									link: '/en/guide/quick-start',
								},
							],
						},
						{
							text: 'Core',
							link: '/en/guide/qmodel',
							items: [
								{ text: 'QModel', link: '/en/guide/qmodel' },
								{
									text: 'IQImplements Helper',
									link: '/en/guide/iq-implements',
								},
								{
									text: '@Quick Decorator',
									link: '/en/guide/quick-decorator',
								},
								{
									text: '@QType Decorator',
									link: '/en/guide/qtype-decorator',
								},
								{
									text: 'TC39 Decorators',
									link: '/en/guide/tc39-decorators',
								},
								{
									text: 'Transformers',
									link: '/en/guide/transformers',
								},
								{
									text: 'Serialization',
									link: '/en/guide/serialization',
								},
								{
									text: 'Aliases Reference',
									link: '/en/guide/aliases',
								},
								{
									text: 'Key Aliases (@QAlias)',
									link: '/en/guide/qalias',
								},
							],
						},
						{
							text: 'Field Decorators',
							link: '/en/guide/qdefault',
							items: [
								{
									text: 'Default Values (@QDefault)',
									link: '/en/guide/qdefault',
								},
								{
									text: 'Readonly Fields (@QReadonly)',
									link: '/en/guide/qreadonly',
								},
								{
									text: 'Transform Fields (@QTransform)',
									link: '/en/guide/qtransform',
								},
								{
									text: 'Sensitive Fields (@QSensitive)',
									link: '/en/guide/sensitive-fields',
								},
							],
						},
						{
							text: 'Advanced',
							link: '/en/guide/collection',
							items: [
								{
									text: 'Collections (QModelCollection)',
									link: '/en/guide/collection',
								},
								{
									text: 'Schema Migrations (@QVersion)',
									link: '/en/guide/migrations',
								},
								{
									text: 'Per-Class Configuration',
									link: '/en/guide/per-class-config',
								},
							],
						},
						{
							text: 'Validation',
							link: '/en/guide/validation',
							items: [
								{
									text: 'Validation (@QRule)',
									link: '/en/guide/validation',
								},
								{
									text: 'Built-in Validators',
									link: '/en/guide/validators',
								},
								{
									text: 'Internationalization (i18n)',
									link: '/en/guide/i18n',
								},
								{
									text: '⚡ Benchmarks',
									link: '/en/guide/validation#performance',
								},
							],
						},
						{
							text: 'Forms',
							link: '/en/guide/forms',
							items: [
								{
									text: 'Form Validation (/forms)',
									link: '/en/guide/forms',
								},
								{
									text: 'Form Schema (@QField)',
									link: '/en/guide/qfield',
								},
								{
									text: 'FormData & Streaming',
									link: '/en/guide/formdata',
								},
								{
									text: 'URL Search Params (fromURL)',
									link: '/en/guide/fromurl',
								},
								{
									text: 'WebSocket & SSE',
									link: '/en/guide/websocket-sse',
								},
								{
									text: '⚡ Benchmarks',
									link: '/en/guide/forms#performance',
								},
							],
						},
						{
							text: 'Mocks',
							link: '/en/guide/mocks',
							items: [
								{
									text: 'Mock Generation',
									link: '/en/guide/mocks',
								},
								{
									text: '⚡ Benchmarks',
									link: '/en/guide/mocks#performance',
								},
							],
						},
						{
							text: 'Tracing & Observability',
							link: '/en/guide/tracing',
							items: [
								{
									text: 'Tracing & Observability',
									link: '/en/guide/tracing',
								},
								{
									text: 'External Logger (Winston, Pino…)',
									link: '/en/guide/tracing#integrating-an-external-logger',
								},
							],
						},
						{
							text: 'Customization',
							link: '/en/guide/custom-transformers',
							items: [
								{
									text: 'Custom Transformers',
									link: '/en/guide/custom-transformers',
								},
								{
									text: 'Nested Models',
									link: '/en/guide/nested-models',
								},
								{
									text: 'Dot Notation',
									link: '/en/guide/dot-notation',
								},
								{
									text: 'Unknown Property Policy',
									link: '/en/guide/unknown-property-policy',
								},
								{
									text: '⚡ Benchmarks',
									link: '/en/guide/nested-models#performance',
								},
							],
						},
						{
							text: 'Performance',
							link: '/en/guide/bundle-size',
							items: [
								{
									text: 'Bundle Size & Tree-shaking',
									link: '/en/guide/bundle-size',
								},
							],
						},
						{
							text: 'Reference',
							link: '/en/guide/troubleshooting',
							items: [
								{
									text: 'Troubleshooting',
									link: '/en/guide/troubleshooting',
								},
								{
									text: 'Contribution Guide',
									link: '/en/guide/contributing',
								},
							],
						},
						{
							text: 'Design Notes',
							link: '/en/guide/naming-conventions',
							items: [
								{
									text: 'Naming Conventions (IQ, Q, $q)',
									link: '/en/guide/naming-conventions',
								},
								{
									text: 'Reserved Words',
									link: '/en/guide/reserved-words',
								},
							],
						},
					],
					'/en/mcp/': buildMcpSidebar('en'),
					'/en/integrations/': [
						{
							text: 'Frontend Frameworks',
							items: [
								{
									text: 'Angular',
									link: '/en/integrations/angular-integration',
								},
								{
									text: 'Astro',
									link: '/en/integrations/astro-integration',
								},
								{
									text: 'React / Next.js',
									link: '/en/integrations/react-integration',
								},
								{
									text: 'Solid.js',
									link: '/en/integrations/solid-integration',
								},
								{
									text: 'Svelte 5 / SvelteKit',
									link: '/en/integrations/svelte-integration',
								},
								{
									text: 'Vue 3 / Nuxt',
									link: '/en/integrations/vue-integration',
								},
							],
						},
						{
							text: 'Backend',
							items: [
								{
									text: 'Express / Fastify / Hono',
									link: '/en/integrations/backend-integration',
								},
								{
									text: 'Hono (standalone)',
									link: '/en/integrations/hono-integration',
								},
								{
									text: 'Bun.js',
									link: '/en/integrations/bun-integration',
								},
								{
									text: 'NestJS',
									link: '/en/integrations/nestjs-integration',
								},
								{
									text: 'tRPC',
									link: '/en/integrations/trpc-integration',
								},
								{
									text: 'GraphQL / Apollo Server',
									link: '/en/integrations/graphql-integration',
								},
								{
									text: 'OpenAPI / Swagger',
									link: '/en/integrations/openapi-integration',
								},
								{
									text: 'Remix',
									link: '/en/integrations/remix-integration',
								},
							],
						},
						{
							text: 'ORM & Databases',
							items: [
								{
									text: 'Prisma ORM',
									link: '/en/integrations/prisma-integration',
								},
								{
									text: 'TypeORM',
									link: '/en/integrations/typeorm-integration',
								},
								{
									text: 'Mongoose',
									link: '/en/integrations/mongoose-integration',
								},
								{
									text: 'Drizzle ORM',
									link: '/en/integrations/drizzle-integration',
								},
								{
									text: 'Kysely',
									link: '/en/integrations/kysely-integration',
								},
							],
						},
						{
							text: 'State Management & Forms',
							items: [
								{
									text: 'MobX',
									link: '/en/integrations/mobx-integration',
								},
								{
									text: 'Redux Toolkit (RTK)',
									link: '/en/integrations/redux-toolkit-integration',
								},
								{
									text: 'Zustand',
									link: '/en/integrations/zustand-integration',
								},
								{
									text: 'Jotai',
									link: '/en/integrations/jotai-integration',
								},
								{
									text: 'Valtio',
									link: '/en/integrations/valtio-integration',
								},
								{
									text: 'XState',
									link: '/en/integrations/xstate-integration',
								},
								{
									text: 'React Hook Form',
									link: '/en/integrations/react-hook-form-integration',
								},
								{
									text: 'Formik',
									link: '/en/integrations/formik-integration',
								},
							],
						},
						{
							text: 'Data Fetching',
							items: [
								{
									text: 'SWR',
									link: '/en/integrations/swr-integration',
								},
								{
									text: 'TanStack Query',
									link: '/en/integrations/tanstack-query-integration',
								},
								{
									text: 'TanStack Table',
									link: '/en/integrations/tanstack-table-integration',
								},
							],
						},
						{
							text: 'Testing & Tooling',
							items: [
								{
									text: 'MSW (Mock Service Worker)',
									link: '/en/integrations/msw-integration',
								},
								{
									text: 'Vitest Custom Matchers',
									link: '/en/integrations/vitest-matchers',
								},
								{
									text: 'Jest / Jasmine',
									link: '/en/integrations/jest-integration',
								},
								{
									text: 'Mocha / Chai / AVA / Node:test',
									link: '/en/integrations/test-runners-integration',
								},
							],
						},
						{
							text: 'Schema Formats',
							items: [
								{
									text: 'JSON Schema',
									link: '/en/integrations/json-schema-integration',
								},
								{
									text: 'TypeScript Interface',
									link: '/en/integrations/typescript-schema-integration',
								},
							],
						},
						{
							text: 'Validation Libraries',
							items: [
								{
									text: 'Zod',
									link: '/en/integrations/zod-integration',
								},
								{
									text: 'Valibot',
									link: '/en/integrations/valibot-integration',
								},
								{
									text: 'Yup',
									link: '/en/integrations/yup-integration',
								},
								{
									text: 'AJV',
									link: '/en/integrations/ajv-integration',
								},
								{
									text: 'TypeBox',
									link: '/en/integrations/typebox-integration',
								},
								{
									text: 'Effect Schema',
									link: '/en/integrations/effect-schema-integration',
								},
							],
						},
						{
							text: 'Other',
							items: [
								{
									text: 'Mobile (React Native / Capacitor)',
									link: '/en/integrations/mobile-integration',
								},
								{
									text: 'Socket.io',
									link: '/en/integrations/socket-io-integration',
								},
								{
									text: 'Storage & Persistence',
									link: '/en/integrations/storage-integration',
								},
								{
									text: 'Electron IPC',
									link: '/en/integrations/electron-integration',
								},
								{
									text: 'WebSocket & Real-Time Sockets',
									link: '/en/integrations/websocket-integration',
								},
							],
						},
					],
					'/en/examples/': [
						{
							text: 'Examples',
							items: [
								{
									text: 'Basic Usage',
									link: '/en/examples/basic',
								},
								{
									text: 'API Models',
									link: '/en/examples/api-models',
								},
								{
									text: 'Complex Types',
									link: '/en/examples/complex-types',
								},
								{
									text: 'Alias Mapping',
									link: '/en/examples/alias-mapping',
								},
								{
									text: 'Batch Creation & Immutability',
									link: '/en/examples/batch-readonly',
								},
								{
									text: 'Computed Fields',
									link: '/en/examples/computed',
								},
								{
									text: 'Forms',
									link: '/en/examples/forms',
								},
								{
									text: 'Mocks & Testing',
									link: '/en/examples/mocks',
								},
								{
									text: 'Validation',
									link: '/en/examples/validation',
								},
							],
						},
					],
				},
				footer: {
					message:
						'Released under the <a href="https://github.com/CartagoGit/quickmodel/blob/main/LICENSE" target="_blank" rel="noopener">QuickModel Custom License</a>. If this project helps you, consider <a href="https://paypal.me/cartagonova" target="_blank" rel="noopener">☕ buying me a coffee</a>!',
					copyright:
						'Copyright © 2026 <a href="https://www.linkedin.com/in/mario-cabrero-volarich/" target="_blank" rel="noopener">Mario Cabrero Volarich</a>',
				},
			},
		},
		es: {
			label: 'Español',
			lang: 'es',
			themeConfig: {
				outline: {
					level: [2, 3],
					label: 'En esta página',
				},
				nav: [
					{ text: 'Guía', link: '/es/guide/getting-started' },
					{ text: 'IA (MCP/Skills)', link: '/es/mcp/' },
					{ text: 'API', link: '/tsdoc/' },
					{ text: 'Ejemplos', link: '/es/examples/' },
					{ text: 'Integraciones', link: '/es/integrations/' },
				],
				sidebar: {
					'/es/guide/': [
						{
							text: 'Introducción',
							link: '/es/guide/getting-started',
							items: [
								{
									text: 'Comenzando',
									link: '/es/guide/getting-started',
								},
								{
									text: 'Instalación',
									link: '/es/guide/installation',
								},
								{
									text: 'Inicio Rápido',
									link: '/es/guide/quick-start',
								},
							],
						},
						{
							text: 'Núcleo',
							link: '/es/guide/qmodel',
							items: [
								{ text: 'QModel', link: '/es/guide/qmodel' },
								{
									text: 'Ayuda de IQImplements',
									link: '/es/guide/iq-implements',
								},
								{
									text: 'Decorador @Quick',
									link: '/es/guide/quick-decorator',
								},
								{
									text: 'Decorador @QType',
									link: '/es/guide/qtype-decorator',
								},
								{
									text: 'Decoradores TC39',
									link: '/es/guide/tc39-decorators',
								},
								{
									text: 'Transformadores',
									link: '/es/guide/transformers',
								},
								{
									text: 'Serialización',
									link: '/es/guide/serialization',
								},
								{
									text: 'Referencia de Alias',
									link: '/es/guide/aliases',
								},
								{
									text: 'Alias de Claves (@QAlias)',
									link: '/es/guide/qalias',
								},
							],
						},
						{
							text: 'Decoradores de Campo',
							link: '/es/guide/qdefault',
							items: [
								{
									text: 'Valores por Defecto (@QDefault)',
									link: '/es/guide/qdefault',
								},
								{
									text: 'Campos de Solo Lectura (@QReadonly)',
									link: '/es/guide/qreadonly',
								},
								{
									text: 'Transformar Campos (@QTransform)',
									link: '/es/guide/qtransform',
								},
								{
									text: 'Campos Sensibles (@QSensitive)',
									link: '/es/guide/sensitive-fields',
								},
							],
						},
						{
							text: 'Avanzado',
							link: '/es/guide/collection',
							items: [
								{
									text: 'Colecciones (QModelCollection)',
									link: '/es/guide/collection',
								},
								{
									text: 'Migraciones de Esquema (@QVersion)',
									link: '/es/guide/migrations',
								},
								{
									text: 'Configuración por Clase',
									link: '/es/guide/per-class-config',
								},
							],
						},
						{
							text: 'Validación',
							link: '/es/guide/validation',
							items: [
								{
									text: 'Validación (@QRule)',
									link: '/es/guide/validation',
								},
								{
									text: 'Validadores Integrados',
									link: '/es/guide/validators',
								},
								{
									text: 'Internacionalización (i18n)',
									link: '/es/guide/i18n',
								},
								{
									text: '⚡ Benchmarks',
									link: '/es/guide/validation#rendimiento',
								},
							],
						},
						{
							text: 'Formularios',
							link: '/es/guide/forms',
							items: [
								{
									text: 'Validación de Formularios (/forms)',
									link: '/es/guide/forms',
								},
								{
									text: 'Esquema de Formulario (@QField)',
									link: '/es/guide/qfield',
								},
								{
									text: 'FormData y Streaming',
									link: '/es/guide/formdata',
								},
								{
									text: 'Parámetros URL (fromURL)',
									link: '/es/guide/fromurl',
								},
								{
									text: 'WebSocket y SSE',
									link: '/es/guide/websocket-sse',
								},
								{
									text: '⚡ Benchmarks',
									link: '/es/guide/forms#rendimiento',
								},
							],
						},
						{
							text: 'Mocks',
							link: '/es/guide/mocks',
							items: [
								{
									text: 'Generación de Mocks',
									link: '/es/guide/mocks',
								},
								{
									text: '⚡ Benchmarks',
									link: '/es/guide/mocks#rendimiento',
								},
							],
						},
						{
							text: 'Trazas y Observabilidad',
							link: '/es/guide/tracing',
							items: [
								{
									text: 'Trazas y Observabilidad',
									link: '/es/guide/tracing',
								},
								{
									text: 'Logger Externo (Winston, Pino…)',
									link: '/es/guide/tracing#integrar-un-logger-externo',
								},
							],
						},
						{
							text: 'Personalización',
							link: '/es/guide/custom-transformers',
							items: [
								{
									text: 'Transformadores Personalizados',
									link: '/es/guide/custom-transformers',
								},
								{
									text: 'Modelos Anidados',
									link: '/es/guide/nested-models',
								},
								{
									text: 'Notación por Puntos',
									link: '/es/guide/dot-notation',
								},
								{
									text: 'Política de Propiedades Desconocidas',
									link: '/es/guide/unknown-property-policy',
								},
								{
									text: '⚡ Benchmarks',
									link: '/es/guide/nested-models#rendimiento',
								},
							],
						},
						{
							text: 'Rendimiento',
							link: '/es/guide/bundle-size',
							items: [
								{
									text: 'Tamaño de Bundle y Tree-shaking',
									link: '/es/guide/bundle-size',
								},
							],
						},
						{
							text: 'Referencia',
							link: '/es/guide/troubleshooting',
							items: [
								{
									text: 'Solución de Problemas',
									link: '/es/guide/troubleshooting',
								},
								{
									text: 'Guía de Contribución',
									link: '/es/guide/contributing',
								},
							],
						},
						{
							text: 'Información Adicional',
							link: '/es/guide/naming-conventions',
							items: [
								{
									text: 'Convenciones de Nombrado (IQ, Q, $q)',
									link: '/es/guide/naming-conventions',
								},
								{
									text: 'Palabras Reservadas',
									link: '/es/guide/reserved-words',
								},
							],
						},
					],
					'/es/mcp/': buildMcpSidebar('es'),
					'/es/integrations/': [
						{
							text: 'Frameworks Frontend',
							items: [
								{
									text: 'Angular',
									link: '/es/integrations/angular-integration',
								},
								{
									text: 'Astro',
									link: '/es/integrations/astro-integration',
								},
								{
									text: 'React / Next.js',
									link: '/es/integrations/react-integration',
								},
								{
									text: 'Solid.js',
									link: '/es/integrations/solid-integration',
								},
								{
									text: 'Svelte 5 / SvelteKit',
									link: '/es/integrations/svelte-integration',
								},
								{
									text: 'Vue 3 / Nuxt',
									link: '/es/integrations/vue-integration',
								},
							],
						},
						{
							text: 'Backend',
							items: [
								{
									text: 'Express / Fastify / Hono',
									link: '/es/integrations/backend-integration',
								},
								{
									text: 'Hono (standalone)',
									link: '/es/integrations/hono-integration',
								},
								{
									text: 'Bun.js',
									link: '/es/integrations/bun-integration',
								},
								{
									text: 'NestJS',
									link: '/es/integrations/nestjs-integration',
								},
								{
									text: 'tRPC',
									link: '/es/integrations/trpc-integration',
								},
								{
									text: 'GraphQL / Apollo Server',
									link: '/es/integrations/graphql-integration',
								},
								{
									text: 'OpenAPI / Swagger',
									link: '/es/integrations/openapi-integration',
								},
								{
									text: 'Remix',
									link: '/es/integrations/remix-integration',
								},
							],
						},
						{
							text: 'ORM y Bases de Datos',
							items: [
								{
									text: 'Prisma ORM',
									link: '/es/integrations/prisma-integration',
								},
								{
									text: 'TypeORM',
									link: '/es/integrations/typeorm-integration',
								},
								{
									text: 'Mongoose',
									link: '/es/integrations/mongoose-integration',
								},
								{
									text: 'Drizzle ORM',
									link: '/es/integrations/drizzle-integration',
								},
								{
									text: 'Kysely',
									link: '/es/integrations/kysely-integration',
								},
							],
						},
						{
							text: 'Estado y Formularios',
							items: [
								{
									text: 'MobX',
									link: '/es/integrations/mobx-integration',
								},
								{
									text: 'Redux Toolkit (RTK)',
									link: '/es/integrations/redux-toolkit-integration',
								},
								{
									text: 'Zustand',
									link: '/es/integrations/zustand-integration',
								},
								{
									text: 'Jotai',
									link: '/es/integrations/jotai-integration',
								},
								{
									text: 'Valtio',
									link: '/es/integrations/valtio-integration',
								},
								{
									text: 'XState',
									link: '/es/integrations/xstate-integration',
								},
								{
									text: 'React Hook Form',
									link: '/es/integrations/react-hook-form-integration',
								},
								{
									text: 'Formik',
									link: '/es/integrations/formik-integration',
								},
							],
						},
						{
							text: 'Obtención de Datos',
							items: [
								{
									text: 'SWR',
									link: '/es/integrations/swr-integration',
								},
								{
									text: 'TanStack Query',
									link: '/es/integrations/tanstack-query-integration',
								},
								{
									text: 'TanStack Table',
									link: '/es/integrations/tanstack-table-integration',
								},
							],
						},
						{
							text: 'Testing y Herramientas',
							items: [
								{
									text: 'MSW (Mock Service Worker)',
									link: '/es/integrations/msw-integration',
								},
								{
									text: 'Matchers Personalizados para Vitest',
									link: '/es/integrations/vitest-matchers',
								},
								{
									text: 'Jest / Jasmine',
									link: '/es/integrations/jest-integration',
								},
								{
									text: 'Mocha / Chai / AVA / Node:test',
									link: '/es/integrations/test-runners-integration',
								},
							],
						},
						{
							text: 'Formatos de Schema',
							items: [
								{
									text: 'JSON Schema',
									link: '/es/integrations/json-schema-integration',
								},
								{
									text: 'Interfaz TypeScript',
									link: '/es/integrations/typescript-schema-integration',
								},
							],
						},
						{
							text: 'Librerías de Validación',
							items: [
								{
									text: 'Zod',
									link: '/es/integrations/zod-integration',
								},
								{
									text: 'Valibot',
									link: '/es/integrations/valibot-integration',
								},
								{
									text: 'Yup',
									link: '/es/integrations/yup-integration',
								},
								{
									text: 'AJV',
									link: '/es/integrations/ajv-integration',
								},
								{
									text: 'TypeBox',
									link: '/es/integrations/typebox-integration',
								},
								{
									text: 'Effect Schema',
									link: '/es/integrations/effect-schema-integration',
								},
							],
						},
						{
							text: 'Otras Integraciones',
							items: [
								{
									text: 'Mobile (React Native / Capacitor)',
									link: '/es/integrations/mobile-integration',
								},
								{
									text: 'Socket.io',
									link: '/es/integrations/socket-io-integration',
								},
								{
									text: 'Storage & Persistence',
									link: '/es/integrations/storage-integration',
								},
								{
									text: 'Electron IPC',
									link: '/es/integrations/electron-integration',
								},
								{
									text: 'WebSocket y Sockets en Tiempo Real',
									link: '/es/integrations/websocket-integration',
								},
							],
						},
					],
					'/es/examples/': [
						{
							text: 'Ejemplos',
							items: [
								{
									text: 'Uso Básico',
									link: '/es/examples/basic',
								},
								{
									text: 'Modelos de API',
									link: '/es/examples/api-models',
								},
								{
									text: 'Tipos Complejos',
									link: '/es/examples/complex-types',
								},
								{
									text: 'Alias y Mapeo',
									link: '/es/examples/alias-mapping',
								},
								{
									text: 'Creación en Lote e Inmutabilidad',
									link: '/es/examples/batch-readonly',
								},
								{
									text: 'Campos Computados',
									link: '/es/examples/computed',
								},
								{
									text: 'Formularios',
									link: '/es/examples/forms',
								},
								{
									text: 'Mocks y Testing',
									link: '/es/examples/mocks',
								},
								{
									text: 'Validación',
									link: '/es/examples/validation',
								},
							],
						},
					],
				},
				footer: {
					message:
						'Publicado bajo la <a href="https://github.com/CartagoGit/quickmodel/blob/main/LICENSE" target="_blank" rel="noopener">Licencia Personalizada QuickModel</a>. Si este proyecto te es útil, considera <a href="https://paypal.me/cartagonova" target="_blank" rel="noopener">☕ invitarme a un café</a>.',
					copyright:
						'Copyright © 2026 <a href="https://www.linkedin.com/in/mario-cabrero-volarich/" target="_blank" rel="noopener">Mario Cabrero Volarich</a>',
				},
			},
		},
	},
});
