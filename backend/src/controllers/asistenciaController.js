const pool = require('../config/db');
const { CODIGO_GERENTE_GENERAL } = require('../config/authorization');

const ZONA_HORARIA = 'America/Guatemala';

const HORA_ENTRADA_REFERENCIA = '08:00:00';
const TOLERANCIA_ENTRADA = '08:15:00';
const TOLERANCIA_SALIDA = '18:00:00';
const MINIMO_JUSTIFICACION = 4;
const MAXIMO_JUSTIFICACION = 1000;

function normalizarJustificacion(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function esHoraValida(hora) {
  return typeof hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(hora);
}

function clasificarEntrada(hora, horaReferencia) {
  const referencia = esHoraValida(horaReferencia) ? horaReferencia : HORA_ENTRADA_REFERENCIA;
  return hora > referencia && hora <= TOLERANCIA_ENTRADA
    ? 'tolerancia'
    : hora <= referencia
      ? 'puntual'
      : 'atraso';
}

function calcularSalida(hora, horaReferencia) {
  const [horas, minutos, segundos] = hora.split(':').map(Number);
  const totalSegundos = horas * 3600 + minutos * 60 + segundos;
  const [horasReferencia, minutosReferencia] = (
    esHoraValida(horaReferencia) ? horaReferencia : '17:00:00'
  ).split(':').map(Number);
  const referenciaSegundos = horasReferencia * 3600 + minutosReferencia * 60;

  if (totalSegundos < referenciaSegundos) {
    return { estado: 'anticipada', horasExtras: 0, requiereJustificacion: false };
  }

  const requiereJustificacion = hora >= TOLERANCIA_SALIDA;
  if (!requiereJustificacion) {
    return { estado: 'normal', horasExtras: 0, requiereJustificacion: false };
  }

  const [horasTolerancia] = TOLERANCIA_SALIDA.split(':').map(Number);
  const segundosExtras = totalSegundos - horasTolerancia * 3600;
  return {
    estado: 'normal',
    horasExtras: Math.max(0, Math.floor(segundosExtras / 3600)),
    requiereJustificacion: true
  };
}

function fechaHoraLocal() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));

  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}`,
    fechaHora: `${valores.year}-${valores.month}-${valores.day} ${valores.hour}:${valores.minute}:${valores.second}`,
    hora: `${valores.hour}:${valores.minute}:${valores.second}`
  };
}

async function registrarMarcacion(req, res, next) {
  if (req.usuario.codigo_empleado === CODIGO_GERENTE_GENERAL) {
    return res.status(403).json({
      mensaje: 'La cuenta del Gerente General está exenta de registrar asistencia.',
    });
  }

  const empleadoId = req.usuario.id;
  const ahora = fechaHoraLocal();

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [empleados] = await connection.execute(
      `SELECT h.hora_entrada, h.hora_salida
       FROM empleados e
       INNER JOIN horarios h ON h.id = e.horario_id
       WHERE e.id = ? AND e.activo = 1
       FOR UPDATE`,
      [empleadoId]
    );

    if (!empleados[0]) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Empleado no encontrado o inactivo.' });
    }

    const [marcaciones] = await connection.execute(
      'SELECT id, hora_entrada, hora_salida FROM marcaciones WHERE empleado_id = ? AND fecha = ? FOR UPDATE',
      [empleadoId, ahora.fecha]
    );

    if (!marcaciones[0]) {
      const estadoEntrada = clasificarEntrada(ahora.hora, String(empleados[0].hora_entrada));
      await connection.execute(
        `INSERT INTO marcaciones (empleado_id, fecha, hora_entrada, estado_entrada)
         VALUES (?, ?, ?, ?)`,
        [empleadoId, ahora.fecha, ahora.fechaHora, estadoEntrada]
      );
      await connection.commit();
      return res.status(201).json({ tipo: 'entrada', hora: ahora.fechaHora, estado: estadoEntrada });
    }

    if (marcaciones[0].hora_salida) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'La entrada y salida de hoy ya fueron registradas.' });
    }

    const salida = calcularSalida(ahora.hora, String(empleados[0].hora_salida));
    const justificacion = normalizarJustificacion(req.body?.justificacion);

    if (salida.requiereJustificacion && (
      justificacion.length < MINIMO_JUSTIFICACION ||
      justificacion.length > MAXIMO_JUSTIFICACION
    )) {
      await connection.rollback();
      return res.status(400).json({
        mensaje: 'Debes justificar tu salida después de las 18:00 (mínimo 4 caracteres).'
      });
    }

    await connection.execute(
      `UPDATE marcaciones
       SET hora_salida = ?, estado_salida = ?, horas_extras = ?, justificacion_horas_extras = ?,
           extras_estado = ?
       WHERE id = ?`,
      [
        ahora.fechaHora,
        salida.estado,
        salida.horasExtras,
        salida.requiereJustificacion ? justificacion : null,
        salida.horasExtras > 0 ? 'pendiente' : 'sin_extras',
        marcaciones[0].id
      ]
    );
    await connection.commit();
    return res.json({
      tipo: 'salida',
      hora: ahora.fechaHora,
      estado: salida.estado,
      horas_extras: salida.horasExtras,
      justificacion_horas_extras: salida.requiereJustificacion ? justificacion : null,
      extras_estado: salida.horasExtras > 0 ? 'pendiente' : 'sin_extras'
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function obtenerHistorialEmpleado(req, res, next) {
  try {
    const [marcaciones] = await pool.execute(
      `SELECT id, fecha, hora_entrada, hora_salida, estado_entrada, estado_salida,
              horas_extras, justificacion_horas_extras, extras_estado,
              extras_rechazo_motivo, extras_aprobado_en
       FROM marcaciones
       WHERE empleado_id = ?
       ORDER BY fecha DESC, id DESC
       LIMIT 30`,
      [req.usuario.id]
    );

    return res.json({ marcaciones });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registrarMarcacion,
  obtenerHistorialEmpleado,
  clasificarEntrada,
  calcularSalida
};