// M1 — Verificación de identidad por el administrador (RF-03).
const prisma = require('../../shared/prisma');
const storage = require('../../shared/storage');
const { errores } = require('../../shared/errors');

async function listar({ estado }) {
  const perfiles = await prisma.perfilTrabajador.findMany({
    where: { estadoVerificacion: estado, identificacion: { isNot: null } },
    include: {
      usuario: { select: { nombre: true, email: true } },
      identificacion: { select: { enviadaEn: true } },
      oficios: { include: { oficio: true } },
    },
    orderBy: { identificacion: { enviadaEn: 'asc' } },
  });
  return perfiles.map((p) => ({
    trabajadorId: p.id,
    nombre: p.usuario.nombre,
    email: p.usuario.email,
    oficios: p.oficios.map((o) => o.oficio.nombre),
    fotoUrl: p.fotoUrl,
    estadoVerificacion: p.estadoVerificacion,
    motivoRechazo: p.motivoRechazo,
    enviadaEn: p.identificacion.enviadaEn,
  }));
}

// Solo el rol admin llega aquí (la ruta lo exige). Devuelve la imagen descifrada (RNF-03).
async function archivo({ trabajadorId, tipo }) {
  const ident = await prisma.identificacion.findUnique({ where: { trabajadorId } });
  if (!ident) throw errores.notFound('Este trabajador no ha enviado su identificación');
  const clave = tipo === 'ine' ? ident.rutaIneCifrada : ident.rutaSelfieCifrada;
  return storage.leerPrivadoDescifrado(clave);
}

async function decidir(adminId, trabajadorId, { decision, motivo }) {
  const perfil = await prisma.perfilTrabajador.findUnique({ where: { id: trabajadorId } });
  if (!perfil) throw errores.notFound('Trabajador no encontrado');

  const ahora = new Date();
  const nuevoEstado = decision === 'aprobar' ? 'aprobado' : 'rechazado';

  // Actualización condicional: solo si sigue "pendiente" (evita dobles revisiones).
  const resultado = await prisma.$transaction(async (tx) => {
    const { count } = await tx.perfilTrabajador.updateMany({
      where: { id: trabajadorId, estadoVerificacion: 'pendiente' },
      data: {
        estadoVerificacion: nuevoEstado,
        motivoRechazo: decision === 'rechazar' ? motivo : null,
        ...(decision === 'aprobar' ? { verificadoEn: ahora } : {}),
      },
    });
    if (count === 0) throw errores.conflict('Esta verificación no está pendiente');
    await tx.identificacion.update({
      where: { trabajadorId },
      data: { revisadaPor: adminId, revisadaEn: ahora },
    });
    return { estadoVerificacion: nuevoEstado };
  });
  return resultado;
}

module.exports = { listar, archivo, decidir };
