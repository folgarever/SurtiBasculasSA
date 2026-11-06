const express = require('express');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const {
  obtenerMisSugerencias,
  crearSugerencia,
  obtenerTodasLasSugerencias,
  responderSugerencia
} = require('../controllers/sugerenciasController');

const router = express.Router();

router.get('/mis-sugerencias', verificarToken, permitirRoles('EMPLOYEE'), obtenerMisSugerencias);
router.post('/mis-sugerencias', verificarToken, permitirRoles('EMPLOYEE'), crearSugerencia);
router.get('/admin', verificarToken, permitirRoles('ADMIN'), obtenerTodasLasSugerencias);
router.put('/admin/:id/respuesta', verificarToken, permitirRoles('ADMIN'), responderSugerencia);

module.exports = router;
