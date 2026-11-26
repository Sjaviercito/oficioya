// v1.3: métricas de confianza e insignias del trabajador. No cambian el ranking (sección 3.4):
// dan información al cliente y metas al trabajador.
const prisma = require('../../shared/prisma');

const MIN_TRABAJOS_METRICA = 5;

const DEFINICION = {
  comprueba_gastos: { nombre: 'Comprueba sus gastos', descripcion: 'Sube el ticket en al menos 8 de cada 10 cambios de precio por material (mínimo 3).' },
  respeta_cotizacion: { nombre: 'Respeta su cotización', descripcion: 'Sus trabajos terminan, en promedio, máximo 5 % arriba de lo cotizado (mínimo 5 trabajos).' },
  cumplido: { nombre: 'Cumplido', descripcion: 'Ninguna cancelación atribuible en sus trabajos (mínimo 5 trabajos completados).' },
};

async function reputacionDe(ids) {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return {};
  const [perfiles, completadas, materiales] = await Promise.all([
    prisma.perfilTrabajador.findMany({
      where: { id: { in: unicos } },
      select: { id: true, trabajosCompletados: true, cancelacionesAtribuibles: true },
    }),
    prisma.solicitud.findMany({
      where: { estado: 'completada', sobreCotizadoPct: { not: null }, cotizacionAceptada: { trabajadorId: { in: unicos } } },
      select: { sobreCotizadoPct: true, cotizacionAceptada: { select: { trabajadorId: true } } },
    }),
    prisma.ajustePrecio.findMany({
      where: { estado: 'aceptado', deltaMaterial: { gt: 0 }, solicitud: { cotizacionAceptada: { trabajadorId: { in: unicos } } } },
      select: { ticketClave: true, solicitud: { select: { cotizacionAceptada: { select: { trabajadorId: true } } } } },
    }),
  ]);

  const resultado = {};
  for (const p of perfiles) {
    const pcts = completadas.filter((s) => s.cotizacionAceptada.trabajadorId === p.id).map((s) => Number(s.sobreCotizadoPct));
    const mats = materiales.filter((a) => a.solicitud.cotizacionAceptada.trabajadorId === p.id);
    const conTicket = mats.filter((a) => a.ticketClave).length;
    const promedio = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;

    const progreso = [
      {
        clave: 'comprueba_gastos',
        obtenida: mats.length >= 3 && conTicket / mats.length >= 0.8,
        avance: mats.length < 3
          ? `Llevas ${mats.length} de 3 cambios por material`
          : `Has comprobado ${conTicket} de ${mats.length}`,
      },
      {
        clave: 'respeta_cotizacion',
        obtenida: pcts.length >= MIN_TRABAJOS_METRICA && promedio <= 0.05,
        avance: pcts.length < MIN_TRABAJOS_METRICA
          ? `Te faltan ${MIN_TRABAJOS_METRICA - pcts.length} trabajos para medirlo`
          : `Tus trabajos terminan ${Math.round(promedio * 100)} % arriba en promedio`,
      },
      {
        clave: 'cumplido',
        obtenida: p.trabajosCompletados >= MIN_TRABAJOS_METRICA && p.cancelacionesAtribuibles === 0,
        avance: p.cancelacionesAtribuibles > 0
          ? 'Tienes cancelaciones atribuibles'
          : `Te faltan ${Math.max(0, MIN_TRABAJOS_METRICA - p.trabajosCompletados)} trabajos`,
      },
    ].map((x) => ({ ...x, ...DEFINICION[x.clave] }));

    resultado[p.id] = {
      // "Termina X % arriba de lo cotizado" (sin contar lo que pidió el cliente); solo con 5 trabajos o más.
      sobreCotizadoPromedio: pcts.length >= MIN_TRABAJOS_METRICA ? Math.round(promedio * 100) : null,
      insignias: progreso.filter((x) => x.obtenida).map(({ clave, nombre }) => ({ clave, nombre })),
      progresoInsignias: progreso,
    };
  }
  return resultado;
}

module.exports = { reputacionDe, DEFINICION, MIN_TRABAJOS_METRICA };
