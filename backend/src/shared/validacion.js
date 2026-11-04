// Ayudas de validación con zod. Toda entrada se valida del lado del servidor.
const { z } = require('zod');

// Acepta un arreglo, un JSON '[1,2]' o un valor suelto (útil en multipart/form-data).
const listaDeEnteros = (mensaje) =>
  z.preprocess((valor) => {
    if (Array.isArray(valor)) return valor.map(Number);
    if (typeof valor === 'string' && valor.trim().startsWith('[')) {
      try { return JSON.parse(valor).map(Number); } catch { return valor; }
    }
    if (valor === undefined || valor === null || valor === '') return [];
    return [Number(valor)];
  }, z.array(z.number().int().positive()).min(1, { message: mensaje }));

const uuid = z.string().uuid({ message: 'Identificador inválido' });

module.exports = { z, listaDeEnteros, uuid };
