// Registro, inicio de sesión y sesiones con refresh token deslizante de 24 h (ADR-04, RNF-02).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../shared/prisma');
const config = require('../../config');
const { errores } = require('../../shared/errors');
const { hashToken } = require('../../shared/crypto');

const COSTO_BCRYPT = 10;
// Versión vigente del aviso de privacidad (debe coincidir con la página /privacidad del frontend).
const VERSION_PRIVACIDAD = '2026-11';

function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    telefono: u.telefono,
    suspendido: u.suspendido,
    privacidadAceptada: u.privacidadVersion === VERSION_PRIVACIDAD,
  };
}

function firmarAcceso(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, { expiresIn: config.accessTokenTtl });
}

async function emitirRefresh(usuarioId, db = prisma) {
  const token = crypto.randomBytes(48).toString('base64url');
  await db.refreshToken.create({
    data: {
      usuarioId,
      tokenHash: hashToken(token), // en la BD solo se guarda el hash
      expiraEn: new Date(Date.now() + config.refreshTokenHoras * 60 * 60 * 1000),
    },
  });
  return token;
}

async function sesionPara(usuario) {
  return { usuario: usuarioPublico(usuario), accessToken: firmarAcceso(usuario), refreshToken: await emitirRefresh(usuario.id) };
}

async function registrar({ nombre, email, password, rol, telefono }) {
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw errores.conflict('Este correo ya está registrado', 'CORREO_REGISTRADO');

  const passwordHash = await bcrypt.hash(password, COSTO_BCRYPT);
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      email,
      passwordHash,
      rol,
      telefono,
      privacidadAceptadaEn: new Date(),
      privacidadVersion: VERSION_PRIVACIDAD,
      // Un trabajador nace con perfil vacío y verificación "sin_enviar" (no aparece en búsquedas).
      ...(rol === 'trabajador' ? { perfilTrabajador: { create: {} } } : {}),
    },
  });
  return sesionPara(usuario);
}

async function iniciarSesion({ email, password }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // Mismo mensaje si falla el correo o la contraseña (CA-01.3).
  const ok = usuario && !usuario.eliminadoEn && (await bcrypt.compare(password, usuario.passwordHash));
  if (!ok) throw errores.unauthorized('Correo o contraseña incorrectos');
  return sesionPara(usuario);
}

// Rota el refresh token: el usado se elimina y se emite uno nuevo con 24 h más.
async function renovar({ refreshToken }) {
  const tokenHash = hashToken(refreshToken);
  return prisma.$transaction(async (tx) => {
    const guardado = await tx.refreshToken.findUnique({ where: { tokenHash }, include: { usuario: true } });
    if (!guardado) throw errores.unauthorized('Tu sesión expiró, vuelve a iniciar sesión');
    await tx.refreshToken.delete({ where: { id: guardado.id } });
    if (guardado.expiraEn.getTime() <= Date.now()) {
      throw errores.unauthorized('Tu sesión expiró, vuelve a iniciar sesión');
    }
    return {
      accessToken: firmarAcceso(guardado.usuario),
      refreshToken: await emitirRefresh(guardado.usuarioId, tx),
    };
  });
}

async function cerrarSesion({ refreshToken }) {
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
}

async function perfilActual(usuarioId) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw errores.unauthorized();
  return usuarioPublico(usuario);
}

async function aceptarPrivacidad(usuarioId) {
  const u = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { privacidadAceptadaEn: new Date(), privacidadVersion: VERSION_PRIVACIDAD },
  });
  return usuarioPublico(u);
}

async function cambiarTelefono(usuarioId, { telefono }) {
  return usuarioPublico(await prisma.usuario.update({ where: { id: usuarioId }, data: { telefono } }));
}

async function cambiarPassword(usuarioId, { actual, nueva }) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!u || !(await bcrypt.compare(actual, u.passwordHash))) throw errores.unauthorized('La contraseña actual no es correcta');
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: await bcrypt.hash(nueva, COSTO_BCRYPT) } }),
    // Cierra las demás sesiones abiertas.
    prisma.refreshToken.deleteMany({ where: { usuarioId } }),
  ]);
  return sesionPara(u);
}

// v1.2 (derechos ARCO, cancelación): elimina la cuenta y sus datos personales.
// Las reseñas y cotizaciones se conservan sin datos que identifiquen a la persona, para no
// alterar la reputación ya calculada de terceros.
async function eliminarCuenta(usuarioId, { password }) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, include: { perfilTrabajador: true } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) throw errores.unauthorized('La contraseña no es correcta');

  const activos = await prisma.solicitud.count({
    where: {
      estado: { in: ['aceptada', 'en_curso'] },
      OR: [{ clienteId: usuarioId }, { cotizacionAceptada: { trabajador: { usuarioId } } }],
    },
  });
  if (activos > 0) throw errores.conflict('Termina o cancela tus trabajos activos antes de eliminar tu cuenta', 'TRABAJOS_ACTIVOS');

  await prisma.$transaction(async (tx) => {
    const p = u.perfilTrabajador;
    if (p) {
      const ident = await tx.identificacion.findUnique({ where: { trabajadorId: p.id } });
      const claves = [ident && ident.rutaIneCifrada, ident && ident.rutaSelfieCifrada, p.fotoUrl && p.fotoUrl.replace(/^\/uploads\//, '')].filter(Boolean);
      if (claves.length) await tx.archivo.deleteMany({ where: { clave: { in: claves } } });
      if (ident) await tx.identificacion.delete({ where: { id: ident.id } });
      await tx.perfilTrabajador.update({ where: { id: p.id }, data: { fotoUrl: null, suspendido: true } });
    }
    // Solicitudes del cliente: se borran dirección y fotos; las abiertas se cancelan.
    const sols = await tx.solicitud.findMany({ where: { clienteId: usuarioId }, include: { fotos: true } });
    const fotos = sols.flatMap((s) => s.fotos.map((f) => f.url.replace(/^\/uploads\//, '')));
    if (fotos.length) await tx.archivo.deleteMany({ where: { clave: { in: fotos } } });
    await tx.fotoSolicitud.deleteMany({ where: { solicitudId: { in: sols.map((s) => s.id) } } });
    await tx.solicitud.updateMany({ where: { clienteId: usuarioId }, data: { direccionExacta: 'Dirección eliminada' } });
    await tx.solicitud.updateMany({ where: { clienteId: usuarioId, estado: { in: ['abierta', 'cotizada'] } }, data: { estado: 'cancelada' } });
    await tx.resena.updateMany({ where: { clienteId: usuarioId }, data: { comentario: null } });
    await tx.notificacion.deleteMany({ where: { usuarioId } });
    await tx.refreshToken.deleteMany({ where: { usuarioId } });
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: 'Usuario eliminado',
        email: `eliminado-${usuarioId}@oficioya.invalid`,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), COSTO_BCRYPT),
        telefono: null,
        eliminadoEn: new Date(),
      },
    });
  });
}

module.exports = { VERSION_PRIVACIDAD, aceptarPrivacidad, cambiarTelefono, cambiarPassword, eliminarCuenta, registrar, iniciarSesion, renovar, cerrarSesion, perfilActual, COSTO_BCRYPT };
