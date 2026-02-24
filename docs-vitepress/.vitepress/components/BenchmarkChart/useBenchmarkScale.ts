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
		if (allVals.length === 1) return allVals[0]!;

		// Clipping iterativo: recortar el top mientras supere OVERFLOW_RATIO * segundo.
		let threshold = allVals[0]!;
		for (let pass = 0; pass < allVals.length; pass++) {
			const visible = allVals.filter((val) => val <= threshold);
			if (visible.length < 2) break;
			const top = visible[0]!;
			const second = visible[1]!;
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
	 * ratio = lib_value / visualMax.
	 * A higher ratio → shorter fill (wider extension arrow).
	 * Mapped via log10: ratio 3.5 → fill 92%, ratio 10 → ~84%, ratio 100 → ~72%.
	 */
	function overflowFillPercent(lib: string): number {
		const val = currentScenario.value.values[lib];
		if (!val || visualMax.value === 0) return OVERFLOW_BAR_PERCENT;
		const ratio = val / visualMax.value;
		// ext width: clamp 8–28 via log10 of ratio
		const extWidth = Math.min(28, Math.max(8, Math.log10(ratio) * 12 + 4));
		return Math.round(100 - extWidth);
	}

	function overflowRatio(lib: string): number {
		const val = currentScenario.value.values[lib];
		if (!val || visualMax.value === 0) return 1;
		return val / visualMax.value;
	}

	return { isOverflow, barPercent, overflowFillPercent, overflowRatio };
}
