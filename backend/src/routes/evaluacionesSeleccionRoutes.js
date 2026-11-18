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
  listarPlantillasAdmin,
  obtenerPlantillaAdmin,
  crearPlantillaAdmin,
  actualizarPlantillaAdmin,
  publicarPlantillaAdmin,
  activarPlantillaAdmin,
  restaurarVersionPlantillaAdmin,
  actualizarPerfilCandidatoAdmin,
  cambiarActivoCuentaCandidatoAdmin,
  eliminarCuentaCandidatoAdmin,
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
router.put('/admin/candidatos/:id/perfil', permitirEvaluaciones, validarCargaCurriculum, actualizarPerfilCandidatoAdmin);
router.post('/admin/candidatos/acceso/:accesoId/estado', permitirEvaluaciones, cambiarActivoCuentaCandidatoAdmin);
router.delete('/admin/candidatos/acceso/:accesoId', permitirEvaluaciones, eliminarCuentaCandidatoAdmin);
router.get('/admin/plantillas', permitirEvaluaciones, listarPlantillasAdmin);
router.post('/admin/plantillas', permitirEvaluaciones, crearPlantillaAdmin);
router.get('/admin/plantillas/:id', permitirEvaluaciones, obtenerPlantillaAdmin);
router.put('/admin/plantillas/:id', permitirEvaluaciones, actualizarPlantillaAdmin);
router.post('/admin/plantillas/:id/publicar', permitirEvaluaciones, publicarPlantillaAdmin);
router.post('/admin/plantillas/:id/activa', permitirEvaluaciones, activarPlantillaAdmin);
router.post(
  '/admin/plantillas/:id/versiones/:versionId/restaurar',
  permitirEvaluaciones,
  restaurarVersionPlantillaAdmin,
);
router.get('/plantillas', permitirEvaluaciones, obtenerPlantillas);
router.get('/resultados', permitirEvaluaciones, listarResultados);

module.exports = router;
