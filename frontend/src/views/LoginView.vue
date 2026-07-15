<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../state/auth.js'
import { useApi } from '../composables/useApi.js'

const router = useRouter()
const api = useApi()

const mail = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!mail.value || !password.value) {
    error.value = 'Completá todos los campos'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/login', {
      mail: mail.value,
      password: password.value
    })
    authState.login(res.data.user, res.data.token)
    router.push('/')
  } catch (err) {
    if (err.response) {
      error.value = err.response.data.error || 'Error al iniciar sesión'
    } else {
      error.value = 'No se pudo conectar con el servidor, intentá de nuevo'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-view">
    <div class="card">
      <h1>GonoS</h1>
      <p class="subtitle">Iniciar sesión</p>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="mail">Mail</label>
          <input id="mail" v-model="mail" type="email" placeholder="tu@mail.com" autocomplete="email" />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>

      <p class="footer-text">
        ¿No tenés cuenta?
        <router-link to="/registro">Registrate</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 40px 32px;
  width: 100%;
  max-width: 360px;
}

h1 {
  margin: 0 0 4px;
  font-size: 1.8rem;
  text-align: center;
  color: var(--color-text);
}

.subtitle {
  text-align: center;
  color: var(--color-text-muted);
  margin: 0 0 24px;
  font-size: 0.95rem;
}

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  box-sizing: border-box;
}

.error {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 0 0 16px;
}

button.primary {
  width: 100%;
  padding: 10px;
  font-size: 0.95rem;
  cursor: pointer;
}

button.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footer-text {
  text-align: center;
  margin: 24px 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
