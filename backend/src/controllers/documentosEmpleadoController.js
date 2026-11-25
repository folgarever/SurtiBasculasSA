const pool = require('../config/db');
const { esPdf, fechaValida } = require('../utils/fichaEmpleado');
const { registrarAuditoriaFicha } = require('./rrhhController');

const TIPOS_DOCUMENTO = ['dpi', 'contrato', 'antecedentes', 'otro'];
const DIAS_AVISO_VENCIMIENTO = 30;

function enteroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

async function listarDocumentosEmpleado(req, res, next) {
  const empleadoId = enteroPositivo(req.params.id);
  if (!empleadoId) return res.status(400).json({ mensaje: 'El identificador del empleado no es válido.' });
  try {
    const [documentos] = await pool.execute(
      `SELECT d.id, d.tipo, d.nombre, d.fecha_vencimiento, d.creado_en, u.nombre AS subido_por
       FROM empleados_documentos d
       LEFT JOIN empleados u ON u.id = d.subido_por
       WHERE d.empleado_id = ?
       ORDER BY d.creado_en DESC, d.id DESC`,
      [empleadoId]
    );
    return res.json({ documentos });
  } catch (error) {
    return next(error);
  }
}

async function subirDocumentoEmpleado(req, res, next) {
  const empleadoId = enteroPositivo(req.params.id);
  if (!empleadoId) return res.status(400).json({ mensaje: 'El identificador del empleado no es válido.' });

  const tipo = String(req.body?.tipo || '');
  const vencimiento = String(req.body?.fecha_vencimiento || '').trim() || null;
  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    return res.status(400).json({ mensaje: 'Selecciona un tipo de documento válido.' });
  }
  if (vencimiento && !fechaValida(vencimiento)) {
    return res.status(400).json({ mensaje: 'La fecha de vencimiento no es válida.' });
  }
  if (tipo === 'otro') {
    const nombrePersonalizado = String(req.body?.nombre || '').trim();
    if (!nombrePersonalizado) {
      return res.status(400).json({ mensaje: 'Escribe el nombre del documento cuando selecciones “Otro”.' });
    }
  }
  if (!req.file || !esPdf(req.file.buffer)) {
    return res.status(400).json({ mensaje: 'Adjunta el documento en formato PDF.' });
  }

  const nombrePersonalizado = tipo === 'otro'
    ? String(req.body?.nombre || '').trim()
    : '';
  const nombreDesdeArchivo = String(req.file.originalname || '')
    .replace(/[\\/]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(-150) || 'documento.pdf';
  const nombreBase = nombrePersonalizado
    ? nombrePersonalizado.replace(/[\\/]/g, '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 150)
    : nombreDesdeArchivo;
  const nombre = nombreBase
    ? (nombreBase.toLowerCase().endsWith('.pdf') ? nombreBase : `${nombreBase}.pdf`)
    : 'documento.pdf';

  try {
    const [empleados] = await pool.execute('SELECT id FROM empleados WHERE id = ? LIMIT 1', [empleadoId]);
    if (!empleados[0]) return res.status(404).json({ mensaje: 'Empleado no encontrado.' });

    const [resultado] = await pool.execute(
      `INSERT INTO empleados_documentos (empleado_id, tipo, nombre, contenido, fecha_vencimiento, subido_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [empleadoId, tipo, nombre, req.file.buffer, vencimiento, req.usuario?.id ?? null]
    );
    await registrarAuditoriaFicha(empleadoId, req.usuario?.id, 'documento_subido', tipo);
    return res.status(201).json({ mensaje: 'Documento guardado correctamente.', id: resultado.insertId });
  } catch (error) {
    return next(error);
  }
}

async function descargarDocumentoEmpleado(req, res, next) {
  const empleadoId = enteroPositivo(req.params.id);
  const documentoId = enteroPositivo(req.params.documentoId);
  if (!empleadoId || !documentoId) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  try {
    const [filas] = await pool.execute(
      'SELECT tipo, nombre, contenido FROM empleados_documentos WHERE id = ? AND empleado_id = ? LIMIT 1',
      [documentoId, empleadoId]
    );
    if (!filas[0]) return res.status(404).json({ mensaje: 'Documento no encontrado.' });
    await registrarAuditoriaFicha(empleadoId, req.usuario?.id, 'documento_descarga', filas[0].tipo);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="documento-${documentoId}.pdf"`);
    return res.send(filas[0].contenido);
  } catch (error) {
    return next(error);
  }
}

async function eliminarDocumentoEmpleado(req, res, next) {
  const empleadoId = enteroPositivo(req.params.id);
  const documentoId = enteroPositivo(req.params.documentoId);
  if (!empleadoId || !documentoId) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  try {
    const [filas] = await pool.execute(
      'SELECT tipo FROM empleados_documentos WHERE id = ? AND empleado_id = ? LIMIT 1',
      [documentoId, empleadoId]
    );
    if (!filas[0]) return res.status(404).json({ mensaje: 'Documento no encontrado.' });
    await pool.execute('DELETE FROM empleados_documentos WHERE id = ? AND empleado_id = ?', [documentoId, empleadoId]);
    await registrarAuditoriaFicha(empleadoId, req.usuario?.id, 'documento_eliminado', filas[0].tipo);
    return res.json({ mensaje: 'Documento eliminado.' });
  } catch (error) {
    return next(error);
  }
}

// Documentos vencidos o que vencen pronto, de empleados activos.
async function obtenerDocumentosPorVencer(req, res, next) {
  try {
    const [documentos] = await pool.execute(
      `SELECT d.id, d.empleado_id, e.nombre AS empleado, d.tipo, d.fecha_vencimiento,
              DATEDIFF(d.fecha_vencimiento, CURDATE()) AS dias
       FROM empleados_documentos d
       INNER JOIN empleados e ON e.id = d.empleado_id
       WHERE e.activo = 1 AND d.fecha_vencimiento IS NOT NULL
         AND d.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL ${DIAS_AVISO_VENCIMIENTO} DAY)
       ORDER BY d.fecha_vencimiento ASC, e.nombre ASC`
    );
    return res.json({ documentos });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarDocumentosEmpleado,
  subirDocumentoEmpleado,
  descargarDocumentoEmpleado,
  eliminarDocumentoEmpleado,
  obtenerDocumentosPorVencer
};
