<script setup>
import { computed } from 'vue'
import { backgroundState } from '../state/background.js'

const currentMode = computed(() => {
  return backgroundState.modes.find(m => m.id === backgroundState.current) || backgroundState.modes[0]
})

const tooltipText = computed(() => {
  const current = currentMode.value.label
  return `Fondo: ${current} (clic para alternar)`
})

function handleClick() {
  backgroundState.toggleNext()
}

function handleKeyDown(e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    handleClick()
  }
}
</script>

<template>
  <button
    type="button"
    class="bg-toggle-btn"
    :title="tooltipText"
    :aria-label="tooltipText"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <!-- Icono Puntos -->
    <svg
      v-if="backgroundState.current === 'dots'"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="mode-icon"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
    </svg>

    <!-- Icono Cuadrícula Técnica -->
    <svg
      v-else-if="backgroundState.current === 'grid'"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="mode-icon"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>

    <!-- Icono Isométrico / Cubo Blueprint -->
    <svg
      v-else
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="mode-icon"
      aria-hidden="true"
    >
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="M12 12L4 7.5" />
    </svg>

    <span class="mode-label">{{ currentMode.label }}</span>
  </button>
</template>

<style scoped>
.bg-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 10px;
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  box-sizing: border-box;
  transition: color var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
  user-select: none;
}

.bg-toggle-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-bg-elevated);
}

.bg-toggle-btn:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.mode-icon {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.bg-toggle-btn:hover .mode-icon {
  transform: scale(1.1);
}

.mode-label {
  white-space: nowrap;
}

@media (max-width: 680px) {
  .mode-label {
    display: none;
  }
  .bg-toggle-btn {
    padding: 0 7px;
  }
}
</style>
