import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSesion } from '../api/sesion';

const MENU = {
  cliente: [
    ['/solicitudes', 'Mis solicitudes'],
    ['/solicitudes/nueva', 'Pedir un trabajo'],
    ['/buscar', 'Buscar trabajadores'],
    ['/avisos', 'Avisos'],
  ],
  trabajador: [
    ['/trabajos', 'Trabajos'],
    ['/perfil', 'Mi perfil'],
    ['/avisos', 'Avisos'],
  ],
  admin: [['/verificaciones', 'Verificaciones']],
};

export default function Layout() {
  const { usuario, salir } = useSesion();
  return (
    <>
      <header className="barra">
        <div className="barra-interior">
          <Link to="/" className="marca">Oficio<span>Ya</span></Link>
          {usuario ? (
            <button type="button" className="enlace" onClick={salir}>Cerrar sesión</button>
          ) : (
            <Link to="/entrar" style={{ color: '#fff' }}>Entrar</Link>
          )}
        </div>
        {usuario && (
          <nav className="navegacion" aria-label="Principal">
            {MENU[usuario.rol].map(([ruta, texto]) => (
              <NavLink key={ruta} to={ruta} end>{texto}</NavLink>
            ))}
          </nav>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
