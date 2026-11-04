// Registro, inicio de sesión y sesiones con refresh token deslizante de 24 h (ADR-04, RNF-02).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../shared/prisma');
const config = require('../../config');
const { errores } = require('../../shared/errors');
const { hashToken } = require('../../shared/crypto');

const COSTO_BCRYPT = 10;

function usuarioPublico(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
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

async function registrar({ nombre, email, password, rol }) {
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw errores.conflict('Este correo ya está registrado', 'CORREO_REGISTRADO');

  const passwordHash = await bcrypt.hash(password, COSTO_BCRYPT);
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      email,
      passwordHash,
      rol,
      // Un trabajador nace con perfil vacío y verificación "sin_enviar" (no aparece en búsquedas).
      ...(rol === 'trabajador' ? { perfilTrabajador: { create: {} } } : {}),
    },
  });
  return sesionPara(usuario);
}

async function iniciarSesion({ email, password }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // Mismo mensaje si falla el correo o la contraseña (CA-01.3).
  const ok = usuario && (await bcrypt.compare(password, usuario.passwordHash));
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

module.exports = { registrar, iniciarSesion, renovar, cerrarSesion, perfilActual, COSTO_BCRYPT };
