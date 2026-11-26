// v1.4 (Nielsen #5): las acciones que no se pueden deshacer piden confirmación con un resumen de lo
// que va a pasar. Usa <dialog> nativo: atrapa el foco, cierra con Esc y lo anuncia como diálogo.
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext(async () => true);
export const useConfirmar = () => useContext(Ctx);

export function ConfirmarProvider({ children }) {
  const dialogo = useRef(null);
  const resolver = useRef(null);
  const [datos, setDatos] = useState(null);

  const confirmar = useCallback((d) => new Promise((r) => {
    resolver.current = r;
    setDatos(d);
    requestAnimationFrame(() => dialogo.current?.showModal());
  }), []);

  function cerrar(valor) {
    dialogo.current?.close();
    resolver.current?.(valor);
    resolver.current = null;
  }

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      <dialog ref={dialogo} className="dialogo" aria-labelledby="dialogo-titulo" aria-describedby="dialogo-texto"
        onCancel={(e) => { e.preventDefault(); cerrar(false); }}>
        {datos && (
          <>
            <h2 id="dialogo-titulo">{datos.titulo}</h2>
            <div id="dialogo-texto">{Array.isArray(datos.texto) ? datos.texto.map((t) => <p key={t}>{t}</p>) : <p>{datos.texto}</p>}</div>
            <div className="dialogo-acciones">
              <button type="button" className="boton secundario" onClick={() => cerrar(false)} autoFocus>{datos.cancelar || 'Volver'}</button>
              <button type="button" className={`boton ${datos.peligro ? 'peligro-lleno' : 'accion'}`} onClick={() => cerrar(true)}>{datos.aceptar}</button>
            </div>
          </>
        )}
      </dialog>
    </Ctx.Provider>
  );
}
