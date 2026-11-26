// v1.4 (Nielsen #1, WCAG 4.1.3): el resultado de una acción aparece abajo de la pantalla, siempre
// visible aunque el botón esté al final de una página larga, y se anuncia al lector de pantalla.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icono } from './Iconos';

const Ctx = createContext({ ok: () => {}, error: () => {}, limpiar: () => {} });
export const useNotificar = () => useContext(Ctx);

export function NotificadorProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const temporizador = useRef(null);

  const mostrar = useCallback((tipo, texto) => {
    clearTimeout(temporizador.current);
    setMsg({ tipo, texto, id: Date.now() });
    // Los errores se quedan hasta cerrarlos; los avisos de éxito se van solos.
    if (tipo === 'ok') temporizador.current = setTimeout(() => setMsg(null), 6000);
  }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const valor = useMemo(() => ({ ok: (t) => mostrar('ok', t), error: (t) => mostrar('error', t), limpiar: () => setMsg(null) }), [mostrar]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="notificador" aria-live="polite" role="status">
        {msg && msg.tipo === 'ok' && (
          <div key={msg.id} className="toast ok">
            <Icono.check className="toast-icono" />
            <span>{msg.texto}</span>
            <button type="button" className="toast-cerrar" aria-label="Cerrar mensaje" onClick={() => setMsg(null)}><Icono.cerrar /></button>
          </div>
        )}
      </div>
      <div className="notificador" role="alert">
        {msg && msg.tipo === 'error' && (
          <div key={msg.id} className="toast error">
            <Icono.alerta className="toast-icono" />
            <span>{msg.texto}</span>
            <button type="button" className="toast-cerrar" aria-label="Cerrar mensaje" onClick={() => setMsg(null)}><Icono.cerrar /></button>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
