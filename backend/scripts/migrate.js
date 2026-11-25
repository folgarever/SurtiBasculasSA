require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const pool = require('../src/config/db');

const directorioMigraciones = path.resolve(__dirname, '../../database/migrations');
const nombreBloqueo = 'surtibasculas_schema_migrations';

function dividirSql(sql) {
  const statements = [];
  let delimiter = ';';
  let statement = '';
  let quote = '';
  let enComentarioLinea = false;
  let enComentarioBloque = false;

  for (const linea of sql.split(/\r?\n/)) {
    const directiva = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(linea);
    if (!quote && !enComentarioBloque && directiva) {
      delimiter = directiva[1];
      continue;
    }

    enComentarioLinea = false;
    for (let indice = 0; indice < linea.length; indice += 1) {
      const actual = linea[indice];
      const siguiente = linea[indice + 1];

      if (enComentarioLinea) break;
      if (enComentarioBloque) {
        statement += actual;
        if (actual === '*' && siguiente === '/') {
          statement += siguiente;
          indice += 1;
          enComentarioBloque = false;
        }
        continue;
      }
      if (quote) {
        statement += actual;
        if (actual === '\\' && siguiente) {
          statement += siguiente;
          indice += 1;
        } else if (actual === quote) {
          if (siguiente === quote) {
            statement += siguiente;
            indice += 1;
          } else {
            quote = '';
          }
        }
        continue;
      }
      if ((actual === '-' && siguiente === '-' && /\s/.test(linea[indice + 2] || ' '))
        || actual === '#') {
        enComentarioLinea = true;
        statement += linea.slice(indice);
        break;
      }
      if (actual === '/' && siguiente === '*') {
        statement += '/*';
        indice += 1;
        enComentarioBloque = true;
        continue;
      }
      if (actual === '\'' || actual === '"' || actual === '`') {
        quote = actual;
        statement += actual;
        continue;
      }
      if (linea.startsWith(delimiter, indice)) {
        if (statement.trim()) statements.push(statement.trim());
        statement = '';
        indice += delimiter.length - 1;
        continue;
      }
      statement += actual;
    }
    statement += '\n';
    enComentarioLinea = false;
  }

  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

function checksum(contenido) {
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

async function leerMigraciones() {
  const archivos = (await fs.readdir(directorioMigraciones))
    .filter((archivo) => /^\d{4}-\d{2}-\d{2}-.+\.sql$/.test(archivo))
    .sort();
  return Promise.all(archivos.map(async (archivo) => {
    const contenido = await fs.readFile(path.join(directorioMigraciones, archivo), 'utf8');
    return { archivo, contenido, checksum: checksum(contenido) };
  }));
}

function analizarArgumentos(argumentos) {
  if (argumentos.length === 1 && argumentos[0] === '--status') return { accion: 'status' };
  if (argumentos.length === 1 && argumentos[0] === '--apply') return { accion: 'apply' };
  if (argumentos.length === 2 && argumentos[0] === '--baseline') {
    return { accion: 'baseline', archivo: argumentos[1] };
  }
  return null;
}

async function tablaHistorialExiste(connection) {
  const [filas] = await connection.query("SHOW TABLES LIKE 'schema_migrations'");
  return filas.length > 0;
}

async function crearTablaHistorial(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration VARCHAR(191) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      status ENUM('running', 'applied', 'failed') NOT NULL,
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      error_text TEXT NULL
    ) ENGINE=InnoDB
  `);
}

async function adquirirBloqueo(connection) {
  const [filas] = await connection.execute('SELECT GET_LOCK(?, 30) AS adquirido', [nombreBloqueo]);
  if (Number(filas[0]?.adquirido) !== 1) {
    throw new Error('No se pudo obtener el bloqueo de migraciones. Verifica si otro proceso está migrando la base.');
  }
}

async function mostrarEstado(connection, migraciones) {
  if (!await tablaHistorialExiste(connection)) {
    console.log('No existe schema_migrations. Usa --baseline después de verificar la versión instalada.');
    return;
  }
  const [filas] = await connection.execute(
    'SELECT migration, checksum, status FROM schema_migrations ORDER BY migration'
  );
  const aplicadas = new Map(filas.map((fila) => [fila.migration, fila]));
  for (const migracion of migraciones) {
    const guardada = aplicadas.get(migracion.archivo);
    if (guardada && guardada.checksum !== migracion.checksum) {
      throw new Error(`El checksum cambió para ${migracion.archivo}. No edites migraciones aplicadas.`);
    }
    console.log(`${guardada?.status ?? 'pendiente'}  ${migracion.archivo}`);
  }
}

async function establecerLineaBase(connection, migraciones, archivo) {
  const indice = migraciones.findIndex((migracion) => migracion.archivo === archivo);
  if (indice < 0) throw new Error(`No existe la migración indicada: ${archivo}`);
  const [filas] = await connection.execute('SELECT COUNT(*) AS total FROM schema_migrations');
  if (Number(filas[0].total) !== 0) {
    throw new Error('La línea base solo se permite cuando schema_migrations está vacía.');
  }

  for (const migracion of migraciones.slice(0, indice + 1)) {
    await connection.execute(
      `INSERT INTO schema_migrations (migration, checksum, status, completed_at)
       VALUES (?, ?, 'applied', CURRENT_TIMESTAMP)`,
      [migracion.archivo, migracion.checksum]
    );
  }
  console.log(`Línea base registrada hasta ${archivo}. No se ejecutó ningún SQL de migración.`);
}

async function aplicarMigraciones(connection, migraciones) {
  const [filas] = await connection.execute(
    'SELECT migration, checksum, status FROM schema_migrations ORDER BY migration'
  );
  const aplicadas = new Map(filas.map((fila) => [fila.migration, fila]));

  for (const migracion of migraciones) {
    const registro = aplicadas.get(migracion.archivo);
    if (registro) {
      if (registro.checksum !== migracion.checksum) {
        throw new Error(`El checksum cambió para ${migracion.archivo}. No edites migraciones aplicadas.`);
      }
      if (registro.status === 'applied') continue;
      throw new Error(`${migracion.archivo} quedó en estado ${registro.status}; revisa la base antes de continuar.`);
    }

    await connection.execute(
      `INSERT INTO schema_migrations (migration, checksum, status) VALUES (?, ?, 'running')`,
      [migracion.archivo, migracion.checksum]
    );
    try {
      const statements = dividirSql(migracion.contenido);
      for (const statement of statements) await connection.query(statement);
      await connection.execute(
        `UPDATE schema_migrations
         SET status = 'applied', completed_at = CURRENT_TIMESTAMP
         WHERE migration = ?`,
        [migracion.archivo]
      );
      console.log(`Aplicada: ${migracion.archivo}`);
    } catch (error) {
      await connection.execute(
        `UPDATE schema_migrations SET status = 'failed', error_text = ? WHERE migration = ?`,
        [String(error.message).slice(0, 4000), migracion.archivo]
      );
      throw new Error(`Falló ${migracion.archivo}; revisa su estado parcial antes de reintentar: ${error.message}`);
    }
  }
}

async function ejecutar(argumentos = process.argv.slice(2)) {
  const opciones = analizarArgumentos(argumentos);
  if (!opciones) {
    throw new Error('Uso: npm run db:migrate -- --status | --apply | --baseline <archivo.sql>');
  }

  const migraciones = await leerMigraciones();
  const configuracionConexion = { ...pool.obtenerConfiguracion() };
  delete configuracionConexion.waitForConnections;
  delete configuracionConexion.connectionLimit;
  delete configuracionConexion.maxIdle;
  delete configuracionConexion.idleTimeout;
  delete configuracionConexion.queueLimit;
  const connection = await mysql.createConnection({
    ...configuracionConexion,
    multipleStatements: false,
  });
  let bloqueoAdquirido = false;
  try {
    if (opciones.accion === 'status') {
      await mostrarEstado(connection, migraciones);
      return;
    }

    await crearTablaHistorial(connection);
    await adquirirBloqueo(connection);
    bloqueoAdquirido = true;
    if (opciones.accion === 'baseline') {
      await establecerLineaBase(connection, migraciones, opciones.archivo);
    } else {
      await aplicarMigraciones(connection, migraciones);
    }
  } finally {
    if (bloqueoAdquirido) {
      await connection.execute('SELECT RELEASE_LOCK(?)', [nombreBloqueo]);
    }
    await connection.end();
  }
}

if (require.main === module) {
  ejecutar()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = {
  analizarArgumentos,
  checksum,
  dividirSql,
  leerMigraciones,
};
