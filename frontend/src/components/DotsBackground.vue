<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { backgroundState } from '../state/background.js'

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

let isDarkTheme = false

function readThemeColor() {
  const styles = getComputedStyle(document.documentElement)
  const raw = styles.getPropertyValue('--color-text').trim()
  isDarkTheme = document.documentElement.hasAttribute('data-theme')
  const hex = raw || (isDarkTheme ? '#EDEDEA' : '#1C1C1A')
  const num = parseInt(hex.replace('#', ''), 16)
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

// 1. Render Puntos Interactivos
function renderDots() {
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
}

// 2. Render Cuadrícula Técnica / Papel Milimetrado
function renderGrid() {
  const minorStep = 24
  const majorStep = 120
  const influence = props.influence * 1.1

  const baseCol = `rgb(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]})`

  // Minor lines
  ctx.strokeStyle = baseCol
  ctx.lineWidth = 1
  ctx.globalAlpha = isDarkTheme ? 0.03 : 0.05
  ctx.beginPath()
  for (let x = 0; x <= width; x += minorStep) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = 0; y <= height; y += minorStep) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  // Major lines
  ctx.globalAlpha = isDarkTheme ? 0.07 : 0.12
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let x = 0; x <= width; x += majorStep) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = 0; y <= height; y += majorStep) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  // Cursor spotlight halo & technical intersection marks
  if (mouseX > -100 && mouseX < width + 100 && mouseY > -100 && mouseY < height + 100) {
    const haloMaxAlpha = isDarkTheme ? 0.04 : 0.10
    const haloMidAlpha = isDarkTheme ? 0.01 : 0.03
    const grad = ctx.createRadialGradient(mouseX, mouseY, 10, mouseX, mouseY, influence)
    grad.addColorStop(0, `rgba(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]}, ${haloMaxAlpha})`)
    grad.addColorStop(0.6, `rgba(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]}, ${haloMidAlpha})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.fillRect(mouseX - influence, mouseY - influence, influence * 2, influence * 2)

    // Draw precision crosshairs at major nodes near cursor
    ctx.strokeStyle = baseCol
    ctx.lineWidth = 1.2
    const startX = Math.floor((mouseX - influence) / majorStep) * majorStep
    const endX = Math.ceil((mouseX + influence) / majorStep) * majorStep
    const startY = Math.floor((mouseY - influence) / majorStep) * majorStep
    const endY = Math.ceil((mouseY + influence) / majorStep) * majorStep

    const crossAlphaMax = isDarkTheme ? 0.12 : 0.32
    for (let x = startX; x <= endX; x += majorStep) {
      for (let y = startY; y <= endY; y += majorStep) {
        const d = Math.hypot(x - mouseX, y - mouseY)
        if (d < influence) {
          const alpha = (1 - d / influence) * crossAlphaMax
          ctx.globalAlpha = alpha
          ctx.beginPath()
          ctx.moveTo(x - 5, y)
          ctx.lineTo(x + 5, y)
          ctx.moveTo(x, y - 5)
          ctx.lineTo(x, y + 5)
          ctx.stroke()
        }
      }
    }
  }
}

// 3. Render Malla Isométrica Técnica (Blueprint 30° / 150° / 90°)
function renderIsometric() {
  const step = 44
  const influence = props.influence * 1.15
  const baseCol = `rgb(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]})`

  // Isometric angle values
  const sin30 = 0.5
  const cos30 = 0.86602540378
  const tan30 = sin30 / cos30

  // 1. Vertical lines
  ctx.strokeStyle = baseCol
  ctx.lineWidth = 1
  ctx.globalAlpha = isDarkTheme ? 0.035 : 0.06
  ctx.beginPath()
  for (let x = 0; x <= width; x += step * cos30 * 2) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  ctx.stroke()

  // 2. Diagonal lines (+30° and -30°)
  ctx.globalAlpha = isDarkTheme ? 0.035 : 0.06
  ctx.beginPath()
  const diagStep = step
  const maxDim = width + height * 2
  for (let offset = -height * 2; offset <= maxDim; offset += diagStep) {
    // Line angled up-right (+30°)
    ctx.moveTo(offset, 0)
    ctx.lineTo(offset + height / tan30, height)
    // Line angled down-right (-30°)
    ctx.moveTo(offset, 0)
    ctx.lineTo(offset - height / tan30, height)
  }
  ctx.stroke()

  // Cursor isometric spotlight & node highlights
  if (mouseX > -100 && mouseX < width + 100 && mouseY > -100 && mouseY < height + 100) {
    const haloMaxAlpha = isDarkTheme ? 0.045 : 0.12
    const haloMidAlpha = isDarkTheme ? 0.012 : 0.035
    const grad = ctx.createRadialGradient(mouseX, mouseY, 15, mouseX, mouseY, influence)
    grad.addColorStop(0, `rgba(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]}, ${haloMaxAlpha})`)
    grad.addColorStop(0.5, `rgba(${colorRGB[0]},${colorRGB[1]},${colorRGB[2]}, ${haloMidAlpha})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.fillRect(mouseX - influence, mouseY - influence, influence * 2, influence * 2)

    // Highlight nearby triangular grid intersections
    ctx.fillStyle = baseCol
    const xSpacing = step * cos30
    const ySpacing = step * sin30
    const minX = Math.floor((mouseX - influence) / xSpacing) * xSpacing
    const maxX = Math.ceil((mouseX + influence) / xSpacing) * xSpacing
    const minY = Math.floor((mouseY - influence) / ySpacing) * ySpacing
    const maxY = Math.ceil((mouseY + influence) / ySpacing) * ySpacing

    const nodeAlphaMax = isDarkTheme ? 0.12 : 0.32
    for (let x = minX; x <= maxX; x += xSpacing) {
      for (let y = minY; y <= maxY; y += ySpacing) {
        const d = Math.hypot(x - mouseX, y - mouseY)
        if (d < influence) {
          const alpha = Math.pow(1 - d / influence, 2) * nodeAlphaMax
          ctx.globalAlpha = alpha
          ctx.beginPath()
          ctx.arc(x, y, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

function frame() {
  rafId = requestAnimationFrame(frame)
  ctx.clearRect(0, 0, width, height)

  const mode = backgroundState.current
  if (mode === 'grid') {
    renderGrid()
  } else if (mode === 'isometric') {
    renderIsometric()
  } else {
    renderDots()
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