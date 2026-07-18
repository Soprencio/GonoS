<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useViewer } from '../../composables/useViewer.js'

const props = defineProps({
  src: { type: String, default: '' },
  format: { type: String, default: '' },
  mtlUrl: { type: String, default: '' },
  extraMap: { type: Object, default: () => ({}) },
  annotating: { type: Boolean, default: false }
})

const emit = defineEmits(['load', 'error', 'select', 'annotate-point'])

const canvasRef = ref(null)
const wrapperRef = ref(null)
const hasError = ref(false)

const viewer = useViewer(canvasRef)

const cursorStyle = computed(() => props.annotating ? 'crosshair' : 'grab')

function onClick(event) {
  const hit = viewer.raycast(event)
  if (hit) {
    viewer.selectObject(hit)
    emit('select', hit)
    if (props.annotating) {
      const point = hit.point
      const rect = canvasRef.value.getBoundingClientRect()
      emit('annotate-point', {
        worldPos: { x: point.x, y: point.y, z: point.z },
        screenPos: { x: event.clientX - rect.left, y: event.clientY - rect.top }
      })
    }
  } else if (!props.annotating) {
    viewer.deselectAll()
    emit('select', null)
  }
}

async function load() {
  if (!props.src || !props.format) return
  hasError.value = false
  console.log('[Viewer3D] load:', { format: props.format, mtlUrl: !!props.mtlUrl, extraKeys: Object.keys(props.extraMap) })
  try {
    await viewer.loadModel(props.src, props.format, props.mtlUrl || undefined, props.extraMap || undefined)
    emit('load')
  } catch {
    hasError.value = true
    emit('error', viewer.loadError.value)
  }
}

function handleRetry() { load() }

onMounted(() => { load() })
onUnmounted(() => {
  if (canvasRef.value) URL.revokeObjectURL(props.src)
})

defineExpose({
  projectToScreen: viewer.projectToScreen,
  registerFrameCallback: viewer.registerFrameCallback,
  focusOnPoint: viewer.focusOnPoint,
  resetCamera: viewer.resetCamera,
  isolateSelection: viewer.isolateSelection,
  showAll: viewer.showAll,
  extractHierarchy: viewer.extractHierarchy,
  deselectAll: viewer.deselectAll,
  getCanvasRect: viewer.getCanvasRect,
  selectedObject: viewer.selectedObject
})
</script>

<template>
  <div class="viewer-3d">
    <div class="toolbar">
      <button class="secondary" @click="viewer.resetCamera()" title="Resetear vista">Reset</button>
      <button
        class="secondary"
        :disabled="!viewer.selectedObject.value"
        @click="viewer.isolateSelection()"
        title="Aislar pieza seleccionada"
      >Aislar</button>
      <button class="secondary" @click="viewer.showAll()" title="Mostrar todo">Mostrar todo</button>
    </div>

    <div ref="wrapperRef" class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="viewer-canvas"
        :class="{ annotating }"
        :style="{ cursor: cursorStyle }"
        @click="onClick"
      />

      <slot name="overlay"></slot>

      <div v-if="viewer.loading.value" class="overlay">
        <div class="loader">
          <div class="spinner"></div>
          <p>Cargando modelo<span v-if="viewer.progress.value > 0"> ({{ viewer.progress.value }}%)</span>...</p>
          <p class="hint">Puede tardar unos segundos</p>
        </div>
      </div>

      <div v-else-if="viewer.loadError.value && hasError" class="overlay error-overlay">
        <div class="error-box">
          <p class="error-msg">{{ viewer.loadError.value }}</p>
          <div class="error-actions">
            <button class="secondary" @click="handleRetry">Reintentar</button>
            <slot name="fallback"></slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-3d {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
}

.toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  flex-shrink: 0;
}

.toolbar button {
  font-size: 0.8rem;
  padding: 5px 12px;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.viewer-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.viewer-canvas.annotating {
  cursor: crosshair;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 10;
}

.loader {
  text-align: center;
  color: #fff;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loader p {
  margin: 4px 0;
  font-size: 0.9rem;
}

.hint {
  font-size: 0.75rem;
  opacity: 0.7;
}

.error-overlay { background: rgba(0,0,0,0.6); }

.error-box {
  text-align: center;
  padding: 20px;
  max-width: 320px;
}

.error-msg {
  color: #fff;
  font-size: 0.9rem;
  margin: 0 0 16px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
