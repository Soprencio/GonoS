<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { themeState } from '../state/theme.js'

const canvasRef = ref(null)
const containerRef = ref(null)
const isLoaded = ref(false)
const isAnimating = ref(false)

let renderer = null
let scene = null
let camera = null
let controls = null
let modelMesh = null
let animationFrameId = null
let resizeObserver = null

// Constantes de alineación óptica exacta (ilusión anamórfica canónica)
// Dirección de visión: (-1, -1, 1) normalizado hacia (0, 0, 0) con Y como UP canónico (0, 1, 0)
const TARGET_DIR = new THREE.Vector3(-1, -1, 1).normalize()
const TARGET_UP = new THREE.Vector3(0, 1, 0)
const CAMERA_DISTANCE = 100
const BASE_FRUSTUM_SIZE = 58 // Encuadre óptimo para el modelo

// Estado del vuelo esférico continuo para armar la G desde cualquier rotación
let flightState = null

function getModelColor(theme) {
  return theme === 'dark' ? 0x8e8e8e : 0x5e636b
}

function updateMaterialColor() {
  if (modelMesh && modelMesh.material) {
    modelMesh.material.color.setHex(getModelColor(themeState.current))
    modelMesh.material.needsUpdate = true
  }
}

watch(() => themeState.current, () => {
  updateMaterialColor()
})

// Función de suavizado fluido ease-in-out cúbica
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

// Interpolación esférica (slerp) sobre arco de gran círculo entre dos direcciones unitarias
function slerpVectors(uA, uB, t) {
  const dot = THREE.MathUtils.clamp(uA.dot(uB), -1, 1)

  if (dot > 0.99995) {
    return uA.clone().lerp(uB, t).normalize()
  }

  if (dot < -0.99995) {
    const ortho = new THREE.Vector3(0, 1, 0).cross(uA)
    if (ortho.lengthSq() < 0.001) {
      ortho.set(1, 0, 0).cross(uA)
    }
    ortho.normalize()
    const q = new THREE.Quaternion().setFromAxisAngle(ortho, Math.PI * t)
    return uA.clone().applyQuaternion(q).normalize()
  }

  const theta = Math.acos(dot)
  const axis = new THREE.Vector3().crossVectors(uA, uB).normalize()
  const q = new THREE.Quaternion().setFromAxisAngle(axis, theta * t)
  return uA.clone().applyQuaternion(q).normalize()
}

function updateCameraFrustum() {
  if (!camera || !containerRef.value) return
  const width = containerRef.value.clientWidth || 300
  const height = containerRef.value.clientHeight || 300
  const aspect = width / height

  if (aspect >= 1) {
    camera.left = (-BASE_FRUSTUM_SIZE * aspect) / 2
    camera.right = (BASE_FRUSTUM_SIZE * aspect) / 2
    camera.top = BASE_FRUSTUM_SIZE / 2
    camera.bottom = -BASE_FRUSTUM_SIZE / 2
  } else {
    camera.left = -BASE_FRUSTUM_SIZE / 2
    camera.right = BASE_FRUSTUM_SIZE / 2
    camera.top = (BASE_FRUSTUM_SIZE / aspect) / 2
    camera.bottom = (-BASE_FRUSTUM_SIZE / aspect) / 2
  }
  camera.updateProjectionMatrix()
  if (renderer) {
    renderer.setSize(width, height)
  }
}

