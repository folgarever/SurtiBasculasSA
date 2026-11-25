const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const {
  clasificarEntrada,
  calcularSalida,
  registrarMarcacion
} = require('../src/controllers/asistenciaController');

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

test.afterEach(() => {
  pool.getConnection = getConnectionOriginal;
});

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

test('registrarMarcacion permite a cuentas ADMIN registrar su entrada', async () => {
  const consultas = [];
  let confirmado = false;
  pool.getConnection = async () => ({
    async beginTransaction() {},
    async execute(sql, parametros) {
      consultas.push({ sql, parametros });
      if (sql.includes('SELECT h.hora_entrada')) {
        return [[{ hora_entrada: '08:00:00', hora_salida: '17:00:00' }]];
      }
      if (sql.includes('SELECT id, hora_entrada')) return [[]];
      return [{ insertId: 7 }];
    },
    async commit() { confirmado = true; },
    async rollback() {},
    release() {},
  });
  const res = crearRespuesta();

  await registrarMarcacion({
    usuario: { id: 11, codigo_empleado: 'SUR-COOR-004', role: 'ADMIN' },
    body: {},
  }, res, (error) => { throw error; });

  const insercion = consultas.find(({ sql }) => sql.includes('INSERT INTO marcaciones'));
  assert.equal(res.codigo, 201);
  assert.equal(res.cuerpo.tipo, 'entrada');
  assert.equal(insercion.parametros[0], 11);
  assert.equal(confirmado, true);
});

test('registrarMarcacion rechaza al Gerente General sin consultar la base', async () => {
  pool.getConnection = async () => {
    throw new Error('No debe conectarse a la base.');
  };
  const res = crearRespuesta();

  await registrarMarcacion({
    usuario: { id: 1, codigo_empleado: 'SUR-GG-001', role: 'ADMIN' },
    body: {},
  }, res, (error) => { throw error; });

  assert.equal(res.codigo, 403);
  assert.match(res.cuerpo.mensaje, /exenta de registrar asistencia/);
});
