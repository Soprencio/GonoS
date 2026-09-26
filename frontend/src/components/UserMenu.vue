<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../state/auth.js'

const router = useRouter()
const isOpen = ref(false)
const menuRef = ref(null)

const userInitials = computed(() => {
  const u = authState.user
  if (!u) return 'U'
  const first = u.nombre?.charAt(0) || ''
  const last = u.apellido?.charAt(0) || ''
  return (first + last).toUpperCase() || 'U'
})

const displayName = computed(() => {
  const u = authState.user
  if (!u) return 'Usuario'
  return `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email || 'Usuario'
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function handleDocClick(e) {
  if (isOpen.value && menuRef.value && !menuRef.value.contains(e.target)) {
    closeMenu()
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    closeMenu()
  }
}

function handleAction(btnName) {
  console.log(`[UserMenu] Clic en: ${btnName}`)
  closeMenu()
}

function handleLogout() {
  closeMenu()
  authState.logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocClick)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocClick)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="menuRef" class="user-menu">
    <!-- Botón de Usuario principal en la topbar -->
    <button
      type="button"
      class="user-btn"
      :class="{ active: isOpen }"
      :title="isOpen ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="toggleMenu"
    >
      <span class="avatar-circle font-mono">
        {{ userInitials }}
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="chevron-icon"
        :class="{ open: isOpen }"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <!-- Popup / Lista desplegable hacia abajo -->
    <div v-if="isOpen" class="user-popup" role="menu">
      <!-- Encabezado con información del usuario si está logueado -->
      <div v-if="authState.isLoggedIn" class="user-header">
        <div class="user-meta">
          <p class="user-name">{{ displayName }}</p>
          <p v-if="authState.user?.email" class="user-email">{{ authState.user.email }}</p>
        </div>
        <span class="user-role-badge">
          {{ authState.user?.rol === 'profesor' ? 'Docente' : 'Alumno' }}
        </span>
      </div>

      <div v-if="authState.isLoggedIn" class="user-menu-divider" role="separator"></div>

      <!-- Primer grupo: Botones 1, 2 y 3 -->
      <div class="menu-group">
        <button
          type="button"
          class="user-menu-item"
          role="menuitem"
          @click="handleAction('Botón 1')"
        >
          Botón 1
        </button>
        <button
          type="button"
          class="user-menu-item"
          role="menuitem"
          @click="handleAction('Botón 2')"
        >
          Botón 2
        </button>
        <button
          type="button"
          class="user-menu-item"
          role="menuitem"
          @click="handleAction('Botón 3')"
        >
          Botón 3
        </button>
      </div>

      <!-- Separador entre grupos -->
      <div class="user-menu-divider" role="separator"></div>

      <!-- Segundo grupo: Botones 4, 5 y 6 (decorativos) -->
      <div class="menu-group">
        <button
          type="button"
          class="user-menu-item"
          role="menuitem"
          @click="handleAction('Botón 4')"
        >
          Botón 4
        </button>
        <button
          type="button"
          class="user-menu-item"
          role="menuitem"
          @click="handleAction('Botón 5')"
        >
          Botón 5
        </button>
        <button
          type="button"
          class="user-menu-item"
          role="menuitem"
          @click="handleAction('Botón 6')"
        >
          Botón 6
        </button>
      </div>

      <!-- Opción de cerrar sesión para usuarios autenticados -->
      <template v-if="authState.isLoggedIn">
        <div class="user-menu-divider" role="separator"></div>
        <button
          type="button"
          class="user-menu-item logout-btn"
          role="menuitem"
          @click="handleLogout"
        >
          Cerrar sesión
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
  display: inline-block;
}

/* Botón de Usuario */
.user-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 4px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
  outline: none;
  user-select: none;
}

.user-btn:hover,
.user-btn.active {
  border-color: var(--color-accent);
  background: var(--color-bg-elevated);
}

.user-btn:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.avatar-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.chevron-icon {
  color: var(--color-text-muted);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.chevron-icon.open {
  transform: rotate(180deg);
  color: var(--color-accent);
}

/* Popup desplegable */
.user-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 210px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card-hover);
  padding: 6px 0;
  z-index: 100;
  animation: popInMenu 0.16s ease-out;
  box-sizing: border-box;
}

@keyframes popInMenu {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Cabecera del usuario */
.user-header {
  padding: 8px 14px 6px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.user-meta {
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  margin: 2px 0 0;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

/* Separador */
.user-menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 5px 0;
}

/* Grupo de botones */
.menu-group {
  display: flex;
  flex-direction: column;
}

/* Elemento del menú */
.user-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  box-sizing: border-box;
}

.user-menu-item:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.user-menu-item.logout-btn {
  color: var(--color-danger);
}

.user-menu-item.logout-btn:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
</style>
