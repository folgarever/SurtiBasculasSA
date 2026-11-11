const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { evaluacionAsistente, puestoCodigo } = require('../config/evaluacionesSeleccion');
const {
  obtenerEvaluacion,
  codigosPuestosConPrueba,
} = require('../config/evaluacionesSeleccionPuestos');

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

function codigosPuestosEvaluables() {
  return [puestoCodigo, ...codigosPuestosConPrueba()];
}

function mezclarOpciones(opciones) {
  const resultado = [...opciones];
  for (let indice = resultado.length - 1; indice > 0; indice -= 1) {
    const aleatorio = crypto.randomInt(indice + 1);
    [resultado[indice], resultado[aleatorio]] = [resultado[aleatorio], resultado[indice]];
  }
  return resultado;
}

function plantillaPublica(puesto, incluirRubrica = true, evaluacion = evaluacionAsistente) {
  return {
    ...puesto,
    evaluacion: {
      ...evaluacion,
      secciones: evaluacion.secciones.map(({ rubrica, ...seccion }) => ({
        ...seccion,
        items: seccion.items.map((item) => {
          if (incluirRubrica) return item;
          const { rubrica: rubricaItem, respuesta_correcta: respuestaCorrecta, ...itemPublico } = item;
          return {
            ...itemPublico,
            opciones: mezclarOpciones(item.opciones?.map(({ puntos, correcta, ...opcion }) => opcion) ?? []),
          };
        }),
      })),
    },
  };
}

function decidir(puntajes, evaluacion = evaluacionAsistente) {
  const total = Math.round(
    Object.values(puntajes).reduce((suma, puntaje) => suma + puntaje, 0) * 100
  ) / 100;
  const cumpleMinimos = puntajes.practica >= evaluacion.umbrales.minimo_practica
    && puntajes.conocimientos >= evaluacion.umbrales.minimo_conocimientos
    && puntajes.valores >= evaluacion.umbrales.minimo_valores;
  if (total < evaluacion.umbrales.revision_adicional || !cumpleMinimos) {
    return { total, decision: 'no_demostrada' };
  }
  if (total < evaluacion.umbrales.recomendable) {
    return { total, decision: 'revision_adicional' };
  }
  return { total, decision: 'recomendable' };
}

