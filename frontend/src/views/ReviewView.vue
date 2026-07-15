<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import Viewer3D from '../components/viewer/Viewer3D.vue'
import ElementTree from '../components/viewer/ElementTree.vue'
import ElementInfo from '../components/viewer/ElementInfo.vue'
import AnnotationPin from '../components/viewer/AnnotationPin.vue'
import AnnotationForm from '../components/viewer/AnnotationForm.vue'
import AnnotationPanel from '../components/viewer/AnnotationPanel.vue'

const ESTADOS = ['Pendiente', 'En revisión', 'Revisado', 'Aprobado']

const route = useRoute()
const router = useRouter()
const api = useApi()

const entrega = ref(null)
const loading = ref(true)
const error = ref('')
const blobUrl = ref('')
const viewerRef = ref(null)
const hierarchy = ref([])
const selectedId = ref('')
const is3DReady = ref(false)

const comentarios = ref([])
const comentariosLoading = ref(false)
const activeCommentId = ref(null)

const annotating = ref(false)
const formPosition = ref(null)
const formScreenPos = ref(null)
const formError = ref('')
const showForm = ref(false)

function getExtension(name) {
  if (!name) return ''
  return '.' + name.split('.').pop().toLowerCase()
}

const isProfesor = computed(() => entrega.value?.rol === 'Profesor')

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

async function handleEstadoChange(event) {
  const nuevo = event.target.value
  try {
    await api.patch(`/entregas/${route.params.id}/estado`, { estado: nuevo })
    if (entrega.value) entrega.value.estado = nuevo
  } catch (err) {
    if (err.response?.data?.error) alert(err.response.data.error)
  }
}

function toggleAnnotating() {
  annotating.value = !annotating.value
  showForm.value = false
  formPosition.value = null
  formScreenPos.value = null
  formError.value = ''
}

function startGeneralComment() {
  formPosition.value = null
  formScreenPos.value = null
  formError.value = ''
  showForm.value = true
}

function onAnnotatePoint({ worldPos, screenPos }) {
  formPosition.value = worldPos
  formScreenPos.value = screenPos
  formError.value = ''
  showForm.value = true
}

async function saveComment(texto) {
  formError.value = ''
  try {
    const payload = { texto }
    if (formPosition.value) payload.posicion = formPosition.value
    await api.post(`/entregas/${route.params.id}/comentarios`, payload)
    showForm.value = false
    formPosition.value = null
    formScreenPos.value = null
    await fetchComentarios()
  } catch (err) {
    formError.value = err.response?.data?.error || 'Error al guardar'
  }
}

function cancelForm() {
  showForm.value = false
  formPosition.value = null
  formScreenPos.value = null
  formError.value = ''
}

async function deleteComment(id) {
  try {
    await api.delete(`/comentarios/${id}`)
    await fetchComentarios()
    if (activeCommentId.value === id) activeCommentId.value = null
  } catch {
    alert('Error al eliminar comentario')
  }
}

function viewOnModel(pos) {
  if (!viewerRef.value?.focusOnPoint || !pos) return
  viewerRef.value.focusOnPoint(pos)
  activeCommentId.value = comentarios.value.find(
    c => c.posicion?.x === pos.x && c.posicion?.y === pos.y && c.posicion?.z === pos.z
  )?.com_priv_id || null
}

function onPinClick(id) {
  activeCommentId.value = id
}

function onSelect(id) {
  selectedId.value = id
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

function handleKeydown(e) {
  if (e.key === 'Escape' && showForm.value) {
    cancelForm()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  try {
    const res = await api.get(`/entregas/${route.params.id}`)
    entrega.value = res.data
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
})
</script>

<template>
  <div class="review-view">
    <div v-if="loading" class="state-msg">Cargando...</div>
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
          <select
            v-if="isProfesor"
            class="estado-select"
            :value="entrega.estado"
            @change="handleEstadoChange"
          >
            <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
          </select>
          <span v-else class="estado-badge">{{ entrega.estado }}</span>
          <button
            v-if="isProfesor && is3DFormat"
            class="secondary"
            :class="{ active: annotating }"
            @click="toggleAnnotating"
          >
            {{ annotating ? 'Cancelar anotación' : 'Agregar anotación' }}
          </button>
          <button
            v-if="isProfesor && annotating"
            class="secondary"
            @click="startGeneralComment"
          >
            Comentario general
          </button>
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
                  @click="onPinClick(c.com_priv_id)"
                />
              </div>
            </template>
          </Viewer3D>

          <div v-else-if="isSVG && blobUrl" class="simple-viewer">
            <object :data="blobUrl" type="image/svg+xml" class="svg-viewer">SVG no soportado</object>
          </div>

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
            <div v-if="comentariosLoading" class="loading-msg">Cargando comentarios...</div>
            <AnnotationPanel
              v-else
              :comentarios="comentarios"
              :readonly="!isProfesor"
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

      <AnnotationForm
        v-if="showForm"
        :screenPos="formScreenPos"
        :error="formError"
        @save="saveComment"
        @cancel="cancelForm"
      />
    </template>
  </div>
</template>

<style scoped>
.review-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.estado-select {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
}

.estado-badge {
  font-size: 0.82rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-text-muted);
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

.simple-viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 0;
}

.svg-viewer,
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
</style>
