// Se monta bajo /api/v1/requests/:id/review
const { Router } = require('express');
const schemas = require('./schemas');
const service = require('./service');
const { uuid } = require('../../shared/validacion');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');

const router = Router({ mergeParams: true });
router.use(requiereSesion);

// CA-09.3: un trabajador que intenta reseñar recibe 403.
router.post('/', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.status(201).json({ resena: await service.crear(req.usuario.id, id, schemas.crear.parse(req.body)) });
});

module.exports = router;
