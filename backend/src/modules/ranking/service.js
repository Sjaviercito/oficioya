// Servicio de ranking (ADR-06): único lugar donde se recalcula y guarda la puntuación.
const prisma = require('../../shared/prisma');
const { calcularRanking } = require('./calculo');

// db puede ser el cliente normal o una transacción (tx) de Prisma.
async function recalcularTrabajador(trabajadorId, db = prisma, ahora = new Date()) {
  const perfil = await db.perfilTrabajador.findUnique({
    where: { id: trabajadorId },
    select: {
      solicitudesAceptadas: true,
      cancelacionesAtribuibles: true,
      trabajosCompletados: true,
      trabajosConAjuste: true,
      resenas: { select: { estrellas: true, creadaEn: true } },
    },
  });
  if (!perfil) return null;

  const r = calcularRanking(perfil, ahora);
  return db.perfilTrabajador.update({
    where: { id: trabajadorId },
    data: {
      calificacionPonderada: r.calificacionPonderada,
      tasaCancelacion: r.tasaCancelacion,
      puntuacionRanking: r.puntuacionRanking,
      rankingActualizadoEn: ahora,
    },
  });
}

// Recálculo diario (03:00) para aplicar el cambio de peso por antigüedad (CA-10.5).
async function recalcularTodos(ahora = new Date()) {
  const perfiles = await prisma.perfilTrabajador.findMany({ select: { id: true } });
  for (const { id } of perfiles) {
    await recalcularTrabajador(id, prisma, ahora);
  }
  return perfiles.length;
}

module.exports = { recalcularTrabajador, recalcularTodos };
