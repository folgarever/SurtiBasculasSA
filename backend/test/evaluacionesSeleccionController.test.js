const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');
const { evaluacionAsistente, puestoCodigo } = require('../src/config/evaluacionesSeleccion');
const {
  entregarPruebaCandidato,
  restablecerContrasenaCandidatoAdmin,
} = require('../src/controllers/evaluacionesSeleccionController');

for (const reintento of [false, true]) {
  test(`entrega la prueba y guarda el motivo de reintento: ${reintento}`, async () => {
    const respuestas = Object.fromEntries(evaluacionAsistente.secciones.flatMap((seccion) => (
      seccion.items.map((item, indice) => [`${seccion.id}-${indice}`, item.opciones[0].id])
    )));
    const candidato = {
      id: 1,
      nombres: 'Candidato',
      apellidos: 'Prueba',
      fecha_nacimiento: '2000-01-01',
      curriculum_nombre: 'curriculum.pdf',
      puesto_id: 1,
      estado: 'registro',
      codigo_abreviatura: puestoCodigo,
      reintento_autorizado_por: reintento ? 7 : null,
      reintento_motivo: reintento ? 'Nueva oportunidad' : null,
    };
    let insertValues;
    let committed = false;
    let released = false;
    const connection = {
      async beginTransaction() {},
      async execute(sql, values) {
        if (sql.includes('FROM candidatos_seleccion c')) {
          const perfil = { ...candidato };
          if (!sql.includes('c.reintento_motivo')) delete perfil.reintento_motivo;
          return [[perfil]];
        }

        if (sql.includes('FROM seleccion_plantillas')) return [[]];
        if (sql.includes('SELECT numero_intento')) return [reintento ? [{ numero_intento: 1 }] : []];
        if (sql.includes('INSERT INTO candidatos_seleccion_intentos')) {
          assert.ok(values.every((value) => value !== undefined), 'los parámetros SQL no pueden ser undefined');
          insertValues = values;
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('UPDATE candidatos_seleccion')) return [{ affectedRows: 1 }];
        throw new Error(`Consulta inesperada: ${sql}`);
      },
      async commit() { committed = true; },
      async rollback() {},
      release() { released = true; },
    };
    const originalGetConnection = pool.getConnection;
    pool.getConnection = async () => connection;
    try {
      let response;
      await entregarPruebaCandidato(
        { body: { respuestas }, usuario: { candidato_acceso_id: 1 } },
        { json(value) { response = value; return value; } },
        (error) => { throw error; },
      );
      assert.equal(JSON.parse(insertValues.at(-3)).titulo, evaluacionAsistente.titulo);
      assert.equal(insertValues.at(-2), candidato.reintento_autorizado_por);
      assert.equal(insertValues.at(-1), candidato.reintento_motivo);
      assert.equal(response.resultado.numero_intento, reintento ? 2 : 1);
      assert.equal(committed, true);
      assert.equal(released, true);
    } finally {
      pool.getConnection = originalGetConnection;
    }
  });
}

test('restablece la contraseña de un candidato activo y devuelve la temporal una sola vez', async () => {
  const ejecutarOriginal = pool.execute;
  const consultas = [];
  pool.execute = async (sql, valores) => {
    consultas.push({ sql, valores });
    if (sql.startsWith('SELECT usuario')) return [[{ usuario: 'CANDIDATO-2026-001' }]];
    if (sql.startsWith('UPDATE candidatos_seleccion_accesos')) return [{ affectedRows: 1 }];
    throw new Error(`Consulta inesperada: ${sql}`);
  };
  let respuesta;
  try {
    await restablecerContrasenaCandidatoAdmin(
      { params: { accesoId: '4' } },
      { json(valor) { respuesta = valor; return valor; } },
      (error) => { throw error; },
    );
  } finally {
    pool.execute = ejecutarOriginal;
  }

  assert.equal(consultas.length, 2);
  assert.match(respuesta.cuenta.password, /^[a-f0-9]{24}$/);
  assert.equal(respuesta.cuenta.usuario, 'CANDIDATO-2026-001');
  assert.equal(await bcrypt.compare(respuesta.cuenta.password, consultas[1].valores[0]), true);
  assert.deepEqual(consultas[1].valores.slice(1), [4]);
});
