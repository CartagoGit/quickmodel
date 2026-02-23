<script setup lang="ts">
import { useBenchmarkChart } from './BenchmarkChart';

const {
	libraries,
	featureRows,
	appTypeOptions,
	matrixTypeOptions,
	featureCategoryOptions,
	activeAppType,
	activeScenario,
	activeMatrixType,
	disabledMatrixLibs,
	disabledFeatureCategories,
	hoveredLib,
	tooltipX,
	tooltipY,
	isEs,
	filteredScenarios,
	currentScenario,
	activeLibNames,
	excludedLibNames,
	matrixLibsByType,
	visibleMatrixLibNames,
	toggleMatrixLib,
	toggleFeatureCategory,
	isLibHidden,
	isCategoryHidden,
	isOverflow,
	barPercent,
	formatOps,
	featureIcon,
	formatNote,
	onBarMouseEnter,
	onBarMouseLeave,
} = useBenchmarkChart();
</script>

<template src="./BenchmarkChart.html" />

<style lang="scss" src="./BenchmarkChart.scss" scoped />
