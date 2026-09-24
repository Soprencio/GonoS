<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { themeState } from '../../state/theme.js'

const props = defineProps({
  viewer: { type: Object, required: true }
})

const cubeCanvasRef = ref(null)

let renderer = null
let scene = null
let cubeCamera = null
let cubeGroup = null
let animId = null
let unsubViewChange = null

let isDown = false
let didDrag = false
let startX = 0, startY = 0
let prevX = 0, prevY = 0
let currentHovered = null

// Geometry dimensions
const FACE_SIZE = 2.15
const FACE_THICK = 0.58
const CORNER_SIZE = 0.62
const EDGE_SIZE = 0.62
const POS_OFFSET = 1.45 // distance from center

const BASE_COLOR = 0xd0d5dd // Satin aluminum / neutral technical tone
const CORE_COLOR = 0x181c24 // Dark seam interior

// 6 Faces configuration
const FACES_CONFIG = [
  {
    id: 'front',
    label: 'ADELANTE',
    dir: { x: 0, y: 0, z: 1 },
    pos: [0, 0, POS_OFFSET],
    size: [FACE_SIZE, FACE_SIZE, FACE_THICK],
    outerIndex: 4 // +Z
  },
  {
    id: 'back',
    label: 'ATRÁS',
    dir: { x: 0, y: 0, z: -1 },
    pos: [0, 0, -POS_OFFSET],
    size: [FACE_SIZE, FACE_SIZE, FACE_THICK],
    outerIndex: 5 // -Z
  },
  {
    id: 'right',
    label: 'DERECHA',
    dir: { x: 1, y: 0, z: 0 },
    pos: [POS_OFFSET, 0, 0],
    size: [FACE_THICK, FACE_SIZE, FACE_SIZE],
    outerIndex: 0 // +X
  },
  {
    id: 'left',
    label: 'IZQUIERDA',
    dir: { x: -1, y: 0, z: 0 },
    pos: [-POS_OFFSET, 0, 0],
    size: [FACE_THICK, FACE_SIZE, FACE_SIZE],
    outerIndex: 1 // -X
  },
  {
    id: 'top',
    label: 'ARRIBA',
    dir: { x: 0, y: 1, z: 0 },
    pos: [0, POS_OFFSET, 0],
    size: [FACE_SIZE, FACE_THICK, FACE_SIZE],
    outerIndex: 2 // +Y
  },
  {
    id: 'bottom',
    label: 'ABAJO',
    dir: { x: 0, y: -1, z: 0 },
    pos: [0, -POS_OFFSET, 0],
    size: [FACE_SIZE, FACE_THICK, FACE_SIZE],
    outerIndex: 3 // -Y
  }
]

// 8 Corners configuration
const CORNERS_CONFIG = [
  { dir: { x: 1, y: 1, z: 1 }, pos: [POS_OFFSET, POS_OFFSET, POS_OFFSET] },
  { dir: { x: 1, y: 1, z: -1 }, pos: [POS_OFFSET, POS_OFFSET, -POS_OFFSET] },
  { dir: { x: -1, y: 1, z: 1 }, pos: [-POS_OFFSET, POS_OFFSET, POS_OFFSET] },
  { dir: { x: -1, y: 1, z: -1 }, pos: [-POS_OFFSET, POS_OFFSET, -POS_OFFSET] },
  { dir: { x: 1, y: -1, z: 1 }, pos: [POS_OFFSET, -POS_OFFSET, POS_OFFSET] },
  { dir: { x: 1, y: -1, z: -1 }, pos: [POS_OFFSET, -POS_OFFSET, -POS_OFFSET] },
  { dir: { x: -1, y: -1, z: 1 }, pos: [-POS_OFFSET, -POS_OFFSET, POS_OFFSET] },
  { dir: { x: -1, y: -1, z: -1 }, pos: [-POS_OFFSET, -POS_OFFSET, -POS_OFFSET] }
]

