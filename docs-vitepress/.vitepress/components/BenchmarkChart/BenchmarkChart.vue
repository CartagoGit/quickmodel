<script setup lang="ts">
import { useBenchmarkChart } from './BenchmarkChart';

const {
	// Tab navigation
	activeTab,
	activeTabIndex,
	tabDirection,
	setTab,

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
	lang,
	t,
	lp,
	lpArr,
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
	formatOps,
	featureIcon,
	formatNote,
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
