const test = require('node:test');
const assert = require('node:assert/strict');
const {
  esPeriodoValido,
  periodoAnterior,
  periodoDeFecha,
  periodosSiguientes,
  periodoSiguiente,
} = require('../src/utils/periodosEvaluacion');

test('calcula el periodo mensual en hora de Guatemala', () => {
  assert.equal(periodoDeFecha(new Date('2026-11-18T18:00:00Z'), 'mensual'), '2026-11');
  assert.equal(periodoDeFecha(new Date('2027-01-01T04:00:00Z'), 'mensual'), '2026-12');
});

test('calcula la quincena según el día local', () => {
  assert.equal(periodoDeFecha(new Date('2026-11-15T18:00:00Z'), 'quincenal'), '2026-11-Q1');
  assert.equal(periodoDeFecha(new Date('2026-11-16T18:00:00Z'), 'quincenal'), '2026-11-Q2');
});

test('calcula la semana ISO con año de semana', () => {
  assert.equal(periodoDeFecha(new Date('2026-11-18T18:00:00Z'), 'semanal'), '2026-W47');
  assert.equal(periodoDeFecha(new Date('2027-01-01T18:00:00Z'), 'semanal'), '2026-W53');
  assert.equal(periodoDeFecha(new Date('2027-01-04T18:00:00Z'), 'semanal'), '2027-W01');
});

test('avanza al periodo siguiente sin mezclar formatos', () => {
  assert.equal(periodoSiguiente('2026-12', 'mensual'), '2027-01');
  assert.equal(periodoSiguiente('2026-11-Q2', 'quincenal'), '2026-12-Q1');
  assert.equal(periodoSiguiente('2026-W53', 'semanal'), '2027-W01');
  assert.deepEqual(periodosSiguientes('2026-11', 'mensual', 3), ['2026-12', '2027-01', '2027-02']);
  assert.deepEqual(periodosSiguientes('2026-11-Q1', 'quincenal', 2), ['2026-11-Q2', '2026-12-Q1']);
});

test('retrocede al periodo anterior sin mezclar formatos', () => {
  assert.equal(periodoAnterior('2027-01', 'mensual'), '2026-12');
  assert.equal(periodoAnterior('2026-11-Q1', 'quincenal'), '2026-10-Q2');
  assert.equal(periodoAnterior('2026-11-Q2', 'quincenal'), '2026-11-Q1');
  assert.equal(periodoAnterior('2027-W01', 'semanal'), '2026-W53');
  assert.equal(periodoAnterior('2026-W01', 'semanal'), '2025-W52');
  assert.equal(periodoSiguiente(periodoAnterior('2026-W47', 'semanal'), 'semanal'), '2026-W47');
  assert.equal(periodoSiguiente(periodoAnterior('2027-01', 'mensual'), 'mensual'), '2027-01');
  assert.equal(periodoSiguiente(periodoAnterior('2026-12-Q1', 'quincenal'), 'quincenal'), '2026-12-Q1');
});

test('valida únicamente los formatos soportados', () => {
  assert.equal(esPeriodoValido('2026-11'), true);
  assert.equal(esPeriodoValido('2026-11-Q2'), true);
  assert.equal(esPeriodoValido('2026-W47'), true);
  assert.equal(esPeriodoValido('2026-13'), false);
  assert.equal(esPeriodoValido('2026-11-Q3'), false);
  assert.equal(esPeriodoValido('2026-W54'), false);
  assert.equal(esPeriodoValido('2026-11', 'semanal'), false);
});
