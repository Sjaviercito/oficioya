// v1.4: las fotos se reducen en el navegador antes de subirlas (máximo 1600 px, JPG al 82 %).
// Una foto de celular de 4 MB queda en unos 200 a 400 KB: carga más rápido con datos móviles y no
// llena la base de datos (las imágenes se guardan en PostgreSQL, ADR-05).
const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

function cargarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolver(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export async function comprimir(archivo) {
  if (!(archivo instanceof File) || !archivo.size || !/^image\/(jpeg|png)$/.test(archivo.type)) return archivo;
  try {
    const img = await cargarImagen(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    if (escala === 1 && archivo.size < 400 * 1024) return archivo;
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#fff'; // los PNG transparentes quedan con fondo blanco
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', CALIDAD));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return archivo; // si el navegador no puede, se sube la original (el servidor valida el tamaño)
  }
}

// Copia un FormData reduciendo cada imagen y quitando archivos vacíos.
export async function prepararFormulario(origen) {
  const destino = new FormData();
  for (const [clave, valor] of origen.entries()) {
    if (valor instanceof File) {
      if (valor.size) destino.append(clave, await comprimir(valor));
    } else {
      destino.append(clave, valor);
    }
  }
  return destino;
}
