import { Link } from 'react-router-dom';
import { urlArchivo } from '../api/client';
import { Icono } from './Iconos';
import { Insignias } from './Precios';

export default function TarjetaTrabajador({ t, extra }) {
  const inicial = t.nombre.trim().charAt(0).toUpperCase();
  return (
    <div className="fila trabajador">
      <div className="avatar" aria-hidden="true">
        {t.fotoUrl ? <img src={urlArchivo(t.fotoUrl)} alt="" /> : inicial}
      </div>
      <div>
        {t.id ? <Link to={`/trabajadores/${t.id}`} className="nombre-trabajador">{t.nombre}</Link> : <span className="nombre-trabajador">{t.nombre}</span>}
        <div className="pequeno suave">
          <span className="sello"><Icono.check />Verificado</span>{' '}
          {t.trabajosCompletados} {t.trabajosCompletados === 1 ? 'trabajo' : 'trabajos'}
        </div>
        <Insignias t={t} compacto />
      </div>
      <div className="puntuacion">
        {t.esNuevo ? (
          <span className="nuevo">Nuevo</span>
        ) : (
          <>
            <strong>{t.puntuacionRanking.toFixed(2)}</strong>
            <span>de 5</span>
          </>
        )}
      </div>
      {extra && <div style={{ gridColumn: '1 / -1' }}>{extra}</div>}
    </div>
  );
}
