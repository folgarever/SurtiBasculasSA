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

test('obtenerDefinicionPublicada usa la versión publicada en base de datos', async () => {
  const definicion = service.definicionEstatica('ASISTADM');
  pool.execute = async (sql, valores) => {
    assert.match(sql, /INNER JOIN seleccion_plantilla_versiones/);
    assert.deepEqual(valores, ['ASISTADM']);
    return [[{
      id: 42,
      numero: 3,
      definicion: JSON.stringify({ ...definicion, titulo: 'Prueba editada' }),
    }]];
  };

  const resultado = await service.obtenerDefinicionPublicada('ASISTADM');
  assert.equal(resultado.origen, 'bd');
  assert.equal(resultado.versionId, 42);
  assert.equal(resultado.numero, 3);
  assert.equal(resultado.definicion.titulo, 'Prueba editada');
});

test('obtenerDefinicionPublicada usa el config si la tabla aún no existe', async () => {
  const error = new Error('Tabla inexistente');
  error.code = 'ER_NO_SUCH_TABLE';
  pool.execute = async () => {
    throw error;
  };

  const resultado = await service.obtenerDefinicionPublicada('ASISTADM');
  assert.equal(resultado.origen, 'codigo');
  assert.equal(resultado.versionId, null);
  assert.equal(resultado.definicion.titulo, service.definicionEstatica('ASISTADM').titulo);
});
