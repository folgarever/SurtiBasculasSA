const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const {
  crearSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
} = require('../src/controllers/solicitudesController');

const executeOriginal = pool.execute;
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

function crearConexion({ solicitud, conflicto = false } = {}) {
  const consultas = [];
  let rollbackCount = 0;
  let commitCount = 0;
  return {
    consultas,
    get rollbackCount() { return rollbackCount; },
    get commitCount() { return commitCount; },
    async beginTransaction() {},
    async execute(sql, parametros) {
      consultas.push({ sql, parametros });
      if (sql.includes('SELECT id FROM empleados')) return [[{ id: 7 }]];
      if (sql.includes('FROM solicitudes_ausencias') && sql.includes('FOR UPDATE')) {
        return [solicitud ? [solicitud] : []];
      }
      if (sql.includes('estado IN')) return [conflicto ? [{ id: 4 }] : []];
      if (sql.includes('INSERT INTO solicitudes_ausencias')) return [{ insertId: 12 }];
      if (sql.includes('INSERT INTO incidencias_permisos')) return [{ insertId: 25 }];
      return [{ affectedRows: 1 }];
    },
    async commit() { commitCount += 1; },
    async rollback() { rollbackCount += 1; },
    release() {},
  };
}

test.afterEach(() => {
  pool.execute = executeOriginal;
  pool.getConnection = getConnectionOriginal;
});

test('crearSolicitud valida el rango de fechas antes de tocar la base', async () => {
  const res = crearRespuesta();
  await crearSolicitud({
    body: {
      tipo: 'vacaciones',
      fecha_inicio: '2026-02-31',
      fecha_fin: '2026-03-02',
      motivo: 'Descanso anual',
    },
    usuario: { id: 7 },
  }, res, (error) => { throw error; });

  assert.equal(res.codigo, 400);
  assert.match(res.cuerpo.mensaje, /fechas válidas/);
});

test('crearSolicitud registra la solicitud del empleado autenticado', async () => {
  const conexion = crearConexion();
  pool.getConnection = async () => conexion;
  const res = crearRespuesta();

  await crearSolicitud({
    body: {
      empleado_id: 99,
      tipo: 'vacaciones',
      fecha_inicio: '2026-12-01',
      fecha_fin: '2026-12-05',
      motivo: '  Descanso anual  ',
    },
    usuario: { id: 7 },
  }, res, (error) => { throw error; });

  const alta = conexion.consultas.find(({ sql }) => sql.includes('INSERT INTO solicitudes_ausencias'));
  assert.equal(res.codigo, 201);
  assert.equal(res.cuerpo.id, 12);
  assert.deepEqual(alta.parametros, [7, 'vacaciones', '2026-12-01', '2026-12-05', 'Descanso anual']);
  assert.equal(conexion.commitCount, 1);
});

test('crearSolicitud impide fechas que coincidan con otra solicitud activa', async () => {
  const conexion = crearConexion({ conflicto: true });
  pool.getConnection = async () => conexion;
  const res = crearRespuesta();

  await crearSolicitud({
    body: {
      tipo: 'permiso',
      fecha_inicio: '2026-12-03',
      fecha_fin: '2026-12-03',
      motivo: 'Cita médica',
    },
    usuario: { id: 7 },
  }, res, (error) => { throw error; });

  assert.equal(res.codigo, 409);
  assert.equal(conexion.rollbackCount, 1);
  assert.equal(conexion.commitCount, 0);
});

test('aprobarSolicitud registra una incidencia y guarda el ADMIN que aprobó', async () => {
  const conexion = crearConexion({
    solicitud: {
      id: 12,
      empleado_id: 7,
      tipo: 'permiso',
      fecha_inicio: '2026-12-03',
      fecha_fin: '2026-12-03',
      motivo: 'Cita médica',
      estado: 'pendiente',
    },
  });
  pool.getConnection = async () => conexion;
  const res = crearRespuesta();

  await aprobarSolicitud({ params: { id: '12' }, body: {}, usuario: { id: 2 } }, res, (error) => { throw error; });

  const incidencia = conexion.consultas.find(({ sql }) => sql.includes('INSERT INTO incidencias_permisos'));
  const actualizacion = conexion.consultas.find(({ sql }) => sql.includes('UPDATE solicitudes_ausencias'));
  assert.equal(res.codigo, 200);
  assert.deepEqual(incidencia.parametros, [7, '2026-12-03', '2026-12-03', 'permiso_oficial', 'Cita médica', 2]);
  assert.deepEqual(actualizacion.parametros, ['aprobada', 2, null, 25, '12']);
  assert.equal(conexion.commitCount, 1);
});

test('rechazarSolicitud exige un motivo antes de abrir una transacción', async () => {
  const res = crearRespuesta();
  await rechazarSolicitud({
    params: { id: '12' },
    body: { motivo: '  ' },
    usuario: { id: 2 },
  }, res, (error) => { throw error; });

  assert.equal(res.codigo, 400);
  assert.match(res.cuerpo.mensaje, /motivo del rechazo/);
});

test('rechazarSolicitud guarda el motivo y el administrador que resolvió', async () => {
  const conexion = crearConexion({
    solicitud: {
      id: 12,
      empleado_id: 7,
      tipo: 'vacaciones',
      fecha_inicio: '2026-12-01',
      fecha_fin: '2026-12-05',
      motivo: 'Descanso anual',
      estado: 'pendiente',
    },
  });
  pool.getConnection = async () => conexion;
  const res = crearRespuesta();

  await rechazarSolicitud({
    params: { id: '12' },
    body: { motivo: '  No hay cobertura  ' },
    usuario: { id: 3 },
  }, res, (error) => { throw error; });

  const actualizacion = conexion.consultas.find(({ sql }) => sql.includes('UPDATE solicitudes_ausencias'));
  assert.equal(res.codigo, 200);
  assert.deepEqual(actualizacion.parametros, ['rechazada', 3, 'No hay cobertura', null, '12']);
  assert.equal(conexion.commitCount, 1);
});

test('rechazarSolicitud solo resuelve solicitudes pendientes', async () => {
  const conexion = crearConexion({
    solicitud: {
      id: 12,
      empleado_id: 7,
      tipo: 'vacaciones',
      fecha_inicio: '2026-12-01',
      fecha_fin: '2026-12-05',
      motivo: 'Descanso anual',
      estado: 'aprobada',
    },
  });
  pool.getConnection = async () => conexion;
  const res = crearRespuesta();

  await rechazarSolicitud({
    params: { id: '12' },
    body: { motivo: 'Fechas no autorizadas' },
    usuario: { id: 2 },
  }, res, (error) => { throw error; });

  assert.equal(res.codigo, 409);
  assert.equal(conexion.rollbackCount, 1);
  assert.equal(conexion.consultas.some(({ sql }) => sql.includes('UPDATE solicitudes_ausencias')), false);
});
