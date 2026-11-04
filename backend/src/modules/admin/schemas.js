const { z } = require('../../shared/validacion');

const decision = z
  .object({
    decision: z.enum(['aprobar', 'rechazar'], { message: 'La decisión debe ser aprobar o rechazar' }),
    motivo: z.string().trim().max(300, { message: 'El motivo puede tener máximo 300 caracteres' }).optional(),
  })
  .refine((d) => d.decision !== 'rechazar' || (d.motivo && d.motivo.length > 0), {
    message: 'El motivo es obligatorio al rechazar',
  });

const listado = z.object({
  estado: z.enum(['pendiente', 'aprobado', 'rechazado']).default('pendiente'),
});

const archivo = z.object({
  trabajadorId: z.string().uuid({ message: 'Identificador inválido' }),
  tipo: z.enum(['ine', 'selfie'], { message: 'El tipo debe ser ine o selfie' }),
});

module.exports = { decision, listado, archivo };
