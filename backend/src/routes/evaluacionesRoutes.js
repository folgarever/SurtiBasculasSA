const express = require('express');
const { verificarToken, permitirEvaluaciones } = require('../middlewares/authMiddleware');
const {
  obtenerEmpleados,
  listarEvaluaciones,
  obtenerEvaluacion,
  crearEvaluacion
} = require('../controllers/evaluacionesController');

const router = express.Router();

router.use(verificarToken, permitirEvaluaciones);
router.get('/empleados', obtenerEmpleados);
router.get('/', listarEvaluaciones);
router.post('/', crearEvaluacion);
router.get('/:id', obtenerEvaluacion);

module.exports = router;
