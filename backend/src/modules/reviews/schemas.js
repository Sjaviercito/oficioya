const { z } = require('../../shared/validacion');

const crear = z.object({
  estrellas: z.coerce
    .number({ message: 'Elige de 1 a 5 estrellas' })
    .int({ message: 'Elige de 1 a 5 estrellas' })
    .min(1, { message: 'Elige de 1 a 5 estrellas' })
    .max(5, { message: 'Elige de 1 a 5 estrellas' }),
  comentario: z.string().trim().max(500, { message: 'El comentario puede tener máximo 500 caracteres' }).optional(),
});

module.exports = { crear };
