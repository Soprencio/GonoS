<script setup>
const props = defineProps({
  comentarios: {
    type: Array,
    default: () => []
  },
  readonly: {
    type: Boolean,
    default: false
  },
  activeId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['ver-en-modelo', 'eliminar'])

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
</script>

<template>
  <div class="annotation-panel">
    <div class="panel-header">Comentarios</div>

    <div v-if="comentarios.length === 0" class="empty">Sin comentarios todavía.</div>

    <div v-else class="comment-list">
      <div
        v-for="c in comentarios"
        :key="c.com_priv_id"
        class="comment-card"
        :class="{ active: activeId === c.com_priv_id }"
      >
        <div class="comment-text">{{ c.comentario }}</div>
        <div class="comment-meta">
          <span class="comment-author" v-if="c.profesor">{{ c.profesor }}</span>
          <span class="comment-date">{{ formatDate(c.fecha) }}</span>
          <div class="comment-actions">
            <button
              v-if="c.posicion"
              class="link-btn"
              @click="emit('ver-en-modelo', c.posicion)"
              title="Ver en el modelo"
            >Ver en modelo</button>
            <button
              v-if="!readonly"
              class="link-btn danger"
              @click="emit('eliminar', c.com_priv_id)"
              title="Eliminar comentario"
            >Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  flex-shrink: 0;
  padding: 10px 12px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
}

.empty {
  padding: 16px;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  text-align: center;
}

.comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.comment-card {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  background: var(--color-bg-elevated);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.comment-card.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-soft);
}

.comment-text {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
  word-wrap: break-word;
  margin-bottom: 8px;
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.comment-author {
  font-size: 0.72rem;
  color: var(--color-accent);
  font-weight: 600;
}

.comment-date {
  font-size: 0.72rem;
  color: var(--color-text-disabled);
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.link-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--color-accent);
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

.link-btn.danger {
  color: var(--color-danger);
}
</style>
