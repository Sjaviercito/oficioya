const { Router } = require('express');
const c = require('./controller');
const { requiereSesion } = require('../../shared/middleware/auth');

const router = Router();
router.post('/register', c.registrar);
router.post('/login', c.iniciarSesion);
router.post('/refresh', c.renovar);
router.post('/logout', c.cerrarSesion);
router.get('/me', requiereSesion, c.yo);

module.exports = router;
