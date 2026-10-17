<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../state/auth.js'
import { themeState } from '../state/theme.js'
import { useApi } from '../composables/useApi.js'

const emit = defineEmits(['error'])

const router = useRouter()
const api = useApi()

const googleBtnContainer = ref(null)
const clientId = ref(import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
const isReady = ref(false)
const isAuthenticating = ref(false)

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve()
      return
    }
    const existing = document.getElementById('google-gsi-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')))
      return
    }
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'))
    document.head.appendChild(script)
  })
}

async function handleCredentialResponse(response) {
  if (!response || !response.credential) {
    emit('error', 'No se recibió respuesta de Google')
    return
  }

  isAuthenticating.value = true
  emit('error', '')

  try {
    const res = await api.post('/auth/google', {
      credential: response.credential
    })
    authState.login(res.data.user, res.data.token)
    router.push('/')
  } catch (err) {
    const msg = err.response?.data?.error || 'Error al iniciar sesión con Google'
    emit('error', msg)
  } finally {
    isAuthenticating.value = false
  }
}

function renderGoogleButton() {
  if (!clientId.value || !googleBtnContainer.value || !window.google?.accounts?.id) return

  googleBtnContainer.value.innerHTML = ''
  window.google.accounts.id.initialize({
    client_id: clientId.value,
    callback: handleCredentialResponse,
    auto_select: false
  })

  const containerWidth = googleBtnContainer.value.clientWidth || 330
  window.google.accounts.id.renderButton(googleBtnContainer.value, {
    theme: themeState.current === 'dark' ? 'filled_black' : 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    width: Math.min(Math.max(containerWidth, 240), 380),
    locale: 'es'
  })
}

watch(() => themeState.current, () => {
  if (isReady.value && clientId.value) {
    renderGoogleButton()
  }
})

function handleFallbackClick() {
  emit(
    'error',
    'Para usar Google Sign-In, agregá tu GOOGLE_CLIENT_ID en el archivo backend/.env y reiniciá el backend.'
  )
}

onMounted(async () => {
  try {
    if (!clientId.value) {
      const cfg = await api.get('/auth/google-config')
      if (cfg.data?.clientId) {
        clientId.value = cfg.data.clientId
      }
    }

    if (clientId.value) {
      await loadGoogleScript()
      isReady.value = true
      renderGoogleButton()
    }
  } catch {
    // Si aún no está configurado o sin conexión, mostrar el botón informativo
  }
})
</script>

<template>
  <div class="google-auth-section">
    <div class="divider">
      <span>o continuar con</span>
    </div>

    <!-- Contenedor oficial de Google Identity Services cuando GOOGLE_CLIENT_ID está activo -->
    <div
      v-show="clientId && isReady"
      ref="googleBtnContainer"
      class="google-btn-container"
    ></div>

    <!-- Botón visual mientras se configura GOOGLE_CLIENT_ID -->
    <button
      v-if="!clientId || !isReady"
      type="button"
      class="google-fallback-btn"
      :disabled="isAuthenticating"
      @click="handleFallbackClick"
    >
      <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 15.65 5 12c0-3.65 3.36-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
        />
      </svg>
      <span>{{ isAuthenticating ? 'Conectando con Google...' : 'Continuar con Google' }}</span>
    </button>
  </div>
</template>

<style scoped>
.google-auth-section {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 16px;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.divider span {
  padding: 0 12px;
  text-transform: lowercase;
}

.google-btn-container {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: 42px;
}

.google-fallback-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.google-fallback-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--color-surface-hover);
}

.google-icon {
  color: var(--color-accent);
  flex-shrink: 0;
}
</style>
