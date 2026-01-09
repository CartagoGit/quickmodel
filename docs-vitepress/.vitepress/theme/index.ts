// .vitepress/theme/index.ts
import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import './custom.scss';

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			// Custom layout slots si los necesitas
		});
	},
	enhanceApp({ app, router, siteData }) {
		// Custom app enhancements
	}
};
