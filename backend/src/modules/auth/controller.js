const schemas = require('./schemas');
const service = require('./service');

module.exports = {
  async registrar(req, res) {
    const datos = schemas.registro.parse(req.body);
    res.status(201).json(await service.registrar(datos));
  },
  async iniciarSesion(req, res) {
    res.json(await service.iniciarSesion(schemas.login.parse(req.body)));
  },
  async renovar(req, res) {
    res.json(await service.renovar(schemas.refresh.parse(req.body)));
  },
  async cerrarSesion(req, res) {
    await service.cerrarSesion(schemas.refresh.parse(req.body));
    res.status(204).end();
  },
  async yo(req, res) {
    res.json({ usuario: await service.perfilActual(req.usuario.id) });
  },
};
