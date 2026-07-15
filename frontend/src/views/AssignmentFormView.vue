<script setup>
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi.js'

const emit = defineEmits(['created', 'close'])
const props = defineProps({
  claseId: {
    type: [String, Number],
    required: true
  }
})

const api = useApi()

const descripcion = ref('')
const fechaEntrega = ref('')
const formatos = ref({
  obj: false,
  stl: false,
  gltf: false,
  glb: false,
  ifc: false,
  svg: false
})
const error = ref('')
const creating = ref(false)

function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatosList = ['obj', 'stl', 'gltf', 'glb', 'ifc', 'svg']

const selectedFormats = computed(() => {
  return Object.entries(formatos.value)
    .filter(([, v]) => v)
    .map(([k]) => `.${k}`)
})

async function submit() {
  error.value = ''
  if (!descripcion.value.trim()) {
    error.value = 'La descripción es obligatoria'
    return
  }
  if (!fechaEntrega.value) {
    error.value = 'La fecha de entrega es obligatoria'
    return
  }
  if (new Date(fechaEntrega.value) <= new Date()) {
    error.value = 'La fecha de entrega debe ser una fecha futura'
    return
  }
  if (selectedFormats.value.length === 0) {
    error.value = 'Seleccioná al menos un formato aceptado'
    return
  }

  creating.value = true
  try {
    const res = await api.post(`/clases/${props.claseId}/trabajos`, {
      descripcion: descripcion.value.trim(),
      fecha_entrega: fechaEntrega.value,
      formatos_aceptados: selectedFormats.value
    })
    emit('created', res.data)
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al crear el trabajo'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>Nuevo trabajo</h3>
      <form @submit.prevent="submit">
        <div class="field">
          <label for="af-desc">Descripción / Consigna</label>
          <textarea
            id="af-desc"
            v-model="descripcion"
            placeholder="Describí el trabajo a entregar..."
            rows="5"
          ></textarea>
        </div>
        <div class="field">
          <label for="af-fecha">Fecha de entrega</label>
          <input
            id="af-fecha"
            v-model="fechaEntrega"
            type="date"
            :min="today()"
          />
        </div>
        <div class="field">
          <label>Formatos aceptados</label>
          <div class="check-grid">
            <label
              v-for="fmt in formatosList"
              :key="fmt"
              class="check-item"
            >
              <input type="checkbox" v-model="formatos[fmt]" />
              <span>.{{ fmt }}</span>
            </label>
          </div>
          <p class="formats-note">
            Otros formatos como .fbx pueden no visualizarse correctamente.
          </p>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" class="secondary" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="primary" :disabled="creating">
            {{ creating ? 'Creando...' : 'Publicar trabajo' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  padding: 32px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  margin: 0 0 20px;
  color: var(--color-text);
}

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.field textarea,
.field input[type="date"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}

.field textarea {
  resize: vertical;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--color-text);
  cursor: pointer;
}

.check-item input[type="checkbox"] {
  accent-color: var(--color-accent);
}

.formats-note {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-disabled);
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 8px 0 0;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
