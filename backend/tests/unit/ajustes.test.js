const { montoVigente, validarPropuesta } = require('../../src/modules/adjustments/reglas');

const base = (extra = {}) => ({ estado: 'en_curso', cotizacionAceptada: { monto: 800 }, ajustes: [], ...extra });
const falla = (fn) => { try { fn(); } catch (e) { return { status: e.status, code: e.code }; } return null; };

describe('RF-16 — Reglas del ajuste de precio', () => {
  test('CA-16.1 $800 → $1,000 es válido', () => {
    expect(falla(() => validarPropuesta(base(), 1000))).toBeNull();
  });
  test('CA-16.3 tope exacto: $1,200 (+50 %) se acepta y $1,200.01 → 422', () => {
    expect(falla(() => validarPropuesta(base(), 1200))).toBeNull();
    expect(falla(() => validarPropuesta(base(), 1200.01))).toEqual({ status: 422, code: 'AJUSTE_EXCEDE_TOPE' });
    expect(falla(() => validarPropuesta(base(), 1300))).toEqual({ status: 422, code: 'AJUSTE_EXCEDE_TOPE' });
  });
  test('CA-16.4 solo aumentos: igual o menor al vigente → 422', () => {
    expect(falla(() => validarPropuesta(base(), 800))).toEqual({ status: 422, code: 'AJUSTE_NO_AUMENTA' });
    expect(falla(() => validarPropuesta(base(), 700))).toEqual({ status: 422, code: 'AJUSTE_NO_AUMENTA' });
  });
  test('CA-16.5 con la solicitud aceptada (no en curso) → 409', () => {
    expect(falla(() => validarPropuesta(base({ estado: 'aceptada' }), 1000)).status).toBe(409);
  });
  test('CA-16.6 con un ajuste pendiente → 409', () => {
    const s = base({ ajustes: [{ estado: 'pendiente', montoPropuesto: 900, creadoEn: new Date() }] });
    expect(falla(() => validarPropuesta(s, 1000))).toEqual({ status: 409, code: 'AJUSTE_PENDIENTE' });
  });
  test('el tope se mide contra la cotización original, no contra el último ajuste', () => {
    const s = base({ ajustes: [{ estado: 'aceptado', montoPropuesto: 1100, creadoEn: new Date() }] });
    expect(montoVigente(s)).toBe(1100);
    expect(falla(() => validarPropuesta(s, 1200))).toBeNull();
    expect(falla(() => validarPropuesta(s, 1250)).code).toBe('AJUSTE_EXCEDE_TOPE');
  });
  test('un ajuste rechazado no cambia el monto vigente', () => {
    expect(montoVigente(base({ ajustes: [{ estado: 'rechazado', montoPropuesto: 1000, creadoEn: new Date() }] }))).toBe(800);
  });
});
