import { reactive } from 'vue'

const state = reactive({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  danger: false,
  resolvePromise: null
})

export function useConfirm() {
  function confirm({
    title = '¿Estás seguro?',
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false
  } = {}) {
    state.title = title
    state.message = message
    state.confirmText = confirmText
    state.cancelText = cancelText
    state.danger = danger
    state.isOpen = true

    return new Promise(resolve => {
      state.resolvePromise = resolve
    })
  }

  function handleConfirm() {
    state.isOpen = false
    if (state.resolvePromise) {
      state.resolvePromise(true)
      state.resolvePromise = null
    }
  }

  function handleCancel() {
    state.isOpen = false
    if (state.resolvePromise) {
      state.resolvePromise(false)
      state.resolvePromise = null
    }
  }

  return {
    state,
    confirm,
    handleConfirm,
    handleCancel
  }
}
