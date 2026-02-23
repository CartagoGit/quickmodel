import { nextTick, onMounted } from 'vue';

const SWITCHER_SELECTOR = '#language-switcher-mount';
const THEME_BUTTON_SELECTOR = '.VPNavBar .VPSwitchAppearance';

/**
 * Reposiciona el elemento del selector de idioma (SRP: responsabilidad única de
 * manipular su posición en el DOM) junto al botón de tema de VitePress.
 */
export function useNavPosition(): void {
	let hasRepositioned = false;

	onMounted(async () => {
		if (typeof window === 'undefined' || hasRepositioned) return;
		await nextTick();

		const switcher = document.querySelector(SWITCHER_SELECTOR);
		const themeButton = document.querySelector(THEME_BUTTON_SELECTOR);

		if (
			switcher &&
			themeButton?.parentElement &&
			!themeButton.parentElement.contains(switcher)
		) {
			try {
				themeButton.parentElement.insertBefore(switcher, themeButton);
				hasRepositioned = true;
			} catch (err) {
				console.warn('Could not reposition language switcher:', err);
			}
		}
	});
}
