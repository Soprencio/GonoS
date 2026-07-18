<script setup>
const props = defineProps({
  trabajo: {
    type: Object,
    required: true
  },
  isTeacher: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

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
</script>

<template>
  <div class="assignment-card" @click="$emit('click')">
    <div class="card-body">
      <p class="desc">{{ trabajo.descripcion?.substring(0, 120) }}{{ trabajo.descripcion?.length > 120 ? '…' : '' }}</p>
      <p class="due-date">Entrega: {{ formatDate(trabajo.fecha_entrega) }}</p>
    </div>
    <div class="card-side">
      <template v-if="isTeacher">
        <span class="count">
          {{ trabajo.pendientes ?? '—' }} pendientes
        </span>
        <span class="count delivered">
          {{ trabajo.aprobados ?? 0 }} aprobados
        </span>
      </template>
      <template v-else>
        <span
          class="status-badge"
          :class="{
            'status-pending': trabajo.estado === 'Pendiente',
            'status-muted': trabajo.estado !== 'Pendiente'
          }"
        >
          {{ trabajo.estado || 'Sin estado' }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.assignment-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: box-shadow var(--transition-fast);
  background: var(--color-bg-elevated);
}

.assignment-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.card-body {
  flex: 1;
  min-width: 0;
}

.desc {
  margin: 0 0 6px;
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.4;
}

.due-date {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  white-space: nowrap;
}

.count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.delivered {
  color: var(--color-success);
}

.status-badge {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.status-pending {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.status-muted {
  background: var(--color-bg-subtle);
  color: var(--color-text-disabled);
}
</style>
