require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

function obtenerConfiguracion(entorno = process.env) {
  const host = String(entorno.DB_HOST || '').toLowerCase();
  const esHostLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
  // Antes SSL estaba siempre activo con rejectUnauthorized: false. Se conserva ese
  // comportamiento en remotos: DB_SSL solo permite activarlo explícitamente en localhost.
  const usarSsl = esHostLocal
    ? String(entorno.DB_SSL).toLowerCase() === 'true'
    : true;
  const verificarCertificado = String(entorno.DB_SSL_REJECT_UNAUTHORIZED ?? 'false').toLowerCase() === 'true';

  const configuracion = {
    host: entorno.DB_HOST,
    port: Number(entorno.DB_PORT || 3306),
    user: entorno.DB_USER,
    password: entorno.DB_PASSWORD,
    database: entorno.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  };

  if (usarSsl) {
    configuracion.ssl = { rejectUnauthorized: verificarCertificado };
  }

  return configuracion;
}

const pool = mysql.createPool(obtenerConfiguracion());

module.exports = pool;
module.exports.obtenerConfiguracion = obtenerConfiguracion;
