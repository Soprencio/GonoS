<script setup>
import { themeState } from '../state/theme.js'
</script>

<template>
  <button class="theme-toggle secondary" @click="themeState.toggle()">
    {{ themeState.current === 'light' ? '🌙' : '☀️' }}
  </button>
</template>

<style scoped>
.theme-toggle {
  font-size: 1.2rem;
  line-height: 1;
  padding: 6px 12px;
}
</style>
