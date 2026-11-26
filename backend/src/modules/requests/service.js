// M2 — Solicitudes: creación, consulta y transiciones de estado (RF-05, RF-07, RF-08).
// Toda transición usa la tabla de estados.js y corre dentro de una transacción (ADR-06).
const prisma = require('../../shared/prisma');
const storage = require('../../shared/storage');
const { errores } = require('../../shared/errors');
const { validarImagen } = require('../../shared/middleware/upload');
const { diasCompletosEntre } = require('../../shared/fechas');
const { validarTransicion, ESTADOS_ABIERTOS_A_COTIZACION } = require('./estados');
const ranking = require('../ranking/service');

const PLAZO_RESENA_DIAS = 30;
const HORAS_PARA_DISPUTAR = 72;
const MOTIVO_SIN_ACUERDO = 'No puedo continuar con el precio original'; // v1.3: cancelación sin penalización con evidencia
const { montoVigente, metricasAlCompletar, TIPOS_DEL_TRABAJADOR, ETIQUETAS } = require('../adjustments/reglas');
const { avisar } = require('../../shared/avisos');

const INCLUDE_DETALLE = {
  oficio: true,
  zona: true,
  fotos: { select: { url: true } },
  cliente: { select: { id: true, nombre: true, telefono: true } },
  cotizaciones: { select: { id: true, trabajadorId: true, estado: true, monto: true, tiempoEstimadoHoras: true, creadaEn: true, tipo: true, manoObra: true, material: true, vigenciaDias: true, costoVisita: true, visitaAbonable: true } },
  preguntas: { orderBy: { creadaEn: 'asc' } },
  cotizacionAceptada: { include: { trabajador: { include: { usuario: { select: { nombre: true, telefono: true } } } } } },
  cancelacion: { select: { rolQueCancela: true, motivo: true, detalle: true, fecha: true, atribuibleAlTrabajador: true } },
  resena: { select: { estrellas: true, comentario: true, creadaEn: true, respuesta: true, respondidaEn: true } },
  ajustes: { orderBy: { creadoEn: 'asc' } },
};

const fechaISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const num = (x) => (x === null || x === undefined ? null : Number(x));

// v1.3: forma pública de una cotización (tipo, desglose y vigencia).
function formaCotizacion(c) {
  const venceEn = new Date(new Date(c.creadaEn).getTime() + c.vigenciaDias * 86400000);
  return {
    tipo: c.tipo,
    monto: Number(c.monto),
    manoObra: num(c.manoObra),
    material: num(c.material),
    costoVisita: num(c.costoVisita),
    visitaAbonable: c.visitaAbonable,
    vigenciaDias: c.vigenciaDias,
    venceEn,
    vencida: c.estado === 'pendiente' && venceEn.getTime() < Date.now(),
  };
}

async function perfilTrabajadorDe(usuarioId, db = prisma) {
  return db.perfilTrabajador.findUnique({
    where: { usuarioId },
    include: { oficios: true, zonas: true },
  });
}

// Qué relación tiene el usuario con la solicitud; decide permisos y si ve la dirección (RNF-04).
function relacionCon(solicitud, usuario, perfil) {
  if (usuario.rol === 'cliente') return solicitud.clienteId === usuario.id ? 'clienteDueno' : null;
  if (usuario.rol !== 'trabajador' || !perfil) return null;
  if (solicitud.cotizacionAceptada && solicitud.cotizacionAceptada.trabajadorId === perfil.id) return 'trabajadorAceptado';
  if (solicitud.cotizaciones.some((c) => c.trabajadorId === perfil.id)) return 'trabajadorCotizo';
  const elegible =
    perfil.estadoVerificacion === 'aprobado' &&
    ESTADOS_ABIERTOS_A_COTIZACION.includes(solicitud.estado) &&
    perfil.oficios.some((o) => o.oficioId === solicitud.oficioId) &&
    perfil.zonas.some((z) => z.zonaId === solicitud.zonaId);
  return elegible ? 'trabajadorElegible' : null;
}

