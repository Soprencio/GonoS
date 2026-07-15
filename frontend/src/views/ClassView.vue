<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import AssignmentCard from '../components/AssignmentCard.vue'
import AssignmentFormView from './AssignmentFormView.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()

const clase = ref(null)
const trabajos = ref([])
const loading = ref(true)
const error = ref('')
const copied = ref(false)
const showForm = ref(false)

const isTeacher = computed(() => clase.value?.rol === 'Profesor')

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

async function copyCode() {
  if (!clase.value?.codigo) return
  try {
    await navigator.clipboard.writeText(clase.value.codigo)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = clase.value.codigo
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

async function fetchTrabajos() {
  try {
    const res = await api.get(`/clases/${route.params.id}/trabajos`)
    trabajos.value = res.data
  } catch {
    // si falla, mostramos lo que haya (puede ser que el endpoint nuevo no esté)
  }
}

function goToTrabajo(tpId) {
  router.push(`/trabajo/${tpId}`)
}

function onTrabajoCreated(nuevo) {
  trabajos.value.unshift(nuevo)
  showForm.value = false
}

onMounted(async () => {
  try {
    const res = await api.get(`/clases/${route.params.id}`)
    clase.value = res.data
    await fetchTrabajos()
  } catch (err) {
    if (err.response && err.response.status === 403) {
      router.push('/')
    } else {
      error.value = 'Error al cargar la clase'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="class-view">
    <div v-if="loading" class="state-msg">Cargando...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="clase">
      <header class="header">
        <button class="secondary" @click="router.push('/')">← Volver</button>
        <h1 class="title">{{ clase.nombre }}</h1>
      </header>

      <main class="content">
        <p v-if="clase.descripcion" class="desc">{{ clase.descripcion }}</p>

        <div v-if="clase.codigo" class="code-section">
          <p class="code-label">Código de invitación</p>
          <div class="code-row">
            <code class="code">{{ clase.codigo }}</code>
            <button class="secondary" @click="copyCode">
              {{ copied ? '¡Copiado!' : 'Copiar' }}
            </button>
          </div>
        </div>

        <section class="trabajos-section">
          <div class="section-header">
            <h2>Trabajos</h2>
            <button v-if="isTeacher" class="primary" @click="showForm = true">+ Nuevo trabajo</button>
          </div>

          <p v-if="trabajos.length === 0" class="empty">Todavía no hay trabajos en esta clase.</p>
          <div v-else class="trabajos-list">
            <AssignmentCard
              v-for="t in trabajos"
              :key="t.tp_id"
              :trabajo="t"
              :isTeacher="isTeacher"
              @click="goToTrabajo(t.tp_id)"
            />
          </div>
        </section>
      </main>

      <AssignmentFormView
        v-if="showForm"
        :claseId="route.params.id"
        @created="onTrabajoCreated"
        @close="showForm = false"
      />
    </template>
  </div>
</template>

<style scoped>
.class-view {
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
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.desc {
  color: var(--color-text-muted);
  margin: 0 0 24px;
}

.code-section {
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-bottom: 32px;
}

.code-label {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.code-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--color-accent);
  background: transparent;
  padding: 0;
}

.trabajos-section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.trabajos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}
</style>
