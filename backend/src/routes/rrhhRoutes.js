const express = require('express');
const { verificarToken, permitirRoles, verificarContrasenaAdmin } = require('../middlewares/authMiddleware');
const {
  obtenerTodasAsistencias,
  obtenerEmpleadosActivos,
  obtenerEmpleadosAdministracion,
  obtenerPuestos,
  registrarEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  corregirMarcacion,
  registrarIncidencia,
  exportarReporteExcel
} = require('../controllers/rrhhController');

const router = express.Router();

router.use(verificarToken, permitirRoles(2, 3, 'ADMIN'));
router.get('/asistencias', obtenerTodasAsistencias);
router.get('/empleados', obtenerEmpleadosActivos);
router.get('/administracion/empleados', permitirRoles('ADMIN'), obtenerEmpleadosAdministracion);
router.get('/administracion/puestos', permitirRoles('ADMIN'), obtenerPuestos);
router.post('/administracion/empleados', permitirRoles('ADMIN'), verificarContrasenaAdmin, registrarEmpleado);
router.put('/administracion/empleados/:id', permitirRoles('ADMIN'), verificarContrasenaAdmin, actualizarEmpleado);
router.delete('/administracion/empleados/:id', permitirRoles('ADMIN'), verificarContrasenaAdmin, eliminarEmpleado);
router.put('/corregir', corregirMarcacion);
router.post('/incidencias', registrarIncidencia);
router.get('/exportar-excel', exportarReporteExcel);

module.exports = router;