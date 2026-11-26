const { montoVigente, validarPropuesta, metricasAlCompletar } = require('../../src/modules/adjustments/reglas');

const cerrado = (extra = {}) => ({
  estado: 'en_curso',
  cotizacionAceptada: { tipo: 'cerrado', monto: 800, manoObra: 800, material: 0 },
  ajustes: [],
  ...extra,
});
const diag = (abonable = true, extra = {}) => ({
  estado: 'en_curso',
  cotizacionAceptada: { tipo: 'diagnostico', monto: 200, costoVisita: 200, visitaAbonable: abonable },
  ajustes: [],
  ...extra,
});
const aceptado = (tipo, ma, mp, dMO = 0, dMat = 0, extra = {}) => ({ estado: 'aceptado', tipo, montoAnterior: ma, montoPropuesto: mp, deltaManoObra: dMO, deltaMaterial: dMat, ...extra });
const falla = (fn) => { try { fn(); return null; } catch (e) { return { status: e.status, code: e.code }; } };

describe('RF-16 v1.3 — Cambios de precio (precio cerrado)', () => {
  test('CA-16.1 más trabajo $800 → $1,000', () => {
    expect(validarPropuesta(cerrado(), { tipo: 'mas_trabajo', deltaManoObra: 200 })).toMatchObject({ montoAnterior: 800, montoPropuesto: 1000, autoAceptar: false });
  });
  test('CA-16.3 tope sobre la mano de obra: +$400 (50 %) se acepta; +$400.01 → 422', () => {
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'mas_trabajo', deltaManoObra: 400 }))).toBeNull();
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'mas_trabajo', deltaManoObra: 400.01 }))).toEqual({ status: 422, code: 'AJUSTE_EXCEDE_TOPE' });
  });
  test('CA-16.10 el material no tiene tope (se aprueba y se comprueba con ticket)', () => {
    expect(validarPropuesta(cerrado(), { tipo: 'pieza_extra', deltaMaterial: 2000 }).montoPropuesto).toBe(2800);
  });
  test('CA-16.11 lo que pidió el cliente no tiene tope (es trabajo nuevo)', () => {
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'cliente_pidio_mas', deltaManoObra: 2000 }))).toBeNull();
  });
  test('el tope es acumulado: con +$300 ya aceptados, +$100 sí y +$150 no', () => {
    const s = cerrado({ ajustes: [aceptado('mas_trabajo', 800, 1100, 300)] });
    expect(falla(() => validarPropuesta(s, { tipo: 'dano_oculto', deltaManoObra: 100 }))).toBeNull();
    expect(falla(() => validarPropuesta(s, { tipo: 'dano_oculto', deltaManoObra: 150 })).code).toBe('AJUSTE_EXCEDE_TOPE');
  });
  test('v1.1-5 tope de 30 % en el oficio: +$300 sí, +$301 no (mano de obra $1,000)', () => {
    const s = cerrado({ oficio: { topeAjuste: 0.3 }, cotizacionAceptada: { tipo: 'cerrado', monto: 1000, manoObra: 1000, material: 0 } });
    expect(falla(() => validarPropuesta(s, { tipo: 'mas_trabajo', deltaManoObra: 300 }))).toBeNull();
    expect(falla(() => validarPropuesta(s, { tipo: 'mas_trabajo', deltaManoObra: 301 })).code).toBe('AJUSTE_EXCEDE_TOPE');
  });
  test('CA-16.4 un tipo de aumento con cambio 0 o negativo → 422', () => {
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'mas_trabajo', deltaManoObra: 0 })).code).toBe('AJUSTE_NO_AUMENTA');
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'pieza_extra', deltaMaterial: -50 })).code).toBe('AJUSTE_NO_AUMENTA');
  });
  test('CA-16.12 "resultó más fácil" baja el precio y se aplica sin aprobación', () => {
    expect(validarPropuesta(cerrado(), { tipo: 'mas_facil', deltaManoObra: -100 })).toMatchObject({ montoPropuesto: 700, autoAceptar: true });
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'mas_facil', deltaManoObra: -800 })).code).toBe('MONTO_INVALIDO');
  });
  test('CA-16.5 / CA-16.6 trabajo no iniciado o con un cambio pendiente → 409', () => {
    expect(falla(() => validarPropuesta(cerrado({ estado: 'aceptada' }), { tipo: 'mas_trabajo', deltaManoObra: 100 })).status).toBe(409);
    expect(falla(() => validarPropuesta(cerrado({ ajustes: [{ estado: 'pendiente' }] }), { tipo: 'mas_trabajo', deltaManoObra: 100 })).code).toBe('AJUSTE_PENDIENTE');
  });
});

