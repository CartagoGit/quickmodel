<script setup lang="ts">
import { useBenchmarkChart } from './BenchmarkChart';

const {
	// Tab navigation
	activeTab,
	tabDirection,
	setTab,
	tabItems,

	libraries,
	featureRows,
	scenarios,
	libNames,
	matrixTypeOptions,
	featureCategoryOptions,
	activeScenario,
	activeMatrixType,
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
	toggleMatrixLib,
	toggleFeatureCategory,
	isLibHidden,
	isCategoryHidden,
	isOverflow,
	barPercent,
	overflowFillPercent,
	overflowRatio,
	overflowLabel,
	formatOps,
	featureIcon,
	formatBadgeSpeed,
	goToScenario,
	onBarMouseEnter,
	onBarMouseLeave,
	warningTooltipText,
	warningTooltipX,
	warningTooltipY,
	onWarningMouseEnter,
	onWarningMouseLeave,
} = useBenchmarkChart();
</script>

<template src="./BenchmarkChart.html"></template>

<style lang="scss" src="./BenchmarkChart.scss" scoped />
