<script setup>
const props = defineProps({
  info: {
    type: Object,
    default: null
  }
})
</script>

<template>
  <div class="element-info">
    <p v-if="!info" class="empty">Seleccioná una pieza del modelo o del árbol para ver sus propiedades.</p>
    <div v-else class="info-content">
      <h3 class="info-title">{{ info.name }}</h3>
      <dl class="info-list">
        <div class="info-row">
          <dt>Tipo</dt>
          <dd>{{ info.type }}</dd>
        </div>
        <div class="info-row">
          <dt>UUID</dt>
          <dd class="uuid">{{ info.uuid }}</dd>
        </div>
        <div v-if="info.vertices != null" class="info-row">
          <dt>Vértices</dt>
          <dd>{{ info.vertices.toLocaleString() }}</dd>
        </div>
        <div v-if="info.triangles != null" class="info-row">
          <dt>Triángulos</dt>
          <dd>{{ info.triangles.toLocaleString() }}</dd>
        </div>
      </dl>
    </div>
    <div class="placeholder">
      <p>Anotaciones y correcciones próximamente (Sprint 6).</p>
    </div>
  </div>
</template>

<style scoped>
.element-info {
  height: 100%;
  overflow-y: auto;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
}

.empty {
  color: var(--color-text-muted);
  padding: 16px;
  margin: 0;
  text-align: center;
}

.info-content {
  padding: 12px;
}

.info-title {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-text);
  word-break: break-word;
}

.info-list {
  margin: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row dt {
  color: var(--color-text-muted);
}

.info-row dd {
  margin: 0;
  color: var(--color-text);
  font-weight: 500;
  text-align: right;
}

.uuid {
  font-family: monospace;
  font-size: 0.7rem;
}

.placeholder {
  margin-top: auto;
  padding: 16px 12px;
  border-top: 1px solid var(--color-border);
}

.placeholder p {
  margin: 0;
  color: var(--color-text-disabled);
  font-size: 0.8rem;
  text-align: center;
}
</style>
