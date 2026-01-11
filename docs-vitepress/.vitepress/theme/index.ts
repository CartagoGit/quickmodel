// .vitepress/theme/index.ts
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import LanguageSwitcher from './LanguageSwitcher.vue';
import CustomFooter from './CustomFooter.vue';
import './custom.scss';

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			'nav-bar-content-after': () => h(LanguageSwitcher),
			'layout-bottom': () => h(CustomFooter),
		});
	},
	enhanceApp({ app, router }) {
		app.component('LanguageSwitcher', LanguageSwitcher);
		app.component('CustomFooter', CustomFooter);

		// Intercept logo clicks to use SPA navigation
		if (typeof window !== 'undefined') {
			const setupLogoInterceptor = () => {
				setTimeout(() => {
					const logo = document.querySelector('.VPNavBarTitle');
					if (logo && !logo.hasAttribute('data-intercepted')) {
						logo.setAttribute('data-intercepted', 'true');
						logo.addEventListener(
							'click',
							(e) => {
								e.preventDefault();
								e.stopPropagation();

								// Get language from localStorage (set by LanguageSwitcher)
								const STORAGE_KEY_LANG = 'vitepress-theme-lang';
								const savedLang =
									localStorage.getItem(STORAGE_KEY_LANG);

								// Use saved language, or default to 'en'
								const lang = savedLang || 'en';

								const base = '/quickmodel/';
								router.go(`${base}${lang}/`);
							},
							true
						);
					}
				}, 100);
			};

			// Run on initial load
			if (document.readyState === 'loading') {
				document.addEventListener(
					'DOMContentLoaded',
					setupLogoInterceptor
				);
			} else {
				setupLogoInterceptor();
			}

			// Run on route changes
			router.onAfterRouteChanged = setupLogoInterceptor;
		}
	},
} satisfies Theme;
