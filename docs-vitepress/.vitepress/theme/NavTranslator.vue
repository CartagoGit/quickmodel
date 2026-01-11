<script setup lang="ts">
import { useRoute } from 'vitepress';
import { watch, onMounted, nextTick } from 'vue';

const route = useRoute();
const STORAGE_KEY_LANG = 'vitepress-theme-lang';

const translateNav = async () => {
	await nextTick();

	const currentPath = route.path;
	if (currentPath.includes('/tsdoc/')) {
		const savedLang = localStorage.getItem(STORAGE_KEY_LANG);

		if (savedLang === 'es') {
			const navLinks = document.querySelectorAll('.VPNavBarMenuLink');
			navLinks.forEach((link) => {
				const text = link.textContent?.trim();
				if (text === 'Guide') link.textContent = 'Guía';
				if (text === 'API Reference')
					link.textContent = 'Referencia API';
				if (text === 'Examples') link.textContent = 'Ejemplos';
			});
		}
	}
};

// Translate on mount
onMounted(() => {
	translateNav();
});

// Translate on route change
watch(
	() => route.path,
	() => {
		translateNav();
	}
);
</script>

<template>
	<!-- This component has no visual output -->
</template>
