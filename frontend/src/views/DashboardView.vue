<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../state/auth.js'
import { useApi } from '../composables/useApi.js'
import ThemeToggle from '../components/ThemeToggle.vue'
import ClassCard from '../components/ClassCard.vue'

const router = useRouter()
const api = useApi()

const clases = ref([])
const loading = ref(true)

const showCreateModal = ref(false)
const createNombre = ref('')
const createDescripcion = ref('')
const creating = ref(false)
const createError = ref('')

const showJoinInput = ref(false)
const joinCode = ref('')
const joining = ref(false)
const joinError = ref('')

const isEmpty = computed(() => !loading.value && clases.value.length === 0)

function normalizeCode(e) {
  joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function fetchClases() {
  try {
    const res = await api.get('/clases')
    clases.value = res.data
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

async function createClass() {
  if (!createNombre.value.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const res = await api.post('/clases', {
      nombre: createNombre.value.trim(),
      descripcion: createDescripcion.value.trim() || undefined
    })
    clases.value.unshift(res.data)
    showCreateModal.value = false
    createNombre.value = ''
    createDescripcion.value = ''
  } catch (err) {
    createError.value = err.response?.data?.error || 'Error al crear la clase'
  } finally {
    creating.value = false
  }
}

async function joinClass() {
  if (!joinCode.value) return
  joining.value = true
  joinError.value = ''
  try {
    const res = await api.get(`/clases/codigo/${joinCode.value}`)
    await api.post(`/clases/${res.data.clase_id}/unirse`, { codigo: joinCode.value })
    await fetchClases()
    showJoinInput.value = false
    joinCode.value = ''
  } catch (err) {
    joinError.value = err.response?.data?.error || 'Error al unirse a la clase'
  } finally {
    joining.value = false
  }
}

function goToClass(id) {
  router.push(`/clase/${id}`)
}

function handleLogout() {
  authState.logout()
  router.push('/login')
}

onMounted(fetchClases)
</script>

<template>
  <div class="dashboard">
    <header class="header">
      <h1 class="logo">GonoS</h1>
      <div class="header-actions">
        <ThemeToggle />
        <button class="secondary" @click="handleLogout">Cerrar sesión</button>
      </div>
    </header>

    <main class="content">
      <div class="top-bar">
        <h2>Mis clases</h2>
        <div class="actions">
          <button class="primary" @click="showCreateModal = true">+ Crear clase</button>
          <button class="primary" @click="showJoinInput = !showJoinInput">+ Unirse con código</button>
        </div>
      </div>

      <div v-if="showJoinInput" class="join-box">
        <input
          v-model="joinCode"
          @input="normalizeCode"
          placeholder="CÓDIGO"
          maxlength="6"
          class="code-input"
        />
        <button class="primary" :disabled="joining || !joinCode" @click="joinClass">
          {{ joining ? 'Uniendo...' : 'Unirse' }}
        </button>
        <p v-if="joinError" class="error-msg">{{ joinError }}</p>
      </div>

      <div v-if="loading" class="state-msg">Cargando clases...</div>
      <div v-else-if="isEmpty" class="state-msg">
        <p>Todavía no tenés clases.</p>
        <p>Creá una o unite a una con el código de invitación.</p>
      </div>
      <div v-else class="grid">
        <ClassCard
          v-for="c in clases"
          :key="c.clase_id"
          :clase="c"
          @click="goToClass(c.clase_id)"
        />
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal">
          <h3>Crear clase</h3>
          <form @submit.prevent="createClass">
            <div class="field">
              <label for="c-nombre">Nombre</label>
              <input id="c-nombre" v-model="createNombre" type="text" placeholder="Nombre de la clase" />
            </div>
            <div class="field">
              <label for="c-desc">Descripción (opcional)</label>
              <textarea id="c-desc" v-model="createDescripcion" placeholder="Descripción" rows="3"></textarea>
            </div>
            <p v-if="createError" class="error-msg">{{ createError }}</p>
            <div class="modal-actions">
              <button type="button" class="secondary" @click="showCreateModal = false">Cancelar</button>
              <button type="submit" class="primary" :disabled="creating || !createNombre.trim()">
                {{ creating ? 'Creando...' : 'Crear' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.content {
  flex: 1;
  padding: 24px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.top-bar h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
}

.actions {
  display: flex;
  gap: 8px;
}

.join-box {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.code-input {
  width: 120px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  color: var(--color-text);
  font-size: 1.1rem;
  letter-spacing: 3px;
  text-align: center;
  text-transform: uppercase;
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.state-msg p {
  margin: 4px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 8px 0 0;
  width: 100%;
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
.field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}

.field textarea {
  resize: vertical;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  padding: 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.modal h3 {
  margin: 0 0 20px;
  color: var(--color-text);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
