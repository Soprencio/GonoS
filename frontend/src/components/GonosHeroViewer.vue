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

// Estado de la animación de armado (el modelo rota sobre su propio eje central)
let animStartTime = 0
const ANIM_DURATION_MS = 2200 // Movimiento suave pero continuo
const animStartRot = Math.PI * 0.42 // Ángulo donde las vigas se aprecian separadas
const animTargetRot = 0

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

  // Al interactuar el usuario, cancelar animación automática y dar control
  controls.addEventListener('start', () => {
    if (isAnimating.value) {
      isAnimating.value = false
      if (modelMesh) modelMesh.rotation.set(0, 0, 0)
    }
  })

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

      // Iniciar secuencia de armado girando sobre su eje
      startAssemblyAnimation()
    },
    undefined,
    (err) => {
      console.error('[GonosHeroViewer] Error al cargar Gonos.stl:', err)
    }
  )
}

function startAssemblyAnimation() {
  if (!camera || !controls || !modelMesh) return

  // La cámara permanece fija en la posición de alineación óptica canónica
  camera.position.copy(TARGET_DIR).multiplyScalar(CAMERA_DISTANCE)
  camera.up.copy(TARGET_UP)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
  controls.saveState()

  // El modelo parte desfasado sobre su propio eje (las vigas se ven separadas en el espacio)
  modelMesh.rotation.set(0, animStartRot, 0)

  isAnimating.value = true
  animStartTime = performance.now() + 200 // Breve pausa inicial para observar las piezas separadas
}

function rearmarG() {
  if (!isLoaded.value || !modelMesh) return
  controls.reset()
  startAssemblyAnimation()
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)

  if (isAnimating.value && modelMesh) {
    const now = performance.now()
    if (now >= animStartTime) {
      const elapsed = now - animStartTime
      const rawProgress = Math.min(elapsed / ANIM_DURATION_MS, 1)
      const t = easeInOutCubic(rawProgress)

      // El modelo rota fluidamente sobre su eje central sin moverse de lugar
      modelMesh.rotation.y = THREE.MathUtils.lerp(animStartRot, animTargetRot, t)

      if (rawProgress >= 1) {
        modelMesh.rotation.y = animTargetRot
        isAnimating.value = false
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
