<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import { useConfirm } from '../composables/useConfirm.js'
import { useDevTools } from '../composables/useDevTools.js'
import SkeletonBlock from '../components/SkeletonBlock.vue'
import AssignmentCard from '../components/AssignmentCard.vue'
import AssignmentFormView from './AssignmentFormView.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import BackgroundToggle from '../components/BackgroundToggle.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { state: devState } = useDevTools()

const clase = ref(null)
const trabajos = ref([])
const publicaciones = ref([])
const loading = ref(true)
const isLoading = computed(() => loading.value || devState.forceSkeletons || devState.isSimulatingLoading)
const error = ref('')
const copied = ref(false)
const showForm = ref(false)
const activeTab = ref('tablon')
const nuevoMensaje = ref('')
const posting = ref(false)

const isTeacher = computed(() =>
  clase.value?.rol === 'Profesor' || clase.value?.rol === 'Creador'
)
const esDocente = isTeacher
const canPost = computed(() =>
  clase.value?.rol === 'Profesor' || clase.value?.rol === 'Creador'
)

const participantes = ref({ creador: [], profesores: [], alumnos: [] })
const participantesLoading = ref(false)
const isParticipantesLoading = computed(() => participantesLoading.value || devState.forceSkeletons || devState.isSimulatingLoading)

function puedeSacar(rol) {
  const miRol = clase.value?.rol
  if (miRol === 'Creador') return true
  if (miRol === 'Profesor' && rol === 'Alumno') return true
  return false
}

async function fetchParticipantes() {
  participantesLoading.value = true
  try {
    const res = await api.get(`/clases/${route.params.id}/participantes`)
    participantes.value = res.data
  } catch {
    // si falla, ignoramos
  } finally {
    participantesLoading.value = false
  }
}

async function sacarParticipante(participacionId) {
  const ok = await confirm({
    title: 'Sacar participante',
    message: '¿Estás seguro de que querés sacar a este participante de la clase?',
    confirmText: 'Sacar',
    cancelText: 'Cancelar',
    danger: true
  })
  if (!ok) return

  try {
    await api.delete(`/clases/${route.params.id}/participantes/${participacionId}`)
    await fetchParticipantes()
    toast.success('Participante sacado de la clase')
  } catch (err) {
    toast.error(err.response?.data?.error || 'Error al sacar participante')
  }
}

