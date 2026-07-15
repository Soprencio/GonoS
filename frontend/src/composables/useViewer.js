import { ref, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export function useViewer(canvasRef) {
  const loading = ref(false)
  const loadError = ref(null)
  const progress = ref(0)
  const selectedObject = ref(null)
  const modelInfo = ref({ name: '', type: '', vertices: 0, triangles: 0 })

  let renderer, scene, camera, controls
  let animationId
  let modelGroup = new THREE.Group()
  let thatOpenComponents = null
  let selectionHelper = null
  let hiddenObjects = []
  let currentFormat = ''
  const frameCallbacks = []

  function detectWebGL() {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!gl
  }

  function init() {
    if (!canvasRef.value) {
      loadError.value = 'Canvas no disponible'
      return false
    }

    if (!detectWebGL()) {
      loadError.value = 'Tu navegador no soporta WebGL'
      return false
    }

    const { width, height } = canvasRef.value.getBoundingClientRect()

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      antialias: true,
      alpha: true
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace

    scene = new THREE.Scene()
    scene.add(modelGroup)

    const aspect = width / height
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    camera.position.set(4, 3, 5)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.12
    controls.target.set(0, 0, 0)
    controls.update()

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9)
    dir1.position.set(5, 10, 7)
    scene.add(dir1)

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.3)
    dir2.position.set(-5, 3, -5)
    scene.add(dir2)

    animate()
    return true
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    controls.update()
    for (const cb of frameCallbacks) cb()
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }

  function clearModel() {
    loadError.value = null
    deselectAll()
    hiddenObjects = []
    currentFormat = ''
    modelInfo.value = { name: '', type: '', vertices: 0, triangles: 0 }
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0]
      disposeObject(child)
      modelGroup.remove(child)
    }
  }

  function disposeObject(obj) {
    if (!obj) return
    if (obj.geometry) {
      obj.geometry.dispose()
    }
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => disposeMaterial(m))
      } else {
        disposeMaterial(obj.material)
      }
    }
    for (const c of obj.children) {
      disposeObject(c)
    }
  }

  function disposeMaterial(mat) {
    if (!mat) return
    for (const key of Object.keys(mat)) {
      const val = mat[key]
      if (val && typeof val === 'object' && 'isTexture' in val) {
        val.dispose()
      }
    }
    mat.dispose()
  }

  function loadWithLoader(loader, url) {
    return new Promise((resolve, reject) => {
      const manager = new THREE.LoadingManager()
      const timed = setTimeout(() => {
        progress.value = 50
      }, 1000)

      loader.manager = manager
      loader.load(
        url,
        result => {
          clearTimeout(timed)
          progress.value = 100
          resolve(result)
        },
        xhr => {
          if (xhr.total > 0) {
            progress.value = Math.round((xhr.loaded / xhr.total) * 100)
          }
        },
        err => {
          clearTimeout(timed)
          reject(err)
        }
      )
    })
  }

  function collectStats(obj) {
    let verts = 0, tris = 0
    obj.traverse(child => {
      if (child.isMesh && child.geometry) {
        const pos = child.geometry.attributes.position
        if (pos) verts += pos.count
        if (child.geometry.index) {
          tris += child.geometry.index.count / 3
        } else if (pos) {
          tris += pos.count / 3
        }
      }
    })
    return { vertices: verts, triangles: tris }
  }

  async function loadModel(url, format) {
    loading.value = true
    loadError.value = null
    progress.value = 0
    clearModel()
    currentFormat = format

    if (!camera && !init()) {
      loadError.value = 'Visor 3D no disponible'
      loading.value = false
      return
    }

    try {
      if (format === '.ifc') {
        await loadIFC(url)
        fitModelToView()
        updateModelInfo()
        return
      }

      let loader
      switch (format) {
        case '.gltf':
        case '.glb':
          loader = new GLTFLoader()
          break
        case '.obj':
          loader = new OBJLoader()
          break
        case '.stl':
          loader = new STLLoader()
          break
        case '.fbx':
          loader = new FBXLoader()
          break
        default:
          throw new Error(`Formato no soportado: ${format}`)
      }

      const object = await loadWithLoader(loader, url)

      if (format === '.gltf' || format === '.glb') {
        const scene2 = object.scene || object
        scene2.name = scene2.name || 'Modelo GLTF'
        modelGroup.add(scene2)
      } else {
        const container = object
        container.name = container.name || `Modelo${format}`
        modelGroup.add(container)
      }

      updateModelInfo()
      fitModelToView()
    } catch (err) {
      console.error(`[Viewer] Error cargando ${format}:`, err)
      if (format === '.fbx') {
        loadError.value = 'No se pudo previsualizar este formato. Podés descargar el archivo original.'
      } else if (format === '.ifc') {
        loadError.value = 'No se pudo previsualizar este modelo IFC. Podés descargar el archivo original.'
      } else {
        loadError.value = `Error al cargar el modelo (${format})`
      }
    } finally {
      loading.value = false
    }
  }

  function updateModelInfo() {
    const stats = collectStats(modelGroup)
    modelInfo.value = {
      name: modelGroup.children[0]?.name || 'Modelo',
      type: currentFormat,
      vertices: stats.vertices,
      triangles: stats.triangles
    }
  }

  async function loadIFC(url) {
    const mod = await import('@thatopen/components')
    const { Components, IfcLoader } = mod

    const components = new Components()
    thatOpenComponents = components

    const ifcLoader = new IfcLoader(components)
    await ifcLoader.setup({ autoSetWasm: true })

    const response = await fetch(url)
    const buffer = await response.arrayBuffer()

    const model = await ifcLoader.load(buffer, true, 'model')
    model.name = 'Modelo IFC'
    modelGroup.add(model)
  }

  function extractHierarchy() {
    const tree = []
    for (const child of modelGroup.children) {
      const node = buildNode(child)
      if (node) tree.push(node)
    }
    if (tree.length === 0) {
      tree.push({ id: 'root', name: 'Modelo completo', type: 'Group', children: [] })
    }
    return tree
  }

  function buildNode(obj) {
    if (!obj || obj.isLight || obj.isHelper || obj.isCamera) return null
    const node = {
      id: obj.uuid,
      name: obj.name || obj.type || 'Sin nombre',
      type: obj.type,
      children: []
    }
    for (const child of obj.children) {
      const sub = buildNode(child)
      if (sub) node.children.push(sub)
    }
    if (node.children.length === 0 && !obj.isMesh && !obj.isGroup && !obj.isObject3D) {
      return null
    }
    return node
  }

  function getObjectInfo(object) {
    const obj = object.object instanceof THREE.Object3D ? object.object : object
    const info = {
      name: obj.name || 'Sin nombre',
      type: obj.type,
      uuid: obj.uuid
    }
    if (obj.isMesh && obj.geometry) {
      const pos = obj.geometry.attributes.position
      if (pos) info.vertices = pos.count
      if (obj.geometry.index) {
        info.triangles = obj.geometry.index.count / 3
      }
    }
    return info
  }

  function selectObject(object) {
    deselectAll()
    if (!object) return

    const obj = object.object instanceof THREE.Object3D ? object.object : object
    selectedObject.value = obj

    const box = new THREE.BoxHelper(obj, 0x19B0B5)
    scene.add(box)
    selectionHelper = box
  }

  function deselectAll() {
    selectedObject.value = null
    if (selectionHelper) {
      scene.remove(selectionHelper)
      selectionHelper.dispose()
      selectionHelper = null
    }
  }

  function isolateSelection() {
    if (!selectedObject.value) return
    hiddenObjects = []
    const selected = selectedObject.value

    modelGroup.traverse(child => {
      if (child !== selected && child.isMesh) {
        child.visible = false
        hiddenObjects.push(child)
      }
    })
  }

  function showAll() {
    for (const obj of hiddenObjects) {
      obj.visible = true
    }
    hiddenObjects = []
  }

  function fitModelToView() {
    if (modelGroup.children.length === 0) return
    const box = new THREE.Box3().setFromObject(modelGroup)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    if (maxDim === 0) return

    const dist = maxDim * 1.8
    camera.position.set(center.x + dist * 0.6, center.y + dist * 0.5, center.z + dist)
    controls.target.copy(center)
    controls.update()
  }

  function resetCamera() {
    fitModelToView()
  }

  function raycast(event) {
    if (!camera || !renderer || !scene) return null
    const rect = renderer.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(x, y)
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(modelGroup.children, true)
    return intersects.length > 0 ? intersects[0] : null
  }

  function registerFrameCallback(fn) {
    frameCallbacks.push(fn)
    return () => {
      const i = frameCallbacks.indexOf(fn)
      if (i >= 0) frameCallbacks.splice(i, 1)
    }
  }

  function projectToScreen(worldPos) {
    if (!camera || !renderer) return null
    const vec = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
    vec.project(camera)
    if (vec.z > 1) return null
    const rect = renderer.domElement.getBoundingClientRect()
    return {
      x: (vec.x * 0.5 + 0.5) * rect.width,
      y: (-vec.y * 0.5 + 0.5) * rect.height,
      z: vec.z
    }
  }

  function focusOnPoint(worldPos) {
    controls.target.set(worldPos.x, worldPos.y, worldPos.z)
    controls.update()
  }

  function getCanvasRect() {
    if (!renderer) return null
    return renderer.domElement.getBoundingClientRect()
  }

  function dispose() {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    clearModel()
    if (controls) {
      controls.dispose()
      controls = null
    }
    if (renderer) {
      renderer.dispose()
      renderer = null
    }
    if (thatOpenComponents) {
      try { thatOpenComponents.dispose() } catch {}
      thatOpenComponents = null
    }
    scene = null
    camera = null
  }

  const ok = init()
  if (!ok) {
    dispose()
  }

  onUnmounted(dispose)

  return {
    loadModel,
    raycast,
    resetCamera,
    fitModelToView,
    dispose,
    loading,
    loadError,
    progress,
    selectedObject,
    modelInfo,
    selectObject,
    deselectAll,
    isolateSelection,
    showAll,
    extractHierarchy,
    getObjectInfo,
    registerFrameCallback,
    projectToScreen,
    focusOnPoint,
    getCanvasRect
  }
}
