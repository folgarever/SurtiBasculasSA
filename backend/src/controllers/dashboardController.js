const pool = require('../config/db');

function numero(valor) {
  return Number(valor || 0);
}

function fechaTexto(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 19).replace('T', ' ');
  return String(valor).slice(0, 19).replace('T', ' ');
}

function serie7Dias(filas, campo = 'total') {
  const porFecha = new Map(
    filas.map((fila) => [String(fila.fecha).slice(0, 10), numero(fila[campo])])
  );

  return Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    fecha.setDate(fecha.getDate() - (6 - indice));
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    return porFecha.get(clave) ?? 0;
  });
}

function desplazarMes(periodo, desplazamiento) {
  const [anio, mes] = periodo.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 + desplazamiento, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

function mesActualGuatemala(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(fecha);
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}`;
}

function serie12Meses(filas, mesActual = mesActualGuatemala()) {
  const valores = new Map(filas.map((fila) => [
    `${fila.clave}:${String(fila.periodo).slice(0, 7)}`,
    numero(fila.total),
  ]));
  const primerMes = desplazarMes(mesActual, -11);
  return Array.from({ length: 12 }, (_, indice) => {
    const periodo = desplazarMes(primerMes, indice);
    const valor = (clave) => valores.get(`${clave}:${periodo}`) ?? 0;
    return {
      periodo,
      asistencias: valor('asistencias'),
      horas_extras_aprobadas: valor('horas_extras'),
      evaluaciones_completadas: valor('evaluaciones'),
      candidatos_nuevos: valor('candidatos'),
    };
  });
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

    const [comparativo] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM marcaciones WHERE fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY)) AS marcaciones_ayer,
        (SELECT COUNT(*) FROM marcaciones WHERE fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND estado_entrada = 'atraso') AS atrasos_ayer,
        (SELECT COUNT(*) FROM sugerencias
          WHERE creado_en >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
            AND creado_en < DATE_SUB(CURDATE(), INTERVAL 6 DAY)) AS sugerencias_anterior,
        (SELECT COUNT(*) FROM sugerencias
          WHERE creado_en >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)) AS sugerencias_actual,
        (SELECT COUNT(*) FROM evaluaciones_conocimiento
          WHERE estado = 'completada'
            AND fecha_realizacion >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
            AND fecha_realizacion < DATE_SUB(CURDATE(), INTERVAL 6 DAY)) AS evaluaciones_anterior,
        (SELECT COUNT(*) FROM evaluaciones_conocimiento
          WHERE estado = 'completada'
            AND fecha_realizacion >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)) AS evaluaciones_actual
    `);

    const [tendencias] = await pool.execute(`
      SELECT 'sugerencias' AS clave, DATE_FORMAT(creado_en, '%Y-%m-%d') AS fecha, COUNT(*) AS total
      FROM sugerencias
      WHERE creado_en >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE_FORMAT(creado_en, '%Y-%m-%d')
      UNION ALL
      SELECT 'evaluaciones' AS clave, DATE_FORMAT(fecha_realizacion, '%Y-%m-%d') AS fecha, COUNT(*) AS total
      FROM evaluaciones_conocimiento
      WHERE estado = 'completada' AND fecha_realizacion >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE_FORMAT(fecha_realizacion, '%Y-%m-%d')
      ORDER BY clave, fecha
    `);

    const mesActual = mesActualGuatemala();
    const fechaInicioTendencia = `${desplazarMes(mesActual, -11)}-01`;
    const [tendenciasMensuales] = await pool.execute(`
      SELECT 'asistencias' AS clave, DATE_FORMAT(fecha, '%Y-%m') AS periodo, COUNT(*) AS total
      FROM marcaciones
      WHERE fecha >= ? AND fecha < DATE_ADD(?, INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      UNION ALL
      SELECT 'horas_extras' AS clave, DATE_FORMAT(fecha, '%Y-%m') AS periodo, SUM(horas_extras) AS total
      FROM marcaciones
      WHERE extras_estado = 'aprobada'
        AND fecha >= ? AND fecha < DATE_ADD(?, INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      UNION ALL
      SELECT 'evaluaciones' AS clave, DATE_FORMAT(fecha_realizacion, '%Y-%m') AS periodo, COUNT(*) AS total
      FROM evaluaciones_conocimiento
      WHERE estado = 'completada'
        AND fecha_realizacion >= ? AND fecha_realizacion < DATE_ADD(?, INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fecha_realizacion, '%Y-%m')
      UNION ALL
      SELECT 'candidatos' AS clave, DATE_FORMAT(creado_en, '%Y-%m') AS periodo, COUNT(*) AS total
      FROM candidatos_seleccion_accesos
      WHERE creado_en >= ? AND creado_en < DATE_ADD(?, INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(creado_en, '%Y-%m')
      ORDER BY clave, periodo
    `, [
      fechaInicioTendencia, fechaInicioTendencia,
      fechaInicioTendencia, fechaInicioTendencia,
      fechaInicioTendencia, fechaInicioTendencia,
      fechaInicioTendencia, fechaInicioTendencia,
    ]);

    const fila = indicadores[0] || {};
    const marcacionesHoy = numero(fila.marcaciones_hoy);
    const llegadasTarde = numero(fila.llegadas_tarde_hoy);
    const comparativoFila = comparativo[0] || {};
    const asistenciaSerie = serie7Dias(asistencia, 'total');
    const atrasosSerie = serie7Dias(asistencia, 'atrasos');
    const puntualidadSerie = asistenciaSerie.map((total, indice) => (
      total ? Math.round(((total - atrasosSerie[indice]) / total) * 100) : 0
    ));

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
      comparativo: {
        marcaciones_ayer: numero(comparativoFila.marcaciones_ayer),
        atrasos_ayer: numero(comparativoFila.atrasos_ayer),
        puntualidad_ayer: numero(comparativoFila.marcaciones_ayer)
          ? Math.round(((numero(comparativoFila.marcaciones_ayer) - numero(comparativoFila.atrasos_ayer)) / numero(comparativoFila.marcaciones_ayer)) * 100)
          : 0,
        sugerencias_actual: numero(comparativoFila.sugerencias_actual),
        sugerencias_anterior: numero(comparativoFila.sugerencias_anterior),
        evaluaciones_actual: numero(comparativoFila.evaluaciones_actual),
        evaluaciones_anterior: numero(comparativoFila.evaluaciones_anterior),
      },
      tendencias: {
        asistencia: asistenciaSerie,
        puntualidad: puntualidadSerie,
        sugerencias: serie7Dias(tendencias.filter((fila) => fila.clave === 'sugerencias')),
        evaluaciones: serie7Dias(tendencias.filter((fila) => fila.clave === 'evaluaciones')),
      },
      tendencias_mensuales: serie12Meses(tendenciasMensuales, mesActual),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { obtenerResumenAdmin, serie12Meses, desplazarMes, mesActualGuatemala };
