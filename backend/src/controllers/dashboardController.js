const pool = require('../config/db');

function numero(valor) {
  return Number(valor || 0);
}

function fechaTexto(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 19).replace('T', ' ');
  return String(valor).slice(0, 19).replace('T', ' ');
}

async function obtenerResumenAdmin(req, res, next) {
  try {
    const [indicadores] = await pool.execute(`
      SELECT
        DATE_FORMAT(CURDATE(), '%Y-%m') AS periodo,
        CURDATE() AS fecha,
        (SELECT COUNT(*) FROM empleados WHERE activo = 1) AS empleados_activos,
        (SELECT COUNT(*) FROM empleados WHERE activo = 0) AS empleados_inactivos,
        (SELECT COUNT(*) FROM marcaciones WHERE fecha = CURDATE()) AS marcaciones_hoy,
        (SELECT COUNT(DISTINCT empleado_id) FROM marcaciones WHERE fecha = CURDATE()) AS empleados_presentes,
        (SELECT COUNT(*) FROM marcaciones WHERE fecha = CURDATE() AND estado_entrada = 'atraso') AS llegadas_tarde_hoy,
        (SELECT COUNT(*) FROM evaluaciones_conocimiento ev
          INNER JOIN puestos p ON p.id = ev.puesto_id
          CROSS JOIN (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')) AS fecha_local) f
          WHERE ev.estado = 'pendiente'
            AND ev.periodo = CASE p.frecuencia_evaluacion
              WHEN 'quincenal' THEN CONCAT(DATE_FORMAT(f.fecha_local, '%Y-%m'), '-Q', IF(DAY(f.fecha_local) <= 15, 1, 2))
              WHEN 'semanal' THEN DATE_FORMAT(f.fecha_local, '%x-W%v')
              ELSE DATE_FORMAT(f.fecha_local, '%Y-%m')
            END) AS evaluaciones_pendientes,
        (SELECT COUNT(*) FROM evaluaciones_conocimiento ev
          INNER JOIN puestos p ON p.id = ev.puesto_id
          CROSS JOIN (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')) AS fecha_local) f
          WHERE ev.estado = 'completada'
            AND ev.periodo = CASE p.frecuencia_evaluacion
              WHEN 'quincenal' THEN CONCAT(DATE_FORMAT(f.fecha_local, '%Y-%m'), '-Q', IF(DAY(f.fecha_local) <= 15, 1, 2))
              WHEN 'semanal' THEN DATE_FORMAT(f.fecha_local, '%x-W%v')
              ELSE DATE_FORMAT(f.fecha_local, '%Y-%m')
            END) AS evaluaciones_completadas,
        (SELECT COUNT(*) FROM evaluaciones
          WHERE fecha_evaluacion >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS evaluaciones_desempeno_mes,
        (SELECT COUNT(*) FROM sugerencias WHERE respondido_en IS NULL) AS sugerencias_pendientes,
        (SELECT COUNT(*) FROM sugerencias) AS sugerencias_totales,
        (SELECT COUNT(*) FROM candidatos_seleccion WHERE estado = 'registro') AS candidatos_registro,
        (SELECT COUNT(*) FROM candidatos_seleccion WHERE estado IN ('completada', 'evaluada')) AS candidatos_completados,
        (SELECT COUNT(*) FROM incidencias_permisos
          WHERE CURDATE() BETWEEN fecha_inicio AND fecha_fin) AS incidencias_vigentes
    `);

    const [asistencia] = await pool.execute(`
      SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
             COUNT(*) AS total,
             SUM(estado_entrada = 'atraso') AS atrasos
      FROM marcaciones
      WHERE fecha BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
      GROUP BY fecha
      ORDER BY fecha
    `);

    const [puestos] = await pool.execute(`
      SELECT p.nombre_puesto AS puesto, COUNT(*) AS total
      FROM empleados e
      INNER JOIN puestos p ON p.id = e.puesto_id
      WHERE e.activo = 1
      GROUP BY p.id, p.nombre_puesto
      ORDER BY total DESC, p.nombre_puesto ASC
      LIMIT 6
    `);

    const [actividad] = await pool.execute(`
      SELECT * FROM (
        SELECT 'sugerencia' AS tipo, s.id,
               CASE WHEN s.anonima = 1 THEN 'Anónimo' ELSE e.nombre END AS persona,
               s.titulo AS titulo,
               CASE WHEN s.respondido_en IS NULL THEN 'Pendiente' ELSE 'Respondida' END AS estado,
               s.creado_en AS fecha
        FROM sugerencias s
        INNER JOIN empleados e ON e.id = s.empleado_id
        UNION ALL
        SELECT 'evaluacion', ec.id, e.nombre, CONCAT('Evaluación ', ec.periodo),
               COALESCE(ec.resultado, 'Completada'), ec.fecha_realizacion
        FROM evaluaciones_conocimiento ec
        INNER JOIN empleados e ON e.id = ec.empleado_id
        WHERE ec.estado = 'completada'
        UNION ALL
        SELECT 'asistencia', m.id, e.nombre, 'Marcación registrada',
               CASE WHEN m.estado_entrada = 'atraso' THEN 'Atraso' ELSE 'Puntual' END,
               m.creado_en
        FROM marcaciones m
        INNER JOIN empleados e ON e.id = m.empleado_id
      ) AS actividad
      ORDER BY fecha DESC
      LIMIT 6
    `);

    const fila = indicadores[0] || {};
    const marcacionesHoy = numero(fila.marcaciones_hoy);
    const llegadasTarde = numero(fila.llegadas_tarde_hoy);

    return res.json({
      actualizado_en: new Date().toISOString(),
      periodo: fila.periodo ? String(fila.periodo) : null,
      fecha: fila.fecha ? fechaTexto(fila.fecha) : null,
      resumen: {
        empleados_activos: numero(fila.empleados_activos),
        empleados_inactivos: numero(fila.empleados_inactivos),
        marcaciones_hoy: marcacionesHoy,
        empleados_presentes: numero(fila.empleados_presentes),
        llegadas_tarde_hoy: llegadasTarde,
        puntualidad_hoy: marcacionesHoy
          ? Math.round(((marcacionesHoy - llegadasTarde) / marcacionesHoy) * 100)
          : 0,
        evaluaciones_pendientes: numero(fila.evaluaciones_pendientes),
        evaluaciones_completadas: numero(fila.evaluaciones_completadas),
        evaluaciones_desempeno_mes: numero(fila.evaluaciones_desempeno_mes),
        sugerencias_pendientes: numero(fila.sugerencias_pendientes),
        sugerencias_totales: numero(fila.sugerencias_totales),
        candidatos_registro: numero(fila.candidatos_registro),
        candidatos_completados: numero(fila.candidatos_completados),
        incidencias_vigentes: numero(fila.incidencias_vigentes),
      },
      asistencia_semanal: asistencia.map((dia) => ({
        fecha: fechaTexto(dia.fecha),
        total: numero(dia.total),
        atrasos: numero(dia.atrasos),
      })),
      distribucion_puestos: puestos.map((puesto) => ({
        puesto: puesto.puesto,
        total: numero(puesto.total),
      })),
      actividad_reciente: actividad.map((item) => ({
        tipo: item.tipo,
        id: numero(item.id),
        persona: item.persona,
        titulo: item.titulo,
        estado: item.estado,
        fecha: fechaTexto(item.fecha),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { obtenerResumenAdmin };
