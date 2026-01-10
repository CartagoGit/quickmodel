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
			router.onAfterRouteChange = () => {
				const logo = document.querySelector('.VPNavBarTitle');
				if (logo) {
					logo.addEventListener('click', (e) => {
						const target = e.currentTarget as HTMLElement;
						const href = target.getAttribute('href');
						if (href === '/' || href === '/quickmodel/') {
							e.preventDefault();
							const currentPath = window.location.pathname;
							const lang = currentPath.includes('/es/')
								? 'es'
								: 'en';
							const base = '/quickmodel/';
							router.go(`${base}${lang}/`);
						}
					});
				}
			};
		}
	},
} satisfies Theme;
