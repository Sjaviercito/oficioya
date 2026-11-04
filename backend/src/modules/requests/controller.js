const schemas = require('./schemas');
const service = require('./service');

module.exports = {
  async crear(req, res) {
    const datos = schemas.crear.parse(req.body);
    res.status(201).json({ solicitud: await service.crear(req.usuario.id, datos, req.files || []) });
  },
  async mias(req, res) {
    res.json(await service.mias(req.usuario));
  },
  async disponibles(req, res) {
    res.json(await service.disponibles(req.usuario.id));
  },
  async detalle(req, res) {
    res.json({ solicitud: await service.detalle(schemas.uuid.parse(req.params.id), req.usuario) });
  },
  async aceptar(req, res) {
    const id = schemas.uuid.parse(req.params.id);
    const { cotizacionId } = schemas.aceptar.parse(req.body);
    res.json({ solicitud: await service.aceptar(req.usuario.id, id, cotizacionId) });
  },
  async iniciar(req, res) {
    res.json({ solicitud: await service.iniciar(req.usuario.id, schemas.uuid.parse(req.params.id)) });
  },
  async completar(req, res) {
    res.json({ solicitud: await service.completar(req.usuario.id, schemas.uuid.parse(req.params.id)) });
  },
  async cancelar(req, res) {
    const id = schemas.uuid.parse(req.params.id);
    res.json({ solicitud: await service.cancelar(req.usuario, id, schemas.cancelar.parse(req.body)) });
  },
};
