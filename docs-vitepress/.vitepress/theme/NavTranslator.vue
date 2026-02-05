<script setup lang="ts">
import { useRoute } from 'vitepress';
import { watch, onMounted, onUnmounted, nextTick, ref } from 'vue';

const route = useRoute();
const STORAGE_KEY_LANG = 'vitepress-theme-lang';
const currentLang = ref(localStorage.getItem(STORAGE_KEY_LANG) || 'en');

const translateNav = async () => {
	await nextTick();

	const currentPath = route.path;
	if (currentPath.includes('/tsdoc/')) {
		const savedLang = currentLang.value;

		const navLinks = document.querySelectorAll('.VPNavBarMenuLink');
		navLinks.forEach((link) => {
			const text = link.textContent?.trim();

			if (savedLang === 'es') {
				// Translate to Spanish
				if (text === 'Guide') link.textContent = 'Guía';
				if (text === 'API Reference')
					link.textContent = 'Referencia API';
				if (text === 'Examples') link.textContent = 'Ejemplos';
			} else {
				// Translate back to English
				if (text === 'Guía') link.textContent = 'Guide';
				if (text === 'Referencia API')
					link.textContent = 'API Reference';
				if (text === 'Ejemplos') link.textContent = 'Examples';
			}
		});
	}
};

// Listen for storage changes (when language is changed)
const handleStorageChange = (e: StorageEvent) => {
	if (e.key === STORAGE_KEY_LANG && e.newValue) {
		currentLang.value = e.newValue;
		translateNav();
	}
};

// Custom event for same-window storage changes
const handleCustomStorageChange = (e: CustomEvent) => {
	if (e.detail.key === STORAGE_KEY_LANG) {
		currentLang.value = e.detail.newValue;
		translateNav();
	}
};

// Translate on mount
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

// Translate on route change
watch(
	() => route.path,
	() => {
		translateNav();
	}
);

// Translate when language changes
watch(currentLang, () => {
	translateNav();
});
</script>

<template>
	<!-- This component has no visual output -->
</template>