function initThree() {
  if (!canvasRef.value || !containerRef.value) return

  const width = containerRef.value.clientWidth || 400
  const height = containerRef.value.clientHeight || 400

  // 1. Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // 2. Scene
  scene = new THREE.Scene()

  // 3. Camera ortogonal con UP en Z (G parada)
  const aspect = width / height
  camera = new THREE.OrthographicCamera(
    (-BASE_FRUSTUM_SIZE * aspect) / 2,
    (BASE_FRUSTUM_SIZE * aspect) / 2,
    BASE_FRUSTUM_SIZE / 2,
    -BASE_FRUSTUM_SIZE / 2,
    0.1,
    1000
  )
  camera.up.copy(TARGET_UP)

  // 4. Luces de estudio arquitectónico
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  // Luz principal cenital e izquierda
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95)
  dirLight1.position.set(-10, 16, 12)
  scene.add(dirLight1)

  // Luz de relleno frontal tenue
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35)
  dirLight2.position.set(10, 6, 8)
  scene.add(dirLight2)

  // Luz de contorno lateral
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.25)
  rimLight.position.set(-6, -8, -10)
  scene.add(rimLight)

  // 5. Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false // Solo rotar y zoomear
  controls.enableRotate = true
  controls.enableZoom = true
  controls.target.set(0, 0, 0)
  controls.minZoom = 0.6
  controls.maxZoom = 2.4

  function cancelAnimation() {
    if (isAnimating.value) {
      isAnimating.value = false
      flightState = null
      if (controls) {
        controls.target.set(0, 0, 0)
        controls.update()
      }
    }
  }

  // Al interactuar el usuario (drag, click o zoom), cancelar animación y ceder control sin saltos
  controls.addEventListener('start', cancelAnimation)

  // 6. Carga del STL
  loadSTL()

  // 7. ResizeObserver
  resizeObserver = new ResizeObserver(() => {
    updateCameraFrustum()
  })
  resizeObserver.observe(containerRef.value)

  // Loop de render
  animate()
}

function loadSTL() {
  const loader = new STLLoader()
  loader.load(
    '/models/Gonos.stl',
    (geometry) => {
      // 1. Centrar el modelo en el origen para que el pivote de giro sea exacto
      geometry.center()
      geometry.computeVertexNormals()

      // 2. Rotar la geometría para apoyarla sobre el vértice correcto (60° sobre el eje visual canónico)
      const viewAxis = new THREE.Vector3(-1, -1, 1).normalize()
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationAxis(viewAxis, (60 * Math.PI) / 180))

      const material = new THREE.MeshStandardMaterial({
        color: getModelColor(themeState.current),
        roughness: 0.38,
        metalness: 0.12,
        flatShading: false
      })

      modelMesh = new THREE.Mesh(geometry, material)
      scene.add(modelMesh)
      isLoaded.value = true

      // Posición inicial con ligero desfase angular (~50°) para mostrar el ensamblado fluido al cargar
      const initialOffsetDir = TARGET_DIR.clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(50))
        .normalize()
      camera.position.copy(initialOffsetDir).multiplyScalar(CAMERA_DISTANCE)
      camera.up.copy(TARGET_UP)
      camera.zoom = 1.0
      camera.updateProjectionMatrix()
      camera.lookAt(0, 0, 0)

      // Iniciar el armado fluido hacia la G canónica
      rearmarG()
    },
    undefined,
    (err) => {
      console.error('[GonosHeroViewer] Error al cargar Gonos.stl:', err)
    }
  )
}

function rearmarG() {
  if (!isLoaded.value || !modelMesh || !camera || !controls) return

  const currentDir = camera.position.clone().normalize()
  const targetDir = TARGET_DIR.clone().normalize()
  const dot = THREE.MathUtils.clamp(currentDir.dot(targetDir), -1, 1)
  const angle = Math.acos(dot)
  const zoomDiff = Math.abs(camera.zoom - 1.0)

  // Si ya está prácticamente alineado (< 4° y zoom ~ 1), hacemos un paneo demostrativo suave de apertura y cierre
  const isAlreadyAligned = angle < 0.07 && zoomDiff < 0.05

  if (isAlreadyAligned) {
    // Fase 1: se abre suavemente ~48° para revelar la escultura 3D en el espacio
    // Fase 2: regresa fluidamente y se ensambla de forma exacta en la G
    const swingAxis = new THREE.Vector3(0, 1, 0)
    const swingDir = TARGET_DIR.clone().applyAxisAngle(swingAxis, THREE.MathUtils.degToRad(48)).normalize()

    flightState = {
      type: 'swing',
      startTime: performance.now(),
      duration: 2200,
      startDir: currentDir,
      swingDir: swingDir,
      targetDir: targetDir,
      startZoom: camera.zoom,
      startUp: camera.up.clone(),
      startMeshRotY: modelMesh.rotation.y
    }
  } else {
    // Vuelo esférico continuo desde la rotación y zoom actuales directamente hacia la G (sin teletransportes)
    const dynamicDuration = Math.max(1100, Math.min(2200, 1000 + (angle / Math.PI) * 1100))

    flightState = {
      type: 'direct',
      startTime: performance.now(),
      duration: dynamicDuration,
      startDir: currentDir,
      targetDir: targetDir,
      startZoom: camera.zoom,
      startUp: camera.up.clone(),
      startMeshRotY: modelMesh.rotation.y
    }
  }

  isAnimating.value = true
}

