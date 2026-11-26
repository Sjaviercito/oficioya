const { pesoPorAntiguedad, calcularRanking, compararParaBusqueda, redondear2 } = require('../../src/modules/ranking/calculo');

const AHORA = new Date('2026-11-03T12:00:00Z');
const hace = (dias) => new Date(AHORA.getTime() - dias * 86400000);

describe('RF-10 — Regla del ranking (sección 3.4)', () => {
  test('CA-10.1 cálculo exacto del trabajador B: 4.37, 0.20 y 3.49', () => {
    const r = calcularRanking(
      {
        resenas: [
          { estrellas: 5, creadaEn: hace(10) },
          { estrellas: 4, creadaEn: hace(120) },
          { estrellas: 3, creadaEn: hace(400) },
        ],
        solicitudesAceptadas: 5,
        cancelacionesAtribuibles: 1,
        trabajosCompletados: 3,
      },
      AHORA,
    );
    expect(redondear2(r.calificacionPonderada)).toBe(4.37);
    expect(r.tasaCancelacion).toBeCloseTo(0.2, 10);
    expect(redondear2(r.puntuacionRanking)).toBe(3.49);
    expect(r.esNuevo).toBe(false);
  });

  test('CA-10.2 fronteras de peso: 89→1.0, 90→0.6, 365→0.6, 366→0.3', () => {
    expect([89, 90, 365, 366].map(pesoPorAntiguedad)).toEqual([1.0, 0.6, 0.6, 0.3]);
  });

  test('CA-10.3 con 2 trabajos es "Nuevo"; con 3 trabajos y reseñas obtiene puntuación', () => {
    const base = { solicitudesAceptadas: 3, cancelacionesAtribuibles: 0 };
    const dos = calcularRanking({ ...base, trabajosCompletados: 2, resenas: [{ estrellas: 5, creadaEn: hace(1) }, { estrellas: 4, creadaEn: hace(2) }] }, AHORA);
    expect(dos.esNuevo).toBe(true);
    expect(dos.puntuacionRanking).toBeNull();
    const tres = calcularRanking({ ...base, trabajosCompletados: 3, resenas: [{ estrellas: 5, creadaEn: hace(1) }, { estrellas: 4, creadaEn: hace(2) }, { estrellas: 3, creadaEn: hace(3) }] }, AHORA);
    expect(tres.esNuevo).toBe(false);
    expect(tres.puntuacionRanking).toBeCloseTo(4, 10);
  });

  test('CA-10.4 sin solicitudes aceptadas la tasa es 0, sin error, y es "Nuevo"', () => {
    const r = calcularRanking({ resenas: [], solicitudesAceptadas: 0, cancelacionesAtribuibles: 0, trabajosCompletados: 0 }, AHORA);
    expect(r.tasaCancelacion).toBe(0);
    expect(r.esNuevo).toBe(true);
  });

  test('Supuesto 5: con 3 trabajos pero sin reseñas sigue siendo "Nuevo"', () => {
    const r = calcularRanking({ resenas: [], solicitudesAceptadas: 3, cancelacionesAtribuibles: 0, trabajosCompletados: 3 }, AHORA);
    expect(r.esNuevo).toBe(true);
  });

  test('CA-10.5 al cumplir 90 días la reseña pasa de peso 1.0 a 0.6 y la puntuación cambia', () => {
    const datos = {
      resenas: [{ estrellas: 5, creadaEn: hace(89) }, { estrellas: 3, creadaEn: hace(10) }, { estrellas: 3, creadaEn: hace(11) }],
      solicitudesAceptadas: 3,
      cancelacionesAtribuibles: 0,
      trabajosCompletados: 3,
    };
    const antes = calcularRanking(datos, AHORA).puntuacionRanking;
    const despues = calcularRanking(datos, new Date(AHORA.getTime() + 86400000)).puntuacionRanking;
    expect(antes).toBeCloseTo((5 + 3 + 3) / 3, 10);
    expect(despues).toBeCloseTo((5 * 0.6 + 3 + 3) / 2.6, 10);
  });
});

describe('v1.1-6 — Ajustes en el ranking', () => {
  test('CA-10.6 con 1 de 4 trabajos con ajuste, la puntuación baja 2.5 %', () => {
    const datos = {
      resenas: [{ estrellas: 4, creadaEn: hace(1) }, { estrellas: 4, creadaEn: hace(2) }, { estrellas: 4, creadaEn: hace(3) }, { estrellas: 4, creadaEn: hace(4) }],
      solicitudesAceptadas: 4, cancelacionesAtribuibles: 0, trabajosCompletados: 4, trabajosConAjuste: 1,
    };
    expect(calcularRanking(datos, AHORA).puntuacionRanking).toBeCloseTo(4 * (1 - 0.1 * 0.25), 10);
  });
  test('CA-10.7 sin ajustes la puntuación es la misma de la v1.0 (CA-10.1 sigue en 3.49)', () => {
    const r = calcularRanking({
      resenas: [{ estrellas: 5, creadaEn: hace(10) }, { estrellas: 4, creadaEn: hace(120) }, { estrellas: 3, creadaEn: hace(400) }],
      solicitudesAceptadas: 5, cancelacionesAtribuibles: 1, trabajosCompletados: 3, trabajosConAjuste: 0,
    }, AHORA);
    expect(redondear2(r.puntuacionRanking)).toBe(3.49);
  });
});

describe('RF-04 — Orden de búsqueda', () => {
  test('CA-04.1 orden A, B, C (C "Nuevo" al final)', () => {
    const lista = [
      { nombre: 'C', puntuacionRanking: null, trabajosCompletados: 1, verificadoEn: hace(20) },
      { nombre: 'B', puntuacionRanking: 3.49, trabajosCompletados: 3, verificadoEn: hace(250) },
      { nombre: 'A', puntuacionRanking: 4.2, trabajosCompletados: 5, verificadoEn: hace(300) },
    ];
    expect(lista.sort(compararParaBusqueda).map((t) => t.nombre)).toEqual(['A', 'B', 'C']);
  });

  test('CA-04.3 empate en puntuación: gana quien tiene más trabajos', () => {
    const lista = [
      { nombre: 'B', puntuacionRanking: 4.2, trabajosCompletados: 5, verificadoEn: hace(10) },
      { nombre: 'A', puntuacionRanking: 4.2, trabajosCompletados: 8, verificadoEn: hace(5) },
    ];
    expect(lista.sort(compararParaBusqueda).map((t) => t.nombre)).toEqual(['A', 'B']);
  });

  test('Los "Nuevo" se ordenan por verificación más antigua', () => {
    const lista = [
      { nombre: 'reciente', puntuacionRanking: null, trabajosCompletados: 0, verificadoEn: hace(1) },
      { nombre: 'antiguo', puntuacionRanking: null, trabajosCompletados: 2, verificadoEn: hace(30) },
    ];
    expect(lista.sort(compararParaBusqueda).map((t) => t.nombre)).toEqual(['antiguo', 'reciente']);
  });
});
