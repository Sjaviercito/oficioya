// Configuración leída de variables de entorno (.env). Nunca se escriben secretos en el código.
require('dotenv').config();

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (revisa tu .env)`);
  return valor;
}

const esTest = process.env.NODE_ENV === 'test';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret: esTest ? 'secreto-de-pruebas-solo-para-jest-0123456789' : requerida('JWT_SECRET'),
  identityKey: esTest
    ? Buffer.alloc(32, 7)
    : Buffer.from(requerida('IDENTITY_ENC_KEY'), 'base64'),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean),
  publicUploadsDir: process.env.PUBLIC_UPLOADS_DIR || './uploads',
  privateStorageDir: process.env.PRIVATE_STORAGE_DIR || './storage',
  forceHttps: process.env.FORCE_HTTPS === 'true',
  accessTokenTtl: '15m', // ADR-04
  refreshTokenHoras: 24, // ADR-04 / RNF-02: expira tras 24 h sin uso
  zonaHoraria: 'America/Mexico_City',
};

if (config.identityKey.length !== 32) {
  throw new Error('IDENTITY_ENC_KEY debe ser de 32 bytes en base64 (AES-256)');
}
if (!esTest && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
}

module.exports = config;
