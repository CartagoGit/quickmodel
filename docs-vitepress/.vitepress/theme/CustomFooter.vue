<script setup lang="ts">
import { VPSocialLink } from 'vitepress/theme';

const socialLinks = [
	{ icon: 'github', link: 'https://github.com/CartagoGit' },
	{
		icon: 'linkedin',
		link: 'https://www.linkedin.com/in/mario-cabrero-volarich/',
	},
	{ icon: 'docker', link: 'https://hub.docker.com/u/cartagodocker' },
	{ icon: 'npm', link: 'https://www.npmjs.com/~cartago-git' },
];
</script>

<template>
	<div class="custom-footer-wrapper">
		<div class="custom-footer-links">
			<VPSocialLink
				v-for="link in socialLinks"
				:key="link.link"
				:icon="link.icon"
				:link="link.link" />
		</div>
	</div>
</template>

<style>
/* Remove bottom padding from VPFooter */
.VPFooter {
	padding-bottom: 0 !important;
}
</style>

<style scoped>
.custom-footer-wrapper {
	background-color: var(--vp-c-bg);
	border-top: 1px solid var(--vp-c-divider);
	padding: 0 24px 24px 24px;
	margin-top: -1px;
}

.custom-footer-links {
	display: flex;
	gap: 12px;
	justify-content: center;
	align-items: center;
	max-width: 1152px;
	margin: 0 auto;
	padding-top: 0.25rem;
}
</style>
