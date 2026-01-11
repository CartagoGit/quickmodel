import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'QuickModel',
	description: 'Type-safe serialization library for TypeScript models',
	base: '/quickmodel/',
	outDir: '../docs-vitepress/dist',
	ignoreDeadLinks: true,
	vite: {
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
			{ text: 'API Reference', link: '/tsdoc/' },
			{ text: 'Examples', link: '/en/examples/' },
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
					],
				},
			],
			'/tsdoc/@cartago-git/namespaces/Advanced/': [
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
						{
							text: 'Type Aliases',
							items: [],
						},
					],
				},
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
					],
				},
			],
			'/tsdoc/@cartago-git/namespaces/Utils/': [
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
					],
				},
			],
			'/tsdoc/': [
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
							text: 'Decorators',
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
						{
							text: 'Namespaces',
							items: [
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
					{ text: 'API Reference', link: '/tsdoc/' },
					{ text: 'Examples', link: '/en/examples/' },
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
									text: '@Quick Decorator',
									link: '/en/guide/quick-decorator',
								},
								{
									text: '@QType Decorator',
									link: '/en/guide/qtype-decorator',
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
									text: 'Custom Transformers',
									link: '/en/guide/custom-transformers',
								},
								{
									text: 'Nested Models',
									link: '/en/guide/nested-models',
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
					message: 'Released under the MIT License.',
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
					{ text: 'Referencia API', link: '/tsdoc/' },
					{ text: 'Ejemplos', link: '/es/examples/' },
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
									text: 'Decorador @Quick',
									link: '/es/guide/quick-decorator',
								},
								{
									text: 'Decorador @QType',
									link: '/es/guide/qtype-decorator',
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
									text: 'Transformadores Personalizados',
									link: '/es/guide/custom-transformers',
								},
								{
									text: 'Modelos Anidados',
									link: '/es/guide/nested-models',
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
					message: 'Liberado bajo Licencia MIT.',
					copyright:
						'Copyright © 2026 <a href="https://www.linkedin.com/in/mario-cabrero-volarich/" target="_blank" rel="noopener">Mario Cabrero Volarich</a>',
				},
			},
		},
	},
});
