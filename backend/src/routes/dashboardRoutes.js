const express = require('express');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const { obtenerResumenAdmin } = require('../controllers/dashboardController');

const router = express.Router();

router.use(verificarToken, permitirRoles('ADMIN'));
router.get('/admin', obtenerResumenAdmin);

module.exports = router;
