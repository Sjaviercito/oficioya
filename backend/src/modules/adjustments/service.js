// Ajuste de precio con aprobación del cliente (RF-16). No cambia el estado de la solicitud
// ni toca la fórmula del ranking: solo registra el historial del monto.
const prisma = require('../../shared/prisma');
const { errores } = require('../../shared/errors');
const solicitudes = require('../requests/service');
const { validarPropuesta } = require('./reglas');
const { avisar } = require('../../shared/avisos');

async function proponer(usuarioId, solicitudId, { montoPropuesto, motivo }) {
  await prisma.$transaction(async (tx) => {
    const s = await solicitudes.cargar(solicitudId, tx);
    const perfil = await solicitudes.perfilTrabajadorDe(usuarioId, tx);
    if (!perfil || !s.cotizacionAceptada || s.cotizacionAceptada.trabajadorId !== perfil.id) {
      throw errores.forbidden('Solo el trabajador aceptado puede proponer un ajuste');
    }
    const { montoAnterior } = validarPropuesta(s, montoPropuesto);
    await tx.ajustePrecio.create({ data: { solicitudId: s.id, montoAnterior, montoPropuesto, motivo } });
  });
  const s = await prisma.solicitud.findUnique({ where: { id: solicitudId }, select: { clienteId: true } });
  await avisar(null, s.clienteId, `El trabajador propone ajustar el precio a $${Number(montoPropuesto).toFixed(2)}.`, solicitudId);
  return solicitudes.detalle(solicitudId, { id: usuarioId, rol: 'trabajador' });
}

async function decidir(usuarioId, solicitudId, ajusteId, { decision }) {
  await prisma.$transaction(async (tx) => {
    const s = await solicitudes.cargar(solicitudId, tx);
    if (s.clienteId !== usuarioId) throw errores.forbidden('Solo quien publicó la solicitud puede responder el ajuste');
    const ajuste = s.ajustes.find((a) => a.id === ajusteId);
    if (!ajuste) throw errores.notFound('Ajuste no encontrado');
    const { count } = await tx.ajustePrecio.updateMany({
      where: { id: ajusteId, estado: 'pendiente' },
      data: { estado: decision === 'aceptar' ? 'aceptado' : 'rechazado', resueltoEn: new Date() },
    });
    if (count === 0) throw errores.conflict('Este ajuste ya fue respondido', 'AJUSTE_RESUELTO');
  });
  const s = await prisma.solicitud.findUnique({ where: { id: solicitudId }, include: { cotizacionAceptada: { include: { trabajador: true } } } });
  await avisar(null, s.cotizacionAceptada.trabajador.usuarioId, decision === 'aceptar' ? 'El cliente aceptó tu ajuste de precio.' : 'El cliente rechazó tu ajuste; el trabajo sigue al precio original.', solicitudId);
  return solicitudes.detalle(solicitudId, { id: usuarioId, rol: 'cliente' });
}

module.exports = { proponer, decidir };
