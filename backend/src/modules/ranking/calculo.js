// Regla de negocio del ranking (sección 3.4 del contrato). Funciones puras: no tocan la base
// de datos, así se prueban directamente contra los criterios CA-10.x.
const { diasCompletosEntre } = require('../../shared/fechas');

const MIN_TRABAJOS_PARA_RANKING = 3;

// Peso por antigüedad: <90 días → 1.0; 90 a 365 → 0.6; >365 → 0.3.
function pesoPorAntiguedad(dias) {
  if (dias < 90) return 1.0;
  if (dias <= 365) return 0.6;
  return 0.3;
}

// resenas: [{ estrellas, creadaEn }]
function calcularRanking({ resenas, solicitudesAceptadas, cancelacionesAtribuibles, trabajosCompletados }, ahora = new Date()) {
  const tasaCancelacion = solicitudesAceptadas > 0 ? cancelacionesAtribuibles / solicitudesAceptadas : 0;

  let sumaPonderada = 0;
  let sumaPesos = 0;
  for (const r of resenas) {
    const peso = pesoPorAntiguedad(diasCompletosEntre(r.creadaEn, ahora));
    sumaPonderada += r.estrellas * peso;
    sumaPesos += peso;
  }

  const esNuevo = trabajosCompletados < MIN_TRABAJOS_PARA_RANKING || resenas.length === 0;
  if (esNuevo) {
    return { calificacionPonderada: null, tasaCancelacion, puntuacionRanking: null, esNuevo: true };
  }

  const calificacionPonderada = sumaPonderada / sumaPesos;
  return {
    calificacionPonderada,
    tasaCancelacion,
    puntuacionRanking: calificacionPonderada * (1 - tasaCancelacion),
    esNuevo: false,
  };
}

// Orden de búsqueda: primero con puntuación (desc; desempate por más trabajos y luego por
// verificación más antigua); después los "Nuevo" por verificación más antigua.
function compararParaBusqueda(a, b) {
  const aNuevo = a.puntuacionRanking === null;
  const bNuevo = b.puntuacionRanking === null;
  if (aNuevo !== bNuevo) return aNuevo ? 1 : -1;
  if (!aNuevo) {
    if (b.puntuacionRanking !== a.puntuacionRanking) return b.puntuacionRanking - a.puntuacionRanking;
    if (b.trabajosCompletados !== a.trabajosCompletados) return b.trabajosCompletados - a.trabajosCompletados;
  }
  return new Date(a.verificadoEn).getTime() - new Date(b.verificadoEn).getTime();
}

const redondear2 = (n) => (n === null || n === undefined ? null : Math.round(n * 100) / 100);

module.exports = { pesoPorAntiguedad, calcularRanking, compararParaBusqueda, redondear2, MIN_TRABAJOS_PARA_RANKING };
