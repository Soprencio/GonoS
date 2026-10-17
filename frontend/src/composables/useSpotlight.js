/**
 * Composable ligero para efecto Spotlight interactivo en tarjetas.
 * Actualiza variables CSS --mouse-x y --mouse-y en base a las coordenadas del cursor.
 */
export function useSpotlight() {
  function onMouseMove(e) {
    const el = e.currentTarget
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    el.style.setProperty('--mouse-x', `${x}px`)
    el.style.setProperty('--mouse-y', `${y}px`)
  }

  function onMouseLeave(e) {
    const el = e.currentTarget
    if (!el) return
    el.style.setProperty('--mouse-x', `-999px`)
    el.style.setProperty('--mouse-y', `-999px`)
  }

  return {
    onMouseMove,
    onMouseLeave
  }
}
