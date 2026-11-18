const cors = require('cors');

function parsearOrigenes(valor) {
  return String(valor || '')
    .split(',')
    .map((origen) => origen.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

// Si no se configura CORS_ORIGINS se mantienen los orígenes conocidos del proyecto.
// Para cualquier otro dominio, definir CORS_ORIGINS como lista separada por comas.
const origenPersonalizado = parsearOrigenes(process.env.CORS_ORIGINS);
const origenesPermitidos = origenPersonalizado.length
  ? origenPersonalizado
  : ['http://localhost:4200', 'https://surtibasculas.vercel.app'];

const opcionesCors = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const origenNormalizado = origin.replace(/\/$/, '');
    return callback(null, origenesPermitidos.includes(origenNormalizado));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(opcionesCors);
