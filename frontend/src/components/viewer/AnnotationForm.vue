<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  screenPos: {
    type: Object,
    default: null
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['save', 'cancel'])

const texto = ref('')
const saving = ref(false)

const formStyle = ref({})

onMounted(() => {
  if (props.screenPos) {
    formStyle.value = {
      left: `${Math.min(props.screenPos.x, window.innerWidth - 320)}px`,
      top: `${Math.min(props.screenPos.y + 20, window.innerHeight - 260)}px`
    }
  } else {
    formStyle.value = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }
})

function submit() {
  if (!texto.value.trim() || saving.value) return
  saving.value = true
  emit('save', texto.value.trim())
}
</script>

<template>
  <div class="annotation-form-overlay" @click.self="$emit('cancel')">
    <div class="annotation-form" :style="formStyle">
      <div class="form-header">
        <h3>{{ screenPos ? 'Anotación en el modelo' : 'Comentario general' }}</h3>
        <button class="close-btn" @click="$emit('cancel')">×</button>
      </div>
      <textarea
        v-model="texto"
        placeholder="Escribí tu comentario..."
        maxlength="2000"
        rows="4"
        class="form-textarea"
        autofocus
      ></textarea>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <div class="form-actions">
        <button class="secondary" @click="$emit('cancel')">Cancelar</button>
        <button class="primary" :disabled="!texto.trim() || saving" @click="submit">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotation-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.15);
}

.annotation-form {
  position: fixed;
  width: 300px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  padding: 16px;
  z-index: 51;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.form-header h3 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 0;
  line-height: 1;
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.8rem;
  margin: 8px 0 0;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
