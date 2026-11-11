const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { CODIGOS_ADMINISTRADORES } = require('../config/authorization');

async function login(req, res, next) {
  const { codigo_empleado: codigoEmpleado, password } = req.body || {};

  if (!codigoEmpleado || !password) {
    return res.status(400).json({ mensaje: 'Código de empleado y contraseña son requeridos.' });
  }

  try {
    const [empleados] = await pool.execute(
      `SELECT e.id, e.codigo_empleado, e.nombre, e.password_hash, e.rol_id,
              p.nombre_puesto, r.nombre AS nombre_rol
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       INNER JOIN roles r ON r.id = e.rol_id
       WHERE e.codigo_empleado = ? AND e.activo = 1
       LIMIT 1`,
      [codigoEmpleado]
    );

    const empleado = empleados[0];
    const passwordValido = empleado && await bcrypt.compare(password, empleado.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ mensaje: 'La autenticación no está configurada en el servidor.' });
    }

    const codigoAdministrador = CODIGOS_ADMINISTRADORES.includes(empleado.codigo_empleado);
    const perfil = {
      id: empleado.id,
      codigo_empleado: empleado.codigo_empleado,
      nombre: empleado.nombre,
      puesto: empleado.nombre_puesto,
      rol: empleado.nombre_rol,
      rol_id: empleado.rol_id,
      role: codigoAdministrador && empleado.nombre_rol === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE'
    };
    const token = jwt.sign(perfil, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.json({ token, usuario: perfil });
  } catch (error) {
    return next(error);
  }
}

async function loginCandidato(req, res, next) {
  const { usuario, password } = req.body || {};
  if (
    typeof usuario !== 'string'
    || !/^CANDIDATO-\d{4}-\d{3,}$/.test(usuario)
    || typeof password !== 'string'
    || password.length > 72
  ) {
    return res.status(400).json({ mensaje: 'Usuario de candidato y contraseña son requeridos.' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ mensaje: 'La autenticación no está configurada en el servidor.' });
  }

  try {
    const [cuentas] = await pool.execute(
      `SELECT id, usuario, password_hash
       FROM candidatos_seleccion_accesos
       WHERE usuario = ?
       LIMIT 1`,
      [usuario]
    );
    const cuenta = cuentas[0];
    if (!cuenta || !(await bcrypt.compare(password, cuenta.password_hash))) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    const perfil = {
      id: cuenta.id,
      candidato_acceso_id: cuenta.id,
      codigo_empleado: cuenta.usuario,
      nombre: cuenta.usuario,
      puesto: 'Candidato',
      rol: 'CANDIDATE',
      rol_id: 0,
      role: 'CANDIDATE',
    };
    const token = jwt.sign(perfil, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, usuario: perfil });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, loginCandidato };