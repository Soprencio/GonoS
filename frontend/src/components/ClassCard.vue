<script setup>
import { useSpotlight } from '../composables/useSpotlight.js'

defineProps({
  clase: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const { onMouseMove, onMouseLeave } = useSpotlight()
</script>

<template>
  <div
    class="class-card"
    @click="$emit('click')"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <div class="card-header">
      <h3 class="card-title">{{ clase.nombre }}</h3>
      <span v-if="clase.rol === 'Profesor'" class="badge">Profesor</span>
      <span v-else-if="clase.rol === 'Creador'" class="badge">Creador</span>
    </div>
    <p v-if="clase.descripcion" class="card-desc">{{ clase.descripcion }}</p>
    <p class="card-meta">{{ clase.cantidad_trabajos || 0 }} trabajo(s)</p>
  </div>
</template>

<style scoped>
.class-card {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  animation: card-in 0.45s ease both;
  box-shadow: var(--shadow-card);
}

.class-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    380px circle at var(--mouse-x, -999px) var(--mouse-y, -999px),
    var(--color-spotlight),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1;
}

.class-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-accent);
}

.class-card:hover::before {
  opacity: 1;
}

.card-header,
.card-desc,
.card-meta {
  position: relative;
  z-index: 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-text);
  font-weight: 600;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  white-space: nowrap;
}

.card-desc {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  color: var(--color-text-disabled);
  font-size: 0.8rem;
  margin: 0;
}
</style>
