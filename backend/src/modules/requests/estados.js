// Máquina de estados de la solicitud (sección 3.3 del contrato, ADR-06).
// Única fuente de verdad: cualquier transición que no esté aquí responde 409.
const { errores } = require('../../shared/errors');

const TRANSICIONES = {
  recibirCotizacion: { desde: ['abierta', 'cotizada'], hacia: 'cotizada', quien: 'trabajador' },
  aceptar: { desde: ['cotizada'], hacia: 'aceptada', quien: 'cliente' },
  iniciar: { desde: ['aceptada'], hacia: 'en_curso', quien: 'trabajador' },
  completar: { desde: ['en_curso'], hacia: 'completada', quien: 'cliente' },
  cancelarCliente: { desde: ['abierta', 'cotizada', 'aceptada', 'en_curso'], hacia: 'cancelada', quien: 'cliente' },
  cancelarTrabajador: { desde: ['aceptada', 'en_curso'], hacia: 'cancelada', quien: 'trabajador' },
};

const ESTADOS_ABIERTOS_A_COTIZACION = TRANSICIONES.recibirCotizacion.desde;

// Devuelve el estado destino o lanza 409 con el mensaje del contrato.
function validarTransicion(accion, estadoActual) {
  const t = TRANSICIONES[accion];
  if (!t) throw new Error(`Acción desconocida: ${accion}`);
  if (t.desde.includes(estadoActual)) return t.hacia;

  if (t.hacia === 'cancelada') {
    if (estadoActual === 'completada') throw errores.conflict('No se puede cancelar una solicitud completada', 'TRANSICION_INVALIDA');
    if (estadoActual === 'cancelada') throw errores.conflict('La solicitud ya está cancelada', 'TRANSICION_INVALIDA');
  }
  if (accion === 'recibirCotizacion') {
    throw errores.conflict('Esta solicitud ya no recibe cotizaciones', 'TRANSICION_INVALIDA');
  }
  throw errores.conflict(`Transición no permitida: ${estadoActual} → ${t.hacia}`, 'TRANSICION_INVALIDA');
}

module.exports = { TRANSICIONES, ESTADOS_ABIERTOS_A_COTIZACION, validarTransicion };
