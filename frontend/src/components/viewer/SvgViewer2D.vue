<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  annotating: { type: Boolean, default: false },
  comentarios: { type: Array, default: () => [] },
  activeId: { type: [Number, String], default: null },
  pending: { type: Object, default: null },
  showGrid: { type: Boolean, default: true },
  showAxes: { type: Boolean, default: true }
})

const emit = defineEmits(['annotate-point', 'select', 'close'])

const containerRef = ref(null)
const imgRef = ref(null)

const size = reactive({ w: 0, h: 0 })
const natural = reactive({ w: 0, h: 0 })
const view = reactive({ scale: 1, x: 0, y: 0 })

const mostrarGrilla = ref(props.showGrid)
const mostrarEjes = ref(props.showAxes)
const hoveredPinId = ref(null)

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

const MIN_SCALE = 0.01
const MAX_SCALE = 500
const TICK_PX = 60

let ro = null
let panning = null
let fitted = false

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

function niceStep(raw) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const frac = raw / pow
  let nf
  if (frac < 1.5) nf = 1
  else if (frac < 3) nf = 2
  else if (frac < 7) nf = 5
  else nf = 10
  return nf * pow
}

function fmt(n) {
  const r = Number(n.toFixed(3))
  const abs = Math.abs(r)
  if (abs >= 1e6 || (abs > 0 && abs < 1e-3)) return r.toExponential(0)
  return String(r)
}

function measureContainer() {
  const el = containerRef.value
  if (!el) return
  size.w = el.clientWidth
  size.h = el.clientHeight
}

function fit() {
  measureContainer()
  if (!size.w || !size.h || !natural.w || !natural.h) return
  const s = Math.min(size.w / natural.w, size.h / natural.h) * 0.92
  view.scale = s
  view.x = (size.w - natural.w * s) / 2
  view.y = (size.h - natural.h * s) / 2
  fitted = true
}

function onImgLoad() {
  const img = imgRef.value
  if (!img) return
  natural.w = img.naturalWidth || 300
  natural.h = img.naturalHeight || 150
  fit()
}

function onWheel(e) {
  e.preventDefault()
  const rect = containerRef.value.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const factor = Math.pow(1.0015, -e.deltaY)
  const ns = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE)
  const ix = (cx - view.x) / view.scale
  const iy = (cy - view.y) / view.scale
  view.scale = ns
  view.x = cx - ix * ns
  view.y = cy - iy * ns
}

function onMouseDown(e) {
  if (e.button === 2) {
    panning = {
      startX: e.clientX,
      startY: e.clientY,
      origX: view.x,
      origY: view.y
    }
    e.preventDefault()
  }
}

function onMouseMove(e) {
  if (!panning) return
  view.x = panning.origX + (e.clientX - panning.startX)
  view.y = panning.origY + (e.clientY - panning.startY)
}

function onMouseUp() {
  panning = null
}

function onClick(e) {
  if (!props.annotating || e.button !== 0 || panning) return
  const rect = containerRef.value.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const wx = (cx - view.x) / view.scale
  const wy = (cy - view.y) / view.scale
  emit('annotate-point', {
    worldPos: { x: wx, y: wy, z: 0 },
    screenPos: { x: cx, y: cy }
  })
}

function focusOnPoint(pos) {
  if (!pos) return
  view.x = size.w / 2 - pos.x * view.scale
  view.y = size.h / 2 - pos.y * view.scale
}

function handleDocClick(e) {
  if (props.activeId != null) {
    const el = e.target.closest('.annotation-pin')
    if (!el) emit('close')
  }
}

const imgStyle = computed(() => ({
  width: `${natural.w * view.scale}px`,
  height: `${natural.h * view.scale}px`,
  transform: `translate(${view.x}px, ${view.y}px)`
}))

const axes = computed(() => {
  const x0 = view.x
  const y0 = view.y
  return {
    x0,
    y0,
    showX: y0 >= -0.5 && y0 <= size.h + 0.5,
    showY: x0 >= -0.5 && x0 <= size.w + 0.5
  }
})

const grid = computed(() => {
  const s = Math.max(view.scale, 1e-6)
  const step = niceStep(TICK_PX / s)
  const xMin = (0 - view.x) / s
  const xMax = (size.w - view.x) / s
  const yMin = (0 - view.y) / s
  const yMax = (size.h - view.y) / s
  const vLines = []
  const hLines = []
  for (let k = Math.floor(xMin / step); k <= Math.ceil(xMax / step); k++) {
    if (k === 0) continue
    const imgX = k * step
    const sx = view.x + imgX * s
    if (sx < -0.5 || sx > size.w + 0.5) continue
    vLines.push({ sx, label: fmt(imgX) })
  }
  for (let k = Math.floor(yMin / step); k <= Math.ceil(yMax / step); k++) {
    if (k === 0) continue
    const imgY = k * step
    const sy = view.y + imgY * s
    if (sy < -0.5 || sy > size.h + 0.5) continue
    hLines.push({ sy, label: fmt(imgY) })
  }
  return { vLines, hLines }
})

function pinStyle(pos) {
  if (!pos) return { display: 'none' }
  return {
    left: `${view.x + pos.x * view.scale}px`,
    top: `${view.y + pos.y * view.scale}px`,
    display: 'block'
  }
}

onMounted(() => {
  const el = containerRef.value
  el.addEventListener('wheel', onWheel, { passive: false })
  ro = new ResizeObserver(() => {
    measureContainer()
    if (!fitted && natural.w && size.w && size.h) fit()
  })
  ro.observe(el)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  document.addEventListener('pointerdown', handleDocClick)
})

