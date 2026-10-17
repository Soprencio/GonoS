<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'Sin estado'
  },
  pulse: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'sm', // 'sm' | 'md'
    validator: v => ['sm', 'md'].includes(v)
  }
})

const normalizedStatus = computed(() => {
  const s = props.status ? props.status.trim() : 'Sin estado'
  if (s === 'Revisado') return 'Desaprobado'
  return s
})

const variant = computed(() => {
  const s = normalizedStatus.value.toLowerCase()
  if (s.includes('pendiente')) return 'warning'
  if (s.includes('revisión') || s.includes('revision')) return 'info'
  if (s.includes('aprobado') && !s.includes('desaprobado')) return 'success'
  if (s.includes('desaprobado') || s.includes('rehacer') || s.includes('rechazado') || s.includes('revisado')) return 'danger'
  return 'neutral'
})

const shouldPulse = computed(() => {
  return props.pulse && (variant.value === 'warning' || variant.value === 'info')
})
</script>

<template>
  <span
    class="status-pill"
    :class="[
      `status-${variant}`,
      `size-${size}`,
      { 'is-pulsing': shouldPulse }
    ]"
    role="status"
    :aria-label="normalizedStatus"
  >
    <span class="status-dot" aria-hidden="true" />
    <span class="status-text">{{ normalizedStatus }}</span>
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 999px;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  width: fit-content;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.size-sm {
  padding: 4px 10px;
}

.size-md {
  padding: 6px 14px;
  font-size: 0.8rem;
  gap: 8px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}

.size-md .status-dot {
  width: 8px;
  height: 8px;
}

/* 1. Warning: Pendiente */
.status-warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border: 1px solid var(--color-warning-soft);
}

/* 2. Info: En revisión */
.status-info {
  background: var(--color-info-soft);
  color: var(--color-info);
  border: 1px solid var(--color-info-soft);
}

/* 3. Success: Aprobado */
.status-success {
  background: var(--color-success-soft);
  color: var(--color-success);
  border: 1px solid var(--color-success-soft);
}

/* 4. Danger: Desaprobado / Rehacer */
.status-danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-soft);
}

/* 5. Accent: Revisado */
.status-accent {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border: 1px solid var(--color-accent-soft);
}

/* 6. Neutral: Sin estado */
.status-neutral {
  background: var(--color-bg-subtle);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

/* Pulse Animation for active statuses */
.is-pulsing .status-dot {
  animation: led-breathe 2s ease-in-out infinite;
}

@keyframes led-breathe {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 4px currentColor;
  }
  50% {
    opacity: 0.45;
    transform: scale(0.85);
    box-shadow: 0 0 1px currentColor;
  }
}
</style>
