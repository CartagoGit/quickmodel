import { computed } from 'vue';
import { useData } from 'vitepress';
import { getTranslations, type ILocale } from '../i18n/index';

/**
 * Composable para acceder a las traducciones de la documentación según el idioma activo.
 *
 * - `t` — objeto reactivo con las traducciones del locale actual (con fallback a 'en').
 * - `lp(obj, key)` — devuelve la propiedad localizada de un objeto de constantes
 *   (p.ej. `lp(option, 'label')` accede a `option.labelEs` o `option.labelEn`).
 * - `lpArr(obj, key)` — igual que `lp` pero para propiedades que son arrays de strings.
 */
export function useI18n() {
	const { lang } = useData();

	const t = computed(() => getTranslations(lang.value as ILocale));

	/**
	 * Devuelve el valor de la propiedad `key + Locale` de un objeto de constantes.
	 * Si el locale no existe, hace fallback a `key + En`.
	 * Devuelve `''` si el objeto es `null`/`undefined`.
	 *
	 * @example lp(opt, 'label')  →  opt.labelEs  (si lang === 'es')
	 */
	function lp(
		obj: Record<string, unknown> | null | undefined,
		key: string
	): string {
		if (!obj) return '';
		const locale = lang.value;
		const localeProp =
			key + locale.charAt(0).toUpperCase() + locale.slice(1);
		const fallbackProp = key + 'En';
		return (
			((obj[localeProp] ?? obj[fallbackProp]) as string | undefined) ?? ''
		);
	}

	/**
	 * Igual que `lp` pero para propiedades que son arrays de strings.
	 * Devuelve `[]` si el objeto es `null`/`undefined`.
	 *
	 * @example lpArr(lib, 'pros')  →  lib.prosEs  (si lang === 'es')
	 */
	function lpArr(
		obj: Record<string, unknown> | null | undefined,
		key: string
	): string[] {
		if (!obj) return [];
		const locale = lang.value;
		const localeProp =
			key + locale.charAt(0).toUpperCase() + locale.slice(1);
		const fallbackProp = key + 'En';
		return (
			((obj[localeProp] ?? obj[fallbackProp]) as string[] | undefined) ??
			[]
		);
	}

	return { lang, t, lp, lpArr };
}
