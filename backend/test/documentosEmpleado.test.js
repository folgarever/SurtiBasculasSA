const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const {
  subirDocumentoEmpleado,
  descargarDocumentoEmpleado,
  eliminarDocumentoEmpleado,
  obtenerDocumentosPorVencer
} = require('../src/controllers/documentosEmpleadoController');

const ejecutarOriginal = pool.execute;
const PDF = Buffer.from('%PDF-1.4 contenido');

function crearRespuesta() {
  return {
    codigo: 200,
    cuerpo: null,
    headers: {},
    status(codigo) { this.codigo = codigo; return this; },
    json(cuerpo) { this.cuerpo = cuerpo; return this; },
    setHeader(clave, valor) { this.headers[clave] = valor; },
    send(cuerpo) { this.cuerpo = cuerpo; return this; }
  };
}

function peticion(extra = {}) {
  return {
    params: { id: '5' },
    body: { tipo: 'contrato', fecha_vencimiento: '2027-01-31' },
    file: { originalname: 'contrato.pdf', buffer: PDF },
    usuario: { id: 1 },
    ...extra
  };
}

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
});

test('subirDocumentoEmpleado valida tipo, fecha y PDF antes de tocar la base', async () => {
  pool.execute = async () => assert.fail('No debe consultar la base con datos inválidos');
  for (const extra of [
    { body: { tipo: 'otra-cosa' } },
    { body: { tipo: 'dpi', fecha_vencimiento: '2027-02-31' } },
    { body: { tipo: 'otro', nombre: '' } },
    { file: { originalname: 'x.pdf', buffer: Buffer.from('no es pdf') } },
    { file: undefined }
  ]) {
    const res = crearRespuesta();
    await subirDocumentoEmpleado(peticion(extra), res, assert.ifError);
    assert.equal(res.codigo, 400);
  }
});

test('subirDocumentoEmpleado guarda el documento y audita sin valores', async () => {
  const consultas = [];
  pool.execute = async (sql, parametros) => {
    consultas.push({ sql, parametros });
    if (sql.includes('SELECT id FROM empleados')) return [[{ id: 5 }]];
    if (sql.includes('INTO empleados_documentos')) return [{ insertId: 9 }];
    return [{ insertId: 1 }];
  };
  const res = crearRespuesta();
  await subirDocumentoEmpleado(peticion(), res, assert.ifError);

  assert.equal(res.codigo, 201);
  assert.equal(res.cuerpo.id, 9);
  const insercion = consultas.find((c) => c.sql.includes('INTO empleados_documentos'));
  assert.deepEqual(insercion.parametros.slice(0, 3), [5, 'contrato', 'contrato.pdf']);
  assert.equal(insercion.parametros[4], '2027-01-31');
  const auditoria = consultas.find((c) => c.sql.includes('INTO empleados_ficha_auditoria'));
  assert.deepEqual(auditoria.parametros, [5, 1, 'documento_subido', 'contrato']);
});

test('subirDocumentoEmpleado usa el nombre personalizado para documentos tipo otro', async () => {
  const consultas = [];
  pool.execute = async (sql, parametros) => {
    consultas.push({ sql, parametros });
    if (sql.includes('SELECT id FROM empleados')) return [[{ id: 5 }]];
    if (sql.includes('INTO empleados_documentos')) return [{ insertId: 12 }];
    return [{ insertId: 1 }];
  };
  const res = crearRespuesta();
  await subirDocumentoEmpleado(peticion({
    body: { tipo: 'otro', nombre: 'Constancia médica', fecha_vencimiento: '' },
  }), res, assert.ifError);

  assert.equal(res.codigo, 201);
  const insercion = consultas.find((c) => c.sql.includes('INTO empleados_documentos'));
  assert.deepEqual(insercion.parametros.slice(0, 3), [5, 'otro', 'Constancia médica.pdf']);
});

test('descargarDocumentoEmpleado y eliminarDocumentoEmpleado responden 404 si no pertenece al empleado', async () => {
  pool.execute = async () => [[]];
  const req = peticion({ params: { id: '5', documentoId: '99' } });
  const descarga = crearRespuesta();
  await descargarDocumentoEmpleado(req, descarga, assert.ifError);
  const baja = crearRespuesta();
  await eliminarDocumentoEmpleado(req, baja, assert.ifError);
  assert.equal(descarga.codigo, 404);
  assert.equal(baja.codigo, 404);
});

test('descargarDocumentoEmpleado devuelve el PDF y audita la consulta', async () => {
  const acciones = [];
  pool.execute = async (sql, parametros) => {
    if (sql.includes('FROM empleados_documentos')) return [[{ tipo: 'dpi', nombre: 'dpi.pdf', contenido: PDF }]];
    acciones.push(parametros[2]);
    return [{ insertId: 1 }];
  };
  const res = crearRespuesta();
  await descargarDocumentoEmpleado(peticion({ params: { id: '5', documentoId: '3' } }), res, assert.ifError);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.equal(res.cuerpo, PDF);
  assert.deepEqual(acciones, ['documento_descarga']);
});

test('obtenerDocumentosPorVencer lista vencidos y próximos de empleados activos', async () => {
  let sqlUsado = '';
  pool.execute = async (sql) => {
    sqlUsado = sql;
    return [[{ id: 1, empleado_id: 5, empleado: 'Ana', tipo: 'contrato', fecha_vencimiento: '2026-12-01', dias: 7 }]];
  };
  const res = crearRespuesta();
  await obtenerDocumentosPorVencer({}, res, assert.ifError);
  assert.equal(res.cuerpo.documentos.length, 1);
  assert.match(sqlUsado, /e\.activo = 1/);
  assert.match(sqlUsado, /INTERVAL 30 DAY/);
});
