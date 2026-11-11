const express = require('express');
const {
  verificarToken,
  permitirEvaluaciones,
  permitirCandidato,
} = require('../middlewares/authMiddleware');
const {
  obtenerPlantillas,
  obtenerPlantillasCandidato,
  obtenerMiRegistroCandidato,
  registrarCandidato,
  entregarPruebaCandidato,
  listarCandidatosPendientes,
  listarResultados,
  registrarResultado,
} = require('../controllers/evaluacionesSeleccionController');

const router = express.Router();

router.use(verificarToken);
router.get('/candidato/plantillas', permitirCandidato, obtenerPlantillasCandidato);
router.get('/candidato/mi', permitirCandidato, obtenerMiRegistroCandidato);
router.post('/candidato/registro', permitirCandidato, registrarCandidato);
router.post('/candidato/entregar', permitirCandidato, entregarPruebaCandidato);
router.get('/admin/candidatos', permitirEvaluaciones, listarCandidatosPendientes);
router.get('/plantillas', permitirEvaluaciones, obtenerPlantillas);
router.get('/resultados', permitirEvaluaciones, listarResultados);
router.post('/resultados', permitirEvaluaciones, registrarResultado);

module.exports = router;
