const pool = require('../config/db');
const { evaluacionAsistente, puestoCodigo } = require('../config/evaluacionesSeleccion');
const {
  obtenerEvaluacion,
  codigosPuestosConPrueba,
} = require('../config/evaluacionesSeleccionPuestos');

const SECCIONES = ['aptitudes', 'conocimientos', 'practica', 'valores'];
const UMBRALES = ['recomendable', 'revision_adicional', 'minimo_practica', 'minimo_conocimientos', 'minimo_valores'];

function errorDeEstado(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function codigosEvaluables() {
  return [puestoCodigo, ...codigosPuestosConPrueba()];
}

function definicionEstatica(codigo) {
  if (codigo === puestoCodigo) return evaluacionAsistente;
  return obtenerEvaluacion(codigo) || null;
}

function parsearDefinicion(valor) {
  if (valor === null || valor === undefined) return null;
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

function validarDefinicion(definicion) {
  const errores = [];
  if (!definicion || typeof definicion !== 'object' || Array.isArray(definicion)) {
    return ['La definición de la prueba no es válida.'];
  }
  if (typeof definicion.titulo !== 'string' || !definicion.titulo.trim()) {
    errores.push('El título de la prueba es obligatorio.');
  }
  const tiempo = Number(definicion.tiempo_total_minutos);
  const puntajeTotal = Number(definicion.puntaje_total);
  if (!Number.isFinite(tiempo) || tiempo <= 0) {
    errores.push('El tiempo total debe ser mayor a cero.');
  }
  if (!Number.isFinite(puntajeTotal) || puntajeTotal <= 0) {
    errores.push('El puntaje total debe ser mayor a cero.');
  }
  if (!definicion.umbrales || typeof definicion.umbrales !== 'object') {
    errores.push('Los umbrales de decisión son obligatorios.');
  } else {
    UMBRALES.forEach((clave) => {
      const valor = Number(definicion.umbrales[clave]);
      if (!Number.isFinite(valor) || valor < 0 || valor > puntajeTotal) {
        errores.push(`El umbral ${clave} debe estar entre 0 y ${puntajeTotal}.`);
      }
    });
    if (Number(definicion.umbrales.recomendable) < Number(definicion.umbrales.revision_adicional)) {
      errores.push('El umbral de recomendable no puede ser menor que el de revisión adicional.');
    }
  }

  const secciones = definicion.secciones;
  if (!Array.isArray(secciones) || secciones.length !== SECCIONES.length) {
    errores.push('La prueba debe tener exactamente cuatro secciones.');
  } else {
    const ids = new Set(secciones.map((seccion) => seccion?.id));
    SECCIONES.forEach((id) => {
      if (!ids.has(id)) errores.push(`Falta la sección ${id}.`);
    });
    secciones.forEach((seccion) => {
      if (!SECCIONES.includes(seccion?.id)) {
        errores.push(`La sección ${seccion?.id} no es válida.`);
        return;
      }
      if (typeof seccion.nombre !== 'string' || !seccion.nombre.trim()) {
        errores.push(`La sección ${seccion.id} necesita un nombre.`);
      }
      if (!Array.isArray(seccion.items) || seccion.items.length === 0) {
        errores.push(`La sección ${seccion.id} debe tener al menos una pregunta.`);
        return;
      }
      seccion.items.forEach((item, indice) => {
        const etiqueta = `${seccion.id}[${indice}]`;
        if (!item || typeof item !== 'object') {
          errores.push(`${etiqueta} no es válida.`);
          return;
        }
        if (typeof item.enunciado !== 'string' || !item.enunciado.trim()) {
          errores.push(`El enunciado de ${etiqueta} es obligatorio.`);
        }
        if (!Array.isArray(item.opciones) || item.opciones.length < 2) {
          errores.push(`${etiqueta} debe tener al menos dos opciones.`);
          return;
        }
        const idsOpcion = new Set();
        let correctas = 0;
        item.opciones.forEach((opcion, indiceOpcion) => {
          if (!opcion || typeof opcion !== 'object') {
            errores.push(`La opción ${indiceOpcion} de ${etiqueta} no es válida.`);
            return;
          }
          if (typeof opcion.id !== 'string' || !opcion.id.trim()) {
            errores.push(`La opción ${indiceOpcion} de ${etiqueta} necesita un id.`);
          } else {
            if (idsOpcion.has(opcion.id)) {
              errores.push(`El id de opción ${opcion.id} está repetido en ${etiqueta}.`);
            }
            idsOpcion.add(opcion.id);
          }
          if (typeof opcion.texto !== 'string' || !opcion.texto.trim()) {
            errores.push(`La opción ${opcion.id || indiceOpcion} de ${etiqueta} necesita texto.`);
          }
          const puntos = Number(opcion.puntos);
          if (!Number.isFinite(puntos) || puntos < 0) {
            errores.push(`Los puntos de la opción ${opcion.id || indiceOpcion} de ${etiqueta} no son válidos.`);
          }
          if (opcion.correcta === true) correctas += 1;
        });
        if (correctas !== 1) {
          errores.push(`${etiqueta} debe tener exactamente una opción correcta.`);
        }
        if (Array.isArray(item.rubrica)) {
          item.rubrica.forEach((criterio, indiceCriterio) => {
            if (!criterio || typeof criterio.criterio !== 'string' || !criterio.criterio.trim()) {
              errores.push(`El criterio ${indiceCriterio} de ${etiqueta} necesita texto.`);
            }
            if (!Number.isFinite(Number(criterio?.puntos)) || Number(criterio?.puntos) < 0) {
              errores.push(`Los puntos del criterio ${indiceCriterio} de ${etiqueta} no son válidos.`);
            }
          });
        }
      });
    });
  }
  return errores;
}

function asegurarDefinicion(definicion) {
  const errores = validarDefinicion(definicion);
  if (errores.length) throw errorDeEstado(400, errores.join(' '));
  return definicion;
}

function escaparComoJson(definicion) {
  return JSON.stringify(definicion);
}

function esTablaInexistente(error) {
  return error && ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code);
}

async function obtenerDefinicionVigente(codigo, ejecutor = pool) {
  try {
    const [filas] = await ejecutor.execute(
      `SELECT id, definicion, activa
       FROM seleccion_plantillas
       WHERE codigo = ? AND activa = 1
       LIMIT 1`,
      [codigo]
    );
    const fila = filas[0];
    if (fila) {
      const definicion = parsearDefinicion(fila.definicion) || definicionEstatica(codigo);
      if (definicion) {
        return {
          definicion,
          plantillaId: fila.id,
          origen: 'bd',
        };
      }
    }
  } catch (error) {
    if (!esTablaInexistente(error)) throw error;
  }
  const definicion = definicionEstatica(codigo);
  return definicion ? { definicion, plantillaId: null, origen: 'codigo' } : null;
}

async function listar() {
  const codigos = codigosEvaluables();
  const [filas] = await pool.execute(
    `SELECT pu.id AS puesto_id, pu.codigo_abreviatura AS codigo, pu.nombre_puesto,
            pu.departamento, p.id AS plantilla_id, p.activa, p.actualizado_en
     FROM puestos pu
     LEFT JOIN seleccion_plantillas p ON p.puesto_id = pu.id
     WHERE pu.codigo_abreviatura IN (${codigos.map(() => '?').join(', ')})
     ORDER BY pu.nombre_puesto`,
    codigos
  );
  return filas.map((fila) => ({
    plantilla_id: fila.plantilla_id,
    puesto_id: fila.puesto_id,
    codigo: fila.codigo,
    nombre: fila.nombre_puesto,
    departamento: fila.departamento,
    activa: fila.plantilla_id === null ? true : Boolean(fila.activa),
    personalizada: fila.plantilla_id !== null,
    actualizado_en: fila.actualizado_en,
    origen: fila.plantilla_id === null ? 'codigo' : 'bd',
  }));
}

async function buscarPlantilla(plantillaId, ejecutor = pool) {
  const [filas] = await ejecutor.execute(
    `SELECT p.id, p.puesto_id, p.codigo, p.nombre, p.activa, p.actualizado_en,
            p.definicion, pu.nombre_puesto
     FROM seleccion_plantillas p
     INNER JOIN puestos pu ON pu.id = p.puesto_id
     WHERE p.id = ?
     LIMIT 1`,
    [plantillaId]
  );
  return filas[0] || null;
}

async function obtenerDetalle(plantillaId) {
  const plantilla = await buscarPlantilla(plantillaId);
  if (!plantilla) throw errorDeEstado(404, 'La plantilla no existe.');
  const definicion = parsearDefinicion(plantilla.definicion) || definicionEstatica(plantilla.codigo);
  if (!definicion) throw errorDeEstado(409, 'No hay una prueba de selección configurada para este puesto.');
  return {
    id: plantilla.id,
    puesto_id: plantilla.puesto_id,
    codigo: plantilla.codigo,
    nombre: plantilla.nombre,
    activa: Boolean(plantilla.activa),
    actualizado_en: plantilla.actualizado_en,
    definicion,
  };
}

async function crear(puestoId, definicion, creadoPor) {
  const [puestos] = await pool.execute(
    `SELECT id, codigo_abreviatura, nombre_puesto
     FROM puestos WHERE id = ? LIMIT 1`,
    [puestoId]
  );
  const puesto = puestos[0];
  if (!puesto || !codigosEvaluables().includes(puesto.codigo_abreviatura)) {
    throw errorDeEstado(400, 'El puesto no tiene una prueba de selección configurada.');
  }
  const [existentes] = await pool.execute(
    'SELECT id FROM seleccion_plantillas WHERE puesto_id = ? LIMIT 1',
    [puestoId]
  );
  if (existentes.length) throw errorDeEstado(409, 'Ese puesto ya tiene una plantilla editable.');

  const definicionFinal = asegurarDefinicion(definicion || definicionEstatica(puesto.codigo_abreviatura));
  const [creada] = await pool.execute(
    `INSERT INTO seleccion_plantillas
     (puesto_id, codigo, nombre, activa, definicion, creado_por)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [
      puesto.id,
      puesto.codigo_abreviatura,
      puesto.nombre_puesto,
      escaparComoJson(definicionFinal),
      creadoPor || null,
    ]
  );
  return obtenerDetalle(creada.insertId);
}

async function actualizar(plantillaId, definicion, creadoPor) {
  const plantilla = await buscarPlantilla(plantillaId);
  if (!plantilla) throw errorDeEstado(404, 'La plantilla no existe.');
  if (!definicion) throw errorDeEstado(400, 'Debes enviar la definición de la prueba.');
  const definicionFinal = asegurarDefinicion(definicion);
  await pool.execute(
    `UPDATE seleccion_plantillas
     SET definicion = ?, creado_por = ?
     WHERE id = ?`,
    [escaparComoJson(definicionFinal), creadoPor || null, plantillaId]
  );
  return obtenerDetalle(plantillaId);
}

async function cambiarActiva(plantillaId, activa, creadoPor) {
  const plantilla = await buscarPlantilla(plantillaId);
  if (!plantilla) throw errorDeEstado(404, 'La plantilla no existe.');
  await pool.execute(
    'UPDATE seleccion_plantillas SET activa = ?, creado_por = ? WHERE id = ?',
    [activa ? 1 : 0, creadoPor || null, plantillaId]
  );
  return obtenerDetalle(plantillaId);
}

module.exports = {
  codigosEvaluables,
  definicionEstatica,
  validarDefinicion,
  obtenerDefinicionVigente,
  listar,
  obtenerDetalle,
  crear,
  actualizar,
  cambiarActiva,
};
