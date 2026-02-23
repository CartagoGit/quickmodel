import { useRoute } from 'vitepress';
import { watch, onMounted, onUnmounted, nextTick, ref } from 'vue';

export function useNavTranslator() {
	const route = useRoute();
	const STORAGE_KEY_LANG = 'vitepress-theme-lang';
	const currentLang = ref(
		(typeof localStorage !== 'undefined' &&
			localStorage.getItem(STORAGE_KEY_LANG)) ||
			'en'
	);

	const translateNav = async () => {
		await nextTick();

		const currentPath = route.path;
		if (currentPath.includes('/tsdoc/')) {
			const savedLang = currentLang.value;

			const navLinks = document.querySelectorAll('.VPNavBarMenuLink');
			navLinks.forEach((link) => {
				const text = link.textContent?.trim();

				if (savedLang === 'es') {
					if (text === 'Guide') link.textContent = 'Guía';
					if (text === 'API Reference')
						link.textContent = 'Referencia API';
					if (text === 'Examples') link.textContent = 'Ejemplos';
				} else {
					if (text === 'Guía') link.textContent = 'Guide';
					if (text === 'Referencia API')
						link.textContent = 'API Reference';
					if (text === 'Ejemplos') link.textContent = 'Examples';
				}
			});
		}
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

	watch(
		() => route.path,
		() => {
			translateNav();
		}
	);

	watch(currentLang, () => {
		translateNav();
	});
}
