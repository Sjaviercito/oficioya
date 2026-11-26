const { z } = require('../../shared/validacion');

const proponer = z.object({
  montoPropuesto: z.coerce
    .number({ message: 'Escribe el nuevo monto' })
    .positive({ message: 'El monto debe ser mayor a 0' })
    .max(999999.99, { message: 'El monto es demasiado alto' })
    .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, { message: 'Usa máximo 2 decimales en el monto' }),
  motivo: z
    .string({ message: 'Explica el motivo del ajuste' })
    .trim()
    .min(10, { message: 'Explica el motivo del ajuste (mínimo 10 caracteres)' })
    .max(300, { message: 'El motivo puede tener máximo 300 caracteres' }),
});

const decidir = z.object({
  decision: z.enum(['aceptar', 'rechazar'], { message: 'La decisión debe ser aceptar o rechazar' }),
});

module.exports = { proponer, decidir };