function serializar(s, relacion, perfil) {
  const verDireccion =
    relacion === 'clienteDueno' ||
    (relacion === 'trabajadorAceptado' && ['aceptada', 'en_curso', 'completada'].includes(s.estado));
  const miCotizacion = perfil ? s.cotizaciones.find((c) => c.trabajadorId === perfil.id) : null;
  const plazoResena =
    s.estado === 'completada' && s.completadaEn
      ? Math.max(0, PLAZO_RESENA_DIAS - diasCompletosEntre(s.completadaEn))
      : null;

  const salida = {
    id: s.id,
    oficio: { ...s.oficio, topeAjuste: Number(s.oficio.topeAjuste) },
    zona: s.zona,
    colonia: s.colonia,
    descripcion: s.descripcion,
    fechaDeseada: fechaISO(s.fechaDeseada),
    estado: s.estado,
    creadaEn: s.creadaEn,
    completadaEn: s.completadaEn,
    fotos: s.fotos.map((f) => f.url),
    cliente: { nombre: s.cliente.nombre },
    numeroCotizaciones: s.cotizaciones.length,
    trabajadorAceptado: s.cotizacionAceptada
      ? {
          id: s.cotizacionAceptada.trabajadorId,
          nombre: s.cotizacionAceptada.trabajador.usuario.nombre,
          tiempoEstimadoHoras: s.cotizacionAceptada.tiempoEstimadoHoras,
          ...formaCotizacion(s.cotizacionAceptada),
        }
      : null,
    // RF-16: monto vigente (cotización o último ajuste aceptado) e historial de ajustes.
    montoFinal: s.cotizacionAceptada ? montoVigente(s) : null,
    ajustes: (s.ajustes || []).map((a) => ({
      id: a.id,
      tipo: a.tipo,
      etiqueta: ETIQUETAS[a.tipo],
      montoAnterior: Number(a.montoAnterior),
      montoPropuesto: Number(a.montoPropuesto),
      deltaManoObra: Number(a.deltaManoObra),
      deltaMaterial: Number(a.deltaMaterial),
      motivo: a.motivo,
      estado: a.estado,
      tieneFoto: Boolean(a.fotoClave),
      tieneTicket: Boolean(a.ticketClave),
      ticketMonto: num(a.ticketMonto),
      creadoEn: a.creadoEn,
      resueltoEn: a.resueltoEn,
    })),
    // RF-21: preguntas antes de cotizar (sin datos de contacto).
    preguntas: (s.preguntas || []).map((q) => ({
      id: q.id, texto: q.texto, respuesta: q.respuesta, creadaEn: q.creadaEn,
      mia: Boolean(perfil && q.trabajadorId === perfil.id),
    })),
    cancelacion: s.cancelacion,
    resena: s.resena,
    diasRestantesParaResena: s.resena ? null : plazoResena,
    miRelacion: relacion,
    miCotizacion: miCotizacion
      ? { id: miCotizacion.id, estado: miCotizacion.estado, tiempoEstimadoHoras: miCotizacion.tiempoEstimadoHoras, ...formaCotizacion({ ...miCotizacion, creadaEn: miCotizacion.creadaEn }) }
      : null,
  };
  // RNF-04: la dirección exacta ni siquiera viaja en el JSON para quien no debe verla.
  if (verDireccion) salida.direccionExacta = s.direccionExacta;

  // v1.2: contacto directo (RNF-04 ampliado). Solo cliente dueño y trabajador aceptado, y solo
  // mientras el trabajo está activo; el teléfono nunca viaja para nadie más.
  const activo = ['aceptada', 'en_curso'].includes(s.estado);
  if (activo && s.cotizacionAceptada && relacion === 'clienteDueno') {
    salida.contacto = { nombre: s.cotizacionAceptada.trabajador.usuario.nombre, telefono: s.cotizacionAceptada.trabajador.usuario.telefono };
  } else if (activo && relacion === 'trabajadorAceptado') {
    salida.contacto = { nombre: s.cliente.nombre, telefono: s.cliente.telefono };
  }

  // v1.2: horario de visita y "terminado" marcado por el trabajador.
  salida.visita = s.visitaPropuesta ? { fechaHora: s.visitaPropuesta, confirmada: s.visitaConfirmada } : null;
  salida.terminadaPorTrabajadorEn = s.terminadaPorTrabajadorEn;
  salida.horasParaDisputar = s.terminadaPorTrabajadorEn && s.estado === 'en_curso'
    ? Math.max(0, Math.ceil(HORAS_PARA_DISPUTAR - (Date.now() - new Date(s.terminadaPorTrabajadorEn).getTime()) / 3600000))
    : null;
  salida.disputaMotivo = s.disputaMotivo;
  return salida;
}

async function cargar(id, db = prisma) {
  const s = await db.solicitud.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  if (!s) throw errores.notFound('Solicitud no encontrada');
  return s;
}

async function verificarClienteActivo(clienteId, db = prisma) {
  const u = await db.usuario.findUnique({ where: { id: clienteId }, select: { suspendido: true } });
  if (!u || u.suspendido) throw errores.forbidden('Tu cuenta está suspendida por reportes de trabajadores');
}

