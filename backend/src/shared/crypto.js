// Cifrado AES-256-GCM para identificaciones oficiales (ADR-05, RNF-03).
// Formato del archivo cifrado: [IV 12 bytes][TAG 16 bytes][datos cifrados].
const crypto = require('crypto');
const config = require('../config');

function cifrar(buffer, clave = config.identityKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const datos = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), datos]);
}

function descifrar(buffer, clave = config.identityKey) {
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const datos = buffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', clave, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(datos), decipher.final()]);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { cifrar, descifrar, hashToken };
