<script setup lang="ts">
import { useCommandTabs, TAB_ITEMS } from './CommandTabs';

const { activeTab, tabDirection, setTab } = useCommandTabs();
</script>

<template src="./CommandTabs.html"></template>

<style lang="scss" src="./CommandTabs.scss" scoped />
