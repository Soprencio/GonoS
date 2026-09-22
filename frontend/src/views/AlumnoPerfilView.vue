<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useDevTools } from '../composables/useDevTools.js'
import SkeletonBlock from '../components/SkeletonBlock.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import StatusPill from '../components/StatusPill.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const { state: devState } = useDevTools()

const alumno = ref(null)
const trabajos = ref([])
const loading = ref(true)
const isLoading = computed(() => loading.value || devState.forceSkeletons || devState.isSimulatingLoading)
const error = ref('')
const esDocente = ref(false)

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

function estadoInfo(estado, tieneEntrega, fechaEntrega) {
  if (estado === 'Aprobado') return { label: 'Aprobado', cls: 'estado-aprobado' }
  if (estado === 'Revisado' || estado === 'Desaprobado') return { label: 'Desaprobado', cls: 'estado-desaprobado' }
  if (tieneEntrega) return { label: 'En revisión', cls: 'estado-pendiente' }
  if (new Date(fechaEntrega) < new Date()) return { label: 'No entregado', cls: 'estado-no-entregado' }
  return { label: 'Pendiente', cls: 'estado-pendiente' }
}

function notaDisplay(nota) {
  if (nota === null || nota === undefined) return '-'
  return Number(nota).toFixed(2)
}

function notaStatus(nota, notaMinima) {
  if (nota === null || nota === undefined) return ''
  const nm = parseFloat(notaMinima)
  const umbral = isNaN(nm) ? 6 : nm
  return nota >= umbral ? 'aprobado-status' : 'desaprobado-status'
}

function aprobado(nota, notaMinima) {
  if (nota === null || nota === undefined) return false
  const nm = parseFloat(notaMinima)
  const umbral = isNaN(nm) ? 6 : nm
  return nota >= umbral
}

onMounted(async () => {
  try {
    const claseId = route.params.claseId
    const usuarioId = route.params.usuarioId

    const alumnoRes = await api.get(`/clases/${claseId}/participantes`)
    esDocente.value = alumnoRes.data.miRol === 'Profesor' || alumnoRes.data.miRol === 'Creador'

    const todos = [
      ...alumnoRes.data.creador,
      ...alumnoRes.data.profesores,
      ...alumnoRes.data.alumnos
    ]
    alumno.value = todos.find(p => p.usuario_id == usuarioId) || null

    if (esDocente.value && alumno.value) {
      const trabajosRes = await api.get(`/usuarios/${usuarioId}/trabajos`, { params: { clase_id: claseId } })
      trabajos.value = trabajosRes.data
    }
  } catch (err) {
    if (err.response?.status === 403) {
      error.value = 'No tenés permiso para ver el perfil de este alumno'
    } else {
      error.value = 'Error al cargar los datos del alumno'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="perfil-view">
    <div v-if="isLoading" class="perfil-skeleton-wrapper" aria-hidden="true">
      <div class="skeleton-header">
        <SkeletonBlock width="80px" height="34px" />
        <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
          <SkeletonBlock width="40%" height="26px" />
          <SkeletonBlock width="25%" height="16px" />
        </div>
      </div>
      <div class="skeleton-body">
        <SkeletonBlock width="100%" height="90px" border-radius="var(--radius-sm)" />
        <SkeletonBlock width="100%" height="90px" border-radius="var(--radius-sm)" />
      </div>
    </div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else>
      <header class="header">
        <div class="header-left">
          <button class="secondary" @click="router.back()">← Volver</button>
          <div v-if="alumno" class="header-info">
            <h1 class="title">{{ alumno.nombre }} {{ alumno.apellido }}</h1>
            <p class="subtitle">{{ alumno.mail }}</p>
          </div>
          <div v-else class="header-info">
            <h1 class="title">Alumno</h1>
            <p class="subtitle">No encontrado</p>
          </div>
        </div>
        <div class="header-right">
          <ThemeToggle />
        </div>
      </header>

      <main class="content">
        <p v-if="alumno?.fecha_ingreso" class="ingreso-info">
          Se unió a la clase el {{ formatDate(alumno.fecha_ingreso) }}
        </p>

        <template v-if="esDocente">
          <h2 class="section-title">Trabajos asignados</h2>

          <p v-if="trabajos.length === 0" class="empty">Este alumno no tiene trabajos asignados.</p>
          <div v-else class="trabajos-list">
            <div
              v-for="(t, i) in trabajos"
              :key="t.tp_id"
              class="trabajo-card"
              :style="{ animationDelay: i * 45 + 'ms' }"
            >
              <div class="trabajo-header">
                <span class="trabajo-desc">{{ t.descripcion }}</span>
                <StatusPill :status="estadoInfo(t.estado, t.tieneEntrega, t.fecha_entrega).label" />
              </div>
              <div class="trabajo-meta">
                <span class="meta-label">Entrega:</span>
                <span class="meta-value" :class="{ 'vencido': new Date(t.fecha_entrega) < new Date() }">
                  {{ formatDate(t.fecha_entrega) }}
                </span>
              </div>
              <div class="trabajo-meta">
                <span class="meta-label">Nota:</span>
                <span :class="['meta-value', 'nota', notaStatus(t.nota, t.nota_minima)]">
                  {{ notaDisplay(t.nota) }}
                </span>
                <span v-if="aprobado(t.nota, t.nota_minima)" class="nota-label aprobado">Aprobado</span>
                <span v-else-if="t.nota !== null" class="nota-label desaprobado">Desaprobado</span>
              </div>
            </div>
          </div>
        </template>
      </main>
    </template>
  </div>
</template>

<style scoped>
.perfil-view {
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

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.ingreso-info {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin: 0 0 24px;
}

.content {
  flex: 1;
  padding: 32px;
  max-width: 780px;
  width: calc(100% - 48px);
  margin: 28px auto 60px;
  box-sizing: border-box;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.section-title {
  margin: 0 0 16px;
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
  gap: 10px;
}

.trabajo-card {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  animation: card-in 0.45s ease both;
}

.trabajo-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.trabajo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.trabajo-desc {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 500;
  flex: 1;
}


.trabajo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.82rem;
}

.meta-label {
  color: var(--color-text-muted);
}

.meta-value {
  color: var(--color-text);
}

.meta-value.vencido {
  color: var(--color-danger);
}

.nota {
  font-weight: 600;
}

.nota.aprobado-status {
  color: var(--color-success);
}

.nota.desaprobado-status {
  color: var(--color-danger);
}

.nota-label {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.nota-label.aprobado {
  background: var(--color-accent-soft);
  color: var(--color-success);
}

.nota-label.desaprobado {
  background: var(--color-bg-subtle);
  color: var(--color-danger);
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}

/* Skeletons en AlumnoPerfilView */
.perfil-skeleton-wrapper {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.perfil-skeleton-wrapper .skeleton-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.perfil-skeleton-wrapper .skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
