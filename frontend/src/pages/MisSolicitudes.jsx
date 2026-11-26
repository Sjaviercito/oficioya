import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ESTADOS, fecha } from '../api/catalogo';
import Aviso from '../components/Aviso';
import { Icono } from '../components/Iconos';
import useTitulo from '../hooks/useTitulo';

export function FilaSolicitud({ s }) {
  return (
    <li>
      <Link to={`/solicitudes/${s.id}`} className="fila">
        <div className="fila-titulo">
          <span>{s.oficio.nombre} en {s.zona.nombre}</span>
          <span className={`estado ${s.estado}`}>{ESTADOS[s.estado]}</span>
        </div>
        <p className="suave pequeno" style={{ margin: '0.25rem 0 0' }}>
          {s.colonia} · para el {fecha(s.fechaDeseada)}
          {['abierta', 'cotizada'].includes(s.estado) && ` · ${s.numeroCotizaciones} ${s.numeroCotizaciones === 1 ? 'cotización' : 'cotizaciones'}`}
        </p>
      </Link>
    </li>
  );
}

export default function MisSolicitudes() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  useTitulo('Mis solicitudes');

  useEffect(() => {
    api.get('/requests/mine').then(setLista).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Mis solicitudes</h1>
      <Aviso tipo="error">{error}</Aviso>
      {lista && lista.length === 0 && (
        <Aviso tipo="info">Todavía no has pedido ningún trabajo. Describe lo que necesitas y los trabajadores verificados de tu zona te mandarán cotizaciones.</Aviso>
      )}
      <Link to="/solicitudes/nueva" className="boton accion ancho" style={{ marginBottom: '1.25rem' }}><Icono.mas />Pedir un trabajo</Link>
      {lista && (
        <ul className="lista">
          {lista.map((s) => <FilaSolicitud key={s.id} s={s} />)}
        </ul>
      )}
    </>
  );
}