async function crear(clienteId, datos, fotos = []) {
  await verificarClienteActivo(clienteId);
  const [oficio, zona] = await Promise.all([
    prisma.oficio.findUnique({ where: { id: datos.oficioId } }),
    prisma.zona.findUnique({ where: { id: datos.zonaId } }),
  ]);
  if (!oficio) throw errores.badRequest('El oficio no existe');
  if (!zona) throw errores.badRequest('La zona no existe');

  fotos.forEach(validarImagen);
  const urls = [];
  for (const f of fotos) urls.push(await storage.guardarPublico('solicitudes', f));

  const s = await prisma.solicitud.create({
    data: {
      clienteId,
      oficioId: datos.oficioId,
      zonaId: datos.zonaId,
      colonia: datos.colonia,
      direccionExacta: datos.direccionExacta,
      descripcion: datos.descripcion,
      fechaDeseada: new Date(`${datos.fechaDeseada}T00:00:00Z`),
      fotos: { create: urls.map((url) => ({ url })) },
    },
    include: INCLUDE_DETALLE,
  });
  // Mejora v1.1-2: aviso a trabajadores verificados (no suspendidos) del oficio y la zona.
  const destinatarios = await prisma.perfilTrabajador.findMany({
    where: { estadoVerificacion: 'aprobado', suspendido: false, oficios: { some: { oficioId: datos.oficioId } }, zonas: { some: { zonaId: datos.zonaId } } },
    select: { usuarioId: true },
  });
  for (const d of destinatarios) await avisar(null, d.usuarioId, `Nueva solicitud de ${oficio.nombre} en ${zona.nombre}.`, s.id);
  return serializar(s, 'clienteDueno', null);
}

async function detalle(id, usuario) {
  await completarVencidas();
  const s = await cargar(id);
  const perfil = usuario.rol === 'trabajador' ? await perfilTrabajadorDe(usuario.id) : null;
  const relacion = relacionCon(s, usuario, perfil);
  if (!relacion) throw errores.forbidden('No tienes acceso a esta solicitud');
  return serializar(s, relacion, perfil);
}

// "Mis solicitudes": del cliente (las suyas) o del trabajador (donde cotizó).
async function mias(usuario) {
  await completarVencidas();
  if (usuario.rol === 'cliente') {
    const lista = await prisma.solicitud.findMany({
      where: { clienteId: usuario.id },
      include: INCLUDE_DETALLE,
      orderBy: { creadaEn: 'desc' },
    });
    return lista.map((s) => serializar(s, 'clienteDueno', null));
  }
  const perfil = await perfilTrabajadorDe(usuario.id);
  if (!perfil) return [];
  const lista = await prisma.solicitud.findMany({
    where: { cotizaciones: { some: { trabajadorId: perfil.id } } },
    include: INCLUDE_DETALLE,
    orderBy: { creadaEn: 'desc' },
  });
  return lista.map((s) => serializar(s, relacionCon(s, usuario, perfil), perfil));
}

// Solicitudes que un trabajador verificado puede cotizar (sin dirección exacta).
async function disponibles(usuarioId) {
  const perfil = await perfilTrabajadorDe(usuarioId);
  if (!perfil || perfil.estadoVerificacion !== 'aprobado') {
    throw errores.forbidden('Tu cuenta debe estar verificada para ver solicitudes');
  }
  if (perfil.suspendido) throw errores.forbidden('Tu cuenta está suspendida por reportes de clientes');
  const lista = await prisma.solicitud.findMany({
    where: {
      estado: { in: ESTADOS_ABIERTOS_A_COTIZACION },
      oficioId: { in: perfil.oficios.map((o) => o.oficioId) },
      zonaId: { in: perfil.zonas.map((z) => z.zonaId) },
    },
    include: INCLUDE_DETALLE,
    orderBy: { creadaEn: 'desc' },
  });
  return lista.map((s) => serializar(s, relacionCon(s, { rol: 'trabajador' }, perfil), perfil));
}

// Cambia el estado solo si sigue en el estado leído (evita carreras, CA-07.5).
async function cambiarEstado(tx, solicitud, nuevoEstado, extra = {}) {
  const { count } = await tx.solicitud.updateMany({
    where: { id: solicitud.id, estado: solicitud.estado },
    data: { estado: nuevoEstado, ...extra },
  });
  if (count === 0) throw errores.conflict('La solicitud cambió mientras hacías esta acción; recarga e intenta de nuevo', 'TRANSICION_INVALIDA');
}

