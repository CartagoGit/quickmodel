import { useRoute } from 'vitepress';
import { watch, onMounted, onUnmounted, nextTick, ref } from 'vue';
import { STORAGE_KEY_LANG } from '../../constants/storage-keys.constants';
import { NAV_TRANSLATIONS } from './nav-translations.constants';

/**
 * Aplica las traducciones de nav al DOM según el idioma activo.
 * Función pura: no depende de estado Vue (OCP — extiende mediante NAV_TRANSLATIONS).
 */
function applyNavTranslations(lang: string): void {
	const navLinks = document.querySelectorAll('.VPNavBarMenuLink');
	navLinks.forEach((link) => {
		const text = link.textContent?.trim();
		for (const entry of NAV_TRANSLATIONS) {
			if (lang === 'es' && text === entry.en) {
				link.textContent = entry.es;
				break;
			} else if (lang !== 'es' && text === entry.es) {
				link.textContent = entry.en;
				break;
			}
		}
	});
}

export function useNavTranslator() {
	const route = useRoute();

	const currentLang = ref(
		(typeof localStorage !== 'undefined' &&
			localStorage.getItem(STORAGE_KEY_LANG)) ||
			'en'
	);

	const translateNav = async () => {
		await nextTick();
		if (!route.path.includes('/tsdoc/')) return;
		applyNavTranslations(currentLang.value);
	};

	const handleStorageChange = (evt: StorageEvent) => {
		if (evt.key === STORAGE_KEY_LANG && evt.newValue) {
			currentLang.value = evt.newValue;
			translateNav();
		}
	};

	const handleCustomStorageChange = (evt: CustomEvent) => {
		if (evt.detail.key === STORAGE_KEY_LANG) {
			currentLang.value = evt.detail.newValue;
			translateNav();
		}
	};

	onMounted(() => {
		translateNav();
		window.addEventListener('storage', handleStorageChange);
		window.addEventListener(
			'localStorageChange',
			handleCustomStorageChange as EventListener
		);
	});

	onUnmounted(() => {
		window.removeEventListener('storage', handleStorageChange);
		window.removeEventListener(
			'localStorageChange',
			handleCustomStorageChange as EventListener
		);
	});

	watch(() => route.path, translateNav);
	watch(currentLang, translateNav);
}
