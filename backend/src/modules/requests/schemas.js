const { z, uuid } = require('../../shared/validacion');
const { hoyEnPuebla } = require('../../shared/fechas');

const MOTIVOS_CANCELACION = ['Ya no lo necesito', 'Encontré otra opción', 'No puedo asistir', 'Cambió el precio', 'No puedo continuar con el precio original', 'Otro'];

const crear = z.object({
  oficioId: z.coerce.number({ message: 'Selecciona un oficio' }).int().positive({ message: 'Selecciona un oficio' }),
  zonaId: z.coerce.number({ message: 'Selecciona una zona' }).int().positive({ message: 'Selecciona una zona' }),
  colonia: z.string({ message: 'La colonia es obligatoria' }).trim().min(1, { message: 'La colonia es obligatoria' }).max(120),
  direccionExacta: z
    .string({ message: 'La dirección es obligatoria' })
    .trim()
    .min(5, { message: 'Escribe la dirección completa' })
    .max(250),
  descripcion: z
    .string({ message: 'Describe el trabajo que necesitas' })
    .trim()
    .min(20, { message: 'Describe el trabajo con al menos 20 caracteres' })
    .max(1000, { message: 'La descripción puede tener máximo 1000 caracteres' }),
  fechaDeseada: z
    .string({ message: 'Elige la fecha deseada' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato AAAA-MM-DD' })
    .refine((f) => f >= hoyEnPuebla(), { message: 'La fecha no puede ser anterior a hoy' }),
});

const cancelar = z
  .object({
    motivo: z.enum(MOTIVOS_CANCELACION, { message: 'Elige un motivo de cancelación' }),
    detalle: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.motivo !== 'Otro' || (d.detalle && d.detalle.length >= 10), {
    message: 'Describe el motivo (mínimo 10 caracteres)',
  });

const aceptar = z.object({ cotizacionId: uuid });

module.exports = { crear, cancelar, aceptar, uuid, MOTIVOS_CANCELACION };
