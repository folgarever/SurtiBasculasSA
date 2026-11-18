const test = require('node:test');
const assert = require('node:assert/strict');
const { crearLimitador } = require('../src/middlewares/rateLimit');

function crearRespuesta() {
  return {
    codigo: 200,
    cuerpo: null,
    status(codigo) {
      this.codigo = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

test('el limitador bloquea después del máximo de intentos', () => {
  const limitador = crearLimitador({ maximo: 2, ventanaMs: 60000, mensaje: 'Muy pronto.' });
  const req = { baseUrl: '/api/auth', path: '/login', ip: '10.0.0.1' };
  const res = crearRespuesta();
  let pasos = 0;

  limitador(req, res, () => { pasos += 1; });
  limitador(req, res, () => { pasos += 1; });
  limitador(req, res, () => { pasos += 1; });

  assert.equal(pasos, 2);
  assert.equal(res.codigo, 429);
  assert.equal(res.cuerpo.mensaje, 'Muy pronto.');
});
