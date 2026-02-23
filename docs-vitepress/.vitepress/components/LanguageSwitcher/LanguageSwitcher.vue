<script setup lang="ts">
import { useLanguageSwitcher } from './LanguageSwitcher';

const { locales, currentLocale, currentLang, handleLanguageChange } =
	useLanguageSwitcher();
</script>

<template src="./LanguageSwitcher.html" />

<style lang="scss" src="./LanguageSwitcher.scss" scoped />
