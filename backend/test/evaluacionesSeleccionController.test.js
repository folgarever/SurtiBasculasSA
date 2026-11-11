const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const { evaluacionAsistente, puestoCodigo } = require('../src/config/evaluacionesSeleccion');
const { entregarPruebaCandidato } = require('../src/controllers/evaluacionesSeleccionController');

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
