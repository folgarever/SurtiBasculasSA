const express = require('express');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const {
  registrarMarcacion,
  obtenerHistorialEmpleado
} = require('../controllers/asistenciaController');

const router = express.Router();

router.use(verificarToken);
router.post('/marcar', permitirRoles('EMPLOYEE', 'ADMIN'), registrarMarcacion);
router.get('/mi-historial', permitirRoles('EMPLOYEE', 'ADMIN'), obtenerHistorialEmpleado);

module.exports = router;