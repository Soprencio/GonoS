import { reactive } from 'vue'

const state = reactive({
  forceSkeletons: false,
  isSimulatingLoading: false
})

export function useDevTools() {
  function toggleForceSkeletons() {
    state.forceSkeletons = !state.forceSkeletons
  }

  function simulateLoading(ms = 2000) {
    if (state.isSimulatingLoading) return
    state.isSimulatingLoading = true
    setTimeout(() => {
      state.isSimulatingLoading = false
    }, ms)
  }

  return {
    state,
    toggleForceSkeletons,
    simulateLoading
  }
}
