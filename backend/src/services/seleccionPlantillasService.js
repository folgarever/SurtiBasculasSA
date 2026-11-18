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

async function esTablaInexistente(error) {
  return error && ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code);
}

async function obtenerDefinicionPublicada(codigo, ejecutor = pool) {
  try {
    const [filas] = await ejecutor.execute(
      `SELECT v.id, v.numero, v.definicion
       FROM seleccion_plantillas p
       INNER JOIN seleccion_plantilla_versiones v
         ON v.plantilla_id = p.id AND v.estado = 'publicada'
       WHERE p.codigo = ? AND p.activa = 1
       LIMIT 1`,
      [codigo]
    );
    const fila = filas[0];
    if (fila) {
      return {
        definicion: parsearDefinicion(fila.definicion),
        versionId: fila.id,
        numero: fila.numero,
        origen: 'bd',
      };
    }
  } catch (error) {
    if (!(await esTablaInexistente(error))) throw error;
  }
  const definicion = definicionEstatica(codigo);
  return definicion
    ? { definicion, versionId: null, numero: null, origen: 'codigo' }
    : null;
}

async function obtenerDefinicionPorVersion(versionId, ejecutor = pool) {
  const [filas] = await ejecutor.execute(
    `SELECT v.id, v.numero, v.estado, v.definicion, p.codigo, p.nombre, p.activa
     FROM seleccion_plantilla_versiones v
     INNER JOIN seleccion_plantillas p ON p.id = v.plantilla_id
     WHERE v.id = ?
     LIMIT 1`,
    [versionId]
  );
  const fila = filas[0];
  if (!fila) throw errorDeEstado(404, 'La versión solicitada no existe.');
  return {
    id: fila.id,
    numero: fila.numero,
    estado: fila.estado,
    codigo: fila.codigo,
    nombre: fila.nombre,
    activa: Boolean(fila.activa),
    definicion: parsearDefinicion(fila.definicion),
  };
}

function resumirVersion(fila) {
  return fila ? {
    id: fila.id,
    numero: fila.numero,
    estado: fila.estado,
    notas: fila.notas,
    creado_en: fila.creado_en,
    publicada_en: fila.publicada_en,
  } : null;
}

