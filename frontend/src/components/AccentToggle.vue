<script setup>
import { computed } from 'vue'
import { themeState } from '../state/theme.js'

const isOrange = computed(() => themeState.accent === 'orange')

function toggle() {
  themeState.toggleAccent()
}

function handleKeyDown(e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    toggle()
  }
}
</script>

<template>
  <button
    type="button"
    class="accent-switch"
    role="switch"
    :aria-checked="isOrange"
    :title="isOrange ? 'Cambiar a acento azul' : 'Cambiar a acento naranja'"
    @click="toggle"
    @keydown="handleKeyDown"
  >
    <!-- Indicador izquierdo (Azul) -->
    <span class="track-dot track-blue" aria-hidden="true" title="Azul"></span>

    <!-- Indicador derecho (Naranja) -->
    <span class="track-dot track-orange" aria-hidden="true" title="Naranja"></span>

    <!-- Botón deslizable (Thumb) -->
    <span :class="['thumb', { 'thumb-orange': isOrange }]">
      <!-- Icono de paleta / gota blanca dentro del botón -->
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="thumb-icon" aria-hidden="true">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
      </svg>
    </span>
  </button>
</template>

<style scoped>
.accent-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 52px;
  height: 28px;
  padding: 0 7px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
  user-select: none;
}

.accent-switch:hover {
  border-color: var(--color-accent);
}

.accent-switch:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.track-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.55;
  transition: opacity var(--transition-fast);
}

.track-blue {
  background: var(--color-palette-blue);
}

.track-orange {
  background: var(--color-palette-orange);
}

.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-palette-blue);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.28s ease,
              box-shadow 0.28s ease;
  transform: translateX(0);
}

.thumb-orange {
  transform: translateX(24px);
  background: var(--color-palette-orange);
}

.thumb-icon {
  color: var(--color-white);
  display: block;
}
</style>
