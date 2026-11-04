const { Router } = require('express');
const c = require('./controller');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');

const router = Router();
router.use(requiereSesion, requiereRol('admin'));

router.get('/verifications', c.listar);
router.get('/verifications/:trabajadorId/files/:tipo', c.archivo);
router.patch('/verifications/:trabajadorId', c.decidir);

module.exports = router;
