<script setup lang="ts">
import { VPSocialLink } from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';

const { lang } = useData();

const socialLinks = [
	{ icon: 'github', link: 'https://github.com/CartagoGit' },
	{
		icon: 'linkedin',
		link: 'https://www.linkedin.com/in/mario-cabrero-volarich/',
	},
	{ icon: 'docker', link: 'https://hub.docker.com/u/cartagodocker' },
	{ icon: 'npm', link: 'https://www.npmjs.com/~cartago-git' },
];

const footerMessage = computed(() => {
	return lang.value === 'es'
		? 'Liberado bajo Licencia MIT.'
		: 'Released under the MIT License.';
});

const footerCopyright = computed(() => {
	return 'Copyright © 2026 <a href="https://www.linkedin.com/in/mario-cabrero-volarich/" target="_blank" rel="noopener">Mario Cabrero Volarich</a>';
});
</script>

<template>
	<div class="custom-footer-wrapper">
		<div class="custom-footer-container">
			<p
				class="message"
				v-html="footerMessage"></p>
			<p
				class="copyright"
				v-html="footerCopyright"></p>
			<div class="custom-footer-links">
				<VPSocialLink
					v-for="link in socialLinks"
					:key="link.link"
					:icon="link.icon"
					:link="link.link" />
			</div>
		</div>
	</div>
</template>

<style>
/* Hide VitePress default footer */
.VPFooter {
	display: none !important;
}
</style>

<style scoped>
.custom-footer-wrapper {
	background-color: var(--vp-c-bg);
	border-top: 1px solid var(--vp-c-divider);
	padding: 32px 24px;
}

.custom-footer-container {
	max-width: 1152px;
	margin: 0 auto;
	text-align: center;
}

.message {
	font-size: 14px;
	font-weight: 500;
	color: var(--vp-c-text-2);
	margin: 0 0 8px 0;
}

.copyright {
	font-size: 14px;
	color: var(--vp-c-text-3);
	margin: 0;
}

.copyright :deep(a) {
	color: var(--vp-c-brand-1);
	text-decoration: none;
	transition: color 0.25s;
}

.copyright :deep(a:hover) {
	color: var(--vp-c-brand-2);
}

.custom-footer-links {
	display: flex;
	gap: 12px;
	justify-content: center;
	align-items: center;
	padding-top: 8px;
}
</style>
