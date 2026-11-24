const express = require('express');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const { obtenerMiFicha } = require('../controllers/rrhhController');

const router = express.Router();

router.get('/', verificarToken, permitirRoles('EMPLOYEE'), obtenerMiFicha);

module.exports = router;
