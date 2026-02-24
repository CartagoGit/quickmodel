<script setup lang="ts">
import { useQuickExamples } from './QuickExamples';

const {
	t,
	activeTab,
	tabDirection,
	setTab,
	tabItems,
	exampleBasic,
	exampleForms,
	exampleMocks,
	highlightedBasic,
	highlightedForms,
	highlightedMocks,
} = useQuickExamples();
</script>

<template src="./QuickExamples.html"></template>

<style lang="scss" src="./QuickExamples.scss" scoped />
