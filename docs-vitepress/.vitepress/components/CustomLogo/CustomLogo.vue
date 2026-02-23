<script setup lang="ts">
import { useCustomLogo } from './CustomLogo';

const { site, homeLink, handleClick } = useCustomLogo();
</script>

<template src="./CustomLogo.html" />

<style lang="scss" src="./CustomLogo.scss" scoped />
