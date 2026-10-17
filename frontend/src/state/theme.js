import { reactive } from 'vue'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('gonos-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function getInitialAccent() {
  try {
    const stored = localStorage.getItem('gonos-accent')
    if (stored === 'blue' || stored === 'orange') return stored
  } catch {}
  return 'blue'
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

function applyAccent(accent) {
  if (accent === 'orange') {
    document.documentElement.setAttribute('data-accent', 'orange')
  } else {
    document.documentElement.setAttribute('data-accent', 'blue')
  }
}

const initialTheme = getInitialTheme()
const initialAccent = getInitialAccent()
applyTheme(initialTheme)
applyAccent(initialAccent)

export const themeState = reactive({
  current: initialTheme,
  accent: initialAccent,
  toggle() {
    this.current = this.current === 'light' ? 'dark' : 'light'
    applyTheme(this.current)
    try {
      localStorage.setItem('gonos-theme', this.current)
    } catch {}
  },
  toggleAccent() {
    this.accent = this.accent === 'blue' ? 'orange' : 'blue'
    applyAccent(this.accent)
    try {
      localStorage.setItem('gonos-accent', this.accent)
    } catch {}
  },
  setAccent(val) {
    if (val !== 'blue' && val !== 'orange') return
    this.accent = val
    applyAccent(this.accent)
    try {
      localStorage.setItem('gonos-accent', this.accent)
    } catch {}
  }
})
