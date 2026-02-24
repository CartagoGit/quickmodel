import { ref, computed, watch } from 'vue';
import { useI18n } from '../../composables/useI18n';
import type { IBenchScenario } from '@benchmarks/bench.types';
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

const TAB_ORDER = ['features', 'coverage', 'performance'] as const;
type ITab = (typeof TAB_ORDER)[number];

export function useBenchmarkChart() {
	const { lang, t } = useI18n();

	const bmt = computed(() => t.value.benchmark);

	/** Scenarios ordenados por etiqueta traducida (para los badges del tab Rendimiento) */
	const sortedScenarios = computed(() =>
		[...scenarios].sort((scnA, scnB) => {
			const scnLabels = bmt.value.scenarios as unknown as Record<
				string,
				{ label: string }
			>;
			const labelA = scnLabels[scnA.key]?.label ?? scnA.key;
			const labelB = scnLabels[scnB.key]?.label ?? scnB.key;
			return labelA.localeCompare(labelB, lang.value);
		})
	);

	/** Helper tipado para acceder a las notas de warning de una feature row */
	type IBmtFeaturesMap = Record<
		string,
		{ label: string; notes?: Record<string, string> }
	>;
	function featureNote(rowI18nKey: string, libI18nKey: string): string {
		const features = bmt.value.features as unknown as IBmtFeaturesMap;
		return features[rowI18nKey]?.notes?.[libI18nKey] ?? '';
	}

	// ─── Tab navigation ───────────────────────────

	const activeTab = ref<ITab>('features');
	const prevTabIndex = ref(0);

	const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

	const tabDirection = computed(() =>
		activeTabIndex.value >= prevTabIndex.value ? 'forward' : 'backward'
	);

	function setTab(tab: ITab): void {
		prevTabIndex.value = TAB_ORDER.indexOf(activeTab.value);
		activeTab.value = tab;
	}
	const tabItems = computed(() => [
		{ key: 'features', icon: '🎯', label: t.value.benchmark.tabFeatures },
		{ key: 'coverage', icon: '📊', label: t.value.benchmark.tabCoverage },
		{ key: 'performance', icon: '⚡', label: t.value.benchmark.tabPerf },
	]);

	const activeTabTitle = computed(() => {
		const bmt = t.value.benchmark;
		const map: Record<
			ITab,
			{ icon: string; title: string; subtitle: string }
		> = {
			features: {
				icon: '🎯',
				title: bmt.featureTitle,
				subtitle: bmt.featureSubtitle,
			},
			coverage: {
				icon: '📊',
				title: bmt.coverageTitle,
				subtitle: bmt.coverageSubtitle,
			},
			performance: {
				icon: '⚡',
				title: bmt.perfTitle,
				subtitle: bmt.perfSubtitle,
			},
		};
		return map[activeTab.value];
	});
	// ─── Estado reactivo ──────────────────────────

	const activeAppType = ref('all');
	const activeScenario = ref(
		sortedScenarios.value[0]?.key ?? scenarios[0].key
	);
	/** Tipos de librería activos (multi-select). Todos activos por defecto. */
	const activeMatrixTypes = ref<string[]>(
		matrixTypeOptions.map((opt) => opt.key)
	);
	const disabledMatrixLibs = ref<string[]>([]);
	const disabledFeatureCategories = ref<string[]>([]);

	const filteredScenarios = computed(() =>
		activeAppType.value === 'all'
			? scenarios
			: scenarios.filter((scn) =>
					scn.appTypes.includes(activeAppType.value)
				)
	);

	// Al cambiar el tipo, seleccionar el primer escenario disponible (orden alfabético)
	watch(activeAppType, () => {
		const scnLabels = bmt.value.scenarios as unknown as Record<
			string,
			{ label: string }
		>;
		const sorted = [...filteredScenarios.value].sort((scnA, scnB) => {
			const labelA = scnLabels[scnA.key]?.label ?? scnA.key;
			const labelB = scnLabels[scnB.key]?.label ?? scnB.key;
			return labelA.localeCompare(labelB, lang.value);
		});
		const first = sorted[0];
		if (first) activeScenario.value = first.key;
	});

	const currentScenario = computed(() => {
		const inFiltered = filteredScenarios.value.find(
			(scn) => scn.key === activeScenario.value
		);
		return inFiltered ?? filteredScenarios.value[0] ?? scenarios[0];
	});

	/** Librerías de referencia baseline: no compiten en el ranking, siempre al final
	 *  del chart y nunca se destacan como máximo en la coverage map. */
	const PLAIN_JS_REFS = new Set<string>(['Plain JS']);

	function isPlainJsLib(lib: string): boolean {
		return PLAIN_JS_REFS.has(lib);
	}

	/** Librerías con datos en el escenario actual, ordenadas de más rápida a más lenta.
	 *  Las librerías de referencia (Plain JS) se colocan siempre al final. */
	const activeLibNames = computed(() =>
		libNames
			.filter((lib) => currentScenario.value.values[lib] != null)
			.sort((libA, libB) => {
				const isRefA = PLAIN_JS_REFS.has(libA);
				const isRefB = PLAIN_JS_REFS.has(libB);
				if (isRefA && !isRefB) return 1;
				if (!isRefA && isRefB) return -1;
				return (
					(currentScenario.value.values[libB] ?? 0) -
					(currentScenario.value.values[libA] ?? 0)
				);
			})
	);

	/** Librerías sin datos en el escenario actual (excluidas) */
	const excludedLibNames = computed(() =>
		libNames.filter((lib) => currentScenario.value.values[lib] == null)
	);

	/** Ordenación estándar: QuickModel primero, Plain JS siempre al final, resto alfabético */
	function sortLibsDisplay(libs: string[]): string[] {
		return [...libs].sort((libA, libB) => {
			if (libA === 'QuickModel') return -1;
			if (libB === 'QuickModel') return 1;
			if (libA === 'Plain JS') return 1;
			if (libB === 'Plain JS') return -1;
			return libA.localeCompare(libB, lang.value);
		});
	}

	/** Tipos de librería ordenados alfabéticamente por etiqueta traducida */
	const sortedMatrixTypeOptions = computed(() =>
		[...matrixTypeOptions].sort((optA, optB) => {
			const types = bmt.value.matrixTypes as Record<string, string>;
			return (types[optA.key] ?? optA.key).localeCompare(
				types[optB.key] ?? optB.key,
				lang.value
			);
		})
	);

	/** Feature matrix: librerías de los tipos activos (QuickModel siempre incluida), ordenadas alfabéticamente */
	const matrixLibsByType = computed(() => {
		const base = libNames.filter(
			(lib) =>
				lib === 'QuickModel' ||
				(libCategories[lib]?.some((cat) =>
					activeMatrixTypes.value.includes(cat)
				) ??
					false)
		);
		return sortLibsDisplay(base);
	});

	/**
	 * Feature matrix: todas las librerías siempre en el DOM.
	 * QuickModel primero, Plain JS último, resto alfabético.
	 * La visibilidad se controla con --hidden (CSS), no eliminando del DOM.
	 */
	const visibleMatrixLibNames = computed(() => sortLibsDisplay(libNames));

	const coverageLibNames = computed(() => sortLibsDisplay(libNames));

	// Al cambiar los tipos activos, resetear las librerías desactivadas
	watch(activeMatrixTypes, () => {
		disabledMatrixLibs.value = [];
	});

	/** Activa/desactiva un tipo de librería; siempre queda al menos uno activo */
	function toggleMatrixType(typeKey: string): void {
		if (activeMatrixTypes.value.includes(typeKey)) {
			if (activeMatrixTypes.value.length <= 1) return;
			activeMatrixTypes.value = activeMatrixTypes.value.filter(
				(cur) => cur !== typeKey
			);
		} else {
			activeMatrixTypes.value = [...activeMatrixTypes.value, typeKey];
		}
	}

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

	/** Filas visibles en la tabla de características según categorías activas, ordenadas alfabéticamente */
	const visibleFeatureRows = computed(() => {
		const rows =
			disabledFeatureCategories.value.length === 0
				? featureRows
				: featureRows.filter(
						(row) =>
							!disabledFeatureCategories.value.includes(
								row.category
							)
					);
		const featMap = bmt.value.features as unknown as IBmtFeaturesMap;
		return [...rows].sort((rowA, rowB) =>
			(featMap[rowA.i18nKey]?.label ?? rowA.i18nKey).localeCompare(
				featMap[rowB.i18nKey]?.label ?? rowB.i18nKey,
				lang.value
			)
		);
	});

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

	/** Formatea un valor numérico como badge compacto: 1249750 → "1.2M/s", 130378 → "130k/s" */
	function formatBadgeSpeed(val: number): string {
		if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M/s`;
		if (val >= 1_000) return `${Math.round(val / 1_000)}k/s`;
		return `${val}/s`;
	}

	/** Devuelve true si lib tiene el valor máximo en la columna del escenario dado,
	 *  excluyendo las librerías de referencia (Plain JS) del cálculo.
	 *  Considerando solo las librerías visibles en el coverage map. */
	function isColMax(lib: string, scn: IBenchScenario): boolean {
		if (PLAIN_JS_REFS.has(lib)) return false;
		const val = scn.values[lib];
		if (val == null) return false;
		const max = Math.max(
			...coverageLibNames.value
				.filter((name) => !PLAIN_JS_REFS.has(name))
				.map((name) => scn.values[name])
				.filter((val): val is number => val != null)
		);
		return val === max;
	}

	/** Salta al escenario indicado y activa el tab de Performance */
	function goToScenario(key: string): void {
		activeScenario.value = key;
		setTab('performance');
		const element = document.querySelector('.bm-wrapper');
		if (element)
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// ─── Sub-composables (SRP) ────────────────────────────────

	const { isOverflow, barPercent, overflowFillPercent, overflowRatio } =
		useBenchmarkScale(currentScenario, activeLibNames);

	/**
	 * Returns proportional overflow label based on how much the bar exceeds visualMax.
	 * ratio ≥ 10  → 'mucho más rápido' / 'much faster'
	 * ratio 3–10  → 'bastante más rápido' / 'noticeably faster'
	 * ratio < 3   → 'más rápido' / 'faster (overflow)'
	 */
	function overflowLabel(lib: string): string {
		const ratio = overflowRatio(lib);
		if (ratio >= 10) return bmt.value.muchFaster;
		if (ratio >= 3) return bmt.value.noticeablyFaster;
		return bmt.value.slightlyFaster;
	}

	const { formatOps, featureIcon } = useBenchmarkFormatters(currentScenario);

	const {
		hoveredLib,
		tooltipX,
		tooltipY,
		tooltipIsRight,
		onBarMouseEnter,
		onBarMouseLeave,
		warningTooltipText,
		warningTooltipX,
		warningTooltipY,
		onWarningMouseEnter,
		onWarningMouseLeave,
	} = useBenchmarkInteractions();

	// Cerrar cualquier tooltip abierto al cambiar de tab
	watch(activeTab, () => {
		onWarningMouseLeave();
		hoveredLib.value = null;
	});

	return {
		// Tab navigation
		activeTab,
		activeTabIndex,
		tabDirection,
		setTab,
		tabItems,
		activeTabTitle,

		// Datos estáticos
		libraries,
		featureRows,
		scenarios,
		libNames,
		appTypeOptions,
		matrixTypeOptions,
		featureCategoryOptions,

		// Estado reactivo
		activeAppType,
		activeScenario,
		activeMatrixTypes,
		disabledMatrixLibs,
		disabledFeatureCategories,
		hoveredLib,
		tooltipX,
		tooltipY,
		tooltipIsRight,

		// Warning tooltip (feature matrix)
		warningTooltipText,
		warningTooltipX,
		warningTooltipY,
		onWarningMouseEnter,
		onWarningMouseLeave,

		// Traducciones
		lang,
		t,
		bmt,
		featureNote,

		sortedMatrixTypeOptions,

		// Computados
		filteredScenarios,
		sortedScenarios,
		currentScenario,
		activeLibNames,
		excludedLibNames,
		matrixLibsByType,
		visibleMatrixLibNames,
		coverageLibNames,
		visibleFeatureRows,

		// Funciones
		toggleMatrixLib,
		toggleMatrixType,
		toggleFeatureCategory,
		isLibHidden,
		isCategoryHidden,
		isPlainJsLib,
		formatBadgeSpeed,
		goToScenario,
		isColMax,

		// Escala (useBenchmarkScale)
		isOverflow,
		barPercent,
		overflowFillPercent,
		overflowRatio,
		overflowLabel,

		// Formateadores (useBenchmarkFormatters)
		formatOps,
		featureIcon,

		// Interacciones (useBenchmarkInteractions)
		onBarMouseEnter,
		onBarMouseLeave,
	};
}
