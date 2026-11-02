const jwt = require('jsonwebtoken');
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

function permitirEvaluaciones(req, res, next) {
  if (
    req.usuario?.role !== 'ADMIN'
    || !CODIGOS_ADMINISTRADORES.includes(req.usuario?.codigo_empleado)
  ) {
    return res.status(403).json({ mensaje: 'No tienes permiso para acceder a las evaluaciones.' });
  }

  return next();
}

module.exports = { verificarToken, permitirRoles, permitirEvaluaciones };