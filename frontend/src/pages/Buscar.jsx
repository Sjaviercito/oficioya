import { useState } from 'react';
import { api } from '../api/client';
import { useCatalogo } from '../api/catalogo';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';
import TarjetaTrabajador from '../components/TarjetaTrabajador';

export default function Buscar() {
  const { oficios, zonas } = useCatalogo();
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  async function buscar(e) {
    e.preventDefault();
    const { oficioId, zonaId } = Object.fromEntries(new FormData(e.currentTarget));
    setError('');
    try {
      setResultado(await api.get(`/workers?oficioId=${encodeURIComponent(oficioId)}&zonaId=${encodeURIComponent(zonaId)}`));
    } catch (err) {
      setError(err.message);
      setResultado(null);
    }
  }

  return (
    <>
      <h1>Buscar trabajadores</h1>
      <p className="suave">Solo aparecen trabajadores con identidad verificada, ordenados por su reputación reciente.</p>
      <Aviso tipo="error">{error}</Aviso>
      <form onSubmit={buscar}>
        <Campo etiqueta="Oficio">
          <select name="oficioId" required defaultValue="">
            <option value="" disabled>Elige un oficio</option>
            {oficios.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Zona">
          <select name="zonaId" required defaultValue="">
            <option value="" disabled>Elige una zona</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </Campo>
        <button className="boton ancho">Buscar</button>
      </form>
      {resultado && (
        <>
          <h2>{resultado.length} {resultado.length === 1 ? 'resultado' : 'resultados'}</h2>
          {resultado.length === 0 ? (
            <Aviso tipo="info">No hay trabajadores verificados de este oficio en esta zona. Publica tu solicitud de todos modos: los trabajadores que se verifiquen en tu zona podrán cotizarla.</Aviso>
          ) : (
            <ul className="lista">{resultado.map((t) => <li key={t.id}><TarjetaTrabajador t={t} /></li>)}</ul>
          )}
        </>
      )}
    </>
  );
}
