<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../state/auth.js'
import { useApi } from '../composables/useApi.js'

const router = useRouter()
const api = useApi()

const mail = ref('')
const password = ref('')
const confirmPassword = ref('')
const nombre = ref('')
const apellido = ref('')
const error = ref('')
const loading = ref(false)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function handleSubmit() {
  error.value = ''

  if (!mail.value || !password.value || !confirmPassword.value || !nombre.value || !apellido.value) {
    error.value = 'Completá todos los campos'
    return
  }

  if (!EMAIL_REGEX.test(mail.value)) {
    error.value = 'Formato de mail inválido'
    return
  }

  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/register', {
      mail: mail.value,
      password: password.value,
      nombre: nombre.value,
      apellido: apellido.value
    })
    authState.login(res.data.user, res.data.token)
    router.push('/')
  } catch (err) {
    if (err.response) {
      error.value = err.response.data.error || 'Error al crear la cuenta'
    } else {
      error.value = 'No se pudo conectar con el servidor, intentá de nuevo'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-view">
    <div class="card">
      <h1>GonoS</h1>
      <p class="subtitle">Crear cuenta</p>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="nombre">Nombre</label>
          <input id="nombre" v-model="nombre" type="text" placeholder="Tu nombre" autocomplete="given-name" />
        </div>

        <div class="field">
          <label for="apellido">Apellido</label>
          <input id="apellido" v-model="apellido" type="text" placeholder="Tu apellido" autocomplete="family-name" />
        </div>

        <div class="field">
          <label for="mail">Mail</label>
          <input id="mail" v-model="mail" type="email" placeholder="tu@mail.com" autocomplete="email" />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
        </div>

        <div class="field">
          <label for="confirm-password">Confirmar contraseña</label>
          <input id="confirm-password" v-model="confirmPassword" type="password" placeholder="Repetí la contraseña" autocomplete="new-password" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="footer-text">
        ¿Ya tenés cuenta?
        <router-link to="/login">Iniciá sesión</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-view {
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
  max-width: 400px;
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
  margin-bottom: 14px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.field input,
.field select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  box-sizing: border-box;
}

.field select {
  cursor: pointer;
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
