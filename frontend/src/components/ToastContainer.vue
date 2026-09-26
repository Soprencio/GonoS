<script setup>
import { useToast } from '../composables/useToast.js'

const { toasts, remove } = useToast()
</script>

<template>
  <Teleport to="body">
    <aside class="toast-container" aria-live="polite" aria-label="Notificaciones del sistema">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="item in toasts"
          :key="item.id"
          :class="['toast-card', item.type]"
          role="status"
        >
          <div class="toast-icon">
            <!-- Icono Success -->
            <svg v-if="item.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <!-- Icono Error -->
            <svg v-else-if="item.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <!-- Icono Info -->
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>

          <div class="toast-content">
            <p class="toast-message">{{ item.message }}</p>
          </div>

          <button
            class="toast-close"
            type="button"
            aria-label="Cerrar notificación"
            @click="remove(item.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </aside>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  pointer-events: none;
  max-width: 420px;
  width: calc(100% - 48px);
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-card {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.25s ease;
}

.toast-card.success {
  border-left-color: var(--color-success);
}
.toast-card.success .toast-icon {
  color: var(--color-success);
}

.toast-card.error {
  border-left-color: var(--color-danger);
}
.toast-card.error .toast-icon {
  color: var(--color-danger);
}

.toast-card.info {
  border-left-color: var(--color-accent);
}
.toast-card.info .toast-icon {
  color: var(--color-accent);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-message {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--color-text);
  word-break: break-word;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.toast-close:hover {
  color: var(--color-text);
}

/* Transiciones Vue */
.toast-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
