// Utilidades de fechas. La antigüedad se mide en días completos (sección 3.4 del contrato).
const config = require('../config');

const MS_DIA = 24 * 60 * 60 * 1000;

function diasCompletosEntre(desde, hasta = new Date()) {
  return Math.floor((new Date(hasta).getTime() - new Date(desde).getTime()) / MS_DIA);
}

// Fecha de hoy (YYYY-MM-DD) en la zona horaria de Puebla, para validar la fecha deseada.
function hoyEnPuebla(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

module.exports = { MS_DIA, diasCompletosEntre, hoyEnPuebla };
