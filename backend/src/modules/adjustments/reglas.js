// Reglas del ajuste de precio (contrato v1.0, sección 3.5). Funciones puras para probarlas (CA-16.x).
const { errores } = require('../../shared/errors');

const TOPE_AUMENTO = 0.5; // hasta +50 % sobre el monto de la cotización aceptada

const centavos = (n) => Math.round(Number(n) * 100);

// Monto vigente: el del último ajuste aceptado o, si no hay, el de la cotización aceptada.
function montoVigente(solicitud) {
  const aceptados = (solicitud.ajustes || [])
    .filter((a) => a.estado === 'aceptado')
    .sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));
  if (aceptados.length) return Number(aceptados[aceptados.length - 1].montoPropuesto);
  return solicitud.cotizacionAceptada ? Number(solicitud.cotizacionAceptada.monto) : null;
}

function validarPropuesta(solicitud, montoPropuesto) {
  if (solicitud.estado !== 'en_curso') {
    throw errores.conflict('Solo se puede proponer un ajuste con el trabajo en curso', 'TRANSICION_INVALIDA');
  }
  if ((solicitud.ajustes || []).some((a) => a.estado === 'pendiente')) {
    throw errores.conflict('Ya hay un ajuste pendiente de respuesta del cliente', 'AJUSTE_PENDIENTE');
  }
  const original = Number(solicitud.cotizacionAceptada.monto);
  const vigente = montoVigente(solicitud);
  if (centavos(montoPropuesto) <= centavos(vigente)) {
    throw errores.unprocessable('El ajuste solo puede aumentar el monto vigente', 'AJUSTE_NO_AUMENTA');
  }
  const tope = original * (1 + TOPE_AUMENTO);
  if (centavos(montoPropuesto) > centavos(tope)) {
    throw errores.unprocessable(
      `El ajuste no puede superar el 50 % del monto cotizado (máximo $${tope.toFixed(2)}). Para más trabajo, abre una solicitud nueva.`,
      'AJUSTE_EXCEDE_TOPE',
    );
  }
  return { montoAnterior: vigente, tope };
}

module.exports = { TOPE_AUMENTO, montoVigente, validarPropuesta };
