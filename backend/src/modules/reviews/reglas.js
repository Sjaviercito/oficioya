// Reglas de elegibilidad de la reseña (RF-09). Puras para poder probarlas (CA-09.x).
const { errores } = require('../../shared/errors');
const { diasCompletosEntre } = require('../../shared/fechas');

const PLAZO_DIAS = 30;

function validarElegibilidad(solicitud, clienteId, ahora = new Date()) {
  if (solicitud.clienteId !== clienteId) throw errores.forbidden('Solo el cliente que contrató el trabajo puede reseñarlo');
  if (solicitud.estado !== 'completada') throw errores.unprocessable('Solo se pueden reseñar trabajos completados');
  if (solicitud.resena) throw errores.conflict('Esta solicitud ya tiene reseña', 'RESENA_DUPLICADA');
  if (diasCompletosEntre(solicitud.completadaEn, ahora) > PLAZO_DIAS) {
    throw errores.unprocessable('El plazo para reseñar venció', 'PLAZO_VENCIDO');
  }
}

module.exports = { validarElegibilidad, PLAZO_DIAS };
