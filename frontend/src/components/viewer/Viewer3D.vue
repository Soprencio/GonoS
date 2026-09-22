<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useViewer } from '../../composables/useViewer.js'
import ViewCube from './ViewCube.vue'
import MeasureTool from './MeasureTool.vue'

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
const showShortcuts = ref(false)
const measuring = ref(false)

const viewer = useViewer(canvasRef)

const cursorStyle = computed(() => (props.annotating || measuring.value) ? 'crosshair' : 'grab')

function onClick(event) {
  if (measuring.value) return
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

function toggleShortcuts() {
  showShortcuts.value = !showShortcuts.value
}

function toggleMeasuring() {
  measuring.value = !measuring.value
}

function handleKeyDown(e) {
  const tag = e.target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return

  if (e.code === 'Space') {
    e.preventDefault()
    viewer.resetCamera()
  } else if (e.key === 'w' || e.key === 'W') {
    viewer.toggleWireframe()
  } else if (e.key === 'f' || e.key === 'F') {
    viewer.toggleCamera()
  } else if (e.key === 'm' || e.key === 'M') {
    toggleMeasuring()
  } else if (e.key === 'Escape') {
    if (measuring.value) {
      measuring.value = false
    } else if (showShortcuts.value) {
      showShortcuts.value = false
    } else {
      viewer.deselectAll()
      emit('select', null)
    }
  } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    showShortcuts.value = !showShortcuts.value
  }
}

onMounted(() => {
  load()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (canvasRef.value) URL.revokeObjectURL(props.src)
})

defineExpose({
  projectToScreen: viewer.projectToScreen,
  registerFrameCallback: viewer.registerFrameCallback,
  focusOnPoint: viewer.focusOnPoint,
  resetCamera: viewer.resetCamera,
  isolateSelection: viewer.isolateSelection,
  showAll: viewer.showAll,
  selectUuid: viewer.selectUuid,
  extractHierarchy: viewer.extractHierarchy,
  deselectAll: viewer.deselectAll,
  getCanvasRect: viewer.getCanvasRect,
  selectedObject: viewer.selectedObject,
  isWireframe: viewer.isWireframe,
  toggleWireframe: viewer.toggleWireframe,
  measuring,
  toggleMeasuring
})
</script>

<template>
  <div class="viewer-3d">
    <div class="toolbar">
      <button class="secondary" @click="viewer.resetCamera()" title="Resetear vista (Espacio)">Reset</button>
      <button
        class="secondary"
        :disabled="!viewer.selectedObject.value"
        @click="viewer.isolateSelection()"
        title="Aislar pieza seleccionada"
      >Aislar</button>
      <button class="secondary" @click="viewer.showAll()" title="Mostrar todo">Mostrar todo</button>
      <button
        class="secondary"
        :class="{ active: viewer.isWireframe.value }"
        @click="viewer.toggleWireframe()"
        title="Alternar modo Wireframe (W)"
      >
        Wireframe
      </button>
      <button class="secondary" @click="viewer.toggleCamera()" title="Alternar vista Flat / Perspectiva (F)">
        {{ viewer.cameraType.value === 'perspective' ? 'Flat' : 'Persp' }}
      </button>
      <button
        class="secondary"
        :class="{ active: measuring }"
        @click="toggleMeasuring"
        title="Herramienta de medición 3D (M)"
      >
        📏 Medir
      </button>

      <div class="toolbar-spacer"></div>

      <button
        class="secondary shortcuts-btn"
        :class="{ active: showShortcuts }"
        @click="toggleShortcuts"
        title="Atajos de teclado y controles (?)"
      >
        ⌨️ Atajos
      </button>
    </div>

    <div ref="wrapperRef" class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="viewer-canvas"
        :class="{ annotating }"
        :style="{ cursor: cursorStyle }"
        @click="onClick"
      />

      <ViewCube v-if="viewer.modelInfo.value.name && !viewer.loading.value" :viewer="viewer" />

      <MeasureTool
        v-if="measuring"
        :viewer="viewer"
        :active="measuring"
        @close="measuring = false"
      />

      <slot name="overlay"></slot>

      <!-- 3D Geometric Wireframe Loader -->
      <div v-if="viewer.loading.value" class="overlay">
        <div class="loader-container">
          <div class="cube-wireframe-loader">
            <div class="wireframe-cube">
              <div class="cube-face front"></div>
              <div class="cube-face back"></div>
              <div class="cube-face right"></div>
              <div class="cube-face left"></div>
              <div class="cube-face top"></div>
              <div class="cube-face bottom"></div>
            </div>
          </div>
          <div class="loader-info font-mono">
            <div class="loader-percentage">
              {{ viewer.progress.value > 0 ? viewer.progress.value + '%' : 'Cargando...' }}
            </div>
            <div class="loader-progress-track">
              <div
                class="loader-progress-bar"
                :style="{ width: (viewer.progress.value > 0 ? viewer.progress.value : 100) + '%' }"
                :class="{ indeterminate: viewer.progress.value === 0 }"
              ></div>
            </div>
            <p class="loader-phase">
              {{ viewer.progress.value > 0 && viewer.progress.value < 100 ? 'Descargando geometría 3D...' : 'Inicializando mallas y escena...' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="viewer.loadError.value && hasError" class="overlay error-overlay">
        <div class="error-box">
          <p class="error-msg">{{ viewer.loadError.value }}</p>
          <div class="error-actions">
            <button class="secondary" @click="handleRetry">Reintentar</button>
            <slot name="fallback"></slot>
          </div>
        </div>
      </div>

      <!-- Keyboard Shortcuts Popover Cheatsheet -->
      <div v-if="showShortcuts" class="shortcuts-overlay" @click.self="showShortcuts = false">
        <div class="shortcuts-card">
          <div class="shortcuts-header">
            <div class="shortcuts-title">
              <span class="shortcuts-icon">⌨️</span>
              <h3>Atajos y Controles 3D</h3>
            </div>
            <button class="close-btn" @click="showShortcuts = false">&times;</button>
          </div>
          <div class="shortcuts-list">
            <div class="shortcut-row">
              <span class="shortcut-desc">Resetear vista / centrar</span>
              <kbd>Espacio</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Alternar Wireframe</span>
              <kbd>W</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Alternar Flat / Persp</span>
              <kbd>F</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Regla / Medición 3D</span>
              <kbd>M</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Deseleccionar / Cerrar</span>
              <kbd>Esc</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Orbitar / Rotar</span>
              <kbd>Click Izq + Arrastre</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Paneado (Pan)</span>
              <kbd>Click Der. o Shift</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Zoom</span>
              <kbd>Rueda del ratón</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Abrir / Cerrar atajos</span>
              <kbd>?</kbd>
            </div>
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
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  flex-shrink: 0;
}

.toolbar button {
  font-size: 0.8rem;
  padding: 5px 12px;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.toolbar button.active {
  background: var(--color-accent);
  color: var(--color-white);
  border-color: var(--color-accent);
}

.toolbar-spacer {
  flex: 1;
}

.shortcuts-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.canvas-wrapper canvas {
  pointer-events: auto;
}

.viewer-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.viewer-canvas.annotating {
  cursor: crosshair;
}

/* Overlays */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 10;
}

/* 3D Geometric Wireframe Loader */
.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  width: 240px;
}

