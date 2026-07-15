<script setup>
defineProps({
  clase: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])
</script>

<template>
  <div class="class-card" @click="$emit('click')">
    <div class="card-header">
      <h3 class="card-title">{{ clase.nombre }}</h3>
      <span v-if="clase.rol === 'Profesor'" class="badge">Profesor</span>
    </div>
    <p v-if="clase.descripcion" class="card-desc">{{ clase.descripcion }}</p>
    <p class="card-meta">{{ clase.cantidad_trabajos || 0 }} trabajo(s)</p>
  </div>
</template>

<style scoped>
.class-card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: box-shadow var(--transition-fast);
}

.class-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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
