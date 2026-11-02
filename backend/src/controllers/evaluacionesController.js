const pool = require('../config/db');

const CODIGO_JEFE_MANTENIMIENTO = 'SUR-JM-005';
const CALIFICACIONES_GENERALES = [
  'presentacion',
  'desempeno',
  'atencion_cliente',
  'puntualidad',
  'conocimientos'
];
const CALIFICACIONES_JEFATURA = [
  'supervision_operaciones',
  'gestion_liderazgo_campo',
  'control_calidad_calibracion',
  'gestion_recursos_inventario',
  'atencion_tecnica_cliente',
  'liderazgo_personal',
  'toma_decisiones_presion',
  'pensamiento_analitico',
  'organizacion_planificacion'
];

function identificadorValido(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function fechaValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const fecha = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === value;
}

function calificacionesValidas(calificaciones, campos) {
  return calificaciones
    && typeof calificaciones === 'object'
    && !Array.isArray(calificaciones)
    && campos.every((campo) => (
      Number.isInteger(calificaciones[campo])
      && calificaciones[campo] >= 1
      && calificaciones[campo] <= 5
    ));
}

function observacionesValidas(observaciones, camposPermitidos) {
  return observaciones
    && typeof observaciones === 'object'
    && !Array.isArray(observaciones)
    && Object.entries(observaciones).every(([campo, texto]) => (
      camposPermitidos.includes(campo)
      && typeof texto === 'string'
      && texto.length <= 1000
    ));
}

async function obtenerEmpleados(req, res, next) {
  try {
    const [empleados] = await pool.execute(
      `SELECT e.id, e.codigo_empleado, e.nombre, p.nombre_puesto,
              COALESCE(a.dias_registrados, 0) AS dias_registrados_30d,
              COALESCE(a.atrasos, 0) AS atrasos_30d,
              COALESCE(ROUND(100 * a.entradas_puntuales / NULLIF(a.dias_registrados, 0), 1), 0)
                AS puntualidad_30d
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       LEFT JOIN (
         SELECT empleado_id,
                COUNT(*) AS dias_registrados,
                SUM(estado_entrada = 'atraso') AS atrasos,
                SUM(estado_entrada = 'puntual') AS entradas_puntuales
         FROM marcaciones
         WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY empleado_id
       ) a ON a.empleado_id = e.id
       WHERE e.activo = 1
       ORDER BY e.nombre ASC`
    );
    return res.json({ empleados });
  } catch (error) {
    return next(error);
  }
}

async function listarEvaluaciones(req, res, next) {
  const empleadoId = req.query.empleado_id;
  if (empleadoId !== undefined && !identificadorValido(empleadoId)) {
    return res.status(400).json({ mensaje: 'El identificador del empleado no es válido.' });
  }

  try {
    const filtros = empleadoId === undefined ? '' : 'WHERE ev.empleado_id = ?';
    const parametros = empleadoId === undefined ? [] : [Number(empleadoId)];
    const [evaluaciones] = await pool.execute(
      `SELECT ev.id, ev.empleado_id, e.codigo_empleado, e.nombre AS empleado,
              p.nombre_puesto, ev.evaluador_id, ev.fecha_evaluacion, ev.periodo,
              ev.presentacion, ev.desempeno, ev.atencion_cliente, ev.puntualidad,
              ev.conocimientos, ev.observaciones,
              ROUND((ev.presentacion + ev.desempeno + ev.atencion_cliente
                + ev.puntualidad + ev.conocimientos) / 5, 2) AS promedio_general,
              ev.creado_en,
              ej.supervision_operaciones, ej.gestion_liderazgo_campo,
              ej.control_calidad_calibracion, ej.gestion_recursos_inventario,
              ej.atencion_tecnica_cliente, ej.liderazgo_personal,
              ej.toma_decisiones_presion, ej.pensamiento_analitico,
              ej.organizacion_planificacion
       FROM evaluaciones ev
       INNER JOIN empleados e ON e.id = ev.empleado_id
       INNER JOIN puestos p ON p.id = e.puesto_id
       LEFT JOIN evaluaciones_jefatura ej ON ej.evaluacion_id = ev.id
       ${filtros}
       ORDER BY ev.fecha_evaluacion DESC, ev.id DESC`,
      parametros
    );
    return res.json({ evaluaciones });
  } catch (error) {
    return next(error);
  }
}

