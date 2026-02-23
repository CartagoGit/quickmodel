import { useData, useRoute, useRouter } from 'vitepress';
import { computed, onMounted, nextTick, ref, watch } from 'vue';
import flagES from '../../theme/flags/es.svg?url';
import flagGB from '../../theme/flags/gb.svg?url';
import { STORAGE_KEY_LANG } from '../../constants/storage-keys.constants';
import { useNavPosition } from './useNavPosition';

/** Detecta si la ruta actual es una ruta compartida (sin prefijo de idioma). */
function isSharedRoute(path: string): boolean {
	return path.includes('/tsdoc/') || !path.match(/\/(en|es)\//);
}

export function useLanguageSwitcher() {
	const { site, localeIndex } = useData();
	const route = useRoute();
	const router = useRouter();

	// SRP: delegar el reposicionamiento DOM al composable dedicado
	useNavPosition();

	const overrideLocale = ref<string | null>(null);

	const currentLocale = computed(
		() => overrideLocale.value ?? localeIndex.value
	);

	watch(
		() => route.path,
		(newPath) => {
			if (isSharedRoute(newPath)) {
				const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
				if (savedLang) overrideLocale.value = savedLang;
			} else {
				overrideLocale.value = null;
			}
		}
	);

	onMounted(async () => {
		if (typeof window === 'undefined') return;
		await nextTick();

		if (isSharedRoute(route.path)) {
			const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
			if (savedLang) overrideLocale.value = savedLang;
		}
	});

	const locales = computed(() => {
		const currentPath = route.path;

		return Object.entries(site.value.locales || {}).map(
			([localeKey, config]) => {
				const code = localeKey;
				const newPath = isSharedRoute(currentPath)
					? currentPath
					: currentPath.replace(/\/(en|es)\//, `/${code}/`);

				return {
					code,
					label:
						config.label?.replace(/🇬🇧|🇪🇸/, '').trim() ||
						code.toUpperCase(),
					flagSvg:
						code === 'en' ? flagGB : code === 'es' ? flagES : '',
					link: newPath,
				};
			}
		);
	});

	const currentLang = computed(() => {
		const found = locales.value.find(
			(loc) => loc.code === currentLocale.value
		);
		return found ?? locales.value[0];
	});

	const handleLanguageChange = async (lang: {
		code: string;
		label: string;
		flagSvg: string;
		link: string;
	}) => {
		if (typeof window === 'undefined') return;

		const currentPath = route.path;
		localStorage.setItem(STORAGE_KEY_LANG, lang.code);

		window.dispatchEvent(
			new CustomEvent('localStorageChange', {
				detail: { key: STORAGE_KEY_LANG, newValue: lang.code },
			})
		);

		if (isSharedRoute(currentPath)) {
			overrideLocale.value = lang.code;
			await nextTick();
		} else {
			router.go(currentPath.replace(/\/(en|es)\//, `/${lang.code}/`));
		}
	};

	return { locales, currentLocale, currentLang, handleLanguageChange };
}
