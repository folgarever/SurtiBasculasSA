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
        if (sql.includes('FROM seleccion_plantillas p')) return [[]];
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
      assert.equal(insertValues.at(-3), null);
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

test('rechaza una versión de plantilla de otro puesto', async () => {
  const respuestas = Object.fromEntries(evaluacionAsistente.secciones.flatMap((seccion) => (
    seccion.items.map((item, indice) => [`${seccion.id}-${indice}`, item.opciones[0].id])
  )));
  let insertoIntento = false;
  const connection = {
    async beginTransaction() {},
    async execute(sql) {
      if (sql.includes('FROM candidatos_seleccion c')) return [[{
        id: 1,
        nombres: 'Candidato',
        apellidos: 'Prueba',
        fecha_nacimiento: '2000-01-01',
        curriculum_nombre: 'curriculum.pdf',
        puesto_id: 1,
        estado: 'registro',
        codigo_abreviatura: puestoCodigo,
        reintento_autorizado_por: null,
        reintento_motivo: null,
      }]];
      if (sql.includes('FROM seleccion_plantilla_versiones v')) {
        return [[{
          id: 99,
          numero: 1,
          estado: 'publicada',
          definicion: JSON.stringify(evaluacionAsistente),
          codigo: 'OTRO',
          nombre: 'Otro puesto',
          activa: true,
        }]];
      }
      if (sql.includes('INSERT INTO candidatos_seleccion_intentos')) {
        insertoIntento = true;
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    },
    async commit() {},
    async rollback() {},
    release() {},
  };
  const originalGetConnection = pool.getConnection;
  pool.getConnection = async () => connection;

  try {
    let codigo;
    let cuerpo;
    await entregarPruebaCandidato(
      { body: { respuestas, plantilla_version_id: 99 }, usuario: { candidato_acceso_id: 1 } },
      {
        status(valor) { codigo = valor; return this; },
        json(valor) { cuerpo = valor; return valor; },
      },
      (error) => { throw error; },
    );
    assert.equal(codigo, 400);
    assert.match(cuerpo.mensaje, /no pertenece/);
    assert.equal(insertoIntento, false);
  } finally {
    pool.getConnection = originalGetConnection;
  }
});

test('rechaza una versión en borrador enviada por el candidato', async () => {
  const respuestas = Object.fromEntries(evaluacionAsistente.secciones.flatMap((seccion) => (
    seccion.items.map((item, indice) => [`${seccion.id}-${indice}`, item.opciones[0].id])
  )));
  const connection = {
    async beginTransaction() {},
    async execute(sql) {
      if (sql.includes('FROM candidatos_seleccion c')) return [[{
        id: 1,
        nombres: 'Candidato',
        apellidos: 'Prueba',
        fecha_nacimiento: '2000-01-01',
        curriculum_nombre: 'curriculum.pdf',
        puesto_id: 1,
        estado: 'registro',
        codigo_abreviatura: puestoCodigo,
        reintento_autorizado_por: null,
        reintento_motivo: null,
      }]];
      if (sql.includes('FROM seleccion_plantilla_versiones v')) {
        return [[{
          id: 12,
          numero: 2,
          estado: 'borrador',
          definicion: JSON.stringify(evaluacionAsistente),
          codigo: puestoCodigo,
          nombre: 'Puesto',
          activa: true,
        }]];
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    },
    async commit() {},
    async rollback() {},
    release() {},
  };
  const originalGetConnection = pool.getConnection;
  pool.getConnection = async () => connection;

  try {
    let codigo;
    let cuerpo;
    await entregarPruebaCandidato(
      { body: { respuestas, plantilla_version_id: 12 }, usuario: { candidato_acceso_id: 1 } },
      {
        status(valor) { codigo = valor; return this; },
        json(valor) { cuerpo = valor; return valor; },
      },
      (error) => { throw error; },
    );
    assert.equal(codigo, 409);
    assert.match(cuerpo.mensaje, /no está disponible/);
  } finally {
    pool.getConnection = originalGetConnection;
  }
});
