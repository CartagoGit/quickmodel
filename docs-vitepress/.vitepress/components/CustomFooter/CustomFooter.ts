import { VPSocialLink } from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';

export function useCustomFooter() {
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

	return { socialLinks, footerMessage, footerCopyright, VPSocialLink };
}
