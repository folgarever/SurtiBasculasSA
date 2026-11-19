const express = require('express');
const {
  verificarToken,
  permitirRoles,
  verificarContrasenaAdmin,
  permitirGerenteGeneral
} = require('../middlewares/authMiddleware');
const {
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
} = require('../controllers/rrhhController');

const router = express.Router();

router.use(verificarToken, permitirRoles(2, 3, 'ADMIN'));
router.get('/asistencias', obtenerTodasAsistencias);
router.get('/empleados', obtenerEmpleadosActivos);
router.get('/administracion/empleados', permitirRoles('ADMIN'), obtenerEmpleadosAdministracion);
router.get('/administracion/empleados/:id/detalle', permitirRoles('ADMIN'), obtenerDetalleEmpleado);
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