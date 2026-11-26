import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useSesion } from '../api/sesion';
import { ConfirmarProvider } from './Confirmar';
import { Icono } from './Iconos';
import { NotificadorProvider } from './Notificador';

// v1.4: navegación inferior en el celular (estándar móvil, todo visible sin desplazar) y superior en
// pantallas grandes. "Pedir" es la acción principal del cliente.
const MENU = {
  cliente: [
    ['/solicitudes', 'Solicitudes', 'lista'],
    ['/buscar', 'Buscar', 'buscar'],
    ['/solicitudes/nueva', 'Pedir', 'mas', true],
    ['/avisos', 'Avisos', 'campana'],
    ['/cuenta', 'Cuenta', 'persona'],
  ],
  trabajador: [
    ['/trabajos', 'Trabajos', 'herramienta'],
    ['/perfil', 'Mi perfil', 'insignia'],
    ['/avisos', 'Avisos', 'campana'],
    ['/cuenta', 'Cuenta', 'persona'],
  ],
  admin: [['/verificaciones', 'Verificaciones', 'escudo'], ['/cuenta', 'Cuenta', 'persona']],
};

function useNoLeidos(activo) {
  const { pathname } = useLocation();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    const pedir = () => api.get('/notifications/unread-count').then((r) => vivo && setN(r.noLeidos)).catch(() => {});
    pedir();
    const t = setInterval(pedir, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [activo, pathname]);
  return n;
}

export default function Layout() {
  const { usuario, salir } = useSesion();
  const { pathname } = useLocation();
  const main = useRef(null);
  const primeraVez = useRef(true);
  const noLeidos = useNoLeidos(Boolean(usuario));

  // WCAG 2.4.3: al cambiar de pantalla, el foco va al título nuevo (como en una carga normal).
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return undefined; }
    window.scrollTo(0, 0);
    const t = setTimeout(() => {
      const h1 = main.current?.querySelector('h1');
      const destino = h1 || main.current;
      if (destino) { destino.setAttribute('tabindex', '-1'); destino.focus({ preventScroll: true }); }
    }, 60);
    return () => clearTimeout(t);
  }, [pathname]);

  const items = usuario ? MENU[usuario.rol] : [];

  return (
    <NotificadorProvider>
      <ConfirmarProvider>
        <a href="#contenido" className="saltar">Saltar al contenido</a>
        <header className="barra">
          <div className="barra-interior">
            <Link to="/" className="marca" aria-label="OficioYa, inicio">Oficio<span>Ya</span></Link>
            {usuario && (
              <nav className="nav-superior" aria-label="Principal">
                {items.map(([ruta, texto, , destacado]) => (
                  <NavLink key={ruta} to={ruta} end className={destacado ? 'destacado' : undefined}>
                    {texto}{ruta === '/avisos' && noLeidos > 0 && <span className="globo" aria-label={`${noLeidos} sin leer`}>{noLeidos}</span>}
                  </NavLink>
                ))}
              </nav>
            )}
            {usuario ? (
              <button type="button" className="barra-salir" onClick={salir}><Icono.salir /><span>Salir</span></button>
            ) : (
              pathname !== '/entrar' && <Link to="/entrar" className="barra-entrar">Entrar</Link>
            )}
          </div>
          <div className="talavera" aria-hidden="true" />
        </header>
        <main id="contenido" ref={main} className={usuario ? 'con-menu' : undefined}>
          {usuario && usuario.rol !== 'admin' && !usuario.telefono && (
            <div className="aviso info" role="status">Agrega tu celular en <Link to="/cuenta">Cuenta</Link> para poder coordinar tus trabajos.</div>
          )}
          <Outlet />
        </main>
        {usuario && (
          <nav className="nav-inferior" aria-label="Principal (móvil)" style={{ '--columnas': items.length }}>
            {items.map(([ruta, texto, icono, destacado]) => {
              const Ic = Icono[icono];
              return (
                <NavLink key={ruta} to={ruta} end className={destacado ? 'destacado' : undefined}>
                  <span className="nav-icono"><Ic />{ruta === '/avisos' && noLeidos > 0 && <span className="globo" aria-hidden="true">{noLeidos > 9 ? '9+' : noLeidos}</span>}</span>
                  <span>{texto}{ruta === '/avisos' && noLeidos > 0 && <span className="solo-lector">, {noLeidos} sin leer</span>}</span>
                </NavLink>
              );
            })}
          </nav>
        )}
      </ConfirmarProvider>
    </NotificadorProvider>
  );
}
