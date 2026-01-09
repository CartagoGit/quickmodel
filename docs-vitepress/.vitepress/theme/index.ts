// .vitepress/theme/index.ts
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import LanguageSwitcher from './LanguageSwitcher.vue';
import './custom.scss';

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			'nav-bar-content-after': () => h(LanguageSwitcher),
		});
	},
	enhanceApp({ app, router, siteData }) {
		app.component('LanguageSwitcher', LanguageSwitcher);

		// // Sincronizar locale con localStorage en rutas compartidas
		// if (typeof window !== 'undefined') {
		// 	const STORAGE_KEY_LANG = 'vitepress-theme-lang';

		// 	router.onBeforeRouteChange = (to) => {
		// 		console.log('Route change to:', to);
		// 		// Si es una ruta compartida (/tsdoc/), actualizar el locale según localStorage
		// 		if (to.includes('/tsdoc/')) {
		// 			const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
		// 			if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
		// 				// Forzar el locale en siteData
		// 				siteData.value.localeIndex = savedLang;
		// 			}
		// 		}
		// 	};
		// }
	},
} satisfies Theme;
