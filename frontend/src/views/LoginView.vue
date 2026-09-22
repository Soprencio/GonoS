<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../state/auth.js'
import { useApi } from '../composables/useApi.js'
import ThemeToggle from '../components/ThemeToggle.vue'
import GonosHeroViewer from '../components/GonosHeroViewer.vue'

const router = useRouter()
const api = useApi()

const mail = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!mail.value.trim() || !password.value) {
    error.value = 'Completá todos los campos'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await api.post('/auth/login', {
      mail: mail.value.trim(),
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
    <div class="theme-bar">
      <ThemeToggle />
    </div>

    <div class="auth-split-container">
      <!-- Cuadrante Izquierdo: Formulario de inicio de sesión -->
      <div class="quadrant-form">
        <div class="card">
          <h1>Iniciar sesión</h1>
          <p class="subtitle">Ingresá tus credenciales para continuar</p>

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

      <!-- Cuadrante Derecho: Ilusión 3D anamórfica de la G -->
      <div class="quadrant-hero">
        <div class="hero-header">
          <h2 class="hero-title">GonoS</h2>
          <p class="hero-subtitle">Plataforma de entrega y revisión en 3D</p>
        </div>
        <div class="hero-canvas-wrapper">
          <GonosHeroViewer />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  box-sizing: border-box;
}

.theme-bar {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 20;
}

.auth-split-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 48px;
  max-width: 1520px;
  width: 100%;
  margin: 0 auto;
  min-height: 540px;
  padding: 0 48px;
  box-sizing: border-box;
}

.quadrant-form {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  max-width: 440px;
}

.quadrant-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 540px;
  width: 100%;
  max-width: 640px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  box-sizing: border-box;
}

.hero-header {
  position: absolute;
  top: 22px;
  left: 24px;
  z-index: 5;
  pointer-events: none;
}

.hero-title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--color-text);
  font-weight: 700;
}

.hero-subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.hero-canvas-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
}

.card {
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 40px 32px;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
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

@media (max-width: 920px) {
  .auth-split-container {
    flex-direction: column;
    max-width: 440px;
    gap: 28px;
    margin-top: 40px;
    padding: 0;
  }

  .quadrant-hero {
    height: 380px;
    max-width: 100%;
  }

  .quadrant-form {
    justify-content: center;
    max-width: 100%;
  }
}
</style>
