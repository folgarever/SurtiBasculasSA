const express = require('express');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const { obtenerMiFicha, descargarMiFotoEmpleado } = require('../controllers/rrhhController');

const router = express.Router();

router.get('/', verificarToken, permitirRoles('EMPLOYEE'), obtenerMiFicha);
router.get('/foto', verificarToken, permitirRoles('EMPLOYEE', 'ADMIN'), descargarMiFotoEmpleado);

module.exports = router;
