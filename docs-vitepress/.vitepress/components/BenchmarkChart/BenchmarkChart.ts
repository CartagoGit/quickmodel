import { ref, computed, watch } from 'vue';
import { useData } from 'vitepress';
import {
	scenarios,
	libraries,
	libNames,
	appTypeOptions,
} from './benchmark-chart.constants';
import { useBenchmarkScale } from './useBenchmarkScale';
import { useBenchmarkFormatters } from './useBenchmarkFormatters';
import { useBenchmarkInteractions } from './useBenchmarkInteractions';

export function useBenchmarkChart() {
	const { lang } = useData();

	// ─── Estado reactivo ──────────────────────────────────────

	const activeAppType = ref('all');
	const activeScenario = ref(scenarios[0]!.key);

	// ─── Computados ───────────────────────────────────────────

	const isEs = computed(() => lang.value === 'es');

	const filteredScenarios = computed(() =>
		activeAppType.value === 'all'
			? scenarios
			: scenarios.filter((scn) =>
					scn.appTypes.includes(activeAppType.value)
				)
	);

	// Al cambiar el tipo, seleccionar siempre el primer escenario disponible
	watch(activeAppType, () => {
		const first = filteredScenarios.value[0];
		if (first) activeScenario.value = first.key;
	});

	const currentScenario = computed(() => {
		const inFiltered = filteredScenarios.value.find(
			(scn) => scn.key === activeScenario.value
		);
		return inFiltered ?? filteredScenarios.value[0] ?? scenarios[0]!;
	});

	/** Librerías con datos en el escenario actual, ordenadas de más rápida a más lenta */
	const activeLibNames = computed(() =>
		libNames
			.filter((lib) => currentScenario.value.values[lib] != null)
			.sort(
				(libA, libB) =>
					(currentScenario.value.values[libB] ?? 0) -
					(currentScenario.value.values[libA] ?? 0)
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

	// ─── Sub-composables (SRP) ────────────────────────────────

	const { isOverflow, barPercent } = useBenchmarkScale(
		currentScenario,
		activeLibNames
	);

	const { formatOps, featureIcon, formatNote } = useBenchmarkFormatters(
		currentScenario,
		isEs
	);

	const {
		hoveredLib,
		tooltipX,
		tooltipY,
		tooltipIsRight,
		onBarMouseEnter,
		onBarMouseLeave,
	} = useBenchmarkInteractions();

	return {
		// Datos estáticos
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

		// Escala (useBenchmarkScale)
		isOverflow,
		barPercent,

		// Formateadores (useBenchmarkFormatters)
		formatOps,
		featureIcon,
		formatNote,

		// Interacciones (useBenchmarkInteractions)
		onBarMouseEnter,
		onBarMouseLeave,
	};
}
