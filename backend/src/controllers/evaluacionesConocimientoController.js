const pool = require('../config/db');
const { obtenerBanco } = require('../config/evaluacionesConocimiento');
const {
  FRECUENCIAS_EVALUACION,
  esPeriodoValido,
  periodoDeFecha,
  periodosSiguientes,
} = require('../utils/periodosEvaluacion');

function frecuenciaValida(valor) {
  return FRECUENCIAS_EVALUACION.includes(valor);
}

function periodoActualDeFrecuencia(frecuencia) {
  return periodoDeFecha(new Date(), frecuencia);
}

function catalogoPuesto(puesto) {
  const frecuencia = frecuenciaValida(puesto.frecuencia_evaluacion)
    ? puesto.frecuencia_evaluacion
    : 'mensual';
  const periodoActual = periodoDeFecha(new Date(), frecuencia);
  return {
    ...puesto,
    frecuencia_evaluacion: frecuencia,
    periodo_actual: periodoActual,
    periodos: [periodoActual, ...periodosSiguientes(periodoActual, frecuencia, 3)],
  };
}

function periodoDeSolicitud(req, puesto) {
  const valor = req.query.periodo;
  if (valor === undefined || valor === '') {
    return periodoActualDeFrecuencia(puesto.frecuencia_evaluacion || 'mensual');
  }
  return esPeriodoValido(valor) ? valor : null;
}

function leerJson(valor) {
  if (typeof valor === 'string') return JSON.parse(valor);
  return valor;
}

function puntajeMaximoPregunta(pregunta) {
  return Number(pregunta.puntaje_maximo ?? 1);
}

function puntosOpcionesPregunta(pregunta) {
  const maximo = puntajeMaximoPregunta(pregunta);
  return pregunta.opciones.map((opcion, indice) => {
    if (typeof opcion === 'string') {
      return indice === pregunta.correcta ? maximo : 0;
    }
    return Number(opcion.puntos);
  });
}

function preguntasPublicas(valor, respuestas, mostrarCorrectas) {
  const preguntas = leerJson(valor);
  return preguntas.map((pregunta) => {
    const puntajes = puntosOpcionesPregunta(pregunta);
    return {
      id: pregunta.id,
      texto: pregunta.texto,
      opciones: pregunta.opciones.map((opcion) => typeof opcion === 'string' ? opcion : opcion.texto),
      respuesta: respuestas?.[pregunta.id] ?? null,
      ...(mostrarCorrectas ? {
        correcta: puntajes.indexOf(puntajeMaximoPregunta(pregunta)),
        puntajes_opciones: puntajes,
        puntaje_maximo: puntajeMaximoPregunta(pregunta),
      } : {}),
    };
  });
}

function resumenEvaluacion(registro, incluirPreguntas = false) {
  const respuestas = registro.respuestas ? leerJson(registro.respuestas) : null;
  return {
    id: registro.id,
    empleado_id: registro.empleado_id,
    codigo_empleado: registro.codigo_empleado,
    empleado: registro.empleado,
    puesto_id: registro.puesto_id,
    nombre_puesto: registro.nombre_puesto,
    departamento: registro.departamento,
    frecuencia_evaluacion: registro.frecuencia_evaluacion,
    periodo: registro.periodo,
    periodo_actual: registro.periodo_actual,
    estado: registro.estado,
    total_preguntas: registro.total_preguntas,
    respuestas_correctas: registro.respuestas_correctas,
    puntos_obtenidos: registro.puntos_obtenidos === null || registro.puntos_obtenidos === undefined
      ? registro.respuestas_correctas
      : Number(registro.puntos_obtenidos),
    puntos_totales: registro.puntos_totales === null || registro.puntos_totales === undefined
      ? registro.total_preguntas
      : Number(registro.puntos_totales),
    porcentaje: registro.porcentaje,
    resultado: registro.resultado,
    fecha_realizacion: registro.fecha_realizacion,
    ...(incluirPreguntas ? {
      preguntas: preguntasPublicas(
        registro.preguntas,
        respuestas,
        registro.estado === 'completada',
      ),
    } : {}),
  };
}

