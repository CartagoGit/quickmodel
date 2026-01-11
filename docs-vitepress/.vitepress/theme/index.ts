// .vitepress/theme/index.ts
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import LanguageSwitcher from './LanguageSwitcher.vue';
import CustomFooter from './CustomFooter.vue';
import NavTranslator from './NavTranslator.vue';
import './custom.scss';

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			'nav-bar-content-after': () => h(LanguageSwitcher),
			'layout-bottom': () => h(CustomFooter),
			'layout-top': () => h(NavTranslator),
		});
	},
	enhanceApp({ app, router }) {
		app.component('LanguageSwitcher', LanguageSwitcher);
		app.component('CustomFooter', CustomFooter);
		app.component('NavTranslator', NavTranslator);

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

								const STORAGE_KEY_LANG = 'vitepress-theme-lang';
								const currentPath = window.location.pathname;

								// Detectar idioma de la misma manera que LanguageSwitcher
								let lang: string;

								// Si estamos en una ruta con idioma explícito, usarlo
								if (currentPath.includes('/es/')) {
									lang = 'es';
								} else if (currentPath.includes('/en/')) {
									lang = 'en';
								} else {
									// Ruta compartida (como /tsdoc/): usar localStorage
									const savedLang =
										localStorage.getItem(STORAGE_KEY_LANG);
									lang = savedLang || 'en';
									console.log(
										'Logo click from shared route - savedLang:',
										savedLang,
										'using:',
										lang
									);
								}

								const base = '/quickmodel/';
								const targetPath = `${base}${lang}/`;
								console.log(
									'Logo navigation - from:',
									currentPath,
									'to:',
									targetPath
								);
								router.go(targetPath);
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

			// Intercept nav links (Guide, Examples) to use correct language
			const setupNavInterceptor = () => {
				setTimeout(() => {
					const navLinks =
						document.querySelectorAll('.VPNavBarMenuLink');
					navLinks.forEach((link) => {
						if (!link.hasAttribute('data-nav-intercepted')) {
							link.setAttribute('data-nav-intercepted', 'true');
							link.addEventListener(
								'click',
								(e) => {
									const anchor =
										e.currentTarget as HTMLAnchorElement;
									const href = anchor.getAttribute('href');

									// Only intercept /en/ links
									if (href && href.includes('/en/')) {
										const STORAGE_KEY_LANG =
											'vitepress-theme-lang';
										const savedLang =
											localStorage.getItem(
												STORAGE_KEY_LANG
											);

										// If user has selected Spanish, redirect to Spanish version
										if (savedLang === 'es') {
											e.preventDefault();
											const newHref = href.replace(
												'/en/',
												'/es/'
											);
											router.go(newHref);
										}
									}
								},
								true
							);
						}
					});
				}, 100);
			};

			// Run nav interceptor on initial load and route changes
			if (document.readyState === 'loading') {
				document.addEventListener(
					'DOMContentLoaded',
					setupNavInterceptor
				);
			} else {
				setupNavInterceptor();
			}
			router.onAfterRouteChanged = () => {
				setupLogoInterceptor();
				setupNavInterceptor();
			};

			// Translate nav text in tsdoc based on saved language
			const translateNavForTsdoc = () => {
				const currentPath = window.location.pathname;
				if (currentPath.includes('/tsdoc/')) {
					const STORAGE_KEY_LANG = 'vitepress-theme-lang';
					const savedLang = localStorage.getItem(STORAGE_KEY_LANG);

					if (savedLang === 'es') {
						// Translate nav links to Spanish immediately
						const doTranslation = () => {
							const navLinks =
								document.querySelectorAll('.VPNavBarMenuLink');
							navLinks.forEach((link) => {
								const text = link.textContent?.trim();
								if (text === 'Guide') link.textContent = 'Guía';
								if (text === 'API Reference')
									link.textContent = 'Referencia API';
								if (text === 'Examples')
									link.textContent = 'Ejemplos';
							});
						};

						// Try immediately
						doTranslation();
						// And retry after a short delay to catch late renders
						setTimeout(doTranslation, 10);
					}
				}
			};

			// Run translation on route changes
			router.onAfterRouteChanged = () => {
				setupLogoInterceptor();
				setupNavInterceptor();
				translateNavForTsdoc();
			};
			translateNavForTsdoc(); // Run on initial load
		}
	},
} satisfies Theme;
