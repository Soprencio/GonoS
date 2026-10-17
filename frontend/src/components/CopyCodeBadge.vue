<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast.js'

const props = defineProps({
  code: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'sm', // 'sm' | 'md' | 'lg'
    validator: v => ['sm', 'md', 'lg'].includes(v)
  },
  showLabel: {
    type: Boolean,
    default: false
  }
})

const copied = ref(false)
const toast = useToast()

async function copyCode(e) {
  if (e) e.stopPropagation()
  if (!props.code) return

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(props.code)
    } else {
      fallbackCopy(props.code)
    }
    triggerCopied()
  } catch {
    fallbackCopy(props.code)
    triggerCopied()
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-999999px'
  textarea.style.top = '-999999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

function triggerCopied() {
  copied.value = true
  toast.success(`Código de clase "${props.code}" copiado al portapapeles`)
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <button
    type="button"
    class="copy-badge"
    :class="[`size-${size}`, { copied }]"
    :title="copied ? '¡Copiado al portapapeles!' : 'Hacé clic para copiar el código'"
    @click="copyCode"
  >
    <span v-if="showLabel && label" class="badge-label">{{ label }}</span>
    <span class="badge-code font-mono">
      <span class="hash-prefix">#</span>{{ code }}
    </span>

    <span class="badge-icon" aria-hidden="true">
      <!-- Checkmark icon when copied -->
      <svg
        v-if="copied"
        class="icon-check"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <!-- Clipboard icon when not copied -->
      <svg
        v-else
        class="icon-copy"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </span>

    <span v-if="copied" class="copied-tooltip">¡Copiado!</span>
  </button>
</template>

<style scoped>
.copy-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  padding: 3px 8px;
  line-height: 1;
  transition: all var(--transition-fast);
  position: relative;
  user-select: none;
}

.copy-badge:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px var(--color-accent-soft);
}

.copy-badge:active {
  transform: translateY(0);
}

/* Sizes */
.size-sm {
  font-size: 0.75rem;
  padding: 3px 7px;
  gap: 5px;
}

.size-md {
  font-size: 0.85rem;
  padding: 5px 10px;
  gap: 7px;
  border-radius: var(--radius-md);
}

.size-lg {
  font-size: 1.15rem;
  padding: 8px 16px;
  gap: 10px;
  border-radius: var(--radius-md);
}

.badge-label {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-right: 2px;
}

.badge-code {
  font-weight: 700;
  letter-spacing: 0.08em;
  color: inherit;
}

.hash-prefix {
  opacity: 0.5;
  margin-right: 1px;
}

.badge-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.icon-copy {
  transition: transform var(--transition-fast);
}

.copy-badge:hover .icon-copy {
  transform: scale(1.1);
}

/* Copied State */
.copy-badge.copied {
  background: var(--color-success-soft);
  border-color: var(--color-success);
  color: var(--color-success);
  animation: pulse-success 0.25s ease-out;
}

@keyframes pulse-success {
  0% { transform: scale(0.95); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.icon-check {
  animation: check-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes check-in {
  from { transform: scale(0.4) rotate(-20deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}

.copied-tooltip {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-success);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  animation: tooltip-in 0.15s ease-out;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

@keyframes tooltip-in {
  from { opacity: 0; transform: translate(-50%, 4px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