// RF-07: el cliente acepta una cotización; las demás quedan rechazadas.
async function aceptar(usuarioId, solicitudId, cotizacionId) {
  await prisma.$transaction(async (tx) => {
    const s = await cargar(solicitudId, tx);
    if (s.clienteId !== usuarioId) throw errores.forbidden('Solo quien publicó la solicitud puede aceptar cotizaciones');
    await verificarClienteActivo(usuarioId, tx);
    const cot = s.cotizaciones.find((c) => c.id === cotizacionId);
    if (!cot) throw errores.badRequest('La cotización no pertenece a esta solicitud');
    // v1.3 (LFPC art. 59): la cotización tiene vigencia.
    if (formaCotizacion(cot).vencida) throw errores.conflict('Esta cotización ya venció; pide al trabajador que cotice de nuevo', 'COTIZACION_VENCIDA');
    const nuevo = validarTransicion('aceptar', s.estado);

    await cambiarEstado(tx, s, nuevo, { cotizacionAceptadaId: cot.id });
    await tx.cotizacion.update({ where: { id: cot.id }, data: { estado: 'aceptada' } });
    await tx.cotizacion.updateMany({
      where: { solicitudId: s.id, id: { not: cot.id }, estado: 'pendiente' },
      data: { estado: 'rechazada' },
    });
    await tx.perfilTrabajador.update({
      where: { id: cot.trabajadorId },
      data: { solicitudesAceptadas: { increment: 1 } },
    });
    await ranking.recalcularTrabajador(cot.trabajadorId, tx);
  });
  const ganador = await prisma.solicitud.findUnique({ where: { id: solicitudId }, include: { cotizacionAceptada: { include: { trabajador: true } } } });
  await avisar(null, ganador.cotizacionAceptada.trabajador.usuarioId, 'El cliente aceptó tu cotización. Ya puedes ver la dirección.', solicitudId);
  return detalle(solicitudId, { id: usuarioId, rol: 'cliente' });
}

// RF-07: el trabajador aceptado inicia el trabajo.
async function iniciar(usuarioId, solicitudId) {
  await prisma.$transaction(async (tx) => {
    const s = await cargar(solicitudId, tx);
    const perfil = await perfilTrabajadorDe(usuarioId, tx);
    if (!perfil || !s.cotizacionAceptada || s.cotizacionAceptada.trabajadorId !== perfil.id) {
      throw errores.forbidden('Solo el trabajador aceptado puede iniciar este trabajo');
    }
    await cambiarEstado(tx, s, validarTransicion('iniciar', s.estado));
  });
  return detalle(solicitudId, { id: usuarioId, rol: 'trabajador' });
}

// Lógica común de completar (confirmación del cliente o vencimiento de las 72 h).
async function completarEnTx(tx, s) {
  const nuevo = validarTransicion('completar', s.estado);
  // CA-16.8: no se completa el trabajo con un ajuste sin responder.
  if (s.ajustes.some((a) => a.estado === 'pendiente')) {
    throw errores.conflict('Responde el ajuste de precio pendiente antes de confirmar que el trabajo terminó', 'AJUSTE_PENDIENTE');
  }
  await cambiarEstado(tx, s, nuevo, { completadaEn: new Date() });
  const trabajadorId = s.cotizacionAceptada.trabajadorId;
  // Solo cuentan los cambios atribuibles al trabajador (no lo que pidió el cliente, ni el presupuesto
  // del diagnóstico, ni las bajas de precio).
  const delTrabajador = (a) => TIPOS_DEL_TRABAJADOR.includes(a.tipo);
  const conAjuste = s.ajustes.some((a) => a.estado === 'aceptado' && delTrabajador(a));
  const conRechazado = s.ajustes.some((a) => a.estado === 'rechazado' && delTrabajador(a));
  const metricas = metricasAlCompletar(s);
  await tx.solicitud.update({ where: { id: s.id }, data: metricas });
  await tx.perfilTrabajador.update({
    where: { id: trabajadorId },
    data: {
      trabajosCompletados: { increment: 1 },
      ...(conAjuste ? { trabajosConAjuste: { increment: 1 } } : {}),
      ...(conRechazado ? { trabajosConAjusteRechazado: { increment: 1 } } : {}),
    },
  });
  await ranking.recalcularTrabajador(trabajadorId, tx);
}

