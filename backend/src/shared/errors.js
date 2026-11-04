// Errores con formato común: { error: { code, message } } (sección 3.2 del contrato).
const { ZodError } = require('zod');
const multer = require('multer');

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const errores = {
  badRequest: (message, code = 'VALIDACION') => new AppError(400, code, message),
  unauthorized: (message = 'Inicia sesión para continuar') => new AppError(401, 'NO_AUTENTICADO', message),
  forbidden: (message = 'No tienes permiso para esta acción') => new AppError(403, 'PROHIBIDO', message),
  notFound: (message = 'No encontrado') => new AppError(404, 'NO_ENCONTRADO', message),
  conflict: (message, code = 'CONFLICTO') => new AppError(409, code, message),
  tooLarge: (message) => new AppError(413, 'ARCHIVO_GRANDE', message),
  unprocessable: (message, code = 'NO_PROCESABLE') => new AppError(422, code, message),
};

// Middleware final de Express 5: convierte cualquier error en la respuesta estándar.
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    const primero = err.issues[0];
    return res.status(400).json({ error: { code: 'VALIDACION', message: primero ? primero.message : 'Datos inválidos' } });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const esFoto = err.field === 'foto' || err.field === 'fotos';
      const msg = esFoto ? 'La foto debe pesar máximo 5 MB' : 'El archivo debe pesar máximo 5 MB';
      return res.status(413).json({ error: { code: 'ARCHIVO_GRANDE', message: msg } });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' && err.field === 'fotos') {
      return res.status(400).json({ error: { code: 'VALIDACION', message: 'Máximo 5 fotos' } });
    }
    return res.status(400).json({ error: { code: 'VALIDACION', message: 'Archivo no válido' } });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDACION', message: 'El cuerpo de la petición no es JSON válido' } });
  }
  // Violación de UNIQUE en la base de datos (respaldo de las validaciones de la app).
  if (err && err.code === 'P2002') {
    return res.status(409).json({ error: { code: 'DUPLICADO', message: 'El registro ya existe' } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } });
}

module.exports = { AppError, errores, manejadorErrores };
