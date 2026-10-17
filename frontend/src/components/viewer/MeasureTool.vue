<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  viewer: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'clear'])

const pointA = ref(null)
const pointB = ref(null)
const hoverPoint = ref(null)

const screenA = ref(null)
const screenB = ref(null)
const screenHover = ref(null)
const screenMid = ref(null)

// Distancias calculadas
const measurement = computed(() => {
  const pA = pointA.value
  const pB = pointB.value || hoverPoint.value
  if (!pA || !pB) return null

  const dx = pB.x - pA.x
  const dy = pB.y - pA.y
  const dz = pB.z - pA.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

  return {
    total: distance.toFixed(3),
    dx: Math.abs(dx).toFixed(3),
    dy: Math.abs(dy).toFixed(3),
    dz: Math.abs(dz).toFixed(3),
    isConfirmed: !!pointB.value
  }
})

function updateScreenPositions() {
  if (pointA.value) {
    screenA.value = props.viewer.projectToScreen(pointA.value)
  } else {
    screenA.value = null
  }

  if (pointB.value) {
    screenB.value = props.viewer.projectToScreen(pointB.value)
  } else {
    screenB.value = null
  }

  if (!pointB.value && hoverPoint.value) {
    screenHover.value = props.viewer.projectToScreen(hoverPoint.value)
  } else {
    screenHover.value = null
  }

  // Punto medio para el cartel de cota
  const pA = pointA.value
  const pB = pointB.value || hoverPoint.value
  if (pA && pB) {
    const mid3D = {
      x: (pA.x + pB.x) * 0.5,
      y: (pA.y + pB.y) * 0.5,
      z: (pA.z + pB.z) * 0.5
    }
    screenMid.value = props.viewer.projectToScreen(mid3D)
  } else {
    screenMid.value = null
  }
}

let pointerDownPos = null

function onPointerDown(e) {
  if (!props.active || e.button !== 0) return
  if (e.target.closest('.measure-bar') || e.target.closest('.measure-card') || e.target.closest('.toolbar') || e.target.closest('.shortcuts-overlay') || e.target.closest('.view-cube')) {
    pointerDownPos = null
    return
  }
  pointerDownPos = { x: e.clientX, y: e.clientY }
}

function onPointerUp(e) {
  if (!props.active || !pointerDownPos || e.button !== 0) {
    pointerDownPos = null
    return
  }
  if (e.target.closest('.measure-bar') || e.target.closest('.measure-card') || e.target.closest('.toolbar') || e.target.closest('.shortcuts-overlay') || e.target.closest('.view-cube')) {
    pointerDownPos = null
    return
  }

  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y)
  pointerDownPos = null

  // Si fue un arrastre para orbitar o panear la cámara, ignorar
  if (dist > 6) return

  const hit = props.viewer.raycast(e)
  if (!hit || !hit.point) return

  const pt = { x: hit.point.x, y: hit.point.y, z: hit.point.z }

  if (!pointA.value) {
    pointA.value = pt
    pointB.value = null
    hoverPoint.value = null
  } else if (!pointB.value) {
    pointB.value = pt
    hoverPoint.value = null
  } else {
    // Si ya había una medición confirmada, empezar una nueva desde este punto
    pointA.value = pt
    pointB.value = null
    hoverPoint.value = null
  }
  updateScreenPositions()
}

function onCanvasMouseMove(e) {
  if (!props.active || !pointA.value || pointB.value) {
    hoverPoint.value = null
    return
  }
  const hit = props.viewer.raycast(e)
  if (hit && hit.point) {
    hoverPoint.value = { x: hit.point.x, y: hit.point.y, z: hit.point.z }
  } else {
    hoverPoint.value = null
  }
  updateScreenPositions()
}

function resetMeasurement() {
  pointA.value = null
  pointB.value = null
  hoverPoint.value = null
  screenA.value = null
  screenB.value = null
  screenHover.value = null
  screenMid.value = null
  emit('clear')
}

let unregisterFrame = null

onMounted(() => {
  unregisterFrame = props.viewer.registerFrameCallback(updateScreenPositions)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointermove', onCanvasMouseMove)
})

onUnmounted(() => {
  if (unregisterFrame) unregisterFrame()
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointermove', onCanvasMouseMove)
})
</script>

