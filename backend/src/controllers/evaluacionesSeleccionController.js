const pool = require('../config/db');
const { evaluacionAsistente, puestoCodigo } = require('../config/evaluacionesSeleccion');

const puntajesMaximos = {
  aptitudes: 10,
  conocimientos: 20,
  practica: 55,
  valores: 15,
};

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const fechaParseada = Date.parse(`${fecha}T00:00:00.000Z`);
  return Number.isFinite(fechaParseada)
    && new Date(fechaParseada).toISOString().slice(0, 10) === fecha;
}

function calcularEdad(fechaNacimiento) {
  const [anio, mes, dia] = String(fechaNacimiento).slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad -= 1;
  return edad;
}

function nombreCompleto(candidato) {
  return `${candidato.nombres} ${candidato.apellidos}`.trim();
}

function plantillaPublica(puesto) {
  return {
    ...puesto,
    evaluacion: {
      titulo: evaluacionAsistente.titulo,
      tiempo_total_minutos: evaluacionAsistente.tiempo_total_minutos,
      puntaje_total: evaluacionAsistente.puntaje_total,
      secciones: evaluacionAsistente.secciones.map(({ rubrica, ...seccion }) => ({
        ...seccion,
        items: seccion.items.map(({ rubrica: rubricaItem, ...item }) => item),
      })),
    },
  };
}

function decidir(puntajes, discrepanciaPendiente, riesgoControlPendiente) {
  const total = Math.round(
    Object.values(puntajes).reduce((suma, puntaje) => suma + puntaje, 0) * 100
  ) / 100;
  const cumpleMinimos = puntajes.practica >= evaluacionAsistente.umbrales.minimo_practica
    && puntajes.conocimientos >= evaluacionAsistente.umbrales.minimo_conocimientos
    && puntajes.valores >= evaluacionAsistente.umbrales.minimo_valores;
  if (riesgoControlPendiente || total < evaluacionAsistente.umbrales.revision_adicional || !cumpleMinimos) {
    return { total, decision: 'no_demostrada' };
  }
  if (total < evaluacionAsistente.umbrales.recomendable || discrepanciaPendiente) {
    return { total, decision: 'revision_adicional' };
  }
  return { total, decision: 'recomendable' };
}

