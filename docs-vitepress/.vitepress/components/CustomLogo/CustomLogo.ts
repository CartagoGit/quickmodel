import { useData, useRouter } from 'vitepress';
import { computed } from 'vue';

export function useCustomLogo() {
	const { site, lang } = useData();
	const router = useRouter();

	const homeLink = computed(() => {
		const currentLang = lang.value || 'en';
		const base = site.value.base || '/';
		return `${base}${currentLang}/`;
	});

	const handleClick = (evt: Event) => {
		evt.preventDefault();
		router.go(homeLink.value);
	};

	return { site, homeLink, handleClick };
}
