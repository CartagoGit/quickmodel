<script setup lang="ts">
import { featureRows, libNames } from './benchmark-chart.constants';
import { useBenchmarkChart } from './BenchmarkChart';

const {
	libraries,
	appTypeOptions,
	activeAppType,
	activeScenario,
	hoveredLib,
	tooltipX,
	tooltipY,
	isEs,
	filteredScenarios,
	currentScenario,
	activeLibNames,
	excludedLibNames,
	matrixLibNames,
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

<style lang="scss" src="./BenchmarkChart.scss" scoped />
