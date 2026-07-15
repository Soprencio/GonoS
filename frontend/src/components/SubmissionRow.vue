<script setup>
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'

const props = defineProps({
  entrega: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const api = useApi()

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

function formatAlumno(e) {
  return `${e.alumno_nombre} ${e.alumno_apellido}`
}

async function descargar() {
  try {
    const res = await api.get(`/entregas/${props.entrega.entrega_id}/descargar`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = props.entrega.nombre_original
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error al descargar:', err)
  }
}
</script>

<template>
  <tr class="submission-row">
    <td class="cell alumno">{{ formatAlumno(entrega) }}</td>
    <td class="cell date">{{ formatDate(entrega.fecha_entrega) }}</td>
    <td class="cell status">
      <span
        class="status-badge"
        :class="{
          'status-pending': entrega.estado === 'Pendiente',
          'status-review': entrega.estado === 'En revisión',
          'status-done': entrega.estado === 'Revisado' || entrega.estado === 'Aprobado'
        }"
      >
        {{ entrega.estado }}
      </span>
      <span v-if="entrega.devolucion" class="devolucion">{{ entrega.devolucion }}</span>
    </td>
    <td class="cell actions">
      <button class="primary" @click="router.push(`/entrega/${entrega.entrega_id}/revisar`)" title="Revisar entrega">Revisar</button>
      <button class="secondary" @click="descargar" title="Descargar original">Descargar</button>
    </td>
  </tr>
</template>

<style scoped>
.submission-row {
  border-bottom: 1px solid var(--color-border);
}

.submission-row:last-child {
  border-bottom: none;
}

.cell {
  padding: 14px 16px;
  font-size: 0.9rem;
  color: var(--color-text);
  vertical-align: middle;
}

.alumno {
  font-weight: 500;
}

.date {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 500;
  width: fit-content;
}

.status-pending {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.status-review {
  background: rgba(224, 103, 16, 0.12);
  color: var(--color-accent);
}

.status-done {
  background: var(--color-bg-subtle);
  color: var(--color-success);
}

.devolucion {
  font-size: 0.75rem;
  color: var(--color-danger);
}

.actions {
  text-align: right;
}
</style>
