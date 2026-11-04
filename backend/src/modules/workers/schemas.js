const { z, listaDeEnteros } = require('../../shared/validacion');

const perfil = z.object({
  oficioIds: listaDeEnteros('Selecciona al menos un oficio'),
  zonaIds: listaDeEnteros('Selecciona al menos una zona de servicio'),
  experienciaAnios: z.coerce
    .number({ message: 'Escribe tus años de experiencia' })
    .int({ message: 'Los años de experiencia deben ser un número entero' })
    .min(0, { message: 'Los años de experiencia no pueden ser negativos' })
    .max(70, { message: 'Revisa los años de experiencia' }),
});

const busqueda = z.object({
  oficioId: z.coerce.number({ message: 'Selecciona un oficio' }).int().positive({ message: 'Selecciona un oficio' }),
  zonaId: z.coerce.number({ message: 'Selecciona una zona' }).int().positive({ message: 'Selecciona una zona' }),
});

module.exports = { perfil, busqueda };
