const pool = require('../config/db');

const LONGITUD_MAXIMA_TITULO = 150;
const LONGITUD_MAXIMA_TEXTO = 5000;

function identificadorValido(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validarTexto(value, minimo, maximo) {
  return typeof value === 'string'
    && value.trim().length >= minimo
    && value.trim().length <= maximo;
}

async function obtenerMisSugerencias(req, res, next) {
  try {
    const [sugerencias] = await pool.execute(
      `SELECT s.id, s.titulo, s.descripcion, s.creado_en,
              s.respuesta, s.respondido_en, admin.nombre AS respondido_por
       FROM sugerencias s
       LEFT JOIN empleados admin ON admin.id = s.respondido_por
       WHERE s.empleado_id = ?
       ORDER BY s.creado_en DESC, s.id DESC`,
      [req.usuario.id]
    );
    return res.json({ sugerencias });
  } catch (error) {
    return next(error);
  }
}

async function crearSugerencia(req, res, next) {
  const { titulo, descripcion } = req.body || {};
  if (
    !validarTexto(titulo, 3, LONGITUD_MAXIMA_TITULO)
    || !validarTexto(descripcion, 10, LONGITUD_MAXIMA_TEXTO)
  ) {
    return res.status(400).json({
      mensaje: `El título debe tener entre 3 y ${LONGITUD_MAXIMA_TITULO} caracteres y la descripción entre 10 y ${LONGITUD_MAXIMA_TEXTO} caracteres.`
    });
  }

  try {
    const [resultado] = await pool.execute(
      'INSERT INTO sugerencias (empleado_id, titulo, descripcion) VALUES (?, ?, ?)',
      [req.usuario.id, titulo.trim(), descripcion.trim()]
    );
    return res.status(201).json({
      mensaje: 'Tu sugerencia fue enviada.',
      sugerencia: { id: resultado.insertId }
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerTodasLasSugerencias(req, res, next) {
  try {
    const [sugerencias] = await pool.execute(
      `SELECT s.id, s.titulo, s.descripcion, s.creado_en,
              s.respuesta, s.respondido_en, admin.nombre AS respondido_por,
              e.id AS empleado_id, e.nombre AS empleado, e.codigo_empleado
       FROM sugerencias s
       INNER JOIN empleados e ON e.id = s.empleado_id
       LEFT JOIN empleados admin ON admin.id = s.respondido_por
       ORDER BY (s.respuesta IS NOT NULL) ASC, s.creado_en DESC, s.id DESC`
    );
    return res.json({ sugerencias });
  } catch (error) {
    return next(error);
  }
}

async function responderSugerencia(req, res, next) {
  const sugerenciaId = req.params.id;
  const { respuesta } = req.body || {};
  if (!identificadorValido(sugerenciaId)) {
    return res.status(400).json({ mensaje: 'El identificador de la sugerencia no es válido.' });
  }
  if (!validarTexto(respuesta, 1, LONGITUD_MAXIMA_TEXTO)) {
    return res.status(400).json({
      mensaje: `La respuesta es obligatoria y no debe exceder ${LONGITUD_MAXIMA_TEXTO} caracteres.`
    });
  }

  try {
    const [resultado] = await pool.execute(
      `UPDATE sugerencias
       SET respuesta = ?, respondido_por = ?, respondido_en = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [respuesta.trim(), req.usuario.id, Number(sugerenciaId)]
    );
    if (resultado.affectedRows === 0) {
      const [sugerencias] = await pool.execute(
        'SELECT id FROM sugerencias WHERE id = ? LIMIT 1',
        [Number(sugerenciaId)]
      );
      if (!sugerencias[0]) {
        return res.status(404).json({ mensaje: 'No se encontró la sugerencia.' });
      }
    }
    return res.json({ mensaje: 'La respuesta fue guardada.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obtenerMisSugerencias,
  crearSugerencia,
  obtenerTodasLasSugerencias,
  responderSugerencia
};
