const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { CODIGOS_ADMINISTRADORES } = require('../config/authorization');

function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Token de autenticación requerido.' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const tienePermiso = rolesPermitidos.some((rol) => (
      typeof rol === 'number'
        ? Number(req.usuario?.rol_id) === rol
        : req.usuario?.role === rol
    ));

    if (!tienePermiso) {
      return res.status(403).json({ mensaje: 'No tienes permiso para realizar esta acción.' });
    }

    return next();
  };
}

async function verificarContrasenaAdmin(req, res, next) {
  const contrasena = req.body?.contrasena_admin;
  if (
    typeof contrasena !== 'string'
    || contrasena.length === 0
    || Buffer.byteLength(contrasena, 'utf8') > 72
  ) {
    return res.status(400).json({ mensaje: 'La contraseña del administrador es obligatoria para confirmar el cambio.' });
  }

  try {
    const [administradores] = await pool.execute(
      `SELECT e.password_hash
       FROM empleados e
       INNER JOIN roles r ON r.id = e.rol_id
       WHERE e.id = ? AND e.activo = 1 AND r.nombre = 'ADMIN'
       LIMIT 1`,
      [req.usuario?.id]
    );
    if (!administradores[0]) {
      return res.status(403).json({ mensaje: 'La cuenta administradora ya no está activa.' });
    }

    const esValida = await bcrypt.compare(contrasena, administradores[0].password_hash);
    if (!esValida) {
      return res.status(401).json({ mensaje: 'La contraseña del administrador es incorrecta.' });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function permitirEvaluaciones(req, res, next) {
  if (
    req.usuario?.role !== 'ADMIN'
    || !CODIGOS_ADMINISTRADORES.includes(req.usuario?.codigo_empleado)
  ) {
    return res.status(403).json({ mensaje: 'No tienes permiso para acceder a las evaluaciones.' });
  }

  return next();
}

function permitirCandidato(req, res, next) {
  if (
    req.usuario?.role !== 'CANDIDATE'
    || !Number.isInteger(Number(req.usuario?.candidato_id))
    || Number(req.usuario.candidato_id) < 1
  ) {
    return res.status(403).json({ mensaje: 'Este acceso está disponible únicamente para candidatos.' });
  }
  return next();
}

module.exports = {
  verificarToken,
  permitirRoles,
  verificarContrasenaAdmin,
  permitirEvaluaciones,
  permitirCandidato,
};