async function listar() {
  const codigos = codigosEvaluables();
  const [filas] = await pool.execute(
    `SELECT pu.id AS puesto_id, pu.codigo_abreviatura AS codigo, pu.nombre_puesto,
            pu.departamento, p.id AS plantilla_id, p.activa, p.actualizado_en,
            v.id AS version_id, v.numero, v.estado, v.notas, v.creado_en, v.publicada_en,
            (SELECT COUNT(*) FROM seleccion_plantilla_versiones pv WHERE pv.plantilla_id = p.id) AS total_versiones
     FROM puestos pu
     LEFT JOIN seleccion_plantillas p ON p.puesto_id = pu.id
     LEFT JOIN seleccion_plantilla_versiones v
       ON v.plantilla_id = p.id AND v.estado = 'publicada'
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
    total_versiones: Number(fila.total_versiones || 0),
    actualizado_en: fila.actualizado_en,
    version_publicada: resumirVersion(fila.version_id ? {
      id: fila.version_id,
      numero: fila.numero,
      estado: fila.estado,
      notas: fila.notas,
      creado_en: fila.creado_en,
      publicada_en: fila.publicada_en,
    } : null),
    origen: fila.plantilla_id === null ? 'codigo' : 'bd',
  }));
}

async function buscarPlantilla(plantillaId, ejecutor = pool) {
  const [filas] = await ejecutor.execute(
    `SELECT p.id, p.puesto_id, p.codigo, p.nombre, p.activa, p.actualizado_en, pu.nombre_puesto
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
  const [versiones] = await pool.execute(
    `SELECT id, numero, estado, definicion, notas, creado_por, creado_en, publicada_en
     FROM seleccion_plantilla_versiones
     WHERE plantilla_id = ?
     ORDER BY numero DESC`,
    [plantillaId]
  );
  return {
    ...plantilla,
    activa: Boolean(plantilla.activa),
    versiones: versiones.map((version) => ({
      ...resumirVersion(version),
      definicion: parsearDefinicion(version.definicion),
      creado_por: version.creado_por,
    })),
  };
}

async function crear(puestoId, definicion, notas, creadoPor) {
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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [creada] = await connection.execute(
      'INSERT INTO seleccion_plantillas (puesto_id, codigo, nombre) VALUES (?, ?, ?)',
      [puesto.id, puesto.codigo_abreviatura, puesto.nombre_puesto]
    );
    await connection.execute(
      `INSERT INTO seleccion_plantilla_versiones
       (plantilla_id, numero, estado, definicion, notas, creado_por)
       VALUES (?, 1, 'borrador', ?, ?, ?)`,
      [creada.insertId, escaparComoJson(definicionFinal), notas || null, creadoPor || null]
    );
    await connection.commit();
    return obtenerDetalle(creada.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function actualizarBorrador(plantillaId, definicion, notas, creadoPor) {
  const plantilla = await buscarPlantilla(plantillaId);
  if (!plantilla) throw errorDeEstado(404, 'La plantilla no existe.');
  const definicionFinal = definicion ? asegurarDefinicion(definicion) : null;
  const [borradores] = await pool.execute(
    `SELECT id, definicion FROM seleccion_plantilla_versiones
     WHERE plantilla_id = ? AND estado = 'borrador'
     ORDER BY numero DESC LIMIT 1`,
    [plantillaId]
  );
  const borrador = borradores[0];
  const definicionBase = definicionFinal || parsearDefinicion(borrador?.definicion);
  if (!definicionBase) throw errorDeEstado(400, 'Debes enviar la definición de la prueba.');
  asegurarDefinicion(definicionBase);

  if (borrador) {
    await pool.execute(
      `UPDATE seleccion_plantilla_versiones
       SET definicion = ?, notas = ?, creado_por = ?
       WHERE id = ?`,
      [escaparComoJson(definicionBase), notas || null, creadoPor || null, borrador.id]
    );
    return obtenerDetalle(plantillaId);
  }

  const [maximo] = await pool.execute(
    'SELECT COALESCE(MAX(numero), 0) AS numero FROM seleccion_plantilla_versiones WHERE plantilla_id = ?',
    [plantillaId]
  );
  const numero = Number(maximo[0].numero) + 1;
  await pool.execute(
    `INSERT INTO seleccion_plantilla_versiones
     (plantilla_id, numero, estado, definicion, notas, creado_por)
     VALUES (?, ?, 'borrador', ?, ?, ?)`,
    [plantillaId, numero, escaparComoJson(definicionBase), notas || null, creadoPor || null]
  );
  return obtenerDetalle(plantillaId);
}

async function publicar(plantillaId, creadoPor) {
  const plantilla = await buscarPlantilla(plantillaId);
  if (!plantilla) throw errorDeEstado(404, 'La plantilla no existe.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [borradores] = await connection.execute(
      `SELECT id, definicion FROM seleccion_plantilla_versiones
       WHERE plantilla_id = ? AND estado = 'borrador'
       ORDER BY numero DESC LIMIT 1 FOR UPDATE`,
      [plantillaId]
    );
    const borrador = borradores[0];
    if (!borrador) throw errorDeEstado(409, 'No hay un borrador pendiente de publicación.');
    asegurarDefinicion(parsearDefinicion(borrador.definicion));

    await connection.execute(
      `UPDATE seleccion_plantilla_versiones
       SET estado = 'archivada'
       WHERE plantilla_id = ? AND estado = 'publicada'`,
      [plantillaId]
    );
    await connection.execute(
      `UPDATE seleccion_plantilla_versiones
       SET estado = 'publicada', publicada_en = CURRENT_TIMESTAMP, creado_por = COALESCE(?, creado_por)
       WHERE id = ?`,
      [creadoPor || null, borrador.id]
    );
    await connection.execute('UPDATE seleccion_plantillas SET activa = 1 WHERE id = ?', [plantillaId]);
    await connection.commit();
    return obtenerDetalle(plantillaId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cambiarActiva(plantillaId, activa, creadoPor) {
  const plantilla = await buscarPlantilla(plantillaId);
  if (!plantilla) throw errorDeEstado(404, 'La plantilla no existe.');
  if (activa) {
    const [publicadas] = await pool.execute(
      `SELECT id FROM seleccion_plantilla_versiones
       WHERE plantilla_id = ? AND estado = 'publicada' LIMIT 1`,
      [plantillaId]
    );
    if (!publicadas.length) throw errorDeEstado(409, 'La plantilla no tiene una versión publicada.');
  }
  await pool.execute(
    'UPDATE seleccion_plantillas SET activa = ? WHERE id = ?',
    [activa ? 1 : 0, plantillaId]
  );
  return obtenerDetalle(plantillaId);
}

async function restaurarVersion(plantillaId, versionId, creadoPor) {
  const version = await obtenerDefinicionPorVersion(versionId);
  if (version.codigo !== (await buscarPlantilla(plantillaId))?.codigo) {
    throw errorDeEstado(400, 'La versión no pertenece a esta plantilla.');
  }
  await pool.execute(
    `DELETE FROM seleccion_plantilla_versiones
     WHERE plantilla_id = ? AND estado = 'borrador'`,
    [plantillaId]
  );
  return actualizarBorrador(plantillaId, version.definicion, `Restaurada desde versión ${version.numero}`, creadoPor);
}

module.exports = {
  codigosEvaluables,
  definicionEstatica,
  validarDefinicion,
  obtenerDefinicionPublicada,
  obtenerDefinicionPorVersion,
  listar,
  obtenerDetalle,
  crear,
  actualizarBorrador,
  publicar,
  cambiarActiva,
  restaurarVersion,
};
