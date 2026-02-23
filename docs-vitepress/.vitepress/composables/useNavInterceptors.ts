import type { Router } from 'vitepress';
import { STORAGE_KEY_LANG } from '../constants/storage-keys.constants';

const LOGO_INTERCEPT_ATTR = 'data-intercepted';
const NAV_INTERCEPT_ATTR = 'data-nav-intercepted';
const BASE_PATH = '/quickmodel/';
const SETUP_DELAY_MS = 100;

/** Detecta el idioma activo desde la ruta o el localStorage como fallback. */
function detectLang(currentPath: string): string {
	if (currentPath.includes('/es/')) return 'es';
	if (currentPath.includes('/en/')) return 'en';
	return localStorage.getItem(STORAGE_KEY_LANG) ?? 'en';
}

/** Intercepta el click del logo para navegar a la home del idioma activo. */
function setupLogoInterceptor(router: Router): void {
	setTimeout(() => {
		const logo = document.querySelector('.VPNavBarTitle');
		if (!logo || logo.hasAttribute(LOGO_INTERCEPT_ATTR)) return;

		logo.setAttribute(LOGO_INTERCEPT_ATTR, 'true');
		logo.addEventListener(
			'click',
			(evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				const lang = detectLang(window.location.pathname);
				router.go(`${BASE_PATH}${lang}/`);
			},
			true
		);
	}, SETUP_DELAY_MS);
}

/** Intercepta los links de nav para redirigir al idioma guardado en localStorage. */
function setupNavLinkInterceptor(router: Router): void {
	setTimeout(() => {
		const navLinks = document.querySelectorAll('.VPNavBarMenuLink');
		navLinks.forEach((link) => {
			if (link.hasAttribute(NAV_INTERCEPT_ATTR)) return;

			link.setAttribute(NAV_INTERCEPT_ATTR, 'true');
			link.addEventListener(
				'click',
				(evt) => {
					const anchor = evt.currentTarget as HTMLAnchorElement;
					const href = anchor.getAttribute('href');
					if (!href?.includes('/en/')) return;

					const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
					if (savedLang === 'es') {
						evt.preventDefault();
						router.go(href.replace('/en/', '/es/'));
					}
				},
				true
			);
		});
	}, SETUP_DELAY_MS);
}

/**
 * Adjunta los interceptores de navegación del logo y los links del nav
 * (SRP: sólo responsable de interceptar la navegación del theme).
 *
 * Debe llamarse únicamente desde el hook `enhanceApp` del theme (fuera de context Vue).
 */
export function setupNavInterceptors(router: Router): void {
	if (typeof window === 'undefined') return;

	const setup = () => {
		setupLogoInterceptor(router);
		setupNavLinkInterceptor(router);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', setup);
	} else {
		setup();
	}

	router.onAfterRouteChanged = setup;
}
