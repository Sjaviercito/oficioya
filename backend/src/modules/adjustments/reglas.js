// Reglas de cambios de precio (contrato v1.3, RF-16). Funciones puras para probarlas.
const { errores } = require('../../shared/errors');

const TOPE_AUMENTO = 0.5; // por omisión; cada oficio define el suyo (oficio.topeAjuste)
const TIPOS_AUMENTO = ['pieza_extra', 'mas_trabajo', 'dano_oculto', 'cliente_pidio_mas'];
// Tipos que reflejan un sobrecosto atribuible al trabajador (cuentan en métricas y en el ranking).
const TIPOS_DEL_TRABAJADOR = ['pieza_extra', 'mas_trabajo', 'dano_oculto'];
const ETIQUETAS = {
  pieza_extra: 'Pieza extra',
  mas_trabajo: 'Más trabajo del esperado',
  dano_oculto: 'Daño oculto',
  cliente_pidio_mas: 'El cliente pidió algo más',
  mas_facil: 'Resultó más fácil (baja de precio)',
  presupuesto: 'Presupuesto después del diagnóstico',
};

const n = (x) => (x === null || x === undefined ? 0 : Number(x));
const centavos = (x) => Math.round(Number(x) * 100);
const redondear = (x) => Math.round(Number(x) * 100) / 100;
const topeDe = (s) => (s.oficio && s.oficio.topeAjuste != null ? Number(s.oficio.topeAjuste) : TOPE_AUMENTO);

const aceptados = (s) => (s.ajustes || []).filter((a) => a.estado === 'aceptado');
const presupuestoAceptado = (s) => aceptados(s).find((a) => a.tipo === 'presupuesto') || null;

// Ahorro cuando el ticket salió más barato que el material aprobado.
const ahorroTicket = (a) => (a.ticketMonto != null ? Math.max(0, n(a.deltaMaterial) - n(a.ticketMonto)) : 0);

// Monto vigente = cotización + suma de los cambios aceptados − ahorros comprobados con ticket.
function montoVigente(s) {
  if (!s.cotizacionAceptada) return null;
  const base = n(s.cotizacionAceptada.monto);
  const cambios = aceptados(s).reduce((t, a) => t + n(a.montoPropuesto) - n(a.montoAnterior) - ahorroTicket(a), 0);
  return redondear(base + cambios);
}

// Mano de obra contra la que se mide el tope: la del presupuesto (diagnóstico) o la de la cotización.
function manoObraBase(s) {
  const c = s.cotizacionAceptada;
  if (c.tipo === 'diagnostico') {
    const p = presupuestoAceptado(s);
    return p ? n(p.deltaManoObra) : null;
  }
  return c.manoObra != null ? n(c.manoObra) : n(c.monto);
}

/**
 * Valida una propuesta y calcula el monto resultante.
 * propuesta = { tipo, deltaManoObra, deltaMaterial }
 * Devuelve { montoAnterior, montoPropuesto, autoAceptar }.
 */
