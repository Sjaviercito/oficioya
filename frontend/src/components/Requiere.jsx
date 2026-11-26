import { Navigate, Outlet } from 'react-router-dom';
import { useSesion } from '../api/sesion';

// Protege rutas por rol. La API vuelve a validar el rol: esto solo es navegación.
export default function Requiere({ roles }) {
  const { usuario } = useSesion();
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (!usuario.privacidadAceptada) return <Navigate to="/aceptar-privacidad" replace />;
  if (!roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return <Outlet />;
}
