<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import { useDevTools } from '../composables/useDevTools.js'
import SkeletonBlock from '../components/SkeletonBlock.vue'
import SubmissionRow from '../components/SubmissionRow.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import BackgroundToggle from '../components/BackgroundToggle.vue'
import StatusPill from '../components/StatusPill.vue'
import { formatDate, getRelativeTime, getUrgencyStatus, getLateInfo } from '../utils/dateUtils.js'

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

const isAlumnoSubmitted = computed(() => {
  return !!trabajo.value?.asignacion?.entrega_id
})

const relativeDueText = computed(() => {
  if (!trabajo.value?.fecha_entrega) return ''
  return getRelativeTime(trabajo.value.fecha_entrega, isAlumnoSubmitted.value)
})

const dueUrgency = computed(() => {
  if (!trabajo.value?.fecha_entrega) return 'normal'
  return getUrgencyStatus(trabajo.value.fecha_entrega, isAlumnoSubmitted.value)
})

const alumnoLateInfo = computed(() => {
  const asig = trabajo.value?.asignacion
  if (!asig?.fecha_entrega_alumno || !trabajo.value?.fecha_entrega) return null
  return getLateInfo(asig.fecha_entrega_alumno, trabajo.value.fecha_entrega)
})

function exportToCSV() {
  if (!entregas.value || entregas.value.length === 0) return

  const headers = [
    'Alumno',
    'Email',
    'Archivo entregado',
    'Fecha de entrega',
    'Puntualidad',
    'Estado',
    'Nota',
    'Nota mínima'
  ]

  const rows = entregas.value.map(e => {
    const alumno = `"${(e.alumno_nombre + ' ' + e.alumno_apellido).replace(/"/g, '""')}"`
    const mail = `"${(e.alumno_mail || '').replace(/"/g, '""')}"`
    const archivo = `"${(e.nombre_original || '').replace(/"/g, '""')}"`
    const fecha = `"${formatDate(e.fecha_entrega)}"`
    const late = getLateInfo(e.fecha_entrega, e.fecha_limite)
    const puntualidad = late ? `"Tardía (${late})"` : '"A tiempo"'
    const estado = `"${e.estado || 'Sin estado'}"`
    const nota = e.nota != null && e.nota > 0 ? e.nota : '""'
    const notaMin = e.nota_minima != null ? e.nota_minima : '6'

    return [alumno, mail, archivo, fecha, puntualidad, estado, nota, notaMin].join(',')
  })

  // Prefijo UTF-8 BOM para que Excel abra caracteres acentuados correctamente
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (trabajo.value?.descripcion || 'trabajo').slice(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_')
  a.download = `Calificaciones_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  toast.success('Planilla CSV exportada correctamente')
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
          <BackgroundToggle />
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
              <div class="due-container">
                <p class="due-date">{{ formatDate(trabajo.fecha_entrega) }}</p>
                <span
                  v-if="relativeDueText"
                  class="relative-tag font-mono"
                  :class="`urgency-${dueUrgency}`"
                >
                  {{ relativeDueText }}
                </span>
              </div>
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
            <div class="estado-info">
              <span class="estado-label">Estado:</span>
              <StatusPill :status="trabajo.asignacion?.estado" />
              <span
                v-if="alumnoLateInfo"
                class="late-badge font-mono"
                :title="`Entregaste ${alumnoLateInfo} después de la fecha límite`"
              >
                ⏱️ Fuera de término ({{ alumnoLateInfo }})
              </span>
              <span v-if="trabajo.asignacion?.nota != null && trabajo.asignacion.nota > 0" class="nota-span">
                — Nota: {{ trabajo.asignacion.nota }}
                <span :class="trabajo.asignacion.nota >= notaMinima ? 'aprobado' : 'desaprobado'">
                  ({{ trabajo.asignacion.nota >= notaMinima ? 'Aprobado' : 'Desaprobado' }})
                </span>
              </span>
            </div>
          </div>
        </article>

        <!-- Profesor: tabla de entregas recuadrada -->
        <div v-if="isTeacher" class="entregas-card-box">
          <div class="entregas-header">
            <h2 class="card-section-title">Entregas de alumnos ({{ entregas.length }})</h2>
            <button
              v-if="entregas.length > 0"
              type="button"
              class="secondary export-csv-btn"
              @click="exportToCSV"
              title="Descargar calificaciones y estado de entregas en formato CSV"
            >
              📥 Exportar planilla CSV
            </button>
          </div>
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
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
  font-weight: 700;
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
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
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
  background: var(--color-bg-subtle-glass);
  border: 1px solid var(--glass-border);
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

.due-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.relative-tag {
  font-size: 0.72rem;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 600;
  line-height: 1.2;
}

.urgency-urgent {
  color: var(--color-warning);
  background: var(--color-warning-soft);
  border: 1px solid var(--color-warning-soft);
  animation: urgent-pulse 1.8s infinite ease-in-out;
}

@keyframes urgent-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(0.97); }
}

.urgency-warning {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.urgency-expired {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.urgency-submitted {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.urgency-normal {
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
}

.late-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger-soft);
  padding: 2px 8px;
  border-radius: 4px;
  line-height: 1.2;
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.estado-label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.nota-span {
  display: inline-flex;
  gap: 4px;
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.entregas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.export-csv-btn {
  font-size: 0.8rem;
  padding: 6px 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.export-csv-btn:hover {
  transform: translateY(-1px);
  border-color: var(--color-accent);
  color: var(--color-accent);
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
