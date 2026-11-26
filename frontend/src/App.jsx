import { Navigate, Route, Routes } from 'react-router-dom';
import { useSesion } from './api/sesion';
import Layout from './components/Layout';
import Requiere from './components/Requiere';
import Portada from './pages/Portada';
import Entrar from './pages/Entrar';
import Registro from './pages/Registro';
import MisSolicitudes from './pages/MisSolicitudes';
import NuevaSolicitud from './pages/NuevaSolicitud';
import Buscar from './pages/Buscar';
import DetalleSolicitud from './pages/DetalleSolicitud';
import Trabajos from './pages/Trabajos';
import MiPerfil from './pages/MiPerfil';
import Verificaciones from './pages/Verificaciones';
import Avisos from './pages/Avisos';

const INICIO = { cliente: '/solicitudes', trabajador: '/trabajos', admin: '/verificaciones' };

function Inicio() {
  const { usuario } = useSesion();
  return usuario ? <Navigate to={INICIO[usuario.rol]} replace /> : <Portada />;
}

export default function App() {
  const { cargando } = useSesion();
  if (cargando) return <p className="suave" style={{ padding: '2rem 1rem' }}>Cargando…</p>;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="registro" element={<Registro />} />

        <Route element={<Requiere roles={['cliente']} />}>
          <Route path="solicitudes" element={<MisSolicitudes />} />
          <Route path="solicitudes/nueva" element={<NuevaSolicitud />} />
          <Route path="buscar" element={<Buscar />} />
        </Route>

        <Route element={<Requiere roles={['trabajador']} />}>
          <Route path="trabajos" element={<Trabajos />} />
          <Route path="perfil" element={<MiPerfil />} />
        </Route>

        <Route element={<Requiere roles={['cliente', 'trabajador']} />}>
          <Route path="solicitudes/:id" element={<DetalleSolicitud />} />
          <Route path="avisos" element={<Avisos />} />
        </Route>

        <Route element={<Requiere roles={['admin']} />}>
          <Route path="verificaciones" element={<Verificaciones />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
