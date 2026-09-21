<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import { useDevTools } from '../composables/useDevTools.js'
import SkeletonBlock from '../components/SkeletonBlock.vue'
import SubmissionRow from '../components/SubmissionRow.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { state: devState } = useDevTools()

const trabajo = ref(null)
const entregas = ref([])
const loading = ref(true)
const isLoading = computed(() => loading.value || devState.forceSkeletons || devState.isSimulatingLoading)
const error = ref('')

const comentariosPublicos = ref([])
const nuevoComentario = ref('')
const postingComentario = ref(false)

const isTeacher = computed(() =>
  trabajo.value?.rol === 'Profesor' || trabajo.value?.rol === 'Creador'
)

const notaMinima = computed(() => {
  const nm = parseFloat(trabajo.value?.nota_minima)
  return isNaN(nm) ? 6 : nm
})

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

async function fetchComentarios() {
  try {
    const res = await api.get(`/trabajos/${route.params.id}/comentarios-publicos`)
    comentariosPublicos.value = res.data
  } catch {
    // ignorar
  }
}

async function postComentario() {
  const msg = nuevoComentario.value.trim()
  if (!msg || postingComentario.value) return
  postingComentario.value = true
  try {
    const res = await api.post(`/trabajos/${route.params.id}/comentarios-publicos`, { mensaje: msg })
    comentariosPublicos.value.push(res.data)
    nuevoComentario.value = ''
    toast.success('Comentario publicado')
  } catch (err) {
    toast.error(err.response?.data?.error || 'Error al enviar comentario')
  } finally {
    postingComentario.value = false
  }
}

