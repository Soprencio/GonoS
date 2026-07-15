<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import FileUpload from '../components/FileUpload.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()

const trabajo = ref(null)
const loading = ref(true)
const error = ref('')
const successMsg = ref('')

onMounted(async () => {
  try {
    const res = await api.get(`/trabajos/${route.params.id}`)
    trabajo.value = res.data
    if (res.data.rol !== 'Alumno') {
      router.push(`/trabajo/${route.params.id}`)
    }
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      router.push('/')
    } else {
      error.value = 'Error al cargar el trabajo'
    }
  } finally {
    loading.value = false
  }
})

function onUpload() {
  successMsg.value = '¡Trabajo entregado correctamente!'
  setTimeout(() => {
    router.push(`/trabajo/${route.params.id}?entregado=1`)
  }, 1500)
}

function onError() {
  successMsg.value = ''
}
</script>

<template>
  <div class="new-submission">
    <div v-if="loading" class="state-msg">Cargando...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="trabajo">
      <header class="header">
        <button class="secondary" @click="router.push(`/trabajo/${route.params.id}`)">← Volver</button>
        <h1 class="title">Nueva entrega</h1>
      </header>

      <main class="content">
        <section class="section">
          <h2>Consigna</h2>
          <p class="consigna">{{ trabajo.descripcion }}</p>
        </section>

        <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>

        <FileUpload
          v-else
          :acceptedFormats="trabajo.formatos_aceptados || []"
          :url="`/asignaciones/${trabajo.asignacion?.asignacion_id}/entregas`"
          @upload="onUpload"
          @error="onError"
        />
      </main>
    </template>
  </div>
</template>

<style scoped>
.new-submission {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.content {
  flex: 1;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.section {
  margin-bottom: 28px;
}

.section h2 {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.consigna {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
  font-size: 0.9rem;
}

.success-msg {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-success);
  font-size: 1.1rem;
  font-weight: 500;
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}
</style>