<template>
  <div class="measure-tool-overlay">
    <!-- Barra superior de instrucciones de medición -->
    <div class="measure-bar">
      <div class="measure-status">
        <span class="measure-icon">📏</span>
        <span v-if="!pointA" class="status-msg">
          Paso 1: Hacé clic sobre el modelo para marcar el <strong>Punto A</strong>
        </span>
        <span v-else-if="!pointB" class="status-msg">
          Paso 2: Hacé clic para fijar el <strong>Punto B</strong>
        </span>
        <span v-else class="status-msg">
          Medición completada. Podés hacer clic para iniciar otra o limpiar.
        </span>
      </div>

      <div class="measure-actions">
        <button
          v-if="pointA"
          type="button"
          class="mini-btn"
          title="Limpiar puntos de medición"
          @click="resetMeasurement"
        >
          Limpiar
        </button>
        <button
          type="button"
          class="mini-btn close-btn"
          title="Cerrar regla"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>
    </div>

    <!-- Líneas y Cotas Técnicas en SVG -->
    <svg class="measure-svg" width="100%" height="100%">
      <!-- Línea entre Punto A y Punto B (o hover) -->
      <line
        v-if="screenA && (screenB || screenHover)"
        :x1="screenA.x"
        :y1="screenA.y"
        :x2="(screenB || screenHover).x"
        :y2="(screenB || screenHover).y"
        class="measure-line"
        :class="{ tentative: !pointB }"
      />

      <!-- Cruz en Punto A -->
      <g v-if="screenA" :transform="`translate(${screenA.x}, ${screenA.y})`">
        <circle r="5" class="point-marker marker-a" />
        <line x1="-8" y1="0" x2="8" y2="0" class="point-cross" />
        <line x1="0" y1="-8" x2="0" y2="8" class="point-cross" />
      </g>

      <!-- Cruz en Punto B o hover -->
      <g
        v-if="screenB || screenHover"
        :transform="`translate(${(screenB || screenHover).x}, ${(screenB || screenHover).y})`"
      >
        <circle r="5" class="point-marker marker-b" :class="{ tentative: !pointB }" />
        <line x1="-8" y1="0" x2="8" y2="0" class="point-cross" />
        <line x1="0" y1="-8" x2="0" y2="8" class="point-cross" />
      </g>
    </svg>

    <!-- Indicador de Punto A -->
    <div
      v-if="screenA"
      class="point-label label-a font-mono"
      :style="{ left: `${screenA.x + 10}px`, top: `${screenA.y - 12}px` }"
    >
      A
    </div>

    <!-- Indicador de Punto B -->
    <div
      v-if="screenB || screenHover"
      class="point-label label-b font-mono"
      :style="{ left: `${(screenB || screenHover).x + 10}px`, top: `${(screenB || screenHover).y - 12}px` }"
    >
      {{ pointB ? 'B' : 'B provisional' }}
    </div>

    <!-- Tarjeta Flotante de Resultados de Medición (Caliper Card) -->
    <div
      v-if="measurement && screenMid"
      class="measure-card"
      :style="{ left: `${screenMid.x}px`, top: `${screenMid.y}px` }"
    >
      <div class="measure-card-header">
        <span class="card-tag font-mono">DISTANCIA 3D</span>
        <span class="total-dist font-mono">{{ measurement.total }} <small>u</small></span>
      </div>

      <!-- Desglose Ortogonal Delta XYZ -->
      <div class="delta-grid font-mono">
        <div class="delta-item delta-x">
          <span class="delta-axis">ΔX</span>
          <span class="delta-val">{{ measurement.dx }}</span>
        </div>
        <div class="delta-item delta-y">
          <span class="delta-axis">ΔY</span>
          <span class="delta-val">{{ measurement.dy }}</span>
        </div>
        <div class="delta-item delta-z">
          <span class="delta-axis">ΔZ</span>
          <span class="delta-val">{{ measurement.dz }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.measure-tool-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  overflow: hidden;
}

/* Barra superior de instrucciones */
.measure-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-accent);
  box-shadow: 0 4px 20px var(--color-accent-soft), var(--shadow-md);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  pointer-events: auto;
  animation: slideDown 0.2s ease-out;
  max-width: 90%;
}

@keyframes slideDown {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.measure-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--color-text);
}

.measure-icon {
  font-size: 1.1rem;
}

.measure-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-btn {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mini-btn:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.close-btn {
  font-size: 1.1rem;
  padding: 0 6px;
  line-height: 1;
}

/* Capa de trazado SVG */
.measure-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.measure-line {
  stroke: var(--color-accent);
  stroke-width: 2px;
  stroke-dasharray: none;
  filter: drop-shadow(0 0 3px var(--color-accent));
}

.measure-line.tentative {
  stroke-dasharray: 4 4;
  opacity: 0.8;
}

.point-marker {
  fill: var(--color-accent);
  stroke: var(--color-white);
  stroke-width: 2px;
}

.point-marker.tentative {
  opacity: 0.6;
}

.point-cross {
  stroke: var(--color-accent);
  stroke-width: 1.5px;
}

/* Etiquetas flotantes para puntos A y B */
.point-label {
  position: absolute;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  z-index: 18;
  box-shadow: var(--shadow-sm);
}

.label-a {
  background: var(--color-accent);
  color: var(--color-white);
}

.label-b {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
}

/* Tarjeta flotante de resultados (Caliper Card) */
.measure-card {
  position: absolute;
  transform: translate(-50%, -120%);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  box-shadow: var(--shadow-card-hover);
  pointer-events: auto;
  z-index: 20;
  min-width: 170px;
  animation: popIn 0.15s ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: translate(-50%, -110%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -120%) scale(1); }
}

.measure-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 5px;
  margin-bottom: 6px;
}

.card-tag {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
}

.total-dist {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--color-accent);
}

.total-dist small {
  font-size: 0.75rem;
  font-weight: 500;
}

/* Desglose Delta XYZ */
.delta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  font-size: 0.68rem;
  text-align: center;
}

.delta-item {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-subtle);
  padding: 3px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.delta-axis {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.delta-x .delta-axis { color: var(--color-danger); }
.delta-y .delta-axis { color: var(--color-success); }
.delta-z .delta-axis { color: var(--color-info); }

.delta-val {
  font-weight: 600;
  color: var(--color-text);
}
</style>
