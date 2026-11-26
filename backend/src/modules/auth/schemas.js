const { z } = require('../../shared/validacion');

// v1.2: celular de México, 10 dígitos (las claves de área empiezan de 2 a 9).
const telefono = z
  .string({ message: 'Escribe tu número de celular' })
  .transform((t) => t.replace(/[\s()-]/g, '').replace(/^\+?52/, ''))
  .refine((t) => /^[2-9][0-9]{9}$/.test(t), { message: 'Escribe un celular de 10 dígitos' });

const registro = z.object({
  nombre: z.string({ message: 'El nombre es obligatorio' }).trim().min(2, { message: 'El nombre es obligatorio' }).max(100),
  email: z.string({ message: 'El correo es obligatorio' }).trim().toLowerCase().email({ message: 'Escribe un correo válido' }).max(150),
  password: z
    .string({ message: 'La contraseña es obligatoria' })
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .max(72, { message: 'La contraseña puede tener máximo 72 caracteres' }),
  // Los administradores no se registran por la app (CA-01.5).
  rol: z.enum(['cliente', 'trabajador'], { message: 'El rol debe ser cliente o trabajador' }),
  telefono: telefono,
  aceptaPrivacidad: z.literal(true, { message: 'Debes aceptar el aviso de privacidad y los términos para crear tu cuenta' }),
});

const login = z.object({
  email: z.string({ message: 'El correo es obligatorio' }).trim().toLowerCase().min(1, { message: 'El correo es obligatorio' }),
  password: z.string({ message: 'La contraseña es obligatoria' }).min(1, { message: 'La contraseña es obligatoria' }),
});

const refresh = z.object({
  refreshToken: z.string({ message: 'Falta el refresh token' }).min(20, { message: 'Falta el refresh token' }),
});

const cambiarTelefono = z.object({ telefono });
const cambiarPassword = z.object({
  actual: z.string({ message: 'Escribe tu contraseña actual' }).min(1, { message: 'Escribe tu contraseña actual' }),
  nueva: z.string({ message: 'Escribe la contraseña nueva' }).min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }).max(72),
});
const confirmarPassword = z.object({
  password: z.string({ message: 'Escribe tu contraseña para confirmar' }).min(1, { message: 'Escribe tu contraseña para confirmar' }),
});

module.exports = { registro, login, refresh, telefono, cambiarTelefono, cambiarPassword, confirmarPassword };
