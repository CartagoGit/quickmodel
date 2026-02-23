import { useData, useRoute, useRouter } from 'vitepress';
import { computed, onMounted, nextTick, ref, watch } from 'vue';
import flagES from '../../theme/flags/es.svg?url';
import flagGB from '../../theme/flags/gb.svg?url';

export function useLanguageSwitcher() {
	const { site, localeIndex } = useData();
	const route = useRoute();
	const router = useRouter();

	const overrideLocale = ref<string | null>(null);

	const currentLocale = computed(() => {
		if (overrideLocale.value) return overrideLocale.value;
		return localeIndex.value;
	});

	const STORAGE_KEY_LANG = 'vitepress-theme-lang';

	watch(
		() => route.path,
		(newPath) => {
			const isSharedRoute =
				newPath.includes('/tsdoc/') || !newPath.match(/\/(en|es)\//);

			if (isSharedRoute) {
				const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
				if (savedLang) overrideLocale.value = savedLang;
			} else {
				overrideLocale.value = null;
			}
		}
	);

	let hasRepositioned = false;

	onMounted(async () => {
		await nextTick();

		if (typeof window !== 'undefined') {
			const currentPath = route.path;
			const isSharedRoute =
				currentPath.includes('/tsdoc/') ||
				!currentPath.match(/\/(en|es)\//);

			if (isSharedRoute) {
				const savedLang = localStorage.getItem(STORAGE_KEY_LANG);
				if (savedLang) overrideLocale.value = savedLang;
			}

			if (!hasRepositioned) {
				const switcher = document.querySelector(
					'#language-switcher-mount'
				);
				const themeButton = document.querySelector(
					'.VPNavBar .VPSwitchAppearance'
				);

				if (
					switcher &&
					themeButton?.parentElement &&
					!themeButton.parentElement.contains(switcher)
				) {
					try {
						themeButton.parentElement?.insertBefore(
							switcher,
							themeButton
						);
						hasRepositioned = true;
					} catch (error) {
						console.warn(
							'Could not reposition language switcher:',
							error
						);
					}
				}
			}
		}
	});

	const locales = computed(() => {
		const currentPath = route.path;
		const isSharedRoute =
			currentPath.includes('/tsdoc/') ||
			!currentPath.match(/\/(en|es)\//);

		return Object.entries(site.value.locales || {}).map(
			([localeKey, config]) => {
				const code = localeKey;
				const newPath = isSharedRoute
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
		const lang = locales.value.find(
			(loc) => loc.code === currentLocale.value
		);
		return lang || locales.value[0];
	});

	const handleLanguageChange = async (lang: {
		code: string;
		label: string;
		flagSvg: string;
		link: string;
	}) => {
		if (typeof window !== 'undefined') {
			const currentPath = route.path;
			const isSharedRoute =
				currentPath.includes('/tsdoc/') ||
				!currentPath.match(/\/(en|es)\//);

			localStorage.setItem(STORAGE_KEY_LANG, lang.code);

			window.dispatchEvent(
				new CustomEvent('localStorageChange', {
					detail: { key: STORAGE_KEY_LANG, newValue: lang.code },
				})
			);

			if (isSharedRoute) {
				overrideLocale.value = lang.code;
				await nextTick();
			} else {
				const newPath = currentPath.replace(
					/\/(en|es)\//,
					`/${lang.code}/`
				);
				router.go(newPath);
			}
		}
	};

	return { locales, currentLocale, currentLang, handleLanguageChange };
}