onMounted(async () => {
  try {
    const res = await api.get(`/trabajos/${route.params.id}`)
    trabajo.value = res.data

    if (res.data.rol === 'Profesor' || res.data.rol === 'Creador') {
      const res2 = await api.get(`/trabajos/${route.params.id}/entregas`)
      entregas.value = res2.data
    }

    await fetchComentarios()
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
    <div v-if="isLoading" class="assignment-skeleton-wrapper" aria-hidden="true">
      <div class="skeleton-header">
        <SkeletonBlock width="130px" height="34px" />
        <SkeletonBlock width="40%" height="28px" />
      </div>
      <div class="skeleton-sections">
        <div class="skeleton-card-box">
          <SkeletonBlock width="120px" height="20px" />
          <SkeletonBlock width="85%" height="16px" />
          <SkeletonBlock width="65%" height="16px" />
        </div>
        <div class="skeleton-card-box">
          <SkeletonBlock width="140px" height="20px" />
          <SkeletonBlock width="200px" height="16px" />
        </div>
      </div>
    </div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="trabajo">
      <header class="header">
        <div class="header-left">
          <button class="secondary" @click="router.push(`/clase/${trabajo.clase_id}`)">← Volver a la clase</button>
          <h1 class="title">Trabajo práctico</h1>
        </div>
        <div class="header-right">
          <ThemeToggle />
        </div>
      </header>

      <main class="content">
        <p v-if="entregadoMsg" class="success-msg">{{ entregadoMsg }}</p>

        <!-- TARJETA PRINCIPAL DEL TRABAJO (RECUADRO DE TEXTOS) -->
        <article class="assignment-card-box">
          <p class="clase-name">{{ trabajo.clase_nombre }}</p>

          <div class="consigna-group">
            <span class="group-label">Consigna</span>
            <div class="consigna-box">
              <p class="consigna">{{ trabajo.descripcion }}</p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Fecha de entrega</span>
              <p class="due-date">{{ formatDate(trabajo.fecha_entrega) }}</p>
            </div>

            <div class="meta-item">
              <span class="meta-label">Formatos aceptados</span>
              <div class="formats">
                <span
                  v-for="fmt in (trabajo.formatos_aceptados || [])"
                  :key="fmt"
                  class="format-badge"
                >{{ fmt }}</span>
              </div>
            </div>

            <div class="meta-item">
              <span class="meta-label">Nota mínima</span>
              <p class="due-date">{{ notaMinima }}</p>
            </div>
          </div>

          <!-- Alumno: Acciones de entrega -->
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
                <span :class="trabajo.asignacion.nota >= notaMinima ? 'aprobado' : 'desaprobado'">
                  ({{ trabajo.asignacion.nota >= notaMinima ? 'Aprobado' : 'Desaprobado' }})
                </span>
              </span>
            </p>
          </div>
        </article>

        <!-- Profesor: tabla de entregas recuadrada -->
        <div v-if="isTeacher" class="entregas-card-box">
          <h2 class="card-section-title">Entregas de alumnos</h2>
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

        <!-- COMENTARIOS PÚBLICOS RECUADRADOS -->
        <section class="comentarios-card-box">
          <h2 class="card-section-title">Comentarios públicos</h2>

          <div class="comentarios-list">
            <div
              v-for="(c, i) in comentariosPublicos"
              :key="c.id"
              :class="['comentario-card', { 'profesor-comentario': c.esProfesor }]"
              :style="{ animationDelay: i * 45 + 'ms' }"
            >
              <div class="comentario-header">
                <span class="comentario-autor">{{ c.autor }}</span>
                <span v-if="c.esProfesor" class="comentario-badge">Profesor</span>
                <span class="comentario-fecha">{{ formatDate(c.created_at) }}</span>
              </div>
              <p class="comentario-texto">{{ c.mensaje }}</p>
            </div>
          </div>

          <div class="comentario-form">
            <textarea
              v-model="nuevoComentario"
              placeholder="Escribí un comentario..."
              rows="2"
              class="comentario-input"
              @keydown.ctrl.enter="postComentario"
            ></textarea>
            <div class="comentario-actions">
              <button
                class="primary"
                :disabled="!nuevoComentario.trim() || postingComentario"
                @click="postComentario"
              >{{ postingComentario ? 'Enviando...' : 'Comentar' }}</button>
            </div>
          </div>
        </section>
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
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
}

.title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.content {
  flex: 1;
  padding: 28px 16px 60px;
  max-width: 780px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.assignment-card-box,
.entregas-card-box,
.comentarios-card-box {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 28px 32px;
  box-shadow: var(--shadow-card);
  margin-bottom: 24px;
}

.clase-name {
  color: var(--color-accent);
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0 0 18px;
}

.card-section-title {
  font-size: 1.1rem;
  color: var(--color-text);
  margin: 0 0 20px;
  font-weight: 600;
}

.consigna-group {
  margin-bottom: 20px;
}

.group-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
}

.consigna-box {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
}

.consigna {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
  font-size: 0.95rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.due-date {
  color: var(--color-text);
  margin: 0;
  font-weight: 500;
  font-size: 0.92rem;
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
  border: 1px solid var(--color-border);
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
  margin-top: 24px;
  padding: 18px 20px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.actions button {
  margin-bottom: 12px;
}

.estado-info {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
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

/* COMENTARIOS PÚBLICOS */
.comentarios-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.comentario-card {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  border-left: 3px solid transparent;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  animation: card-in 0.45s ease both;
}

.comentario-card.profesor-comentario {
  border-left-color: var(--color-accent);
  background: var(--color-bg-elevated);
}

.comentario-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.comentario-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comentario-autor {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text);
}

.comentario-badge {
  font-size: 0.7rem;
  background: var(--color-accent);
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.comentario-fecha {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin-left: auto;
}

.comentario-texto {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.5;
  white-space: pre-wrap;
}

.comentario-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comentario-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.comentario-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.comentario-actions {
  display: flex;
  justify-content: flex-end;
}

.aprobado {
  color: var(--color-success);
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

/* Skeletons en AssignmentView */
.assignment-skeleton-wrapper {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skeleton-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card-box {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
