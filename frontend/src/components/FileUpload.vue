<script setup>
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi.js'

const props = defineProps({
  acceptedFormats: {
    type: Array,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  extraFiles: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['upload', 'error'])

const api = useApi()
const file = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const errorMsg = ref('')

const MAX_SIZE = 50 * 1024 * 1024

const dropZoneText = computed(() => {
  if (uploading.value) return 'Subiendo...'
  if (file.value) return file.value.name
  return 'Soltá el archivo aquí o hacé clic para seleccionar'
})

function isAccepted(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  return props.acceptedFormats.includes(ext)
}

function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) validateAndSet(f)
}

function onInput(e) {
  const f = e.target?.files?.[0]
  if (f) validateAndSet(f)
}

function validateAndSet(f) {
  errorMsg.value = ''
  const ext = '.' + f.name.split('.').pop().toLowerCase()
  if (!isAccepted(f)) {
    errorMsg.value = `Formato ${ext} no aceptado. Formatos válidos: ${props.acceptedFormats.join(', ')}`
    file.value = null
    emit('error', errorMsg.value)
    return
  }
  if (f.size > MAX_SIZE) {
    errorMsg.value = `Archivo demasiado grande (máx 50MB)`
    file.value = null
    emit('error', errorMsg.value)
    return
  }
  file.value = f
}

async function submit() {
  if (!file.value || uploading.value) return
  uploading.value = true
  progress.value = 0
  errorMsg.value = ''

  const formData = new FormData()
  formData.append('archivo', file.value)
  for (const ef of props.extraFiles) {
    formData.append('archivos_extra', ef)
  }

  try {
    await api.post(props.url, formData, {
      onUploadProgress: e => {
        progress.value = e.total ? Math.round((e.loaded / e.total) * 100) : 0
      }
    })
    emit('upload')
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Error al subir el archivo'
    errorMsg.value = msg
    emit('error', msg)
  } finally {
    uploading.value = false
  }
}

function retry() {
  errorMsg.value = ''
}

function resetFile() {
  file.value = null
  errorMsg.value = ''
  progress.value = 0
}

defineExpose({ submit })
</script>

<template>
  <div class="file-upload">
    <div
      class="drop-zone"
      :class="{ dragging, 'has-file': file, uploading: uploading }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="!file && !uploading && $refs.input?.click()"
    >
      <p v-if="!file && !uploading" class="drop-text">{{ dropZoneText }}</p>
      <p v-else-if="uploading" class="drop-text uploading-text">{{ dropZoneText }}</p>
      <p v-else class="drop-text file-name">{{ dropZoneText }}</p>
      <input
        ref="input"
        type="file"
        class="file-input"
        :accept="acceptedFormats.join(',')"
        @input="onInput"
      />
    </div>

    <div v-if="uploading" class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <p v-if="errorMsg && !uploading" class="error-msg">{{ errorMsg }}</p>

    <div v-if="file && !uploading" class="actions">
      <button class="primary" :disabled="uploading" @click="submit">
        {{ file ? 'Subir archivo' : 'Seleccionar archivo' }}
      </button>
      <button class="secondary" @click="resetFile">Cancelar</button>
    </div>

    <div v-if="errorMsg && !uploading" class="actions">
      <button class="primary" @click="retry">Reintentar</button>
    </div>
  </div>
</template>

<style scoped>
.file-upload {
  max-width: 500px;
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
  position: relative;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.drop-zone.uploading {
  pointer-events: none;
  opacity: 0.7;
}

.file-input {
  display: none;
}

.drop-text {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.file-name {
  color: var(--color-text);
  font-weight: 500;
  word-break: break-all;
}

.uploading-text {
  color: var(--color-accent);
}

.progress-bar {
  height: 6px;
  background: var(--color-bg-subtle);
  border-radius: 99px;
  margin-top: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 99px;
  transition: width 200ms ease;
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 12px 0 0;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
</style>
