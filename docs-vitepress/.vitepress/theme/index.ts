// .vitepress/theme/index.ts
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import LanguageSwitcher from './LanguageSwitcher.vue';
import CustomFooter from './CustomFooter.vue';
import CustomLogo from './CustomLogo.vue';
import './custom.scss';

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			'nav-bar-title-before': () => h(CustomLogo),
			'nav-bar-content-after': () => h(LanguageSwitcher),
			'layout-bottom': () => h(CustomFooter),
		});
	},
	enhanceApp({ app }) {
		app.component('LanguageSwitcher', LanguageSwitcher);
		app.component('CustomFooter', CustomFooter);
		app.component('CustomLogo', CustomLogo);
	},
} satisfies Theme;