describe('RF-30 v1.3 — Visita de diagnóstico', () => {
  test('CA-30.1 visita abonable: presupuesto de $600 → total $600 (la visita se descuenta)', () => {
    expect(validarPropuesta(diag(true), { tipo: 'presupuesto', deltaManoObra: 450, deltaMaterial: 150 }).montoPropuesto).toBe(600);
  });
  test('CA-30.2 visita no abonable: presupuesto de $600 → total $800', () => {
    expect(validarPropuesta(diag(false), { tipo: 'presupuesto', deltaManoObra: 600 }).montoPropuesto).toBe(800);
  });
  test('CA-30.3 abonable con presupuesto menor a la visita: el cliente paga al menos la visita', () => {
    expect(validarPropuesta(diag(true), { tipo: 'presupuesto', deltaManoObra: 100 }).montoPropuesto).toBe(200);
  });
  test('CA-30.4 el presupuesto se puede enviar antes de iniciar y no tiene tope', () => {
    expect(falla(() => validarPropuesta(diag(true, { estado: 'aceptada' }), { tipo: 'presupuesto', deltaManoObra: 5000 }))).toBeNull();
  });
  test('CA-30.5 sin presupuesto aceptado no hay otros cambios; el tope se mide contra el presupuesto', () => {
    expect(falla(() => validarPropuesta(diag(), { tipo: 'mas_trabajo', deltaManoObra: 10 })).code).toBe('SIN_PRESUPUESTO');
    const s = diag(true, { ajustes: [aceptado('presupuesto', 200, 600, 400, 200)] });
    expect(falla(() => validarPropuesta(s, { tipo: 'mas_trabajo', deltaManoObra: 200 }))).toBeNull();
    expect(falla(() => validarPropuesta(s, { tipo: 'mas_trabajo', deltaManoObra: 201 })).code).toBe('AJUSTE_EXCEDE_TOPE');
    expect(falla(() => validarPropuesta(s, { tipo: 'presupuesto', deltaManoObra: 300 })).code).toBe('PRESUPUESTO_ACEPTADO');
  });
  test('el presupuesto solo existe en cotizaciones de diagnóstico', () => {
    expect(falla(() => validarPropuesta(cerrado(), { tipo: 'presupuesto', deltaManoObra: 300 })).code).toBe('NO_ES_DIAGNOSTICO');
  });
});

describe('Monto vigente, ticket y métricas', () => {
  test('CA-16.13 el ticket más barato baja el total; un cambio posterior se suma bien', () => {
    const conTicket = aceptado('pieza_extra', 800, 1050, 0, 250, { ticketMonto: 200 });
    expect(montoVigente(cerrado({ ajustes: [conTicket] }))).toBe(1000);
    expect(montoVigente(cerrado({ ajustes: [conTicket, aceptado('mas_trabajo', 1000, 1100, 100)] }))).toBe(1100);
  });
  test('un ticket más caro no sube el total (requiere otro cambio)', () => {
    expect(montoVigente(cerrado({ ajustes: [aceptado('pieza_extra', 800, 1050, 0, 250, { ticketMonto: 400 })] }))).toBe(1050);
  });
  test('un cambio rechazado no altera el monto', () => {
    expect(montoVigente(cerrado({ ajustes: [{ ...aceptado('mas_trabajo', 800, 1000, 200), estado: 'rechazado' }] }))).toBe(800);
  });
  test('CA-17.3 "termina X % arriba" no cuenta lo que pidió el cliente', () => {
    const s = cerrado({ ajustes: [aceptado('cliente_pidio_mas', 800, 1000, 200), aceptado('dano_oculto', 1000, 1100, 100)] });
    expect(metricasAlCompletar(s)).toEqual({ montoBase: 800, montoCerrado: 1100, sobreCotizadoPct: 0.125 });
  });
  test('en diagnóstico la base es el presupuesto aceptado', () => {
    const s = diag(true, { ajustes: [aceptado('presupuesto', 200, 600, 400, 200)] });
    expect(metricasAlCompletar(s)).toMatchObject({ montoBase: 600, montoCerrado: 600, sobreCotizadoPct: 0 });
  });
});
