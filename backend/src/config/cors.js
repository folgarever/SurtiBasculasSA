const cors = require('cors');

function parsearOrigenes(valor) {
  return String(valor || '')
    .split(',')
    .map((origen) => origen.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

// Si no se configura CORS_ORIGINS se permite localhost y cualquier dominio *.vercel.app,
// de modo que las URLs de preview de Vercel también puedan consumir la API.
const origenPersonalizado = parsearOrigenes(process.env.CORS_ORIGINS);
const origenesPermitidos = origenPersonalizado.length
  ? origenPersonalizado
  : ['http://localhost:4200'];
const esVercel = (origen) => /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origen);

function esOrigenPermitido(origen) {
  if (origenPersonalizado.length) return origenesPermitidos.includes(origen);
  return origenesPermitidos.includes(origen) || esVercel(origen);
}

const opcionesCors = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, esOrigenPermitido(origin.replace(/\/$/, '')));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(opcionesCors);
module.exports.esOrigenPermitido = esOrigenPermitido;
