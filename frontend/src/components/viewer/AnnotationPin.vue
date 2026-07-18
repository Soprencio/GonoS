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
    :class="{ active }"
    :style="style"
    @click.stop="emit('click')"
  >
    <div class="pin-dot"></div>
    <div v-if="active && comentario" class="pin-tooltip" @click.stop>
      <div class="tooltip-header">
        <span class="tooltip-profe">{{ comentario.profesor || 'Profesor' }}</span>
        <button class="tooltip-close" @click.stop="emit('close')">&times;</button>
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
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transition: transform 120ms ease;
}

.annotation-pin:hover .pin-dot,
.annotation-pin.active .pin-dot {
  transform: scale(1.3);
}

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
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 10px 12px;
  pointer-events: all;
  z-index: 30;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.tooltip-profe {
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
</style>
