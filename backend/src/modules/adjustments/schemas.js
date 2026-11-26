const { z } = require('../../shared/validacion');

const dinero = (mensaje) => z.coerce
  .number({ message: mensaje })
  .min(-999999.99).max(999999.99)
  .refine((x) => Math.abs(Math.round(x * 100) - x * 100) < 1e-6, { message: 'Usa máximo 2 decimales' });

// v1.3: { tipo, deltaManoObra, deltaMaterial, detalle } (multipart, con foto opcional).
// Compatibilidad v1.0: { montoPropuesto, motivo } se trata como "más trabajo".
const proponer = z.union([
  z.object({
    tipo: z.enum(['pieza_extra', 'mas_trabajo', 'dano_oculto', 'cliente_pidio_mas', 'mas_facil', 'presupuesto'], { message: 'Elige qué cambió' }),
    deltaManoObra: dinero('Escribe el cambio en mano de obra').default(0),
    deltaMaterial: dinero('Escribe el cambio en material').default(0),
    detalle: z.string().trim().max(300, { message: 'El detalle puede tener máximo 300 caracteres' }).optional(),
  }),
  z.object({
    montoPropuesto: dinero('Escribe el nuevo monto').refine((x) => x > 0, { message: 'El monto debe ser mayor a 0' }),
    motivo: z.string({ message: 'Explica el motivo del ajuste' }).trim()
      .min(10, { message: 'Explica el motivo del ajuste (mínimo 10 caracteres)' }).max(300),
  }),
], { message: 'Datos del cambio de precio no válidos' });

const decidir = z.object({
  decision: z.enum(['aceptar', 'rechazar'], { message: 'La decisión debe ser aceptar o rechazar' }),
});

const ticket = z.object({
  ticketMonto: dinero('Escribe el total del ticket').refine((x) => x > 0, { message: 'El total del ticket debe ser mayor a 0' }),
});

module.exports = { proponer, decidir, ticket };
