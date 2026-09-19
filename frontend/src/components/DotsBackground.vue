<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  spacing: { type: Number, default: 48 },
  dotRadius: { type: Number, default: 2 },
  maxScale: { type: Number, default: 3 },
  influence: { type: Number, default: 280 },
  baseOpacity: { type: Number, default: 0.16 },
  maxOpacity: { type: Number, default: 0.7 },
  smoothing: { type: Number, default: 0.12 }
})

const canvasRef = ref(null)
let ctx = null
let rafId = 0
let width = 0
let height = 0
let mouseX = -9999
let mouseY = -9999
let colorRGB = [28, 28, 26]
let dots = []
let observer = null

function jitter(index, seed) {
  const h = (index * 374761393 + seed * 668265263) >>> 0
  return ((h % 1000) / 1000) - 0.5
}

function buildPoints() {
  dots = []
  const cols = Math.max(1, Math.ceil(width / props.spacing))
  const rows = Math.max(1, Math.ceil(height / props.spacing))
  let index = 0
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      dots.push({
        x: i * props.spacing + (j % 2 ? props.spacing * 0.5 : 0) + jitter(index, 1) * 8,
        y: j * props.spacing + jitter(index, 7) * 8,
        r: props.dotRadius,
        a: props.baseOpacity
      })
      index++
    }
  }
}

function readThemeColor() {
  const styles = getComputedStyle(document.documentElement)
  const raw = styles.getPropertyValue('--color-text').trim()
  const isDark = document.documentElement.hasAttribute('data-theme')
  const hex = raw || (isDark ? '#EDEDEA' : '#1C1C1A')
  const num = parseInt(hex.slice(1), 16)
  colorRGB = [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildPoints()
}

function frame() {
  rafId = requestAnimationFrame(frame)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = `rgb(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]})`

  const influence = props.influence
  const maxScale = props.maxScale
  const maxR = props.dotRadius * maxScale
  for (const d of dots) {
    const dx = d.x - mouseX
    const dy = d.y - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const f = dist < influence ? 1 - dist / influence : 0
    const targetR = props.dotRadius + (maxR - props.dotRadius) * f
    const targetA = props.baseOpacity + (props.maxOpacity - props.baseOpacity) * f
    d.r += (targetR - d.r) * props.smoothing
    d.a += (targetA - d.a) * props.smoothing

    ctx.globalAlpha = d.a < 0 ? 0 : d.a > 1 ? 1 : d.a
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function onPointerMove(e) {
  mouseX = e.clientX
  mouseY = e.clientY
}

function onPointerLeave() {
  mouseX = -9999
  mouseY = -9999
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  readThemeColor()
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerleave', onPointerLeave)
  observer = new MutationObserver(readThemeColor)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerleave', onPointerLeave)
  if (observer) observer.disconnect()
})
</script>

<template>
  <canvas ref="canvasRef" class="dots-bg" aria-hidden="true"></canvas>
</template>

<style scoped>
.dots-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>