function validarPropuesta(s, { tipo, deltaManoObra = 0, deltaMaterial = 0 }) {
  const c = s.cotizacionAceptada;
  const esDiagnostico = c.tipo === 'diagnostico';

  if (s.terminadaPorTrabajadorEn) {
    throw errores.conflict('Ya marcaste el trabajo como terminado; no se pueden proponer cambios de precio', 'TRABAJO_TERMINADO');
  }
  if ((s.ajustes || []).some((a) => a.estado === 'pendiente')) {
    throw errores.conflict('Ya hay un cambio de precio pendiente de respuesta del cliente', 'AJUSTE_PENDIENTE');
  }

  const vigente = montoVigente(s);

  if (tipo === 'presupuesto') {
    if (!esDiagnostico) throw errores.conflict('El presupuesto solo aplica a cotizaciones de visita de diagnóstico', 'NO_ES_DIAGNOSTICO');
    if (!['aceptada', 'en_curso'].includes(s.estado)) throw errores.conflict('Solo se envía el presupuesto en un trabajo activo', 'TRANSICION_INVALIDA');
    if (presupuestoAceptado(s)) throw errores.conflict('El cliente ya aceptó un presupuesto; usa un cambio de precio', 'PRESUPUESTO_ACEPTADO');
    const total = n(deltaManoObra) + n(deltaMaterial);
    if (centavos(total) <= 0 || deltaManoObra < 0 || deltaMaterial < 0) throw errores.badRequest('Escribe el presupuesto del trabajo');
    const visita = n(c.costoVisita || c.monto);
    // Si la visita es abonable, se descuenta del trabajo (el cliente nunca paga menos que la visita).
    const montoPropuesto = c.visitaAbonable ? Math.max(total, visita) : visita + total;
    return { montoAnterior: vigente, montoPropuesto: redondear(montoPropuesto), autoAceptar: false };
  }

  if (s.estado !== 'en_curso') {
    throw errores.conflict('Solo se puede cambiar el precio con el trabajo en curso', 'TRANSICION_INVALIDA');
  }
  if (esDiagnostico && !presupuestoAceptado(s)) {
    throw errores.conflict('Primero envía el presupuesto del diagnóstico y espera a que el cliente lo acepte', 'SIN_PRESUPUESTO');
  }

  const delta = n(deltaManoObra) + n(deltaMaterial);

  if (tipo === 'mas_facil') {
    if (deltaManoObra > 0 || deltaMaterial > 0 || centavos(delta) >= 0) {
      throw errores.badRequest('Para una baja de precio, escribe cuánto se descuenta');
    }
    const montoPropuesto = redondear(vigente + delta);
    if (centavos(montoPropuesto) <= 0) throw errores.unprocessable('El monto final debe ser mayor a 0', 'MONTO_INVALIDO');
    // Una baja solo beneficia al cliente: se aplica sin pedirle aprobación.
    return { montoAnterior: vigente, montoPropuesto, autoAceptar: true };
  }

  if (!TIPOS_AUMENTO.includes(tipo)) throw errores.badRequest('Tipo de cambio de precio no válido');
  if (deltaManoObra < 0 || deltaMaterial < 0 || centavos(delta) <= 0) {
    throw errores.unprocessable('El cambio solo puede aumentar el monto vigente; para bajarlo usa "Resultó más fácil"', 'AJUSTE_NO_AUMENTA');
  }

  // Tope sobre la MANO DE OBRA (el material se aprueba y se puede comprobar con ticket).
  // Lo que pidió el cliente no cuenta: es trabajo nuevo, no un sobrecosto.
  if (tipo !== 'cliente_pidio_mas' && centavos(deltaManoObra) > 0) {
    const porcentaje = topeDe(s);
    const base = manoObraBase(s);
    const acumulado = aceptados(s)
      .filter((a) => !['cliente_pidio_mas', 'presupuesto'].includes(a.tipo))
      .reduce((t, a) => t + n(a.deltaManoObra), 0);
    const maximo = base * porcentaje;
    if (centavos(acumulado + n(deltaManoObra)) > centavos(maximo)) {
      throw errores.unprocessable(
        `La mano de obra no puede subir más del ${Math.round(porcentaje * 100)} % de lo cotizado (máximo +$${maximo.toFixed(2)} en total). Si el trabajo cambió por completo, abre una solicitud nueva.`,
        'AJUSTE_EXCEDE_TOPE',
      );
    }
  }
  return { montoAnterior: vigente, montoPropuesto: redondear(vigente + delta), autoAceptar: false };
}

// Métrica al completar: cuánto terminó arriba de lo cotizado, sin contar lo que pidió el cliente.
function metricasAlCompletar(s) {
  const c = s.cotizacionAceptada;
  const p = presupuestoAceptado(s);
  const montoBase = c.tipo === 'diagnostico' && p ? n(p.montoPropuesto) : n(c.monto);
  const montoCerrado = montoVigente(s);
  const pidioMas = aceptados(s)
    .filter((a) => a.tipo === 'cliente_pidio_mas')
    .reduce((t, a) => t + n(a.montoPropuesto) - n(a.montoAnterior), 0);
  const sobreCotizadoPct = montoBase > 0 ? (montoCerrado - pidioMas - montoBase) / montoBase : 0;
  return { montoBase, montoCerrado, sobreCotizadoPct };
}

module.exports = {
  TOPE_AUMENTO, TIPOS_AUMENTO, TIPOS_DEL_TRABAJADOR, ETIQUETAS,
  topeDe, montoVigente, manoObraBase, presupuestoAceptado, validarPropuesta, metricasAlCompletar, ahorroTicket,
};
