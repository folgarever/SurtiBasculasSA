const express = require('express');
const multer = require('multer');
const {
  verificarToken,
  permitirEvaluaciones,
  permitirCandidato,
} = require('../middlewares/authMiddleware');
const {
  obtenerPlantillas,
  obtenerPlantillasCandidato,
  obtenerMiRegistroCandidato,
  registrarCandidatoAdmin,
  registrarPerfilCandidato,
  descargarCurriculumCandidato,
  entregarPruebaCandidato,
  listarCandidatosPendientes,
  listarResultados,
  autorizarReintentoCandidato,
} = require('../controllers/evaluacionesSeleccionController');

const router = express.Router();
const cargarCurriculum = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('curriculum');

function validarCargaCurriculum(req, res, next) {
  cargarCurriculum(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const mensaje = error.code === 'LIMIT_FILE_SIZE'
        ? 'El currículum no puede superar 5 MB.'
        : 'Adjunta un solo archivo PDF como currículum.';
      return res.status(400).json({ mensaje });
    }
    if (error) return next(error);
    return next();
  });
}

router.use(verificarToken);
router.get('/candidato/plantillas', permitirCandidato, obtenerPlantillasCandidato);
router.get('/candidato/mi', permitirCandidato, obtenerMiRegistroCandidato);
router.post('/candidato/perfil', permitirCandidato, validarCargaCurriculum, registrarPerfilCandidato);
router.post('/candidato/entregar', permitirCandidato, entregarPruebaCandidato);
router.get('/admin/candidatos', permitirEvaluaciones, listarCandidatosPendientes);
router.post('/admin/candidatos', permitirEvaluaciones, registrarCandidatoAdmin);
router.get('/admin/candidatos/:id/curriculum', permitirEvaluaciones, descargarCurriculumCandidato);
router.post('/admin/candidatos/:id/reintentar', permitirEvaluaciones, autorizarReintentoCandidato);
router.get('/plantillas', permitirEvaluaciones, obtenerPlantillas);
router.get('/resultados', permitirEvaluaciones, listarResultados);

module.exports = router;
