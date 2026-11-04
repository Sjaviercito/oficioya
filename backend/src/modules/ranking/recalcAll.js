// Ejecución manual del recálculo: npm run ranking:recalc
// Útil si el hosting no mantiene el servidor encendido a las 03:00 (cron externo).
const prisma = require('../../shared/prisma');
const { recalcularTodos } = require('./service');

recalcularTodos()
  .then((n) => console.log(`Ranking recalculado para ${n} trabajadores`))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
