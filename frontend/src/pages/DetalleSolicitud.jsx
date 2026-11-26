import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, urlArchivo } from '../api/client';
import { ESTADOS, MOTIVOS_CANCELACION, MOTIVO_SIN_ACUERDO, fecha, pesos } from '../api/catalogo';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';
import Pasos from '../components/Pasos';
import TarjetaTrabajador from '../components/TarjetaTrabajador';
import { Ajustes, DesgloseCotizacion, FormularioCotizacion, Preguntas, Vigencia } from '../components/Precios';

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
      return true;
    } catch (e) {
      setError(e.message);
      return false;
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
          <div className="dato"><dt>Trabajador</dt><dd>{s.trabajadorAceptado.nombre} · {s.trabajadorAceptado.tipo === 'diagnostico' ? 'visita de diagnóstico' : `${s.trabajadorAceptado.tiempoEstimadoHoras} h estimadas`}</dd></div>
        )}
        {s.montoFinal !== null && (
          <div className="dato"><dt>Monto</dt><dd><strong>{pesos(s.montoFinal)}</strong>{s.montoFinal !== s.trabajadorAceptado.monto && <span className="suave"> ({s.trabajadorAceptado.tipo === 'diagnostico' ? 'visita' : 'cotizado'}: {pesos(s.trabajadorAceptado.monto)})</span>}</dd></div>
        )}
      </dl>
      <p>{s.descripcion}</p>
      {s.fotos.length > 0 && (
        <div className="fotos">{s.fotos.map((f) => <img key={f} src={urlArchivo(f)} alt="Foto del trabajo" loading="lazy" />)}</div>
      )}

      <Coordinacion s={s} rel={rel} esCliente={esCliente} ocupado={ocupado} accion={accion} id={id} />

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
                        <DesgloseCotizacion c={c} />
                        <div className="pequeno suave">{c.tipo === 'cerrado' ? `${c.tiempoEstimadoHoras} h estimadas · ` : ''}<Vigencia c={c} /></div>
                        <div>
                          <button className="boton accion" style={{ marginTop: '0.5rem' }} disabled={ocupado || c.vencida}
                            onClick={() => accion(() => api.post(`/requests/${id}/accept`, { cotizacionId: c.id }), 'Cotización aceptada. El trabajador ya puede ver tu dirección.')}>
                            {c.vencida ? 'Cotización vencida' : c.tipo === 'diagnostico' ? 'Aceptar la visita' : 'Aceptar esta cotización'}
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

      <Ajustes s={s} rel={rel} ocupado={ocupado} accion={accion} id={id} />

      {esCliente && s.estado === 'en_curso' && !s.terminadaPorTrabajadorEn && !s.ajustes.some((x) => x.estado === 'pendiente') && (
        <div className="acciones">
          <button className="boton accion ancho" disabled={ocupado}
            onClick={() => accion(() => api.post(`/requests/${id}/complete`), 'Listo, el trabajo quedó como terminado.')}>
            Confirmar que el trabajo terminó
          </button>
        </div>
      )}

      {esCliente && s.estado === 'completada' && !s.resena && s.diasRestantesParaResena > 0 && (
        <FormularioResena dias={s.diasRestantesParaResena} monto={s.montoFinal} ocupado={ocupado}
          onEnviar={(datos) => accion(() => api.post(`/requests/${id}/review`, datos), 'Gracias, tu calificación ya cuenta para su reputación.')} />
      )}
      {s.resena && (
        <section>
          <h2>Tu calificación</h2>
          <p><strong>{'★'.repeat(s.resena.estrellas)}{'☆'.repeat(5 - s.resena.estrellas)}</strong> {s.resena.comentario}</p>
          {s.resena.respuesta && <Aviso tipo="info">Respuesta del trabajador: {s.resena.respuesta}</Aviso>}
          {rel === 'trabajadorAceptado' && !s.resena.respuesta && (
            <form onSubmit={(e) => { e.preventDefault(); const respuesta = new FormData(e.currentTarget).get('respuesta').trim(); accion(() => api.post(`/requests/${id}/review/response`, { respuesta }), 'Respuesta publicada.'); }}>
              <Campo etiqueta="Responder a la reseña" ayuda="Solo puedes responder una vez."><textarea name="respuesta" required minLength={5} maxLength={500} /></Campo>
              <button className="boton" disabled={ocupado}>Publicar respuesta</button>
            </form>
          )}
        </section>
      )}
      {(esCliente || rel === 'trabajadorAceptado') && s.trabajadorAceptado && (
        <details style={{ marginTop: '1.5rem' }}>
          <summary className="suave">{esCliente ? 'Reportar al trabajador' : 'Reportar al cliente'}</summary>
          <form onSubmit={(e) => { e.preventDefault(); const motivo = new FormData(e.currentTarget).get('motivo').trim(); accion(() => api.post(`/requests/${id}/report`, { motivo }), 'Reporte enviado. El equipo de OficioYa lo revisará.'); }}>
            <Campo etiqueta="¿Qué pasó?" ayuda="Mínimo 10 caracteres."><textarea name="motivo" required minLength={10} maxLength={500} /></Campo>
            <button className="boton peligro" disabled={ocupado}>Enviar reporte</button>
          </form>
        </details>
      )}

      <Preguntas s={s} rel={rel} ocupado={ocupado} accion={accion} id={id} />

      {/* Trabajador: cotizar o iniciar */}
      {rel === 'trabajadorElegible' && (
        <FormularioCotizacion ocupado={ocupado}
          onEnviar={(datos) => accion(() => api.post(`/requests/${id}/quotes`, datos), 'Cotización enviada. El cliente la verá en su solicitud.')} />
      )}
      {s.miCotizacion && rel !== 'trabajadorAceptado' && (
        <Aviso tipo="info">
          Tu cotización: {s.miCotizacion.tipo === 'diagnostico' ? `visita de diagnóstico de ${pesos(s.miCotizacion.costoVisita)}` : `${pesos(s.miCotizacion.monto)} (${s.miCotizacion.tiempoEstimadoHoras} h)`} —{' '}
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
          conEvidencia={s.ajustes.some((a) => a.estado === 'rechazado' && a.tieneFoto && ['pieza_extra', 'mas_trabajo', 'dano_oculto'].includes(a.tipo))}
          onEnviar={(datos) => accion(() => api.post(`/requests/${id}/cancel`, datos), 'La solicitud quedó cancelada.')} />
      )}
    </>
  );
}