// 12 Edges configuration
const EDGES_CONFIG = [
  // Top edges
  { dir: { x: 0, y: 1, z: 1 }, pos: [0, POS_OFFSET, POS_OFFSET], size: [FACE_SIZE, EDGE_SIZE, EDGE_SIZE] },
  { dir: { x: 0, y: 1, z: -1 }, pos: [0, POS_OFFSET, -POS_OFFSET], size: [FACE_SIZE, EDGE_SIZE, EDGE_SIZE] },
  { dir: { x: 1, y: 1, z: 0 }, pos: [POS_OFFSET, POS_OFFSET, 0], size: [EDGE_SIZE, EDGE_SIZE, FACE_SIZE] },
  { dir: { x: -1, y: 1, z: 0 }, pos: [-POS_OFFSET, POS_OFFSET, 0], size: [EDGE_SIZE, EDGE_SIZE, FACE_SIZE] },
  // Bottom edges
  { dir: { x: 0, y: -1, z: 1 }, pos: [0, -POS_OFFSET, POS_OFFSET], size: [FACE_SIZE, EDGE_SIZE, EDGE_SIZE] },
  { dir: { x: 0, y: -1, z: -1 }, pos: [0, -POS_OFFSET, -POS_OFFSET], size: [FACE_SIZE, EDGE_SIZE, EDGE_SIZE] },
  { dir: { x: 1, y: -1, z: 0 }, pos: [POS_OFFSET, -POS_OFFSET, 0], size: [EDGE_SIZE, EDGE_SIZE, FACE_SIZE] },
  { dir: { x: -1, y: -1, z: 0 }, pos: [-POS_OFFSET, -POS_OFFSET, 0], size: [EDGE_SIZE, EDGE_SIZE, FACE_SIZE] },
  // Lateral edges
  { dir: { x: 1, y: 0, z: 1 }, pos: [POS_OFFSET, 0, POS_OFFSET], size: [EDGE_SIZE, FACE_SIZE, EDGE_SIZE] },
  { dir: { x: -1, y: 0, z: 1 }, pos: [-POS_OFFSET, 0, POS_OFFSET], size: [EDGE_SIZE, FACE_SIZE, EDGE_SIZE] },
  { dir: { x: 1, y: 0, z: -1 }, pos: [POS_OFFSET, 0, -POS_OFFSET], size: [EDGE_SIZE, FACE_SIZE, EDGE_SIZE] },
  { dir: { x: -1, y: 0, z: -1 }, pos: [-POS_OFFSET, 0, -POS_OFFSET], size: [EDGE_SIZE, FACE_SIZE, EDGE_SIZE] }
]

function getAccentColorHex() {
  return themeState.accent === 'orange' ? 0xe06710 : 0x19b0b5
}

function getAccentColorCss() {
  return themeState.accent === 'orange' ? '#E06710' : '#19B0B5'
}

function createTextTexture(label, isHovered) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1024
  const ctx = c.getContext('2d')

  const accent = getAccentColorCss()
  const isDark = themeState.current === 'dark'
  const bg = isHovered ? accent : '#D0D5DD'
  const textCol = isHovered ? '#FFFFFF' : '#1A212B'
  const borderCol = isHovered ? 'rgba(255, 255, 255, 0.85)' : (isDark ? '#8A95A5' : '#9AA5B5')

  // Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1024, 1024)

  // Outer border
  ctx.strokeStyle = borderCol
  ctx.lineWidth = 26
  ctx.strokeRect(13, 13, 998, 998)

  // Inner inset border
  ctx.strokeStyle = isHovered ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 10
  ctx.strokeRect(32, 32, 960, 960)

  // Typography - 1.5x scale and bold
  let fontSize = 160
  ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  let textWidth = ctx.measureText(label).width
  const maxAllowedWidth = 840

  if (textWidth > maxAllowedWidth) {
    fontSize = Math.floor(fontSize * (maxAllowedWidth / textWidth))
    ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  }

  ctx.fillStyle = textCol
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 512, 512)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4
  return tex
}

const faceMeshes = []
const cornerMeshes = []
const edgeMeshes = []

