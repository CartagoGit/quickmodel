<script setup lang="ts">
import { useBenchmarkChart } from './BenchmarkChart';
import type { IBenchmarkChartProps } from './BenchmarkChart.types';

const props = withDefaults(defineProps<IBenchmarkChartProps>(), {
	onlyScenarios: undefined,
	onlyLibs: undefined,
	onlyTabs: undefined,
	defaultTab: undefined,
});

const {
	// Tab navigation
	activeTab,
	tabDirection,
	setTab,
	tabItems,
	activeTabTitle,

	libraries,
	featureRows,
	scenarios,
	libNames,
	featureCategoryOptions,
	activeScenario,
	activeMatrixTypes,
	disabledMatrixLibs,
	disabledFeatureCategories,
	hoveredLib,
	tooltipX,
	tooltipY,
	t,
	bmt,
	featureNote,
	currentScenario,
	activeLibNames,
	excludedLibNames,
	matrixLibsByType,
	visibleMatrixLibNames,
	coverageLibNames,
	visibleFeatureRows,
	toggleMatrixLib,
	toggleMatrixType,
	toggleFeatureCategory,
	isLibHidden,
	isCategoryHidden,
	isPlainJsLib,
	isOverflow,
	barPercent,
	overflowFillPercent,
	overflowRatio,
	overflowLabel,
	formatOps,
	featureIcon,
	formatBadgeSpeed,
	goToScenario,
	sortedMatrixTypeOptions,
	sortedScenarios,
	isColMax,
	onBarMouseEnter,
	onBarMouseLeave,
	warningTooltipText,
	warningTooltipX,
	warningTooltipY,
	onWarningMouseEnter,
	onWarningMouseLeave,
} = useBenchmarkChart(props);
</script>

<template src="./BenchmarkChart.html"></template>

<style lang="scss" src="./BenchmarkChart.scss" scoped />
