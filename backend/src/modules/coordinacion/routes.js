// v1.2 — Coordinación del trabajo sin chat (el chat en tiempo real sigue fuera de alcance):
// "terminado" marcado por el trabajador con 72 h para disputar, y horario de visita.
const { Router } = require('express');
const prisma = require('../../shared/prisma');
const { z, uuid } = require('../../shared/validacion');
const { errores } = require('../../shared/errors');
const { avisar } = require('../../shared/avisos');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');
const solicitudes = require('../requests/service');

const router = Router({ mergeParams: true });
router.use(requiereSesion);

async function comoTrabajadorAceptado(usuarioId, id) {
  const s = await solicitudes.cargar(id);
  const perfil = await solicitudes.perfilTrabajadorDe(usuarioId);
  if (!perfil || !s.cotizacionAceptada || s.cotizacionAceptada.trabajadorId !== perfil.id) {
    throw errores.forbidden('Solo el trabajador aceptado puede hacer esto');
  }
  return s;
}

async function comoClienteDueno(usuarioId, id) {
  const s = await solicitudes.cargar(id);
  if (s.clienteId !== usuarioId) throw errores.forbidden('Solo quien publicó la solicitud puede hacer esto');
  return s;
}

// RF-26: el trabajador marca el trabajo como terminado.
router.post('/finish', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const s = await comoTrabajadorAceptado(req.usuario.id, id);
  if (s.estado !== 'en_curso') throw errores.conflict('Solo se marca como terminado un trabajo en curso', 'TRANSICION_INVALIDA');
  if (s.ajustes.some((a) => a.estado === 'pendiente')) {
    throw errores.conflict('Espera a que el cliente responda el ajuste de precio', 'AJUSTE_PENDIENTE');
  }
  const { count } = await prisma.solicitud.updateMany({
    where: { id, estado: 'en_curso', terminadaPorTrabajadorEn: null },
    data: { terminadaPorTrabajadorEn: new Date(), disputaMotivo: null },
  });
  if (count === 0) throw errores.conflict('Ya marcaste este trabajo como terminado');
  await avisar(null, s.clienteId, `El trabajador marcó el trabajo como terminado. Confírmalo o disputa en ${solicitudes.HORAS_PARA_DISPUTAR} horas; si no respondes, se dará por terminado.`, id);
  res.json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

// RF-26: el cliente disputa el "terminado" con un motivo.
const disputa = z.object({
  motivo: z.string({ message: 'Explica qué falta' }).trim().min(10, { message: 'Explica qué falta (mínimo 10 caracteres)' }).max(300),
});
router.post('/dispute', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { motivo } = disputa.parse(req.body);
  const s = await comoClienteDueno(req.usuario.id, id);
  if (s.estado !== 'en_curso' || !s.terminadaPorTrabajadorEn) {
    throw errores.conflict('El trabajador no ha marcado este trabajo como terminado');
  }
  await prisma.solicitud.update({ where: { id }, data: { terminadaPorTrabajadorEn: null, disputaMotivo: motivo } });
  await avisar(null, s.cotizacionAceptada.trabajador.usuarioId, `El cliente indicó que el trabajo no está terminado: "${motivo}"`, id);
  res.json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

// RF-22: el trabajador propone fecha y hora de la visita.
const propuesta = z.object({
  fechaHora: z.coerce.date({ message: 'Elige fecha y hora' }).refine((d) => d.getTime() > Date.now(), { message: 'La visita debe ser en el futuro' }),
});
router.post('/visit', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { fechaHora } = propuesta.parse(req.body);
  const s = await comoTrabajadorAceptado(req.usuario.id, id);
  if (!['aceptada', 'en_curso'].includes(s.estado)) throw errores.conflict('Solo se agenda una visita en un trabajo activo', 'TRANSICION_INVALIDA');
  await prisma.solicitud.update({ where: { id }, data: { visitaPropuesta: fechaHora, visitaConfirmada: false } });
  const cuando = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(fechaHora);
  await avisar(null, s.clienteId, `El trabajador propone visitarte el ${cuando}.`, id);
  res.status(201).json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

// RF-22: el cliente acepta o rechaza el horario propuesto.
const respuestaVisita = z.object({ decision: z.enum(['aceptar', 'rechazar'], { message: 'La decisión debe ser aceptar o rechazar' }) });
router.patch('/visit', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { decision } = respuestaVisita.parse(req.body);
  const s = await comoClienteDueno(req.usuario.id, id);
  if (!s.visitaPropuesta || s.visitaConfirmada) throw errores.conflict('No hay un horario pendiente de respuesta');
  await prisma.solicitud.update({
    where: { id },
    data: decision === 'aceptar' ? { visitaConfirmada: true } : { visitaPropuesta: null, visitaConfirmada: false },
  });
  await avisar(null, s.cotizacionAceptada.trabajador.usuarioId,
    decision === 'aceptar' ? 'El cliente confirmó el horario de la visita.' : 'El cliente rechazó el horario; propón otro.', id);
  res.json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

module.exports = router;
