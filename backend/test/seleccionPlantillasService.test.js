const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const service = require('../src/services/seleccionPlantillasService');

const ejecutarOriginal = pool.execute;

test.afterEach(() => {
  pool.execute = ejecutarOriginal;
});

test('todas las plantillas iniciales cumplen la definición válida', () => {
  for (const codigo of service.codigosEvaluables()) {
    const definicion = service.definicionEstatica(codigo);
    assert.deepEqual(service.validarDefinicion(definicion), [], codigo);
  }
});

test('la validación rechaza preguntas sin una única opción correcta', () => {
  const definicion = JSON.parse(JSON.stringify(service.definicionEstatica('ASISTADM')));
  definicion.secciones[0].items[0].opciones.forEach((opcion) => {
    opcion.correcta = true;
  });
  const errores = service.validarDefinicion(definicion);
  assert.ok(errores.some((mensaje) => mensaje.includes('exactamente una opción correcta')));
});

test('la validación rechaza umbrales fuera del puntaje total', () => {
  const definicion = JSON.parse(JSON.stringify(service.definicionEstatica('ASISTADM')));
  definicion.umbrales.recomendable = 150;
  const errores = service.validarDefinicion(definicion);
  assert.ok(errores.some((mensaje) => mensaje.includes('umbral recomendable')));
});

test('obtenerDefinicionVigente usa la definición guardada en base de datos', async () => {
  const definicion = service.definicionEstatica('ASISTADM');
  pool.execute = async (sql, valores) => {
    assert.match(sql, /FROM seleccion_plantillas/);
    assert.deepEqual(valores, ['ASISTADM']);
    return [[{
      id: 42,
      activa: 1,
      definicion: JSON.stringify({ ...definicion, titulo: 'Prueba editada' }),
    }]];
  };

  const resultado = await service.obtenerDefinicionVigente('ASISTADM');
  assert.equal(resultado.origen, 'bd');
  assert.equal(resultado.plantillaId, 42);
  assert.equal(resultado.definicion.titulo, 'Prueba editada');
});

test('obtenerDefinicionVigente usa el config si la tabla aún no existe', async () => {
  const error = new Error('Tabla inexistente');
  error.code = 'ER_NO_SUCH_TABLE';
  pool.execute = async () => {
    throw error;
  };

  const resultado = await service.obtenerDefinicionVigente('ASISTADM');
  assert.equal(resultado.origen, 'codigo');
  assert.equal(resultado.plantillaId, null);
  assert.equal(resultado.definicion.titulo, service.definicionEstatica('ASISTADM').titulo);
});

test('obtenerDetalle completa una plantilla sin definición con la configuración base', async () => {
  pool.execute = async (sql) => {
    assert.match(sql, /FROM seleccion_plantillas p/);
    return [[{
      id: 7,
      puesto_id: 1,
      codigo: 'ASISTADM',
      nombre: 'Asistente administrativo',
      activa: 1,
      actualizado_en: null,
      definicion: null,
    }]];
  };

  const detalle = await service.obtenerDetalle(7);
  assert.equal(detalle.definicion.titulo, service.definicionEstatica('ASISTADM').titulo);
});
