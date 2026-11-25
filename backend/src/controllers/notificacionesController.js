const pool = require('../config/db');

function identidadUsuario(req) {
  if (req.usuario?.role === 'CANDIDATE') {
    const candidatoId = Number(req.usuario.candidato_acceso_id);
    return Number.isInteger(candidatoId) && candidatoId > 0
      ? { columna: 'candidato_acceso_id', id: candidatoId }
      : null;
  }

  const empleadoId = Number(req.usuario?.id);
  return Number.isInteger(empleadoId) && empleadoId > 0
    ? { columna: 'empleado_id', id: empleadoId }
    : null;
}

function validarVistas(vistas) {
  if (!Array.isArray(vistas) || vistas.length > 100) return null;

  const normalizadas = [];
  const ids = new Set();
  for (const vista of vistas) {
    if (
      !vista
      || typeof vista.id !== 'string'
      || vista.id.length < 1
      || vista.id.length > 120
      || typeof vista.marcador !== 'string'
      || vista.marcador.length > 4096
      || ids.has(vista.id)
    ) {
      return null;
    }
    ids.add(vista.id);
    normalizadas.push({ id: vista.id, marcador: vista.marcador });
  }
  return normalizadas;
}

async function obtenerVistas(req, res, next) {
  const identidad = identidadUsuario(req);
  if (!identidad) return res.status(401).json({ mensaje: 'La sesión no tiene un usuario válido.' });

  try {
    const [filas] = await pool.execute(
      `SELECT notificacion_id, marcador
       FROM notificaciones_leidas
       WHERE ${identidad.columna} = ?`,
      [identidad.id]
    );
    const vistas = Object.fromEntries(filas.map((fila) => [fila.notificacion_id, fila.marcador]));
    return res.json({ vistas });
  } catch (error) {
    return next(error);
  }
}

async function guardarVistas(req, res, next) {
  const identidad = identidadUsuario(req);
  if (!identidad) return res.status(401).json({ mensaje: 'La sesión no tiene un usuario válido.' });
  const vistas = validarVistas(req.body?.vistas);
  if (!vistas) {
    return res.status(400).json({ mensaje: 'Las notificaciones leídas no tienen un formato válido.' });
  }
  if (!vistas.length) return res.json({ guardadas: 0 });

  const filas = vistas.map(({ id, marcador }) => (
    [identidad.columna === 'empleado_id' ? identidad.id : null,
      identidad.columna === 'candidato_acceso_id' ? identidad.id : null, id, marcador]
  ));
  const valores = filas.flat();
  const placeholders = filas.map(() => '(?, ?, ?, ?)').join(', ');

  try {
    const [resultado] = await pool.execute(
      `INSERT INTO notificaciones_leidas
         (empleado_id, candidato_acceso_id, notificacion_id, marcador)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE marcador = VALUES(marcador), actualizado_en = CURRENT_TIMESTAMP`,
      valores
    );
    return res.json({ guardadas: Number(resultado.affectedRows) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { obtenerVistas, guardarVistas, identidadUsuario, validarVistas };
