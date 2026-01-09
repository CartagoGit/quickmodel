import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'QuickModel',
	description: 'Type-safe serialization library for TypeScript models',
	base: '/quickmodel/',
	outDir: '../docs-vitepress/dist',
	ignoreDeadLinks: true,

	// Global theme config (shared across all locales)
	themeConfig: {
		socialLinks: [{ icon: 'github', link: 'https://github.com/CartagoGit/quickmodel' }],
		sidebar: {
			'/tsdoc/': [
				{
					text: 'API Reference',
					items: [
						{ text: 'Overview', link: '/tsdoc/' },
						{
							text: 'Classes',
							collapsed: false,
							items: [{ text: 'QModel', link: '/tsdoc/classes/QModel' }],
						},
						{
							text: 'Decorators',
							collapsed: false,
							items: [
								{ text: '@Quick', link: '/tsdoc/functions/Quick' },
								{ text: '@QType', link: '/tsdoc/functions/QType' },
							],
						},
						{
							text: 'Types',
							collapsed: false,
							items: [{ text: 'QInterface', link: '/tsdoc/type-aliases/QInterface' }],
						},
					],
				},
			],
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
								{ text: 'Getting Started', link: '/en/guide/getting-started' },
								{ text: 'Installation', link: '/en/guide/installation' },
								{ text: 'Quick Start', link: '/en/guide/quick-start' },
							],
						},
						{
							text: 'Core Concepts',
							items: [
								{ text: 'QModel', link: '/en/guide/qmodel' },
								{ text: '@Quick Decorator', link: '/en/guide/quick-decorator' },
								{ text: 'Transformers', link: '/en/guide/transformers' },
								{ text: 'Serialization', link: '/en/guide/serialization' },
							],
						},
						{
							text: 'Advanced',
							items: [
								{ text: 'Custom Transformers', link: '/en/guide/custom-transformers' },
								{ text: 'Nested Models', link: '/en/guide/nested-models' },
								{ text: 'Mock Generation', link: '/en/guide/mocks' },
							],
						},
					],
					'/en/examples/': [
						{
							text: 'Examples',
							items: [
								{ text: 'Basic Usage', link: '/en/examples/basic' },
								{ text: 'API Models', link: '/en/examples/api-models' },
								{ text: 'Complex Types', link: '/en/examples/complex-types' },
							],
						},
					],
				},
				footer: {
					message: 'Released under the MIT License.',
					copyright: 'Copyright © 2026 Cartago',
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
								{ text: 'Comenzando', link: '/es/guide/getting-started' },
								{ text: 'Instalación', link: '/es/guide/installation' },
								{ text: 'Inicio Rápido', link: '/es/guide/quick-start' },
							],
						},
						{
							text: 'Conceptos Básicos',
							items: [
								{ text: 'QModel', link: '/es/guide/qmodel' },
								{ text: 'Decorador @Quick', link: '/es/guide/quick-decorator' },
								{ text: 'Transformadores', link: '/es/guide/transformers' },
								{ text: 'Serialización', link: '/es/guide/serialization' },
							],
						},
						{
							text: 'Avanzado',
							items: [
								{ text: 'Transformadores Personalizados', link: '/es/guide/custom-transformers' },
								{ text: 'Modelos Anidados', link: '/es/guide/nested-models' },
								{ text: 'Generación de Mocks', link: '/es/guide/mocks' },
							],
						},
					],
					'/es/examples/': [
						{
							text: 'Ejemplos',
							items: [
								{ text: 'Uso Básico', link: '/es/examples/basic' },
								{ text: 'Modelos de API', link: '/es/examples/api-models' },
								{ text: 'Tipos Complejos', link: '/es/examples/complex-types' },
							],
						},
					],
				},
				footer: {
					message: 'Liberado bajo Licencia MIT.',
					copyright: 'Copyright © 2026 Cartago',
				},
			},
		},
	},


});
