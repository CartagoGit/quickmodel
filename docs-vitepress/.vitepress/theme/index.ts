// .vitepress/theme/index.ts
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher.vue';
import CustomFooter from '../components/CustomFooter/CustomFooter.vue';
import NavTranslator from '../components/NavTranslator/NavTranslator.vue';
import BenchmarkChart from '../components/BenchmarkChart/BenchmarkChart.vue';
import FeaturesCarousel from '../components/FeaturesCarousel/FeaturesCarousel.vue';
import { setupNavInterceptors } from '../composables/useNavInterceptors';
import './custom.scss';

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			'nav-bar-content-after': () => h(LanguageSwitcher),
			'layout-bottom': () => h(CustomFooter),
			'layout-top': () => h(NavTranslator),
		});
	},
	enhanceApp({ app, router }) {
		app.component('LanguageSwitcher', LanguageSwitcher);
		app.component('CustomFooter', CustomFooter);
		app.component('NavTranslator', NavTranslator);
		app.component('BenchmarkChart', BenchmarkChart);
		app.component('FeaturesCarousel', FeaturesCarousel);

		// SRP: la lógica de interceptación de navegación vive en su propio módulo
		setupNavInterceptors(router);
	},
} satisfies Theme;
