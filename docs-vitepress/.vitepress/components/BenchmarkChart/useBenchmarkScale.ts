import { computed, type Ref } from 'vue';
import type { IBenchScenario } from './benchmark-chart.constants';

const OVERFLOW_RATIO = 3.5;
const OVERFLOW_SCALE_FACTOR = 1.8;
const MIN_BAR_PERCENT = 3;
const OVERFLOW_BAR_PERCENT = 92;

export interface IBenchmarkScaleResult {
	isOverflow: (lib: string) => boolean;
	barPercent: (lib: string) => number;
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

	return { isOverflow, barPercent };
}
