const { z } = require('../../shared/validacion');

const crear = z.object({
  monto: z.coerce
    .number({ message: 'Escribe el monto de la cotización' })
    .positive({ message: 'El monto debe ser mayor a 0' })
    .max(999999.99, { message: 'El monto es demasiado alto' })
    .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, { message: 'Usa máximo 2 decimales en el monto' }),
  tiempoEstimadoHoras: z.coerce
    .number({ message: 'Escribe el tiempo estimado en horas' })
    .int({ message: 'El tiempo estimado debe ser un número entero de horas' })
    .positive({ message: 'El tiempo estimado debe ser mayor a 0' })
    .max(720, { message: 'El tiempo estimado es demasiado alto' }),
});

module.exports = { crear };
