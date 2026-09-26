<script setup>
import { ref } from 'vue'
import { useDevTools } from '../composables/useDevTools.js'
import { useToast } from '../composables/useToast.js'
import { useConfirm } from '../composables/useConfirm.js'

const isOpen = ref(false)
const { state: devState, toggleForceSkeletons, simulateLoading } = useDevTools()
const toast = useToast()
const { confirm } = useConfirm()

function testSuccessToast() {
  toast.success('¡Operación completada con éxito!')
}

function testErrorToast() {
  toast.error('Ocurrió un error al procesar la solicitud.')
}

function testInfoToast() {
  toast.info('Nueva actualización de cátedra disponible.')
}

async function testConfirmModal() {
  const result = await confirm({
    title: '¿Confirmar acción de prueba?',
    message: 'Esta es una demostración del modal geométrico sin ventanas bloqueantes del navegador.',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    danger: true
  })

  if (result) {
    toast.success('Acción confirmada desde el modal')
  } else {
    toast.info('Acción cancelada')
  }
}
</script>

<template>
  <aside class="dev-tools-wrapper" aria-label="Herramientas de Desarrollador">
    <!-- Botón flotante colapsado -->
    <button
      v-if="!isOpen"
      type="button"
      class="dev-trigger-btn"
      title="Abrir herramientas de prueba de UX"
      @click="isOpen = true"
    >
      <span class="icon">🧪</span>
      <span class="label">Dev UX</span>
    </button>

    <!-- Panel expandido -->
    <div v-else class="dev-panel">
      <div class="dev-header">
        <div class="dev-title">
          <span class="icon">🧪</span>
          <h4>Pruebas de UX (Dev)</h4>
        </div>
        <button
          type="button"
          class="dev-close-btn"
          title="Cerrar panel"
          @click="isOpen = false"
        >
          ✕
        </button>
      </div>

      <div class="dev-body">
        <!-- SECCIÓN IDEA 1 -->
        <div class="dev-section">
          <span class="section-badge">Idea 1</span>
          <p class="section-title">Skeletons & Shimmer</p>
          <div class="btn-group">
            <button
              type="button"
              class="dev-action-btn"
              :disabled="devState.isSimulatingLoading"
              @click="simulateLoading(2000)"
            >
              {{ devState.isSimulatingLoading ? 'Cargando (2s)...' : '⏳ Simular carga (2s)' }}
            </button>
            <button
              type="button"
              :class="['dev-action-btn', { active: devState.forceSkeletons }]"
              @click="toggleForceSkeletons"
            >
              {{ devState.forceSkeletons ? '🔓 Desactivar Skeletons' : '🔒 Forzar Skeletons ON' }}
            </button>
          </div>
        </div>

        <!-- SECCIÓN IDEA 2: TOASTS -->
        <div class="dev-section">
          <span class="section-badge">Idea 2</span>
          <p class="section-title">Sistema de Toasts</p>
          <div class="btn-group grid-3">
            <button type="button" class="dev-pill-btn success" @click="testSuccessToast">
              Éxito
            </button>
            <button type="button" class="dev-pill-btn error" @click="testErrorToast">
              Error
            </button>
            <button type="button" class="dev-pill-btn info" @click="testInfoToast">
              Info
            </button>
          </div>
        </div>

        <!-- SECCIÓN IDEA 2: MODAL -->
        <div class="dev-section">
          <span class="section-badge">Idea 2</span>
          <p class="section-title">Modal Geométrico</p>
          <button type="button" class="dev-action-btn" @click="testConfirmModal">
            💬 Probar Modal Confirm
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.dev-tools-wrapper {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 9998;
}

.dev-trigger-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all var(--transition-fast);
}

.dev-trigger-btn:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
}

.dev-panel {
  width: 290px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  overflow: hidden;
  animation: modal-in 0.2s ease-out;
}

.dev-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
}

.dev-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dev-title h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 600;
}

.dev-close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.dev-close-btn:hover {
  color: var(--color-text);
}

.dev-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dev-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-badge {
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.section-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-group.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.dev-action-btn {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.dev-action-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--color-bg-elevated);
}

.dev-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dev-action-btn.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

.dev-pill-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: opacity var(--transition-fast);
}

.dev-pill-btn.success {
  background: var(--color-success);
  color: #fff;
  border-color: var(--color-success);
}

.dev-pill-btn.error {
  background: var(--color-danger);
  color: #fff;
  border-color: var(--color-danger);
}

.dev-pill-btn.info {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.dev-pill-btn:hover {
  opacity: 0.88;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
