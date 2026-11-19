const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { CODIGO_ADMIN_RRHH, CODIGO_GERENTE_GENERAL } = require('../config/authorization');

function filtrosReporte(query) {
  const condiciones = [];
  const parametros = [];

  if (query.fecha_inicio) {
    condiciones.push('m.fecha >= ?');
    parametros.push(query.fecha_inicio);
  }
  if (query.fecha_fin) {
    condiciones.push('m.fecha <= ?');
    parametros.push(query.fecha_fin);
  }
  if (query.codigo_empleado) {
    condiciones.push('(e.codigo_empleado LIKE ? OR e.nombre LIKE ?)');
    parametros.push(`%${query.codigo_empleado}%`, `%${query.codigo_empleado}%`);
  }
  if (query.empleado_id && /^\d+$/.test(String(query.empleado_id))) {
    condiciones.push('m.empleado_id = ?');
    parametros.push(Number(query.empleado_id));
  }

  return {
    where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
    parametros
  };
}

const consultaAsistencias = `
  SELECT m.id, e.id AS empleado_id, e.codigo_empleado, e.nombre, p.nombre_puesto, m.fecha,
         m.hora_entrada, m.hora_salida, m.estado_entrada, m.estado_salida,
         m.horas_extras, m.justificacion_horas_extras
  FROM marcaciones m
  INNER JOIN empleados e ON e.id = m.empleado_id
  INNER JOIN puestos p ON p.id = e.puesto_id
`;

async function obtenerTodasAsistencias(req, res, next) {
  try {
    const filtros = filtrosReporte(req.query);
    const [asistencias] = await pool.execute(
      `${consultaAsistencias} ${filtros.where} ORDER BY m.fecha DESC, e.nombre ASC`,
      filtros.parametros
    );
    return res.json({ asistencias });
  } catch (error) {
    return next(error);
  }
}

async function obtenerEmpleadosActivos(req, res, next) {
  try {
    const [empleados] = await pool.execute(
      `SELECT id, codigo_empleado, nombre
       FROM empleados
       WHERE activo = 1
       ORDER BY nombre ASC`
    );
    return res.json({ empleados });
  } catch (error) {
    return next(error);
  }
}

async function obtenerEmpleadosAdministracion(req, res, next) {
  try {
    const [empleados] = await pool.execute(
      `SELECT e.id, e.codigo_empleado, e.nombre, e.puesto_id, e.activo, p.nombre_puesto, r.nombre AS rol
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       INNER JOIN roles r ON r.id = e.rol_id
       ORDER BY e.nombre ASC`
    );
    return res.json({ empleados });
  } catch (error) {
    return next(error);
  }
}

