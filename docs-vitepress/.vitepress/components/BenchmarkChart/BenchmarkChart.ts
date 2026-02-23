import { ref, computed, watch } from 'vue';
import { useData } from 'vitepress';
import {
	scenarios,
	libraries,
	libNames,
	featureRows,
	appTypeOptions,
	matrixTypeOptions,
	featureCategoryOptions,
	libCategories,
} from './benchmark-chart.constants';
import { useBenchmarkScale } from './useBenchmarkScale';
import { useBenchmarkFormatters } from './useBenchmarkFormatters';
import { useBenchmarkInteractions } from './useBenchmarkInteractions';

export function useBenchmarkChart() {
	const { lang } = useData();

	// ─── Estado reactivo ──────────────────────────────────────

	const activeAppType = ref('all');
	const activeScenario = ref(scenarios[0]!.key);
	const activeMatrixType = ref('all');
	const disabledMatrixLibs = ref<string[]>([]);
	const disabledFeatureCategories = ref<string[]>([]);

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

	/** Feature matrix: librerías del tipo seleccionado (QuickModel siempre incluida) */
	const matrixLibsByType = computed(() =>
		activeMatrixType.value === 'all'
			? libNames
			: libNames.filter(
					(lib) =>
						lib === 'QuickModel' ||
						(libCategories[lib]?.includes(activeMatrixType.value) ??
							false)
				)
	);

	/**
	 * Feature matrix: todas las librerías siempre en el DOM.
	 * La visibilidad se controla con --hidden (CSS), no eliminando del DOM.
	 */
	const visibleMatrixLibNames = computed(() => [
		'QuickModel',
		...libNames.filter((lib) => lib !== 'QuickModel'),
	]);

	// Al cambiar el tipo, resetear las librerías desactivadas
	watch(activeMatrixType, () => {
		disabledMatrixLibs.value = [];
	});

	function toggleMatrixLib(lib: string): void {
		if (disabledMatrixLibs.value.includes(lib)) {
			disabledMatrixLibs.value = disabledMatrixLibs.value.filter(
				(cur) => cur !== lib
			);
		} else {
			disabledMatrixLibs.value = [...disabledMatrixLibs.value, lib];
		}
	}

	function isLibHidden(lib: string): boolean {
		if (disabledMatrixLibs.value.includes(lib)) return true;
		if (lib !== 'QuickModel' && !matrixLibsByType.value.includes(lib))
			return true;
		return false;
	}

	/** Filas visibles en la tabla de características según categorías activas */
	const visibleFeatureRows = computed(() =>
		disabledFeatureCategories.value.length === 0
			? featureRows
			: featureRows.filter(
					(row) =>
						!disabledFeatureCategories.value.includes(row.category)
				)
	);

	function toggleFeatureCategory(cat: string): void {
		const allKeys = featureCategoryOptions
			.filter((opt) => opt.key !== 'all')
			.map((opt) => opt.key);
		if (disabledFeatureCategories.value.includes(cat)) {
			disabledFeatureCategories.value =
				disabledFeatureCategories.value.filter((cur) => cur !== cat);
		} else {
			const next = [...disabledFeatureCategories.value, cat];
			// At least one category must remain visible
			if (next.length >= allKeys.length) return;
			disabledFeatureCategories.value = next;
		}
	}

	function isCategoryHidden(cat: string): boolean {
		return disabledFeatureCategories.value.includes(cat);
	}

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
		featureRows,
		appTypeOptions,
		matrixTypeOptions,
		featureCategoryOptions,

		// Estado reactivo
		activeAppType,
		activeScenario,
		activeMatrixType,
		disabledMatrixLibs,
		disabledFeatureCategories,
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
		matrixLibsByType,
		visibleMatrixLibNames,
		visibleFeatureRows,

		// Funciones
		toggleMatrixLib,
		toggleFeatureCategory,
		isLibHidden,
		isCategoryHidden,

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