.cube-wireframe-loader {
  width: 50px;
  height: 50px;
  perspective: 200px;
  margin: 10px 0 20px;
}

.wireframe-cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  animation: rotateWireframeCube 3.6s infinite linear;
}

.cube-face {
  position: absolute;
  width: 50px;
  height: 50px;
  border: 1.5px solid var(--color-accent);
  background: var(--color-accent-soft);
  box-shadow: inset 0 0 10px var(--color-accent-soft);
}

.cube-face.front  { transform: rotateY(0deg) translateZ(25px); }
.cube-face.back   { transform: rotateY(180deg) translateZ(25px); }
.cube-face.right  { transform: rotateY(90deg) translateZ(25px); }
.cube-face.left   { transform: rotateY(-90deg) translateZ(25px); }
.cube-face.top    { transform: rotateX(90deg) translateZ(25px); }
.cube-face.bottom { transform: rotateX(-90deg) translateZ(25px); }

@keyframes rotateWireframeCube {
  0% { transform: rotateX(15deg) rotateY(0deg) rotateZ(0deg); }
  50% { transform: rotateX(45deg) rotateY(180deg) rotateZ(20deg); }
  100% { transform: rotateX(15deg) rotateY(360deg) rotateZ(0deg); }
}

.loader-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.loader-percentage {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.5px;
}

.loader-progress-track {
  width: 100%;
  height: 5px;
  background: var(--color-bg-subtle);
  border-radius: 99px;
  overflow: hidden;
  position: relative;
}

.loader-progress-bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: 99px;
  transition: width 200ms ease;
  box-shadow: 0 0 8px var(--color-accent);
}

.loader-progress-bar.indeterminate {
  animation: indeterminateBar 1.5s infinite linear;
}

@keyframes indeterminateBar {
  0% { transform: translateX(-100%); width: 40%; }
  50% { transform: translateX(50%); width: 60%; }
  100% { transform: translateX(200%); width: 40%; }
}

.loader-phase {
  font-family: var(--font-family);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
  text-align: center;
}

/* Error Overlay */
.error-overlay { background: rgba(0, 0, 0, 0.65); }

.error-box {
  text-align: center;
  padding: 24px;
  max-width: 340px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.9rem;
  margin: 0 0 16px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Shortcuts Overlay & Card */
.shortcuts-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 20;
}

.shortcuts-card {
  width: 90%;
  max-width: 380px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: popIn 0.15s ease-out;
}

@keyframes popIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shortcuts-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcuts-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.shortcuts-icon {
  font-size: 1.1rem;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.3rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
}

.shortcut-desc {
  color: var(--color-text-muted);
}

kbd {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  box-shadow: 0 1.5px 0 var(--color-border);
}
</style>
