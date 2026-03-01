<script setup lang="ts">
import { IDE_ITEMS, PM_ITEMS, useIDECommandTabs } from './IDECommandTabs';
import type { IScenario } from './IDECommandTabs';

const props = defineProps<{ scenario: IScenario }>();

const {
	activeIDE,
	activePM,
	pmDirection,
	setIDE,
	setPM,
	configPath,
	scopeNote,
	configJson,
} = useIDECommandTabs(props.scenario);
</script>

<template src="./IDECommandTabs.html"></template>

<style lang="scss" src="./IDECommandTabs.scss" scoped />
