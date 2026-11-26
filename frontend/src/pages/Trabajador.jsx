import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, urlArchivo } from '../api/client';
import Aviso from '../components/Aviso';

// v1.1-3: perfil público del trabajador.
export default function Trabajador() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [t, setT] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/workers/${id}/public`).then(setT).catch((e) => setError(e.message)); }, [id]);

  if (!t) return <Aviso tipo={error ? 'error' : 'info'}>{error || 'Cargando…'}</Aviso>;
  return (
    <>
      <p className="pequeno"><button type="button" className="enlace" onClick={() => navegar(-1)}>← Volver</button></p>
      <div className="trabajador" style={{ gridTemplateColumns: '72px 1fr auto' }}>
        <div className="avatar" style={{ width: 72, height: 72 }} aria-hidden="true">
          {t.fotoUrl ? <img src={urlArchivo(t.fotoUrl)} alt="" /> : t.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{t.nombre}</h1>
          <span className="sello">✓ Identidad verificada</span>
        </div>
        <div className="puntuacion">
          {t.esNuevo ? <span className="nuevo">Nuevo</span> : <><strong>{t.puntuacionRanking.toFixed(2)}</strong><span>de 5</span></>}
        </div>
      </div>
      <dl style={{ marginTop: '1rem' }}>
        <div className="dato"><dt>Oficios</dt><dd>{t.oficios.join(', ')}</dd></div>
        <div className="dato"><dt>Zonas</dt><dd>{t.zonas.join(', ')}</dd></div>
        <div className="dato"><dt>Experiencia</dt><dd>{t.experienciaAnios} años</dd></div>
        <div className="dato"><dt>Trabajos</dt><dd>{t.trabajosCompletados} completados</dd></div>
        <div className="dato"><dt>Cancelaciones</dt><dd>{Math.round(t.tasaCancelacion * 100)} % de los trabajos aceptados</dd></div>
        <div className="dato"><dt>Ajustes de precio</dt><dd>{t.porcentajeConAjuste === null ? '—' : `${t.porcentajeConAjuste} % de sus trabajos`}</dd></div>
      </dl>
      <h2>Reseñas</h2>
      {t.resenas.length === 0 && <p className="suave">Todavía no tiene reseñas.</p>}
      <ul className="lista">
        {t.resenas.map((r, i) => (
          <li key={i} className="fila">
            <div className="fila-titulo"><span>{'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}</span><span className="pequeno suave">{new Date(r.creadaEn).toLocaleDateString('es-MX')}</span></div>
            {r.comentario && <p style={{ margin: '0.4rem 0 0' }}>{r.comentario}</p>}
            {r.respuesta && <p className="pequeno suave" style={{ margin: '0.4rem 0 0' }}>Respuesta del trabajador: {r.respuesta}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
