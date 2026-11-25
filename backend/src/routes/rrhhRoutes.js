const express = require('express');
const multer = require('multer');
const {
  verificarToken,
  permitirRoles,
  verificarContrasenaAdmin,
  permitirGerenteGeneral,
  permitirRrhhOGerente
} = require('../middlewares/authMiddleware');
const {
  obtenerTodasAsistencias,
  obtenerHorasExtras,
  aprobarHorasExtras,
  rechazarHorasExtras,
  obtenerEmpleadosActivos,
  obtenerEmpleadosAdministracion,
  obtenerEmpleadoAdministracion,
  obtenerDetalleEmpleado,
  actualizarFichaEmpleado,
  subirFotoEmpleado,
  descargarFotoEmpleado,
  subirCurriculumEmpleado,
  descargarCurriculumEmpleado,
  obtenerAuditoriaFicha,
  exportarFichaEmpleado,
  registrarExportacionFichaPdf,
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
} = require('../controllers/rrhhController');
const {
  listarDocumentosEmpleado,
  subirDocumentoEmpleado,
  descargarDocumentoEmpleado,
  eliminarDocumentoEmpleado,
  obtenerDocumentosPorVencer
} = require('../controllers/documentosEmpleadoController');

const router = express.Router();
const cargarArchivo = (campo) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single(campo);

function validarCarga(campo, nombreArchivo, tipoArchivo = 'PDF') {
  const cargar = cargarArchivo(campo);
  return (req, res, next) => {
    cargar(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const mensaje = error.code === 'LIMIT_FILE_SIZE'
          ? `${nombreArchivo} no puede superar 5 MB.`
          : `Adjunta un solo archivo ${tipoArchivo}.`;
        return res.status(400).json({ mensaje });
      }
      if (error) return next(error);
      return next();
    });
  };
}

const validarCargaCurriculum = validarCarga('curriculum', 'El currículum');
const validarCargaDocumento = validarCarga('documento', 'El documento');
const validarCargaFoto = validarCarga('foto', 'La foto', 'de imagen');

router.use(verificarToken, permitirRoles(2, 3, 'ADMIN'));
router.get('/asistencias', obtenerTodasAsistencias);
router.get('/horas-extras', obtenerHorasExtras);
router.put('/horas-extras/:id/aprobar', permitirRrhhOGerente, aprobarHorasExtras);
router.put('/horas-extras/:id/rechazar', permitirRrhhOGerente, rechazarHorasExtras);
router.get('/empleados', obtenerEmpleadosActivos);
router.get('/administracion/empleados', permitirRoles('ADMIN'), obtenerEmpleadosAdministracion);
router.get('/administracion/empleados/:id/detalle', permitirRoles('ADMIN'), obtenerDetalleEmpleado);
router.put('/administracion/empleados/:id/ficha', permitirRoles('ADMIN'), actualizarFichaEmpleado);
router.get('/administracion/empleados/:id/foto', permitirRoles('ADMIN'), descargarFotoEmpleado);
router.put(
  '/administracion/empleados/:id/foto',
  permitirRoles('ADMIN'),
  validarCargaFoto,
  subirFotoEmpleado
);
router.get('/administracion/empleados/:id/curriculum', permitirRoles('ADMIN'), descargarCurriculumEmpleado);
router.get('/administracion/empleados/:id/ficha/auditoria', permitirRoles('ADMIN'), obtenerAuditoriaFicha);
router.get('/administracion/empleados/:id/ficha/exportar', permitirRoles('ADMIN'), exportarFichaEmpleado);
router.post('/administracion/empleados/:id/ficha/exportar/pdf', permitirRoles('ADMIN'), registrarExportacionFichaPdf);
router.get('/administracion/documentos/por-vencer', permitirRoles('ADMIN'), obtenerDocumentosPorVencer);
router.get('/administracion/empleados/:id/documentos', permitirRoles('ADMIN'), listarDocumentosEmpleado);
router.post(
  '/administracion/empleados/:id/documentos',
  permitirRoles('ADMIN'),
  validarCargaDocumento,
  subirDocumentoEmpleado
);
router.get('/administracion/empleados/:id/documentos/:documentoId', permitirRoles('ADMIN'), descargarDocumentoEmpleado);
router.delete('/administracion/empleados/:id/documentos/:documentoId', permitirRoles('ADMIN'), eliminarDocumentoEmpleado);
router.put(
  '/administracion/empleados/:id/curriculum',
  permitirRoles('ADMIN'),
  validarCargaCurriculum,
  subirCurriculumEmpleado
);
router.get('/administracion/empleados/:id', permitirRoles('ADMIN'), obtenerEmpleadoAdministracion);
router.get('/administracion/puestos', permitirRoles('ADMIN'), obtenerPuestos);
router.post(
  '/administracion/puestos',
  permitirRoles('ADMIN'),
  permitirGerenteGeneral,
  verificarContrasenaAdmin,
  registrarPuesto
);
router.put(
  '/administracion/puestos/:id',
  permitirRoles('ADMIN'),
  permitirGerenteGeneral,
  verificarContrasenaAdmin,
  actualizarPuesto
);
router.post('/administracion/empleados', permitirRoles('ADMIN'), verificarContrasenaAdmin, registrarEmpleado);
router.put('/administracion/empleados/:id', permitirRoles('ADMIN'), verificarContrasenaAdmin, actualizarEmpleado);
router.delete('/administracion/empleados/:id', permitirRoles('ADMIN'), verificarContrasenaAdmin, eliminarEmpleado);
router.put('/corregir', corregirMarcacion);
router.get('/incidencias', obtenerIncidencias);
router.post('/incidencias', registrarIncidencia);
router.get('/exportar-excel', exportarReporteExcel);

module.exports = router;