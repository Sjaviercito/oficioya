// Se monta bajo /api/v1/requests/:id/quotes
const { Router } = require('express');
const schemas = require('./schemas');
const service = require('./service');
const { uuid } = require('../../shared/validacion');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');

const router = Router({ mergeParams: true });
router.use(requiereSesion);

router.post('/', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.status(201).json({ cotizacion: await service.crear(req.usuario.id, id, schemas.crear.parse(req.body)) });
});

router.put('/mine', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.json({ cotizacion: await service.actualizar(req.usuario.id, id, schemas.crear.parse(req.body)) });
});

router.get('/', requiereRol('cliente'), async (req, res) => {
  res.json(await service.listar(req.usuario.id, uuid.parse(req.params.id)));
});

module.exports = router;
