<script setup lang="ts">
import { useCustomFooter } from './CustomFooter';

const { socialLinks, footerMessage, footerCopyright, VPSocialLink } = useCustomFooter();
</script>

<template src="./CustomFooter.html" />

<style lang="scss" src="./CustomFooter.scss" scoped />
