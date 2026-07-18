<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  worldPos: { type: Object, required: true },
  projectFn: { type: Function, required: true },
  registerFrameFn: { type: Function, required: true },
  active: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const style = ref({ left: '0px', top: '0px', display: 'none' })

function updatePosition() {
  const screen = props.projectFn(props.worldPos)
  if (screen && screen.z <= 1) {
    style.value = { left: `${screen.x}px`, top: `${screen.y}px`, display: 'block' }
  } else {
    style.value = { left: '0px', top: '0px', display: 'none' }
  }
}

let unregister
onMounted(() => {
  unregister = props.registerFrameFn(updatePosition)
})
onUnmounted(() => {
  if (unregister) unregister()
})
</script>

<template>
  <div
    class="annotation-pin"
    :class="{ active }"
    :style="style"
    @click.stop="emit('click')"
    title="Ver comentario"
  >
    <div class="pin-dot"></div>
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
</style>
