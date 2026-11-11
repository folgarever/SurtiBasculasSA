const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
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

function plantillaPublica(puesto, incluirRubrica = true) {
  return {
    ...puesto,
    evaluacion: {
      titulo: evaluacionAsistente.titulo,
      tiempo_total_minutos: evaluacionAsistente.tiempo_total_minutos,
      puntaje_total: evaluacionAsistente.puntaje_total,
      secciones: evaluacionAsistente.secciones.map(({ rubrica, ...seccion }) => ({
        ...seccion,
        items: seccion.items.map((item) => {
          if (incluirRubrica) return item;
          const { rubrica: rubricaItem, respuesta_correcta: respuestaCorrecta, ...itemPublico } = item;
          return {
            ...itemPublico,
            opciones: item.opciones?.map(({ puntos, ...opcion }) => opcion) ?? [],
          };
        }),
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
    return res.json({ plantillas: puestos.map((puesto) => plantillaPublica(puesto, false)) });
  } catch (error) {
    return next(error);
  }
}

async function obtenerMiRegistroCandidato(req, res, next) {
  try {
    const [candidatos] = await pool.execute(
      `SELECT c.id, c.nombres, c.apellidos, c.fecha_nacimiento, c.puesto_id,
              p.nombre_puesto, c.respuestas, c.estado, c.creado_en, c.completada_en,
              c.curriculum_nombre
       FROM candidatos_seleccion c
       LEFT JOIN puestos p ON p.id = c.puesto_id
       WHERE c.acceso_id = ?
       LIMIT 1`,
      [Number(req.usuario.candidato_acceso_id)]
    );
    if (!candidatos[0]) return res.json({ candidato: null });
    const candidato = candidatos[0];
    return res.json({
      candidato: {
        ...candidato,
        fecha_nacimiento: candidato.fecha_nacimiento
          ? String(candidato.fecha_nacimiento).slice(0, 10)
          : null,
        respuestas: candidato.respuestas
          ? (typeof candidato.respuestas === 'string' ? JSON.parse(candidato.respuestas) : candidato.respuestas)
          : null,
        edad: candidato.fecha_nacimiento ? calcularEdad(candidato.fecha_nacimiento) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function registrarCandidatoAdmin(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const anio = new Date().getFullYear();
    await connection.execute(
      `INSERT INTO candidatos_seleccion_secuencias (anio, ultimo_numero)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE ultimo_numero = ultimo_numero + 1`,
      [anio]
    );
    const [secuencias] = await connection.execute(
      'SELECT ultimo_numero FROM candidatos_seleccion_secuencias WHERE anio = ? FOR UPDATE',
      [anio]
    );
    const secuencia = Number(secuencias[0].ultimo_numero);
    const usuario = `CANDIDATO-${anio}-${String(secuencia).padStart(3, '0')}`;
    const password = crypto.randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute(
      `INSERT INTO candidatos_seleccion_accesos (usuario, password_hash, anio, secuencia)
       VALUES (?, ?, ?, ?)`,
      [usuario, passwordHash, anio, secuencia]
    );
    await connection.commit();
    return res.status(201).json({
      cuenta: { usuario, password },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function registrarPerfilCandidato(req, res, next) {
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
  if (
    !req.file
    || req.file.mimetype !== 'application/pdf'
    || !req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))
  ) {
    return res.status(400).json({ mensaje: 'Adjunta tu currículum en formato PDF (máximo 5 MB).' });
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
      return res.status(400).json({ mensaje: 'No hay una prueba de selección configurada para el puesto elegido.' });
    }
    const [registro] = await connection.execute(
      `INSERT INTO candidatos_seleccion
       (acceso_id, sesion_id, nombres, apellidos, fecha_nacimiento, puesto_id,
        curriculum_nombre, curriculum_contenido)
       VALUES (?, ?, ?, ?, ?, ?, 'curriculum.pdf', ?)`,
      [
        Number(req.usuario.candidato_acceso_id),
        crypto.randomUUID(),
        nombres.trim(),
        apellidos.trim(),
        fechaNacimiento,
        Number(puestoId),
        req.file.buffer,
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
        curriculum_nombre: 'curriculum.pdf',
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'El perfil de esta cuenta ya fue registrado.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function descargarCurriculumCandidato(req, res, next) {
  if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1) {
    return res.status(400).json({ mensaje: 'El candidato seleccionado no es válido.' });
  }
  try {
    const [candidatos] = await pool.execute(
      `SELECT curriculum_contenido
       FROM candidatos_seleccion
       WHERE id = ? AND curriculum_contenido IS NOT NULL
       LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!candidatos[0]) return res.status(404).json({ mensaje: 'No hay currículum disponible para este candidato.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="curriculum-${Number(req.params.id)}.pdf"`);
    return res.send(candidatos[0].curriculum_contenido);
  } catch (error) {
    return next(error);
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
  const opcionesValidas = new Map(
    evaluacionAsistente.secciones.flatMap((seccion) => seccion.items.map((item, indice) => [
      `${seccion.id}-${indice}`,
      item.opciones?.map((opcion) => opcion.id) ?? [],
    ]))
  );
  if (
    claves.length !== ids.length
    || ids.some((id) => typeof respuestas[id] !== 'string' || !opcionesValidas.get(id)?.includes(respuestas[id]))
    || claves.some((id) => !ids.includes(id))
  ) {
    return res.status(400).json({ mensaje: 'Selecciona una opción válida para cada pregunta antes de entregar.' });
  }

  try {
    const [perfiles] = await pool.execute(
      `SELECT id, puesto_id FROM candidatos_seleccion
       WHERE acceso_id = ? AND estado = 'registro'
       LIMIT 1`,
      [Number(req.usuario.candidato_acceso_id)]
    );
    if (!perfiles[0]) {
      return res.status(409).json({ mensaje: 'Completa primero tu perfil antes de iniciar la prueba.' });
    }
    const [resultado] = await pool.execute(
      `UPDATE candidatos_seleccion
       SET respuestas = ?, estado = 'completada', completada_en = CURRENT_TIMESTAMP
       WHERE id = ? AND estado = 'registro'`,
      [JSON.stringify(respuestas), Number(perfiles[0].id)]
    );
    if (!resultado.affectedRows) {
      return res.status(409).json({ mensaje: 'Esta prueba ya fue entregada y no puede modificarse.' });
    }
    return res.json({ mensaje: 'Prueba entregada correctamente. El equipo de selección revisará tus respuestas.' });
  } catch (error) {
    return next(error);
  }
}

function puntajesAutomaticos(respuestas) {
  const puntajes = { aptitudes: 0, conocimientos: 0, practica: 0, valores: 0 };
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) return puntajes;
  for (const seccion of evaluacionAsistente.secciones) {
    for (const [indice, item] of seccion.items.entries()) {
      const opcion = item.opciones?.find((alternativa) => alternativa.id === respuestas[`${seccion.id}-${indice}`]);
      if (opcion) puntajes[seccion.id] += opcion.puntos;
    }
  }
  return puntajes;
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
      filtro = 'AND (c.puesto_id = ? OR c.id IS NULL)';
      parametros.push(Number(puestoId));
    }
    const [candidatos] = await pool.execute(
      `SELECT c.id, a.id AS acceso_id, a.usuario, c.nombres, c.apellidos,
              c.fecha_nacimiento, c.puesto_id, p.nombre_puesto, c.respuestas,
              c.estado, c.curriculum_nombre, a.creado_en,
              c.completada_en,
              TIMESTAMPDIFF(YEAR, c.fecha_nacimiento, CURDATE()) AS edad
       FROM candidatos_seleccion_accesos a
       LEFT JOIN candidatos_seleccion c ON c.acceso_id = a.id
       LEFT JOIN puestos p ON p.id = c.puesto_id
       WHERE (c.id IS NULL OR c.estado IN ('registro', 'completada'))
         ${filtro}
         AND (c.id IS NULL OR NOT EXISTS (
           SELECT 1 FROM evaluaciones_seleccion es WHERE es.candidato_id = c.id
         ))
       ORDER BY COALESCE(c.completada_en, a.creado_en) DESC`,
      parametros
    );
    return res.json({
      candidatos: candidatos.map((candidato) => ({
        ...candidato,
        estado: candidato.id === null ? 'pendiente_perfil' : candidato.estado,
        fecha_nacimiento: candidato.fecha_nacimiento
          ? String(candidato.fecha_nacimiento).slice(0, 10)
          : null,
        respuestas: candidato.estado === 'completada'
          ? (typeof candidato.respuestas === 'string' ? JSON.parse(candidato.respuestas) : candidato.respuestas)
          : null,
        puntajes_automaticos: candidato.estado === 'completada'
          ? puntajesAutomaticos(
            typeof candidato.respuestas === 'string' ? JSON.parse(candidato.respuestas) : candidato.respuestas
          )
          : null,
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
  registrarCandidatoAdmin,
  registrarPerfilCandidato,
  descargarCurriculumCandidato,
  entregarPruebaCandidato,
  listarCandidatosPendientes,
  listarResultados,
  registrarResultado,
};