onUnmounted(() => {
  const el = containerRef.value
  if (el) el.removeEventListener('wheel', onWheel)
  if (ro) ro.disconnect()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('pointerdown', handleDocClick)
})

defineExpose({ focusOnPoint })
</script>

<template>
  <div
    ref="containerRef"
    class="svg-viewer2d"
    :class="{ annotating }"
    @contextmenu.prevent
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mousemove="onMouseMove"
    @click="onClick"
  >
    <img
      ref="imgRef"
      :src="src"
      class="svg-img"
      :style="imgStyle"
      draggable="false"
      @load="onImgLoad"
    />

    <div class="toolbar">
      <button
        class="secondary"
        :class="{ active: mostrarGrilla }"
        @click="mostrarGrilla = !mostrarGrilla"
      >
        {{ mostrarGrilla ? 'Esconder grilla' : 'Mostrar grilla' }}
      </button>
      <button
        class="secondary"
        :class="{ active: mostrarEjes }"
        @click="mostrarEjes = !mostrarEjes"
      >
        {{ mostrarEjes ? 'Esconder ejes' : 'Mostrar ejes' }}
      </button>
    </div>

    <svg class="grid-overlay" :width="size.w" :height="size.h">
      <defs>
        <marker id="svg-axis-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" class="axis-arrow"></path>
        </marker>
      </defs>

      <template v-if="mostrarGrilla">
        <line
          v-for="l in grid.vLines"
          :key="'v' + l.sx"
          :x1="l.sx" y1="0" :x2="l.sx" :y2="size.h"
          class="grid-line"
        />
        <line
          v-for="l in grid.hLines"
          :key="'h' + l.sy"
          x1="0" :y1="l.sy" :x2="size.w" :y2="l.sy"
          class="grid-line"
        />
      </template>

      <template v-if="mostrarEjes">
        <line
          v-if="axes.showX"
          :x1="0" :y1="axes.y0" :x2="size.w" :y2="axes.y0"
          class="axis-line"
          marker-end="url(#svg-axis-arrow)"
        />
        <line
          v-if="axes.showY"
          :x1="axes.x0" y1="0" :x2="axes.x0" :y2="size.h"
          class="axis-line"
          marker-end="url(#svg-axis-arrow)"
        />

        <text
          v-for="l in grid.vLines"
          :key="'vl' + l.sx"
          :x="l.sx"
          :y="axes.showX ? axes.y0 + 14 : size.h - 4"
          class="axis-label"
          text-anchor="middle"
        >{{ l.label }}</text>
        <text
          v-for="l in grid.hLines"
          :key="'hl' + l.sy"
          :x="axes.showY ? axes.x0 - 5 : 5"
          :y="l.sy + 3"
          class="axis-label"
          :text-anchor="axes.showY ? 'end' : 'start'"
        >{{ l.label }}</text>
      </template>
    </svg>

    <div
      v-for="c in comentarios"
      :key="c.com_priv_id"
      class="annotation-pin"
      :class="{ active: c.com_priv_id === activeId, hovered: hoveredPinId === c.com_priv_id }"
      :style="pinStyle(c.posicion)"
      @pointerenter="hoveredPinId = c.com_priv_id"
      @pointerleave="hoveredPinId = null"
      @click.stop="emit('select', c.com_priv_id)"
    >
      <div class="pin-dot"></div>

      <!-- Popover de previsualización al pasar el mouse (hover, sin nombre del docente) -->
      <div
        v-if="c.com_priv_id !== activeId && hoveredPinId === c.com_priv_id"
        class="pin-preview-popover"
      >
        <div v-if="c.fecha" class="preview-date">
          {{ formatDate(c.fecha) }}
        </div>
        <div class="preview-text">
          {{ c.comentario }}
        </div>
      </div>

      <!-- Tooltip completo cuando está activo/seleccionado (sin nombre del docente) -->
      <div v-if="c.com_priv_id === activeId" class="pin-tooltip" @click.stop>
        <div class="tooltip-header">
          <span class="tooltip-date">{{ formatDate(c.fecha) || 'Anotación' }}</span>
          <button class="tooltip-close" @click.stop="emit('close')" aria-label="Cerrar">&times;</button>
        </div>
        <div class="tooltip-text">{{ c.comentario }}</div>
      </div>
    </div>

    <div v-if="pending" class="pin-pending" :style="pinStyle(pending.worldPos)">
      <div class="pin-pending-dot"></div>
    </div>
  </div>
</template>

<style scoped>
.svg-viewer2d {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: var(--color-bg);
  cursor: grab;
  user-select: none;
}

.svg-viewer2d.annotating {
  cursor: crosshair;
}

.toolbar {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  gap: 6px;
  z-index: 40;
}

.toolbar button {
  font-size: 0.8rem;
  padding: 5px 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.toolbar button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toolbar button.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.svg-img {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  image-rendering: auto;
  pointer-events: none;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.grid-line {
  stroke: var(--color-border);
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0.6;
}

.axis-line {
  stroke: var(--color-accent);
  stroke-width: 1.5;
}

.axis-arrow {
  fill: var(--color-accent);
}

.axis-label {
  font-size: 10px;
  fill: var(--color-text-muted);
}

.annotation-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 20;
  cursor: pointer;
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
  pointer-events: auto;
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

.pin-pending {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 22;
  pointer-events: none;
}

.pin-pending-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-white);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
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
