// Interfaz de almacenamiento de archivos (ADR-05, revisado en v1.1).
// Los archivos se guardan en la tabla "archivo" de PostgreSQL: el disco de Render se borra en
// cada reinicio y la base de datos no. Las identificaciones se cifran con AES-256-GCM antes de
// guardarse y se marcan como no públicas; solo se leen por el endpoint del administrador.
const crypto = require('crypto');
const prisma = require('../prisma');
const { cifrar, descifrar } = require('../crypto');

const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png' };

// Fotos de perfil y de solicitudes. Devuelve la ruta pública "/uploads/<clave>".
async function guardarPublico(carpeta, archivo) {
  const clave = `${carpeta}/${crypto.randomUUID()}.${EXTENSIONES[archivo.tipoReal]}`;
  await prisma.archivo.create({ data: { clave, mime: archivo.tipoReal, contenido: archivo.buffer, publico: true } });
  return `/uploads/${clave}`;
}

// INE y selfie: cifradas y privadas. Devuelve la clave interna.
async function guardarPrivadoCifrado(carpeta, archivo) {
  const clave = `${carpeta}/${crypto.randomUUID()}.${EXTENSIONES[archivo.tipoReal]}.enc`;
  await prisma.archivo.create({ data: { clave, mime: archivo.tipoReal, contenido: cifrar(archivo.buffer), publico: false } });
  return clave;
}

async function leerPrivadoDescifrado(clave) {
  const a = await prisma.archivo.findUnique({ where: { clave } });
  if (!a || a.publico) throw new Error('Archivo privado no encontrado');
  return { buffer: descifrar(Buffer.from(a.contenido)), mime: a.mime };
}

// Solo archivos marcados como públicos; una identificación nunca sale por aquí.
async function leerPublico(clave) {
  const a = await prisma.archivo.findUnique({ where: { clave } });
  if (!a || !a.publico) return null;
  return { buffer: Buffer.from(a.contenido), mime: a.mime };
}

module.exports = { guardarPublico, guardarPrivadoCifrado, leerPrivadoDescifrado, leerPublico };
