// RNF-02: en producción, toda petición HTTP se redirige a HTTPS (301).
const config = require('../../config');

function forzarHttps(req, res, next) {
  // El chequeo de salud del proveedor de hosting entra por la red interna, sin HTTPS.
  if (!config.forceHttps || req.path === '/api/v1/health') return next();
  const proto = req.headers['x-forwarded-proto'];
  if (req.secure || proto === 'https') return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
}

module.exports = { forzarHttps };
