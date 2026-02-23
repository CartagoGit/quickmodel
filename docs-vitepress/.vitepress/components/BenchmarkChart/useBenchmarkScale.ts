import { computed, type Ref } from 'vue';
import type { IBenchScenario } from './benchmark-chart.constants';

const OVERFLOW_RATIO = 4;
const OVERFLOW_SCALE_FACTOR = 1.8;
const MIN_BAR_PERCENT = 3;
const OVERFLOW_BAR_PERCENT = 92;

export interface IBenchmarkScaleResult {
	isOverflow: (lib: string) => boolean;
	barPercent: (lib: string) => number;
}

/**
 * Calcula la escala visual del gráfico (SRP: sólo responsable de la escala y overflow).
 * Si la barra top supera 4x la segunda, se recorta para preservar la legibilidad.
 */
export function useBenchmarkScale(
	currentScenario: Ref<IBenchScenario>,
	activeLibNames: Ref<string[]>
): IBenchmarkScaleResult {
	const visualMax = computed(() => {
		const sorted = [...activeLibNames.value]
			.map((lib) => currentScenario.value.values[lib] ?? 0)
			.sort((aVal, bVal) => bVal - aVal);

		if (sorted.length < 2) return sorted[0] ?? 1;

		const top = sorted[0]!;
		const second = sorted[1]!;

		if (second === 0) return top;
		return top / second > OVERFLOW_RATIO
			? second * OVERFLOW_SCALE_FACTOR
			: top;
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
