const cron = require('node-cron');
const app = require('./app');
const config = require('./config');
const { recalcularTodos } = require('./modules/ranking/service');

app.listen(config.port, () => {
  console.log(`OficioYa API escuchando en el puerto ${config.port}`);
});

// ADR-06: recálculo diario a las 03:00 (hora de Puebla) para aplicar el peso por antigüedad.
cron.schedule(
  '0 3 * * *',
  async () => {
    try {
      const n = await recalcularTodos();
      console.log(`[cron] Ranking recalculado para ${n} trabajadores`);
    } catch (e) {
      console.error('[cron] Error al recalcular el ranking', e);
    }
  },
  { timezone: config.zonaHoraria },
);
