const express = require('express');
const { login, loginCandidato } = require('../controllers/authController');
const { crearLimitador } = require('../middlewares/rateLimit');

const router = express.Router();

const limitarLogin = crearLimitador({
  maximo: 10,
  ventanaMs: 15 * 60 * 1000,
  mensaje: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.',
});

router.post('/login', limitarLogin, login);
router.post('/login-candidato', limitarLogin, loginCandidato);

module.exports = router;
