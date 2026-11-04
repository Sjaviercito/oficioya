const { z } = require('../../shared/validacion');

const registro = z.object({
  nombre: z.string({ message: 'El nombre es obligatorio' }).trim().min(2, { message: 'El nombre es obligatorio' }).max(100),
  email: z.string({ message: 'El correo es obligatorio' }).trim().toLowerCase().email({ message: 'Escribe un correo válido' }).max(150),
  password: z
    .string({ message: 'La contraseña es obligatoria' })
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .max(72, { message: 'La contraseña puede tener máximo 72 caracteres' }),
  // Los administradores no se registran por la app (CA-01.5).
  rol: z.enum(['cliente', 'trabajador'], { message: 'El rol debe ser cliente o trabajador' }),
});

const login = z.object({
  email: z.string({ message: 'El correo es obligatorio' }).trim().toLowerCase().min(1, { message: 'El correo es obligatorio' }),
  password: z.string({ message: 'La contraseña es obligatoria' }).min(1, { message: 'La contraseña es obligatoria' }),
});

const refresh = z.object({
  refreshToken: z.string({ message: 'Falta el refresh token' }).min(20, { message: 'Falta el refresh token' }),
});

module.exports = { registro, login, refresh };
