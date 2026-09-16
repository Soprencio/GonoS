<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'

const route = useRoute()
const router = useRouter()
const api = useApi()

const alumno = ref(null)
const trabajos = ref([])
const loading = ref(true)
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
    <div v-if="loading" class="state-msg">Cargando...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else>
      <header class="header">
        <button class="secondary" @click="router.back()">← Volver</button>
        <div v-if="alumno" class="header-info">
          <h1 class="title">{{ alumno.nombre }} {{ alumno.apellido }}</h1>
          <p class="subtitle">{{ alumno.mail }}</p>
        </div>
        <div v-else class="header-info">
          <h1 class="title">Alumno</h1>
          <p class="subtitle">No encontrado</p>
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
              v-for="t in trabajos"
              :key="t.tp_id"
              class="trabajo-card"
            >
              <div class="trabajo-header">
                <span class="trabajo-desc">{{ t.descripcion }}</span>
                <span :class="['estado-badge', estadoInfo(t.estado, t.tieneEntrega, t.fecha_entrega).cls]">
                  {{ estadoInfo(t.estado, t.tieneEntrega, t.fecha_entrega).label }}
                </span>
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
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
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
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin: 0 0 24px;
}

.content {
  flex: 1;
  padding: 24px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
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
  border-radius: var(--radius-md);
  padding: 14px 18px;
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

.estado-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  white-space: nowrap;
}

.estado-aprobado {
  background: #d4edda;
  color: #155724;
}

.estado-desaprobado {
  background: #fff3cd;
  color: #856404;
}

.estado-pendiente {
  background: #cce5ff;
  color: #004085;
}

.estado-no-entregado {
  background: #f8d7da;
  color: #721c24;
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
  color: #155724;
}

.nota.desaprobado-status {
  color: #721c24;
}

.nota-label {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.nota-label.aprobado {
  background: #d4edda;
  color: #155724;
}

.nota-label.desaprobado {
  background: #f8d7da;
  color: #721c24;
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
