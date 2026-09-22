<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import { useDevTools } from '../composables/useDevTools.js'
import SkeletonBlock from '../components/SkeletonBlock.vue'
import Viewer3D from '../components/viewer/Viewer3D.vue'
import SvgViewer2D from '../components/viewer/SvgViewer2D.vue'
import ElementTree from '../components/viewer/ElementTree.vue'
import ElementInfo from '../components/viewer/ElementInfo.vue'
import AnnotationPin from '../components/viewer/AnnotationPin.vue'
import AnnotationPanel from '../components/viewer/AnnotationPanel.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { state: devState } = useDevTools()

const entrega = ref(null)
const loading = ref(true)
const isLoading = computed(() => loading.value || devState.forceSkeletons || devState.isSimulatingLoading)
const error = ref('')
const blobUrl = ref('')
const mtlUrl = ref('')
const extraMap = ref({})
const viewerRef = ref(null)
const svgViewerRef = ref(null)
const hierarchy = ref([])
const selectedId = ref('')
const is3DReady = ref(false)

const comentarios = ref([])
const comentariosLoading = ref(false)
const isComentariosLoading = computed(() => comentariosLoading.value || devState.forceSkeletons || devState.isSimulatingLoading)
const activeCommentId = ref(null)

const annotating = ref(false)
const pendingPin = ref(null)

const notaInput = ref('')
const savingNota = ref(false)

function getExtension(name) {
  if (!name) return ''
  return '.' + name.split('.').pop().toLowerCase()
}

const isProfesor = computed(() =>
  entrega.value?.rol === 'Profesor' || entrega.value?.rol === 'Creador'
)

const puedeCalificar = computed(() => !!entrega.value?.puedeCalificar)

const notaMinima = computed(() => {
  const nm = parseFloat(entrega.value?.nota_minima)
  return isNaN(nm) ? 6 : nm
})

const is3DFormat = computed(() => {
  if (!entrega.value) return false
  const ext = getExtension(entrega.value.nombre_original)
  return ['.obj', '.stl', '.gltf', '.glb', '.fbx', '.ifc'].includes(ext)
})

const isSVG = computed(() => {
  if (!entrega.value) return false
  return getExtension(entrega.value.nombre_original) === '.svg'
})

const isPDF = computed(() => {
  if (!entrega.value) return false
  return getExtension(entrega.value.nombre_original) === '.pdf'
})

const isImage = computed(() => {
  if (!entrega.value) return false
  const ext = getExtension(entrega.value.nombre_original)
  return ['.jpg', '.jpeg', '.png'].includes(ext)
})

const activeTab = ref('modelo')
const tabOptions = computed(() => {
  const tabs = []
  if (is3DFormat.value) tabs.push({ key: 'modelo', label: 'Modelo 3D' })
  if (isPDF.value || isSVG.value) tabs.push({ key: 'docs', label: 'Documentos' })
  if (isImage.value) tabs.push({ key: 'imagenes', label: 'Imágenes' })
  if (tabs.length > 0 && !tabs.find(t => t.key === activeTab.value)) {
    activeTab.value = tabs[0].key
  }
  return tabs
})

const rightTab = ref('comentarios')
const rightTabOptions = computed(() => {
  if (is3DFormat.value) return [
    { key: 'comentarios', label: 'Comentarios' },
    { key: 'propiedades', label: 'Propiedades' }
  ]
  return [{ key: 'comentarios', label: 'Comentarios' }]
})

function formatDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(iso))
}

async function fetchComentarios() {
  comentariosLoading.value = true
  try {
    const res = await api.get(`/entregas/${route.params.id}/comentarios`)
    comentarios.value = res.data
  } catch {
    comentarios.value = []
  } finally {
    comentariosLoading.value = false
  }
}

async function saveNota() {
  const nota = parseFloat(notaInput.value)
  if (isNaN(nota) || nota < 0 || nota > 10) {
    toast.error('La nota debe ser un número entre 0 y 10')
    return
  }
  savingNota.value = true
  try {
    const res = await api.patch(`/entregas/${route.params.id}/nota`, { nota })
    if (entrega.value) {
      entrega.value.nota = res.data.nota
      entrega.value.estado = res.data.estado
    }
    toast.success('Nota guardada correctamente')
  } catch (err) {
    toast.error(err.response?.data?.error || 'Error al guardar la nota')
  } finally {
    savingNota.value = false
  }
}

