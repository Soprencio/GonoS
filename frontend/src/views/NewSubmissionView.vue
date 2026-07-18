<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import FileUpload from '../components/FileUpload.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()

const trabajo = ref(null)
const loading = ref(true)
const error = ref('')
const successMsg = ref('')

const extraFiles = ref([])
const fileUploadRef = ref(null)

const formatos = computed(() => trabajo.value?.formatos_aceptados || [])

const isObjSelected = computed(() => {
  if (!fileUploadRef.value) return false
  return formatos.value.includes('.obj')
})

function onFileSelected() {
}

const EXTRA_ACCEPTED = ['.mtl', '.jpg', '.jpeg', '.png', '.bmp', '.tga', '.tiff', '.svg', '.pdf']

function addExtraFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!EXTRA_ACCEPTED.includes(ext)) {
    return
  }
  const exists = extraFiles.value.some(f => f.name === file.name && f.size === file.size)
  if (exists) return
  extraFiles.value.push(file)
}

function removeExtra(index) {
  extraFiles.value.splice(index, 1)
}

function onExtraDrop(e, index) {
  e.preventDefault()
  const dt = e.dataTransfer
  if (dt?.files?.length) {
    for (const f of dt.files) {
      addExtraFile(f)
    }
  }
}

function onExtraInput(e, index) {
  const files = e.target?.files
  if (files) {
    for (const f of files) {
      addExtraFile(f)
    }
  }
  e.target.value = ''
}

function handleSubmit() {
  if (fileUploadRef.value) fileUploadRef.value.submit()
}

onMounted(async () => {
  try {
    const res = await api.get(`/trabajos/${route.params.id}`)
    trabajo.value = res.data
    if (res.data.rol !== 'Alumno') {
      router.push(`/trabajo/${route.params.id}`)
    }
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      router.push('/')
    } else {
      error.value = 'Error al cargar el trabajo'
    }
  } finally {
    loading.value = false
  }
})

function onUpload() {
  successMsg.value = '¡Trabajo entregado correctamente!'
  setTimeout(() => {
    router.push(`/trabajo/${route.params.id}?entregado=1`)
  }, 1500)
}

function onError() {
  successMsg.value = ''
}
</script>

<template>
  <div class="new-submission">
    <div v-if="loading" class="state-msg">Cargando...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="trabajo">
      <header class="header">
        <button class="secondary" @click="router.push(`/trabajo/${route.params.id}`)">← Volver</button>
        <h1 class="title">Nueva entrega</h1>
      </header>

      <main class="content">
        <section class="section">
          <h2>Consigna</h2>
          <p class="consigna">{{ trabajo.descripcion }}</p>
        </section>

        <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>

        <template v-else>
          <FileUpload
            ref="fileUploadRef"
            :acceptedFormats="formatos"
            :url="`/asignaciones/${trabajo.asignacion?.asignacion_id}/entregas`"
            :extraFiles="extraFiles"
            @upload="onUpload"
            @error="onError"
            @file-change="onFileSelected"
          />

          <div v-if="isObjSelected" class="extra-section">
            <h3>Archivos complementarios (opcional)</h3>
            <p class="extra-hint">Agregá el archivo .mtl y las texturas (.jpg, .png) para ver colores y materiales en el visor 3D.</p>

            <div class="extra-slots">
              <div
                v-for="(ef, i) in extraFiles"
                :key="i"
                class="extra-slot"
              >
                <span class="extra-filename">{{ ef.name }}</span>
                <button class="remove-btn" @click="removeExtra(i)">&times;</button>
              </div>

              <div
                class="extra-slot drop-slot"
                @dragover.prevent
                @drop.prevent="e => onExtraDrop(e, extraFiles.length)"
                @click="$refs.extraInput?.click()"
              >
                <span class="drop-text">+ Soltá archivos aquí o hacé clic</span>
                <input
                  ref="extraInput"
                  type="file"
                  :accept="EXTRA_ACCEPTED.join(',')"
                  multiple
                  class="extra-input"
                  @input="onExtraInput"
                />
              </div>
            </div>
          </div>
        </template>
      </main>
    </template>
  </div>
</template>

<style scoped>
.new-submission {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.content {
  flex: 1;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.section {
  margin-bottom: 28px;
}

.section h2 {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.consigna {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
  font-size: 0.9rem;
}

.success-msg {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-success);
  font-size: 1.1rem;
  font-weight: 500;
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}

.extra-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.extra-section h3 {
  font-size: 0.9rem;
  margin: 0 0 4px;
  color: var(--color-text);
}

.extra-hint {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin: 0 0 12px;
}

.extra-slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.extra-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}

.extra-slot.drop-slot {
  border-style: dashed;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.extra-slot.drop-slot:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.drop-text {
  flex: 1;
  text-align: center;
}

.extra-filename {
  font-size: 0.85rem;
  color: var(--color-text);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.extra-input {
  display: none;
}
</style>
