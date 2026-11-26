import { Link } from 'react-router-dom';
import { urlArchivo } from '../api/client';
import { Insignias } from './Precios';

export default function TarjetaTrabajador({ t, extra }) {
  const inicial = t.nombre.trim().charAt(0).toUpperCase();
  return (
    <div className="fila trabajador">
      <div className="avatar" aria-hidden="true">
        {t.fotoUrl ? <img src={urlArchivo(t.fotoUrl)} alt="" /> : inicial}
      </div>
      <div>
        <div style={{ fontWeight: 650 }}>{t.id ? <Link to={`/trabajadores/${t.id}`}>{t.nombre}</Link> : t.nombre}</div>
        <div className="pequeno suave">
          <span className="sello">✓ Verificado</span>{' '}
          {t.trabajosCompletados} {t.trabajosCompletados === 1 ? 'trabajo' : 'trabajos'}
        </div>
        {t.porcentajeConAjuste !== null && t.porcentajeConAjuste !== undefined && (
          <div className="pequeno suave">{t.porcentajeConAjuste} % de sus trabajos tuvieron ajuste de precio</div>
        )}
        <Insignias t={t} compacto />
        {extra}
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
    </div>
  );
}
