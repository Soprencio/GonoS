import { reactive } from 'vue'

const state = reactive({
  toasts: []
})

let nextId = 1

export function useToast() {
  function show(message, type = 'info', duration = 4000) {
    const id = nextId++
    const item = {
      id,
      message,
      type, // 'info' | 'success' | 'error'
      duration
    }

    state.toasts.push(item)

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  function success(message, duration = 4000) {
    return show(message, 'success', duration)
  }

  function error(message, duration = 5000) {
    return show(message, 'error', duration)
  }

  function info(message, duration = 4000) {
    return show(message, 'info', duration)
  }

  function remove(id) {
    const index = state.toasts.findIndex(t => t.id === id)
    if (index !== -1) {
      state.toasts.splice(index, 1)
    }
  }

  function clear() {
    state.toasts.splice(0, state.toasts.length)
  }

  return {
    toasts: state.toasts,
    show,
    success,
    error,
    info,
    remove,
    clear
  }
}
