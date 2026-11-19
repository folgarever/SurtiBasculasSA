const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const {
  registrarPuesto,
  actualizarPuesto,
  registrarEmpleado
} = require('../src/controllers/rrhhController');

const ejecutarOriginal = pool.execute;
const conexionOriginal = pool.getConnection;

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

function mockConexion(respuestas) {
  const consultas = [];
  const conexion = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, params) => {
      consultas.push({ sql, params });
      const respuesta = respuestas.shift();
      return respuesta || [[]];
    },
  };
  pool.getConnection = async () => conexion;
  return consultas;
}

function datosPuesto(cambios = {}) {
  return {
    codigo_abreviatura: 'COOR',
    nombre_puesto: 'Coordinador de Operaciones',
    departamento: 'Operaciones',
    frecuencia_evaluacion: 'mensual',
    es_admin: true,
    ...cambios
  };
}

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
  pool.getConnection = conexionOriginal;
});

test('registrarPuesto rechaza una abreviatura inválida', async () => {
  const res = crearRespuesta();
  await registrarPuesto({ body: datosPuesto({ codigo_abreviatura: 'CON ESPACIO' }) }, res, () => {});
  assert.equal(res.codigo, 400);
});

test('registrarPuesto guarda el indicador ADMIN y normaliza el código', async () => {
  const consultas = mockConexion([
    [[]],
    [{ insertId: 12 }]
  ]);
  const res = crearRespuesta();

  await registrarPuesto({ body: datosPuesto({ codigo_abreviatura: 'coor' }) }, res, () => {});

  assert.equal(res.codigo, 201);
  assert.deepEqual(consultas[1].params, [
    'COOR', 'Coordinador de Operaciones', 'Operaciones', 'mensual', 1
  ]);
});

test('actualizarPuesto propaga el permiso a los empleados activos', async () => {
  const consultas = mockConexion([
    [[{ id: 3, codigo_abreviatura: 'COOR', es_admin: 0 }]],
    [[{ total: 0 }]],
    [[]],
    [{ affectedRows: 1 }],
    [[{ id: 4 }]],
    [{ affectedRows: 2 }]
  ]);
  const res = crearRespuesta();

  await actualizarPuesto(
    { params: { id: '3' }, body: datosPuesto() },
    res,
    () => {}
  );

  assert.equal(res.codigo, 200);
  assert.match(res.cuerpo.mensaje, /2 empleado/);
  assert.match(consultas[5].sql, /rol_id = \?/);
  assert.equal(consultas[5].params[0], 4);
  assert.deepEqual(consultas[5].params.slice(2), ['SUR-GG-001', 'SUR-AC-002']);
});

test('actualizarPuesto protege el permiso del puesto del Gerente General', async () => {
  const consultas = mockConexion([
    [[{ id: 1, codigo_abreviatura: 'GG', es_admin: 1 }]],
    [[{ total: 1 }]]
  ]);
  const res = crearRespuesta();

  await actualizarPuesto(
    {
      params: { id: '1' },
      body: datosPuesto({ codigo_abreviatura: 'GG', nombre_puesto: 'Gerente General', es_admin: false })
    },
    res,
    () => {}
  );

  assert.equal(res.codigo, 400);
  assert.equal(consultas.length, 2);
});

test('registrarEmpleado asigna el rol según el permiso del puesto', async () => {
  const consultas = mockConexion([
    [[{ codigo_abreviatura: 'COOR', es_admin: 1 }]],
    [[{ id: 4 }]],
    [[{ id: 1 }]],
    [[{ ultimo: 2 }]],
    [{ insertId: 20 }]
  ]);
  const res = crearRespuesta();

  await registrarEmpleado(
    {
      body: { nombre: 'Nuevo Admin', puesto_id: 3, password: '123456' },
      usuario: { codigo_empleado: 'SUR-GG-001' }
    },
    res,
    () => {}
  );

  assert.equal(res.codigo, 201);
  assert.deepEqual(consultas[1].params, ['ADMIN']);
  assert.equal(consultas[4].params[3], 4);
});

test('registrarEmpleado impide que otro ADMIN asigne un puesto con permisos de ADMIN', async () => {
  const consultas = mockConexion([
    [[{ codigo_abreviatura: 'COOR', es_admin: 1 }]]
  ]);
  const res = crearRespuesta();

  await registrarEmpleado(
    {
      body: { nombre: 'Nuevo Admin', puesto_id: 3, password: '123456' },
      usuario: { codigo_empleado: 'SUR-AC-002' }
    },
    res,
    () => {}
  );

  assert.equal(res.codigo, 403);
  assert.equal(consultas.length, 1);
});
