const express = require('express');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const {
  listarPropias,
  listarAdministracion,
  crearSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
} = require('../controllers/solicitudesController');

const router = express.Router();

router.use(verificarToken);
router.get('/mias', permitirRoles('EMPLOYEE', 'ADMIN'), listarPropias);
router.post('/', permitirRoles('EMPLOYEE', 'ADMIN'), crearSolicitud);
router.get('/administracion', permitirRoles('ADMIN'), listarAdministracion);
router.put('/:id/aprobar', permitirRoles('ADMIN'), aprobarSolicitud);
router.put('/:id/rechazar', permitirRoles('ADMIN'), rechazarSolicitud);

module.exports = router;
