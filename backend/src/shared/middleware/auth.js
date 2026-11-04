// Autenticación con JWT de acceso (ADR-04) y control de acceso por rol.
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { errores } = require('../errors');

function requiereSesion(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) return next(errores.unauthorized());
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.usuario = { id: payload.sub, rol: payload.rol };
    return next();
  } catch {
    return next(errores.unauthorized('Tu sesión expiró, vuelve a iniciar sesión'));
  }
}

function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) return next(errores.forbidden());
    return next();
  };
}

module.exports = { requiereSesion, requiereRol };
