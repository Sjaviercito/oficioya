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

// RF-13: el cliente reporta al trabajador de una de sus solicitudes aceptadas.
const reporte = z.object({
  motivo: z.string({ message: 'Describe el problema' }).trim().min(10, { message: 'Describe el problema (mínimo 10 caracteres)' }).max(500),
});
router.post('/requests/:id/report', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { motivo } = reporte.parse(req.body);
  const s = await prisma.solicitud.findUnique({ where: { id }, include: { cotizacionAceptada: true } });
  if (!s) throw errores.notFound('Solicitud no encontrada');
  if (s.clienteId !== req.usuario.id) throw errores.forbidden('Solo puedes reportar trabajadores que contrataste');
  if (!s.cotizacionAceptada) throw errores.conflict('Solo se reporta a un trabajador cuya cotización aceptaste');
  const ya = await prisma.reporte.findUnique({ where: { solicitudId_clienteId: { solicitudId: id, clienteId: req.usuario.id } } });
  if (ya) throw errores.conflict('Ya reportaste esta solicitud');
  await prisma.reporte.create({ data: { solicitudId: id, clienteId: req.usuario.id, trabajadorId: s.cotizacionAceptada.trabajadorId, motivo } });
  res.status(201).json({ ok: true });
});

router.get('/admin/reports', requiereRol('admin'), async (req, res) => {
  const lista = await prisma.reporte.findMany({ where: { atendido: false }, orderBy: { creadoEn: 'asc' } });
  const perfiles = await prisma.perfilTrabajador.findMany({
    where: { id: { in: [...new Set(lista.map((r) => r.trabajadorId))] } },
    include: { usuario: { select: { nombre: true } } },
  });
  const porId = Object.fromEntries(perfiles.map((p) => [p.id, p]));
  res.json(lista.map((r) => ({ ...r, trabajador: { nombre: porId[r.trabajadorId]?.usuario.nombre, suspendido: porId[r.trabajadorId]?.suspendido } })));
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
    ...(a === 'suspender' ? [prisma.perfilTrabajador.update({ where: { id: r.trabajadorId }, data: { suspendido: true } })] : []),
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

module.exports = router;
