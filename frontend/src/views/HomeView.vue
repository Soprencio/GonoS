<script setup>
import ThemeToggle from '../components/ThemeToggle.vue'
</script>

<template>
  <div class="home">
    <h1>GonoS</h1>
    <p class="subtitle">Plataforma de entrega y revisión de trabajos 3D</p>

    <div class="actions">
      <button class="primary">Botón primario</button>
      <button class="secondary">Botón secundario</button>
    </div>

    <div class="field">
      <label for="test-input">Input de prueba</label>
      <input id="test-input" type="text" placeholder="Escribí algo..." />
    </div>

    <div class="toggle-area">
      <ThemeToggle />
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 480px;
  margin: 80px auto;
  padding: 0 20px;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  margin: 0 0 8px;
  color: var(--color-text);
}

.subtitle {
  color: var(--color-text-muted);
  margin: 0 0 32px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.field {
  margin-bottom: 24px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.field input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  color: var(--color-text);
  width: 100%;
  box-sizing: border-box;
}

.toggle-area {
  margin-top: 32px;
}
</style>
