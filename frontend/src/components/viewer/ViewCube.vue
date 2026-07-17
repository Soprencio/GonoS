<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  viewer: { type: Object, required: true }
})

const cubeCanvasRef = ref(null)

let renderer, scene, cubeCamera, cubeMesh
let isDown = false
let didDrag = false
let prevX = 0, prevY = 0
let animId = null
let unsubViewChange = null

const HALF = 2.5
const CORNER_POS = [
  [ HALF,  HALF,  HALF], [ HALF,  HALF, -HALF], [ HALF, -HALF,  HALF], [ HALF, -HALF, -HALF],
  [-HALF,  HALF,  HALF], [-HALF,  HALF, -HALF], [-HALF, -HALF,  HALF], [-HALF, -HALF, -HALF]
]
const CORNER_DIR = [
  { x: 1, y: 1, z: 1}, { x: 1, y: 1, z:-1}, { x: 1, y:-1, z: 1}, { x: 1, y:-1, z:-1},
  { x:-1, y: 1, z: 1}, { x:-1, y: 1, z:-1}, { x:-1, y:-1, z: 1}, { x:-1, y:-1, z:-1}
]

const FACE_CONFIG = [
  { label: 'Right',  color: '#e74c3c', dir: { x: 1, y: 0, z: 0} },
  { label: 'Left',   color: '#e67e22', dir: { x:-1, y: 0, z: 0} },
  { label: 'Top',    color: '#2ecc71', dir: { x: 0, y: 1, z: 0} },
  { label: 'Bottom', color: '#f1c40f', dir: { x: 0, y:-1, z: 0} },
  { label: 'Front',  color: '#3498db', dir: { x: 0, y: 0, z: 1} },
  { label: 'Back',   color: '#9b59b6', dir: { x: 0, y: 0, z:-1} },
]

function createFaceTexture(label, bgColor) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 100px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4
  return tex
}

function initCube() {
  if (!cubeCanvasRef.value) return

  renderer = new THREE.WebGLRenderer({
    canvas: cubeCanvasRef.value,
    antialias: true,
    alpha: true
  })
  renderer.setSize(220, 220)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  scene = new THREE.Scene()
  scene.background = null

  const size = 5
  const geo = new THREE.BoxGeometry(size, size, size)
  const mats = FACE_CONFIG.map(f => new THREE.MeshStandardMaterial({
    map: createFaceTexture(f.label, f.color),
    roughness: 0.3,
    metalness: 0.1
  }))
  cubeMesh = new THREE.Mesh(geo, mats)

  const edgeGeo = new THREE.EdgesGeometry(geo)
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 })
  const edges = new THREE.LineSegments(edgeGeo, edgeMat)
  cubeMesh.add(edges)

  scene.add(cubeMesh)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)
  const dl = new THREE.DirectionalLight(0xffffff, 0.6)
  dl.position.set(3, 5, 4)
  scene.add(dl)

  cubeCamera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 30)
  cubeCamera.position.set(0, 0, 10)
  cubeCamera.lookAt(0, 0, 0)

  animate()
}

function animate() {
  animId = requestAnimationFrame(animate)
  const mainCam = props.viewer.getCamera()
  if (mainCam && cubeMesh) {
    cubeMesh.quaternion.copy(mainCam.quaternion).invert()
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
  const sph = new THREE.Spherical()
  sph.setFromVector3(cam.position.clone().sub(t))
  sph.theta -= dx * 0.01
  sph.phi -= dy * 0.01
  sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi))
  cam.position.copy(t).add(new THREE.Vector3().setFromSpherical(sph))
  cam.lookAt(t)
  controls.update()
}

function getHit(event) {
  if (!renderer) return null
  const rect = renderer.domElement.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  const r = new THREE.Raycaster()
  r.setFromCamera(new THREE.Vector2(x, y), cubeCamera)
  const hits = r.intersectObjects([cubeMesh], true)
  return hits.length > 0 ? hits[0] : null
}

function faceDirFromNormal(n) {
  const eps = 0.5
  if (n.x > eps) return { x: 1, y: 0, z: 0 }
  if (n.x < -eps) return { x:-1, y: 0, z: 0 }
  if (n.y > eps) return { x: 0, y: 1, z: 0 }
  if (n.y < -eps) return { x: 0, y:-1, z: 0 }
  if (n.z > eps) return { x: 0, y: 0, z: 1 }
  if (n.z < -eps) return { x: 0, y: 0, z:-1 }
  return null
}

function cornerDirFromPoint(p) {
  for (let i = 0; i < CORNER_POS.length; i++) {
    const dx = p.x - CORNER_POS[i][0]
    const dy = p.y - CORNER_POS[i][1]
    const dz = p.z - CORNER_POS[i][2]
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (dist < 0.9) return CORNER_DIR[i]
  }
  return null
}

function onPointerDown(e) {
  isDown = true; didDrag = false
  prevX = e.clientX; prevY = e.clientY
  cubeCanvasRef.value.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  if (!isDown) return
  const dx = e.clientX - prevX
  const dy = e.clientY - prevY
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true
  prevX = e.clientX; prevY = e.clientY
  rotateMainCam(dx, dy)
}

function onPointerUp(e) {
  if (!isDown) return
  isDown = false
  if (didDrag) return

  const hit = getHit(e)
  if (!hit || !hit.face) return

  if (hit.object === cubeMesh) {
    const corner = cornerDirFromPoint(hit.point)
    if (corner) {
      props.viewer.setViewDirection(corner)
    } else {
      const face = faceDirFromNormal(hit.face.normal)
      if (face) props.viewer.setViewDirection(face)
    }
  }
}

function onPointerLeave(e) {
  isDown = false
}

onMounted(() => {
  initCube()
  unsubViewChange = props.viewer.onViewChange(() => {})
})

onUnmounted(() => {
  if (animId) { cancelAnimationFrame(animId); animId = null }
  if (unsubViewChange) unsubViewChange()
  if (renderer) { renderer.dispose(); renderer = null }
  scene = null; cubeCamera = null
})
</script>

<template>
  <div
    class="view-cube"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerLeave"
  >
    <canvas ref="cubeCanvasRef" class="cube-canvas" />
  </div>
</template>

<style scoped>
.view-cube {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 200px;
  height: 200px;
  z-index: 20;
  cursor: pointer;
  pointer-events: auto;
}

.cube-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
