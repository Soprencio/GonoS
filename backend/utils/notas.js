const NOTA_MINIMA_DEFAULT = 6;

function normalizarNotaMinima(notaMinima) {
  const n = parseFloat(notaMinima);
  return Number.isFinite(n) ? n : NOTA_MINIMA_DEFAULT;
}

function validarNota(nota) {
  if (nota === undefined || nota === null) {
    return { ok: false, error: 'La nota es obligatoria y debe ser un número' };
  }
  const valor = parseFloat(nota);
  if (isNaN(valor)) {
    return { ok: false, error: 'La nota es obligatoria y debe ser un número' };
  }
  if (valor < 0 || valor > 10) {
    return { ok: false, error: 'La nota debe estar entre 0 y 10' };
  }
  return { ok: true, valor };
}

function calcularEstadoFinal(nota, notaMinima) {
  const umbral = normalizarNotaMinima(notaMinima);
  return nota >= umbral ? 'Aprobado' : 'Desaprobado';
}

module.exports = { NOTA_MINIMA_DEFAULT, normalizarNotaMinima, validarNota, calcularEstadoFinal };
