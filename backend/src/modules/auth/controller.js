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
  async aceptarPrivacidad(req, res) {
    res.json({ usuario: await service.aceptarPrivacidad(req.usuario.id) });
  },
  async cambiarTelefono(req, res) {
    res.json({ usuario: await service.cambiarTelefono(req.usuario.id, schemas.cambiarTelefono.parse(req.body)) });
  },
  async cambiarPassword(req, res) {
    res.json(await service.cambiarPassword(req.usuario.id, schemas.cambiarPassword.parse(req.body)));
  },
  async eliminarCuenta(req, res) {
    await service.eliminarCuenta(req.usuario.id, schemas.confirmarPassword.parse(req.body));
    res.status(204).end();
  },
  async yo(req, res) {
    res.json({ usuario: await service.perfilActual(req.usuario.id) });
  },
};
