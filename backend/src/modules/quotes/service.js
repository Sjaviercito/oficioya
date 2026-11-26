// M2 — Cotizaciones (RF-06). Enviar la primera cotización pasa la solicitud a "cotizada".
const prisma = require('../../shared/prisma');
const { errores } = require('../../shared/errors');
const { validarTransicion } = require('../requests/estados');
const solicitudes = require('../requests/service');

async function crear(usuarioId, solicitudId, { monto, tiempoEstimadoHoras }) {
  return prisma.$transaction(async (tx) => {
    const perfil = await solicitudes.perfilTrabajadorDe(usuarioId, tx);
    // CA-06.2 (interacción M1→M2): sin verificación no se cotiza.
    if (!perfil || perfil.estadoVerificacion !== 'aprobado') {
      throw errores.forbidden('Tu cuenta debe estar verificada para cotizar');
    }
    const s = await solicitudes.cargar(solicitudId, tx);
    // CA-06.5: el oficio y la zona deben coincidir con los del trabajador.
    const coincide =
      perfil.oficios.some((o) => o.oficioId === s.oficioId) && perfil.zonas.some((z) => z.zonaId === s.zonaId);
    if (!coincide) throw errores.forbidden('Esta solicitud no es de tu oficio o zona de servicio');
    // CA-06.4: una cotización por trabajador y solicitud.
    if (s.cotizaciones.some((c) => c.trabajadorId === perfil.id)) {
      throw errores.conflict('Ya enviaste una cotización para esta solicitud', 'COTIZACION_DUPLICADA');
    }
    const nuevoEstado = validarTransicion('recibirCotizacion', s.estado);

    const cotizacion = await tx.cotizacion.create({
      data: { solicitudId: s.id, trabajadorId: perfil.id, monto, tiempoEstimadoHoras },
    });
    if (nuevoEstado !== s.estado) {
      const { count } = await tx.solicitud.updateMany({
        where: { id: s.id, estado: s.estado },
        data: { estado: nuevoEstado },
      });
      if (count === 0) throw errores.conflict('La solicitud cambió; recarga e intenta de nuevo', 'TRANSICION_INVALIDA');
    }
    return {
      id: cotizacion.id,
      monto: Number(cotizacion.monto),
      tiempoEstimadoHoras: cotizacion.tiempoEstimadoHoras,
      estado: cotizacion.estado,
      solicitudEstado: nuevoEstado,
    };
  });
}

// Solo el cliente dueño ve todas las cotizaciones de su solicitud.
async function listar(usuarioId, solicitudId) {
  const s = await prisma.solicitud.findUnique({ where: { id: solicitudId }, select: { clienteId: true } });
  if (!s) throw errores.notFound('Solicitud no encontrada');
  if (s.clienteId !== usuarioId) throw errores.forbidden('Solo quien publicó la solicitud ve sus cotizaciones');

  const lista = await prisma.cotizacion.findMany({
    where: { solicitudId },
    include: { trabajador: { include: { usuario: { select: { nombre: true } } } } },
    orderBy: { creadaEn: 'asc' },
  });
  return lista.map((c) => ({
    id: c.id,
    monto: Number(c.monto),
    tiempoEstimadoHoras: c.tiempoEstimadoHoras,
    estado: c.estado,
    creadaEn: c.creadaEn,
    trabajador: {
      id: c.trabajadorId,
      nombre: c.trabajador.usuario.nombre,
      fotoUrl: c.trabajador.fotoUrl,
      puntuacionRanking: c.trabajador.puntuacionRanking === null ? null : Math.round(Number(c.trabajador.puntuacionRanking) * 100) / 100,
      trabajosCompletados: c.trabajador.trabajosCompletados,
      porcentajeConAjuste: c.trabajador.trabajosCompletados > 0 ? Math.round((c.trabajador.trabajosConAjuste / c.trabajador.trabajosCompletados) * 100) : null,
      esNuevo: c.trabajador.puntuacionRanking === null,
    },
  }));
}

module.exports = { crear, listar };
