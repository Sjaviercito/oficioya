// RF-11 (avisos en la app), RF-12 (respuesta a reseñas) y RF-13 (reportes y suspensión).
const { Router } = require('express');
const prisma = require('../../shared/prisma');
const { z, uuid } = require('../../shared/validacion');
const { errores } = require('../../shared/errors');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');
const solicitudes = require('../requests/service');

const router = Router();
router.use(requiereSesion);

// RF-11: avisos del usuario (no leídos primero).
router.get('/notifications', async (req, res) => {
  const lista = await prisma.notificacion.findMany({
    where: { usuarioId: req.usuario.id },
    orderBy: [{ leida: 'asc' }, { creadaEn: 'desc' }],
    take: 50,
  });
  res.json(lista);
});
// v1.4: contador para el menú (no hay notificaciones push).
router.get('/notifications/unread-count', async (req, res) => {
  res.json({ noLeidos: await prisma.notificacion.count({ where: { usuarioId: req.usuario.id, leida: false } }) });
});
router.post('/notifications/read', async (req, res) => {
  await prisma.notificacion.updateMany({ where: { usuarioId: req.usuario.id, leida: false }, data: { leida: true } });
  res.status(204).end();
});

// RF-12: el trabajador calificado responde una sola vez a su reseña.
const respuesta = z.object({
  respuesta: z.string({ message: 'Escribe tu respuesta' }).trim().min(5, { message: 'La respuesta debe tener al menos 5 caracteres' }).max(500, { message: 'La respuesta puede tener máximo 500 caracteres' }),
});
router.post('/requests/:id/review/response', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const datos = respuesta.parse(req.body);
  const perfil = await solicitudes.perfilTrabajadorDe(req.usuario.id);
  const resena = await prisma.resena.findUnique({ where: { solicitudId: id } });
  if (!resena) throw errores.notFound('Esta solicitud no tiene reseña');
  if (!perfil || resena.trabajadorId !== perfil.id) throw errores.forbidden('Solo el trabajador calificado puede responder');
  const { count } = await prisma.resena.updateMany({
    where: { id: resena.id, respuesta: null },
    data: { respuesta: datos.respuesta, respondidaEn: new Date() },
  });
  if (count === 0) throw errores.conflict('Ya respondiste esta reseña');
  res.status(201).json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

// RF-13 (v1.2: en ambos sentidos): el cliente reporta al trabajador aceptado, o el trabajador
// aceptado reporta al cliente. Un reporte por solicitud y por sentido.
const reporte = z.object({
  motivo: z.string({ message: 'Describe el problema' }).trim().min(10, { message: 'Describe el problema (mínimo 10 caracteres)' }).max(500),
});
router.post('/requests/:id/report', requiereRol('cliente', 'trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { motivo } = reporte.parse(req.body);
  const s = await prisma.solicitud.findUnique({ where: { id }, include: { cotizacionAceptada: true } });
  if (!s) throw errores.notFound('Solicitud no encontrada');
  if (!s.cotizacionAceptada) throw errores.conflict('Solo se reporta cuando hay una cotización aceptada');
  let rolReportado;
  if (req.usuario.rol === 'cliente') {
    if (s.clienteId !== req.usuario.id) throw errores.forbidden('Solo puedes reportar trabajadores que contrataste');
    rolReportado = 'trabajador';
  } else {
    const perfil = await solicitudes.perfilTrabajadorDe(req.usuario.id);
    if (!perfil || perfil.id !== s.cotizacionAceptada.trabajadorId) throw errores.forbidden('Solo puedes reportar clientes de tus trabajos aceptados');
    rolReportado = 'cliente';
  }
  const ya = await prisma.reporte.findUnique({ where: { solicitudId_rolReportado: { solicitudId: id, rolReportado } } });
  if (ya) throw errores.conflict('Ya reportaste esta solicitud');
  await prisma.reporte.create({
    data: { solicitudId: id, clienteId: s.clienteId, trabajadorId: s.cotizacionAceptada.trabajadorId, motivo, rolReportado },
  });
  res.status(201).json({ ok: true });
});

router.get('/admin/reports', requiereRol('admin'), async (req, res) => {
  const lista = await prisma.reporte.findMany({ where: { atendido: false }, orderBy: { creadoEn: 'asc' } });
  const perfiles = await prisma.perfilTrabajador.findMany({
    where: { id: { in: [...new Set(lista.map((r) => r.trabajadorId))] } },
    include: { usuario: { select: { nombre: true } } },
  });
  const clientes = await prisma.usuario.findMany({ where: { id: { in: [...new Set(lista.map((r) => r.clienteId))] } } });
  const pid = Object.fromEntries(perfiles.map((p) => [p.id, p]));
  const cid = Object.fromEntries(clientes.map((c) => [c.id, c]));
  res.json(lista.map((r) => {
    const reportado = r.rolReportado === 'trabajador'
      ? { rol: 'trabajador', nombre: pid[r.trabajadorId]?.usuario.nombre, suspendido: pid[r.trabajadorId]?.suspendido }
      : { rol: 'cliente', nombre: cid[r.clienteId]?.nombre, suspendido: cid[r.clienteId]?.suspendido };
    return { ...r, reportado, trabajador: { nombre: reportado.nombre, suspendido: reportado.suspendido } };
  }));
});

const accion = z.object({ accion: z.enum(['suspender', 'descartar'], { message: 'La acción debe ser suspender o descartar' }) });
router.patch('/admin/reports/:reporteId', requiereRol('admin'), async (req, res) => {
  const reporteId = uuid.parse(req.params.reporteId);
  const { accion: a } = accion.parse(req.body);
  const r = await prisma.reporte.findUnique({ where: { id: reporteId } });
  if (!r) throw errores.notFound('Reporte no encontrado');
  if (r.atendido) throw errores.conflict('Este reporte ya fue atendido');
  await prisma.$transaction([
    prisma.reporte.update({ where: { id: reporteId }, data: { atendido: true } }),
    ...(a === 'suspender'
      ? [r.rolReportado === 'trabajador'
        ? prisma.perfilTrabajador.update({ where: { id: r.trabajadorId }, data: { suspendido: true } })
        : prisma.usuario.update({ where: { id: r.clienteId }, data: { suspendido: true } })]
      : []),
  ]);
  res.json({ ok: true, accion: a });
});

// Mejora v1.1-7: el administrador levanta una suspensión con motivo.
const levantar = z.object({ motivo: z.string({ message: 'Escribe el motivo' }).trim().min(10, { message: 'Escribe el motivo (mínimo 10 caracteres)' }).max(300) });
router.patch('/admin/workers/:trabajadorId/reinstate', requiereRol('admin'), async (req, res) => {
  const trabajadorId = uuid.parse(req.params.trabajadorId);
  levantar.parse(req.body);
  const { count } = await prisma.perfilTrabajador.updateMany({ where: { id: trabajadorId, suspendido: true }, data: { suspendido: false } });
  if (count === 0) throw errores.conflict('Este trabajador no está suspendido');
  const p = await prisma.perfilTrabajador.findUnique({ where: { id: trabajadorId } });
  await require('../../shared/avisos').avisar(null, p.usuarioId, 'Tu cuenta fue reactivada por el equipo de OficioYa.');
  res.json({ ok: true });
});

// v1.1-3: perfil público del trabajador (cualquier usuario con sesión). Sin correo ni datos de contacto.
router.get('/workers/:trabajadorId/public', async (req, res) => {
  const id = uuid.parse(req.params.trabajadorId);
  const p = await prisma.perfilTrabajador.findFirst({
    where: { id, estadoVerificacion: 'aprobado', suspendido: false },
    include: {
      usuario: { select: { nombre: true } },
      oficios: { include: { oficio: true } },
      zonas: { include: { zona: true } },
      resenas: { orderBy: { creadaEn: 'desc' }, select: { estrellas: true, comentario: true, creadaEn: true, respuesta: true } },
    },
  });
  if (!p) throw errores.notFound('Trabajador no encontrado');
  const repPublica = await require('../workers/reputacion').reputacionDe([p.id]);
  const r2 = (n) => (n === null ? null : Math.round(Number(n) * 100) / 100);
  res.json({
    id: p.id,
    nombre: p.usuario.nombre,
    fotoUrl: p.fotoUrl,
    experienciaAnios: p.experienciaAnios,
    oficios: p.oficios.map((o) => o.oficio.nombre),
    zonas: p.zonas.map((z) => z.zona.nombre),
    trabajosCompletados: p.trabajosCompletados,
    puntuacionRanking: r2(p.puntuacionRanking),
    calificacionPonderada: r2(p.calificacionPonderada),
    tasaCancelacion: r2(p.tasaCancelacion),
    porcentajeConAjuste: p.trabajosCompletados > 0 ? Math.round((p.trabajosConAjuste / p.trabajosCompletados) * 100) : null,
    esNuevo: p.puntuacionRanking === null,
    resenas: p.resenas,
    ...(() => { const r = repPublica[p.id] || {}; return { sobreCotizadoPromedio: r.sobreCotizadoPromedio ?? null, insignias: r.insignias || [], cancelacionesPorDesacuerdo: r.cancelacionesPorDesacuerdo || 0 }; })(),
  });
});

// v1.1-5: el administrador configura el tope de ajuste de cada oficio (10 % a 100 %).
const tope = z.object({
  topeAjuste: z.coerce.number({ message: 'Escribe el tope' }).min(0.1, { message: 'El tope debe estar entre 10 % y 100 %' }).max(1, { message: 'El tope debe estar entre 10 % y 100 %' }),
});
router.patch('/admin/oficios/:oficioId', requiereRol('admin'), async (req, res) => {
  const oficioId = z.coerce.number().int().positive().parse(req.params.oficioId);
  const { topeAjuste } = tope.parse(req.body);
  const existe = await prisma.oficio.findUnique({ where: { id: oficioId } });
  if (!existe) throw errores.notFound('Oficio no encontrado');
  const o = await prisma.oficio.update({ where: { id: oficioId }, data: { topeAjuste } });
  res.json({ ...o, topeAjuste: Number(o.topeAjuste) });
});

// v1.1-7: lista de trabajadores suspendidos para poder reactivarlos.
router.get('/admin/workers/suspended', requiereRol('admin'), async (req, res) => {
  const lista = await prisma.perfilTrabajador.findMany({
    where: { suspendido: true, usuario: { eliminadoEn: null } },
    include: { usuario: { select: { nombre: true, email: true } } },
  });
  res.json(lista.map((p) => ({ trabajadorId: p.id, nombre: p.usuario.nombre, email: p.usuario.email })));
});

// v1.2: clientes suspendidos y su reactivación.
router.get('/admin/users/suspended', requiereRol('admin'), async (req, res) => {
  const lista = await prisma.usuario.findMany({ where: { suspendido: true, rol: 'cliente', eliminadoEn: null } });
  res.json(lista.map((u) => ({ usuarioId: u.id, nombre: u.nombre, email: u.email })));
});
router.patch('/admin/users/:usuarioId/reinstate', requiereRol('admin'), async (req, res) => {
  const usuarioId = uuid.parse(req.params.usuarioId);
  levantar.parse(req.body);
  const { count } = await prisma.usuario.updateMany({ where: { id: usuarioId, suspendido: true }, data: { suspendido: false } });
  if (count === 0) throw errores.conflict('Este cliente no está suspendido');
  await require('../../shared/avisos').avisar(null, usuarioId, 'Tu cuenta fue reactivada por el equipo de OficioYa.');
  res.json({ ok: true });
});

module.exports = router;
