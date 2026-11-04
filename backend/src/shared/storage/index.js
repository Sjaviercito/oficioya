// Interfaz de almacenamiento de archivos (ADR-05). Implementación local en disco;
// se puede cambiar por un bucket privado (Azure Blob, S3) sin tocar los módulos.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');
const { cifrar, descifrar } = require('../crypto');

const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const MIME_POR_EXT = { jpg: 'image/jpeg', png: 'image/png' };

// Archivos públicos (fotos de perfil y de solicitudes): se sirven en /uploads.
async function guardarPublico(carpeta, archivo) {
  const ext = EXTENSIONES[archivo.tipoReal];
  const nombre = `${crypto.randomUUID()}.${ext}`;
  const dir = path.resolve(config.publicUploadsDir, carpeta);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, nombre), archivo.buffer);
  return `/uploads/${carpeta}/${nombre}`;
}

// Archivos privados (INE y selfie): se guardan cifrados FUERA de la carpeta pública.
async function guardarPrivadoCifrado(carpeta, archivo) {
  const ext = EXTENSIONES[archivo.tipoReal];
  const clave = `${carpeta}/${crypto.randomUUID()}.${ext}.enc`;
  const ruta = path.resolve(config.privateStorageDir, clave);
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  await fs.writeFile(ruta, cifrar(archivo.buffer));
  return clave;
}

async function leerPrivadoDescifrado(clave) {
  // Evita rutas tipo ../../ (path traversal): la clave debe quedar dentro del directorio privado.
  const base = path.resolve(config.privateStorageDir);
  const ruta = path.resolve(base, clave);
  if (!ruta.startsWith(base + path.sep)) throw new Error('Ruta de almacenamiento inválida');
  const contenido = await fs.readFile(ruta);
  const ext = clave.replace(/\.enc$/, '').split('.').pop();
  return { buffer: descifrar(contenido), mime: MIME_POR_EXT[ext] || 'application/octet-stream' };
}

module.exports = { guardarPublico, guardarPrivadoCifrado, leerPrivadoDescifrado };
