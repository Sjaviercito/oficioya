import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, borrarSesion, configurarSesion, guardarSesion, refreshGuardado } from './client';

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const salir = useCallback(async () => {
    const refreshToken = refreshGuardado();
    if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
    borrarSesion();
    setUsuario(null);
  }, []);

  useEffect(() => {
    configurarSesion({ onLogout: () => setUsuario(null) });
    (async () => {
      if (refreshGuardado() && (await api.renovarSesion())) {
        try {
          const { usuario: u } = await api.get('/auth/me');
          setUsuario(u);
        } catch { /* sesión inválida */ }
      }
      setCargando(false);
    })();
  }, []);

  const entrar = useCallback(async (ruta, datos) => {
    const r = await api.post(ruta, datos);
    guardarSesion(r);
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const actualizarUsuario = useCallback((u) => setUsuario(u), []);
  const valor = useMemo(() => ({ usuario, cargando, entrar, salir, actualizarUsuario }), [usuario, cargando, entrar, salir, actualizarUsuario]);
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export const useSesion = () => useContext(SesionContext);
