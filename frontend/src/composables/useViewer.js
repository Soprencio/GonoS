import { ref, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export function useViewer(canvasRef) {
  const loading = ref(false)
  const loadError = ref(null)
  const progress = ref(0)
  const selectedObject = ref(null)
  const modelInfo = ref({ name: '', type: '', vertices: 0, triangles: 0 })
  const cameraType = ref('perspective')

  let renderer, scene, camera, controls, orthoCamera, perspCamera
  let animationId
  let modelGroup = new THREE.Group()
  let thatOpenComponents = null
  let selectionHelper = null
  let hiddenObjects = []
  let currentFormat = ''
  const frameCallbacks = []
  const viewChangeCallbacks = []

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

    perspCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    perspCamera.position.set(4, 3, 5)

    const initialDist = 5
    const frustum = initialDist * 0.5
    orthoCamera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 1000
    )
    orthoCamera.position.copy(perspCamera.position)
    orthoCamera.quaternion.copy(perspCamera.quaternion)
    orthoCamera.updateProjectionMatrix()

    camera = perspCamera

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.12
    controls.target.set(0, 0, 0)

    controls.addEventListener('change', () => {
      for (const cb of viewChangeCallbacks) cb()
    })
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

  function toggleCamera() {
    if (!renderer) return
    const isPersp = camera === perspCamera
    const from = camera
    const to = isPersp ? orthoCamera : perspCamera

    to.position.copy(from.position)
    to.quaternion.copy(from.quaternion)

    if (to === orthoCamera) {
      const dist = from.position.distanceTo(controls.target)
      const aspect = renderer.domElement.width / renderer.domElement.height
      const f = dist * 0.5
      to.left = -f * aspect
      to.right = f * aspect
      to.top = f
      to.bottom = -f
      to.updateProjectionMatrix()
    }

    controls.object = to
    camera = to
    controls.update()
    cameraType.value = isPersp ? 'orthographic' : 'perspective'
    for (const cb of viewChangeCallbacks) cb()
  }

  function getCamera() { return camera }
  function getControls() { return controls }
  function onViewChange(cb) {
    viewChangeCallbacks.push(cb)
    return () => {
      const i = viewChangeCallbacks.indexOf(cb)
      if (i >= 0) viewChangeCallbacks.splice(i, 1)
    }
  }

  let animTargetPos = null
  let animTargetQuat = null
  let animProgress = 0
  const ANIM_DURATION = 20

  function setViewDirection(dir) {
    const target = controls.target
    const box = new THREE.Box3().setFromObject(modelGroup)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 1)
    const distance = maxDim * 1.8

    const direction = new THREE.Vector3(dir.x, dir.y, dir.z).normalize()
    const targetPos = target.clone().add(direction.multiplyScalar(distance))

    animTargetPos = targetPos
    animTargetQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(targetPos, target, new THREE.Vector3(0, 1, 0))
    )
    animProgress = 0
  }

  function updateCameraAnimation() {
    if (!animTargetPos) return
    animProgress++
    const t = Math.min(animProgress / ANIM_DURATION, 1)
    const ease = 1 - Math.pow(1 - t, 3)

    camera.position.lerp(animTargetPos, ease)
    camera.quaternion.slerp(animTargetQuat, ease)
    controls.update()

    if (t >= 1) {
      camera.position.copy(animTargetPos)
      camera.quaternion.copy(animTargetQuat)
      controls.update()
      animTargetPos = null
      animTargetQuat = null
      for (const cb of viewChangeCallbacks) cb()
    }
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    controls.update()
    updateCameraAnimation()
    if (renderer && scene && camera) {
      if (camera === orthoCamera) {
        const dist = camera.position.distanceTo(controls.target)
        const aspect = renderer.domElement.width / renderer.domElement.height
        const f = dist * 0.5
        camera.left = -f * aspect
        camera.right = f * aspect
        camera.top = f
        camera.bottom = -f
        camera.updateProjectionMatrix()
      }
      renderer.render(scene, camera)
    }
    for (const cb of frameCallbacks) cb()
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

  async function loadModel(url, format, mtlUrl, extraMap) {
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

      if (format === '.obj' && mtlUrl) {
        await loadObjWithMtl(url, mtlUrl, extraMap)
        updateModelInfo()
        fitModelToView()
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

      if (format === '.stl') {
        const mat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.6, metalness: 0.1 })
        const mesh = new THREE.Mesh(object, mat)
        mesh.name = 'Modelo.stl'
        modelGroup.add(mesh)
      } else if (format === '.gltf' || format === '.glb') {
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

  const TEXTURE_EXTS = ['.jpg', '.jpeg', '.png', '.bmp', '.tga', '.tiff']

  function rewriteMtlTextures(text, extraMap) {
    if (!extraMap) return text
    return text.split('\n').map(line => {
      const trimmed = line.trim()
      const lower = trimmed.toLowerCase()
      for (const ext of TEXTURE_EXTS) {
        const idx = lower.indexOf(ext)
        if (idx === -1) continue
        let start = idx
        while (start > 0 && trimmed[start - 1] !== ' ' && trimmed[start - 1] !== '\t') start--
        const fullName = trimmed.substring(start, idx + ext.length)
        const bareName = fullName.split(/[\\/]/).pop().trim()
        const blobUrl = extraMap[bareName]
        if (!blobUrl) continue
        return trimmed.substring(0, start) + blobUrl
      }
      return line
    }).join('\n')
  }

  async function loadObjWithMtl(objUrl, mtlUrl, extraMap) {
    console.log('[MTL] extraMap keys:', Object.keys(extraMap))
    const mtlText = await fetch(mtlUrl).then(r => r.text())
    console.log('[MTL] Original:\n', mtlText)
    const rewritten = rewriteMtlTextures(mtlText, extraMap)
    console.log('[MTL] Rewritten:\n', rewritten)
    const mtlBlob = new Blob([rewritten], { type: 'text/plain' })
    const mtlObjUrl = URL.createObjectURL(mtlBlob)

    const objLoader = new OBJLoader()
    const mtlLoader = new MTLLoader()

    const materials = await new Promise((resolve) => {
      mtlLoader.load(mtlObjUrl, resolve, undefined, () => resolve(null))
    })

    URL.revokeObjectURL(mtlObjUrl)

    if (materials) {
      console.log('[MTL] Materiales creados:', Object.keys(materials.materialsInfo))
      materials.baseUrl = ''
      objLoader.setMaterials(materials)
    } else {
      console.warn('[MTL] Falló la carga del MTL')
    }

    const group = await loadWithLoader(objLoader, objUrl)

    if (!materials) {
      console.warn('[Viewer] Falló MTL, usando material gris')
      const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC })
      group.traverse(child => {
        if (child.isMesh) {
          child.material = fallbackMat
        }
      })
    }

    group.name = 'Modelo OBJ'
    modelGroup.add(group)
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

    if (orthoCamera) {
      orthoCamera.position.copy(camera.position)
      orthoCamera.quaternion.copy(camera.quaternion)
    }
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
    getCanvasRect,
    getCamera,
    getControls,
    onViewChange,
    toggleCamera,
    setViewDirection,
    cameraType
  }
}