async function calificar() {
  const nota = parseFloat(notaInput.value)
  if (isNaN(nota) || nota < 0 || nota > 10) {
    toast.error('La nota debe ser un número entre 0 y 10')
    return
  }
  savingNota.value = true
  try {
    await api.patch(`/entregas/${route.params.id}/nota`, { nota })
    toast.success('Nota guardada correctamente')
    router.go(-1)
  } catch (err) {
    toast.error(err.response?.data?.error || 'Error al guardar la nota')
    savingNota.value = false
  }
}

function toggleAnnotating() {
  annotating.value = !annotating.value
}

function onAnnotatePoint({ worldPos, screenPos }) {
  pendingPin.value = { worldPos, screenPos, texto: '', saving: false, error: '' }
  rightTab.value = 'comentarios'
}

async function savePendingPin() {
  const pin = pendingPin.value
  if (!pin || !pin.texto.trim() || pin.saving) return
  pin.saving = true
  pin.error = ''
  try {
    const payload = { texto: pin.texto.trim(), posicion: pin.worldPos }
    await api.post(`/entregas/${route.params.id}/comentarios`, payload)
    pendingPin.value = null
    await fetchComentarios()
    toast.success('Anotación agregada')
  } catch (err) {
    pin.error = err.response?.data?.error || 'Error al guardar'
    pin.saving = false
    toast.error(pin.error)
  }
}

function cancelPendingPin() {
  pendingPin.value = null
}

async function deleteComment(id) {
  try {
    await api.delete(`/comentarios/${id}`)
    await fetchComentarios()
    if (activeCommentId.value === id) activeCommentId.value = null
    toast.success('Comentario eliminado')
  } catch {
    toast.error('Error al eliminar comentario')
  }
}

function viewOnModel(pos) {
  if (!pos) return
  if (isSVG.value && svgViewerRef.value?.focusOnPoint) {
    svgViewerRef.value.focusOnPoint(pos)
  } else if (viewerRef.value?.focusOnPoint) {
    viewerRef.value.focusOnPoint(pos)
  }
  activeCommentId.value = comentarios.value.find(
    c => c.posicion && Number(c.posicion.x) === Number(pos.x) && Number(c.posicion.y) === Number(pos.y) && Number(c.posicion.z) === Number(pos.z)
  )?.com_priv_id || null
}

function onPinClick(id) {
  activeCommentId.value = id
  const com = comentarios.value.find(c => c.com_priv_id === id)
  if (com && com.posicion) {
    if (isSVG.value && svgViewerRef.value?.focusOnPoint) {
      svgViewerRef.value.focusOnPoint(com.posicion)
    } else if (viewerRef.value?.focusOnPoint) {
      viewerRef.value.focusOnPoint(com.posicion)
    }
  }
}

function onSelect(id) {
  selectedId.value = id
  viewerRef.value?.selectUuid?.(id)
  if (is3DFormat.value) rightTab.value = 'propiedades'
}

function onCanvasSelect(hit) {
  if (hit && hit.object && hit.object.uuid) {
    selectedId.value = hit.object.uuid
    if (is3DFormat.value) rightTab.value = 'propiedades'
  }
}

const commentsWithPin = computed(() =>
  comentarios.value.filter(c => c.posicion)
)

