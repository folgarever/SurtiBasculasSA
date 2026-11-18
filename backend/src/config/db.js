require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const host = String(process.env.DB_HOST || '').toLowerCase();
const esHostLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
// Antes SSL estaba siempre activo. Se mantiene activo por defecto en hosts remotos
// y se desactiva en local salvo que DB_SSL lo fuerce explícitamente.
const usarSsl = process.env.DB_SSL === undefined
  ? !esHostLocal
  : String(process.env.DB_SSL).toLowerCase() === 'true';
const verificarCertificado = String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';

const configuracion = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
};

if (usarSsl) {
  configuracion.ssl = { rejectUnauthorized: verificarCertificado };
}

const pool = mysql.createPool(configuracion);

module.exports = pool;
