import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useCatalogo } from '../api/catalogo';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';

const ETIQUETA_ESTADO = {
  sin_enviar: 'Sin enviar',
  pendiente: 'En revisión',
  aprobado: 'Verificada',
  rechazado: 'Rechazada',
};

export default function MiPerfil() {
  const { oficios, zonas } = useCatalogo();
  const [perfil, setPerfil] = useState(null);
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api.get('/workers/me/profile').then((r) => setPerfil(r.perfil)).catch((e) => setAviso({ tipo: 'error', texto: e.message }));
  }, []);

  async function guardarPerfil(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = new FormData();
    form.append('oficioIds', JSON.stringify(fd.getAll('oficio').map(Number)));
    form.append('zonaIds', JSON.stringify(fd.getAll('zona').map(Number)));
    form.append('experienciaAnios', fd.get('experienciaAnios'));
    const foto = fd.get('foto');
    if (foto && foto.size > 0) form.append('foto', foto);
    await enviar(() => api.putForm('/workers/me/profile', form), 'Perfil guardado.');
  }

  async function enviarIdentidad(e) {
    e.preventDefault();
    await enviar(() => api.postForm('/workers/me/identity', new FormData(e.currentTarget)), 'Fotos enviadas. Tu identidad está en revisión.');
  }

  async function enviar(fn, exito) {
    setOcupado(true);
    setAviso({ tipo: '', texto: '' });
    try {
      const r = await fn();
      if (r?.perfil) setPerfil(r.perfil);
      else setPerfil((await api.get('/workers/me/profile')).perfil);
      setAviso({ tipo: 'ok', texto: exito });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setOcupado(false);
      window.scrollTo({ top: 0 });
    }
  }

  if (!perfil) return <Aviso tipo={aviso.tipo || 'info'}>{aviso.texto || 'Cargando…'}</Aviso>;

  const misOficios = new Set(perfil.oficios.map((o) => o.id));
  const misZonas = new Set(perfil.zonas.map((z) => z.id));
  const perfilCompleto = perfil.oficios.length > 0 && perfil.zonas.length > 0;

  return (
    <>
      <h1>Mi perfil</h1>
      <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>
      {/* RF-14: panel del trabajador */}
      <dl>
        <div className="dato"><dt>Reputación</dt><dd>{perfil.esNuevo ? 'Nuevo (necesitas 3 trabajos con calificación)' : <><strong>{perfil.puntuacionRanking.toFixed(2)}</strong> de 5</>}</dd></div>
        <div className="dato"><dt>Calificación</dt><dd>{perfil.calificacionPonderada === null ? '—' : `${perfil.calificacionPonderada.toFixed(2)} de 5 (ponderada por antigüedad)`}</dd></div>
        <div className="dato"><dt>Trabajos completados</dt><dd>{perfil.trabajosCompletados}</dd></div>
        <div className="dato"><dt>Tasa de cancelación</dt><dd>{Math.round(perfil.tasaCancelacion * 100)} %</dd></div>
        <div className="dato"><dt>Con ajuste de precio</dt><dd>{perfil.porcentajeConAjuste === null ? '—' : `${perfil.porcentajeConAjuste} %`}</dd></div>
      </dl>

      <form onSubmit={guardarPerfil} key={`${perfil.id}-${oficios.length}-${zonas.length}`}>
        <fieldset>
          <legend>Oficios</legend>
          <div className="opciones">
            {oficios.map((o) => (
              <label key={o.id} className="opcion">
                <input type="checkbox" name="oficio" value={o.id} defaultChecked={misOficios.has(o.id)} /> {o.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Zonas donde trabajas</legend>
          <div className="opciones">
            {zonas.map((z) => (
              <label key={z.id} className="opcion">
                <input type="checkbox" name="zona" value={z.id} defaultChecked={misZonas.has(z.id)} /> {z.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo etiqueta="Años de experiencia">
          <input name="experienciaAnios" type="number" inputMode="numeric" min="0" max="70" required defaultValue={perfil.experienciaAnios} />
        </Campo>
        <Campo etiqueta="Foto de perfil" ayuda="JPG o PNG de máximo 5 MB.">
          <input name="foto" type="file" accept="image/jpeg,image/png" />
        </Campo>
        <button className="boton ancho" disabled={ocupado}>Guardar perfil</button>
      </form>

      <h2>Verificación de identidad</h2>
      <p>Estado: <span className="estado">{ETIQUETA_ESTADO[perfil.estadoVerificacion]}</span></p>
      {perfil.estadoVerificacion === 'rechazado' && <Aviso tipo="error">Motivo: {perfil.motivoRechazo}</Aviso>}
      {['sin_enviar', 'rechazado'].includes(perfil.estadoVerificacion) && (
        perfilCompleto ? (
          <form onSubmit={enviarIdentidad}>
            <p className="suave pequeno">Tus fotos se guardan cifradas y solo las ve el equipo de verificación.</p>
            <Campo etiqueta="Foto de tu INE (frente)" ayuda="JPG o PNG de máximo 5 MB.">
              <input name="ine" type="file" accept="image/jpeg,image/png" capture="environment" required />
            </Campo>
            <Campo etiqueta="Selfie sosteniendo tu INE">
              <input name="selfie" type="file" accept="image/jpeg,image/png" capture="user" required />
            </Campo>
            <button className="boton accion ancho" disabled={ocupado}>Enviar para verificación</button>
          </form>
        ) : (
          <Aviso tipo="info">Primero guarda al menos un oficio y una zona.</Aviso>
        )
      )}
    </>
  );
}