// v1.2: completa los trabajos que el trabajador marcó como terminados hace más de 72 h sin disputa.
async function completarVencidas(ahora = new Date()) {
  const limite = new Date(ahora.getTime() - HORAS_PARA_DISPUTAR * 3600000);
  const vencidas = await prisma.solicitud.findMany({
    where: { estado: 'en_curso', terminadaPorTrabajadorEn: { lte: limite }, ajustes: { none: { estado: 'pendiente' } } },
    select: { id: true, clienteId: true },
  });
  for (const v of vencidas) {
    try {
      await prisma.$transaction(async (tx) => completarEnTx(tx, await cargar(v.id, tx)));
      await avisar(null, v.clienteId, 'Tu trabajo se dio por terminado porque no respondiste en 72 horas. Ya puedes calificarlo.', v.id);
    } catch (e) {
      if (e.status !== 409) console.error('[completarVencidas]', e.message);
    }
  }
  return vencidas.length;
}

// RF-07: el cliente confirma que el trabajo terminó; se habilita la reseña.
async function completar(usuarioId, solicitudId) {
  await prisma.$transaction(async (tx) => {
    const s = await cargar(solicitudId, tx);
    if (s.clienteId !== usuarioId) throw errores.forbidden('Solo quien publicó la solicitud puede confirmar que terminó');
    await completarEnTx(tx, s);
  });
  return detalle(solicitudId, { id: usuarioId, rol: 'cliente' });
}

// RF-08: cancelación. Solo es atribuible si cancela el trabajador aceptado.
async function cancelar(usuario, solicitudId, { motivo, detalle: detalleTexto }) {
  await prisma.$transaction(async (tx) => {
    const s = await cargar(solicitudId, tx);
    let accion;
    let trabajadorAtribuible = null;

    if (usuario.rol === 'cliente' && s.clienteId === usuario.id) {
      if (motivo === MOTIVO_SIN_ACUERDO) throw errores.badRequest('Elige otro motivo de cancelación');
      accion = 'cancelarCliente';
    } else if (usuario.rol === 'trabajador') {
      const perfil = await perfilTrabajadorDe(usuario.id, tx);
      const esAceptado = perfil && s.cotizacionAceptada && s.cotizacionAceptada.trabajadorId === perfil.id;
      if (!esAceptado) {
        // Un trabajador que solo cotizó no cancela la solicitud del cliente.
        if (s.estado === 'completada' || s.estado === 'cancelada') validarTransicion('cancelarTrabajador', s.estado);
        throw errores.forbidden('Solo el trabajador aceptado o el cliente pueden cancelar');
      }
      accion = 'cancelarTrabajador';
      trabajadorAtribuible = perfil.id;
      // v1.3: "No puedo continuar con el precio original" no se atribuye al trabajador si el cliente
      // rechazó un aumento que tenía foto del problema como evidencia.
      if (motivo === MOTIVO_SIN_ACUERDO) {
        const conEvidencia = s.ajustes.some((a) => a.estado === 'rechazado' && TIPOS_DEL_TRABAJADOR.includes(a.tipo) && a.fotoClave);
        if (!conEvidencia) {
          throw errores.conflict('Esta opción requiere un cambio de precio rechazado que tenga foto del problema', 'SIN_EVIDENCIA');
        }
        trabajadorAtribuible = null;
      }
    } else {
      throw errores.forbidden('No puedes cancelar esta solicitud');
    }

    await cambiarEstado(tx, s, validarTransicion(accion, s.estado));
    await tx.cancelacion.create({
      data: {
        solicitudId: s.id,
        canceladaPor: usuario.id,
        rolQueCancela: usuario.rol,
        motivo,
        detalle: detalleTexto || null,
        atribuibleAlTrabajador: trabajadorAtribuible !== null,
      },
    });
    // CA-16.9: un ajuste sin responder queda rechazado al cancelar.
    await tx.ajustePrecio.updateMany({ where: { solicitudId: s.id, estado: 'pendiente' }, data: { estado: 'rechazado', resueltoEn: new Date() } });
    // CA-08.3: las cotizaciones pendientes quedan rechazadas.
    await tx.cotizacion.updateMany({ where: { solicitudId: s.id, estado: 'pendiente' }, data: { estado: 'rechazada' } });

    if (trabajadorAtribuible) {
      await tx.perfilTrabajador.update({
        where: { id: trabajadorAtribuible },
        data: { cancelacionesAtribuibles: { increment: 1 } },
      });
      await ranking.recalcularTrabajador(trabajadorAtribuible, tx);
    }
  });
  return detalle(solicitudId, usuario);
}

module.exports = {
  crear,
  detalle,
  mias,
  disponibles,
  aceptar,
  iniciar,
  completar,
  cancelar,
  cargar,
  completarVencidas,
  verificarClienteActivo,
  HORAS_PARA_DISPUTAR,
  formaCotizacion,
  perfilTrabajadorDe,
  relacionCon,
  serializar,
  PLAZO_RESENA_DIAS,
};
