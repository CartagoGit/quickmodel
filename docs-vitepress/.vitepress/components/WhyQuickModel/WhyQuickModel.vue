<script setup lang="ts">
import { useWhyQuickModel } from './WhyQuickModel';

const {
	t,
	activeMainTab,
	mainTabDirection,
	setMainTab,
	mainTabItems,
	activeInstallTab,
	installTabDirection,
	setInstallTab,
	installTabItems,
	featureSections,
	installCmds,
	codeEntryPoint,
	codeTsconfigLegacy,
	codeTsconfigTC39,
	codeFirstModel,
	highlighted,
} = useWhyQuickModel();
</script>

<template src="./WhyQuickModel.html"></template>

<style lang="scss" src="./WhyQuickModel.scss" scoped />