function initCube() {
  if (!cubeCanvasRef.value) return

  renderer = new THREE.WebGLRenderer({
    canvas: cubeCanvasRef.value,
    antialias: true,
    alpha: true
  })
  renderer.setSize(210, 210)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  scene = new THREE.Scene()
  scene.background = null

  cubeGroup = new THREE.Group()
  scene.add(cubeGroup)

  // Dark internal core to give contrast to seams
  const coreGeo = new THREE.BoxGeometry(3.2, 3.2, 3.2)
  const coreMat = new THREE.MeshBasicMaterial({ color: CORE_COLOR })
  const coreMesh = new THREE.Mesh(coreGeo, coreMat)
  cubeGroup.add(coreMesh)

  const neutralSideMat = new THREE.MeshStandardMaterial({
    color: BASE_COLOR,
    roughness: 0.35,
    metalness: 0.15
  })

  // 1. Build 6 Faces
  FACES_CONFIG.forEach(f => {
    const geo = new THREE.BoxGeometry(...f.size)
    const normalTex = createTextTexture(f.label, false)
    const hoverTex = createTextTexture(f.label, true)

    const normalOuterMat = new THREE.MeshStandardMaterial({
      map: normalTex,
      roughness: 0.3,
      metalness: 0.1
    })

    const hoverOuterMat = new THREE.MeshStandardMaterial({
      map: hoverTex,
      roughness: 0.25,
      metalness: 0.15
    })

    // Materials array for 6 sides of the box
    const mats = []
    for (let i = 0; i < 6; i++) {
      mats.push(i === f.outerIndex ? normalOuterMat : neutralSideMat)
    }

    const mesh = new THREE.Mesh(geo, mats)
    mesh.position.set(...f.pos)
    mesh.userData = {
      type: 'face',
      label: f.label,
      dir: f.dir,
      outerIndex: f.outerIndex,
      normalTex,
      hoverTex,
      normalMat: normalOuterMat,
      hoverMat: hoverOuterMat
    }

    cubeGroup.add(mesh)
    faceMeshes.push(mesh)
  })

  // 2. Build 8 Corners
  CORNERS_CONFIG.forEach(c => {
    const geo = new THREE.BoxGeometry(CORNER_SIZE, CORNER_SIZE, CORNER_SIZE)
    const mat = new THREE.MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.35,
      metalness: 0.15
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...c.pos)
    mesh.userData = {
      type: 'corner',
      dir: c.dir
    }
    cubeGroup.add(mesh)
    cornerMeshes.push(mesh)
  })

  // 3. Build 12 Edges
  EDGES_CONFIG.forEach(e => {
    const geo = new THREE.BoxGeometry(...e.size)
    const mat = new THREE.MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.35,
      metalness: 0.15
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...e.pos)
    mesh.userData = {
      type: 'edge',
      dir: e.dir
    }
    cubeGroup.add(mesh)
    edgeMeshes.push(mesh)
  })

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.85)
  scene.add(ambient)

  const dl1 = new THREE.DirectionalLight(0xffffff, 0.8)
  dl1.position.set(5, 7, 6)
  scene.add(dl1)

  const dl2 = new THREE.DirectionalLight(0xffffff, 0.35)
  dl2.position.set(-5, -3, -4)
  scene.add(dl2)

  // Camera: frustum -3.15 to 3.15 to maximize cube size while ensuring corners are never clipped at 45°
  cubeCamera = new THREE.OrthographicCamera(-3.15, 3.15, 3.15, -3.15, 0.1, 30)
  cubeCamera.position.set(0, 0, 12)
  cubeCamera.lookAt(0, 0, 0)

  animate()
}

function refreshThemeMaterials() {
  faceMeshes.forEach(mesh => {
    const { label, outerIndex, hoverTex, hoverMat } = mesh.userData
    if (hoverTex) hoverTex.dispose()
    const newHoverTex = createTextTexture(label, true)
    mesh.userData.hoverTex = newHoverTex
    hoverMat.map = newHoverTex
    hoverMat.needsUpdate = true
  })

  if (currentHovered) {
    if (currentHovered.userData.type === 'corner' || currentHovered.userData.type === 'edge') {
      currentHovered.material.color.set(getAccentColorHex())
      currentHovered.material.emissive.set(getAccentColorHex())
      currentHovered.material.emissiveIntensity = 0.35
    }
  }
}

watch(() => themeState.current, () => {
  refreshThemeMaterials()
})

function animate() {
  animId = requestAnimationFrame(animate)
  const mainCam = props.viewer.getCamera()
  if (mainCam && cubeGroup) {
    cubeGroup.quaternion.copy(mainCam.quaternion).invert()
  }
  if (renderer && scene && cubeCamera) {
    renderer.render(scene, cubeCamera)
  }
}

function rotateMainCam(dx, dy) {
  const controls = props.viewer.getControls()
  const cam = props.viewer.getCamera()
  if (!cam || !controls) return

  const t = controls.target
  const offset = new THREE.Vector3().subVectors(cam.position, t)
  const sph = new THREE.Spherical().setFromVector3(offset)

  sph.theta -= dx * 0.008
  sph.phi -= dy * 0.008
  sph.phi = Math.max(0.04, Math.min(Math.PI - 0.04, sph.phi))

  offset.setFromSpherical(sph)
  cam.position.copy(t).add(offset)
  cam.lookAt(t)
  controls.update()
}

