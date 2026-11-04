import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, urlArchivo } from '../api/client';
import { ESTADOS, MOTIVOS_CANCELACION, fecha, pesos } from '../api/catalogo';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';
import Pasos from '../components/Pasos';
import TarjetaTrabajador from '../components/TarjetaTrabajador';

const CANCELABLE = {
  clienteDueno: ['abierta', 'cotizada', 'aceptada', 'en_curso'],
  trabajadorAceptado: ['aceptada', 'en_curso'],
};

export default function DetalleSolicitud() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { solicitud } = await api.get(`/requests/${id}`);
      setS(solicitud);
      if (solicitud.miRelacion === 'clienteDueno') setCotizaciones(await api.get(`/requests/${id}/quotes`));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function accion(fn, exito) {
    setError('');
    setMensaje('');
    setOcupado(true);
    try {
      await fn();
      setMensaje(exito);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!s) return <><Aviso tipo="error">{error}</Aviso>{!error && <p className="suave">Cargando…</p>}</>;

  const rel = s.miRelacion;
  const esCliente = rel === 'clienteDueno';
  const puedeCancelar = (CANCELABLE[rel] || []).includes(s.estado);

  return (
    <>
      <p className="pequeno"><Link to={esCliente ? '/solicitudes' : '/trabajos'}>← Volver</Link></p>
      <h1>{s.oficio.nombre} en {s.zona.nombre}</h1>
      <span className={`estado ${s.estado}`}>{ESTADOS[s.estado]}</span>
      <Pasos estado={s.estado} />
      <Aviso tipo="ok">{mensaje}</Aviso>
      <Aviso tipo="error">{error}</Aviso>

      <dl>
        <div className="dato"><dt>Colonia</dt><dd>{s.colonia}</dd></div>
        {s.direccionExacta && <div className="dato"><dt>Dirección</dt><dd>{s.direccionExacta}</dd></div>}
        <div className="dato"><dt>Para el</dt><dd>{fecha(s.fechaDeseada)}</dd></div>
        {!esCliente && <div className="dato"><dt>Cliente</dt><dd>{s.cliente.nombre}</dd></div>}
        {s.trabajadorAceptado && (
          <div className="dato"><dt>Trabajador</dt><dd>{s.trabajadorAceptado.nombre} · {pesos(s.trabajadorAceptado.monto)}, {s.trabajadorAceptado.tiempoEstimadoHoras} h</dd></div>
        )}
      </dl>
      <p>{s.descripcion}</p>
      {s.fotos.length > 0 && (
        <div className="fotos">{s.fotos.map((f) => <img key={f} src={urlArchivo(f)} alt="Foto del trabajo" loading="lazy" />)}</div>
      )}

      {s.cancelacion && (
        <Aviso tipo="info">
          Cancelada por {s.cancelacion.rolQueCancela === 'cliente' ? 'el cliente' : 'el trabajador'}: {s.cancelacion.motivo}
          {s.cancelacion.detalle ? ` (${s.cancelacion.detalle})` : ''}.
        </Aviso>
      )}

      {/* Cliente: elegir cotización */}
      {esCliente && ['abierta', 'cotizada'].includes(s.estado) && (
        <section>
          <h2>Cotizaciones</h2>
          {cotizaciones.length === 0 ? (
            <p className="suave">Aún no llegan cotizaciones. Los trabajadores verificados de {s.zona.nombre} ya pueden ver tu solicitud.</p>
          ) : (
            <ul className="lista">
              {cotizaciones.map((c) => (
                <li key={c.id}>
                  <TarjetaTrabajador
                    t={c.trabajador}
                    extra={
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong>{pesos(c.monto)}</strong> <span className="suave">· {c.tiempoEstimadoHoras} h estimadas</span>
                        <div>
                          <button className="boton accion" style={{ marginTop: '0.5rem' }} disabled={ocupado}
                            onClick={() => accion(() => api.post(`/requests/${id}/accept`, { cotizacionId: c.id }), 'Cotización aceptada. El trabajador ya puede ver tu dirección.')}>
                            Aceptar esta cotización
                          </button>
                        </div>
                      </div>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {esCliente && s.estado === 'en_curso' && (
        <div className="acciones">
          <button className="boton accion ancho" disabled={ocupado}
            onClick={() => accion(() => api.post(`/requests/${id}/complete`), 'Listo, el trabajo quedó como terminado.')}>
            Confirmar que el trabajo terminó
          </button>
        </div>
      )}

      {esCliente && s.estado === 'completada' && !s.resena && s.diasRestantesParaResena > 0 && (
        <FormularioResena dias={s.diasRestantesParaResena} ocupado={ocupado}
          onEnviar={(datos) => accion(() => api.post(`/requests/${id}/review`, datos), 'Gracias, tu calificación ya cuenta para su reputación.')} />
      )}
      {s.resena && (
        <section>
          <h2>Tu calificación</h2>
          <p><strong>{'★'.repeat(s.resena.estrellas)}{'☆'.repeat(5 - s.resena.estrellas)}</strong> {s.resena.comentario}</p>
        </section>
      )}

      {/* Trabajador: cotizar o iniciar */}
      {rel === 'trabajadorElegible' && (
        <FormularioCotizacion ocupado={ocupado}
          onEnviar={(datos) => accion(() => api.post(`/requests/${id}/quotes`, datos), 'Cotización enviada. El cliente la verá en su solicitud.')} />
      )}
      {s.miCotizacion && rel !== 'trabajadorAceptado' && (
        <Aviso tipo="info">
          Tu cotización: {pesos(s.miCotizacion.monto)} ({s.miCotizacion.tiempoEstimadoHoras} h) —{' '}
          {{ pendiente: 'esperando respuesta del cliente', aceptada: 'aceptada', rechazada: 'no fue elegida' }[s.miCotizacion.estado]}.
        </Aviso>
      )}
      {rel === 'trabajadorAceptado' && s.estado === 'aceptada' && (
        <div className="acciones">
          <button className="boton accion ancho" disabled={ocupado}
            onClick={() => accion(() => api.post(`/requests/${id}/start`), 'Trabajo iniciado.')}>
            Iniciar trabajo
          </button>
        </div>
      )}

      {puedeCancelar && (
        <FormularioCancelacion ocupado={ocupado} esTrabajador={rel === 'trabajadorAceptado'}
          onEnviar={(datos) => accion(() => api.post(`/requests/${id}/cancel`, datos), 'La solicitud quedó cancelada.')} />
      )}
    </>
  );
}

function FormularioCotizacion({ onEnviar, ocupado }) {
  return (
    <section>
      <h2>Enviar cotización</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        onEnviar({ monto: Number(d.monto), tiempoEstimadoHoras: Number(d.tiempoEstimadoHoras) });
      }}>
        <Campo etiqueta="Monto (MXN)">
          <input name="monto" type="number" inputMode="decimal" min="1" step="0.01" required />
        </Campo>
        <Campo etiqueta="Tiempo estimado (horas)">
          <input name="tiempoEstimadoHoras" type="number" inputMode="numeric" min="1" step="1" required />
        </Campo>
        <button className="boton accion ancho" disabled={ocupado}>Enviar cotización</button>
      </form>
    </section>
  );
}

function FormularioResena({ onEnviar, ocupado, dias }) {
  const [estrellas, setEstrellas] = useState(0);
  return (
    <section>
      <h2>Califica el trabajo</h2>
      <p className="suave pequeno">Te quedan {dias} {dias === 1 ? 'día' : 'días'} para calificar.</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        const comentario = new FormData(e.currentTarget).get('comentario').trim();
        onEnviar({ estrellas, ...(comentario ? { comentario } : {}) });
      }}>
        <div className="estrellas" role="radiogroup" aria-label="Estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={estrellas === n} aria-label={`${n} de 5`}
              className={n <= estrellas ? 'activa' : ''} onClick={() => setEstrellas(n)}>★</button>
          ))}
        </div>
        <Campo etiqueta="Comentario (opcional)">
          <textarea name="comentario" maxLength={500} />
        </Campo>
        <button className="boton ancho" disabled={ocupado || estrellas === 0}>Enviar calificación</button>
      </form>
    </section>
  );
}

function FormularioCancelacion({ onEnviar, ocupado, esTrabajador }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  if (!abierto) {
    return (
      <div className="acciones">
        <button className="boton peligro" onClick={() => setAbierto(true)}>Cancelar solicitud</button>
      </div>
    );
  }
  return (
    <section>
      <h2>Cancelar solicitud</h2>
      {esTrabajador && <Aviso tipo="info">Cancelar un trabajo aceptado baja tu reputación.</Aviso>}
      <form onSubmit={(e) => {
        e.preventDefault();
        const detalle = new FormData(e.currentTarget).get('detalle')?.trim();
        onEnviar({ motivo, ...(detalle ? { detalle } : {}) });
      }}>
        <Campo etiqueta="Motivo">
          <select required value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="" disabled>Elige un motivo</option>
            {MOTIVOS_CANCELACION.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Campo>
        {motivo === 'Otro' && (
          <Campo etiqueta="Cuéntanos el motivo" ayuda="Mínimo 10 caracteres.">
            <textarea name="detalle" required minLength={10} maxLength={300} />
          </Campo>
        )}
        <div className="acciones">
          <button className="boton peligro" disabled={ocupado}>Confirmar cancelación</button>
          <button type="button" className="boton secundario" onClick={() => setAbierto(false)}>No cancelar</button>
        </div>
      </form>
    </section>
  );
}
