import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Aviso from '../components/Aviso';
import { FilaSolicitud } from './MisSolicitudes';
import useTitulo from '../hooks/useTitulo';

const MENSAJE_VERIFICACION = {
  sin_enviar: 'Para recibir solicitudes necesitas completar tu perfil y enviar tu INE.',
  pendiente: 'Tu identificación está en revisión. Te activaremos en cuanto se apruebe.',
  rechazado: 'Tu verificación fue rechazada. Revisa el motivo en tu perfil y vuelve a enviar tus fotos.',
};

export default function Trabajos() {
  const [perfil, setPerfil] = useState(null);
  const [disponibles, setDisponibles] = useState([]);
  const [mios, setMios] = useState([]);
  const [error, setError] = useState('');
  useTitulo('Trabajos');

  useEffect(() => {
    (async () => {
      try {
        const { perfil: p } = await api.get('/workers/me/profile');
        setPerfil(p);
        setMios(await api.get('/requests/mine'));
        if (p.estadoVerificacion === 'aprobado') setDisponibles(await api.get('/requests/available'));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const pendientes = disponibles.filter((s) => !s.miCotizacion);
  const activos = mios.filter((s) => s.miRelacion === 'trabajadorAceptado' && ['aceptada', 'en_curso'].includes(s.estado));
  const historial = mios.filter((s) => !activos.includes(s));

  return (
    <>
      <h1>Trabajos</h1>
      <Aviso tipo="error">{error}</Aviso>
      {perfil && perfil.estadoVerificacion !== 'aprobado' && (
        <Aviso tipo="info">
          {MENSAJE_VERIFICACION[perfil.estadoVerificacion]} <Link to="/perfil">Ir a mi perfil</Link>
        </Aviso>
      )}

      {activos.length > 0 && (
        <>
          <h2>En marcha</h2>
          <ul className="lista">{activos.map((s) => <FilaSolicitud key={s.id} s={s} />)}</ul>
        </>
      )}

      {perfil?.estadoVerificacion === 'aprobado' && (
        <>
          <h2>Solicitudes para cotizar</h2>
          {pendientes.length === 0 ? (
            <p className="suave">No hay solicitudes nuevas de tu oficio en tus zonas por ahora.</p>
          ) : (
            <ul className="lista">{pendientes.map((s) => <FilaSolicitud key={s.id} s={s} />)}</ul>
          )}
        </>
      )}

      {historial.length > 0 && (
        <>
          <h2>Mis cotizaciones</h2>
          <ul className="lista">{historial.map((s) => <FilaSolicitud key={s.id} s={s} />)}</ul>
        </>
      )}
    </>
  );
}
