// Se monta bajo /api/v1/requests/:id/adjustments
const { Router } = require('express');
const schemas = require('./schemas');
const service = require('./service');
const { uuid } = require('../../shared/validacion');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');

const router = Router({ mergeParams: true });
router.use(requiereSesion);

router.post('/', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.status(201).json({ solicitud: await service.proponer(req.usuario.id, id, schemas.proponer.parse(req.body)) });
});

router.patch('/:ajusteId', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const ajusteId = uuid.parse(req.params.ajusteId);
  res.json({ solicitud: await service.decidir(req.usuario.id, id, ajusteId, schemas.decidir.parse(req.body)) });
});

module.exports = router;