async function obtenerEmpleadoAdministracion(req, res, next) {
  try {
    const [empleados] = await pool.execute(
      `SELECT e.id, e.codigo_empleado, e.nombre, e.puesto_id, e.activo, p.nombre_puesto, r.nombre AS rol
       FROM empleados e
       INNER JOIN puestos p ON p.id = e.puesto_id
       INNER JOIN roles r ON r.id = e.rol_id
       WHERE e.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!empleados[0]) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
    }

    return res.json({ empleado: empleados[0] });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPuestos(req, res, next) {
  try {
    const [puestos] = await pool.execute(
      `SELECT id, codigo_abreviatura, nombre_puesto, departamento,
              frecuencia_evaluacion, es_admin
       FROM puestos ORDER BY nombre_puesto ASC`
    );
    return res.json({ puestos });
  } catch (error) {
    return next(error);
  }
}

function validarDatosPuesto(body) {
  const codigo = typeof body?.codigo_abreviatura === 'string'
    ? body.codigo_abreviatura.trim().toUpperCase()
    : '';
  const nombre = typeof body?.nombre_puesto === 'string' ? body.nombre_puesto.trim() : '';
  const departamento = typeof body?.departamento === 'string' ? body.departamento.trim() : '';
  const frecuencia = body?.frecuencia_evaluacion;
  const esAdmin = body?.es_admin === true || body?.es_admin === 1
    ? 1
    : body?.es_admin === false || body?.es_admin === 0 ? 0 : null;

  if (
    !/^[A-Z0-9]{1,10}$/.test(codigo)
    || nombre.length < 2
    || nombre.length > 100
    || departamento.length < 1
    || departamento.length > 100
    || !['mensual', 'quincenal', 'semanal'].includes(frecuencia)
    || esAdmin === null
  ) {
    return null;
  }

  return {
    codigo_abreviatura: codigo,
    nombre_puesto: nombre,
    departamento,
    frecuencia_evaluacion: frecuencia,
    es_admin: esAdmin
  };
}

async function registrarPuesto(req, res, next) {
  const datos = validarDatosPuesto(req.body);
  if (!datos) {
    return res.status(400).json({
      mensaje: 'Revisa el código (1 a 10 letras o números), nombre, departamento, frecuencia y permiso ADMIN.'
    });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [existentes] = await connection.execute(
      'SELECT id FROM puestos WHERE codigo_abreviatura = ? LIMIT 1',
      [datos.codigo_abreviatura]
    );
    if (existentes[0]) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(409).json({
        mensaje: 'Ya existe un puesto con esa abreviatura. Elige un código diferente.'
      });
    }

    const [resultado] = await connection.execute(
      `INSERT INTO puestos
         (codigo_abreviatura, nombre_puesto, departamento, frecuencia_evaluacion, es_admin)
       VALUES (?, ?, ?, ?, ?)`,
      [datos.codigo_abreviatura, datos.nombre_puesto, datos.departamento,
        datos.frecuencia_evaluacion, datos.es_admin]
    );

    await connection.commit();
    transaccionIniciada = false;
    return res.status(201).json({
      mensaje: 'Puesto registrado correctamente.',
      puesto: { id: resultado.insertId, ...datos }
    });
  } catch (error) {
    if (connection && transaccionIniciada) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un puesto con esa abreviatura.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function actualizarPuesto(req, res, next) {
  const puestoId = Number(req.params.id);
  const datos = validarDatosPuesto(req.body);
  if (!Number.isInteger(puestoId) || puestoId < 1 || !datos) {
    return res.status(400).json({
      mensaje: 'Revisa el identificador, el código, nombre, departamento, frecuencia y permiso ADMIN.'
    });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [puestos] = await connection.execute(
      `SELECT id, codigo_abreviatura, es_admin
       FROM puestos WHERE id = ? FOR UPDATE`,
      [puestoId]
    );
    const puesto = puestos[0];
    if (!puesto) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
    }

    const [cuentasProtegidas] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM empleados
       WHERE puesto_id = ? AND activo = 1 AND codigo_empleado IN (?, ?)`,
      [puestoId, CODIGO_GERENTE_GENERAL, CODIGO_ADMIN_RRHH]
    );
    if (
      Number(cuentasProtegidas[0].total) > 0
      && (
        puesto.codigo_abreviatura !== datos.codigo_abreviatura
        || Number(puesto.es_admin) === 1 && datos.es_admin === 0
      )
    ) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(400).json({
        mensaje: 'Este puesto pertenece a una cuenta ADMIN protegida: no se puede cambiar su código ni quitarle el permiso ADMIN.'
      });
    }

    const [duplicados] = await connection.execute(
      'SELECT id FROM puestos WHERE codigo_abreviatura = ? AND id <> ? LIMIT 1',
      [datos.codigo_abreviatura, puestoId]
    );
    if (duplicados[0]) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(409).json({
        mensaje: 'Ya existe otro puesto con esa abreviatura.'
      });
    }

    await connection.execute(
      `UPDATE puestos
       SET codigo_abreviatura = ?, nombre_puesto = ?, departamento = ?,
           frecuencia_evaluacion = ?, es_admin = ?
       WHERE id = ?`,
      [datos.codigo_abreviatura, datos.nombre_puesto, datos.departamento,
        datos.frecuencia_evaluacion, datos.es_admin, puestoId]
    );

    let empleadosActualizados = 0;
    if (Number(puesto.es_admin) !== datos.es_admin) {
      const nombreRol = datos.es_admin === 1 ? 'ADMIN' : 'Empleado';
      const [roles] = await connection.execute(
        'SELECT id FROM roles WHERE nombre = ? LIMIT 1',
        [nombreRol]
      );
      if (!roles[0]) {
        throw new Error(`No existe el rol ${nombreRol}.`);
      }
      const [propagacion] = await connection.execute(
        `UPDATE empleados
         SET rol_id = ?
         WHERE puesto_id = ? AND activo = 1
           AND codigo_empleado NOT IN (?, ?)`,
        [roles[0].id, puestoId, CODIGO_GERENTE_GENERAL, CODIGO_ADMIN_RRHH]
      );
      empleadosActualizados = propagacion.affectedRows || 0;
    }

    await connection.commit();
    transaccionIniciada = false;
    return res.json({
      mensaje: empleadosActualizados > 0
        ? `Puesto actualizado. El rol de ${empleadosActualizados} empleado(s) se ajustó al nuevo permiso.`
        : 'Puesto actualizado correctamente.',
      puesto: { id: puestoId, ...datos }
    });
  } catch (error) {
    if (connection && transaccionIniciada) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe otro puesto con esa abreviatura.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function registrarEmpleado(req, res, next) {
  const { nombre, puesto_id: puestoId, password } = req.body || {};
  const nombreEmpleado = typeof nombre === 'string' ? nombre.trim() : '';
  const idPuesto = Number(puestoId);

  if (
    nombreEmpleado.length < 2
    || nombreEmpleado.length > 100
    || !Number.isInteger(idPuesto)
    || idPuesto < 1
    || typeof password !== 'string'
    || password.length < 6
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      mensaje: 'Indica un nombre válido, un puesto y una contraseña de entre 6 y 72 bytes.'
    });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [puestos] = await connection.execute(
      'SELECT codigo_abreviatura, es_admin FROM puestos WHERE id = ? FOR UPDATE',
      [idPuesto]
    );
    if (!puestos[0]) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(400).json({ mensaje: 'El puesto seleccionado no existe.' });
    }

    const destinoAdmin = Number(puestos[0].es_admin) === 1;
    if (destinoAdmin && req.usuario?.codigo_empleado !== CODIGO_GERENTE_GENERAL) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(403).json({
        mensaje: 'Solo el Gerente General puede asignar un puesto con permisos de ADMIN.'
      });
    }

    const nombreRol = destinoAdmin ? 'ADMIN' : 'Empleado';
    const [roles] = await connection.execute(
      'SELECT id FROM roles WHERE nombre = ? LIMIT 1',
      [nombreRol]
    );
    const [horarios] = await connection.execute(
      'SELECT id FROM horarios ORDER BY id ASC LIMIT 1'
    );
    if (!roles[0] || !horarios[0]) {
      throw new Error('No hay un rol configurado o un horario configurado.');
    }

    const prefijo = `SUR-${puestos[0].codigo_abreviatura}-`;
    const [secuencias] = await connection.execute(
      `SELECT MAX(CAST(SUBSTRING(codigo_empleado, CHAR_LENGTH(?) + 1) AS UNSIGNED)) AS ultimo
       FROM empleados
       WHERE codigo_empleado LIKE ?`,
      [prefijo, `${prefijo}%`]
    );
    const codigoEmpleado = `${prefijo}${String(Number(secuencias[0].ultimo || 0) + 1).padStart(3, '0')}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const [resultado] = await connection.execute(
      `INSERT INTO empleados
         (codigo_empleado, nombre, password_hash, rol_id, puesto_id, horario_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [codigoEmpleado, nombreEmpleado, passwordHash, roles[0].id, idPuesto, horarios[0].id]
    );

    await connection.commit();
    transaccionIniciada = false;
    return res.status(201).json({
      mensaje: 'Empleado registrado correctamente.',
      empleado: { id: resultado.insertId, codigo_empleado: codigoEmpleado }
    });
  } catch (error) {
    if (connection && transaccionIniciada) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'No se pudo asignar un código único. Intenta nuevamente.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function actualizarEmpleado(req, res, next) {
  const empleadoId = Number(req.params.id);
  const { nombre, puesto_id: puestoId, activo, password } = req.body || {};
  const nombreEmpleado = typeof nombre === 'string' ? nombre.trim() : '';
  const idPuesto = Number(puestoId);
  const estadoActivo = activo === true || activo === 1 ? 1 : activo === false || activo === 0 ? 0 : null;
  const actualizarPassword = typeof password === 'string' && password.length > 0;
  const passwordValida = password === undefined
    || password === ''
    || (
      typeof password === 'string'
      && password.length >= 6
      && Buffer.byteLength(password, 'utf8') <= 72
    );

  if (
    !Number.isInteger(empleadoId)
    || empleadoId < 1
    || nombreEmpleado.length < 2
    || nombreEmpleado.length > 100
    || !Number.isInteger(idPuesto)
    || idPuesto < 1
    || estadoActivo === null
    || !passwordValida
  ) {
    return res.status(400).json({ mensaje: 'Revisa el nombre, puesto, estado y contraseña del empleado.' });
  }

  let connection;
  let transaccionIniciada = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [empleados] = await connection.execute(
      `SELECT e.codigo_empleado, e.puesto_id, r.nombre AS rol
       FROM empleados e
       INNER JOIN roles r ON r.id = e.rol_id
       WHERE e.id = ?
       FOR UPDATE`,
      [empleadoId]
    );
    const empleado = empleados[0];
    const puedeEditarAdminSubordinado = req.usuario?.codigo_empleado === CODIGO_GERENTE_GENERAL
      && empleado?.codigo_empleado === CODIGO_ADMIN_RRHH;
    if (
      !empleado
      || empleadoId === Number(req.usuario?.id)
      || (empleado.rol === 'ADMIN' && !puedeEditarAdminSubordinado)
    ) {
      await connection.rollback();
      transaccionIniciada = false;
      return res.status(404).json({ mensaje: 'Empleado no encontrado o no disponible para edición.' });
    }

    let codigoEmpleado = empleado.codigo_empleado;
    let rolId = null;
    if (Number(empleado.puesto_id) !== idPuesto) {
      if (empleado.rol === 'ADMIN') {
        await connection.rollback();
        transaccionIniciada = false;
        return res.status(400).json({
          mensaje: 'No se puede cambiar el puesto de una cuenta administradora porque modificaría su código y sus permisos.'
        });
      }

      const [puestos] = await connection.execute(
        'SELECT codigo_abreviatura, es_admin FROM puestos WHERE id = ? FOR UPDATE',
        [idPuesto]
      );
      if (!puestos[0]) {
        await connection.rollback();
        transaccionIniciada = false;
        return res.status(400).json({ mensaje: 'El puesto seleccionado no existe.' });
      }

      const destinoAdmin = Number(puestos[0].es_admin) === 1;
      if (destinoAdmin && req.usuario?.codigo_empleado !== CODIGO_GERENTE_GENERAL) {
        await connection.rollback();
        transaccionIniciada = false;
        return res.status(403).json({
          mensaje: 'Solo el Gerente General puede asignar un puesto con permisos de ADMIN.'
        });
      }
      const [roles] = await connection.execute(
        'SELECT id FROM roles WHERE nombre = ? LIMIT 1',
        [destinoAdmin ? 'ADMIN' : 'Empleado']
      );
      if (!roles[0]) {
        throw new Error('No hay un rol configurado.');
      }
      rolId = roles[0].id;

      const prefijo = `SUR-${puestos[0].codigo_abreviatura}-`;
      const [secuencias] = await connection.execute(
        `SELECT MAX(CAST(SUBSTRING(codigo_empleado, CHAR_LENGTH(?) + 1) AS UNSIGNED)) AS ultimo
         FROM empleados
         WHERE codigo_empleado LIKE ?`,
        [prefijo, `${prefijo}%`]
      );
      codigoEmpleado = `${prefijo}${String(Number(secuencias[0].ultimo || 0) + 1).padStart(3, '0')}`;
    }

    const asignaciones = ['codigo_empleado = ?', 'nombre = ?', 'puesto_id = ?', 'activo = ?'];
    const valores = [codigoEmpleado, nombreEmpleado, idPuesto, estadoActivo];
    if (rolId !== null) {
      asignaciones.push('rol_id = ?');
      valores.push(rolId);
    }
    if (actualizarPassword) {
      asignaciones.push('password_hash = ?');
      valores.push(await bcrypt.hash(password, 10));
    }

    await connection.execute(
      `UPDATE empleados SET ${asignaciones.join(', ')} WHERE id = ?`,
      [...valores, empleadoId]
    );
    await connection.commit();
    transaccionIniciada = false;
    return res.json({
      mensaje: 'Empleado actualizado correctamente.',
      empleado: { id: empleadoId, codigo_empleado: codigoEmpleado }
    });
  } catch (error) {
    if (connection && transaccionIniciada) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'No se pudo asignar un código único. Intenta nuevamente.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function eliminarEmpleado(req, res, next) {
  const empleadoId = Number(req.params.id);
  if (!Number.isInteger(empleadoId) || empleadoId < 1) {
    return res.status(400).json({ mensaje: 'El empleado indicado no es válido.' });
  }

  try {
    const [resultado] = await pool.execute(
      `UPDATE empleados e
       INNER JOIN roles r ON r.id = e.rol_id
       SET e.activo = 0
       WHERE e.id = ? AND r.nombre <> 'ADMIN' AND e.id <> ?`,
      [empleadoId, req.usuario?.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado o no disponible para dar de baja.' });
    }
    return res.json({ mensaje: 'Empleado dado de baja. Se conservó su historial.' });
  } catch (error) {
    return next(error);
  }
}

async function corregirMarcacion(req, res, next) {
  const {
    marcacion_id: marcacionId,
    hora_entrada: horaEntrada,
    hora_salida: horaSalida,
    horas_extras: horasExtras,
    justificacion_horas_extras: justificacionExtras,
    motivo
  } = req.body || {};
  const camposPermitidos = ['hora_entrada', 'hora_salida', 'horas_extras', 'justificacion_horas_extras'];
  const camposRecibidos = camposPermitidos.filter((campo) => Object.hasOwn(req.body || {}, campo));

  if (!marcacionId || camposRecibidos.length === 0 || !String(motivo || '').trim()) {
    return res.status(400).json({ mensaje: 'Indica la marcación, al menos un campo a corregir y el motivo.' });
  }
  if (camposRecibidos.includes('horas_extras') && !/^\d+$/.test(String(horasExtras))) {
    return res.status(400).json({ mensaje: 'Las horas extras deben ser un número entero.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [filas] = await connection.execute(
      `SELECT id, hora_entrada, hora_salida, horas_extras, justificacion_horas_extras
       FROM marcaciones WHERE id = ? FOR UPDATE`,
      [marcacionId]
    );
    if (!filas[0]) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Marcación no encontrada.' });
    }

    const anterior = filas[0];
    const valoresPorCampo = {
      hora_entrada: camposRecibidos.includes('hora_entrada') ? horaEntrada || null : anterior.hora_entrada,
      hora_salida: camposRecibidos.includes('hora_salida') ? horaSalida || null : anterior.hora_salida,
      horas_extras: camposRecibidos.includes('horas_extras') ? Number(horasExtras) : anterior.horas_extras,
      justificacion_horas_extras: camposRecibidos.includes('justificacion_horas_extras')
        ? String(justificacionExtras || '').trim() || null
        : anterior.justificacion_horas_extras
    };
    const asignaciones = camposRecibidos.map((campo) => `${campo} = ?`).join(', ');
    const valores = camposRecibidos.map((campo) => valoresPorCampo[campo]);

    await connection.execute(
      `UPDATE marcaciones SET ${asignaciones} WHERE id = ?`,
      [...valores, marcacionId]
    );
    await connection.execute(
      `INSERT INTO historial_correcciones
       (marcacion_id, modificado_por, hora_entrada_anterior, hora_salida_anterior,
        hora_entrada_nueva, hora_salida_nueva, motivo_modificacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [marcacionId, req.usuario.id, anterior.hora_entrada, anterior.hora_salida,
        valoresPorCampo.hora_entrada, valoresPorCampo.hora_salida,
        `${String(motivo).trim()} | extras: ${anterior.horas_extras ?? 0} → ${valoresPorCampo.horas_extras ?? 0} | justificación: ${valoresPorCampo.justificacion_horas_extras ?? '-'}`]
    );

    await connection.commit();
    return res.json({ mensaje: 'Marcación corregida y cambio auditado.' });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function obtenerDetalleEmpleado(req, res, next) {
  const empleadoId = Number(req.params.id);
  if (!Number.isInteger(empleadoId) || empleadoId <= 0) {
    return res.status(400).json({ mensaje: 'El identificador del empleado no es válido.' });
  }

  try {
    const [
      [empleados],
      [asistencias],
      [indicadores],
      [evaluaciones],
      [conocimiento],
      [incidencias]
    ] = await Promise.all([
      pool.execute(
        `SELECT e.id, e.codigo_empleado, e.nombre, e.puesto_id, e.activo, p.nombre_puesto, r.nombre AS rol
         FROM empleados e
         INNER JOIN puestos p ON p.id = e.puesto_id
         INNER JOIN roles r ON r.id = e.rol_id
         WHERE e.id = ?
         LIMIT 1`,
        [empleadoId]
      ),
      pool.execute(
        `SELECT id, fecha, hora_entrada, hora_salida, estado_entrada, estado_salida,
                horas_extras, justificacion_horas_extras
         FROM marcaciones
         WHERE empleado_id = ?
         ORDER BY fecha DESC, id DESC
         LIMIT 60`,
        [empleadoId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS dias_registrados,
                SUM(estado_entrada = 'atraso') AS atrasos,
                SUM(estado_entrada IN ('puntual', 'tolerancia')) AS entradas_puntuales,
                SUM(horas_extras) AS horas_extras
         FROM marcaciones
         WHERE empleado_id = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        [empleadoId]
      ),
      pool.execute(
        `SELECT ev.id, ev.fecha_evaluacion, ev.periodo, ev.presentacion, ev.desempeno,
                ev.atencion_cliente, ev.puntualidad, ev.conocimientos, ev.comentarios,
                ev.observaciones,
                ROUND((ev.presentacion + ev.desempeno + ev.atencion_cliente
                  + ev.puntualidad + ev.conocimientos) / 5, 2) AS promedio_general,
                ej.supervision_operaciones, ej.gestion_liderazgo_campo,
                ej.control_calidad_calibracion, ej.gestion_recursos_inventario,
                ej.atencion_tecnica_cliente, ej.liderazgo_personal,
                ej.toma_decisiones_presion, ej.pensamiento_analitico,
                ej.organizacion_planificacion
         FROM evaluaciones ev
         LEFT JOIN evaluaciones_jefatura ej ON ej.evaluacion_id = ev.id
         WHERE ev.empleado_id = ?
         ORDER BY ev.fecha_evaluacion DESC, ev.id DESC`,
        [empleadoId]
      ),
      pool.execute(
        `SELECT ec.id, ec.periodo, ec.estado, ec.total_preguntas, ec.respuestas_correctas,
                ec.puntos_obtenidos, ec.puntos_totales, ec.porcentaje, ec.resultado,
                ec.fecha_realizacion, p.nombre_puesto, p.departamento
         FROM evaluaciones_conocimiento ec
         INNER JOIN puestos p ON p.id = ec.puesto_id
         WHERE ec.empleado_id = ?
         ORDER BY ec.fecha_realizacion DESC, ec.creado_en DESC, ec.id DESC`,
        [empleadoId]
      ),
      pool.execute(
        `SELECT id, fecha_inicio, fecha_fin, tipo, motivo, registrado_por
         FROM incidencias_permisos
         WHERE empleado_id = ?
         ORDER BY fecha_inicio DESC, id DESC`,
        [empleadoId]
      )
    ]);

    if (!empleados[0]) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
    }

    const resumen = indicadores[0] || {};
    const dias = Number(resumen.dias_registrados) || 0;
    const atrasos = Number(resumen.atrasos) || 0;
    const puntuales = Number(resumen.entradas_puntuales) || 0;

    return res.json({
      empleado: empleados[0],
      indicadores: {
        dias_registrados_30d: dias,
        atrasos_30d: atrasos,
        puntualidad_30d: dias ? Math.round((puntuales / dias) * 1000) / 10 : 0,
        horas_extras_30d: Number(resumen.horas_extras) || 0
      },
      asistencias,
      evaluaciones,
      conocimiento,
      incidencias
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerIncidencias(req, res, next) {
  try {
    const condiciones = [];
    const parametros = [];
    if (req.query.empleado_id && /^\d+$/.test(String(req.query.empleado_id))) {
      condiciones.push('i.empleado_id = ?');
      parametros.push(Number(req.query.empleado_id));
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [incidencias] = await pool.execute(
      `SELECT i.id, i.empleado_id, e.codigo_empleado, e.nombre, i.fecha_inicio, i.fecha_fin,
              i.tipo, i.motivo, i.registrado_por
       FROM incidencias_permisos i
       INNER JOIN empleados e ON e.id = i.empleado_id
       ${where}
       ORDER BY i.fecha_inicio DESC, i.id DESC`,
      parametros
    );

    return res.json({ incidencias });
  } catch (error) {
    return next(error);
  }
}

async function registrarIncidencia(req, res, next) {
  const {
    empleado_id: empleadoId,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    tipo,
    motivo
  } = req.body || {};
  const tiposPermitidos = ['permiso_oficial', 'ausencia_justificada', 'suspension', 'vacaciones'];

  if (!empleadoId || !fechaInicio || !fechaFin || !tiposPermitidos.includes(tipo) || !String(motivo || '').trim()) {
    return res.status(400).json({ mensaje: 'Datos de incidencia incompletos o inválidos.' });
  }
  if (fechaInicio > fechaFin) {
    return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser posterior a la fecha final.' });
  }

  try {
    const [resultado] = await pool.execute(
      `INSERT INTO incidencias_permisos
       (empleado_id, fecha_inicio, fecha_fin, tipo, motivo, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [empleadoId, fechaInicio, fechaFin, tipo, String(motivo).trim(), req.usuario.id]
    );
    return res.status(201).json({ mensaje: 'Incidencia registrada.', id: resultado.insertId });
  } catch (error) {
    return next(error);
  }
}

async function exportarReporteExcel(req, res, next) {
  try {
    const filtros = filtrosReporte(req.query);
    const [asistencias] = await pool.execute(
      `${consultaAsistencias} ${filtros.where} ORDER BY m.fecha DESC, e.nombre ASC`,
      filtros.parametros
    );

    const condicionesIncidencias = [];
    const parametrosIncidencias = [];
    if (req.query.fecha_inicio) {
      condicionesIncidencias.push('i.fecha_fin >= ?');
      parametrosIncidencias.push(req.query.fecha_inicio);
    }
    if (req.query.fecha_fin) {
      condicionesIncidencias.push('i.fecha_inicio <= ?');
      parametrosIncidencias.push(req.query.fecha_fin);
    }
    if (req.query.codigo_empleado) {
      condicionesIncidencias.push('(e.codigo_empleado LIKE ? OR e.nombre LIKE ?)');
      parametrosIncidencias.push(`%${req.query.codigo_empleado}%`, `%${req.query.codigo_empleado}%`);
    }
    if (req.query.empleado_id && /^\d+$/.test(String(req.query.empleado_id))) {
      condicionesIncidencias.push('i.empleado_id = ?');
      parametrosIncidencias.push(Number(req.query.empleado_id));
    }
    const whereIncidencias = condicionesIncidencias.length
      ? `WHERE ${condicionesIncidencias.join(' AND ')}`
      : '';
    const [incidencias] = await pool.execute(
      `SELECT e.codigo_empleado, e.nombre, i.fecha_inicio, i.fecha_fin, i.tipo, i.motivo
       FROM incidencias_permisos i
       INNER JOIN empleados e ON e.id = i.empleado_id
       ${whereIncidencias}
       ORDER BY i.fecha_inicio DESC, e.nombre ASC`,
      parametrosIncidencias
    );

    const libro = new ExcelJS.Workbook();
    libro.creator = 'SURTIBÁSCULAS S.A.';
    libro.created = new Date();

    const hojaAsistencias = libro.addWorksheet('Asistencias');
    hojaAsistencias.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Código', key: 'codigo_empleado', width: 18 },
      { header: 'Empleado', key: 'nombre', width: 30 },
      { header: 'Puesto', key: 'nombre_puesto', width: 24 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Entrada', key: 'hora_entrada', width: 22 },
      { header: 'Salida', key: 'hora_salida', width: 22 },
      { header: 'Estado entrada', key: 'estado_entrada', width: 18 },
      { header: 'Estado salida', key: 'estado_salida', width: 18 },
      { header: 'Horas extras', key: 'horas_extras', width: 14 },
      { header: 'Justificación', key: 'justificacion_horas_extras', width: 50 }
    ];
    hojaAsistencias.addRows(asistencias);
    hojaAsistencias.getRow(1).font = { bold: true };
    hojaAsistencias.views = [{ state: 'frozen', ySplit: 1 }];
    hojaAsistencias.autoFilter = { from: 'A1', to: 'K1' };

    const hojaIncidencias = libro.addWorksheet('Incidencias');
    hojaIncidencias.columns = [
      { header: 'Código', key: 'codigo_empleado', width: 18 },
      { header: 'Empleado', key: 'nombre', width: 30 },
      { header: 'Fecha inicio', key: 'fecha_inicio', width: 16 },
      { header: 'Fecha fin', key: 'fecha_fin', width: 16 },
      { header: 'Tipo', key: 'tipo', width: 24 },
      { header: 'Motivo', key: 'motivo', width: 50 }
    ];
    hojaIncidencias.addRows(incidencias);
    hojaIncidencias.getRow(1).font = { bold: true };
    hojaIncidencias.views = [{ state: 'frozen', ySplit: 1 }];
    hojaIncidencias.autoFilter = { from: 'A1', to: 'F1' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-surtibasculas.xlsx"');
    await libro.xlsx.write(res);
    return res.end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obtenerTodasAsistencias,
  obtenerEmpleadosActivos,
  obtenerEmpleadosAdministracion,
  obtenerEmpleadoAdministracion,
  obtenerDetalleEmpleado,
  obtenerPuestos,
  registrarPuesto,
  actualizarPuesto,
  registrarEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  corregirMarcacion,
  obtenerIncidencias,
  registrarIncidencia,
  exportarReporteExcel
};