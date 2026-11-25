const express = require('express');
const { verificarToken } = require('../middlewares/authMiddleware');
const { obtenerVistas, guardarVistas } = require('../controllers/notificacionesController');

const router = express.Router();

router.use(verificarToken);
router.get('/vistas', obtenerVistas);
router.put('/vistas', guardarVistas);

module.exports = router;
