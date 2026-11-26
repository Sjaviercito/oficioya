// Se monta bajo /api/v1/requests/:id/adjustments
const { Router } = require('express');
const schemas = require('./schemas');
const service = require('./service');
const { z, uuid } = require('../../shared/validacion');
const { upload } = require('../../shared/middleware/upload');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');

const router = Router({ mergeParams: true });
router.use(requiereSesion);

router.post('/', requiereRol('trabajador'), upload.single('foto'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  res.status(201).json({ solicitud: await service.proponer(req.usuario.id, id, schemas.proponer.parse(req.body), req.file) });
});

router.patch('/:ajusteId', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const ajusteId = uuid.parse(req.params.ajusteId);
  res.json({ solicitud: await service.decidir(req.usuario.id, id, ajusteId, schemas.decidir.parse(req.body)) });
});

router.post('/:ajusteId/ticket', requiereRol('trabajador'), upload.single('ticket'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const ajusteId = uuid.parse(req.params.ajusteId);
  res.json({ solicitud: await service.subirTicket(req.usuario.id, id, ajusteId, schemas.ticket.parse(req.body), req.file) });
});

router.get('/:ajusteId/files/:cual', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const ajusteId = uuid.parse(req.params.ajusteId);
  const cual = z.enum(['foto', 'ticket']).parse(req.params.cual);
  const { buffer, mime } = await service.archivo(req.usuario, id, ajusteId, cual);
  res.set('Cache-Control', 'no-store');
  res.type(mime).send(buffer);
});

module.exports = router;
