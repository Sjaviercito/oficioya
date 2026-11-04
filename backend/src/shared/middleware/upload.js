// Subida de archivos: en memoria, máximo 5 MB por archivo y solo JPG o PNG.
const multer = require('multer');
const { errores } = require('../errors');

const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

// Detecta el tipo real por los primeros bytes (no confía en la extensión ni en el mimetype del cliente).
function detectarTipo(buffer) {
  if (!buffer || buffer.length < 8) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => buffer[i] === b)) return 'image/png';
  return null;
}

function validarImagen(archivo) {
  const tipo = detectarTipo(archivo && archivo.buffer);
  if (!tipo) throw errores.badRequest('Formato no permitido: usa JPG o PNG');
  archivo.tipoReal = tipo;
  return archivo;
}

module.exports = { upload, validarImagen, detectarTipo, MAX_BYTES };
