import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';

export default function Verificaciones() {
  const [lista, setLista] = useState(null);
  const [actual, setActual] = useState(null);
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });

  const cargar = useCallback(() => {
    api.get('/admin/verifications?estado=pendiente').then(setLista).catch((e) => setAviso({ tipo: 'error', texto: e.message }));
  }, []);
  useEffect(cargar, [cargar]);

  return (
    <>
      <h1>Verificaciones</h1>
      <Reportes />
      <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>
      {actual ? (
        <Revision
          t={actual}
          onCerrar={(texto) => { setActual(null); if (texto) setAviso({ tipo: 'ok', texto }); cargar(); }}
        />
      ) : (
        <>
          {lista && lista.length === 0 && <p className="suave">No hay verificaciones pendientes.</p>}
          <ul className="lista">
            {(lista || []).map((t) => (
              <li key={t.trabajadorId}>
                <button type="button" className="fila" style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                  onClick={() => { setAviso({ tipo: '', texto: '' }); setActual(t); }}>
                  <div className="fila-titulo"><span>{t.nombre}</span><span className="estado">Pendiente</span></div>
                  <p className="suave pequeno" style={{ margin: '0.25rem 0 0' }}>{t.oficios.join(', ')} · enviada {new Date(t.enviadaEn).toLocaleDateString('es-MX')}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Revision({ t, onCerrar }) {
  const [imagenes, setImagenes] = useState({});
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Las imágenes se piden con el token (no son URLs públicas) y se muestran como blob.
  useEffect(() => {
    const urls = [];
    (async () => {
      try {
        const res = {};
        for (const tipo of ['ine', 'selfie']) {
          const url = URL.createObjectURL(await api.blob(`/admin/verifications/${t.trabajadorId}/files/${tipo}`));
          urls.push(url);
          res[tipo] = url;
        }
        setImagenes(res);
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [t.trabajadorId]);

  async function decidir(decision, motivo) {
    setOcupado(true);
    setError('');
    try {
      await api.patch(`/admin/verifications/${t.trabajadorId}`, { decision, ...(motivo ? { motivo } : {}) });
      onCerrar(decision === 'aprobar' ? `${t.nombre} quedó verificado.` : `Verificación de ${t.nombre} rechazada.`);
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }

  return (
    <section>
      <p><button type="button" className="enlace" onClick={() => onCerrar()}>← Volver a la lista</button></p>
      <h2>{t.nombre}</h2>
      <p className="suave">{t.email} · {t.oficios.join(', ')}</p>
      <Aviso tipo="error">{error}</Aviso>
      <div className="identidad">
        {imagenes.ine && <figure style={{ margin: 0 }}><img src={imagenes.ine} alt="INE del trabajador" /><figcaption className="pequeno suave">INE</figcaption></figure>}
        {imagenes.selfie && <figure style={{ margin: 0 }}><img src={imagenes.selfie} alt="Selfie con INE" /><figcaption className="pequeno suave">Selfie con INE</figcaption></figure>}
      </div>
      <div className="acciones">
        <button className="boton accion" disabled={ocupado} onClick={() => decidir('aprobar')}>Aprobar</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); decidir('rechazar', new FormData(e.currentTarget).get('motivo').trim()); }} style={{ marginTop: '1.5rem' }}>
        <Campo etiqueta="Motivo del rechazo" ayuda="El trabajador lo verá en su perfil.">
          <textarea name="motivo" required maxLength={300} />
        </Campo>
        <button className="boton peligro" disabled={ocupado}>Rechazar</button>
      </form>
    </section>
  );
}

// RF-13: reportes de clientes; el administrador suspende o descarta.
function Reportes() {
  const [lista, setLista] = useState([]);
  const cargar = useCallback(() => { api.get('/admin/reports').then(setLista).catch(() => {}); }, []);
  useEffect(cargar, [cargar]);
  if (!lista.length) return null;
  return (
    <section>
      <h2>Reportes de clientes</h2>
      <ul className="lista">
        {lista.map((r) => (
          <li key={r.id} className="fila">
            <div className="fila-titulo"><span>{r.trabajador.nombre}</span>{r.trabajador.suspendido && <span className="estado cancelada">Suspendido</span>}</div>
            <p className="suave pequeno">{r.motivo}</p>
            <div className="acciones">
              <button className="boton peligro" onClick={() => api.patch(`/admin/reports/${r.id}`, { accion: 'suspender' }).then(cargar)}>Suspender trabajador</button>
              <button className="boton secundario" onClick={() => api.patch(`/admin/reports/${r.id}`, { accion: 'descartar' }).then(cargar)}>Descartar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
