const test = require('node:test');
const assert = require('node:assert/strict');
const {
  NOTA_MINIMA_DEFAULT,
  normalizarNotaMinima,
  validarNota,
  calcularEstadoFinal
} = require('../utils/notas');

test('validarNota acepta una nota válida', () => {
  const resultado = validarNota('7');
  assert.deepEqual(resultado, { ok: true, valor: 7 });
});

test('validarNota acepta límites 0 y 10', () => {
  assert.equal(validarNota(0).ok, true);
  assert.equal(validarNota('0').valor, 0);
  assert.equal(validarNota(10).ok, true);
  assert.equal(validarNota('10').valor, 10);
});

test('validarNota rechaza valores no numéricos', () => {
  assert.equal(validarNota('abc').ok, false);
  assert.equal(validarNota(undefined).ok, false);
  assert.equal(validarNota(null).ok, false);
  assert.equal(validarNota('').ok, false);
});

test('validarNota rechaza notas fuera del rango 0-10', () => {
  assert.equal(validarNota(-1).ok, false);
  assert.equal(validarNota(11).ok, false);
  assert.equal(validarNota('-0.1').ok, false);
});

test('calcularEstadoFinal aprueba con nota mayor o igual al mínimo', () => {
  assert.equal(calcularEstadoFinal(8, 6), 'Aprobado');
  assert.equal(calcularEstadoFinal(6, 6), 'Aprobado');
  assert.equal(calcularEstadoFinal(10, 6), 'Aprobado');
});

test('calcularEstadoFinal desaprueba con nota menor al mínimo', () => {
  assert.equal(calcularEstadoFinal(5, 6), 'Desaprobado');
  assert.equal(calcularEstadoFinal(5.99, 6), 'Desaprobado');
  assert.equal(calcularEstadoFinal(0, 6), 'Desaprobado');
});

test('calcularEstadoFinal usa 6 como nota mínima por defecto', () => {
  assert.equal(calcularEstadoFinal(7, null), 'Aprobado');
  assert.equal(calcularEstadoFinal(7, undefined), 'Aprobado');
  assert.equal(calcularEstadoFinal(5, null), 'Desaprobado');
});

test('normalizarNotaMinima usa NOTA_MINIMA_DEFAULT cuando el valor es inválido', () => {
  assert.equal(normalizarNotaMinima(null), NOTA_MINIMA_DEFAULT);
  assert.equal(normalizarNotaMinima(undefined), NOTA_MINIMA_DEFAULT);
  assert.equal(normalizarNotaMinima(NaN), NOTA_MINIMA_DEFAULT);
  assert.equal(normalizarNotaMinima(''), NOTA_MINIMA_DEFAULT);
});

test('normalizarNotaMinima parsea valores numéricos válidos', () => {
  assert.equal(normalizarNotaMinima('7'), 7);
  assert.equal(normalizarNotaMinima('7.5'), 7.5);
  assert.equal(normalizarNotaMinima(4), 4);
});
