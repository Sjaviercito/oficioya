// Cambios de precio con aprobación del cliente (RF-16, v1.3). No cambia el estado de la solicitud.
const prisma = require('../../shared/prisma');
const storage = require('../../shared/storage');
const { errores } = require('../../shared/errors');
const { avisar } = require('../../shared/avisos');
const { validarImagen } = require('../../shared/middleware/upload');
const solicitudes = require('../requests/service');
const { validarPropuesta, montoVigente, ETIQUETAS } = require('./reglas');

const pesos = (x) => `$${Number(x).toFixed(2)}`;

async function trabajadorAceptado(usuarioId, s, db = prisma) {
  const perfil = await solicitudes.perfilTrabajadorDe(usuarioId, db);
  if (!perfil || !s.cotizacionAceptada || s.cotizacionAceptada.trabajadorId !== perfil.id) {
    throw errores.forbidden('Solo el trabajador aceptado puede hacer esto');
  }
  return perfil;
}

async function proponer(usuarioId, solicitudId, datos, foto) {
  let resultado;
  await prisma.$transaction(async (tx) => {
    const s = await solicitudes.cargar(solicitudId, tx);
    await trabajadorAceptado(usuarioId, s, tx);
    // Compatibilidad v1.0: un monto nuevo con motivo escrito equivale a "más trabajo".
    const propuesta = datos.tipo
      ? { tipo: datos.tipo, deltaManoObra: datos.deltaManoObra, deltaMaterial: datos.deltaMaterial, detalle: datos.detalle }
      : { tipo: 'mas_trabajo', deltaManoObra: datos.montoPropuesto - (montoVigente(s) || 0), deltaMaterial: 0, detalle: datos.motivo };
    const { montoAnterior, montoPropuesto, autoAceptar } = validarPropuesta(s, propuesta);

    let fotoClave = null;
    if (foto) fotoClave = await storage.guardarPrivadoCifrado('ajustes', validarImagen(foto));

    await tx.ajustePrecio.create({
      data: {
        solicitudId: s.id,
        tipo: propuesta.tipo,
        deltaManoObra: propuesta.deltaManoObra,
        deltaMaterial: propuesta.deltaMaterial,
        motivo: propuesta.detalle || ETIQUETAS[propuesta.tipo],
        montoAnterior,
        montoPropuesto,
        fotoClave,
        ...(autoAceptar ? { estado: 'aceptado', resueltoEn: new Date() } : {}),
      },
    });
    resultado = { clienteId: s.clienteId, montoAnterior, montoPropuesto, autoAceptar, tipo: propuesta.tipo };
  });
  const r = resultado;
  const texto = r.autoAceptar
    ? `El trabajador bajó el precio: ${pesos(r.montoAnterior)} → ${pesos(r.montoPropuesto)}.`
    : r.tipo === 'presupuesto'
      ? `El trabajador envió el presupuesto después del diagnóstico: ${pesos(r.montoPropuesto)}. Acéptalo o recházalo.`
      : `El trabajador propone cambiar el precio: ${pesos(r.montoAnterior)} → ${pesos(r.montoPropuesto)}.`;
  await avisar(null, r.clienteId, texto, solicitudId);
  return solicitudes.detalle(solicitudId, { id: usuarioId, rol: 'trabajador' });
}

async function decidir(usuarioId, solicitudId, ajusteId, { decision }) {
  await prisma.$transaction(async (tx) => {
    const s = await solicitudes.cargar(solicitudId, tx);
    if (s.clienteId !== usuarioId) throw errores.forbidden('Solo quien publicó la solicitud puede responder el cambio de precio');
    const ajuste = s.ajustes.find((a) => a.id === ajusteId);
    if (!ajuste) throw errores.notFound('Ajuste no encontrado');
    const { count } = await tx.ajustePrecio.updateMany({
      where: { id: ajusteId, estado: 'pendiente' },
      data: { estado: decision === 'aceptar' ? 'aceptado' : 'rechazado', resueltoEn: new Date() },
    });
    if (count === 0) throw errores.conflict('Este ajuste ya fue respondido', 'AJUSTE_RESUELTO');
  });
  const s = await prisma.solicitud.findUnique({ where: { id: solicitudId }, include: { cotizacionAceptada: { include: { trabajador: true } } } });
  await avisar(null, s.cotizacionAceptada.trabajador.usuarioId,
    decision === 'aceptar' ? 'El cliente aceptó el cambio de precio. Ya puedes comprar lo necesario.' : 'El cliente rechazó el cambio de precio; el trabajo sigue al precio anterior.', solicitudId);
  return solicitudes.detalle(solicitudId, { id: usuarioId, rol: 'cliente' });
}

// v1.3: ticket opcional después de comprar. Si salió más barato, el monto final baja solo.
async function subirTicket(usuarioId, solicitudId, ajusteId, { ticketMonto }, archivo) {
  if (!archivo) throw errores.badRequest('Sube la foto del ticket');
  const s = await solicitudes.cargar(solicitudId);
  await trabajadorAceptado(usuarioId, s);
  if (!['aceptada', 'en_curso'].includes(s.estado)) throw errores.conflict('El ticket se sube mientras el trabajo está activo', 'TRANSICION_INVALIDA');
  const a = s.ajustes.find((x) => x.id === ajusteId);
  if (!a) throw errores.notFound('Ajuste no encontrado');
  if (a.estado !== 'aceptado' || Number(a.deltaMaterial) <= 0) throw errores.conflict('Solo se comprueba material de un cambio aceptado', 'SIN_MATERIAL');
  if (a.ticketClave) throw errores.conflict('Ya subiste el ticket de este cambio', 'TICKET_EXISTENTE');
  const clave = await storage.guardarPrivadoCifrado('tickets', validarImagen(archivo));
  await prisma.ajustePrecio.update({ where: { id: ajusteId }, data: { ticketClave: clave, ticketMonto, ticketEn: new Date() } });
  const ahorro = Math.max(0, Number(a.deltaMaterial) - ticketMonto);
  await avisar(null, s.clienteId, ahorro > 0
    ? `El trabajador subió el ticket: el material costó ${pesos(ticketMonto)}, así que tu total baja ${pesos(ahorro)}.`
    : `El trabajador subió el ticket del material (${pesos(ticketMonto)}).`, solicitudId);
  return solicitudes.detalle(solicitudId, { id: usuarioId, rol: 'trabajador' });
}

// Foto del problema o ticket: solo las dos partes del trabajo.
async function archivo(usuario, solicitudId, ajusteId, cual) {
  const s = await solicitudes.cargar(solicitudId);
  const perfil = usuario.rol === 'trabajador' ? await solicitudes.perfilTrabajadorDe(usuario.id) : null;
  const esParte = s.clienteId === usuario.id || (perfil && s.cotizacionAceptada && s.cotizacionAceptada.trabajadorId === perfil.id) || usuario.rol === 'admin';
  if (!esParte) throw errores.forbidden('No tienes acceso a este archivo');
  const a = s.ajustes.find((x) => x.id === ajusteId);
  const clave = a && (cual === 'foto' ? a.fotoClave : a.ticketClave);
  if (!clave) throw errores.notFound('Archivo no encontrado');
  return storage.leerPrivadoDescifrado(clave);
}

module.exports = { proponer, decidir, subirTicket, archivo };