async function obtenerPlantillas(req, res, next) {
  try {
    const [puestos] = await pool.execute(
      `SELECT id, codigo_abreviatura, nombre_puesto, departamento
       FROM puestos
       WHERE codigo_abreviatura = ?
       LIMIT 1`,
      [puestoCodigo]
    );
    return res.json({ plantillas: puestos.map(plantillaPublica) });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPlantillasCandidato(req, res, next) {
  try {
    const [puestos] = await pool.execute(
      `SELECT id, codigo_abreviatura, nombre_puesto, departamento
       FROM puestos
       WHERE codigo_abreviatura = ?
       LIMIT 1`,
      [puestoCodigo]
    );
    return res.json({ plantillas: puestos.map(plantillaPublica) });
  } catch (error) {
    return next(error);
  }
}

async function obtenerMiRegistroCandidato(req, res, next) {
  try {
    const [candidatos] = await pool.execute(
      `SELECT c.id, c.nombres, c.apellidos, c.fecha_nacimiento, c.puesto_id,
              p.nombre_puesto, c.respuestas, c.estado, c.creado_en, c.completada_en
       FROM candidatos_seleccion c
       INNER JOIN puestos p ON p.id = c.puesto_id
       WHERE c.sesion_id = ?
       LIMIT 1`,
      [req.usuario.sesion_seleccion_id]
    );
    if (!candidatos[0]) return res.json({ candidato: null });
    const candidato = candidatos[0];
    return res.json({
      candidato: {
        ...candidato,
        fecha_nacimiento: String(candidato.fecha_nacimiento).slice(0, 10),
        respuestas: candidato.respuestas
          ? (typeof candidato.respuestas === 'string' ? JSON.parse(candidato.respuestas) : candidato.respuestas)
          : null,
        edad: calcularEdad(candidato.fecha_nacimiento),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function registrarCandidato(req, res, next) {
  const { nombres, apellidos, fecha_nacimiento: fechaNacimiento, puesto_id: puestoId } = req.body || {};
  const hoy = new Date();
  const fechaActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (
    typeof nombres !== 'string'
    || !nombres.trim()
    || nombres.trim().length > 100
    || typeof apellidos !== 'string'
    || !apellidos.trim()
    || apellidos.trim().length > 120
    || !fechaValida(fechaNacimiento)
    || fechaNacimiento > fechaActual
    || !Number.isInteger(Number(puestoId))
    || Number(puestoId) < 1
  ) {
    return res.status(400).json({ mensaje: 'Completa nombres, apellidos, fecha de nacimiento y puesto con datos válidos.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existentes] = await connection.execute(
      'SELECT id FROM candidatos_seleccion WHERE sesion_id = ? LIMIT 1',
      [req.usuario.sesion_seleccion_id]
    );
    if (existentes.length) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'Ya existe un registro para esta sesión de candidato.' });
    }
    const [puestos] = await connection.execute(
      'SELECT id FROM puestos WHERE id = ? AND codigo_abreviatura = ? LIMIT 1',
      [Number(puestoId), puestoCodigo]
    );
    if (!puestos[0]) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'No hay una prueba de selección configurada para el puesto elegido.' });
    }
    const [registro] = await connection.execute(
      `INSERT INTO candidatos_seleccion
       (sesion_id, nombres, apellidos, fecha_nacimiento, puesto_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.usuario.sesion_seleccion_id,
        nombres.trim(),
        apellidos.trim(),
        fechaNacimiento,
        Number(puestoId),
      ]
    );
    await connection.commit();
    return res.status(201).json({
      candidato: {
        id: registro.insertId,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        fecha_nacimiento: fechaNacimiento,
        edad: calcularEdad(fechaNacimiento),
        puesto_id: Number(puestoId),
        estado: 'registro',
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un registro para esta sesión de candidato.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function entregarPruebaCandidato(req, res, next) {
  const respuestas = req.body?.respuestas;
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) {
    return res.status(400).json({ mensaje: 'Debes completar las respuestas de la prueba.' });
  }
  const ids = evaluacionAsistente.secciones.flatMap((seccion) => (
    seccion.items.map((item, indice) => `${seccion.id}-${indice}`)
  ));
  const claves = Object.keys(respuestas);
  if (
    claves.length !== ids.length
    || ids.some((id) => typeof respuestas[id] !== 'string' || !respuestas[id].trim() || respuestas[id].length > 2500)
    || claves.some((id) => !ids.includes(id))
  ) {
    return res.status(400).json({ mensaje: 'Completa todas las respuestas. Cada campo permite hasta 2,500 caracteres.' });
  }

  try {
    const [resultado] = await pool.execute(
      `UPDATE candidatos_seleccion
       SET respuestas = ?, estado = 'completada', completada_en = CURRENT_TIMESTAMP
       WHERE sesion_id = ? AND estado = 'registro'`,
      [JSON.stringify(respuestas), req.usuario.sesion_seleccion_id]
    );
    if (!resultado.affectedRows) {
      const [candidatos] = await pool.execute(
        'SELECT id FROM candidatos_seleccion WHERE sesion_id = ? LIMIT 1',
        [req.usuario.sesion_seleccion_id]
      );
      if (!candidatos[0]) return res.status(409).json({ mensaje: 'Primero completa el registro del candidato.' });
      return res.status(409).json({ mensaje: 'Esta prueba ya fue entregada y no puede modificarse.' });
    }
    return res.json({ mensaje: 'Prueba entregada correctamente. El equipo de selección revisará tus respuestas.' });
  } catch (error) {
    return next(error);
  }
}

async function listarCandidatosPendientes(req, res, next) {
  const puestoId = req.query.puesto_id;
  if (puestoId !== undefined && (!/^\d+$/.test(puestoId) || Number(puestoId) < 1)) {
    return res.status(400).json({ mensaje: 'El puesto seleccionado no es válido.' });
  }
  try {
    const parametros = [];
    let filtro = '';
    if (puestoId !== undefined) {
      filtro = 'AND c.puesto_id = ?';
      parametros.push(Number(puestoId));
    }
    const [candidatos] = await pool.execute(
      `SELECT c.id, c.nombres, c.apellidos, c.fecha_nacimiento, c.puesto_id,
              p.nombre_puesto, c.respuestas, c.creado_en, c.completada_en,
              TIMESTAMPDIFF(YEAR, c.fecha_nacimiento, CURDATE()) AS edad
       FROM candidatos_seleccion c
       INNER JOIN puestos p ON p.id = c.puesto_id
       WHERE c.estado = 'completada' ${filtro}
         AND NOT EXISTS (
           SELECT 1 FROM evaluaciones_seleccion es WHERE es.candidato_id = c.id
         )
       ORDER BY c.completada_en ASC`,
      parametros
    );
    return res.json({
      candidatos: candidatos.map((candidato) => ({
        ...candidato,
        fecha_nacimiento: String(candidato.fecha_nacimiento).slice(0, 10),
        respuestas: typeof candidato.respuestas === 'string'
          ? JSON.parse(candidato.respuestas)
          : candidato.respuestas,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function listarResultados(req, res, next) {
  const puestoId = req.query.puesto_id;
  if (puestoId !== undefined && (!/^\d+$/.test(puestoId) || Number(puestoId) < 1)) {
    return res.status(400).json({ mensaje: 'El puesto seleccionado no es válido.' });
  }
  try {
    const parametros = [];
    let filtro = '';
    if (puestoId !== undefined) {
      filtro = 'WHERE es.puesto_id = ?';
      parametros.push(Number(puestoId));
    }
    const [resultados] = await pool.execute(
      `SELECT es.id, es.candidato, es.candidato_id, es.puesto_id, p.nombre_puesto, es.fecha_evaluacion,
              es.puntaje_aptitudes, es.puntaje_conocimientos, es.puntaje_practica,
              es.puntaje_valores, es.puntaje_total, es.discrepancia_pendiente,
              es.riesgo_control_pendiente, es.decision, es.observaciones,
              es.evaluador_id, e.nombre AS evaluador, es.creado_en,
              c.fecha_nacimiento,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE TIMESTAMPDIFF(YEAR, c.fecha_nacimiento, CURDATE()) END AS edad
       FROM evaluaciones_seleccion es
       INNER JOIN puestos p ON p.id = es.puesto_id
       INNER JOIN empleados e ON e.id = es.evaluador_id
       LEFT JOIN candidatos_seleccion c ON c.id = es.candidato_id
       ${filtro}
       ORDER BY es.fecha_evaluacion DESC, es.id DESC
       LIMIT 250`,
      parametros
    );
    return res.json({
      resultados: resultados.map((resultado) => ({
        ...resultado,
        puntaje_aptitudes: Number(resultado.puntaje_aptitudes),
        puntaje_conocimientos: Number(resultado.puntaje_conocimientos),
        puntaje_practica: Number(resultado.puntaje_practica),
        puntaje_valores: Number(resultado.puntaje_valores),
        puntaje_total: Number(resultado.puntaje_total),
        discrepancia_pendiente: Boolean(resultado.discrepancia_pendiente),
        riesgo_control_pendiente: Boolean(resultado.riesgo_control_pendiente),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function registrarResultado(req, res, next) {
  const {
    candidato,
    candidato_id: candidatoId,
    puesto_id: puestoId,
    fecha_evaluacion: fecha,
    puntajes,
    observaciones,
  } = req.body || {};
  const discrepanciaPendiente = req.body?.discrepancia_pendiente;
  const riesgoControlPendiente = req.body?.riesgo_control_pendiente;
  if (
    (candidatoId === undefined && (typeof candidato !== 'string' || !candidato.trim() || candidato.trim().length > 120))
    || (candidatoId !== undefined && (!Number.isInteger(Number(candidatoId)) || Number(candidatoId) < 1))
    || !Number.isInteger(Number(puestoId))
    || Number(puestoId) < 1
    || !fechaValida(fecha)
    || !puntajes
    || typeof puntajes !== 'object'
    || Array.isArray(puntajes)
    || typeof discrepanciaPendiente !== 'boolean'
    || typeof riesgoControlPendiente !== 'boolean'
    || (observaciones !== undefined && (typeof observaciones !== 'string' || observaciones.length > 4000))
  ) {
    return res.status(400).json({ mensaje: 'Los datos del resultado están incompletos o no son válidos.' });
  }

  const puntajesNormalizados = {};
  for (const [seccion, maximo] of Object.entries(puntajesMaximos)) {
    const puntaje = puntajes[seccion];
    if (
      typeof puntaje !== 'number'
      || !Number.isFinite(puntaje)
      || puntaje < 0
      || puntaje > maximo
      || Math.abs(Math.round(puntaje * 100) - puntaje * 100) > 0.0000001
    ) {
      return res.status(400).json({ mensaje: `El puntaje de ${seccion} debe estar entre 0 y ${maximo}.` });
    }
    puntajesNormalizados[seccion] = puntaje;
  }
  if (Object.keys(puntajes).length !== Object.keys(puntajesMaximos).length) {
    return res.status(400).json({ mensaje: 'Debes registrar el puntaje de cada sección.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [puestos] = await connection.execute(
      'SELECT id FROM puestos WHERE id = ? AND codigo_abreviatura = ? LIMIT 1',
      [Number(puestoId), puestoCodigo]
    );
    if (!puestos[0]) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'No hay una prueba de selección configurada para ese puesto.' });
    }

    let nombreCandidatoEvaluado = typeof candidato === 'string' ? candidato.trim() : '';
    let registroCandidato = null;
    if (candidatoId !== undefined) {
      const [candidatos] = await connection.execute(
        `SELECT id, nombres, apellidos, puesto_id, estado
         FROM candidatos_seleccion
         WHERE id = ? AND estado = 'completada'
           AND NOT EXISTS (
             SELECT 1 FROM evaluaciones_seleccion es WHERE es.candidato_id = candidatos_seleccion.id
           )
           LIMIT 1
           FOR UPDATE`,
        [Number(candidatoId)]
      );
      registroCandidato = candidatos[0];
      if (!registroCandidato || Number(registroCandidato.puesto_id) !== Number(puestoId)) {
        await connection.rollback();
        return res.status(400).json({ mensaje: 'El candidato no tiene una prueba entregada para el puesto seleccionado.' });
      }
      nombreCandidatoEvaluado = nombreCompleto(registroCandidato);
    }

    const { total, decision } = decidir(
      puntajesNormalizados,
      discrepanciaPendiente,
      riesgoControlPendiente
    );
    const [resultado] = await connection.execute(
      `INSERT INTO evaluaciones_seleccion
       (candidato, candidato_id, puesto_id, fecha_evaluacion, puntaje_aptitudes, puntaje_conocimientos,
        puntaje_practica, puntaje_valores, puntaje_total, discrepancia_pendiente,
        riesgo_control_pendiente, decision, observaciones, evaluador_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombreCandidatoEvaluado,
        candidatoId === undefined ? null : Number(candidatoId),
        Number(puestoId),
        fecha,
        puntajesNormalizados.aptitudes,
        puntajesNormalizados.conocimientos,
        puntajesNormalizados.practica,
        puntajesNormalizados.valores,
        total,
        discrepanciaPendiente ? 1 : 0,
        riesgoControlPendiente ? 1 : 0,
        decision,
        observaciones?.trim() || null,
        Number(req.usuario.id),
      ]
    );
    if (registroCandidato) {
      await connection.execute(
        "UPDATE candidatos_seleccion SET estado = 'evaluada' WHERE id = ? AND estado = 'completada'",
        [registroCandidato.id]
      );
    }
    await connection.commit();
    return res.status(201).json({
      mensaje: 'Resultado de selección registrado.',
      resultado: { id: resultado.insertId, puntaje_total: total, decision },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Este candidato ya cuenta con un resultado de selección.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  obtenerPlantillas,
  obtenerPlantillasCandidato,
  obtenerMiRegistroCandidato,
  registrarCandidato,
  entregarPruebaCandidato,
  listarCandidatosPendientes,
  listarResultados,
  registrarResultado,
};
