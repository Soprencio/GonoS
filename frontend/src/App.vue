<script setup>
import DotsBackground from './components/DotsBackground.vue'
</script>

<template>
  <div class="app-shell">
    <DotsBackground />
    <div class="app-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
}

.app-content {
  position: relative;
  z-index: 1;
}
</style>