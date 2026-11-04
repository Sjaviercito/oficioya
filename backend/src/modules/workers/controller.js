const schemas = require('./schemas');
const service = require('./service');

module.exports = {
  async miPerfil(req, res) {
    res.json({ perfil: await service.obtenerMiPerfil(req.usuario.id) });
  },
  async guardarPerfil(req, res) {
    const datos = schemas.perfil.parse(req.body);
    res.json({ perfil: await service.guardarPerfil(req.usuario.id, datos, req.file) });
  },
  async enviarIdentificacion(req, res) {
    const ine = req.files && req.files.ine && req.files.ine[0];
    const selfie = req.files && req.files.selfie && req.files.selfie[0];
    res.status(202).json(await service.enviarIdentificacion(req.usuario.id, ine, selfie));
  },
  async buscar(req, res) {
    res.json(await service.buscar(schemas.busqueda.parse(req.query)));
  },
};
