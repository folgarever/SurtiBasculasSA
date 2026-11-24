const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const { validarFicha, calcularEdad, esPdf } = require('../src/utils/fichaEmpleado');
const {
  actualizarFichaEmpleado,
  subirCurriculumEmpleado
} = require('../src/controllers/rrhhController');

const ejecutarOriginal = pool.execute;
const HOY = '2026-11-24';

function crearRespuesta() {
  return {
    codigo: 200,
    cuerpo: null,
    status(codigo) { this.codigo = codigo; return this; },
    json(cuerpo) { this.cuerpo = cuerpo; return this; }
  };
}

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
});

test('calcularEdad respeta si el cumpleaños ya pasó', () => {
  assert.equal(calcularEdad('1990-11-24', HOY), 36);
  assert.equal(calcularEdad('1990-11-25', HOY), 35);
});

test('validarFicha normaliza DPI y teléfono y deja vacíos como NULL', () => {
  const { errores, valores } = validarFicha({
    nombre_completo: '  Ana María López ',
    dpi: '2456 12345 0101',
    fecha_nacimiento: '1990-05-10',
    correo: 'ana@empresa.com',
    telefono: '5555-1234',
    fecha_ingreso: ''
  }, HOY);
  assert.deepEqual(errores, []);
  assert.equal(valores.nombre_completo, 'Ana María López');
  assert.equal(valores.dpi, '2456123450101');
  assert.equal(valores.telefono, '55551234');
  assert.equal(valores.fecha_ingreso, null);
});

test('validarFicha rechaza datos inconsistentes', () => {
  const { errores } = validarFicha({
    dpi: '123',
    fecha_nacimiento: '2030-01-01',
    correo: 'sin-arroba',
    telefono: 'abc',
    fecha_ingreso: '2027-01-01'
  }, HOY);
  assert.equal(errores.length, 5);
  assert.equal(validarFicha({ fecha_nacimiento: '1990-02-31' }, HOY).errores.length, 1);
  assert.equal(
    validarFicha({ fecha_nacimiento: '2000-01-01', fecha_ingreso: '1999-01-01' }, HOY).errores.length,
    1
  );
});

test('esPdf valida la firma del archivo', () => {
  assert.equal(esPdf(Buffer.from('%PDF-1.7 contenido')), true);
  assert.equal(esPdf(Buffer.from('MZ ejecutable')), false);
});

test('actualizarFichaEmpleado guarda sin sobrescribir con upsert y responde 409 con DPI repetido', async () => {
  const consultas = [];
  pool.execute = async (sql, params) => {
    consultas.push({ sql, params });
    if (sql.includes('SELECT id FROM empleados')) return [[{ id: 3 }]];
    if (sql.startsWith('UPDATE')) {
      const error = new Error('dup');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
    return [[]];
  };
  const res = crearRespuesta();
  await actualizarFichaEmpleado(
    { params: { id: '3' }, body: { dpi: '2456123450101' }, usuario: { id: 1 } },
    res,
    (error) => { throw error; }
  );
  assert.equal(res.codigo, 409);
  assert.ok(!consultas.some((consulta) => /ON DUPLICATE KEY/i.test(consulta.sql)));
});

test('actualizarFichaEmpleado responde 404 si el empleado no existe y 400 si los datos son inválidos', async () => {
  pool.execute = async () => [[]];
  const noExiste = crearRespuesta();
  await actualizarFichaEmpleado({ params: { id: '9' }, body: {} }, noExiste, () => {});
  assert.equal(noExiste.codigo, 404);

  const invalida = crearRespuesta();
  await actualizarFichaEmpleado({ params: { id: '9' }, body: { dpi: '1' } }, invalida, () => {});
  assert.equal(invalida.codigo, 400);
});

test('actualizarFichaEmpleado audita solo los campos modificados, sin guardar valores', async () => {
  const auditorias = [];
  pool.execute = async (sql, params) => {
    if (sql.includes('SELECT id FROM empleados')) return [[{ id: 3 }]];
    if (sql.includes('FROM empleados_ficha WHERE')) {
      return [[{ nombre_completo: 'Ana', dpi: '2456123450101', fecha_nacimiento: null, correo: null, telefono: null, fecha_ingreso: null }]];
    }
    if (sql.includes('INTO empleados_ficha_auditoria')) auditorias.push(params);
    return [[]];
  };
  const res = crearRespuesta();
  await actualizarFichaEmpleado(
    { params: { id: '3' }, body: { nombre_completo: 'Ana', dpi: '1111222233334', correo: 'a@b.co' }, usuario: { id: 1 } },
    res,
    (error) => { throw error; }
  );
  assert.equal(res.codigo, 200);
  assert.deepEqual(auditorias, [[3, 1, 'ficha', 'dpi,correo']]);

  const sinCambios = [];
  pool.execute = async (sql, params) => {
    if (sql.includes('SELECT id FROM empleados')) return [[{ id: 3 }]];
    if (sql.includes('FROM empleados_ficha WHERE')) return [[{ nombre_completo: 'Ana' }]];
    if (sql.includes('INTO empleados_ficha_auditoria')) sinCambios.push(params);
    return [[]];
  };
  await actualizarFichaEmpleado(
    { params: { id: '3' }, body: { nombre_completo: 'Ana' }, usuario: { id: 1 } },
    crearRespuesta(),
    (error) => { throw error; }
  );
  assert.equal(sinCambios.length, 0);
});

test('subirCurriculumEmpleado rechaza archivos que no son PDF y guarda los PDF válidos', async () => {
  const consultas = [];
  pool.execute = async (sql, params) => {
    consultas.push({ sql, params });
    return sql.includes('SELECT id FROM empleados') ? [[{ id: 3 }]] : [[]];
  };
  const rechazado = crearRespuesta();
  await subirCurriculumEmpleado(
    { params: { id: '3' }, file: { buffer: Buffer.from('MZ'), originalname: 'virus.pdf' } },
    rechazado,
    () => {}
  );
  assert.equal(rechazado.codigo, 400);

  const aceptado = crearRespuesta();
  await subirCurriculumEmpleado(
    { params: { id: '3' }, usuario: { id: 1 }, file: { buffer: Buffer.from('%PDF-1.4 ok'), originalname: 'CV Ana.pdf' } },
    aceptado,
    () => {}
  );
  assert.equal(aceptado.codigo, 200);
  assert.equal(aceptado.cuerpo.cv_nombre, 'CV Ana.pdf');
  assert.ok(consultas.some((consulta) => consulta.sql.startsWith('UPDATE empleados_ficha')));
});
