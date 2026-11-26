// M2 — Cotizaciones (RF-06). Enviar la primera cotización pasa la solicitud a "cotizada".
const prisma = require('../../shared/prisma');
const { errores } = require('../../shared/errors');
const { validarTransicion } = require('../requests/estados');
const solicitudes = require('../requests/service');
const { avisar } = require('../../shared/avisos');

async function crear(usuarioId, solicitudId, datos) {
  const r = await crearEnTx(usuarioId, solicitudId, datos);
  const s = await prisma.solicitud.findUnique({ where: { id: solicitudId }, select: { clienteId: true } });
  await avisar(null, s.clienteId, 'Recibiste una cotización nueva.', solicitudId);
  return r;
}

async function crearEnTx(usuarioId, solicitudId, datos) {
  return prisma.$transaction(async (tx) => {
    const perfil = await solicitudes.perfilTrabajadorDe(usuarioId, tx);
    // CA-06.2 (interacción M1→M2): sin verificación no se cotiza.
    if (!perfil || perfil.estadoVerificacion !== 'aprobado') {
      throw errores.forbidden('Tu cuenta debe estar verificada para cotizar');
    }
    if (perfil.suspendido) throw errores.forbidden('Tu cuenta está suspendida por reportes de clientes');
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

    const monto = datos.tipo === 'diagnostico' ? datos.costoVisita : datos.manoObra + datos.material;
    const cotizacion = await tx.cotizacion.create({
      data: {
        solicitudId: s.id,
        trabajadorId: perfil.id,
        monto,
        tiempoEstimadoHoras: datos.tiempoEstimadoHoras,
        tipo: datos.tipo,
        vigenciaDias: datos.vigenciaDias,
        ...(datos.tipo === 'diagnostico'
          ? { costoVisita: datos.costoVisita, visitaAbonable: datos.visitaAbonable }
          : { manoObra: datos.manoObra, material: datos.material }),
      },
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
      tiempoEstimadoHoras: cotizacion.tiempoEstimadoHoras,
      estado: cotizacion.estado,
      solicitudEstado: nuevoEstado,
      ...solicitudes.formaCotizacion(cotizacion),
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
  const reputacion = await require('../workers/reputacion').reputacionDe(lista.map((c) => c.trabajadorId));
  return lista.map((c) => ({
    id: c.id,
    tiempoEstimadoHoras: c.tiempoEstimadoHoras,
    estado: c.estado,
    creadaEn: c.creadaEn,
    ...solicitudes.formaCotizacion(c),
    trabajador: {
      id: c.trabajadorId,
      nombre: c.trabajador.usuario.nombre,
      fotoUrl: c.trabajador.fotoUrl,
      puntuacionRanking: c.trabajador.puntuacionRanking === null ? null : Math.round(Number(c.trabajador.puntuacionRanking) * 100) / 100,
      trabajosCompletados: c.trabajador.trabajosCompletados,
      porcentajeConAjuste: c.trabajador.trabajosCompletados > 0 ? Math.round((c.trabajador.trabajosConAjuste / c.trabajador.trabajosCompletados) * 100) : null,
      ...reputacion[c.trabajadorId],
      esNuevo: c.trabajador.puntuacionRanking === null,
    },
  }));
}

module.exports = { crear, listar };
