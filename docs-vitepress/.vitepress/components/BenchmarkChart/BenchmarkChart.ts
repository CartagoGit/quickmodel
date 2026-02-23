import { ref, computed, watch } from 'vue';
import { useData } from 'vitepress';
import {
	scenarios,
	libraries,
	libNames,
	appTypeOptions,
	type IBenchScenario,
	type IFeatureValue,
} from './benchmark-chart.constants';

// Visual max: cuando la barra top supera 4x la segunda, se recorta
// para que el gráfico sea legible. Las barras outlier tienen overflow treatment.
const OVERFLOW_RATIO = 4;

export function useBenchmarkChart() {
	const { lang } = useData();

	// ─── Estado reactivo ──────────────────────────────────────

	const activeAppType = ref('all');
	const activeScenario = ref(scenarios[0]!.key);
	const hoveredLib = ref<string | null>(null);
	const tooltipX = ref(0);
	const tooltipY = ref(0);
	const tooltipIsRight = ref(true);

	// ─── Computados ───────────────────────────────────────────

	const isEs = computed(() => lang.value === 'es');

	const filteredScenarios = computed(() =>
		activeAppType.value === 'all'
			? scenarios
			: scenarios.filter((s) => s.appTypes.includes(activeAppType.value))
	);

	// Al cambiar el tipo, seleccionar siempre el primer escenario disponible
	watch(activeAppType, () => {
		const first = filteredScenarios.value[0];
		if (first) activeScenario.value = first.key;
	});

	const currentScenario = computed(() => {
		const inFiltered = filteredScenarios.value.find(
			(s) => s.key === activeScenario.value
		);
		if (inFiltered) return inFiltered;
		return filteredScenarios.value[0] ?? scenarios[0]!;
	});

	/** Librerías con datos en el escenario actual, ordenadas de más rápida a más lenta */
	const activeLibNames = computed(() =>
		libNames
			.filter((lib) => currentScenario.value.values[lib] != null)
			.sort(
				(aLib, bLib) =>
					(currentScenario.value.values[bLib] ?? 0) -
					(currentScenario.value.values[aLib] ?? 0)
			)
	);

	/** Librerías sin datos en el escenario actual (excluidas) */
	const excludedLibNames = computed(() =>
		libNames.filter((lib) => currentScenario.value.values[lib] == null)
	);

	/** Feature matrix: QuickModel siempre en primera columna */
	const matrixLibNames = computed(() => [
		'QuickModel',
		...libNames.filter((lib) => lib !== 'QuickModel'),
	]);

	/**
	 * Máximo visual: si la barra top es >4x la segunda,
	 * escala al segundo*1.8 para no aplastar las demás barras.
	 */
	const visualMax = computed(() => {
		const sorted = [...activeLibNames.value]
			.map((lib) => currentScenario.value.values[lib] ?? 0)
			.sort((aVal, bVal) => bVal - aVal);

		if (sorted.length < 2) return sorted[0] ?? 1;

		const top = sorted[0]!;
		const second = sorted[1]!;

		if (second === 0) return top;

		return top / second > OVERFLOW_RATIO ? second * 1.8 : top;
	});

	// ─── Funciones ────────────────────────────────────────────

	function isOverflow(lib: string): boolean {
		const val = currentScenario.value.values[lib];
		if (!val) return false;
		return val > visualMax.value;
	}

	function barPercent(lib: string): number {
		const val = currentScenario.value.values[lib];
		if (val === null || val === undefined) return 0;
		const pct = (val / visualMax.value) * 100;
		return isOverflow(lib) ? 92 : Math.max(pct, 3);
	}

	function formatOps(lib: string): string {
		const val = currentScenario.value.values[lib];
		if (val === null || val === undefined) return 'N/A';
		if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M ops/s';
		if (val >= 1_000) return (val / 1_000).toFixed(0) + 'k ops/s';
		return val + ' ops/s';
	}

	function featureIcon(val: IFeatureValue): string {
		if (val === true) return '✅';
		if (val === 'partial') return '⚠️';
		return '❌';
	}

	function formatNote(scenario: IBenchScenario): string {
		return isEs.value ? scenario.notesEs : scenario.notesEn;
	}

	function onBarMouseEnter(lib: string, evt: MouseEvent): void {
		hoveredLib.value = lib;
		const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
		const spaceRight = window.innerWidth - rect.right;
		tooltipIsRight.value = spaceRight >= 360;
		tooltipX.value = tooltipIsRight.value
			? rect.right + 12
			: rect.left - 352;
		tooltipY.value = Math.min(rect.top, window.innerHeight - 420);
	}

	function onBarMouseLeave(): void {
		hoveredLib.value = null;
	}

	return {
		// Data
		libraries,
		appTypeOptions,

		// Estado reactivo
		activeAppType,
		activeScenario,
		hoveredLib,
		tooltipX,
		tooltipY,
		tooltipIsRight,

		// Computados
		isEs,
		filteredScenarios,
		currentScenario,
		activeLibNames,
		excludedLibNames,
		matrixLibNames,
		visualMax,

		// Funciones
		isOverflow,
		barPercent,
		formatOps,
		featureIcon,
		formatNote,
		onBarMouseEnter,
		onBarMouseLeave,
	};
}
