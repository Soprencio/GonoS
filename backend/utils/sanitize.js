/**
 * Escapa caracteres HTML en texto para prevenir XSS.
 * Defensa en profundidad: backend almacena texto sanitizado
 * por si el frontend olvida escapar al renderizar.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return str.replace(/[&<>"']/g, ch => map[ch]);
}

module.exports = { sanitizeText };
