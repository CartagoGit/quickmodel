import { VPSocialLink } from 'vitepress/theme';
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';

export function useCustomFooter() {
	const { t } = useI18n();

	const socialLinks = [
		{ icon: 'github', link: 'https://github.com/CartagoGit' },
		{
			icon: 'linkedin',
			link: 'https://www.linkedin.com/in/mario-cabrero-volarich/',
		},
		{ icon: 'docker', link: 'https://hub.docker.com/u/cartagodocker' },
		{ icon: 'npm', link: 'https://www.npmjs.com/~cartago-git' },
	];

	const footerMessage = computed(
		() => `${t.value.footer.license}<br>${t.value.footer.donation}`
	);

	const footerCopyright = computed(
		() =>
			'Copyright © 2026 <a href="https://www.linkedin.com/in/mario-cabrero-volarich/" target="_blank" rel="noopener">Mario Cabrero Volarich</a>'
	);

	return { socialLinks, footerMessage, footerCopyright, VPSocialLink };
}
