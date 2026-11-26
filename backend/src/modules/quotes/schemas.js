const { z } = require('../../shared/validacion');

const dinero = (mensaje, minimo = 0) => z.coerce
  .number({ message: mensaje })
  .min(minimo, { message: mensaje })
  .max(999999.99, { message: 'El monto es demasiado alto' })
  .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, { message: 'Usa máximo 2 decimales' });

const horas = z.coerce
  .number({ message: 'Escribe el tiempo estimado en horas' })
  .int({ message: 'El tiempo estimado debe ser un número entero de horas' })
  .positive({ message: 'El tiempo estimado debe ser mayor a 0' })
  .max(720, { message: 'El tiempo estimado es demasiado alto' });

const vigencia = z.coerce.number().int().min(1, { message: 'La vigencia debe ser de 1 a 60 días' }).max(60, { message: 'La vigencia debe ser de 1 a 60 días' }).default(7);

// v1.3 (LFPC art. 59): precio cerrado con mano de obra + material y vigencia, o visita de diagnóstico.
const cerrado = z.object({
  tipo: z.literal('cerrado'),
  manoObra: dinero('Escribe el costo de la mano de obra'),
  material: dinero('Escribe el costo estimado del material').default(0),
  tiempoEstimadoHoras: horas,
  vigenciaDias: vigencia,
}).refine((c) => c.manoObra + c.material > 0, { message: 'El total debe ser mayor a 0' });

const diagnostico = z.object({
  tipo: z.literal('diagnostico'),
  costoVisita: dinero('Escribe el costo de la visita', 0.01),
  visitaAbonable: z.preprocess((v) => (v === undefined ? true : v === true || v === 'true' || v === 'on'), z.boolean()),
  tiempoEstimadoHoras: horas.default(1),
  vigenciaDias: vigencia,
});

// Compatibilidad v1.0: { monto, tiempoEstimadoHoras } = precio cerrado de pura mano de obra.
const legado = z.object({
  monto: dinero('El monto debe ser mayor a 0', 0.01),
  tiempoEstimadoHoras: horas,
}).transform((d) => ({ tipo: 'cerrado', manoObra: d.monto, material: 0, tiempoEstimadoHoras: d.tiempoEstimadoHoras, vigenciaDias: 7 }));

module.exports = { crear: z.union([cerrado, diagnostico, legado], { message: 'Datos de la cotización no válidos' }) };