function getHitPart(event) {
  if (!renderer || !cubeCamera || !cubeGroup) return null
  const rect = renderer.domElement.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  const r = new THREE.Raycaster()
  r.setFromCamera(new THREE.Vector2(x, y), cubeCamera)
  // Only intersect pickable meshes (faces, corners, edges)
  const pickable = [...faceMeshes, ...cornerMeshes, ...edgeMeshes]
  const hits = r.intersectObjects(pickable, false)
  return hits.length > 0 ? hits[0].object : null
}

function clearHover() {
  if (!currentHovered) return

  if (currentHovered.userData.type === 'face') {
    const { outerIndex, normalMat } = currentHovered.userData
    currentHovered.material[outerIndex] = normalMat
  } else if (currentHovered.userData.type === 'corner' || currentHovered.userData.type === 'edge') {
    currentHovered.material.color.set(BASE_COLOR)
    currentHovered.material.emissive.set(0x000000)
    currentHovered.material.emissiveIntensity = 0
  }

  currentHovered = null
}

function updateHover(hitPart) {
  if (hitPart === currentHovered) return

  clearHover()
  if (!hitPart) return

  currentHovered = hitPart

  if (hitPart.userData.type === 'face') {
    const { outerIndex, hoverMat } = hitPart.userData
    hitPart.material[outerIndex] = hoverMat
  } else if (hitPart.userData.type === 'corner' || hitPart.userData.type === 'edge') {
    const accent = getAccentColorHex()
    hitPart.material.color.set(accent)
    hitPart.material.emissive.set(accent)
    hitPart.material.emissiveIntensity = 0.35
  }
}

function onPointerDown(e) {
  isDown = true
  didDrag = false
  startX = e.clientX
  startY = e.clientY
  prevX = e.clientX
  prevY = e.clientY
  cubeCanvasRef.value.setPointerCapture(e.pointerId)
  clearHover()
}

function onPointerMove(e) {
  if (isDown) {
    const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY)
    if (totalDist > 3) {
      didDrag = true
    }
    const dx = e.clientX - prevX
    const dy = e.clientY - prevY
    prevX = e.clientX
    prevY = e.clientY

    if (didDrag) {
      rotateMainCam(dx, dy)
      clearHover()
    }
  } else {
    updateHover(getHitPart(e))
  }
}

function onPointerUp(e) {
  if (!isDown) return
  isDown = false
  try {
    cubeCanvasRef.value.releasePointerCapture(e.pointerId)
  } catch {}

  if (didDrag) {
    didDrag = false
    return
  }

  const hitPart = getHitPart(e)
  if (hitPart && hitPart.userData && hitPart.userData.dir) {
    props.viewer.setViewDirection(hitPart.userData.dir)
  }
}

function onPointerLeave() {
  if (!isDown) {
    clearHover()
  }
}

onMounted(() => {
  initCube()
  unsubViewChange = props.viewer.onViewChange(() => {})
})

onUnmounted(() => {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = null
  }
  if (unsubViewChange) unsubViewChange()

  faceMeshes.forEach(m => {
    if (m.userData.normalTex) m.userData.normalTex.dispose()
    if (m.userData.hoverTex) m.userData.hoverTex.dispose()
    if (m.geometry) m.geometry.dispose()
  })
  cornerMeshes.forEach(m => {
    if (m.geometry) m.geometry.dispose()
    if (m.material) m.material.dispose()
  })
  edgeMeshes.forEach(m => {
    if (m.geometry) m.geometry.dispose()
    if (m.material) m.material.dispose()
  })

  faceMeshes.length = 0
  cornerMeshes.length = 0
  edgeMeshes.length = 0

  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  scene = null
  cubeCamera = null
  cubeGroup = null
})
</script>

<template>
  <div
    class="view-cube"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerLeave"
    title="Cubo de orientación 3D (clic en caras o esquinas, o arrastrar para rotar)"
  >
    <canvas ref="cubeCanvasRef" class="cube-canvas" />
  </div>
</template>

<style scoped>
.view-cube {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 210px;
  height: 210px;
  z-index: 20;
  cursor: grab;
  pointer-events: auto;
  user-select: none;
  touch-action: none;
  filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.28));
  transition: transform 120ms ease;
}

.view-cube:hover {
  transform: scale(1.02);
}

.view-cube:active {
  cursor: grabbing;
}

.cube-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
