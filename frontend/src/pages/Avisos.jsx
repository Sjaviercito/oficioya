import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Aviso from '../components/Aviso';
import useTitulo from '../hooks/useTitulo';

// RF-11: avisos dentro de la app.
export default function Avisos() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  useTitulo('Avisos');
  useEffect(() => {
    api.get('/notifications').then((l) => { setLista(l); api.post('/notifications/read').catch(() => {}); }).catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>Avisos</h1>
      <Aviso tipo="error">{error}</Aviso>
      {lista && lista.length === 0 && <p className="suave">No tienes avisos todavía.</p>}
      <ul className="lista">
        {(lista || []).map((n) => (
          <li key={n.id}>
            <Link to={n.solicitudId ? `/solicitudes/${n.solicitudId}` : '#'} className="fila">
              <div className="fila-titulo"><span>{n.texto}</span>{!n.leida && <span className="estado en_curso">Nuevo</span>}</div>
              <p className="suave pequeno" style={{ margin: '0.25rem 0 0' }}>{new Date(n.creadaEn).toLocaleString('es-MX')}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
