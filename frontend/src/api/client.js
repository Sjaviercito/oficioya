// Cliente de la API. El token de acceso vive en memoria; el refresh token en localStorage
// para mantener la sesión al recargar (ADR-04). Si la API responde 401, renueva una vez.
// En desarrollo la API está en el mismo origen (proxy de Vite). En producción, el frontend
// vive en el servidor del profe y la API en otro dominio: se define en VITE_API_URL al compilar.
export const API_ORIGEN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE = `${API_ORIGEN}/api/v1`;

// Las fotos que guarda la API vienen como rutas "/uploads/..." de la API.
export const urlArchivo = (ruta) => (ruta && ruta.startsWith('/') ? `${API_ORIGEN}${ruta}` : ruta);
const CLAVE_REFRESH = 'oficioya.refresh';

let accessToken = null;
let renovando = null;
let alCerrarSesion = () => {};

export function configurarSesion({ onLogout }) {
  alCerrarSesion = onLogout;
}

export function guardarSesion({ accessToken: a, refreshToken }) {
  accessToken = a;
  try {
    if (refreshToken) localStorage.setItem(CLAVE_REFRESH, refreshToken);
  } catch {
    /* almacenamiento no disponible: la sesión dura lo que la pestaña */
  }
}

export function borrarSesion() {
  accessToken = null;
  try { localStorage.removeItem(CLAVE_REFRESH); } catch { /* sin almacenamiento */ }
}

export function refreshGuardado() {
  try { return localStorage.getItem(CLAVE_REFRESH); } catch { return null; }
}

export class ApiError extends Error {
  constructor(status, message, campo) {
    super(message);
    this.status = status;
    this.campo = campo; // v1.4: campo con error (validación del servidor)
  }
}

async function renovarSesion() {
  const refreshToken = refreshGuardado();
  if (!refreshToken) return false;
  if (!renovando) {
    renovando = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (r) => {
        if (!r.ok) return false;
        guardarSesion(await r.json());
        return true;
      })
      .catch(() => false)
      .finally(() => { renovando = null; });
  }
  return renovando;
}

async function llamar(ruta, { method = 'GET', body, form, raw = false } = {}, reintento = true) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let cuerpo;
  if (form) cuerpo = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    cuerpo = JSON.stringify(body);
  }

  let r;
  try {
    r = await fetch(`${BASE}${ruta}`, { method, headers, body: cuerpo });
  } catch {
    throw new ApiError(0, 'Sin conexión. Revisa tu internet e intenta de nuevo.');
  }

  if (r.status === 401 && reintento && !ruta.startsWith('/auth/')) {
    if (await renovarSesion()) return llamar(ruta, { method, body, form, raw }, false);
    borrarSesion();
    alCerrarSesion();
  }
  if (raw && r.ok) return r;
  if (r.status === 204) return null;
  const esJson = (r.headers.get('content-type') || '').includes('application/json');
  const datos = esJson ? await r.json().catch(() => null) : null;
  if (!r.ok) throw new ApiError(r.status, datos?.error?.message || 'Ocurrió un error, intenta de nuevo', datos?.error?.campo);
  // Si el servidor respondió algo que no es la API (por ejemplo una página HTML), no se procesa.
  if (!esJson || datos === null) throw new ApiError(r.status, 'No se pudo conectar con el servidor de OficioYa. Intenta de nuevo en un minuto.');
  return datos;
}

export const api = {
  get: (ruta) => llamar(ruta),
  post: (ruta, body) => llamar(ruta, { method: 'POST', body }),
  patch: (ruta, body) => llamar(ruta, { method: 'PATCH', body }),
  put: (ruta, body) => llamar(ruta, { method: 'PUT', body }),
  delete: (ruta, body) => llamar(ruta, { method: 'DELETE', body }),
  postForm: (ruta, form) => llamar(ruta, { method: 'POST', form }),
  putForm: (ruta, form) => llamar(ruta, { method: 'PUT', form }),
  blob: async (ruta) => (await llamar(ruta, { raw: true })).blob(),
  renovarSesion,
};