function finalizeAlignment() {
  if (!camera || !controls) return

  camera.position.copy(TARGET_DIR).multiplyScalar(CAMERA_DISTANCE)
  camera.up.copy(TARGET_UP)
  camera.zoom = 1.0
  camera.updateProjectionMatrix()
  camera.lookAt(0, 0, 0)

  if (modelMesh) {
    modelMesh.rotation.set(0, 0, 0)
  }

  controls.target.set(0, 0, 0)
  controls.update()
  controls.saveState()

  isAnimating.value = false
  flightState = null
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)

  if (isAnimating.value && flightState && camera) {
    const now = performance.now()
    const elapsed = now - flightState.startTime
    const rawProgress = Math.min(elapsed / flightState.duration, 1)

    if (flightState.type === 'direct') {
      const t = easeInOutCubic(rawProgress)
      const currentDir = slerpVectors(flightState.startDir, flightState.targetDir, t)
      camera.position.copy(currentDir).multiplyScalar(CAMERA_DISTANCE)
      camera.up.copy(flightState.startUp).lerp(TARGET_UP, t).normalize()
      camera.zoom = THREE.MathUtils.lerp(flightState.startZoom, 1.0, t)
      camera.updateProjectionMatrix()
      camera.lookAt(0, 0, 0)

      if (modelMesh) {
        modelMesh.rotation.y = THREE.MathUtils.lerp(flightState.startMeshRotY || 0, 0, t)
      }

      if (rawProgress >= 1) {
        finalizeAlignment()
      }
    } else if (flightState.type === 'swing') {
      let currentDir
      if (rawProgress < 0.40) {
        const p = rawProgress / 0.40
        const t = Math.sin((p * Math.PI) / 2)
        currentDir = slerpVectors(flightState.startDir, flightState.swingDir, t)
      } else {
        const p = (rawProgress - 0.40) / 0.60
        const t = easeInOutCubic(p)
        currentDir = slerpVectors(flightState.swingDir, flightState.targetDir, t)
      }
      camera.position.copy(currentDir).multiplyScalar(CAMERA_DISTANCE)
      camera.up.copy(TARGET_UP)
      camera.zoom = 1.0
      camera.updateProjectionMatrix()
      camera.lookAt(0, 0, 0)

      if (modelMesh) {
        modelMesh.rotation.y = THREE.MathUtils.lerp(flightState.startMeshRotY || 0, 0, t)
      }

      if (rawProgress >= 1) {
        finalizeAlignment()
      }
    }
  } else if (controls) {
    controls.update()
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

onMounted(() => {
  initThree()
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (resizeObserver && containerRef.value) resizeObserver.disconnect()
  if (controls) controls.dispose()
  if (renderer) renderer.dispose()
  if (modelMesh) {
    modelMesh.geometry.dispose()
    modelMesh.material.dispose()
  }
})
</script>

<template>
  <div ref="containerRef" class="hero-viewer-container">
    <canvas ref="canvasRef" class="hero-canvas" />

    <!-- Indicador de carga -->
    <div v-if="!isLoaded" class="loading-overlay">
      <div class="spinner"></div>
      <p class="loading-text">Cargando escultura 3D...</p>
    </div>

    <!-- Botón centrado para rearmar la G -->
    <div v-if="isLoaded" class="viewer-tools">
      <button
        type="button"
        class="btn-rearmar"
        :disabled="isAnimating"
        title="Volver a armar la G ópticamente"
        @click="rearmarG"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 4v6h6" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        <span>{{ isAnimating ? 'Armando G...' : 'Rearmar G' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero-viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

.hero-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}

.hero-canvas:active {
  cursor: grabbing;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.viewer-tools {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.btn-rearmar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 99px;
  padding: 10px 28px;
  min-width: 175px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-rearmar:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}

.btn-rearmar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .viewer-tools {
    bottom: 16px;
  }

  .btn-rearmar {
    padding: 8px 20px;
    min-width: 150px;
    font-size: 0.8rem;
  }
}
</style>