async function obtenerPlantillas(req, res, next) {
  try {
    const codigos = codigosPuestosEvaluables();
    const marcas = codigos.map(() => '?').join(', ');
    const [puestos] = await pool.execute(
      `SELECT id, codigo_abreviatura, nombre_puesto, departamento
       FROM puestos
       WHERE codigo_abreviatura IN (${marcas})
       ORDER BY nombre_puesto`,
      codigos
    );
    const plantillas = puestos.map((puesto) => plantillaPublica(
      puesto,
      true,
      puesto.codigo_abreviatura === puestoCodigo
        ? evaluacionAsistente
        : obtenerEvaluacion(puesto.codigo_abreviatura),
    ));
    return res.json({ plantillas });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPlantillasCandidato(req, res, next) {
  try {
    const [candidatos] = await pool.execute(
      `SELECT p.id, p.codigo_abreviatura, p.nombre_puesto, p.departamento
       FROM candidatos_seleccion c
       INNER JOIN puestos p ON p.id = c.puesto_id
       WHERE c.acceso_id = ? AND c.estado IN ('registro', 'completada', 'evaluada')
       LIMIT 1`,
      [Number(req.usuario.candidato_acceso_id)]
    );
    if (candidatos[0]) {
      const puesto = candidatos[0];
      const evaluacion = puesto.codigo_abreviatura === puestoCodigo
        ? evaluacionAsistente
        : obtenerEvaluacion(puesto.codigo_abreviatura);
      if (!evaluacion) return res.json({ plantillas: [] });
      return res.json({ plantillas: [plantillaPublica(puesto, false, evaluacion)] });
    }

    const codigos = codigosPuestosEvaluables();
    const [puestos] = await pool.execute(
      `SELECT id, codigo_abreviatura, nombre_puesto, departamento
       FROM puestos
       WHERE codigo_abreviatura IN (${codigos.map(() => '?').join(', ')})
       ORDER BY nombre_puesto`,
      codigos
    );
    return res.json({
      plantillas: puestos.map((puesto) => plantillaPublica(
        puesto,
        false,
        puesto.codigo_abreviatura === puestoCodigo
          ? evaluacionAsistente
          : obtenerEvaluacion(puesto.codigo_abreviatura),
      )),
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerMiRegistroCandidato(req, res, next) {
  try {
    const [candidatos] = await pool.execute(
      `SELECT c.id, c.nombres, c.apellidos, c.fecha_nacimiento, c.puesto_id,
              p.nombre_puesto, c.respuestas, c.estado, c.creado_en, c.completada_en,
              c.curriculum_nombre, a.usuario,
              ultimo.numero_intento, ultimo.puntaje_total, ultimo.respuestas_correctas,
              ultimo.total_preguntas, ultimo.porcentaje_correctas, ultimo.decision
       FROM candidatos_seleccion c
       LEFT JOIN puestos p ON p.id = c.puesto_id
       INNER JOIN candidatos_seleccion_accesos a ON a.id = c.acceso_id
       LEFT JOIN candidatos_seleccion_intentos ultimo
         ON ultimo.candidato_id = c.id
        AND ultimo.numero_intento = (
          SELECT MAX(i.numero_intento) FROM candidatos_seleccion_intentos i
          WHERE i.candidato_id = c.id
        )
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
  const puestoId = req.body?.puesto_id;
  if (!Number.isInteger(Number(puestoId)) || Number(puestoId) < 1) {
    return res.status(400).json({ mensaje: 'Selecciona un puesto válido para la cuenta del candidato.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [puestos] = await connection.execute(
      `SELECT id FROM puestos
       WHERE id = ? AND codigo_abreviatura IN (${codigosPuestosEvaluables().map(() => '?').join(', ')})
       LIMIT 1`,
      [Number(puestoId), ...codigosPuestosEvaluables()]
    );
    if (!puestos[0]) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'No hay una prueba de selección configurada para el puesto elegido.' });
    }
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
    const [acceso] = await connection.execute(
      `INSERT INTO candidatos_seleccion_accesos (usuario, password_hash, anio, secuencia)
       VALUES (?, ?, ?, ?)`,
      [usuario, passwordHash, anio, secuencia]
    );
    await connection.execute(
      `INSERT INTO candidatos_seleccion (acceso_id, sesion_id, puesto_id)
       VALUES (?, ?, ?)`,
      [acceso.insertId, crypto.randomUUID(), Number(puestoId)]
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
      `SELECT id, codigo_abreviatura FROM puestos
       WHERE id = ? AND codigo_abreviatura IN (${codigosPuestosEvaluables().map(() => '?').join(', ')})
       LIMIT 1`,
      [Number(puestoId), ...codigosPuestosEvaluables()]
    );
    if (!puestos[0]) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'No hay una prueba de selección configurada para el puesto elegido.' });
    }
    const [registros] = await connection.execute(
      `SELECT id, puesto_id, nombres FROM candidatos_seleccion
       WHERE acceso_id = ? LIMIT 1 FOR UPDATE`,
      [Number(req.usuario.candidato_acceso_id)]
    );
    const registroExistente = registros[0];
    if (registroExistente?.nombres) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'El perfil de esta cuenta ya fue registrado.' });
    }
    if (registroExistente?.puesto_id && Number(registroExistente.puesto_id) !== Number(puestoId)) {
      await connection.rollback();
      return res.status(403).json({ mensaje: 'El puesto de esta cuenta fue asignado por Administración y no puede modificarse.' });
    }
    let candidatoId;
    if (registroExistente) {
      await connection.execute(
        `UPDATE candidatos_seleccion
         SET nombres = ?, apellidos = ?, fecha_nacimiento = ?, puesto_id = ?,
             curriculum_nombre = 'curriculum.pdf', curriculum_contenido = ?
         WHERE id = ? AND nombres IS NULL`,
        [
          nombres.trim(),
          apellidos.trim(),
          fechaNacimiento,
          Number(puestoId),
          req.file.buffer,
          registroExistente.id,
        ]
      );
      candidatoId = registroExistente.id;
    } else {
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
      candidatoId = registro.insertId;
    }
    await connection.commit();
    return res.status(201).json({
      candidato: {
        id: candidatoId,
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
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [perfiles] = await connection.execute(
      `SELECT c.id, c.nombres, c.apellidos, c.fecha_nacimiento, c.curriculum_nombre,
              c.puesto_id, c.estado, c.reintento_autorizado_por,
              p.codigo_abreviatura
       FROM candidatos_seleccion c
       INNER JOIN puestos p ON p.id = c.puesto_id
       WHERE c.acceso_id = ? AND c.estado = 'registro'
       LIMIT 1 FOR UPDATE`,
      [Number(req.usuario.candidato_acceso_id)]
    );
    const perfil = perfiles[0];
    if (!perfil) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'No hay una prueba pendiente para esta cuenta.' });
    }
    if (!perfil.nombres || !perfil.apellidos || !perfil.fecha_nacimiento || !perfil.curriculum_nombre) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'Completa tu perfil y adjunta tu currículum antes de iniciar la evaluación.' });
    }
    const evaluacion = perfil.codigo_abreviatura === puestoCodigo
      ? evaluacionAsistente
      : obtenerEvaluacion(perfil.codigo_abreviatura);
    if (!evaluacion) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'No hay una prueba de selección configurada para este puesto.' });
    }

    const ids = evaluacion.secciones.flatMap((seccion) => (
    seccion.items.map((item, indice) => `${seccion.id}-${indice}`)
    ));
    const claves = Object.keys(respuestas);
    const opcionesValidas = new Map(
      evaluacion.secciones.flatMap((seccion) => seccion.items.map((item, indice) => [
      `${seccion.id}-${indice}`,
      item.opciones?.map((opcion) => opcion.id) ?? [],
      ]))
    );
    if (
      claves.length !== ids.length
      || ids.some((id) => typeof respuestas[id] !== 'string' || !opcionesValidas.get(id)?.includes(respuestas[id]))
      || claves.some((id) => !ids.includes(id))
    ) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'Selecciona una opción válida para cada pregunta antes de entregar.' });
    }

    const [intentosPrevios] = await connection.execute(
      `SELECT numero_intento FROM candidatos_seleccion_intentos
       WHERE candidato_id = ? ORDER BY numero_intento DESC LIMIT 1`,
      [perfil.id]
    );
    if (intentosPrevios.length && !perfil.reintento_autorizado_por) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'La evaluación ya fue realizada. Solo Administración puede autorizar un nuevo intento.' });
    }

    const puntajes = puntajesAutomaticos(respuestas, evaluacion);
    const { total, decision } = decidir(puntajes, evaluacion);
    const respuestasCorrectas = contarRespuestasCorrectas(respuestas, evaluacion);
    const totalPreguntas = ids.length;
    const porcentajeCorrectas = Math.round((respuestasCorrectas / totalPreguntas) * 10000) / 100;
    const numeroIntento = (intentosPrevios[0]?.numero_intento ?? 0) + 1;
    await connection.execute(
      `INSERT INTO candidatos_seleccion_intentos
       (candidato_id, numero_intento, puesto_id, fecha_evaluacion, respuestas,
        puntaje_aptitudes, puntaje_conocimientos, puntaje_practica, puntaje_valores,
        puntaje_total, respuestas_correctas, total_preguntas, porcentaje_correctas,
       decision, reintento_autorizado_por, reintento_motivo)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        perfil.id,
        numeroIntento,
        perfil.puesto_id,
        JSON.stringify(respuestas),
        puntajes.aptitudes,
        puntajes.conocimientos,
        puntajes.practica,
        puntajes.valores,
        total,
        respuestasCorrectas,
        totalPreguntas,
        porcentajeCorrectas,
        decision,
        perfil.reintento_autorizado_por,
        perfil.reintento_motivo,
      ]
    );
    const [resultado] = await connection.execute(
      `UPDATE candidatos_seleccion
       SET respuestas = ?, estado = 'completada', completada_en = CURRENT_TIMESTAMP,
           reintento_autorizado_por = NULL, reintento_motivo = NULL
       WHERE id = ? AND estado = 'registro'`,
      [JSON.stringify(respuestas), Number(perfil.id)]
    );
    if (!resultado.affectedRows) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'Esta prueba ya fue entregada y no puede modificarse.' });
    }
    await connection.commit();
    return res.json({
      mensaje: 'Evaluación entregada y calificada automáticamente.',
      resultado: {
        numero_intento: numeroIntento,
        puntajes,
        puntaje_total: total,
        respuestas_correctas: respuestasCorrectas,
        total_preguntas: totalPreguntas,
        porcentaje_correctas: porcentajeCorrectas,
        decision,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

function puntajesAutomaticos(respuestas, evaluacion = evaluacionAsistente) {
  const puntajes = { aptitudes: 0, conocimientos: 0, practica: 0, valores: 0 };
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) return puntajes;
  for (const seccion of evaluacion.secciones) {
    for (const [indice, item] of seccion.items.entries()) {
      const opcion = item.opciones?.find((alternativa) => alternativa.id === respuestas[`${seccion.id}-${indice}`]);
      if (opcion) puntajes[seccion.id] += opcion.puntos;
    }
  }
  return puntajes;
}

function contarRespuestasCorrectas(respuestas, evaluacion) {
  return evaluacion.secciones.reduce((total, seccion) => (
    total + seccion.items.reduce((cuenta, item, indice) => {
      const elegida = item.opciones.find((opcion) => opcion.id === respuestas[`${seccion.id}-${indice}`]);
      return cuenta + (elegida?.correcta ? 1 : 0);
    }, 0)
  ), 0);
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
       WHERE (c.id IS NULL OR c.estado = 'registro')
          ${filtro}
       ORDER BY COALESCE(c.completada_en, a.creado_en) DESC`,
      parametros
    );
    return res.json({
      candidatos: candidatos.map((candidato) => ({
        ...candidato,
        estado: candidato.id === null || !candidato.nombres ? 'pendiente_perfil' : candidato.estado,
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
    const [resultadosManuales] = await pool.execute(
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
    const parametrosIntentos = puestoId === undefined ? [] : [Number(puestoId)];
    const filtroIntentos = puestoId === undefined ? '' : 'WHERE i.puesto_id = ?';
    const [intentos] = await pool.execute(
      `SELECT i.id, i.numero_intento, i.candidato_id, i.puesto_id,
              p.nombre_puesto, i.fecha_evaluacion, i.puntaje_aptitudes,
              i.puntaje_conocimientos, i.puntaje_practica, i.puntaje_valores,
              i.puntaje_total, i.respuestas_correctas, i.total_preguntas,
              i.porcentaje_correctas, i.decision, i.creado_en, i.reintento_motivo,
              c.nombres, c.apellidos, c.fecha_nacimiento,
              c.estado AS estado_candidato,
              TIMESTAMPDIFF(YEAR, c.fecha_nacimiento, CURDATE()) AS edad,
              a.usuario, i.reintento_autorizado_por
       FROM candidatos_seleccion_intentos i
       INNER JOIN candidatos_seleccion c ON c.id = i.candidato_id
       INNER JOIN candidatos_seleccion_accesos a ON a.id = c.acceso_id
       INNER JOIN puestos p ON p.id = i.puesto_id
       ${filtroIntentos}
       ORDER BY i.fecha_evaluacion DESC, i.id DESC
       LIMIT 250`,
      parametrosIntentos
    );
    const resultados = [
      ...resultadosManuales.map((resultado) => ({
        ...resultado,
        origen: 'manual_anterior',
        numero_intento: null,
        respuestas_correctas: null,
        total_preguntas: null,
        porcentaje_correctas: null,
        puntaje_aptitudes: Number(resultado.puntaje_aptitudes),
        puntaje_conocimientos: Number(resultado.puntaje_conocimientos),
        puntaje_practica: Number(resultado.puntaje_practica),
        puntaje_valores: Number(resultado.puntaje_valores),
        puntaje_total: Number(resultado.puntaje_total),
        discrepancia_pendiente: Boolean(resultado.discrepancia_pendiente),
        riesgo_control_pendiente: Boolean(resultado.riesgo_control_pendiente),
      })),
      ...intentos.map((intento) => ({
        ...intento,
        candidato: `${intento.nombres} ${intento.apellidos}`.trim(),
        evaluador: 'Calificación automática',
        origen: 'automatica',
        estado_candidato: intento.estado_candidato,
        observaciones: null,
        discrepancia_pendiente: false,
        riesgo_control_pendiente: false,
        puntaje_aptitudes: Number(intento.puntaje_aptitudes),
        puntaje_conocimientos: Number(intento.puntaje_conocimientos),
        puntaje_practica: Number(intento.puntaje_practica),
        puntaje_valores: Number(intento.puntaje_valores),
        puntaje_total: Number(intento.puntaje_total),
        porcentaje_correctas: Number(intento.porcentaje_correctas),
      })),
    ].sort((a, b) => new Date(b.fecha_evaluacion).getTime() - new Date(a.fecha_evaluacion).getTime())
      .slice(0, 250);
    return res.json({
      resultados,
    });
  } catch (error) {
    return next(error);
  }
}

async function autorizarReintentoCandidato(req, res, next) {
  const candidatoId = req.params.id;
  const motivo = req.body?.motivo;
  if (
    !/^\d+$/.test(candidatoId)
    || Number(candidatoId) < 1
    || typeof motivo !== 'string'
    || !motivo.trim()
    || motivo.trim().length > 500
  ) {
    return res.status(400).json({ mensaje: 'Indica un motivo válido de hasta 500 caracteres para autorizar el reintento.' });
  }
  try {
    const [resultado] = await pool.execute(
      `UPDATE candidatos_seleccion AS c
       SET estado = 'registro', respuestas = NULL, completada_en = NULL,
           reintento_autorizado_por = ?, reintento_motivo = ?
       WHERE c.id = ? AND c.estado IN ('completada', 'evaluada')
         AND EXISTS (
           SELECT 1 FROM candidatos_seleccion_intentos i WHERE i.candidato_id = c.id
         )`,
      [Number(req.usuario.id), motivo.trim(), Number(candidatoId)]
    );
    if (!resultado.affectedRows) {
      return res.status(409).json({ mensaje: 'El candidato no tiene una evaluación completada susceptible de reintento.' });
    }
    return res.json({ mensaje: 'Reintento autorizado. El historial anterior se conserva.' });
  } catch (error) {
    return next(error);
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
  autorizarReintentoCandidato,
};
