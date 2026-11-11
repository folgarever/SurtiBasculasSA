const express = require('express');
const { login, loginCandidato } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/login-candidato', loginCandidato);

module.exports = router;