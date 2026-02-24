import { defineConfig } from 'vitepress';
import path from 'node:path';
import { getTranslations, type ILocale } from './i18n';

/**
 * Build the MCP sidebar section for a given locale.
 * Single source of truth — add items here and all locale sidebars update automatically.
 */
const buildMcpSidebar = (locale: ILocale) => {
	const { mcp: trl } = getTranslations(locale);
	const prefix = `/${locale}/mcp`;
	const showInternal = process.env.VITE_SHOW_INTERNAL_DOCS === 'true';
	return [
		{
			text: trl.title,
			items: [
				{ text: trl.overview, link: `${prefix}/` },
				{ text: trl.publicTools, link: `${prefix}/public/` },
				{ text: trl.publicSkills, link: `${prefix}/public/skills` },
				...(showInternal
					? [
							{
								text: trl.installationMaintainers,
								link: `${prefix}/internal/setup`,
							},
							{
								text: trl.internalToolsMaintainers,
								link: `${prefix}/internal/`,
							},
							{
								text: trl.internalSkillsMaintainers,
								link: `${prefix}/internal/skills`,
							},
						]
					: []),
			],
		},
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
			'/tsdoc/@cartago-git/namespaces/Types/': [
				{
					text: 'Navigation',
					items: [
						{ text: 'Back to Core', link: '/tsdoc/' },
						{
							text: 'Advanced',
							link: '/tsdoc/@cartago-git/namespaces/Advanced/',
						},
						{
							text: 'Utils',
							link: '/tsdoc/@cartago-git/namespaces/Utils/',
						},
						{
							text: 'Forms',
							link: '/tsdoc/@cartago-git/namespaces/Forms/',
						},
						{
							text: 'Compat (TS5)',
							link: '/tsdoc/@cartago-git/namespaces/Compat/',
						},
					],
				},
				{
					text: 'Types Namespace',
					items: [
						{
							text: 'Overview',
							link: '/tsdoc/@cartago-git/namespaces/Types/',
						},
						{
							text: 'Interfaces',
							collapsed: false,
							items: [
								{
									text: 'IQAdvancedOptions',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQAdvancedOptions',
								},
								{
									text: 'IQAnyRecord',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQAnyRecord',
								},
								{
									text: 'IQOptions',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQOptions',
								},
								{
									text: 'IQPropertyOptions',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQPropertyOptions',
								},
								{
									text: 'IQSerializationOptions',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQSerializationOptions',
								},
								{
									text: 'IQTypeOptions',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQTypeOptions',
								},
								{
									text: 'IQTransformer',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQTransformer',
								},
								{
									text: 'IQValidationResult',
									link: '/tsdoc/@cartago-git/namespaces/Types/interfaces/IQValidationResult',
								},
							],
						},
						{
							text: 'Types',
							collapsed: true,
							items: [
								{
									text: 'IQAlias',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQAlias',
								},
								{
									text: 'IQConstructor',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQConstructor',
								},
								{
									text: 'IQDiscriminatorConfig',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQDiscriminatorConfig',
								},
								{
									text: 'IQExtractCommonKeys',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQExtractCommonKeys',
								},
								{
									text: 'IQExtractConstructors',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQExtractConstructors',
								},
								{
									text: 'IQExtractIQModelInterface',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQExtractIQModelInterface',
								},
								{
									text: 'IQExtractInstanceType',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQExtractInstanceType',
								},
								{
									text: 'IQExtractValidDiscriminatorKeys',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQExtractValidDiscriminatorKeys',
								},
								{
									text: 'IQMockType',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQMockType',
								},
								{
									text: 'IQMockerFn',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQMockerFn',
								},
								{
									text: 'IQModelData',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQModelData',
								},
								{
									text: 'IQModelInstance',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQModelInstance',
								},
								{
									text: 'IQModelInterface',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQModelInterface',
								},
								{
									text: 'IQNativeConstructor',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQNativeConstructor',
								},
								{
									text: 'IQSerialized',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQSerialized',
								},
								{
									text: 'IQSerializedInterface',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQSerializedInterface',
								},
								{
									text: 'IQSerializerFn',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQSerializerFn',
								},
								{
									text: 'IQSpec',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQSpec',
								},
								{
									text: 'IQSpecs',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQSpecs',
								},
								{
									text: 'IQTransform',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQTransform',
								},
								{
									text: 'IQTransformerFn',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQTransformerFn',
								},
								{
									text: 'IQTransformerFunction',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQTransformerFunction',
								},
								{
									text: 'IQTransformerKey',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQTransformerKey',
								},
								{
									text: 'IQTypeGuardFunction',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQTypeGuardFunction',
								},
								{
									text: 'IQTypeSpec',
									link: '/tsdoc/@cartago-git/namespaces/Types/type-aliases/IQTypeSpec',
								},
							],
						},
					],
				},
			],
			'/tsdoc/@cartago-git/namespaces/Advanced/': [
				{
					text: 'Navigation',
					items: [
						{ text: 'Back to Core', link: '/tsdoc/' },
						{
							text: 'Types',
							link: '/tsdoc/@cartago-git/namespaces/Types/',
						},
						{
							text: 'Utils',
							link: '/tsdoc/@cartago-git/namespaces/Utils/',
						},
						{
							text: 'Forms',
							link: '/tsdoc/@cartago-git/namespaces/Forms/',
						},
						{
							text: 'Compat (TS5)',
							link: '/tsdoc/@cartago-git/namespaces/Compat/',
						},
					],
				},
				{
					text: 'Advanced Namespace',
					items: [
						{
							text: 'Overview',
							link: '/tsdoc/@cartago-git/namespaces/Advanced/',
						},
						{
							text: 'Classes',
							items: [
								{
									text: 'QMockGenerator',
									link: '/tsdoc/@cartago-git/namespaces/Advanced/classes/QMockGenerator',
								},
								{
									text: 'QTransformerRegistry',
									link: '/tsdoc/@cartago-git/namespaces/Advanced/classes/QTransformerRegistry',
								},
							],
						},
					],
				},
			],
			'/tsdoc/@cartago-git/namespaces/Utils/': [
				{
					text: 'Navigation',
					items: [
						{ text: 'Back to Core', link: '/tsdoc/' },
						{
							text: 'Types',
							link: '/tsdoc/@cartago-git/namespaces/Types/',
						},
						{
							text: 'Advanced',
							link: '/tsdoc/@cartago-git/namespaces/Advanced/',
						},
						{
							text: 'Forms',
							link: '/tsdoc/@cartago-git/namespaces/Forms/',
						},
						{
							text: 'Compat (TS5)',
							link: '/tsdoc/@cartago-git/namespaces/Compat/',
						},
					],
				},
				{
					text: 'Utils Namespace',
					items: [
						{
							text: 'Overview',
							link: '/tsdoc/@cartago-git/namespaces/Utils/',
						},
						{
							text: 'Classes',
							items: [
								{
									text: 'QMockBuilder',
									link: '/tsdoc/@cartago-git/namespaces/Utils/classes/QMockBuilder',
								},
								{
									text: 'QModelError',
									link: '/tsdoc/@cartago-git/namespaces/Utils/classes/QModelError',
								},
							],
						},
						{
							text: 'Functions',
							items: [
								{
									text: 'QType',
									link: '/tsdoc/@cartago-git/namespaces/Utils/functions/QType',
								},
							],
						},
					],
				},
			],
			'/tsdoc/@cartago-git/namespaces/Forms/': [
				{
					text: 'Navigation',
					items: [
						{ text: 'Back to Core', link: '/tsdoc/' },
						{
							text: 'Types',
							link: '/tsdoc/@cartago-git/namespaces/Types/',
						},
						{
							text: 'Advanced',
							link: '/tsdoc/@cartago-git/namespaces/Advanced/',
						},
						{
							text: 'Utils',
							link: '/tsdoc/@cartago-git/namespaces/Utils/',
						},
						{
							text: 'Compat (TS5)',
							link: '/tsdoc/@cartago-git/namespaces/Compat/',
						},
					],
				},
				{
					text: 'Forms Namespace',
					items: [
						{
							text: 'Overview',
							link: '/tsdoc/@cartago-git/namespaces/Forms/',
						},
						{
							text: 'Functions',
							collapsed: false,
							items: [
								{
									text: 'qCheckRules',
									link: '/tsdoc/@cartago-git/namespaces/Forms/functions/qCheckRules',
								},
								{
									text: 'qCheckRulesAsync',
									link: '/tsdoc/@cartago-git/namespaces/Forms/functions/qCheckRulesAsync',
								},
								{
									text: 'qCheckRulesByGroup',
									link: '/tsdoc/@cartago-git/namespaces/Forms/functions/qCheckRulesByGroup',
								},
								{
									text: 'qCheckRulesByGroupAsync',
									link: '/tsdoc/@cartago-git/namespaces/Forms/functions/qCheckRulesByGroupAsync',
								},
								{
									text: 'qGetGroups',
									link: '/tsdoc/@cartago-git/namespaces/Forms/functions/qGetGroups',
								},
								{
									text: 'qGroups',
									link: '/tsdoc/@cartago-git/namespaces/Forms/functions/qGroups',
								},
							],
						},
						{
							text: 'Interfaces',
							collapsed: true,
							items: [
								{
									text: 'IQCheckRulesAsyncOptions',
									link: '/tsdoc/@cartago-git/namespaces/Forms/interfaces/IQCheckRulesAsyncOptions',
								},
								{
									text: 'IQCheckRulesOptions',
									link: '/tsdoc/@cartago-git/namespaces/Forms/interfaces/IQCheckRulesOptions',
								},
							],
						},
						{
							text: 'Types',
							collapsed: true,
							items: [
								{
									text: 'IQGroupsMap',
									link: '/tsdoc/@cartago-git/namespaces/Forms/type-aliases/IQGroupsMap',
								},
							],
						},
					],
				},
			],
			'/tsdoc/@cartago-git/namespaces/Compat/': [
				{
					text: 'Navigation',
					items: [
						{ text: 'Back to Core', link: '/tsdoc/' },
						{
							text: 'Types',
							link: '/tsdoc/@cartago-git/namespaces/Types/',
						},
						{
							text: 'Advanced',
							link: '/tsdoc/@cartago-git/namespaces/Advanced/',
						},
						{
							text: 'Utils',
							link: '/tsdoc/@cartago-git/namespaces/Utils/',
						},
						{
							text: 'Forms',
							link: '/tsdoc/@cartago-git/namespaces/Forms/',
						},
					],
				},
				{
					text: 'Compat (TS5) Namespace',
					items: [
						{
							text: 'Overview',
							link: '/tsdoc/@cartago-git/namespaces/Compat/',
						},
						{
							text: 'Functions',
							collapsed: false,
							items: [
								{
									text: 'qGroups5',
									link: '/tsdoc/@cartago-git/namespaces/Compat/functions/qGroups5',
								},
							],
						},
					],
				},
			],
			'/tsdoc/': [
				{
					text: 'Navigation',
					items: [
						{
							text: 'Advanced',
							link: '/tsdoc/@cartago-git/namespaces/Advanced/',
						},
						{
							text: 'Types',
							link: '/tsdoc/@cartago-git/namespaces/Types/',
						},
						{
							text: 'Utils',
							link: '/tsdoc/@cartago-git/namespaces/Utils/',
						},
						{
							text: 'Forms',
							link: '/tsdoc/@cartago-git/namespaces/Forms/',
						},
						{
							text: 'Compat (TS5)',
							link: '/tsdoc/@cartago-git/namespaces/Compat/',
						},
					],
				},
				{
					text: 'API Reference',
					items: [
						{ text: 'Overview', link: '/tsdoc/' },
						{
							text: 'Core Classes',
							items: [
								{
									text: 'QModel',
									link: '/tsdoc/classes/QModel',
								},
							],
						},
						{
							text: 'Core Decorators',
							items: [
								{
									text: '@Quick',
									link: '/tsdoc/functions/Quick',
								},
							],
						},
						{
							text: 'Core Types',
							items: [
								{
									text: 'IQImplements',
									link: '/tsdoc/type-aliases/IQImplements',
								},
							],
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
							text: 'Core Concepts',
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
							],
						},
						{
							text: 'Advanced',
							items: [
								{
									text: 'Unknown Property Policy',
									link: '/en/guide/unknown-property-policy',
								},
								{
									text: 'Dot Notation',
									link: '/en/guide/dot-notation',
								},
								{
									text: 'Custom Transformers',
									link: '/en/guide/custom-transformers',
								},
								{
									text: 'Nested Models',
									link: '/en/guide/nested-models',
								},
								{
									text: 'Validation (@QRule)',
									link: '/en/guide/validation',
								},
								{
									text: 'Built-in Validators',
									link: '/en/guide/validators',
								},
								{
									text: 'Form Validation (/forms)',
									link: '/en/guide/forms',
								},
								{
									text: 'Form Schema (@QField)',
									link: '/en/guide/qfield',
								},
								{
									text: 'Key Aliases (@QAlias)',
									link: '/en/guide/qalias',
								},
								{
									text: 'Mock Generation',
									link: '/en/guide/mocks',
								},
								{
									text: 'Troubleshooting',
									link: '/en/guide/troubleshooting',
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
									text: 'React / Next.js',
									link: '/en/integrations/react-integration',
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
							],
						},
						{
							text: 'State Management & Forms',
							items: [
								{
									text: 'Redux Toolkit (RTK)',
									link: '/en/integrations/redux-toolkit-integration',
								},
								{
									text: 'Zustand',
									link: '/en/integrations/zustand-integration',
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
								{
									text: 'TanStack Query',
									link: '/en/integrations/tanstack-query-integration',
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
							text: 'Conceptos Básicos',
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
							],
						},
						{
							text: 'Avanzado',
							items: [
								{
									text: 'Política de Propiedades Desconocidas',
									link: '/es/guide/unknown-property-policy',
								},
								{
									text: 'Notación por Puntos',
									link: '/es/guide/dot-notation',
								},
								{
									text: 'Transformadores Personalizados',
									link: '/es/guide/custom-transformers',
								},
								{
									text: 'Modelos Anidados',
									link: '/es/guide/nested-models',
								},
								{
									text: 'Validación (@QRule)',
									link: '/es/guide/validation',
								},
								{
									text: 'Validadores Integrados',
									link: '/es/guide/validators',
								},
								{
									text: 'Validación de Formularios (/forms)',
									link: '/es/guide/forms',
								},
								{
									text: 'Esquema de Formulario (@QField)',
									link: '/es/guide/qfield',
								},
								{
									text: 'Alias de Claves (@QAlias)',
									link: '/es/guide/qalias',
								},
								{
									text: 'Generación de Mocks',
									link: '/es/guide/mocks',
								},
								{
									text: 'Solución de Problemas',
									link: '/es/guide/troubleshooting',
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
									text: 'React / Next.js',
									link: '/es/integrations/react-integration',
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
							],
						},
						{
							text: 'Estado y Formularios',
							items: [
								{
									text: 'Redux Toolkit (RTK)',
									link: '/es/integrations/redux-toolkit-integration',
								},
								{
									text: 'Zustand',
									link: '/es/integrations/zustand-integration',
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
								{
									text: 'TanStack Query',
									link: '/es/integrations/tanstack-query-integration',
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
