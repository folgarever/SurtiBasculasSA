const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { analizarArgumentos, dividirSql, leerMigraciones } = require('../scripts/migrate');

test('analiza solo las acciones de migración documentadas', () => {
  assert.deepEqual(analizarArgumentos(['--status']), { accion: 'status' });
  assert.deepEqual(analizarArgumentos(['--apply']), { accion: 'apply' });
  assert.deepEqual(analizarArgumentos(['--baseline', '2026-11-24-ficha-empleados.sql']), {
    accion: 'baseline',
    archivo: '2026-11-24-ficha-empleados.sql',
  });
  assert.equal(analizarArgumentos(['--apply', '--baseline']), null);
});

test('divide procedimientos almacenados respetando delimitadores y comentarios', async () => {
  const archivo = path.resolve(__dirname, '../../database/migrations/2026-11-18-frecuencia-evaluaciones-conocimiento.sql');
  const sql = await fs.readFile(archivo, 'utf8');
  const statements = dividirSql(sql);

  assert.ok(statements.length > 3);
  assert.ok(statements.some((statement) => /CREATE PROCEDURE/i.test(statement)));
  assert.ok(statements.every((statement) => !/^DELIMITER\b/i.test(statement)));
});

test('enumera las migraciones de forma cronológica e incluye checksums', async () => {
  const migraciones = await leerMigraciones();
  const nombres = migraciones.map((migracion) => migracion.archivo);

  assert.deepEqual(nombres, [...nombres].sort());
  assert.ok(nombres.includes('2026-11-25-notificaciones-leidas.sql'));
  assert.ok(migraciones.every((migracion) => /^[a-f0-9]{64}$/.test(migracion.checksum)));
});

test('divide correctamente todas las migraciones antes de ejecutarlas', async () => {
  const migraciones = await leerMigraciones();

  for (const migracion of migraciones) {
    const statements = dividirSql(migracion.contenido);
    assert.ok(statements.length > 0, `${migracion.archivo} no produjo sentencias`);
    assert.ok(
      statements.every((statement) => !/^\s*DELIMITER\b/i.test(statement)),
      `${migracion.archivo} conserva una directiva DELIMITER`,
    );
    assert.ok(
      statements.every((statement) => statement.trim().length > 0),
      `${migracion.archivo} produjo una sentencia vacía`,
    );
  }
});