function pinStyle(worldPos) {
  if (!viewerRef.value?.projectToScreen) return { display: 'none' }
  const screen = viewerRef.value.projectToScreen(worldPos)
  if (screen && screen.z <= 1) {
    return { left: `${screen.x}px`, top: `${screen.y}px`, display: 'block' }
  }
  return { display: 'none' }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && pendingPin.value && !pendingPin.value.texto.trim()) {
    cancelPendingPin()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  try {
    const res = await api.get(`/entregas/${route.params.id}`)
    entrega.value = res.data
    notaInput.value = res.data.nota != null ? String(res.data.nota) : ''

    const extras = res.data.archivos_extra || []
    const map = {}
    for (const ex of extras) {
      try {
        const r = await api.get(`/entregas/${route.params.id}/archivos/${ex.id}`, { responseType: 'blob' })
        const bUrl = URL.createObjectURL(r.data)
        map[ex.nombre_original] = bUrl
        if (ex.nombre_original.toLowerCase().endsWith('.mtl')) {
          mtlUrl.value = bUrl
        }
      } catch (e) {
        console.warn('No se pudo descargar archivo extra:', ex.nombre_original, e)
      }
    }
    extraMap.value = map

    const blobRes = await api.get(`/entregas/${route.params.id}/descargar`, { responseType: 'blob' })
    blobUrl.value = URL.createObjectURL(blobRes.data)

    await fetchComentarios()
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      router.push('/')
    } else {
      error.value = 'Error al cargar la entrega'
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  for (const bUrl of Object.values(extraMap.value)) {
    URL.revokeObjectURL(bUrl)
  }
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div class="review-view">
    <div v-if="isLoading" class="review-skeleton-wrapper" aria-hidden="true">
      <div class="skeleton-header">
        <SkeletonBlock width="80px" height="34px" />
        <SkeletonBlock width="35%" height="32px" />
      </div>
      <div class="skeleton-main-layout">
        <div class="skeleton-left-col">
          <SkeletonBlock width="70%" height="20px" />
          <SkeletonBlock width="100%" height="28px" />
          <SkeletonBlock width="100%" height="28px" />
          <SkeletonBlock width="100%" height="28px" />
        </div>
        <div class="skeleton-center-col">
          <div class="skeleton-3d-box">
            <div class="loader-orbit">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="spinner-3d">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <p>Cargando entorno de revisión...</p>
          </div>
        </div>
        <div class="skeleton-right-col">
          <SkeletonBlock width="80%" height="22px" />
          <SkeletonBlock width="100%" height="60px" border-radius="var(--radius-sm)" />
          <SkeletonBlock width="100%" height="60px" border-radius="var(--radius-sm)" />
        </div>
      </div>
    </div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="entrega">
      <header class="header">
        <div class="header-left">
          <button class="secondary" @click="router.go(-1)">← Volver</button>
          <div class="header-info">
            <h1 class="title">Revisar entrega</h1>
            <p class="subtitle">
              {{ entrega.alumno?.nombre }} — {{ formatDate(entrega.fecha_entrega) }}
              <span v-if="entrega.devolucion" class="tardia">({{ entrega.devolucion }})</span>
            </p>
          </div>
        </div>
        <div class="header-right">
          <div v-if="puedeCalificar" class="nota-section">
            <label class="nota-label">Nota</label>
            <input
              v-model="notaInput"
              type="number"
              min="0"
              max="10"
              step="0.5"
              class="nota-input"
              placeholder="0-10"
            />
            <span class="nota-minima-hint">mín. {{ notaMinima }}</span>
            <button class="primary small" :disabled="savingNota" @click="saveNota">
              {{ savingNota ? 'Guardando...' : 'Confirmar nota' }}
            </button>
            <button class="primary small" :disabled="savingNota" @click="calificar">
              {{ savingNota ? 'Guardando...' : 'Calificar' }}
            </button>
          </div>
          <div v-else class="nota-display">
            <span class="estado-badge">{{ entrega.estado }}</span>
            <span v-if="entrega.nota != null && entrega.nota > 0" class="nota-value">
              Nota: {{ entrega.nota }}
              <span :class="entrega.nota >= notaMinima ? 'aprobado' : 'desaprobado'">
                ({{ entrega.nota >= notaMinima ? 'Aprobado' : 'Desaprobado' }})
              </span>
            </span>
          </div>
          <button
            v-if="isProfesor && (is3DFormat || isSVG)"
            class="secondary"
            :class="{ active: annotating }"
            @click="toggleAnnotating"
          >
            {{ annotating ? 'Cancelar anotación' : 'Agregar anotación' }}
          </button>
          <span v-if="isProfesor && annotating" class="hint-btn">Hacé clic en el modelo para colocar un pin</span>
          <ThemeToggle />
        </div>
      </header>

      <main class="main-layout">
        <aside v-if="is3DFormat" class="panel panel-left">
          <div class="panel-header">Piezas</div>
          <ElementTree :hierarchy="hierarchy" :selectedId="selectedId" @select="onSelect" />
        </aside>

        <section class="panel panel-center pos-relative">
          <Viewer3D
            v-if="is3DFormat && blobUrl"
            ref="viewerRef"
            :src="blobUrl"
            :format="getExtension(entrega.nombre_original)"
            :mtlUrl="mtlUrl"
            :extraMap="extraMap"
            :annotating="annotating"
            @load="is3DReady = true; hierarchy = viewerRef?.extractHierarchy?.() || []"
            @select="onCanvasSelect"
            @annotate-point="onAnnotatePoint"
          >
            <template #fallback>
              <button class="secondary" @click="api.get(`/entregas/${route.params.id}/descargar`, { responseType: 'blob' }).then(r => { const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = entrega.nombre_original; a.click() })">Descargar original</button>
            </template>
            <template #overlay>
              <div v-if="is3DReady && viewerRef" class="pins-overlay">
                <AnnotationPin
                  v-for="c in commentsWithPin"
                  :key="c.com_priv_id"
                  :worldPos="c.posicion"
                  :projectFn="viewerRef.projectToScreen"
                  :registerFrameFn="viewerRef.registerFrameCallback"
                  :active="activeCommentId === c.com_priv_id"
                  :comentario="c"
                  @click="onPinClick(c.com_priv_id)"
                  @close="activeCommentId = null"
                />
                <div
                  v-if="pendingPin"
                  class="pin-pending"
                  :style="pinStyle(pendingPin.worldPos)"
                >
                  <div class="pin-pending-dot"></div>
                </div>
              </div>
            </template>
          </Viewer3D>

          <SvgViewer2D
            v-else-if="isSVG && blobUrl"
            ref="svgViewerRef"
            class="svg-container"
            :src="blobUrl"
            :annotating="annotating && isProfesor"
            :comentarios="commentsWithPin"
            :activeId="activeCommentId"
            :pending="pendingPin"
            @annotate-point="onAnnotatePoint"
            @select="onPinClick"
            @close="activeCommentId = null"
          />

          <div v-else-if="isPDF && blobUrl" class="simple-viewer">
            <iframe :src="blobUrl" class="pdf-viewer" title="Documento PDF"></iframe>
          </div>

          <div v-else-if="isImage && blobUrl" class="simple-viewer">
            <img :src="blobUrl" :alt="entrega.nombre_original" class="image-viewer" />
          </div>

          <div v-else class="simple-viewer empty-viewer">
            <p>Formato no disponible para previsualización.</p>
          </div>

        </section>

        <aside class="panel panel-right">
          <div class="panel-header">
            <button
              v-for="tab in rightTabOptions"
              :key="tab.key"
              class="tab-btn"
              :class="{ active: rightTab === tab.key }"
              @click="rightTab = tab.key"
            >{{ tab.label }}</button>
          </div>

          <div v-if="is3DFormat && rightTab === 'propiedades'" class="properties-section">
            <ElementInfo :info="null" />
          </div>

          <div class="annotations-section" :class="{ full: !(is3DFormat && rightTab === 'propiedades') }">
            <div v-if="pendingPin" class="pending-section">
              <div class="pending-header">Nuevo pin</div>
              <div class="pending-card">
                <div class="pin-coords">
                  X: {{ pendingPin.worldPos.x.toFixed(3) }} &nbsp; Y: {{ pendingPin.worldPos.y.toFixed(3) }}
                  <span v-if="!isSVG">&nbsp; Z: {{ pendingPin.worldPos.z.toFixed(3) }}</span>
                </div>
                <textarea
                  v-model="pendingPin.texto"
                  class="pending-textarea"
                  placeholder="Escribí tu comentario..."
                  maxlength="2000"
                  rows="3"
                ></textarea>
                <p v-if="pendingPin.error" class="error-msg">{{ pendingPin.error }}</p>
                <div class="pending-actions">
                  <button class="primary small" :disabled="!pendingPin.texto.trim() || pendingPin.saving" @click="savePendingPin()">
                    {{ pendingPin.saving ? 'Guardando...' : 'Guardar' }}
                  </button>
                  <button class="secondary small" @click="cancelPendingPin()">Descartar</button>
                </div>
              </div>
            </div>

            <div v-if="isComentariosLoading" class="comentarios-skeleton" aria-hidden="true">
              <div v-for="n in 3" :key="n" class="comentario-skeleton-card">
                <SkeletonBlock width="40%" height="14px" />
                <SkeletonBlock width="85%" height="12px" />
              </div>
            </div>
            <AnnotationPanel
              v-else
              :comentarios="comentarios"
              :readonly="!isProfesor"
              :activeId="activeCommentId"
              @ver-en-modelo="viewOnModel"
              @eliminar="deleteComment"
            />
          </div>
        </aside>
      </main>

      <div v-if="tabOptions.length > 0" class="bottom-tabs">
        <button
          v-for="tab in tabOptions"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

    </template>
  </div>
</template>

<style scoped>
.review-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-info {
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.subtitle {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.tardia { color: var(--color-danger); }

.estado-badge {
  font-size: 0.82rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-text-muted);
}

.nota-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nota-label {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.nota-minima-hint {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.nota-input {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: center;
}

.nota-input::-webkit-inner-spin-button {
  opacity: 1;
}

.nota-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nota-value {
  font-size: 0.82rem;
  color: var(--color-text);
  font-weight: 500;
}

.aprobado {
  color: var(--color-success, #2e7d32);
  font-weight: 600;
}

.desaprobado {
  color: var(--color-danger);
  font-weight: 600;
}

.header-right .secondary.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.main-layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-left {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg);
}

.panel-center {
  flex: 1;
  min-width: 0;
}

.panel-right {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid var(--color-border);
  background: var(--color-bg);
}

.panel-header {
  flex-shrink: 0;
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
}

.tab-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.tab-btn:hover { color: var(--color-text); }

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.properties-section {
  flex-shrink: 0;
  max-height: 50%;
  overflow-y: auto;
  border-bottom: 1px solid var(--color-border);
}

.annotations-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.annotations-section.full {
  max-height: none;
}

.loading-msg {
  padding: 16px;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  text-align: center;
}

.svg-container {
  flex: 1;
  min-height: 0;
}

.simple-viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 0;
}

.pdf-viewer,
.image-viewer {
  width: 100%;
  height: 100%;
  border: none;
}

.image-viewer { object-fit: contain; }

.empty-viewer p {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.pos-relative {
  position: relative;
}

.pins-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}

.pins-overlay > * {
  pointer-events: auto;
}

.bottom-tabs {
  display: flex;
  gap: 0;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  flex-shrink: 0;
}

.tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.tab:hover { color: var(--color-text); }

.tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.error { color: var(--color-danger); }

.hint-btn {
  font-size: 0.78rem;
  color: var(--color-accent);
  font-style: italic;
}

.pending-section {
  border-bottom: 1px solid var(--color-border);
  max-height: 40%;
  overflow-y: auto;
  flex-shrink: 0;
}

.pending-header {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-accent);
  padding: 10px 12px 6px;
  font-weight: 600;
}

.pending-card {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-accent-soft);
}

.pending-card:last-child { border-bottom: none; }

.pin-coords {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  font-family: monospace;
  margin-bottom: 6px;
}

.pending-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.82rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.pending-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

button.small {
  font-size: 0.75rem;
  padding: 4px 10px;
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
  border: 2px solid var(--color-bg-elevated);
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}

/* Skeletons en ReviewView */
.review-skeleton-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.review-skeleton-wrapper .skeleton-header {
  padding: 14px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-bg-elevated);
}

.skeleton-main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.skeleton-left-col {
  width: 240px;
  padding: 20px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-bg-elevated);
}

.skeleton-center-col {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-subtle);
}

.skeleton-3d-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.spinner-3d {
  color: var(--color-accent);
  animation: spin-3d 3s linear infinite;
}

@keyframes spin-3d {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.skeleton-right-col {
  width: 300px;
  padding: 20px;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--color-bg-elevated);
}

.comentarios-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.comentario-skeleton-card {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
