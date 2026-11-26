import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSesion } from '../api/sesion';

const MENU = {
  cliente: [
    ['/solicitudes', 'Mis solicitudes'],
    ['/solicitudes/nueva', 'Pedir un trabajo'],
    ['/buscar', 'Buscar trabajadores'],
    ['/avisos', 'Avisos'],
    ['/cuenta', 'Mi cuenta'],
  ],
  trabajador: [
    ['/trabajos', 'Trabajos'],
    ['/perfil', 'Mi perfil'],
    ['/avisos', 'Avisos'],
    ['/cuenta', 'Mi cuenta'],
  ],
  admin: [['/verificaciones', 'Verificaciones'], ['/cuenta', 'Mi cuenta']],
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
        {usuario && usuario.rol !== 'admin' && !usuario.telefono && (
          <div className="aviso info" role="status">Agrega tu celular en <Link to="/cuenta">Mi cuenta</Link> para poder coordinar tus trabajos.</div>
        )}
        <Outlet />
      </main>
    </>
  );
}
