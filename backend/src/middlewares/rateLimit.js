const intentosPorClave = new Map();

function crearLimitador({ ventanaMs = 15 * 60 * 1000, maximo = 10, mensaje = 'Demasiados intentos. Intenta nuevamente más tarde.' } = {}) {
  return (req, res, next) => {
    const ahora = Date.now();
    const ip = req.ip || req.connection?.remoteAddress || 'desconocida';
    const clave = `${req.baseUrl}${req.path}:${ip}`;
    const registro = intentosPorClave.get(clave);

    if (intentosPorClave.size > 1000) {
      for (const [claveRegistro, valor] of intentosPorClave) {
        if (ahora - valor.inicio > ventanaMs) intentosPorClave.delete(claveRegistro);
      }
    }

    if (!registro || ahora - registro.inicio > ventanaMs) {
      intentosPorClave.set(clave, { inicio: ahora, cantidad: 1 });
      return next();
    }

    registro.cantidad += 1;
    if (registro.cantidad > maximo) {
      return res.status(429).json({ mensaje });
    }

    return next();
  };
}

module.exports = { crearLimitador };
