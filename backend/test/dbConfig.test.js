const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
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

test('limita el pool y el tiempo de inactividad en Vercel sin cambiar el servidor local', () => {
  const vercel = obtenerConfiguracion({ DB_HOST: 'db.example.com', VERCEL: '1' });
  assert.equal(vercel.connectionLimit, 4);
  assert.equal(vercel.maxIdle, 1);
  assert.equal(vercel.idleTimeout, 5000);
  assert.equal(vercel.waitForConnections, true);

  const local = obtenerConfiguracion({ DB_HOST: 'localhost' });
  assert.equal(local.connectionLimit, 10);
  assert.equal(local.maxIdle, undefined);
  assert.equal(local.idleTimeout, undefined);
});

test('registra el cierre de conexiones inactivas con Vercel', () => {
  const codigo = `
    const assert = require('node:assert/strict');
    let espera;
    globalThis[Symbol.for('@vercel/request-context')] = {
      get: () => ({ waitUntil: (promesa) => { espera = promesa; } }),
    };
    const pool = require('./src/config/db');
    pool.emit('release');
    assert.ok(espera instanceof Promise);
    espera.then(() => pool.end()).catch((error) => { console.error(error); process.exitCode = 1; });
  `;
  execFileSync(process.execPath, ['-e', codigo], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { ...process.env, VERCEL: '1', VERCEL_URL: 'example.vercel.app', VERCEL_REGION: 'test' },
    timeout: 10000,
  });
});
