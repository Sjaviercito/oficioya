const { validarTransicion } = require('../../src/modules/requests/estados');
const { validarElegibilidad } = require('../../src/modules/reviews/reglas');
const auth = require('../../src/modules/auth/schemas');
const requests = require('../../src/modules/requests/schemas');
const reviews = require('../../src/modules/reviews/schemas');
const quotes = require('../../src/modules/quotes/schemas');
const { hoyEnPuebla } = require('../../src/shared/fechas');

const mensaje = (fn) => {
  try { fn(); } catch (e) { return { status: e.status, message: e.message }; }
  return null;
};

describe('RF-07 / RF-08 — Máquina de estados (sección 3.3)', () => {
  test('transiciones válidas del camino feliz', () => {
    expect(validarTransicion('recibirCotizacion', 'abierta')).toBe('cotizada');
    expect(validarTransicion('aceptar', 'cotizada')).toBe('aceptada');
    expect(validarTransicion('iniciar', 'aceptada')).toBe('en_curso');
    expect(validarTransicion('completar', 'en_curso')).toBe('completada');
  });
  test('CA-07.3 completar desde "aceptada" responde 409 con el mensaje del contrato', () => {
    expect(mensaje(() => validarTransicion('completar', 'aceptada'))).toEqual({
      status: 409,
      message: 'Transición no permitida: aceptada → completada',
    });
  });
  test('CA-08.4 cancelar una solicitud completada responde 409', () => {
    expect(mensaje(() => validarTransicion('cancelarCliente', 'completada'))).toEqual({
      status: 409,
      message: 'No se puede cancelar una solicitud completada',
    });
  });
  test('el trabajador no puede cancelar mientras la solicitud está abierta', () => {
    expect(mensaje(() => validarTransicion('cancelarTrabajador', 'abierta')).status).toBe(409);
  });
});

describe('Validaciones de entrada', () => {
  const primerMensaje = (schema, datos) => {
    const r = schema.safeParse(datos);
    return r.success ? null : r.error.issues[0].message;
  };

  test('CA-01.4 contraseña de 7 caracteres se rechaza y de 8 se acepta', () => {
    const base = { nombre: 'Ana', email: 'ana@correo.com', rol: 'cliente', telefono: '2221234567', aceptaPrivacidad: true };
    expect(primerMensaje(auth.registro, { ...base, password: '1234567' })).toBe('La contraseña debe tener al menos 8 caracteres');
    expect(primerMensaje(auth.registro, { ...base, password: '12345678' })).toBeNull();
  });
  test('CA-01.5 no se puede registrar con rol admin', () => {
    expect(auth.registro.safeParse({ nombre: 'X', email: 'x@x.com', password: '12345678', rol: 'admin' }).success).toBe(false);
  });

  const solicitud = {
    oficioId: 1, zonaId: 1, colonia: 'El Carmen', direccionExacta: 'Calle 1 #2, Puebla',
    descripcion: 'Gotea la llave del fregadero de la cocina', fechaDeseada: hoyEnPuebla(),
  };
  test('CA-05.2 sin colonia', () => {
    expect(primerMensaje(requests.crear, { ...solicitud, colonia: '' })).toBe('La colonia es obligatoria');
  });
  test('CA-05.4 fecha de ayer se rechaza y la de hoy se acepta', () => {
    const ayer = hoyEnPuebla(new Date(Date.now() - 86400000));
    expect(primerMensaje(requests.crear, { ...solicitud, fechaDeseada: ayer })).toBe('La fecha no puede ser anterior a hoy');
    expect(primerMensaje(requests.crear, solicitud)).toBeNull();
  });
  test('CA-06.3 monto 0 o tiempo 0 se rechazan', () => {
    expect(quotes.crear.safeParse({ monto: 0, tiempoEstimadoHoras: 3 }).success).toBe(false);
    expect(quotes.crear.safeParse({ monto: 850, tiempoEstimadoHoras: 0 }).success).toBe(false);
    expect(quotes.crear.safeParse({ monto: 850.5, tiempoEstimadoHoras: 3 }).success).toBe(true);
  });
  test('CA-08.5 "Otro" con detalle de menos de 10 caracteres', () => {
    expect(primerMensaje(requests.cancelar, { motivo: 'Otro', detalle: 'corto' })).toBe('Describe el motivo (mínimo 10 caracteres)');
    expect(primerMensaje(requests.cancelar, { motivo: 'Otro', detalle: 'Se mudó de casa el cliente' })).toBeNull();
  });
  test('CA-09.6 0 o 6 estrellas se rechazan', () => {
    expect(reviews.crear.safeParse({ estrellas: 0 }).success).toBe(false);
    expect(reviews.crear.safeParse({ estrellas: 6 }).success).toBe(false);
    expect(reviews.crear.safeParse({ estrellas: 4 }).success).toBe(true);
  });
});

describe('RF-09 — Elegibilidad de la reseña', () => {
  const AHORA = new Date('2026-11-03T12:00:00Z');
  const completadaHace = (dias) => ({
    clienteId: 'ana', estado: 'completada', resena: null, completadaEn: new Date(AHORA.getTime() - dias * 86400000),
  });
  test('CA-09.2 solicitud cancelada → 422', () => {
    expect(mensaje(() => validarElegibilidad({ ...completadaHace(1), estado: 'cancelada' }, 'ana', AHORA))).toEqual({
      status: 422, message: 'Solo se pueden reseñar trabajos completados',
    });
  });
  test('CA-09.3 otro cliente → 403', () => {
    expect(mensaje(() => validarElegibilidad(completadaHace(1), 'otro', AHORA)).status).toBe(403);
  });
  test('CA-09.4 segunda reseña → 409', () => {
    expect(mensaje(() => validarElegibilidad({ ...completadaHace(1), resena: { id: 'r' } }, 'ana', AHORA))).toEqual({
      status: 409, message: 'Esta solicitud ya tiene reseña',
    });
  });
  test('CA-09.5 día 30 se acepta y día 31 responde 422', () => {
    expect(mensaje(() => validarElegibilidad(completadaHace(30), 'ana', AHORA))).toBeNull();
    expect(mensaje(() => validarElegibilidad(completadaHace(31), 'ana', AHORA))).toEqual({
      status: 422, message: 'El plazo para reseñar venció',
    });
  });
});
