// RF-11: crea un aviso dentro de la app. Nunca rompe la operación principal si falla.
const prisma = require('./prisma');

async function avisar(db, usuarioId, texto, solicitudId = null) {
  try {
    await (db || prisma).notificacion.create({ data: { usuarioId, texto, solicitudId } });
  } catch (e) {
    console.error('[avisos]', e.message);
  }
}

module.exports = { avisar };
