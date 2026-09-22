<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import StatusPill from './StatusPill.vue'
import { formatDate, getLateInfo } from '../utils/dateUtils.js'

const props = defineProps({
  entrega: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const api = useApi()

const notaMinima = computed(() => {
  const nm = parseFloat(props.entrega.nota_minima)
  return isNaN(nm) ? 6 : nm
})

const lateInfo = computed(() => {
  return getLateInfo(props.entrega.fecha_entrega, props.entrega.fecha_limite)
})

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
    <td class="cell date">
      <div class="date-col">
        <span>{{ formatDate(entrega.fecha_entrega) }}</span>
        <span
          v-if="lateInfo"
          class="late-badge font-mono"
          :title="`Entregado ${lateInfo} después de la fecha límite`"
        >
          ⏱️ {{ lateInfo }}
        </span>
      </div>
    </td>
    <td class="cell status">
      <StatusPill :status="entrega.estado" />
      <span v-if="entrega.devolucion" class="devolucion">{{ entrega.devolucion }}</span>
      <span v-if="entrega.nota != null && entrega.nota > 0" class="nota-badge font-mono">
        Nota: <strong>{{ entrega.nota }}</strong>
        <span :class="entrega.nota >= notaMinima ? 'nota-aprobado' : 'nota-desaprobado'">
          ({{ entrega.nota >= notaMinima ? 'Aprobado' : 'Desaprobado' }})
        </span>
      </span>
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

.date-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.late-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger-soft);
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
  line-height: 1.2;
}

.status {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.devolucion {
  font-size: 0.75rem;
  color: var(--color-danger);
}

.nota-badge {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.nota-aprobado {
  color: var(--color-success, #2e7d32);
  font-weight: 600;
}

.nota-desaprobado {
  color: var(--color-danger);
  font-weight: 600;
}

.actions {
  text-align: right;
}
</style>
