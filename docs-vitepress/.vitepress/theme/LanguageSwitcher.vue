<template>
	<div class="VPFlyout VPNavBarMenuGroup" id="language-switcher-mount">
		<button type="button" class="button" :aria-label="`Change language from ${currentLang.label}`">
			<img :src="currentLang.flagSvg" :alt="currentLang.label" class="flag-img" />
			<svg
				class="icon"
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
			>
				<path
					d="M7 10L12 15L17 10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		<div class="menu">
			<div class="items">
				<a
					v-for="lang in locales"
					:key="lang.code"
					class="item"
					:class="{ active: lang.code === currentLocale }"
					@click.prevent="handleLanguageChange(lang)"
				>
					<img :src="lang.flagSvg" :alt="lang.label" class="flag-img" />
					<span class="text">{{ lang.label }}</span>
				</a>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useData, useRoute } from 'vitepress';
import { computed, onMounted, nextTick, ref } from 'vue';
import flagES from './flags/es.svg?url';
import flagGB from './flags/gb.svg?url';

const { site, localeIndex } = useData();
const route = useRoute();

// Override para rutas compartidas donde no podemos cambiar localeIndex
const overrideLocale = ref<string | null>(null);

const currentLocale = computed(() => {
	// Si hay override (usado en rutas compartidas), usarlo
	if (overrideLocale.value) {
		return overrideLocale.value;
	}
	return localeIndex.value;
});

const STORAGE_KEY_LANG = 'vitepress-theme-lang';

// Reposicionar el selector antes del botón de tema cuando se monte
onMounted(async () => {
	await nextTick();
	if (typeof window !== 'undefined') {
		const switcher = document.querySelector('#language-switcher-mount');
		const themeButton = document.querySelector('.VPNavBar .VPSwitchAppearance');

		// Remover el selector de traducciones por defecto de VitePress
		const defaultSwitcher = document.querySelector('.VPNavBar .translations');
		if (defaultSwitcher?.parentElement) {
			defaultSwitcher.parentElement?.removeChild(defaultSwitcher);
		}

		// Reposicionar nuestro selector si ambos elementos existen
		if (switcher && themeButton?.parentElement && !themeButton.parentElement.contains(switcher)) {
			try {
				themeButton.parentElement?.insertBefore(switcher, themeButton);
			} catch (error) {
				console.warn('Could not reposition language switcher:', error);
			}
		}
	}
});

const locales = computed(() => {
	const currentPath = route.path;

	// Detectar si estamos en una ruta compartida (sin prefijo de idioma)
	const isSharedRoute = currentPath.includes('/tsdoc/') || !currentPath.match(/\/(en|es)\//);

	return Object.entries(site.value.locales || {}).map(([localeKey, config]) => {
		const code = localeKey;

		// Si es ruta compartida, mantener el path actual
		const newPath = isSharedRoute ? currentPath : currentPath.replace(/\/(en|es)\//, `/${code}/`);

		return {
			code,
			label: config.label?.replace(/🇬🇧|🇪🇸/, '').trim() || code.toUpperCase(),
			flagSvg: code === 'en' ? flagGB : code === 'es' ? flagES : '',
			link: newPath,
		};
	});
});

const currentLang = computed(() => {
	const lang = locales.value.find((l) => l.code === currentLocale.value);
	return lang || locales.value[0];
});

const handleLanguageChange = (lang: {
	code: string;
	label: string;
	flagSvg: string;
	link: string;
}) => {
	if (typeof window !== 'undefined') {
		const currentPath = route.path;

		// Detectar si estamos en una ruta compartida (sin prefijo de idioma)
		const isSharedRoute = currentPath.includes('/tsdoc/') || !currentPath.match(/\/(en|es)\//);

		// Guardar preferencia
		localStorage.setItem(STORAGE_KEY_LANG, lang.code);

		if (isSharedRoute) {
			// En rutas compartidas, solo actualizar el override local
			overrideLocale.value = lang.code;
		} else {
			// Ruta con idioma (/en/, /es/): navega a la ruta equivalente
			window.location.href = lang.link;
		}
	}
};
</script>

<style scoped>
.VPFlyout {
	position: relative;
	display: inline-block;
}

.flag-img {
	width: 20px;
	height: 14px;
	border-radius: 2px;
	object-fit: cover;
	display: inline-block;
}

.button {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0 12px;
	height: var(--vp-nav-height);
	font-size: 14px;
	font-weight: 500;
	color: var(--vp-c-text-1);
	transition: color 0.25s;
	cursor: pointer;
	background: none;
	border: none;
}

.button:hover {
	color: var(--vp-c-brand-1);
}

.icon {
	width: 12px;
	height: 12px;
	stroke: currentColor;
}

.menu {
	position: absolute;
	top: calc(var(--vp-nav-height));
	right: 0;
	z-index: 50;
	opacity: 0;
	visibility: hidden;
	transition:
		opacity 0.25s,
		visibility 0.25s,
		transform 0.25s;
	transform: translateY(-8px);
}

.VPFlyout:hover .menu {
	opacity: 1;
	visibility: visible;
	transform: translateY(0);
}

.items {
	position: relative;
	min-width: 128px;
	border-radius: 12px;
	padding: 4px;
	background-color: var(--vp-c-bg-elv);
	box-shadow: var(--vp-shadow-3);
}

.item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0 12px;
	line-height: 32px;
	font-size: 14px;
	font-weight: 500;
	color: var(--vp-c-text-1);
	white-space: nowrap;
	cursor: pointer;
	transition:
		background-color 0.25s,
		color 0.25s;
	border-radius: 8px;
	text-decoration: none;
}

.item:hover {
	color: var(--vp-c-brand-1);
	background-color: var(--vp-c-default-soft);
}

.item.active {
	color: var(--vp-c-brand-1);
	font-weight: 600;
}
</style>
