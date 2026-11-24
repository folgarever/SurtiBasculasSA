const pool = require('../config/db');

const TIPOS_PERMITIDOS = ['vacaciones', 'permiso'];
const LONGITUD_MAXIMA_MOTIVO = 2000;
const LONGITUD_MAXIMA_RECHAZO = 500;

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const parsed = new Date(`${fecha}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
}

function idValido(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

async function listarPropias(req, res, next) {
  try {
    const [solicitudes] = await pool.execute(
      `SELECT id, tipo, fecha_inicio, fecha_fin, motivo, estado, motivo_revision,
              creado_en, revisado_en
       FROM solicitudes_ausencias
       WHERE empleado_id = ?
       ORDER BY creado_en DESC, id DESC
       LIMIT 100`,
      [req.usuario.id]
    );
    return res.json({ solicitudes });
  } catch (error) {
    return next(error);
  }
}

async function listarAdministracion(req, res, next) {
  try {
    const [solicitudes] = await pool.execute(
      `SELECT s.id, s.empleado_id, e.codigo_empleado, e.nombre, s.tipo,
              s.fecha_inicio, s.fecha_fin, s.motivo, s.estado, s.motivo_revision,
              s.creado_en, s.revisado_en, re.nombre AS revisor
       FROM solicitudes_ausencias s
       INNER JOIN empleados e ON e.id = s.empleado_id
       LEFT JOIN empleados re ON re.id = s.revisado_por
       ORDER BY (s.estado = 'pendiente') DESC, s.creado_en DESC, s.id DESC
       LIMIT 200`
    );
    return res.json({ solicitudes });
  } catch (error) {
    return next(error);
  }
}

async function crearSolicitud(req, res, next) {
  const { tipo, fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo } = req.body || {};
  const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : '';

  if (
    !TIPOS_PERMITIDOS.includes(tipo)
    || !fechaValida(fechaInicio)
    || !fechaValida(fechaFin)
    || fechaInicio > fechaFin
    || motivoLimpio.length < 4
    || motivoLimpio.length > LONGITUD_MAXIMA_MOTIVO
  ) {
    return res.status(400).json({
      mensaje: 'Indica un tipo, fechas válidas y un motivo de 4 a 2,000 caracteres.',
    });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [empleados] = await connection.execute(
      'SELECT id FROM empleados WHERE id = ? AND activo = 1 FOR UPDATE',
      [req.usuario.id]
    );
    if (!empleados[0]) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(404).json({ mensaje: 'El empleado ya no está activo.' });
    }

    const [conflictos] = await connection.execute(
      `SELECT id
       FROM solicitudes_ausencias
       WHERE empleado_id = ?
         AND estado IN ('pendiente', 'aprobada')
         AND fecha_inicio <= ?
         AND fecha_fin >= ?
       LIMIT 1`,
      [req.usuario.id, fechaFin, fechaInicio]
    );
    if (conflictos[0]) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(409).json({
        mensaje: 'Ya tienes una solicitud pendiente o aprobada que coincide con esas fechas.',
      });
    }

    const [resultado] = await connection.execute(
      `INSERT INTO solicitudes_ausencias
       (empleado_id, tipo, fecha_inicio, fecha_fin, motivo)
       VALUES (?, ?, ?, ?, ?)`,
      [req.usuario.id, tipo, fechaInicio, fechaFin, motivoLimpio]
    );
    await connection.commit();
    transaccionIniciada = false;
    return res.status(201).json({
      mensaje: 'Solicitud enviada para revisión.',
      id: resultado.insertId,
    });
  } catch (error) {
    if (connection && transaccionIniciada) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function resolverSolicitud(req, res, next, estado) {
  const id = req.params.id;
  const motivoRevision = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  if (!idValido(id)) {
    return res.status(400).json({ mensaje: 'El identificador de solicitud no es válido.' });
  }
  if (
    estado === 'rechazada'
    && (motivoRevision.length < 4 || motivoRevision.length > LONGITUD_MAXIMA_RECHAZO)
  ) {
    return res.status(400).json({ mensaje: 'El motivo del rechazo debe tener de 4 a 500 caracteres.' });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;
    const [solicitudes] = await connection.execute(
      `SELECT id, empleado_id, tipo, fecha_inicio, fecha_fin, motivo, estado
       FROM solicitudes_ausencias
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );
    const solicitud = solicitudes[0];
    if (!solicitud) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(404).json({ mensaje: 'Solicitud no encontrada.' });
    }
    if (solicitud.estado !== 'pendiente') {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(409).json({ mensaje: 'La solicitud ya fue resuelta.' });
    }

    let incidenciaId = null;
    if (estado === 'aprobada') {
      const tipoIncidencia = solicitud.tipo === 'vacaciones' ? 'vacaciones' : 'permiso_oficial';
      const [incidencia] = await connection.execute(
        `INSERT INTO incidencias_permisos
         (empleado_id, fecha_inicio, fecha_fin, tipo, motivo, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          solicitud.empleado_id,
          solicitud.fecha_inicio,
          solicitud.fecha_fin,
          tipoIncidencia,
          solicitud.motivo,
          req.usuario.id,
        ]
      );
      incidenciaId = incidencia.insertId;
    }

    await connection.execute(
      `UPDATE solicitudes_ausencias
       SET estado = ?, revisado_por = ?, revisado_en = CURRENT_TIMESTAMP,
           motivo_revision = ?, incidencia_id = ?
       WHERE id = ?`,
      [estado, req.usuario.id, estado === 'rechazada' ? motivoRevision : null, incidenciaId, id]
    );
    await connection.commit();
    transaccionIniciada = false;
    return res.json({
      mensaje: estado === 'aprobada' ? 'Solicitud aprobada.' : 'Solicitud rechazada.',
      estado,
    });
  } catch (error) {
    if (connection && transaccionIniciada) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

function aprobarSolicitud(req, res, next) {
  return resolverSolicitud(req, res, next, 'aprobada');
}

function rechazarSolicitud(req, res, next) {
  return resolverSolicitud(req, res, next, 'rechazada');
}

module.exports = {
  listarPropias,
  listarAdministracion,
  crearSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
};
