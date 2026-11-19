const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const { obtenerResumenAdmin } = require('../src/controllers/dashboardController');

const ejecutarOriginal = pool.execute;

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

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
});

test('obtenerResumenAdmin devuelve indicadores reales y actividad reciente', async () => {
  const consultas = [
    [[{
      periodo: '2026-11',
      fecha: '2026-11-18',
      empleados_activos: 10,
      empleados_inactivos: 1,
      marcaciones_hoy: 10,
      empleados_presentes: 9,
      llegadas_tarde_hoy: 2,
      evaluaciones_pendientes: 4,
      evaluaciones_completadas: 6,
      evaluaciones_desempeno_mes: 3,
      sugerencias_pendientes: 2,
      sugerencias_totales: 7,
      candidatos_registro: 1,
      candidatos_completados: 5,
      incidencias_vigentes: 1,
    }]],
    [[{ fecha: '2026-11-12', total: 8, atrasos: 1 }, { fecha: '2026-11-18', total: 10, atrasos: 2 }]],
    [[{ puesto: 'Técnico', total: 4 }, { puesto: 'Auxiliar', total: 3 }]],
    [[{
      tipo: 'sugerencia',
      id: 3,
      persona: 'Mafer García',
      titulo: 'Mejorar el inventario',
      estado: 'Pendiente',
      fecha: '2026-11-18 09:15:00',
    }]],
    [[{
      marcaciones_ayer: 8,
      atrasos_ayer: 1,
      sugerencias_actual: 3,
      sugerencias_anterior: 1,
      evaluaciones_actual: 2,
      evaluaciones_anterior: 4,
    }]],
    [[
      { clave: 'sugerencias', fecha: '2026-11-18', total: 3 },
      { clave: 'evaluaciones', fecha: '2026-11-18', total: 2 },
    ]],
  ];
  const consultasSql = [];
  pool.execute = async (sql) => {
    consultasSql.push(sql);
    return consultas.shift();
  };

  const res = crearRespuesta();
  await obtenerResumenAdmin({}, res, (error) => { throw error; });

  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo.resumen.empleados_activos, 10);
  assert.equal(res.cuerpo.resumen.puntualidad_hoy, 80);
  assert.equal(res.cuerpo.resumen.evaluaciones_pendientes, 4);
  assert.equal(res.cuerpo.asistencia_semanal.length, 2);
  assert.equal(res.cuerpo.distribucion_puestos[0].puesto, 'Técnico');
  assert.equal(res.cuerpo.actividad_reciente[0].estado, 'Pendiente');
  assert.equal(res.cuerpo.comparativo.puntualidad_ayer, 88);
  assert.equal(res.cuerpo.tendencias.asistencia.length, 7);
  assert.equal(res.cuerpo.tendencias.sugerencias.at(-1), 3);
  assert.equal(res.cuerpo.tendencias.evaluaciones.at(-1), 2);
  assert.match(consultasSql[3], /CASE WHEN s\.anonima = 1 THEN 'Anónimo' ELSE e\.nombre END/);
  assert.equal(consultas.length, 0);
});