async function obtenerEmpleado(connection, empleadoId) {
  const [empleados] = await connection.execute(
    `SELECT e.id, e.puesto_id, p.codigo_abreviatura, p.nombre_puesto, p.departamento,
            p.frecuencia_evaluacion
     FROM empleados e
     INNER JOIN puestos p ON p.id = e.puesto_id
     WHERE e.id = ? AND e.activo = 1
     LIMIT 1`,
    [empleadoId]
  );
  return empleados[0];
}

async function inicializarBanco(connection, puesto, periodo) {
  const [inicializados] = await connection.execute(
    'SELECT puesto_id FROM evaluaciones_banco_inicializado WHERE puesto_id = ? LIMIT 1',
    [puesto.id]
  );
  if (inicializados.length) return;

  const [existentes] = await connection.execute(
    'SELECT id FROM evaluaciones_banco_preguntas WHERE puesto_id = ? AND periodo = ? LIMIT 1',
    [puesto.id, periodo]
  );
  if (existentes.length) return;

  await connection.beginTransaction();
  try {
    const [marcador] = await connection.execute(
      'INSERT IGNORE INTO evaluaciones_banco_inicializado (puesto_id) VALUES (?)',
      [puesto.id]
    );
    if (marcador.affectedRows) {
      const bancoInicial = obtenerBanco(puesto.codigo_abreviatura) || [];
      for (let indice = 0; indice < bancoInicial.length; indice += 1) {
        const [texto, opciones, respuestaCorrecta] = bancoInicial[indice];
        await connection.execute(
          `INSERT INTO evaluaciones_banco_preguntas
           (puesto_id, periodo, texto, opciones, respuesta_correcta, orden)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [puesto.id, periodo, texto, JSON.stringify(opciones), respuestaCorrecta, indice + 1]
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function listarPreguntasBanco(connection, puestoId, periodo) {
  const [preguntas] = await connection.execute(
    `SELECT id, texto, opciones, respuesta_correcta, puntos_maximos
     FROM evaluaciones_banco_preguntas
     WHERE puesto_id = ? AND periodo = ?
     ORDER BY orden, id`,
    [puestoId, periodo]
  );
  return preguntas.map((pregunta) => {
    const maximo = Number(pregunta.puntos_maximos);
    const opcionesGuardadas = leerJson(pregunta.opciones);
    const opciones = opcionesGuardadas.map((opcion, indice) => {
      const texto = typeof opcion === 'string' ? opcion : opcion.texto;
      const puntos = typeof opcion === 'string'
        ? (indice === pregunta.respuesta_correcta ? maximo : 0)
        : Number(opcion.puntos);
      return {
        texto,
        puntos,
        tipo: puntos === maximo ? 'correcta' : puntos === 0 ? 'incorrecta' : 'intermedia',
        porcentaje: maximo ? Math.round((puntos / maximo) * 100) : 0,
      };
    });
    return { ...pregunta, puntos_maximos: maximo, opciones };
  });
}

function validarPregunta(cuerpo) {
  const { texto, opciones, puntos_maximos: maximo } = cuerpo || {};
  const puntajeMaximo = Number(maximo);
  if (
    typeof texto !== 'string'
    || !texto.trim()
    || texto.trim().length > 1000
    || !Number.isFinite(puntajeMaximo)
    || puntajeMaximo <= 0
    || puntajeMaximo > 9999.99
    || Math.abs(Math.round(puntajeMaximo * 100) - puntajeMaximo * 100) > 0.0000001
    || !Array.isArray(opciones)
    || opciones.length < 2
    || opciones.length > 10
    || opciones.some((opcion) => (
      !opcion
      || typeof opcion.texto !== 'string'
      || !opcion.texto.trim()
      || opcion.texto.trim().length > 300
      || !['correcta', 'intermedia', 'incorrecta'].includes(opcion.tipo)
      || (opcion.tipo === 'intermedia'
        && (!Number.isInteger(opcion.porcentaje) || opcion.porcentaje < 1 || opcion.porcentaje > 99))
    ))
    || opciones.filter((opcion) => opcion.tipo === 'correcta').length !== 1
  ) {
    return null;
  }
  const opcionesPuntuadas = opciones.map((opcion) => {
    const porcentaje = opcion.tipo === 'correcta' ? 100 : opcion.tipo === 'incorrecta' ? 0 : opcion.porcentaje;
    return {
      texto: opcion.texto.trim(),
      puntos: Math.round((puntajeMaximo * porcentaje) / 100 * 100) / 100,
    };
  });
  if (opciones.some((opcion, indice) => (
    opcion.tipo === 'intermedia'
    && (opcionesPuntuadas[indice].puntos <= 0 || opcionesPuntuadas[indice].puntos >= puntajeMaximo)
  ))) {
    return null;
  }
  const correcta = opciones.findIndex((opcion) => opcion.tipo === 'correcta');
  return {
    texto: texto.trim(),
    opciones: opcionesPuntuadas,
    correcta,
    puntosMaximos: puntajeMaximo,
  };
}

async function sincronizarPendientes(connection, puestoId, periodo) {
  const preguntas = await listarPreguntasBanco(connection, puestoId, periodo);
  const preguntasEvaluacion = preguntas.map((pregunta) => ({
    id: `q${pregunta.id}`,
    texto: pregunta.texto,
    opciones: pregunta.opciones.map(({ texto, puntos }) => ({ texto, puntos })),
    correcta: pregunta.respuesta_correcta,
    puntaje_maximo: pregunta.puntos_maximos,
  }));
  await connection.execute(
    `UPDATE evaluaciones_conocimiento
     SET preguntas = ?, total_preguntas = ?
     WHERE puesto_id = ? AND periodo = ? AND estado = 'pendiente'`,
    [JSON.stringify(preguntasEvaluacion), preguntasEvaluacion.length, puestoId, periodo]
  );
}

async function habilitarEvaluacion(connection, empleado, periodo) {
  await inicializarBanco(connection, empleado, periodo);
  const banco = await listarPreguntasBanco(connection, empleado.puesto_id, periodo);
  if (!banco.length) {
    const error = new Error(`No hay preguntas configuradas para el puesto ${empleado.codigo_abreviatura} en el periodo ${periodo}.`);
    error.status = 409;
    error.codigo = 'BANCO_PREGUNTAS_VACIO';
    throw error;
  }
  const preguntas = banco.map((pregunta) => ({
    id: `q${pregunta.id}`,
    texto: pregunta.texto,
    opciones: pregunta.opciones.map(({ texto, puntos }) => ({ texto, puntos })),
    correcta: pregunta.respuesta_correcta,
    puntaje_maximo: pregunta.puntos_maximos,
  }));
  await connection.execute(
    `INSERT IGNORE INTO evaluaciones_conocimiento
     (empleado_id, puesto_id, periodo, preguntas, total_preguntas)
     VALUES (?, ?, ?, ?, ?)`,
    [empleado.id, empleado.puesto_id, periodo, JSON.stringify(preguntas), preguntas.length]
  );
  const [evaluaciones] = await connection.execute(
    `SELECT id, empleado_id, puesto_id, periodo, preguntas, respuestas,
            total_preguntas, respuestas_correctas, puntos_obtenidos, puntos_totales,
            porcentaje, estado, resultado, fecha_realizacion
     FROM evaluaciones_conocimiento
     WHERE empleado_id = ? AND periodo = ?
     LIMIT 1`,
    [empleado.id, periodo]
  );
  return evaluaciones[0];
}

async function obtenerMiEvaluacion(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const empleado = await obtenerEmpleado(connection, Number(req.usuario.id));
    if (!empleado) return res.status(404).json({ mensaje: 'El empleado no existe o está inactivo.' });

    const periodoActual = periodoActualDeFrecuencia(empleado.frecuencia_evaluacion);
    const actual = await habilitarEvaluacion(connection, empleado, periodoActual);
    const [historial] = await connection.execute(
      `SELECT id, empleado_id, puesto_id, periodo, preguntas, respuestas,
              total_preguntas, respuestas_correctas, puntos_obtenidos, puntos_totales,
              porcentaje, estado, resultado, fecha_realizacion
       FROM evaluaciones_conocimiento
       WHERE empleado_id = ?
       ORDER BY periodo DESC`,
      [empleado.id]
    );
    const datosComunes = {
      empleado_id: empleado.id,
      frecuencia_evaluacion: empleado.frecuencia_evaluacion,
      periodo_actual: periodoActual,
    };
    return res.json({
      puesto: empleado.nombre_puesto,
      frecuencia_evaluacion: empleado.frecuencia_evaluacion,
      periodo_actual: periodoActual,
      evaluacion_actual: resumenEvaluacion({ ...actual, ...datosComunes }, true),
      historial: historial.map((evaluacion) => resumenEvaluacion({ ...evaluacion, ...datosComunes })),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function entregarEvaluacion(req, res, next) {
  const respuestas = req.body?.respuestas;
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) {
    return res.status(400).json({ mensaje: 'Debes responder todas las preguntas de la evaluación.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const empleado = await obtenerEmpleado(connection, Number(req.usuario.id));
    if (!empleado) {
      return res.status(404).json({ mensaje: 'El empleado no existe o está inactivo.' });
    }
    const periodoActual = periodoActualDeFrecuencia(empleado.frecuencia_evaluacion);
    await connection.beginTransaction();
    const [evaluaciones] = await connection.execute(
      `SELECT id, preguntas, estado
       FROM evaluaciones_conocimiento
       WHERE empleado_id = ? AND periodo = ?
       FOR UPDATE`,
      [empleado.id, periodoActual]
    );
    const evaluacion = evaluaciones[0];
    if (!evaluacion) {
      await connection.rollback();
      return res.status(404).json({ mensaje: `No hay una evaluación habilitada para el periodo ${periodoActual}.` });
    }
    if (evaluacion.estado === 'completada') {
      await connection.rollback();
      return res.status(409).json({ mensaje: `La evaluación del periodo ${periodoActual} ya fue enviada.` });
    }

    const preguntas = leerJson(evaluacion.preguntas);
    const ids = preguntas.map((pregunta) => pregunta.id);
    const claves = Object.keys(respuestas);
    const respuestasValidas = claves.length === ids.length
      && ids.every((id) => Number.isInteger(respuestas[id])
        && respuestas[id] >= 0
        && respuestas[id] < preguntas.find((pregunta) => pregunta.id === id).opciones.length);
    if (!respuestasValidas || claves.some((id) => !ids.includes(id))) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'Las respuestas están incompletas o contienen opciones inválidas.' });
    }

    const puntosTotales = preguntas.reduce(
      (total, pregunta) => total + Math.round(puntajeMaximoPregunta(pregunta) * 100),
      0
    ) / 100;
    const puntosObtenidos = preguntas.reduce((total, pregunta) => (
      total + Math.round(puntosOpcionesPregunta(pregunta)[respuestas[pregunta.id]] * 100)
    ), 0) / 100;
    if (puntosTotales <= 0) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'La evaluación no tiene un puntaje total válido.' });
    }
    const correctas = preguntas.reduce(
      (total, pregunta) => total + (
        puntosOpcionesPregunta(pregunta)[respuestas[pregunta.id]] === puntajeMaximoPregunta(pregunta) ? 1 : 0
      ),
      0
    );
    const porcentaje = Math.round((puntosObtenidos / puntosTotales) * 100);
    const resultado = porcentaje >= 70 ? 'Aprobado' : 'Requiere refuerzo';
    await connection.execute(
      `UPDATE evaluaciones_conocimiento
       SET respuestas = ?, respuestas_correctas = ?, porcentaje = ?,
           puntos_obtenidos = ?, puntos_totales = ?,
           resultado = ?, estado = 'completada', fecha_realizacion = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(respuestas), correctas, porcentaje, puntosObtenidos, puntosTotales, resultado, evaluacion.id]
    );
    await connection.commit();
    return res.json({
      mensaje: 'Evaluación enviada.',
      periodo: periodoActual,
      respuestas_correctas: correctas,
      puntos_obtenidos: puntosObtenidos,
      puntos_totales: puntosTotales,
      porcentaje,
      resultado,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function obtenerCatalogosAdmin(req, res, next) {
  try {
    const [empleados] = await pool.execute(
      `SELECT e.id, e.codigo_empleado, e.nombre, e.puesto_id,
              p.nombre_puesto, p.departamento, p.frecuencia_evaluacion
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       WHERE e.activo = 1
       ORDER BY e.nombre`
    );
    const [puestos] = await pool.execute(
      'SELECT id, nombre_puesto, departamento, frecuencia_evaluacion FROM puestos ORDER BY nombre_puesto'
    );
    const catalogoPuestos = puestos.map(catalogoPuesto);
    const departamentos = [...new Set(catalogoPuestos.map((puesto) => puesto.departamento))];
    return res.json({
      empleados: empleados.map(catalogoPuesto),
      puestos: catalogoPuestos,
      departamentos,
      frecuencias: FRECUENCIAS_EVALUACION.map((valor) => ({
        valor,
        etiqueta: { mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal' }[valor],
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerBancoAdmin(req, res, next) {
  if (!/^\d+$/.test(req.params.puestoId) || Number(req.params.puestoId) < 1) {
    return res.status(400).json({ mensaje: 'El identificador del puesto no es válido.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [puestos] = await connection.execute(
      'SELECT id, frecuencia_evaluacion FROM puestos WHERE id = ? LIMIT 1',
      [Number(req.params.puestoId)]
    );
    if (!puestos[0]) return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
    const periodo = periodoDeSolicitud(req, puestos[0]);
    if (!periodo) return res.status(400).json({ mensaje: 'El periodo de la evaluación no es válido.' });
    return res.json({
      periodo,
      preguntas: await listarPreguntasBanco(connection, puestos[0].id, periodo),
    });
  } catch (error) {
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function crearPreguntaAdmin(req, res, next) {
  const pregunta = validarPregunta(req.body);
  if (!pregunta) {
    return res.status(400).json({ mensaje: 'La pregunta, sus opciones o los puntajes configurados no son válidos.' });
  }
  if (!/^\d+$/.test(req.params.puestoId) || Number(req.params.puestoId) < 1) {
    return res.status(400).json({ mensaje: 'El identificador del puesto no es válido.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [puestos] = await connection.execute(
      'SELECT id, frecuencia_evaluacion FROM puestos WHERE id = ? LIMIT 1',
      [Number(req.params.puestoId)]
    );
    if (!puestos[0]) return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
    const periodo = periodoDeSolicitud(req, puestos[0]);
    if (!periodo) return res.status(400).json({ mensaje: 'El periodo de la evaluación no es válido.' });

    await connection.beginTransaction();
    const [preguntasExistentes] = await connection.execute(
      'SELECT id FROM evaluaciones_banco_preguntas WHERE puesto_id = ? AND periodo = ? FOR UPDATE',
      [puestos[0].id, periodo]
    );
    if (preguntasExistentes.length >= 255) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'El banco admite un máximo de 255 preguntas por puesto y periodo.' });
    }
    const [orden] = await connection.execute(
      `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente
       FROM evaluaciones_banco_preguntas
       WHERE puesto_id = ? AND periodo = ?`,
      [puestos[0].id, periodo]
    );
    await connection.execute(
      `INSERT INTO evaluaciones_banco_preguntas
       (puesto_id, periodo, texto, opciones, respuesta_correcta, puntos_maximos, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        puestos[0].id,
        periodo,
        pregunta.texto,
        JSON.stringify(pregunta.opciones),
        pregunta.correcta,
        pregunta.puntosMaximos,
        orden[0].siguiente,
      ]
    );
    await sincronizarPendientes(connection, puestos[0].id, periodo);
    await connection.commit();
    return res.status(201).json({ mensaje: 'Pregunta agregada.', periodo });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function editarPreguntaAdmin(req, res, next) {
  const pregunta = validarPregunta(req.body);
  if (!pregunta) {
    return res.status(400).json({ mensaje: 'La pregunta, sus opciones o los puntajes configurados no son válidos.' });
  }
  if (
    !/^\d+$/.test(req.params.puestoId)
    || Number(req.params.puestoId) < 1
    || !/^\d+$/.test(req.params.preguntaId)
    || Number(req.params.preguntaId) < 1
  ) {
    return res.status(400).json({ mensaje: 'El identificador del puesto o de la pregunta no es válido.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [puestos] = await connection.execute(
      'SELECT id, frecuencia_evaluacion FROM puestos WHERE id = ? LIMIT 1',
      [Number(req.params.puestoId)]
    );
    if (!puestos[0]) return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
    const periodo = periodoDeSolicitud(req, puestos[0]);
    if (!periodo) return res.status(400).json({ mensaje: 'El periodo de la evaluación no es válido.' });

    await connection.beginTransaction();
    const [resultado] = await connection.execute(
      `UPDATE evaluaciones_banco_preguntas
       SET texto = ?, opciones = ?, respuesta_correcta = ?, puntos_maximos = ?
       WHERE id = ? AND puesto_id = ? AND periodo = ?`,
      [
        pregunta.texto,
        JSON.stringify(pregunta.opciones),
        pregunta.correcta,
        pregunta.puntosMaximos,
        Number(req.params.preguntaId),
        puestos[0].id,
        periodo,
      ]
    );
    if (!resultado.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Pregunta no encontrada para este puesto y periodo.' });
    }
    await sincronizarPendientes(connection, puestos[0].id, periodo);
    await connection.commit();
    return res.json({ mensaje: 'Pregunta actualizada.', periodo });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function eliminarPreguntaAdmin(req, res, next) {
  if (
    !/^\d+$/.test(req.params.puestoId)
    || Number(req.params.puestoId) < 1
    || !/^\d+$/.test(req.params.preguntaId)
    || Number(req.params.preguntaId) < 1
  ) {
    return res.status(400).json({ mensaje: 'El identificador del puesto o de la pregunta no es válido.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [puestos] = await connection.execute(
      'SELECT id, frecuencia_evaluacion FROM puestos WHERE id = ? LIMIT 1',
      [Number(req.params.puestoId)]
    );
    if (!puestos[0]) return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
    const periodo = periodoDeSolicitud(req, puestos[0]);
    if (!periodo) return res.status(400).json({ mensaje: 'El periodo de la evaluación no es válido.' });

    await connection.beginTransaction();
    const [resultado] = await connection.execute(
      'DELETE FROM evaluaciones_banco_preguntas WHERE id = ? AND puesto_id = ? AND periodo = ?',
      [Number(req.params.preguntaId), puestos[0].id, periodo]
    );
    if (!resultado.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Pregunta no encontrada para este puesto y periodo.' });
    }
    await sincronizarPendientes(connection, puestos[0].id, periodo);
    await connection.commit();
    return res.json({ mensaje: 'Pregunta eliminada.', periodo });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function actualizarFrecuenciaPuestoAdmin(req, res, next) {
  if (!/^\d+$/.test(req.params.puestoId) || Number(req.params.puestoId) < 1) {
    return res.status(400).json({ mensaje: 'El identificador del puesto no es válido.' });
  }
  if (!frecuenciaValida(req.body?.frecuencia)) {
    return res.status(400).json({ mensaje: 'La frecuencia debe ser mensual, quincenal o semanal.' });
  }

  try {
    const [resultado] = await pool.execute(
      'UPDATE puestos SET frecuencia_evaluacion = ? WHERE id = ?',
      [req.body.frecuencia, Number(req.params.puestoId)]
    );
    if (!resultado.affectedRows) return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
    const [puestos] = await pool.execute(
      'SELECT id, nombre_puesto, departamento, frecuencia_evaluacion FROM puestos WHERE id = ? LIMIT 1',
      [Number(req.params.puestoId)]
    );
    return res.json({
      mensaje: 'Frecuencia actualizada. Las evaluaciones existentes conservan su periodo.',
      puesto: catalogoPuesto(puestos[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function listarEvaluacionesAdmin(req, res, next) {
  const { empleado_id: empleadoId, puesto_id: puestoId, departamento } = req.query;
  if (
    (empleadoId !== undefined && (!/^\d+$/.test(empleadoId) || Number(empleadoId) < 1))
    || (puestoId !== undefined && (!/^\d+$/.test(puestoId) || Number(puestoId) < 1))
    || (departamento !== undefined && (typeof departamento !== 'string' || departamento.length > 100))
  ) {
    return res.status(400).json({ mensaje: 'Los filtros de evaluación no son válidos.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [empleadosActivos] = await connection.execute(
      `SELECT e.id, e.puesto_id, p.codigo_abreviatura, p.nombre_puesto, p.departamento,
              p.frecuencia_evaluacion
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       WHERE e.activo = 1`
    );
    const periodosPorPuesto = new Map();
    for (const empleado of empleadosActivos) {
      if (!periodosPorPuesto.has(empleado.puesto_id)) {
        periodosPorPuesto.set(
          empleado.puesto_id,
          periodoActualDeFrecuencia(empleado.frecuencia_evaluacion),
        );
      }
      try {
        await habilitarEvaluacion(connection, empleado, periodosPorPuesto.get(empleado.puesto_id));
      } catch (error) {
        if (error.codigo !== 'BANCO_PREGUNTAS_VACIO') throw error;
      }
    }

    const condiciones = [];
    const parametros = [];
    if (empleadoId !== undefined) {
      condiciones.push('e.id = ?');
      parametros.push(Number(empleadoId));
    }
    if (puestoId !== undefined) {
      condiciones.push('p.id = ?');
      parametros.push(Number(puestoId));
    }
    if (departamento) {
      condiciones.push('p.departamento = ?');
      parametros.push(departamento);
    }
    const [evaluaciones] = await connection.execute(
      `SELECT ev.id, ev.empleado_id, e.codigo_empleado, e.nombre AS empleado,
              ev.puesto_id, p.nombre_puesto, p.departamento, p.frecuencia_evaluacion,
              ev.periodo, ev.estado, ev.total_preguntas, ev.respuestas_correctas,
              ev.puntos_obtenidos, ev.puntos_totales, ev.porcentaje,
              ev.resultado, ev.fecha_realizacion
       FROM evaluaciones_conocimiento ev
       INNER JOIN empleados e ON e.id = ev.empleado_id
       INNER JOIN puestos p ON p.id = ev.puesto_id
       ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
       ORDER BY ev.periodo DESC, e.nombre ASC`,
      parametros
    );
    return res.json({
      periodo_actual: periodosPorPuesto.values().next().value || null,
      periodos_por_puesto: Object.fromEntries(periodosPorPuesto),
      evaluaciones: evaluaciones.map((evaluacion) => resumenEvaluacion({
        ...evaluacion,
        periodo_actual: periodosPorPuesto.get(evaluacion.puesto_id) || null,
      })),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function obtenerDetalleAdmin(req, res, next) {
  if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1) {
    return res.status(400).json({ mensaje: 'El identificador de la evaluación no es válido.' });
  }
  try {
    const [evaluaciones] = await pool.execute(
      `SELECT ev.id, ev.empleado_id, e.codigo_empleado, e.nombre AS empleado,
              ev.puesto_id, p.nombre_puesto, p.departamento, p.frecuencia_evaluacion,
              ev.periodo, ev.preguntas, ev.respuestas, ev.estado, ev.total_preguntas,
              ev.respuestas_correctas, ev.puntos_obtenidos, ev.puntos_totales,
              ev.porcentaje, ev.resultado, ev.fecha_realizacion
       FROM evaluaciones_conocimiento ev
       INNER JOIN empleados e ON e.id = ev.empleado_id
       INNER JOIN puestos p ON p.id = ev.puesto_id
       WHERE ev.id = ?
       LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!evaluaciones[0]) return res.status(404).json({ mensaje: 'Evaluación no encontrada.' });
    return res.json({
      evaluacion: resumenEvaluacion({
        ...evaluaciones[0],
        periodo_actual: periodoActualDeFrecuencia(evaluaciones[0].frecuencia_evaluacion),
      }, true),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obtenerMiEvaluacion,
  entregarEvaluacion,
  obtenerCatalogosAdmin,
  obtenerBancoAdmin,
  crearPreguntaAdmin,
  editarPreguntaAdmin,
  eliminarPreguntaAdmin,
  actualizarFrecuenciaPuestoAdmin,
  listarEvaluacionesAdmin,
  obtenerDetalleAdmin,
};
