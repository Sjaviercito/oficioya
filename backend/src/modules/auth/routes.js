const { Router } = require('express');
const c = require('./controller');
const { requiereSesion } = require('../../shared/middleware/auth');

const router = Router();
router.post('/register', c.registrar);
// Mejora v1.1-4: máximo 5 intentos fallidos por correo e IP en 1 minuto → 429.
const intentos = new Map();
function limiteLogin(req, res, next) {
  const clave = `${req.ip}|${String(req.body?.email || '').toLowerCase()}`;
  const ahora = Date.now();
  const lista = (intentos.get(clave) || []).filter((t) => ahora - t < 60000);
  if (lista.length >= 5) {
    return res.status(429).json({ error: { code: 'DEMASIADOS_INTENTOS', message: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' } });
  }
  res.on('finish', () => {
    if (res.statusCode === 401) intentos.set(clave, [...lista, ahora]);
    else if (res.statusCode === 200) intentos.delete(clave);
  });
  return next();
}
router.post('/login', limiteLogin, c.iniciarSesion);
router.post('/refresh', c.renovar);
router.post('/logout', c.cerrarSesion);
router.get('/me', requiereSesion, c.yo);
router.post('/me/privacy', requiereSesion, c.aceptarPrivacidad);
router.put('/me/phone', requiereSesion, c.cambiarTelefono);
router.put('/me/password', requiereSesion, c.cambiarPassword);
router.delete('/me', requiereSesion, c.eliminarCuenta);

module.exports = router;
