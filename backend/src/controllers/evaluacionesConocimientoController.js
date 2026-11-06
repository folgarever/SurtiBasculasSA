const pool = require('../config/db');
const { obtenerBanco } = require('../config/evaluacionesConocimiento');

function mesActual() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const anio = partes.find((parte) => parte.type === 'year')?.value;
  const mes = partes.find((parte) => parte.type === 'month')?.value;
  return `${anio}-${mes}`;
}

function leerJson(valor) {
  if (typeof valor === 'string') return JSON.parse(valor);
  return valor;
}

function preguntasPublicas(valor, respuestas, mostrarCorrectas) {
  const preguntas = leerJson(valor);
  return preguntas.map((pregunta) => ({
    id: pregunta.id,
    texto: pregunta.texto,
    opciones: pregunta.opciones,
    respuesta: respuestas?.[pregunta.id] ?? null,
    ...(mostrarCorrectas ? { correcta: pregunta.correcta } : {}),
  }));
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
    periodo: registro.periodo,
    estado: registro.estado,
    total_preguntas: registro.total_preguntas,
    respuestas_correctas: registro.respuestas_correctas,
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
    `SELECT e.id, e.puesto_id, p.codigo_abreviatura, p.nombre_puesto, p.departamento
     FROM empleados e
     INNER JOIN puestos p ON p.id = e.puesto_id
     WHERE e.id = ? AND e.activo = 1
     LIMIT 1`,
    [empleadoId]
  );
  return empleados[0];
}

async function habilitarEvaluacion(connection, empleado, periodo) {
  const banco = obtenerBanco(empleado.codigo_abreviatura);
  if (!banco) {
    const error = new Error(`No hay una evaluación configurada para el puesto ${empleado.codigo_abreviatura}.`);
    error.status = 409;
    throw error;
  }
  const preguntas = banco.map(([texto, opciones, correcta], indice) => ({
    id: `q${indice + 1}`,
    texto,
    opciones,
    correcta,
  }));
  await connection.execute(
    `INSERT IGNORE INTO evaluaciones_conocimiento
     (empleado_id, puesto_id, periodo, preguntas, total_preguntas)
     VALUES (?, ?, ?, ?, ?)`,
    [empleado.id, empleado.puesto_id, periodo, JSON.stringify(preguntas), preguntas.length]
  );
  const [evaluaciones] = await connection.execute(
    `SELECT id, empleado_id, puesto_id, periodo, preguntas, respuestas,
            total_preguntas, respuestas_correctas, porcentaje, estado, resultado, fecha_realizacion
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

    const actual = await habilitarEvaluacion(connection, empleado, mesActual());
    const [historial] = await connection.execute(
      `SELECT id, empleado_id, puesto_id, periodo, preguntas, respuestas,
              total_preguntas, respuestas_correctas, porcentaje, estado, resultado, fecha_realizacion
       FROM evaluaciones_conocimiento
       WHERE empleado_id = ?
       ORDER BY periodo DESC`,
      [empleado.id]
    );
    const actualConDatos = { ...actual, empleado_id: empleado.id };
    return res.json({
      puesto: empleado.nombre_puesto,
      periodo_actual: mesActual(),
      evaluacion_actual: resumenEvaluacion(actualConDatos, true),
      historial: historial.map((evaluacion) => resumenEvaluacion({ ...evaluacion, empleado_id: empleado.id })),
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
    await connection.beginTransaction();
    const [evaluaciones] = await connection.execute(
      `SELECT id, preguntas, estado
       FROM evaluaciones_conocimiento
       WHERE empleado_id = ? AND periodo = ?
       FOR UPDATE`,
      [Number(req.usuario.id), mesActual()]
    );
    const evaluacion = evaluaciones[0];
    if (!evaluacion) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'No hay una evaluación habilitada para este mes.' });
    }
    if (evaluacion.estado === 'completada') {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'La evaluación de este mes ya fue enviada.' });
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

    const correctas = preguntas.reduce(
      (total, pregunta) => total + (respuestas[pregunta.id] === pregunta.correcta ? 1 : 0),
      0
    );
    const porcentaje = Math.round((correctas / preguntas.length) * 100);
    const resultado = porcentaje >= 70 ? 'Aprobado' : 'Requiere refuerzo';
    await connection.execute(
      `UPDATE evaluaciones_conocimiento
       SET respuestas = ?, respuestas_correctas = ?, porcentaje = ?,
           resultado = ?, estado = 'completada', fecha_realizacion = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(respuestas), correctas, porcentaje, resultado, evaluacion.id]
    );
    await connection.commit();
    return res.json({ mensaje: 'Evaluación enviada.', respuestas_correctas: correctas, porcentaje, resultado });
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
              p.nombre_puesto, p.departamento
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       WHERE e.activo = 1
       ORDER BY e.nombre`
    );
    const [puestos] = await pool.execute(
      'SELECT id, nombre_puesto, departamento FROM puestos ORDER BY nombre_puesto'
    );
    const departamentos = [...new Set(puestos.map((puesto) => puesto.departamento))];
    return res.json({ empleados, puestos, departamentos });
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
      `SELECT e.id, e.puesto_id, p.codigo_abreviatura, p.nombre_puesto, p.departamento
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       WHERE e.activo = 1`
    );
    const periodoActual = mesActual();
    for (const empleado of empleadosActivos) {
      await habilitarEvaluacion(connection, empleado, periodoActual);
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
              ev.puesto_id, p.nombre_puesto, p.departamento, ev.periodo,
              ev.estado, ev.total_preguntas, ev.respuestas_correctas, ev.porcentaje,
              ev.resultado, ev.fecha_realizacion
       FROM evaluaciones_conocimiento ev
       INNER JOIN empleados e ON e.id = ev.empleado_id
       INNER JOIN puestos p ON p.id = ev.puesto_id
       ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
       ORDER BY ev.periodo DESC, e.nombre ASC`,
      parametros
    );
    return res.json({ periodo_actual: periodoActual, evaluaciones });
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
              ev.puesto_id, p.nombre_puesto, p.departamento, ev.periodo,
              ev.preguntas, ev.respuestas, ev.estado, ev.total_preguntas,
              ev.respuestas_correctas, ev.porcentaje, ev.resultado, ev.fecha_realizacion
       FROM evaluaciones_conocimiento ev
       INNER JOIN empleados e ON e.id = ev.empleado_id
       INNER JOIN puestos p ON p.id = ev.puesto_id
       WHERE ev.id = ?
       LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!evaluaciones[0]) return res.status(404).json({ mensaje: 'Evaluación no encontrada.' });
    return res.json({ evaluacion: resumenEvaluacion(evaluaciones[0], true) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obtenerMiEvaluacion,
  entregarEvaluacion,
  obtenerCatalogosAdmin,
  listarEvaluacionesAdmin,
  obtenerDetalleAdmin,
};
