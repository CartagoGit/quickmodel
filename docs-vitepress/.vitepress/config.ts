import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'QuickModel',
	description: 'Type-safe serialization library for TypeScript models',
	base: '/quickmodel/',
	outDir: '../docs-vitepress/dist',
	ignoreDeadLinks: true,
	
	locales: {
		root: {
			label: 'English',
			lang: 'en',
			link: '/en/',
			themeConfig: {
				outline: {
					level: [2, 3],
					label: 'On this page'
				},
				nav: [
					{ text: 'Guide', link: '/en/guide/getting-started' },
					{ text: 'API Reference', link: '/tsdoc/' },
					{ text: 'Examples', link: '/en/examples/' },
					{ text: 'GitHub', link: 'https://github.com/CartagoGit/quickmodel' }
				],
				sidebar: {
					'/en/guide/': [
				{
					text: 'Introduction',
					items: [
						{ text: 'Getting Started', link: '/guide/getting-started' },
						{ text: 'Installation', link: '/guide/installation' },
						{ text: 'Quick Start', link: '/guide/quick-start' }
					]
				},
				{
					text: 'Core Concepts',
					items: [
						{ text: 'QModel', link: '/guide/qmodel' },
						{ text: '@Quick Decorator', link: '/guide/quick-decorator' },
						{ text: 'Transformers', link: '/guide/transformers' },
						{ text: 'Serialization', link: '/guide/serialization' }
					]
				},
				{
					text: 'Advanced',
					items: [
						{ text: 'Custom Transformers', link: '/guide/custom-transformers' },
						{ text: 'Nested Models', link: '/guide/nested-models' },
						{ text: 'Mock Generation', link: '/guide/mocks' }
					]
				}
			],
			'/examples/': [
				{
					text: 'Examples',
					items: [
						{ text: 'Basic Usage', link: '/examples/basic' },
						{ text: 'API Models', link: '/examples/api-models' },
						{ text: 'Complex Types', link: '/examples/complex-types' }
					]
				}
			],
			'/tsdoc/': [
				{
					text: 'API Reference',
					items: [
						{ text: 'Overview', link: '/tsdoc/' },
						{
							text: 'Classes',
							collapsed: false,
							items: [
								{ text: 'QModel', link: '/tsdoc/classes/QModel' }
							]
						},
						{
							text: 'Decorators',
							collapsed: false,
							items: [
								{ text: '@Quick', link: '/tsdoc/functions/Quick' },
								{ text: '@QType', link: '/tsdoc/functions/QType' }
							]
						},
						{
							text: 'Types',
							collapsed: false,
							items: [
								{ text: 'QInterface', link: '/tsdoc/type-aliases/QInterface' }
							]
						}
					]
				}
			]
		},

		// Habilitar tabla de contenidos en sidebar derecho
		sidebarMenuLabel: 'Menu',
		returnToTopLabel: 'Return to top',

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/CartagoGit/quickmodel' }
		],

		footer: {
			message: 'Released under the MIT License.',
			copyright: 'Copyright © 2026 Cartago'
		}
	}
});
