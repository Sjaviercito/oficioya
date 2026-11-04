const { z } = require('../../shared/validacion');
const schemas = require('./schemas');
const service = require('./service');

const idTrabajador = z.string().uuid({ message: 'Identificador inválido' });

module.exports = {
  async listar(req, res) {
    res.json(await service.listar(schemas.listado.parse(req.query)));
  },
  async archivo(req, res) {
    const params = schemas.archivo.parse(req.params);
    const { buffer, mime } = await service.archivo(params);
    // No se guarda en caché del navegador ni de proxies.
    res.set('Cache-Control', 'no-store');
    res.type(mime).send(buffer);
  },
  async decidir(req, res) {
    const trabajadorId = idTrabajador.parse(req.params.trabajadorId);
    res.json(await service.decidir(req.usuario.id, trabajadorId, schemas.decision.parse(req.body)));
  },
};
