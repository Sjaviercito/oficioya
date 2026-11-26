// Tareas periódicas disparadas por el ping de /health (v1.2):
// - completar trabajos con "terminado" vencido (72 h), como máximo cada 5 minutos;
// - recálculo del ranking una vez por día (hora de Puebla), para aplicar el peso por antigüedad.
const config = require('../config');
const { hoyEnPuebla } = require('./fechas');

let ultimaRevision = 0;
let ultimoRecalculo = null;

async function tareasPeriodicas(ahora = new Date()) {
  if (config.env === 'test') return;
  const solicitudes = require('../modules/requests/service');
  const ranking = require('../modules/ranking/service');
  if (ahora.getTime() - ultimaRevision > 5 * 60 * 1000) {
    ultimaRevision = ahora.getTime();
    await solicitudes.completarVencidas(ahora);
  }
  const hoy = hoyEnPuebla(ahora);
  if (ultimoRecalculo !== hoy) {
    ultimoRecalculo = hoy;
    const n = await ranking.recalcularTodos(ahora);
    console.log(`[tareas] Ranking recalculado para ${n} trabajadores (${hoy})`);
  }
}

module.exports = { tareasPeriodicas };
