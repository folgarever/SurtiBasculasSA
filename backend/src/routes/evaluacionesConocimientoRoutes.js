const express = require('express');
const { verificarToken, permitirEvaluaciones } = require('../middlewares/authMiddleware');
const {
  obtenerMiEvaluacion,
  entregarEvaluacion,
  obtenerCatalogosAdmin,
  listarEvaluacionesAdmin,
  obtenerDetalleAdmin,
} = require('../controllers/evaluacionesConocimientoController');

const router = express.Router();

router.use(verificarToken);
router.get('/mi', obtenerMiEvaluacion);
router.post('/mi/responder', entregarEvaluacion);
router.get('/admin/catalogos', permitirEvaluaciones, obtenerCatalogosAdmin);
router.get('/admin', permitirEvaluaciones, listarEvaluacionesAdmin);
router.get('/admin/:id', permitirEvaluaciones, obtenerDetalleAdmin);

module.exports = router;
