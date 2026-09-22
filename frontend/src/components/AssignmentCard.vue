<script setup>
import { computed } from 'vue'
import { useSpotlight } from '../composables/useSpotlight.js'
import StatusPill from './StatusPill.vue'
import { formatDate, getRelativeTime, getUrgencyStatus } from '../utils/dateUtils.js'

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

const { onMouseMove, onMouseLeave } = useSpotlight()

const isSubmitted = computed(() => {
  if (props.isTeacher) return false
  const s = props.trabajo.estado?.toLowerCase() || ''
  return s === 'aprobado' || s === 'en revisión' || s === 'desaprobado'
})

const relativeText = computed(() => {
  return getRelativeTime(props.trabajo.fecha_entrega, isSubmitted.value)
})

const urgency = computed(() => {
  return getUrgencyStatus(props.trabajo.fecha_entrega, isSubmitted.value)
})
</script>

<template>
  <div
    class="assignment-card"
    @click="$emit('click')"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <div class="card-body">
      <p class="desc">{{ trabajo.descripcion?.substring(0, 120) }}{{ trabajo.descripcion?.length > 120 ? '…' : '' }}</p>
      <div class="due-row">
        <span class="due-date">Entrega: {{ formatDate(trabajo.fecha_entrega) }}</span>
        <span
          v-if="relativeText"
          class="relative-tag font-mono"
          :class="`urgency-${urgency}`"
        >
          {{ relativeText }}
        </span>
      </div>
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
        <StatusPill :status="trabajo.estado" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.assignment-card {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
  background: var(--color-bg-subtle-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  animation: card-in 0.45s ease both;
  box-shadow: var(--shadow-card);
}

.assignment-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    360px circle at var(--mouse-x, -999px) var(--mouse-y, -999px),
    var(--color-spotlight),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1;
}

.assignment-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-accent);
  background: var(--color-bg-elevated-glass);
}

.assignment-card:hover::before {
  opacity: 1;
}

.card-body,
.card-side {
  position: relative;
  z-index: 2;
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
  font-weight: 500;
}

.due-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.due-date {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.relative-tag {
  font-size: 0.68rem;
  padding: 2px 6px;
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

</style>
