const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const {
  aprobarHorasExtras,
  rechazarHorasExtras,
} = require('../src/controllers/rrhhController');

const ejecutarOriginal = pool.execute;
const getConnectionOriginal = pool.getConnection;

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

function crearConexion(fila) {
  const consultas = [];
  return {
    consultas,
    async beginTransaction() {},
    async execute(sql, parametros) {
      consultas.push({ sql, parametros });
      if (sql.includes('FOR UPDATE')) return [[fila]];
      return [{}];
    },
    async commit() {},
    async rollback() {},
    release() {},
  };
}

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
  pool.getConnection = getConnectionOriginal;
});

test('aprobarHorasExtras actualiza el estado y deja auditoría', async () => {
  const conexion = crearConexion({
    id: 12,
    hora_entrada: '2026-11-19 08:00:00',
    hora_salida: '2026-11-19 19:30:00',
    horas_extras: 1,
    extras_estado: 'pendiente',
  });
  pool.getConnection = async () => conexion;

  const res = crearRespuesta();
  await aprobarHorasExtras(
    { params: { id: '12' }, body: {}, usuario: { id: 2 } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo.extras_estado, 'aprobada');
  assert.match(conexion.consultas[1].sql, /extras_estado = \?/);
  assert.equal(conexion.consultas[1].parametros[0], 'aprobada');
  assert.equal(conexion.consultas[1].parametros[1], 2);
  assert.match(conexion.consultas[2].sql, /historial_correcciones/);
  assert.match(conexion.consultas[2].parametros.at(-1), /Horas extras aprobada/);
});

test('rechazarHorasExtras exige motivo', async () => {
  const res = crearRespuesta();
  await rechazarHorasExtras(
    { params: { id: '12' }, body: { motivo: '   ' }, usuario: { id: 2 } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.codigo, 400);
  assert.match(res.cuerpo.mensaje, /motivo del rechazo/);
});

test('rechazarHorasExtras guarda el motivo y al aprobador', async () => {
  const conexion = crearConexion({
    id: 12,
    hora_entrada: '2026-11-19 08:00:00',
    hora_salida: '2026-11-19 19:30:00',
    horas_extras: 1,
    extras_estado: 'pendiente',
  });
  pool.getConnection = async () => conexion;

  const res = crearRespuesta();
  await rechazarHorasExtras(
    { params: { id: '12' }, body: { motivo: 'No se autorizó la jornada' }, usuario: { id: 2 } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.codigo, 200);
  assert.equal(conexion.consultas[1].parametros[0], 'rechazada');
  assert.equal(conexion.consultas[1].parametros[2], 'No se autorizó la jornada');
  assert.match(conexion.consultas[2].parametros.at(-1), /No se autorizó la jornada/);
});

test('no se puede resolver una solicitud ya aprobada', async () => {
  const conexion = crearConexion({
    id: 12,
    hora_entrada: '2026-11-19 08:00:00',
    hora_salida: '2026-11-19 19:30:00',
    horas_extras: 1,
    extras_estado: 'aprobada',
  });
  pool.getConnection = async () => conexion;

  const res = crearRespuesta();
  await aprobarHorasExtras(
    { params: { id: '12' }, body: {}, usuario: { id: 2 } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.codigo, 409);
  assert.equal(conexion.consultas.length, 1);
});
