<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  worldPos: { type: Object, required: true },
  projectFn: { type: Function, required: true },
  registerFrameFn: { type: Function, required: true },
  active: { type: Boolean, default: false },
  comentario: { type: Object, default: null }
})

const emit = defineEmits(['click', 'close'])

const style = ref({ left: '0px', top: '0px', display: 'none' })
const isHovered = ref(false)

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

function updatePosition() {
  const screen = props.projectFn(props.worldPos)
  if (screen && screen.z <= 1) {
    style.value = { left: `${screen.x}px`, top: `${screen.y}px`, display: 'block' }
  } else {
    style.value = { left: '0px', top: '0px', display: 'none' }
  }
}

function handleDocClick(e) {
  if (props.active && props.comentario) {
    const el = e.target.closest('.annotation-pin')
    if (!el) emit('close')
  }
}

let unregister
onMounted(() => {
  unregister = props.registerFrameFn(updatePosition)
  document.addEventListener('pointerdown', handleDocClick)
})
onUnmounted(() => {
  if (unregister) unregister()
  document.removeEventListener('pointerdown', handleDocClick)
})
</script>

<template>
  <div
    class="annotation-pin"
    :class="{ active, hovered: isHovered }"
    :style="style"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
    @click.stop="emit('click')"
  >
    <div class="pin-dot"></div>

    <!-- Popover / Tooltip de previsualización al pasar el mouse (hover, cuando no está activo) -->
    <div
      v-if="!active && isHovered && comentario"
      class="pin-preview-popover"
    >
      <div v-if="comentario.fecha" class="preview-date">
        {{ formatDate(comentario.fecha) }}
      </div>
      <div class="preview-text">
        {{ comentario.comentario }}
      </div>
    </div>

    <!-- Tooltip completo cuando está activo/seleccionado (sin nombre del docente) -->
    <div v-if="active && comentario" class="pin-tooltip" @click.stop>
      <div class="tooltip-header">
        <span class="tooltip-date">{{ formatDate(comentario.fecha) || 'Anotación' }}</span>
        <button class="tooltip-close" @click.stop="emit('close')" aria-label="Cerrar">&times;</button>
      </div>
      <div class="tooltip-text">{{ comentario.comentario }}</div>
    </div>
  </div>
</template>

<style scoped>
.annotation-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 20;
  cursor: pointer;
  pointer-events: all;
}

.pin-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-white);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.annotation-pin:hover .pin-dot,
.annotation-pin.active .pin-dot {
  transform: scale(1.35);
  box-shadow: 0 0 0 4px var(--color-accent-soft), 0 2px 8px rgba(0, 0, 0, 0.35);
}

/* Popover de previsualización (Hover) */
.pin-preview-popover {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 180px;
  max-width: 260px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  padding: 8px 11px;
  pointer-events: none;
  z-index: 25;
  animation: fadeIn 120ms ease;
}

.preview-date {
  font-size: 0.72rem;
  color: var(--color-accent);
  font-weight: 600;
  margin-bottom: 4px;
}

.preview-text {
  font-size: 0.8rem;
  color: var(--color-text);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

/* Tooltip completo (Activo) */
.pin-tooltip {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 200px;
  max-width: 280px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  padding: 10px 12px;
  pointer-events: all;
  z-index: 30;
  animation: fadeIn 140ms ease;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.tooltip-date {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-weight: 600;
}

.tooltip-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tooltip-close:hover {
  color: var(--color-text);
}

.tooltip-text {
  font-size: 0.82rem;
  color: var(--color-text);
  line-height: 1.5;
  word-wrap: break-word;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-50%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
}
</style>
