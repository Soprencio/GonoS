/**
 * Utilidades de fecha, cálculo de tiempo relativo y verificación de puntualidad para GonoS.
 */

export function formatDate(iso, includeTime = true) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''

  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  return new Intl.DateTimeFormat('es-AR', options).format(d)
}

/**
 * Devuelve texto relativo amigable para el tiempo restante o transcurrido de una fecha límite.
 */
export function getRelativeTime(deadlineIso, isSubmitted = false) {
  if (!deadlineIso) return ''
  const deadline = new Date(deadlineIso).getTime()
  if (isNaN(deadline)) return ''

  const diffMs = deadline - Date.now()

  // Fecha futura (aún no venció)
  if (diffMs > 0) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? 'Queda 1 minuto' : `Quedan ${diffMinutes} minutos`
    }
    if (diffHours < 24) {
      return diffHours === 1 ? 'Queda 1 hora' : `Quedan ${diffHours} horas`
    }
    if (diffDays === 1) {
      return 'Vence mañana'
    }
    if (diffDays < 7) {
      return `Vence en ${diffDays} días`
    }
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? 'Vence en 1 semana' : `Vence en ${weeks} semanas`
  }

  // Fecha pasada (ya venció)
  if (isSubmitted) {
    return 'Entregado'
  }

  const pastMs = Math.abs(diffMs)
  const pastMinutes = Math.floor(pastMs / (1000 * 60))
  const pastHours = Math.floor(pastMinutes / 60)
  const pastDays = Math.floor(pastHours / 24)

  if (pastMinutes < 60) {
    return pastMinutes <= 1 ? 'Venció recién' : `Venció hace ${pastMinutes}m`
  }
  if (pastHours < 24) {
    return pastHours === 1 ? 'Venció hace 1h' : `Venció hace ${pastHours}h`
  }
  if (pastDays === 1) {
    return 'Venció ayer'
  }
  return `Venció hace ${pastDays} días`
}

/**
 * Nivel de urgencia para aplicar estilos semánticos (urgent, warning, expired, normal).
 */
export function getUrgencyStatus(deadlineIso, isSubmitted = false) {
  if (isSubmitted) return 'submitted'
  if (!deadlineIso) return 'normal'

  const deadline = new Date(deadlineIso).getTime()
  if (isNaN(deadline)) return 'normal'

  const diffMs = deadline - Date.now()

  if (diffMs <= 0) return 'expired'
  if (diffMs < 24 * 60 * 60 * 1000) return 'urgent' // menos de 24hs
  if (diffMs < 48 * 60 * 60 * 1000) return 'warning' // menos de 48hs
  return 'normal'
}

/**
 * Determina si una entrega se realizó fuera de término y cuánto tiempo tarde.
 * Retorna string (ej: "+2h tarde") o null si fue a tiempo.
 */
export function getLateInfo(deliveredAtIso, deadlineIso) {
  if (!deliveredAtIso || !deadlineIso) return null

  const delivered = new Date(deliveredAtIso).getTime()
  const deadline = new Date(deadlineIso).getTime()

  if (isNaN(delivered) || isNaN(deadline)) return null

  const diffMs = delivered - deadline
  if (diffMs <= 0) return null // A tiempo

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 60) {
    return `+${Math.max(1, diffMinutes)}m tarde`
  }
  if (diffHours < 24) {
    return `+${diffHours}h tarde`
  }
  return `+${diffDays}d tarde`
}
