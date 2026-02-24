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
	const activeScenario = ref(scenarios[0].key);
	const activeMatrixType = ref('all');
	const disabledMatrixLibs = ref<string[]>([]);
	const disabledFeatureCategories = ref<string[]>([]);

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

	const coverageLibNames: string[] = [
		'QuickModel',
		...libNames.filter((lib) => lib !== 'QuickModel'),
	];

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
			...coverageLibNames
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
		activeMatrixType,
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

		// Computados
		filteredScenarios,
		currentScenario,
		activeLibNames,
		excludedLibNames,
		matrixLibsByType,
		visibleMatrixLibNames,
		coverageLibNames,
		visibleFeatureRows,

		// Funciones
		toggleMatrixLib,
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
