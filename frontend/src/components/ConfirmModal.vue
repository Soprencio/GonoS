<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useConfirm } from '../composables/useConfirm.js'

const { state, handleConfirm, handleCancel } = useConfirm()

function onKeyDown(e) {
  if (!state.isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    handleCancel()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    handleConfirm()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="state.isOpen"
        class="confirm-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="state.title"
        @click.self="handleCancel"
      >
        <div class="confirm-box">
          <h3 class="confirm-title">{{ state.title }}</h3>
          <p v-if="state.message" class="confirm-message">{{ state.message }}</p>

          <div class="confirm-actions">
            <button
              type="button"
              class="btn-cancel"
              @click="handleCancel"
            >
              {{ state.cancelText }}
            </button>
            <button
              type="button"
              :class="['btn-action', state.danger ? 'danger' : 'primary']"
              @click="handleConfirm"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.confirm-box {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-card-hover);
  animation: modal-in 0.2s ease-out;
}

.confirm-title {
  margin: 0 0 10px 0;
  font-size: 1.15rem;
  color: var(--color-text);
  font-weight: 600;
}

.confirm-message {
  margin: 0 0 24px 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-cancel:hover {
  background: var(--color-bg-subtle);
}

.btn-action {
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 18px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.btn-action.primary {
  background: var(--color-accent);
  color: #fff;
}

.btn-action.danger {
  background: var(--color-danger);
  color: #fff;
}

.btn-action:hover {
  opacity: 0.9;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
