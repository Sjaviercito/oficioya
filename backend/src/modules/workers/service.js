// M1 — Perfiles y verificación (lado del trabajador) y búsqueda de trabajadores (RF-02, RF-03, RF-04).
const prisma = require('../../shared/prisma');
const storage = require('../../shared/storage');
const { errores } = require('../../shared/errors');
const { validarImagen } = require('../../shared/middleware/upload');
const { compararParaBusqueda, redondear2 } = require('../ranking/calculo');
const { reputacionDe } = require('./reputacion');

const num = (d) => (d === null || d === undefined ? null : Number(d));
// RF-17: porcentaje de trabajos completados que terminaron con ajuste aceptado (solo transparencia).
const pctAjuste = (p) => (p.trabajosCompletados > 0 ? Math.round((p.trabajosConAjuste / p.trabajosCompletados) * 100) : null);

async function perfilDeUsuario(usuarioId) {
  const perfil = await prisma.perfilTrabajador.findUnique({
    where: { usuarioId },
    include: { oficios: { include: { oficio: true } }, zonas: { include: { zona: true } } },
  });
  if (!perfil) throw errores.forbidden('Solo los trabajadores tienen perfil de servicio');
  return perfil;
}

function serializarPerfil(p) {
  return {
    id: p.id,
    experienciaAnios: p.experienciaAnios,
    fotoUrl: p.fotoUrl,
    estadoVerificacion: p.estadoVerificacion,
    motivoRechazo: p.motivoRechazo,
    suspendido: p.suspendido,
    oficios: p.oficios.map((o) => o.oficio),
    zonas: p.zonas.map((z) => z.zona),
    trabajosCompletados: p.trabajosCompletados,
    porcentajeConAjuste: pctAjuste(p),
    puntuacionRanking: redondear2(num(p.puntuacionRanking)),
    calificacionPonderada: redondear2(num(p.calificacionPonderada)),
    tasaCancelacion: redondear2(num(p.tasaCancelacion)),
    esNuevo: p.puntuacionRanking === null,
  };
}

async function obtenerMiPerfil(usuarioId) {
  const p = await perfilDeUsuario(usuarioId);
  const rep = (await reputacionDe([p.id]))[p.id] || {};
  return { ...serializarPerfil(p), ...rep };
}

async function guardarPerfil(usuarioId, datos, foto) {
  const perfil = await perfilDeUsuario(usuarioId);

  const [oficios, zonas] = await Promise.all([
    prisma.oficio.count({ where: { id: { in: datos.oficioIds } } }),
    prisma.zona.count({ where: { id: { in: datos.zonaIds } } }),
  ]);
  if (oficios !== new Set(datos.oficioIds).size) throw errores.badRequest('Algún oficio no existe');
  if (zonas !== new Set(datos.zonaIds).size) throw errores.badRequest('Alguna zona no existe');

  let fotoUrl;
  if (foto) fotoUrl = await storage.guardarPublico('perfiles', validarImagen(foto));

  await prisma.$transaction([
    prisma.trabajadorOficio.deleteMany({ where: { trabajadorId: perfil.id } }),
    prisma.trabajadorZona.deleteMany({ where: { trabajadorId: perfil.id } }),
    prisma.perfilTrabajador.update({
      where: { id: perfil.id },
      data: {
        experienciaAnios: datos.experienciaAnios,
        ...(fotoUrl ? { fotoUrl } : {}),
        oficios: { create: [...new Set(datos.oficioIds)].map((oficioId) => ({ oficioId })) },
        zonas: { create: [...new Set(datos.zonaIds)].map((zonaId) => ({ zonaId })) },
      },
    }),
  ]);
  return obtenerMiPerfil(usuarioId);
}

// RF-03: el trabajador envía INE y selfie; quedan cifradas y su estado pasa a "pendiente".
async function enviarIdentificacion(usuarioId, ine, selfie) {
  const perfil = await perfilDeUsuario(usuarioId);
  if (perfil.estadoVerificacion === 'aprobado') throw errores.conflict('Tu identidad ya fue verificada');
  if (!ine || !selfie) throw errores.badRequest('Sube la foto de tu INE y la selfie con tu INE');

  validarImagen(ine);
  validarImagen(selfie);
  const [rutaIne, rutaSelfie] = await Promise.all([
    storage.guardarPrivadoCifrado('identidades', ine),
    storage.guardarPrivadoCifrado('identidades', selfie),
  ]);

  await prisma.$transaction([
    prisma.identificacion.upsert({
      where: { trabajadorId: perfil.id },
      create: { trabajadorId: perfil.id, rutaIneCifrada: rutaIne, rutaSelfieCifrada: rutaSelfie },
      update: { rutaIneCifrada: rutaIne, rutaSelfieCifrada: rutaSelfie, enviadaEn: new Date(), revisadaPor: null, revisadaEn: null },
    }),
    prisma.perfilTrabajador.update({
      where: { id: perfil.id },
      data: { estadoVerificacion: 'pendiente', motivoRechazo: null },
    }),
  ]);
  return { estadoVerificacion: 'pendiente' };
}

// RF-04: solo trabajadores aprobados, ordenados según la sección 3.4.
async function buscar({ oficioId, zonaId }) {
  const perfiles = await prisma.perfilTrabajador.findMany({
    where: {
      estadoVerificacion: 'aprobado',
      suspendido: false, // RF-13
      oficios: { some: { oficioId } },
      zonas: { some: { zonaId } },
    },
    include: { usuario: { select: { nombre: true } }, oficios: { include: { oficio: true } } },
  });

  const rep = await reputacionDe(perfiles.map((p) => p.id));
  return perfiles
    .map((p) => ({
      id: p.id,
      nombre: p.usuario.nombre,
      fotoUrl: p.fotoUrl,
      experienciaAnios: p.experienciaAnios,
      oficios: p.oficios.map((o) => o.oficio.nombre),
      puntuacionRanking: num(p.puntuacionRanking),
      trabajosCompletados: p.trabajosCompletados,
      porcentajeConAjuste: pctAjuste(p),
      verificadoEn: p.verificadoEn,
    }))
    .sort(compararParaBusqueda)
    .map(({ verificadoEn, puntuacionRanking, ...resto }) => ({
      ...resto,
      puntuacionRanking: redondear2(puntuacionRanking),
      esNuevo: puntuacionRanking === null,
      sobreCotizadoPromedio: rep[resto.id]?.sobreCotizadoPromedio ?? null,
      insignias: rep[resto.id]?.insignias ?? [],
      cancelacionesPorDesacuerdo: rep[resto.id]?.cancelacionesPorDesacuerdo ?? 0,
    }));
}

module.exports = { pctAjuste, obtenerMiPerfil, guardarPerfil, enviarIdentificacion, buscar, serializarPerfil };
