import { useEffect, useState } from 'react';
import { api } from './client';

let cache = null;

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState(cache || { oficios: [], zonas: [] });
  useEffect(() => {
    if (cache) return;
    api.get('/catalog').then((c) => { cache = c; setCatalogo(c); }).catch(() => {});
  }, []);
  return catalogo;
}

export const ESTADOS = {
  abierta: 'Esperando cotizaciones',
  cotizada: 'Con cotizaciones',
  aceptada: 'Cotización aceptada',
  en_curso: 'Trabajo en curso',
  completada: 'Terminado',
  cancelada: 'Cancelada',
};

// v1.3: el último motivo solo lo ve el trabajador cuando el cliente rechazó un cambio que comprobó con foto.
export const MOTIVO_SIN_ACUERDO = 'No puedo continuar con el precio original';
export const MOTIVOS_CANCELACION = ['Ya no lo necesito', 'Encontré otra opción', 'No puedo asistir', 'Cambió el precio', MOTIVO_SIN_ACUERDO, 'Otro'];

export const pesos = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
export const fecha = (iso) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${String(iso).slice(0, 10)}T00:00:00Z`));
export const hoyLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
