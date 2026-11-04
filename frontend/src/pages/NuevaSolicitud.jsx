import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { hoyLocal, useCatalogo } from '../api/catalogo';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';

// RF-05 en una sola pantalla (RNF-06: máximo 5 pantallas desde el inicio).
export default function NuevaSolicitud() {
  const { oficios, zonas } = useCatalogo();
  const navegar = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.getAll('fotos').filter((f) => f.size > 0).length > 5) {
      setError('Máximo 5 fotos');
      return;
    }
    if (form.getAll('fotos').every((f) => f.size === 0)) form.delete('fotos');
    setError('');
    setEnviando(true);
    try {
      const { solicitud } = await api.postForm('/requests', form);
      navegar(`/solicitudes/${solicitud.id}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Pedir un trabajo</h1>
      <p className="suave">Tu dirección exacta solo la verá el trabajador cuya cotización aceptes.</p>
      <Aviso tipo="error">{error}</Aviso>
      <form onSubmit={enviar}>
        <Campo etiqueta="¿Qué oficio necesitas?">
          <select name="oficioId" required defaultValue="">
            <option value="" disabled>Elige un oficio</option>
            {oficios.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Zona">
          <select name="zonaId" required defaultValue="">
            <option value="" disabled>Elige tu zona</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Colonia">
          <input name="colonia" required maxLength={120} />
        </Campo>
        <Campo etiqueta="Dirección exacta" ayuda="Calle, número e interior.">
          <input name="direccionExacta" required minLength={5} maxLength={250} autoComplete="street-address" />
        </Campo>
        <Campo etiqueta="Describe el trabajo" ayuda="Mínimo 20 caracteres. Entre más detalle, mejores cotizaciones.">
          <textarea name="descripcion" required minLength={20} maxLength={1000} />
        </Campo>
        <Campo etiqueta="¿Para cuándo?">
          <input name="fechaDeseada" type="date" required min={hoyLocal()} defaultValue={hoyLocal()} />
        </Campo>
        <Campo etiqueta="Fotos (opcional)" ayuda="Hasta 5 fotos JPG o PNG de máximo 5 MB cada una.">
          <input name="fotos" type="file" accept="image/jpeg,image/png" multiple />
        </Campo>
        <button className="boton accion ancho" disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar solicitud'}</button>
      </form>
    </>
  );
}
