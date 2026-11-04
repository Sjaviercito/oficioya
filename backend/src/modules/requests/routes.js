const { Router } = require('express');
const c = require('./controller');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');
const { upload } = require('../../shared/middleware/upload');

const router = Router();
router.use(requiereSesion);

router.post('/', requiereRol('cliente'), upload.array('fotos', 5), c.crear);
router.get('/mine', requiereRol('cliente', 'trabajador'), c.mias);
router.get('/available', requiereRol('trabajador'), c.disponibles);
router.get('/:id', c.detalle);
router.post('/:id/accept', requiereRol('cliente'), c.aceptar);
router.post('/:id/start', requiereRol('trabajador'), c.iniciar);
router.post('/:id/complete', requiereRol('cliente'), c.completar);
router.post('/:id/cancel', requiereRol('cliente', 'trabajador'), c.cancelar);

module.exports = router;
