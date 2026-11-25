const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const {
  CODIGO_GERENTE_GENERAL,
  CODIGO_ADMIN_RRHH,
  CODIGOS_ADMINISTRADORES
} = require('../config/authorization');

async function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Token de autenticación requerido.' });
  }

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }

  // El JWT sigue siendo la credencial, pero se refresca el perfil desde la BD
  // para que bajas, cambios de rol o cuentas eliminadas dejen de tener efecto de inmediato.
  try {
    if (claims.role === 'CANDIDATE') {
      const [cuentas] = await pool.execute(
        'SELECT id, activo, session_version FROM candidatos_seleccion_accesos WHERE id = ? LIMIT 1',
        [claims.candidato_acceso_id]
      );
      if (!cuentas[0] || cuentas[0].activo === 0) {
        return res.status(401).json({ mensaje: 'La cuenta de candidato ya no está disponible.' });
      }
      if (Number(cuentas[0].session_version || 0) !== Number(claims.session_version || 0)) {
        return res.status(401).json({ mensaje: 'La sesión terminó porque cambió la contraseña de la cuenta.' });
      }
      req.usuario = claims;
      return next();
    }

    if (claims.id) {
      const [empleados] = await pool.execute(
        `SELECT e.id, e.codigo_empleado, e.nombre, e.rol_id, e.session_version,
                p.nombre_puesto, p.es_admin, r.nombre AS nombre_rol
         FROM empleados e
         INNER JOIN puestos p ON p.id = e.puesto_id
         INNER JOIN roles r ON r.id = e.rol_id
         WHERE e.id = ? AND e.activo = 1
         LIMIT 1`,
        [claims.id]
      );
      const empleado = empleados[0];
      if (!empleado) {
        return res.status(401).json({ mensaje: 'La cuenta ya no está activa.' });
      }
      if (Number(empleado.session_version || 0) !== Number(claims.session_version || 0)) {
        return res.status(401).json({ mensaje: 'La sesión terminó porque cambió la contraseña de la cuenta.' });
      }

      const esAdministrador = empleado.nombre_rol === 'ADMIN'
        && (
          Number(empleado.es_admin) === 1
          || CODIGOS_ADMINISTRADORES.includes(empleado.codigo_empleado)
        );
      req.usuario = {
        ...claims,
        id: empleado.id,
        codigo_empleado: empleado.codigo_empleado,
        nombre: empleado.nombre,
        puesto: empleado.nombre_puesto,
        rol: empleado.nombre_rol,
        rol_id: empleado.rol_id,
        role: esAdministrador ? 'ADMIN' : 'EMPLOYEE',
      };
      return next();
    }

    req.usuario = claims;
    return next();
  } catch (error) {
    return next(error);
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

function permitirRrhhOGerente(req, res, next) {
  const codigo = req.usuario?.codigo_empleado;
  const esRrhh = Number(req.usuario?.rol_id) === 2 || codigo === CODIGO_ADMIN_RRHH;
  const esGerente = codigo === CODIGO_GERENTE_GENERAL;

  if (!esRrhh && !esGerente) {
    return res.status(403).json({
      mensaje: 'Solo Recursos Humanos y el Gerente General pueden aprobar horas extras.'
    });
  }

  return next();
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

function permitirGerenteGeneral(req, res, next) {
  if (
    req.usuario?.role !== 'ADMIN'
    || req.usuario?.codigo_empleado !== CODIGO_GERENTE_GENERAL
  ) {
    return res.status(403).json({ mensaje: 'Solo el Gerente General puede administrar los puestos.' });
  }

  return next();
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
    || !Number.isInteger(Number(req.usuario?.candidato_acceso_id))
    || Number(req.usuario.candidato_acceso_id) < 1
  ) {
    return res.status(403).json({ mensaje: 'Este acceso está disponible únicamente para candidatos.' });
  }
  return next();
}

module.exports = {
  verificarToken,
  permitirRoles,
  permitirRrhhOGerente,
  verificarContrasenaAdmin,
  permitirGerenteGeneral,
  permitirEvaluaciones,
  permitirCandidato,
};