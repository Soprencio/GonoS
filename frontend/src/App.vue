<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DotsBackground from './components/DotsBackground.vue'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import DevToolsPanel from './components/DevToolsPanel.vue'

const route = useRoute()
const showDots = computed(() => !route.meta?.hideDots)
</script>

<template>
  <div class="app-shell">
    <DotsBackground v-if="showDots" />
    <div class="app-content">
      <router-view />
    </div>
    <!-- Componentes Globales de UX -->
    <ToastContainer />
    <ConfirmModal />
    <DevToolsPanel />
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