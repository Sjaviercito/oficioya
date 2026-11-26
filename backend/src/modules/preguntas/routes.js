// v1.3 (RF-21): preguntas de los trabajadores antes de cotizar. Las respuestas las ven todos los que
// pueden cotizar, para que nadie cotice a ciegas. Se monta bajo /api/v1/requests/:id/questions
const { Router } = require('express');
const prisma = require('../../shared/prisma');
const { z, uuid } = require('../../shared/validacion');
const { errores } = require('../../shared/errors');
const { avisar } = require('../../shared/avisos');
const { requiereSesion, requiereRol } = require('../../shared/middleware/auth');
const solicitudes = require('../requests/service');

const MAX_POR_TRABAJADOR = 3;
const router = Router({ mergeParams: true });
router.use(requiereSesion);

const pregunta = z.object({
  texto: z.string({ message: 'Escribe tu pregunta' }).trim().min(5, { message: 'Escribe tu pregunta (mínimo 5 caracteres)' }).max(300),
});
router.post('/', requiereRol('trabajador'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { texto } = pregunta.parse(req.body);
  const s = await solicitudes.cargar(id);
  const perfil = await solicitudes.perfilTrabajadorDe(req.usuario.id);
  if (!perfil || perfil.estadoVerificacion !== 'aprobado' || perfil.suspendido) throw errores.forbidden('Tu cuenta debe estar verificada para preguntar');
  const puede = perfil.oficios.some((o) => o.oficioId === s.oficioId) && perfil.zonas.some((zn) => zn.zonaId === s.zonaId);
  if (!puede) throw errores.forbidden('Esta solicitud no es de tu oficio o zona de servicio');
  if (!['abierta', 'cotizada'].includes(s.estado)) throw errores.conflict('Esta solicitud ya no recibe preguntas', 'TRANSICION_INVALIDA');
  // Sin datos de contacto en la pregunta: el contacto se libera solo al aceptar (RNF-04).
  if (/\b\d[\d\s-]{8,}\d\b|@|wa\.me|whats/i.test(texto)) throw errores.badRequest('No incluyas teléfonos, correos ni enlaces en la pregunta');
  const hechas = await prisma.pregunta.count({ where: { solicitudId: id, trabajadorId: perfil.id } });
  if (hechas >= MAX_POR_TRABAJADOR) throw errores.conflict(`Máximo ${MAX_POR_TRABAJADOR} preguntas por solicitud`, 'LIMITE_PREGUNTAS');
  await prisma.pregunta.create({ data: { solicitudId: id, trabajadorId: perfil.id, texto } });
  await avisar(null, s.clienteId, 'Un trabajador te hizo una pregunta sobre tu solicitud.', id);
  res.status(201).json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

const respuesta = z.object({
  respuesta: z.string({ message: 'Escribe tu respuesta' }).trim().min(2, { message: 'Escribe tu respuesta' }).max(500),
});
router.patch('/:preguntaId', requiereRol('cliente'), async (req, res) => {
  const id = uuid.parse(req.params.id);
  const preguntaId = uuid.parse(req.params.preguntaId);
  const datos = respuesta.parse(req.body);
  const s = await solicitudes.cargar(id);
  if (s.clienteId !== req.usuario.id) throw errores.forbidden('Solo quien publicó la solicitud puede responder');
  const q = s.preguntas.find((x) => x.id === preguntaId);
  if (!q) throw errores.notFound('Pregunta no encontrada');
  const { count } = await prisma.pregunta.updateMany({ where: { id: preguntaId, respuesta: null }, data: { respuesta: datos.respuesta, respondidaEn: new Date() } });
  if (count === 0) throw errores.conflict('Ya respondiste esta pregunta');
  const perfil = await prisma.perfilTrabajador.findUnique({ where: { id: q.trabajadorId } });
  await avisar(null, perfil.usuarioId, 'El cliente respondió tu pregunta. Ya puedes cotizar con más información.', id);
  res.json({ solicitud: await solicitudes.detalle(id, req.usuario) });
});

module.exports = router;