async function obtenerEvaluacion(req, res, next) {
  if (!identificadorValido(req.params.id)) {
    return res.status(400).json({ mensaje: 'El identificador de la evaluación no es válido.' });
  }

  try {
    const [evaluaciones] = await pool.execute(
      `SELECT ev.id, ev.empleado_id, e.codigo_empleado, e.nombre AS empleado,
              p.nombre_puesto, ev.evaluador_id, ev.fecha_evaluacion, ev.periodo,
              ev.presentacion, ev.desempeno, ev.atencion_cliente, ev.puntualidad,
              ev.conocimientos, ev.comentarios, ev.observaciones, ev.creado_en,
              ej.supervision_operaciones, ej.gestion_liderazgo_campo,
              ej.control_calidad_calibracion, ej.gestion_recursos_inventario,
              ej.atencion_tecnica_cliente, ej.liderazgo_personal,
              ej.toma_decisiones_presion, ej.pensamiento_analitico,
              ej.organizacion_planificacion
       FROM evaluaciones ev
       INNER JOIN empleados e ON e.id = ev.empleado_id
       INNER JOIN puestos p ON p.id = e.puesto_id
       LEFT JOIN evaluaciones_jefatura ej ON ej.evaluacion_id = ev.id
       WHERE ev.id = ?
       LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!evaluaciones[0]) {
      return res.status(404).json({ mensaje: 'Evaluación no encontrada.' });
    }

    return res.json({ evaluacion: evaluaciones[0] });
  } catch (error) {
    return next(error);
  }
}

async function crearEvaluacion(req, res, next) {
  const {
    empleado_id: empleadoId,
    fecha_evaluacion: fechaEvaluacion,
    periodo,
    calificaciones,
    especializada,
    comentarios,
    observaciones
  } = req.body || {};
  const notasPorCriterio = observaciones === undefined ? {} : observaciones;

  if (
    !identificadorValido(empleadoId)
    || !fechaValida(fechaEvaluacion)
    || typeof periodo !== 'string'
    || !periodo.trim()
    || periodo.trim().length > 100
    || !calificacionesValidas(calificaciones, CALIFICACIONES_GENERALES)
    || (comentarios !== undefined && comentarios !== null
      && (typeof comentarios !== 'string' || comentarios.length > 5000))
    || !notasPorCriterio
    || typeof notasPorCriterio !== 'object'
    || Array.isArray(notasPorCriterio)
  ) {
    return res.status(400).json({ mensaje: 'Los datos de la evaluación general son inválidos o incompletos.' });
  }

  let connection;
  try {
    const [empleados] = await pool.execute(
      'SELECT id, codigo_empleado FROM empleados WHERE id = ? AND activo = 1 LIMIT 1',
      [Number(empleadoId)]
    );
    const empleado = empleados[0];
    if (!empleado) {
      return res.status(404).json({ mensaje: 'El empleado no existe o está inactivo.' });
    }

    const esJefeMantenimiento = empleado.codigo_empleado === CODIGO_JEFE_MANTENIMIENTO;
    const camposObservacionPermitidos = esJefeMantenimiento
      ? [...CALIFICACIONES_GENERALES, ...CALIFICACIONES_JEFATURA]
      : CALIFICACIONES_GENERALES;
    if (
      (esJefeMantenimiento && !calificacionesValidas(especializada, CALIFICACIONES_JEFATURA))
      || (!esJefeMantenimiento && especializada !== undefined && especializada !== null)
      || !observacionesValidas(notasPorCriterio, camposObservacionPermitidos)
    ) {
      return res.status(400).json({
        mensaje: esJefeMantenimiento
          ? 'La evaluación del Jefe de Mantenimiento requiere todas las calificaciones especializadas.'
          : 'La evaluación especializada solo aplica al Jefe de Mantenimiento.'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [resultado] = await connection.execute(
      `INSERT INTO evaluaciones
       (empleado_id, evaluador_id, fecha_evaluacion, periodo, presentacion, desempeno,
        atencion_cliente, puntualidad, conocimientos, comentarios, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(empleadoId),
        req.usuario.id,
        fechaEvaluacion,
        periodo.trim(),
        ...CALIFICACIONES_GENERALES.map((campo) => calificaciones[campo]),
        comentarios?.trim() || null,
        Object.keys(notasPorCriterio).length > 0 ? JSON.stringify(notasPorCriterio) : null
      ]
    );

    if (esJefeMantenimiento) {
      await connection.execute(
        `INSERT INTO evaluaciones_jefatura
         (evaluacion_id, ${CALIFICACIONES_JEFATURA.join(', ')})
         VALUES (?, ${CALIFICACIONES_JEFATURA.map(() => '?').join(', ')})`,
        [resultado.insertId, ...CALIFICACIONES_JEFATURA.map((campo) => especializada[campo])]
      );
    }

    await connection.commit();
    return res.status(201).json({ mensaje: 'Evaluación registrada.', id: resultado.insertId });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { obtenerEmpleados, listarEvaluaciones, obtenerEvaluacion, crearEvaluacion };
