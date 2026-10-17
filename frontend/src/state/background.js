import { reactive } from 'vue'

const STORAGE_KEY = 'gonos-bg-mode'
const MODES = ['dots', 'grid', 'isometric']

function getInitialMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (MODES.includes(stored)) return stored
  } catch {}
  return 'dots'
}

export const backgroundState = reactive({
  current: getInitialMode(),
  modes: [
    { id: 'dots', label: 'Puntos interactivos', icon: 'dots' },
    { id: 'grid', label: 'Cuadrícula técnica', icon: 'grid' },
    { id: 'isometric', label: 'Malla isométrica', icon: 'isometric' }
  ],
  setMode(mode) {
    if (MODES.includes(mode)) {
      this.current = mode
      try {
        localStorage.setItem(STORAGE_KEY, mode)
      } catch {}
    }
  },
  toggleNext() {
    const nextIdx = (MODES.indexOf(this.current) + 1) % MODES.length
    this.setMode(MODES[nextIdx])
  }
})
