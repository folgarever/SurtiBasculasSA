const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const { obtenerVistas, guardarVistas, validarVistas } = require('../src/controllers/notificacionesController');

const ejecutarOriginal = pool.execute;

function crearRespuesta() {
  return {
    codigo: 200,
    cuerpo: null,
    status(codigo) {
      this.codigo = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
});

test('obtiene únicamente las lecturas del empleado autenticado', async () => {
  let consulta;
  pool.execute = async (sql, valores) => {
    consulta = { sql, valores };
    return [[{ notificacion_id: 'evaluacion-3', marcador: '2026-11:3' }]];
  };
  const res = crearRespuesta();

  await obtenerVistas({ usuario: { id: 8, role: 'EMPLOYEE' } }, res, assert.fail);

  assert.match(consulta.sql, /WHERE empleado_id = \?/);
  assert.deepEqual(consulta.valores, [8]);
  assert.deepEqual(res.cuerpo, { vistas: { 'evaluacion-3': '2026-11:3' } });
});

test('guarda en lote lecturas asociadas solo al candidato autenticado', async () => {
  let consulta;
  pool.execute = async (sql, valores) => {
    consulta = { sql, valores };
    return [{ affectedRows: 1 }];
  };
  const res = crearRespuesta();

  await guardarVistas({
    usuario: { role: 'CANDIDATE', candidato_acceso_id: 12 },
    body: { vistas: [{ id: 'seleccion-4', marcador: '4:1:completada:recomendable' }] },
  }, res, assert.fail);

  assert.match(consulta.sql, /INSERT INTO notificaciones_leidas/);
  assert.deepEqual(consulta.valores, [null, 12, 'seleccion-4', '4:1:completada:recomendable']);
  assert.deepEqual(res.cuerpo, { guardadas: 1 });
});

test('rechaza lecturas repetidas o con datos fuera de los límites', () => {
  assert.equal(validarVistas([{ id: 'x', marcador: '1' }, { id: 'x', marcador: '2' }]), null);
  assert.equal(validarVistas([{ id: 'x'.repeat(121), marcador: '1' }]), null);
  assert.equal(validarVistas([{ id: 'x', marcador: 'm'.repeat(4097) }]), null);
  assert.deepEqual(validarVistas([]), []);
});
