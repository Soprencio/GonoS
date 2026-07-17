<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import SubmissionRow from '../components/SubmissionRow.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()

const trabajo = ref(null)
const entregas = ref([])
const loading = ref(true)
const error = ref('')

const isTeacher = computed(() => trabajo.value?.rol === 'Profesor')

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

const entregadoMsg = computed(() => {
  return route.query.entregado === '1' ? '¡Trabajo entregado correctamente!' : ''
})

onMounted(async () => {
  try {
    const res = await api.get(`/trabajos/${route.params.id}`)
    trabajo.value = res.data

    if (res.data.rol === 'Profesor') {
      const res2 = await api.get(`/trabajos/${route.params.id}/entregas`)
      entregas.value = res2.data
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
</script>

<template>
  <div class="assignment-view">
    <div v-if="loading" class="state-msg">Cargando...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="trabajo">
      <header class="header">
        <button class="secondary" @click="router.push(`/clase/${trabajo.clase_id}`)">← Volver a la clase</button>
        <h1 class="title">Trabajo práctico</h1>
      </header>

      <main class="content">
        <p v-if="entregadoMsg" class="success-msg">{{ entregadoMsg }}</p>

        <p class="clase-name">{{ trabajo.clase_nombre }}</p>

        <section class="section">
          <h2>Consigna</h2>
          <p class="consigna">{{ trabajo.descripcion }}</p>
        </section>

        <section class="section">
          <h2>Fecha de entrega</h2>
          <p class="due-date">{{ formatDate(trabajo.fecha_entrega) }}</p>
        </section>

        <section class="section">
          <h2>Formatos aceptados</h2>
          <div class="formats">
            <span
              v-for="fmt in (trabajo.formatos_aceptados || [])"
              :key="fmt"
              class="format-badge"
            >{{ fmt }}</span>
          </div>
        </section>

        <!-- Alumno -->
        <div v-if="trabajo.rol === 'Alumno'" class="actions">
          <button
            v-if="!trabajo.asignacion?.entrega_id"
            class="primary"
            @click="router.push(`/trabajo/${route.params.id}/nueva-entrega`)"
          >
            Entregar trabajo
          </button>
          <button
            v-else
            class="secondary"
            @click="router.push(`/entrega/${trabajo.asignacion.entrega_id}/revisar`)"
          >
            Ver mi entrega
          </button>
          <p class="estado-info">
            Estado: <strong>{{ trabajo.asignacion?.estado || 'Sin estado' }}</strong>
            <span v-if="trabajo.asignacion?.nota != null && trabajo.asignacion.nota > 0">
              — Nota: {{ trabajo.asignacion.nota }}
              <span :class="trabajo.asignacion.nota >= 6 ? 'aprobado' : 'desaprobado'">
                ({{ trabajo.asignacion.nota >= 6 ? 'Aprobado' : 'Desaprobado' }})
              </span>
            </span>
          </p>
        </div>

        <!-- Profesor: tabla de entregas -->
        <div v-if="isTeacher" class="entregas-section">
          <h2>Entregas</h2>
          <div v-if="entregas.length === 0" class="empty">Todavía no hay entregas.</div>
          <table v-else class="entregas-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Fecha de entrega</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <SubmissionRow v-for="e in entregas" :key="e.entrega_id" :entrega="e" />
            </tbody>
          </table>
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.assignment-view {
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
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.clase-name {
  color: var(--color-accent);
  font-size: 0.9rem;
  margin: 0 0 24px;
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
}

.due-date {
  color: var(--color-text);
  margin: 0;
  font-weight: 500;
}

.formats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.format-badge {
  padding: 4px 12px;
  border-radius: 10px;
  background: var(--color-bg-subtle);
  color: var(--color-text);
  font-size: 0.85rem;
  font-family: monospace;
}

.success-msg {
  text-align: center;
  padding: 16px;
  margin-bottom: 24px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-radius: var(--radius-md);
  font-weight: 500;
}

.actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.actions button {
  margin-bottom: 12px;
}

.estado-info {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.entregas-section {
  margin-top: 40px;
}

.entregas-section h2 {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0 0 16px;
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.entregas-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.entregas-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-border);
}

.entregas-table th:last-child {
  text-align: right;
}

.aprobado {
  color: var(--color-success, #2e7d32);
  font-weight: 600;
}

.desaprobado {
  color: var(--color-danger);
  font-weight: 600;
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
