const { Router } = require('express');
const c = require('./controller');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');
const { upload } = require('../../shared/middleware/upload');

const router = Router();
router.use(requiereSesion);

router.get('/me/profile', requiereRol('trabajador'), c.miPerfil);
router.put('/me/profile', requiereRol('trabajador'), upload.single('foto'), c.guardarPerfil);
router.post(
  '/me/identity',
  requiereRol('trabajador'),
  upload.fields([{ name: 'ine', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]),
  c.enviarIdentificacion,
);
router.get('/', c.buscar);

module.exports = router;
