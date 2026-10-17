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

const emit = defineEmits(['upload', 'error', 'file-change'])

const api = useApi()
const file = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const errorMsg = ref('')

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const formattedFormats = computed(() => {
  return props.acceptedFormats.map(f => f.toUpperCase())
})

const fileSizeFormatted = computed(() => {
  if (!file.value) return ''
  const mb = (file.value.size / (1024 * 1024)).toFixed(1)
  return `${mb} MB`
})

const sizePercentage = computed(() => {
  if (!file.value) return 0
  return Math.min(100, Math.round((file.value.size / MAX_SIZE) * 100))
})

function isAccepted(f) {
  const ext = '.' + f.name.split('.').pop().toLowerCase()
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
  e.target.value = ''
}

function validateAndSet(f) {
  errorMsg.value = ''
  const ext = '.' + f.name.split('.').pop().toLowerCase()
  if (!isAccepted(f)) {
    errorMsg.value = `Formato "${ext}" no aceptado. Permitidos: ${props.acceptedFormats.join(', ')}`
    file.value = null
    emit('file-change', null)
    emit('error', errorMsg.value)
    return
  }
  if (f.size > MAX_SIZE) {
    const sizeMb = (f.size / (1024 * 1024)).toFixed(1)
    errorMsg.value = `Archivo demasiado grande (${sizeMb} MB). El límite máximo es de 50 MB.`
    file.value = null
    emit('file-change', null)
    emit('error', errorMsg.value)
    return
  }
  file.value = f
  emit('file-change', f)
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
    const res = await api.post(props.url, formData, {
      onUploadProgress: e => {
        progress.value = e.total ? Math.round((e.loaded / e.total) * 100) : 0
      }
    })
    emit('upload', res.data)
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Error al subir el archivo'
    errorMsg.value = msg
    emit('error', msg)
  } finally {
    uploading.value = false
  }
}

function resetFile() {
  file.value = null
  errorMsg.value = ''
  progress.value = 0
  emit('file-change', null)
}

defineExpose({ submit })
</script>

<template>
  <div class="file-upload">
    <!-- Formats header badges -->
    <div class="formats-header">
      <span class="formats-label tech-label">Formatos admitidos:</span>
      <div class="formats-badges">
        <span
          v-for="fmt in formattedFormats"
          :key="fmt"
          class="format-badge"
        >
          {{ fmt }}
        </span>
      </div>
    </div>

    <!-- Drop Zone -->
    <div
      v-if="!file"
      class="drop-zone"
      :class="{ dragging, uploading }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="!uploading && $refs.input?.click()"
    >
      <div class="drop-content">
        <div class="drop-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p class="drop-title">Soltá tu archivo aquí o hacé clic para explorar</p>
        <p class="drop-subtitle font-mono">Máximo 50 MB por entrega</p>
      </div>
      <input
        ref="input"
        type="file"
        class="file-input"
        :accept="acceptedFormats.join(',')"
        @change="onInput"
      />
    </div>

    <!-- Selected File Preview Card -->
    <div v-else class="file-card" :class="{ uploading }">
      <div class="file-card-main">
        <div class="file-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div class="file-info">
          <div class="file-name" :title="file.name">{{ file.name }}</div>
          <div class="file-meta font-mono">
            <span>{{ fileSizeFormatted }} / 50.0 MB</span>
            <span class="file-percent">({{ sizePercentage }}% del cupo)</span>
          </div>
        </div>
        <button
          v-if="!uploading"
          type="button"
          class="remove-btn"
          title="Quitar archivo"
          @click="resetFile"
        >
          &times;
        </button>
      </div>

      <!-- Capacity Visual Bar -->
      <div class="capacity-meter">
        <div
          class="capacity-fill"
          :style="{ width: sizePercentage + '%' }"
        ></div>
      </div>
    </div>

    <!-- Upload Progress Bar with Technical Readout -->
    <div v-if="uploading" class="upload-progress-container">
      <div class="progress-header font-mono">
        <span class="progress-status">
          <span class="pulse-dot"></span>
          Subiendo archivo a plataforma...
        </span>
        <span class="progress-val">{{ progress }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMsg && !uploading" class="error-banner">
      <span class="error-icon">⚠️</span>
      <p class="error-text">{{ errorMsg }}</p>
    </div>

    <!-- Bottom Actions -->
    <div v-if="file && !uploading" class="actions">
      <button class="primary submit-btn" @click="submit">
        Subir entrega
      </button>
      <button class="secondary cancel-btn" @click="resetFile">
        Cambiar archivo
      </button>
    </div>
  </div>
</template>

<style scoped>
.file-upload {
  width: 100%;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Formats Header */
.formats-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.formats-label {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.formats-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.format-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

/* Drop Zone */
.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 42px 24px;
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-elevated);
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  box-shadow: 0 0 20px var(--color-accent-soft);
  transform: translateY(-1px);
}

.drop-zone.uploading {
  pointer-events: none;
  opacity: 0.6;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-icon {
  color: var(--color-accent);
  margin-bottom: 4px;
  transition: transform var(--transition-fast);
}

.drop-zone:hover .drop-icon {
  transform: translateY(-2px);
}

.drop-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.drop-subtitle {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.file-input {
  display: none;
}

/* File Selected Card */
.file-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color var(--transition-fast);
}

.file-card-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.file-icon {
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.file-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  gap: 6px;
  align-items: center;
}

.file-percent {
  color: var(--color-text-disabled);
}

.remove-btn {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  line-height: 1;
  transition: all var(--transition-fast);
}

.remove-btn:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

/* Capacity meter */
.capacity-meter {
  height: 4px;
  width: 100%;
  background: var(--color-bg-subtle);
  border-radius: 99px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 99px;
  transition: width var(--transition-normal);
}

/* Progress Section */
.upload-progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.progress-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-accent);
  font-weight: 500;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent);
  animation: pulse-glow 1.4s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
}

.progress-val {
  font-weight: 700;
  color: var(--color-text);
}

.progress-bar {
  height: 6px;
  background: var(--color-bg-subtle);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 99px;
  transition: width 180ms ease;
  box-shadow: 0 0 8px var(--color-accent);
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
}

.error-icon {
  font-size: 1rem;
}

.error-text {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Actions */
.actions {
  display: flex;
  gap: 10px;
}

.submit-btn {
  font-weight: 600;
}

.cancel-btn {
  font-weight: 500;
}
</style>
