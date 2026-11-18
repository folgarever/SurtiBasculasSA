const test = require('node:test');
const assert = require('node:assert/strict');
const { obtenerConfiguracion } = require('../src/config/db');

test('host remoto usa SSL con rejectUnauthorized en false por defecto', () => {
  const configuracion = obtenerConfiguracion({ DB_HOST: 'db.example.com' });
  assert.deepEqual(configuracion.ssl, { rejectUnauthorized: false });
});

test('host remoto mantiene SSL aunque DB_SSL esté en false', () => {
  const configuracion = obtenerConfiguracion({ DB_HOST: 'db.example.com', DB_SSL: 'false' });
  assert.deepEqual(configuracion.ssl, { rejectUnauthorized: false });
});

test('host local no usa SSL salvo que se fuerce', () => {
  const local = obtenerConfiguracion({ DB_HOST: 'localhost' });
  assert.equal(local.ssl, undefined);

  const forzado = obtenerConfiguracion({ DB_HOST: 'localhost', DB_SSL: 'true' });
  assert.deepEqual(forzado.ssl, { rejectUnauthorized: false });
});

test('DB_SSL_REJECT_UNAUTHORIZED=true activa la verificacion del certificado', () => {
  const configuracion = obtenerConfiguracion({
    DB_HOST: 'db.example.com',
    DB_SSL_REJECT_UNAUTHORIZED: 'true',
  });
  assert.deepEqual(configuracion.ssl, { rejectUnauthorized: true });
});