function verAlumno(usuarioId) {
  router.push(`/clase/${route.params.id}/alumno/${usuarioId}`)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

async function copyCode() {
  if (!clase.value?.codigo) return
  try {
    await navigator.clipboard.writeText(clase.value.codigo)
    copied.value = true
    toast.success('Código de invitación copiado al portapapeles')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = clase.value.codigo
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    toast.success('Código de invitación copiado al portapapeles')
    setTimeout(() => { copied.value = false }, 2000)
  }
}

async function fetchTrabajos() {
  try {
    const res = await api.get(`/clases/${route.params.id}/trabajos`)
    trabajos.value = res.data
  } catch {
    // si falla, mostramos lo que haya (puede ser que el endpoint nuevo no esté)
  }
}

async function fetchPublicaciones() {
  try {
    const res = await api.get(`/clases/${route.params.id}/publicaciones`)
    publicaciones.value = res.data
  } catch {
    // endpoint puede no existir aún
  }
}

async function postPublicacion() {
  const msg = nuevoMensaje.value.trim()
  if (!msg || posting.value) return
  posting.value = true
  try {
    const res = await api.post(`/clases/${route.params.id}/publicaciones`, { mensaje: msg })
    publicaciones.value.unshift(res.data)
    nuevoMensaje.value = ''
    toast.success('Publicación creada con éxito')
  } catch (err) {
    toast.error(err.response?.data?.error || 'Error al publicar')
  } finally {
    posting.value = false
  }
}

function goToTrabajo(tpId) {
  router.push(`/trabajo/${tpId}`)
}

function onTrabajoCreated(nuevo) {
  trabajos.value.unshift(nuevo)
  showForm.value = false
}

onMounted(async () => {
  try {
    const res = await api.get(`/clases/${route.params.id}`)
    clase.value = res.data
    await Promise.all([fetchTrabajos(), fetchPublicaciones(), fetchParticipantes()])
  } catch (err) {
    if (err.response && err.response.status === 403) {
      router.push('/')
    } else {
      error.value = 'Error al cargar la clase'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="class-view">
    <div v-if="isLoading" class="class-skeleton-wrapper" aria-hidden="true">
      <div class="skeleton-header">
        <SkeletonBlock width="80px" height="34px" />
        <SkeletonBlock width="45%" height="32px" />
      </div>
      <div class="skeleton-topbar">
        <SkeletonBlock width="90px" height="36px" />
        <SkeletonBlock width="90px" height="36px" />
        <SkeletonBlock width="110px" height="36px" />
      </div>
      <div class="skeleton-body">
        <SkeletonBlock width="100%" height="80px" border-radius="var(--radius-md)" />
        <SkeletonBlock width="100%" height="160px" border-radius="var(--radius-md)" />
      </div>
    </div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <template v-else-if="clase">
      <header class="header">
        <div class="header-left">
          <button class="secondary" @click="router.push('/')">← Volver</button>
          <h1 class="title">{{ clase.nombre }}</h1>
        </div>
        <div class="header-right">
          <BackgroundToggle />
          <ThemeToggle />
        </div>
      </header>

      <nav class="topbar">
        <button
          :class="['tab-btn', { active: activeTab === 'tablon' }]"
          @click="activeTab = 'tablon'"
        >Tablón</button>
        <button
          :class="['tab-btn', { active: activeTab === 'trabajos' }]"
          @click="activeTab = 'trabajos'"
        >Trabajos</button>
        <button
          :class="['tab-btn', { active: activeTab === 'participantes' }]"
          @click="activeTab = 'participantes'"
        >Participantes</button>
      </nav>

      <main class="content">
        <!-- TABLÓN -->
        <template v-if="activeTab === 'tablon'">
          <p v-if="clase.descripcion" class="desc">{{ clase.descripcion }}</p>

          <div v-if="clase.codigo" class="code-section">
            <p class="code-label">Código de invitación</p>
            <div class="code-row">
              <code class="code">{{ clase.codigo }}</code>
              <button class="secondary" @click="copyCode">
                {{ copied ? '¡Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>

          <!-- PUBLICACIONES -->
          <section class="publicaciones-section">
            <div v-if="canPost" class="post-box">
              <textarea
                v-model="nuevoMensaje"
                placeholder="Escribí un anuncio..."
                rows="2"
                class="post-input"
                @keydown.ctrl.enter="postPublicacion"
              ></textarea>
              <div class="post-actions">
                <button
                  class="primary"
                  :disabled="!nuevoMensaje.trim() || posting"
                  @click="postPublicacion"
                >{{ posting ? 'Publicando...' : 'Publicar' }}</button>
              </div>
            </div>

            <div v-if="publicaciones.length > 0" class="pub-list">
              <article
                v-for="(pub, i) in publicaciones"
                :key="pub.publicacion_id"
                class="pub-card"
                :style="{ animationDelay: i * 45 + 'ms' }"
              >
                <div class="pub-header">
                  <span class="pub-author">{{ pub.profesor }}</span>
                  <span class="pub-date">{{ formatDate(pub.created_at) }}</span>
                </div>
                <p class="pub-text">{{ pub.mensaje }}</p>
              </article>
            </div>
            <p v-else class="empty">No hay publicaciones todavía.</p>
          </section>

          <!-- TRABAJOS -->
          <section class="trabajos-section">
            <div class="section-header">
              <h2>Trabajos</h2>
              <button v-if="isTeacher" class="primary" @click="showForm = true">+ Nuevo trabajo</button>
            </div>

            <p v-if="trabajos.length === 0" class="empty">Todavía no hay trabajos en esta clase.</p>
            <div v-else class="trabajos-list">
              <AssignmentCard
                v-for="(t, i) in trabajos"
                :key="t.tp_id"
                :trabajo="t"
                :isTeacher="isTeacher"
                :style="{ animationDelay: i * 45 + 'ms' }"
                @click="goToTrabajo(t.tp_id)"
              />
            </div>
          </section>
        </template>

        <!-- TRABAJOS -->
        <template v-if="activeTab === 'trabajos'">
          <section class="trabajos-section">
            <div class="section-header">
              <h2>Trabajos</h2>
              <button v-if="isTeacher" class="primary" @click="showForm = true">+ Nuevo trabajo</button>
            </div>

            <p v-if="trabajos.length === 0" class="empty">Todavía no hay trabajos en esta clase.</p>
            <div v-else class="trabajos-list">
              <AssignmentCard
                v-for="(t, i) in trabajos"
                :key="t.tp_id"
                :trabajo="t"
                :isTeacher="isTeacher"
                :style="{ animationDelay: i * 45 + 'ms' }"
                @click="goToTrabajo(t.tp_id)"
              />
            </div>
          </section>
        </template>

        <!-- PARTICIPANTES -->
        <template v-if="activeTab === 'participantes'">
          <section class="participantes-section">
            <div v-if="isParticipantesLoading" class="part-skeleton-group" aria-hidden="true">
              <SkeletonBlock width="120px" height="20px" style="margin-bottom: 12px" />
              <div v-for="n in 3" :key="n" class="part-card-skeleton">
                <SkeletonBlock width="45%" height="16px" />
                <SkeletonBlock width="30%" height="12px" />
              </div>
            </div>
            <template v-else>
              <!-- CREADOR -->
              <div class="part-group">
                <h3 class="part-group-title">Creador</h3>
                <div
                  v-for="(p, i) in participantes.creador"
                  :key="p.participacion_id"
                  class="part-card"
                  :style="{ animationDelay: i * 45 + 'ms' }"
                >
                  <div class="part-info">
                    <span class="part-name">{{ p.nombre }} {{ p.apellido }}</span>
                    <span class="part-mail">{{ p.mail }}</span>
                  </div>
                </div>
              </div>

              <!-- PROFESORES -->
              <div class="part-group">
                <h3 class="part-group-title">Profesores</h3>
                <div
                  v-for="(p, i) in participantes.profesores"
                  :key="p.participacion_id"
                  class="part-card"
                  :style="{ animationDelay: i * 45 + 'ms' }"
                >
                  <div class="part-info">
                    <span class="part-name">{{ p.nombre }} {{ p.apellido }}</span>
                    <span class="part-mail">{{ p.mail }}</span>
                  </div>
                  <button
                    v-if="puedeSacar(p.rol)"
                    class="danger-btn"
                    @click="sacarParticipante(p.participacion_id)"
                  >Sacar</button>
                </div>
              </div>

              <!-- ALUMNOS -->
              <div class="part-group">
                <h3 class="part-group-title">Alumnos <span class="part-count">({{ participantes.alumnos.length }})</span></h3>
                <div
                  v-for="(p, i) in participantes.alumnos"
                  :key="p.participacion_id"
                  class="part-card"
                  :style="{ animationDelay: i * 45 + 'ms' }"
                >
                  <div class="part-info">
                    <button
                      v-if="esDocente"
                      class="link-btn"
                      @click="verAlumno(p.usuario_id)"
                    >{{ p.nombre }} {{ p.apellido }}</button>
                    <span v-else class="part-name">{{ p.nombre }} {{ p.apellido }}</span>
                    <span class="part-mail">{{ p.mail }}</span>
                  </div>
                  <button
                    v-if="puedeSacar(p.rol)"
                    class="danger-btn"
                    @click="sacarParticipante(p.participacion_id)"
                  >Sacar</button>
                </div>
              </div>
            </template>
          </section>
        </template>
      </main>

      <AssignmentFormView
        v-if="showForm"
        :claseId="route.params.id"
        @created="onTrabajoCreated"
        @close="showForm = false"
      />
    </template>
  </div>
</template>

<style scoped>
.class-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
  font-weight: 700;
}

/* TOPBAR */
.topbar {
  display: flex;
  border-bottom: 1px solid var(--glass-border);
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  position: sticky;
  top: 61px;
  z-index: 40;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text-muted);
  transition: color 0.15s, box-shadow 0.15s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

.content {
  flex: 1;
  padding: 32px;
  max-width: 780px;
  width: calc(100% - 48px);
  margin: 28px auto 60px;
  box-sizing: border-box;
  background: var(--color-bg-elevated-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.desc {
  color: var(--color-text-muted);
  margin: 0 0 24px;
  line-height: 1.5;
}

.code-section {
  background: var(--color-bg-subtle-glass);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-bottom: 32px;
}

.code-label {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.code-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--color-accent);
  background: transparent;
  padding: 0;
}

/* PUBLICACIONES */
.publicaciones-section {
  margin-bottom: 40px;
}

.post-box {
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 20px;
}

.post-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.post-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.post-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.pub-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pub-card {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  animation: card-in 0.45s ease both;
}

.pub-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-accent);
}

.pub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.pub-author {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-accent);
}

.pub-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.pub-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.5;
  white-space: pre-wrap;
}

/* TRABAJOS */
.trabajos-section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.trabajos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* PARTICIPANTES */
.participantes-section {
  margin-top: 8px;
}

.loading-text {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  padding: 16px 0;
}

.part-group {
  margin-bottom: 28px;
}

.part-group-title {
  margin: 0 0 10px;
  font-size: 1rem;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 6px;
}

.part-count {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.part-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  margin-bottom: 4px;
  animation: card-in 0.45s ease both;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.part-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.part-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.part-name {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 500;
}

.part-mail {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.link-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-accent);
  font-weight: 500;
  padding: 0;
  text-align: left;
}

.link-btn:hover {
  text-decoration: underline;
}

.danger-btn {
  background: none;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  color: var(--color-danger);
  transition: background 0.15s;
}

.danger-btn:hover {
  background: var(--color-danger);
  color: #fff;
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}

/* Skeletons en ClassView */
.class-skeleton-wrapper {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skeleton-topbar {
  display: flex;
  gap: 12px;
}

.skeleton-body {
  max-width: 780px;
  width: calc(100% - 48px);
  margin: 28px auto 60px;
  box-sizing: border-box;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 32px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.part-skeleton-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.part-card-skeleton {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
