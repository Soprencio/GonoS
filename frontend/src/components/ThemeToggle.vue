<script setup>
import { computed } from 'vue'
import { themeState } from '../state/theme.js'

const isDark = computed(() => themeState.current === 'dark')

function toggle() {
  themeState.toggle()
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
    class="theme-switch"
    role="switch"
    :aria-checked="isDark"
    :title="isDark ? 'Cambiar a modo claro (Blanco)' : 'Cambiar a modo oscuro (Negro)'"
    @click="toggle"
    @keydown="handleKeyDown"
  >
    <!-- Icono decorativo izquierdo (Sol) -->
    <span class="track-icon track-sun" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    </span>

    <!-- Icono decorativo derecho (Luna) -->
    <span class="track-icon track-moon" aria-hidden="true">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </span>

    <!-- Botón deslizable (Thumb) -->
    <span :class="['thumb', { 'thumb-dark': isDark }]">
      <!-- Icono dentro del botón -->
      <svg v-if="!isDark" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="thumb-icon sun">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
      </svg>
      <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="currentColor" class="thumb-icon moon">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </span>
  </button>
</template>

<style scoped>
.theme-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 52px;
  height: 28px;
  padding: 0 6px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
  user-select: none;
}

.theme-switch:hover {
  border-color: var(--color-accent);
}

.theme-switch:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.track-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  opacity: 0.6;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-bg-elevated);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.28s ease,
              color 0.28s ease,
              box-shadow 0.28s ease;
  transform: translateX(0);
}

.thumb-dark {
  transform: translateX(24px);
  background: var(--color-accent);
}

.thumb-icon {
  display: block;
}

.thumb-icon.sun {
  color: var(--color-accent);
}

.thumb-icon.moon {
  color: var(--color-white);
}
</style>
