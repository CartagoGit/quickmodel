<script setup lang="ts">
import { useTabBar, type ITabItem } from './TabBar';

const props = defineProps<{ tabs: ITabItem[]; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [key: string] }>();

const { activeTabIndex, setTab } = useTabBar(props, emit);
</script>

<template src="./TabBar.html"></template>

<style lang="scss" src="./TabBar.scss" scoped />
