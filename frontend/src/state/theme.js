import { reactive } from 'vue'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('gonos-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

const current = getInitialTheme()
applyTheme(current)

export const themeState = reactive({
  current,
  toggle() {
    this.current = this.current === 'light' ? 'dark' : 'light'
    applyTheme(this.current)
    try {
      localStorage.setItem('gonos-theme', this.current)
    } catch {}
  }
})
