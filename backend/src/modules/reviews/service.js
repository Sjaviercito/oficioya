// M3 — Reseñas (RF-09). Una reseña dispara el recálculo del ranking (RF-10, interacción M2→M3).
const prisma = require('../../shared/prisma');
const { errores } = require('../../shared/errors');
const ranking = require('../ranking/service');
const { validarElegibilidad } = require('./reglas');

async function crear(clienteId, solicitudId, { estrellas, comentario }) {
  return prisma.$transaction(async (tx) => {
    const s = await tx.solicitud.findUnique({
      where: { id: solicitudId },
      include: { resena: true, cotizacionAceptada: true },
    });
    if (!s) throw errores.notFound('Solicitud no encontrada');
    validarElegibilidad(s, clienteId);

    const trabajadorId = s.cotizacionAceptada.trabajadorId;
    const resena = await tx.resena.create({
      data: { solicitudId: s.id, clienteId, trabajadorId, estrellas, comentario: comentario || null },
    });
    const perfil = await ranking.recalcularTrabajador(trabajadorId, tx);
    return {
      id: resena.id,
      estrellas: resena.estrellas,
      comentario: resena.comentario,
      creadaEn: resena.creadaEn,
      trabajador: {
        id: trabajadorId,
        puntuacionRanking: perfil.puntuacionRanking === null ? null : Math.round(Number(perfil.puntuacionRanking) * 100) / 100,
      },
    };
  });
}

module.exports = { crear };
