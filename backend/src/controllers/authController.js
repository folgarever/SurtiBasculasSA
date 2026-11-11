const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

const USUARIO_CANDIDATOS = 'CANDITATO-2026';

async function loginCandidato(req, res, next) {
  const { usuario, password } = req.body || {};
  if (typeof usuario !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ mensaje: 'Usuario y código de acceso son requeridos.' });
  }
  if (usuario !== USUARIO_CANDIDATOS || password.length > 100) {
    return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ mensaje: 'La autenticación no está configurada en el servidor.' });
  }

  try {
    const codigoHash = crypto.createHash('sha256').update(password).digest('hex');
    const [candidatos] = await pool.execute(
      `SELECT c.id, c.nombres, c.apellidos, c.estado, p.nombre_puesto
       FROM candidatos_seleccion c
       INNER JOIN puestos p ON p.id = c.puesto_id
       WHERE c.codigo_acceso_hash = ?
       LIMIT 1`,
      [codigoHash]
    );
    const candidato = candidatos[0];
    if (!candidato) return res.status(401).json({ mensaje: 'Credenciales inválidas.' });

    const perfil = {
      id: candidato.id,
      candidato_id: candidato.id,
      codigo_empleado: 'CANDIDATO',
      nombre: `${candidato.nombres} ${candidato.apellidos}`,
      puesto: candidato.nombre_puesto,
      rol: 'CANDIDATE',
      rol_id: 0,
      role: 'CANDIDATE',
    };
    const token = jwt.sign(perfil, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, usuario: perfil, estado: candidato.estado });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, loginCandidato };