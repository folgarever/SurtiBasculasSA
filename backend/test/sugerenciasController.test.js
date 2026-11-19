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

function mockCreacion() {
  const consultas = [];
  pool.execute = async (sql, params) => {
    consultas.push({ sql, params });
    if (sql.startsWith('INSERT')) return [{ insertId: 12 }];
    if (sql.startsWith('UPDATE')) return [{ affectedRows: 1 }];
    return [[{ folio: 'SG-2026-00012' }]];
  };
  return consultas;
}

test('crearSugerencia persiste el indicador de anonimato y asigna el folio', async () => {
  const consultas = mockCreacion();

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
  assert.equal(consultas.length, 3);
  assert.match(consultas[0].sql, /INSERT INTO sugerencias \(empleado_id, titulo, descripcion, anonima\)/);
  assert.deepEqual(consultas[0].params, [
    7,
    'Más mesas',
    'Debería haber más mesas en el comedor.',
    true,
  ]);
  assert.match(consultas[1].sql, /CONCAT\('SG-', DATE_FORMAT\(creado_en, '%Y'\), '-', LPAD\(id, 5, '0'\)\)/);
  assert.deepEqual(consultas[1].params, [12]);
  assert.equal(res.cuerpo.sugerencia.folio, 'SG-2026-00012');
});

test('crearSugerencia usa false por omisión y rechaza valores no booleanos', async () => {
  const consultas = mockCreacion();

  await crearSugerencia({
    usuario: { id: 7 },
    body: { titulo: 'Mejor señal', descripcion: 'La señal de internet es inestable.' },
  }, crearRespuesta(), (error) => { throw error; });
  assert.equal(consultas[0].params[3], false);

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
    folio: 'SG-2026-00003',
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
  assert.equal(res.cuerpo.sugerencias[0].folio, 'SG-2026-00003');
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
        folio: 'SG-2026-00003',
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
        folio: 'SG-2026-00002',
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
  assert.match(consulta, /COALESCE\(s\.folio,/);
  assert.equal(res.cuerpo.sugerencias[0].folio, 'SG-2026-00003');
  assert.equal(res.cuerpo.sugerencias[0].anonima, true);
  assert.equal(res.cuerpo.sugerencias[0].empleado, 'Anónimo');
  assert.equal(res.cuerpo.sugerencias[0].codigo_empleado, null);
  assert.equal(res.cuerpo.sugerencias[1].anonima, false);
  assert.equal(res.cuerpo.sugerencias[1].empleado, 'Mafer García');
});