function FormularioResena({ onEnviar, ocupado, dias, monto }) {
  const [estrellas, setEstrellas] = useState(0);
  return (
    <section>
      <h2>Califica el trabajo</h2>
      <p className="suave pequeno">Monto final del trabajo: {pesos(monto)}. Te quedan {dias} {dias === 1 ? 'día' : 'días'} para calificar.</p>
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

function FormularioCancelacion({ onEnviar, ocupado, esTrabajador, conEvidencia }) {
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
      {esTrabajador && (motivo === MOTIVO_SIN_ACUERDO
        ? <Aviso tipo="info">El cliente rechazó un cambio de precio que comprobaste con foto: esta cancelación no baja tu reputación.</Aviso>
        : <Aviso tipo="info">Cancelar un trabajo aceptado baja tu reputación.</Aviso>)}
      <form onSubmit={(e) => {
        e.preventDefault();
        const detalle = new FormData(e.currentTarget).get('detalle')?.trim();
        onEnviar({ motivo, ...(detalle ? { detalle } : {}) });
      }}>
        <Campo etiqueta="Motivo">
          <select required value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="" disabled>Elige un motivo</option>
            {MOTIVOS_CANCELACION.filter((m) => m !== MOTIVO_SIN_ACUERDO || (esTrabajador && conEvidencia)).map((m) => <option key={m}>{m}</option>)}
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

const fechaHora = (iso) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));

// v1.2: contacto directo, horario de visita y "terminado" del trabajador (sin chat en la app).
function Coordinacion({ s, rel, esCliente, ocupado, accion, id }) {
  const esTrabajador = rel === 'trabajadorAceptado';
  if (!esCliente && !esTrabajador) return null;
  const activo = ['aceptada', 'en_curso'].includes(s.estado);
  const c = s.contacto;
  const mensaje = encodeURIComponent(`Hola, soy ${esCliente ? 'el cliente' : 'el trabajador'} de OficioYa: ${s.oficio.nombre} en ${s.colonia}.`);

  return (
    <>
      {activo && c && (
        <section>
          <h2>Contacto</h2>
          {c.telefono ? (
            <>
              <div className="acciones" style={{ marginTop: 0 }}>
                <a className="boton accion" href={`https://wa.me/52${c.telefono}?text=${mensaje}`} target="_blank" rel="noopener noreferrer">WhatsApp con {c.nombre}</a>
                <a className="boton secundario" href={`tel:${c.telefono}`}>Llamar</a>
              </div>
              <p className="suave pequeno" style={{ marginTop: '0.75rem' }}>Usa WhatsApp para coordinarte. Los cambios de precio regístralos aquí (con foto si puedes), para que quede constancia. OficioYa nunca te pedirá por WhatsApp códigos, contraseñas ni pagos.</p>
            </>
          ) : (
            <p className="suave">{c.nombre} todavía no registró su celular.</p>
          )}
        </section>
      )}

      {activo && (
        <section>
          <h2>Visita</h2>
          {s.visita ? (
            <p>{s.visita.confirmada ? 'Confirmada: ' : 'Propuesta: '}<strong>{fechaHora(s.visita.fechaHora)}</strong></p>
          ) : (
            <p className="suave">{esTrabajador ? 'Propón cuándo irás.' : 'El trabajador todavía no propone un horario.'}</p>
          )}
          {esCliente && s.visita && !s.visita.confirmada && (
            <div className="acciones">
              <button className="boton accion" disabled={ocupado} onClick={() => accion(() => api.patch(`/requests/${id}/visit`, { decision: 'aceptar' }), 'Horario confirmado.')}>Confirmar horario</button>
              <button className="boton secundario" disabled={ocupado} onClick={() => accion(() => api.patch(`/requests/${id}/visit`, { decision: 'rechazar' }), 'Le pediste otro horario al trabajador.')}>Pedir otro horario</button>
            </div>
          )}
          {esTrabajador && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const valor = new FormData(e.currentTarget).get('fechaHora');
              accion(() => api.post(`/requests/${id}/visit`, { fechaHora: new Date(valor).toISOString() }), 'Horario enviado al cliente.');
            }}>
              <Campo etiqueta={s.visita ? 'Proponer otro horario' : 'Fecha y hora de la visita'}>
                <input name="fechaHora" type="datetime-local" required />
              </Campo>
              <button className="boton secundario" disabled={ocupado}>Proponer horario</button>
            </form>
          )}
        </section>
      )}

      {s.estado === 'en_curso' && s.disputaMotivo && !s.terminadaPorTrabajadorEn && (
        <Aviso tipo="info">El cliente indicó que falta: {s.disputaMotivo}</Aviso>
      )}
      {esTrabajador && s.estado === 'en_curso' && !s.terminadaPorTrabajadorEn && (
        <div className="acciones">
          <button className="boton ancho" disabled={ocupado} onClick={() => accion(() => api.post(`/requests/${id}/finish`), 'Avisamos al cliente. Tiene 72 horas para confirmar o indicar qué falta.')}>Marcar como terminado</button>
        </div>
      )}
      {esTrabajador && s.estado === 'en_curso' && s.terminadaPorTrabajadorEn && (
        <Aviso tipo="info">Marcaste el trabajo como terminado. Si el cliente no responde en {s.horasParaDisputar} h, se cerrará solo.</Aviso>
      )}
      {esCliente && s.estado === 'en_curso' && s.terminadaPorTrabajadorEn && (
        <section>
          <Aviso tipo="info">El trabajador marcó el trabajo como terminado. Tienes {s.horasParaDisputar} h para confirmarlo o indicar qué falta; si no respondes, se dará por terminado.</Aviso>
          <div className="acciones">
            <button className="boton accion" disabled={ocupado} onClick={() => accion(() => api.post(`/requests/${id}/complete`), 'Listo, el trabajo quedó como terminado.')}>Confirmar que terminó</button>
          </div>
          <form style={{ marginTop: '1rem' }} onSubmit={(e) => {
            e.preventDefault();
            const motivo = new FormData(e.currentTarget).get('motivo').trim();
            accion(() => api.post(`/requests/${id}/dispute`, { motivo }), 'Le avisamos al trabajador qué falta.');
          }}>
            <Campo etiqueta="¿Falta algo?" ayuda="Mínimo 10 caracteres."><textarea name="motivo" required minLength={10} maxLength={300} /></Campo>
            <button className="boton secundario" disabled={ocupado}>No está terminado</button>
          </form>
        </section>
      )}
    </>
  );
}
