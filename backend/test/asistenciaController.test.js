const test = require('node:test');
const assert = require('node:assert/strict');
const {
  clasificarEntrada,
  calcularSalida
} = require('../src/controllers/asistenciaController');

test('clasificarEntrada distingue puntualidad, tolerancia y atraso', () => {
  assert.equal(clasificarEntrada('07:59:59', '08:00:00'), 'puntual');
  assert.equal(clasificarEntrada('08:00:00', '08:00:00'), 'puntual');
  assert.equal(clasificarEntrada('08:10:00', '08:00:00'), 'tolerancia');
  assert.equal(clasificarEntrada('08:15:00', '08:00:00'), 'tolerancia');
  assert.equal(clasificarEntrada('08:15:01', '08:00:00'), 'atraso');
});

test('calcularSalida no pide justificación hasta las 18:00', () => {
  assert.deepEqual(calcularSalida('16:30:00', '17:00:00'), {
    estado: 'anticipada', horasExtras: 0, requiereJustificacion: false
  });
  assert.deepEqual(calcularSalida('17:15:00', '17:00:00'), {
    estado: 'normal', horasExtras: 0, requiereJustificacion: false
  });
  assert.deepEqual(calcularSalida('17:59:59', '17:00:00'), {
    estado: 'normal', horasExtras: 0, requiereJustificacion: false
  });
});

test('calcularSalida exige justificación desde las 18:00', () => {
  assert.deepEqual(calcularSalida('18:00:00', '17:00:00'), {
    estado: 'normal', horasExtras: 0, requiereJustificacion: true
  });
  assert.deepEqual(calcularSalida('18:45:00', '17:00:00'), {
    estado: 'normal', horasExtras: 0, requiereJustificacion: true
  });
  assert.deepEqual(calcularSalida('19:30:00', '17:00:00'), {
    estado: 'normal', horasExtras: 1, requiereJustificacion: true
  });
  assert.deepEqual(calcularSalida('20:59:59', '17:00:00'), {
    estado: 'normal', horasExtras: 2, requiereJustificacion: true
  });
});
