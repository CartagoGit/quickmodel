<script setup lang="ts">
import { useData, useRouter } from 'vitepress';
import { computed } from 'vue';

const { site, lang } = useData();
const router = useRouter();

const homeLink = computed(() => {
	const currentLang = lang.value || 'en';
	const base = site.value.base || '/';
	return `${base}${currentLang}/`;
});

const handleClick = (e: Event) => {
	e.preventDefault();
	router.go(homeLink.value);
};
</script>

<template>
	<a
		class="VPNavBarTitle custom-logo"
		:href="homeLink"
		@click="handleClick">
		<span class="title">{{ site.title }}</span>
	</a>
</template>

<style scoped>
.VPNavBarTitle {
	display: flex;
	align-items: center;
	border-bottom: 1px solid transparent;
	width: 100%;
	height: var(--vp-nav-height);
	font-size: 16px;
	font-weight: 600;
	color: var(--vp-c-text-1);
	transition: opacity 0.25s;
}

.VPNavBarTitle:hover {
	opacity: 0.6;
}

.title {
	flex-shrink: 0;
	font-size: 16px;
	font-weight: 600;
	line-height: var(--vp-nav-height);
}
</style>
