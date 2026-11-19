const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const {
  verificarToken,
  permitirEvaluaciones,
  permitirGerenteGeneral,
  permitirRrhhOGerente
} = require('../src/middlewares/authMiddleware');

const verificarOriginal = jwt.verify;
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
  jwt.verify = verificarOriginal;
  pool.execute = ejecutarOriginal;
});

test('verificarToken refresca el rol y el código desde la base de datos', async () => {
  jwt.verify = () => ({
    id: 7,
    codigo_empleado: 'SUR-AC-002',
    nombre: 'Mafer',
    rol: 'Empleado',
    rol_id: 1,
    role: 'EMPLOYEE',
  });
  pool.execute = async () => [[{
    id: 7,
    codigo_empleado: 'SUR-AC-002',
    nombre: 'Mafer García',
    rol_id: 4,
    nombre_puesto: 'Asistente Comercial y RR. HH.',
    nombre_rol: 'ADMIN',
  }]];

  const req = { headers: { authorization: 'Bearer token' } };
  const res = crearRespuesta();
  let paso = false;

  await verificarToken(req, res, () => { paso = true; });

  assert.equal(paso, true);
  assert.equal(req.usuario.role, 'ADMIN');
  assert.equal(req.usuario.rol_id, 4);
  assert.equal(req.usuario.codigo_empleado, 'SUR-AC-002');
});

test('verificarToken otorga ADMIN a un puesto marcado como administrador', async () => {
  jwt.verify = () => ({ id: 9, codigo_empleado: 'SUR-COOR-004', role: 'EMPLOYEE' });
  pool.execute = async () => [[{
    id: 9,
    codigo_empleado: 'SUR-COOR-004',
    nombre: 'Coordinador',
    rol_id: 4,
    nombre_puesto: 'Coordinador de Operaciones',
    es_admin: 1,
    nombre_rol: 'ADMIN',
  }]];

  const req = { headers: { authorization: 'Bearer token' } };
  const res = crearRespuesta();
  let paso = false;

  await verificarToken(req, res, () => { paso = true; });

  assert.equal(paso, true);
  assert.equal(req.usuario.role, 'ADMIN');
  assert.equal(req.usuario.rol, 'ADMIN');
});

test('permitirGerenteGeneral solo acepta al Gerente General', () => {
  const permitido = crearRespuesta();
  const rechazado = crearRespuesta();
  let paso = false;

  permitirGerenteGeneral(
    { usuario: { role: 'ADMIN', codigo_empleado: 'SUR-GG-001' } },
    permitido,
    () => { paso = true; }
  );
  permitirGerenteGeneral(
    { usuario: { role: 'ADMIN', codigo_empleado: 'SUR-AC-002' } },
    rechazado,
    () => { paso = false; }
  );

  assert.equal(paso, true);
  assert.equal(rechazado.codigo, 403);
});

test('permitirRrhhOGerente acepta a RRHH y al Gerente General', () => {
  const casos = [
    { role: 'ADMIN', rol_id: 4, codigo_empleado: 'SUR-AC-002' },
    { role: 'ADMIN', rol_id: 4, codigo_empleado: 'SUR-GG-001' },
    { role: 'EMPLOYEE', rol_id: 2, codigo_empleado: 'SUR-RRHH-020' },
  ];

  for (const usuario of casos) {
    let paso = false;
    permitirRrhhOGerente({ usuario }, crearRespuesta(), () => { paso = true; });
    assert.equal(paso, true);
  }
});

test('permitirRrhhOGerente rechaza a otros ADMIN', () => {
  const res = crearRespuesta();
  let paso = false;

  permitirRrhhOGerente(
    { usuario: { role: 'ADMIN', rol_id: 4, codigo_empleado: 'SUR-COOR-004' } },
    res,
    () => { paso = true; }
  );

  assert.equal(paso, false);
  assert.equal(res.codigo, 403);
});

test('verificarToken rechaza empleados dados de baja', async () => {
  jwt.verify = () => ({ id: 8, codigo_empleado: 'SUR-VEN-003', role: 'EMPLOYEE' });
  pool.execute = async () => [[]];

  const req = { headers: { authorization: 'Bearer token' } };
  const res = crearRespuesta();
  let paso = false;

  await verificarToken(req, res, () => { paso = true; });

  assert.equal(paso, false);
  assert.equal(res.codigo, 401);
});

test('verificarToken rechaza cuentas de candidato eliminadas', async () => {
  jwt.verify = () => ({ role: 'CANDIDATE', candidato_acceso_id: 99 });
  pool.execute = async () => [[]];

  const req = { headers: { authorization: 'Bearer token' } };
  const res = crearRespuesta();
  let paso = false;

  await verificarToken(req, res, () => { paso = true; });

  assert.equal(paso, false);
  assert.equal(res.codigo, 401);
});

test('verificarToken rechaza cuentas de candidato dadas de baja', async () => {
  jwt.verify = () => ({ role: 'CANDIDATE', candidato_acceso_id: 99 });
  pool.execute = async () => [[{ id: 99, activo: 0 }]];

  const req = { headers: { authorization: 'Bearer token' } };
  const res = crearRespuesta();
  let paso = false;

  await verificarToken(req, res, () => { paso = true; });

  assert.equal(paso, false);
  assert.equal(res.codigo, 401);
});

test('permitirEvaluaciones exige ADMIN y código autorizado', () => {
  const res = crearRespuesta();
  let paso = false;

  permitirEvaluaciones(
    { usuario: { role: 'ADMIN', codigo_empleado: 'SUR-OTRO-999' } },
    res,
    () => { paso = true; }
  );

  assert.equal(paso, false);
  assert.equal(res.codigo, 403);
});
