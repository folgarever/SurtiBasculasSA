const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const {
  crearSugerencia,
  obtenerMisSugerencias,
  obtenerTodasLasSugerencias,
} = require('../src/controllers/sugerenciasController');

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

test('crearSugerencia persiste el indicador de anonimato', async () => {
  let consulta = '';
  let parametros = [];
  pool.execute = async (sql, params) => {
    consulta = sql;
    parametros = params;
    return [{ insertId: 12 }];
  };

  const res = crearRespuesta();
  await crearSugerencia({
    usuario: { id: 7 },
    body: {
      titulo: '  Más mesas  ',
      descripcion: '  Debería haber más mesas en el comedor.  ',
      anonima: true,
    },
  }, res, (error) => { throw error; });

  assert.equal(res.codigo, 201);
  assert.match(consulta, /INSERT INTO sugerencias \(empleado_id, titulo, descripcion, anonima\)/);
  assert.deepEqual(parametros, [
    7,
    'Más mesas',
    'Debería haber más mesas en el comedor.',
    true,
  ]);
});

test('crearSugerencia usa false por omisión y rechaza valores no booleanos', async () => {
  let parametros = [];
  pool.execute = async (sql, params) => {
    parametros = params;
    return [{ insertId: 13 }];
  };

  await crearSugerencia({
    usuario: { id: 7 },
    body: { titulo: 'Mejor señal', descripcion: 'La señal de internet es inestable.' },
  }, crearRespuesta(), (error) => { throw error; });
  assert.equal(parametros[3], false);

  const res = crearRespuesta();
  pool.execute = async () => { throw new Error('No debió consultar la base de datos'); };
  await crearSugerencia({
    usuario: { id: 7 },
    body: {
      titulo: 'Mejor señal',
      descripcion: 'La señal de internet es inestable.',
      anonima: 'si',
    },
  }, res, (error) => { throw error; });
  assert.equal(res.codigo, 400);
  assert.match(res.cuerpo.mensaje, /anonima/);
});

test('obtenerMisSugerencias devuelve anonima y la respuesta del administrador', async () => {
  pool.execute = async () => [[{
    id: 3,
    titulo: 'Más mesas',
    descripcion: 'Debería haber más mesas en el comedor.',
    anonima: 1,
    creado_en: '2026-11-18 09:15:00',
    respuesta: 'Se instalarán mesas el próximo mes.',
    respondido_en: '2026-11-18 14:30:00',
    respondido_por: 'Mafer García',
  }]];

  const res = crearRespuesta();
  await obtenerMisSugerencias({ usuario: { id: 7 } }, res, (error) => { throw error; });

  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo.sugerencias[0].anonima, true);
  assert.equal(res.cuerpo.sugerencias[0].respuesta, 'Se instalarán mesas el próximo mes.');
  assert.equal(res.cuerpo.sugerencias[0].respondido_por, 'Mafer García');
});

test('obtenerTodasLasSugerencias oculta la identidad de las anónimas', async () => {
  let consulta = '';
  pool.execute = async (sql) => {
    consulta = sql;
    return [[
      {
        id: 3,
        titulo: 'Más mesas',
        descripcion: 'Debería haber más mesas en el comedor.',
        anonima: 1,
        creado_en: '2026-11-18 09:15:00',
        respuesta: null,
        respondido_en: null,
        respondido_por: null,
        empleado: 'Anónimo',
        codigo_empleado: null,
      },
      {
        id: 2,
        titulo: 'Mejor señal',
        descripcion: 'La señal de internet es inestable.',
        anonima: 0,
        creado_en: '2026-11-17 10:00:00',
        respuesta: 'Ya se revisó el router.',
        respondido_en: '2026-11-17 16:00:00',
        respondido_por: 'Héctor Ortiz',
        empleado: 'Mafer García',
        codigo_empleado: 'SUR-AC-002',
      },
    ]];
  };

  const res = crearRespuesta();
  await obtenerTodasLasSugerencias({}, res, (error) => { throw error; });

  assert.equal(res.codigo, 200);
  assert.match(consulta, /CASE WHEN s\.anonima = 1 THEN 'Anónimo' ELSE e\.nombre END/);
  assert.doesNotMatch(consulta, /e\.id AS empleado_id/);
  assert.equal(res.cuerpo.sugerencias[0].anonima, true);
  assert.equal(res.cuerpo.sugerencias[0].empleado, 'Anónimo');
  assert.equal(res.cuerpo.sugerencias[0].codigo_empleado, null);
  assert.equal(res.cuerpo.sugerencias[1].anonima, false);
  assert.equal(res.cuerpo.sugerencias[1].empleado, 'Mafer García');
});
