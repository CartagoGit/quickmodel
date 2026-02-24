import { computed, type Ref } from 'vue';
import type { IBenchScenario } from './benchmark-chart.constants';

const OVERFLOW_RATIO = 3.5;
const OVERFLOW_SCALE_FACTOR = 1.8;
const MIN_BAR_PERCENT = 3;
const OVERFLOW_BAR_PERCENT = 92;

export interface IBenchmarkScaleResult {
	isOverflow: (lib: string) => boolean;
	barPercent: (lib: string) => number;
	/**
	 * Width (%) of the filled portion of an overflow bar.
	 * Ranges 72–92: the higher the overflow ratio, the shorter the fill
	 * (leaving more room for the ›› extension arrow).
	 */
	overflowFillPercent: (lib: string) => number;
	/** Raw ratio = lib_value / visualMax. Always >= 1 for overflow bars. */
	overflowRatio: (lib: string) => number;
}

/**
 * Calcula la escala visual del gráfico (SRP: sólo responsable de la escala y overflow).
 * Clipping iterativo: si la barra top supera OVERFLOW_RATIO veces la segunda,
 * se recorta y se repite hasta que el restante sea estable. Así múltiples barras
 * outlier (p.ej. arktype + TypeBox) quedan recortadas preservando la legibilidad.
 */
export function useBenchmarkScale(
	currentScenario: Ref<IBenchScenario>,
	activeLibNames: Ref<string[]>
): IBenchmarkScaleResult {
	const visualMax = computed(() => {
		const allVals = [...activeLibNames.value]
			.map((lib) => currentScenario.value.values[lib] ?? 0)
			.filter((val) => val > 0)
			.sort((aVal, bVal) => bVal - aVal);

		if (allVals.length === 0) return 1;
		if (allVals.length === 1) return allVals[0];

		// Clipping iterativo: recortar el top mientras supere OVERFLOW_RATIO * segundo.
		let threshold = allVals[0];
		for (let pass = 0; pass < allVals.length; pass++) {
			const visible = allVals.filter((val) => val <= threshold);
			if (visible.length < 2) break;
			const top = visible[0];
			const second = visible[1];
			if (second === 0) break;
			if (top / second > OVERFLOW_RATIO) {
				threshold = second * OVERFLOW_SCALE_FACTOR;
			} else {
				break; // estable
			}
		}
		return threshold;
	});

	function isOverflow(lib: string): boolean {
		const val = currentScenario.value.values[lib];
		return !!val && val > visualMax.value;
	}

	function barPercent(lib: string): number {
		const val = currentScenario.value.values[lib];
		if (val === null || val === undefined) return 0;
		const pct = (val / visualMax.value) * 100;
		return isOverflow(lib)
			? OVERFLOW_BAR_PERCENT
			: Math.max(pct, MIN_BAR_PERCENT);
	}

	/**
	 * Fill width (%) for an overflow bar.
	 * The fastest overflow bar always gets OVERFLOW_BAR_PERCENT (92%).
	 * The rest scale proportionally using log10 of their ratio relative to
	 * the max overflow ratio, so slower overflow bars are visually shorter.
	 * Min fill is 60% to leave room for the ›› label.
	 */
	function overflowFillPercent(lib: string): number {
		const val = currentScenario.value.values[lib];
		if (!val || visualMax.value === 0) return OVERFLOW_BAR_PERCENT;

		const ratio = val / visualMax.value;

		// Find the largest overflow ratio in the current scenario for normalisation.
		const maxOverflowRatio = [...activeLibNames.value]
			.map((name) => {
				const libVal = currentScenario.value.values[name];
				return libVal && libVal > visualMax.value
					? libVal / visualMax.value
					: 1;
			})
			.reduce((prev, cur) => Math.max(prev, cur), 1);

		// Normalise with log10 relative to the actual max: fastest bar → 1, rest → 0–1.
		const logRatio = Math.log10(Math.max(1, ratio));
		const logMax = Math.log10(Math.max(1, maxOverflowRatio));
		const normalised = logMax > 0 ? logRatio / logMax : 1;

		// Fill grows from 60 % (barely overflow) to OVERFLOW_BAR_PERCENT (fastest bar).
		return Math.round(60 + normalised * (OVERFLOW_BAR_PERCENT - 60));
	}

	function overflowRatio(lib: string): number {
		const val = currentScenario.value.values[lib];
		if (!val || visualMax.value === 0) return 1;
		return val / visualMax.value;
	}

	return { isOverflow, barPercent, overflowFillPercent, overflowRatio };
}
