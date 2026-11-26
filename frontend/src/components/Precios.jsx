// v1.3 (contrato 3.8): cotización desglosada o visita de diagnóstico, cambios de precio por tipo,
// foto y ticket como evidencia, insignias y preguntas antes de cotizar.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { pesos } from '../api/catalogo';
import Campo from './Campo';

const num = (v) => (v === '' || v === undefined || v === null ? 0 : Number(v));
const redondear = (x) => Math.round(x * 100) / 100;

// ---------- Insignias y "termina X % arriba" ----------
export function Insignias({ t, compacto = false }) {
  const lista = t.insignias || [];
  const pct = t.sobreCotizadoPromedio;
  if (!lista.length && (pct === null || pct === undefined)) return null;
  return (
    <div className="insignias">
      {lista.map((i) => <span key={i.clave} className="insignia">★ {i.nombre}</span>)}
      {pct !== null && pct !== undefined && (
        <span className="pequeno suave">{pct <= 0 ? 'Termina en lo cotizado o menos' : `Termina ${pct} % arriba de lo cotizado`}{compacto ? '' : ' (promedio)'}</span>
      )}
    </div>
  );
}

// ---------- Desglose de una cotización ----------
export function DesgloseCotizacion({ c }) {
  if (c.tipo === 'diagnostico') {
    return (
      <div className="desglose">
        <div><strong>Visita de diagnóstico: {pesos(c.costoVisita)}</strong></div>
        <div className="pequeno suave">
          {c.visitaAbonable ? 'Si haces el trabajo con él, la visita se descuenta del total.' : 'La visita se cobra aparte del trabajo.'}
          {' '}Después de revisar te manda un presupuesto que tú apruebas.
        </div>
      </div>
    );
  }
  return (
    <div className="desglose">
      <div><strong>{pesos(c.monto)}</strong> <span className="pequeno suave">precio cerrado</span></div>
      <div className="pequeno suave">Mano de obra {pesos(c.manoObra)}{c.material > 0 ? ` · Material ${pesos(c.material)}` : ' · sin material'}</div>
    </div>
  );
}

export function Vigencia({ c }) {
  if (!c.venceEn) return null;
  const f = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }).format(new Date(c.venceEn));
  return c.vencida
    ? <span className="pequeno" style={{ color: 'var(--peligro, #b42318)' }}>Venció el {f}</span>
    : <span className="pequeno suave">Válida hasta el {f}</span>;
}

// ---------- Formulario de cotización ----------
export function FormularioCotizacion({ onEnviar, ocupado }) {
  const [tipo, setTipo] = useState('cerrado');
  const [manoObra, setManoObra] = useState('');
  const [material, setMaterial] = useState('');
  const total = redondear(num(manoObra) + num(material));

  return (
    <section>
      <h2>Enviar cotización</h2>
      <div className="selector" role="radiogroup" aria-label="Tipo de cotización">
        <button type="button" role="radio" aria-checked={tipo === 'cerrado'} className={tipo === 'cerrado' ? 'activo' : ''} onClick={() => setTipo('cerrado')}>
          Precio cerrado<span>Ya sé cuánto cuesta</span>
        </button>
        <button type="button" role="radio" aria-checked={tipo === 'diagnostico'} className={tipo === 'diagnostico' ? 'activo' : ''} onClick={() => setTipo('diagnostico')}>
          Visita de diagnóstico<span>Necesito revisar primero</span>
        </button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        if (tipo === 'cerrado') {
          onEnviar({ tipo, manoObra: num(d.manoObra), material: num(d.material), tiempoEstimadoHoras: num(d.tiempoEstimadoHoras), vigenciaDias: num(d.vigenciaDias) });
        } else {
          onEnviar({ tipo, costoVisita: num(d.costoVisita), visitaAbonable: d.visitaAbonable === 'on', tiempoEstimadoHoras: num(d.tiempoEstimadoHoras) || 1, vigenciaDias: num(d.vigenciaDias) });
        }
      }}>
        {tipo === 'cerrado' ? (
          <>
            <Campo etiqueta="Mano de obra (MXN)">
              <input name="manoObra" type="number" inputMode="decimal" min="1" step="0.01" required value={manoObra} onChange={(e) => setManoObra(e.target.value)} />
            </Campo>
            <Campo etiqueta="Material (MXN)" ayuda="Lo que vas a comprar. Pon 0 si el cliente lo pone o no se necesita.">
              <input name="material" type="number" inputMode="decimal" min="0" step="0.01" value={material} onChange={(e) => setMaterial(e.target.value)} />
            </Campo>
            <p className="total">Total para el cliente: <strong>{pesos(total)}</strong></p>
            <p className="suave pequeno">Si al trabajar aparece algo que no se veía, podrás proponer un cambio con foto. La mano de obra solo puede subir hasta cierto tope; el material se comprueba con ticket.</p>
          </>
        ) : (
          <>
            <Campo etiqueta="Costo de la visita (MXN)" ayuda="Lo que cobras por ir a revisar.">
              <input name="costoVisita" type="number" inputMode="decimal" min="1" step="0.01" required />
            </Campo>
            <label className="casilla">
              <input name="visitaAbonable" type="checkbox" defaultChecked />
              <span>Si el cliente acepta mi presupuesto, la visita se descuenta del total</span>
            </label>
            <p className="suave pequeno">Después de revisar envías el presupuesto desde aquí y el cliente lo aprueba antes de que empieces.</p>
          </>
        )}
        <Campo etiqueta="Tiempo estimado (horas)">
          <input name="tiempoEstimadoHoras" type="number" inputMode="numeric" min="1" step="1" required={tipo === 'cerrado'} defaultValue={tipo === 'diagnostico' ? 1 : undefined} />
        </Campo>
        <Campo etiqueta="Respeto este precio por" ayuda="Después de esta fecha el cliente ya no puede aceptarla.">
          <select name="vigenciaDias" defaultValue="7">
            <option value="1">1 día</option>
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="15">15 días</option>
            <option value="30">30 días</option>
          </select>
        </Campo>
        <button className="boton accion ancho" disabled={ocupado}>Enviar cotización</button>
      </form>
    </section>
  );
}

// ---------- Foto protegida (requiere sesión) ----------
function FotoProtegida({ ruta, alt }) {
  const [url, setUrl] = useState(null);
  const [abierta, setAbierta] = useState(false);
  useEffect(() => {
    if (!abierta) return undefined;
    let creada;
    api.blob(ruta).then((b) => { creada = URL.createObjectURL(b); setUrl(creada); }).catch(() => setUrl(''));
    return () => { if (creada) URL.revokeObjectURL(creada); };
  }, [ruta, abierta]);
  if (!abierta) return <button type="button" className="enlace" onClick={() => setAbierta(true)}>Ver {alt.toLowerCase()}</button>;
  if (url === null) return <p className="suave pequeno">Cargando…</p>;
  if (url === '') return <p className="suave pequeno">No se pudo cargar.</p>;
  return <img className="evidencia" src={url} alt={alt} />;
}

// ---------- Cambios de precio ----------
const TIPOS = [
  { tipo: 'pieza_extra', titulo: 'Pieza extra', ayuda: 'Hace falta material que no estaba en la cotización.', campos: ['material', 'manoObra'] },
  { tipo: 'mas_trabajo', titulo: 'Más trabajo del esperado', ayuda: 'El trabajo es más grande de lo que se veía.', campos: ['manoObra', 'material'] },
  { tipo: 'dano_oculto', titulo: 'Daño oculto', ayuda: 'Al abrir encontraste algo que no se veía.', campos: ['manoObra', 'material'] },
  { tipo: 'cliente_pidio_mas', titulo: 'El cliente pidió algo más', ayuda: 'Trabajo nuevo que te pidió. No cuenta en tu historial.', campos: ['manoObra', 'material'] },
  { tipo: 'mas_facil', titulo: 'Resultó más fácil', ayuda: 'Bajas el precio. Se aplica de inmediato.', campos: ['manoObra', 'material'] },
];
const ESTADO_AJUSTE = { pendiente: 'Esperando al cliente', aceptado: 'Aceptado', rechazado: 'Rechazado' };
const CLASE_AJUSTE = { pendiente: 'en_curso', aceptado: 'completada', rechazado: 'cancelada' };
const CONTAR_TOPE = ['pieza_extra', 'mas_trabajo', 'dano_oculto', 'mas_facil'];

function signo(n) { return n > 0 ? `+${pesos(n)}` : n < 0 ? `−${pesos(-n)}` : pesos(0); }

export function Ajustes({ s, rel, ocupado, accion, id }) {
  const [tipo, setTipo] = useState(null);
  const cot = s.trabajadorAceptado;
  if (!cot) return null;
  const esTrabajador = rel === 'trabajadorAceptado';
  const esCliente = rel === 'clienteDueno';
  const esDiag = cot.tipo === 'diagnostico';
  const pendiente = s.ajustes.find((a) => a.estado === 'pendiente');
  const presupuesto = s.ajustes.find((a) => a.tipo === 'presupuesto' && a.estado === 'aceptado');
  const activo = ['aceptada', 'en_curso'].includes(s.estado) && !s.terminadaPorTrabajadorEn;
  const puedePresupuesto = esTrabajador && esDiag && !presupuesto && activo && !pendiente;
  const puedeCambio = esTrabajador && s.estado === 'en_curso' && !s.terminadaPorTrabajadorEn && !pendiente && (!esDiag || presupuesto);

  // Tope solo sobre la mano de obra (contrato 3.8).
  const porcentaje = s.oficio.topeAjuste ?? 0.5;
  const baseMO = esDiag ? (presupuesto ? presupuesto.deltaManoObra : 0) : cot.manoObra;
  const usadoMO = s.ajustes.filter((a) => a.estado === 'aceptado' && CONTAR_TOPE.includes(a.tipo)).reduce((t, a) => t + a.deltaManoObra, 0);
  const disponibleMO = Math.max(0, redondear(baseMO * porcentaje - usadoMO));

  if (!s.ajustes.length && !puedePresupuesto && !puedeCambio) return null;

  const enviar = (form, exito) => accion(() => api.postForm(`/requests/${id}/adjustments`, form), exito);

  return (
    <section>
      <h2>{esDiag && !presupuesto ? 'Presupuesto' : 'Cambios de precio'}</h2>
      {esDiag && !presupuesto && esCliente && !pendiente && (
        <p className="suave">Cuando el trabajador revise, aquí te llegará su presupuesto para que lo apruebes. {cot.visitaAbonable ? `Los ${pesos(cot.costoVisita)} de la visita se descuentan del total.` : `La visita (${pesos(cot.costoVisita)}) se cobra aparte.`}</p>
      )}

      {s.ajustes.length > 0 && (
        <ul className="lista">
          {s.ajustes.map((a) => {
            const delta = redondear(a.montoPropuesto - a.montoAnterior);
            return (
              <li key={a.id} className="fila">
                <div className="fila-titulo">
                  <span><strong>{a.etiqueta}</strong></span>
                  <span className={`estado ${CLASE_AJUSTE[a.estado]}`}>{ESTADO_AJUSTE[a.estado]}</span>
                </div>
                <p style={{ margin: '0.35rem 0' }}>
                  {pesos(a.montoAnterior)} → <strong>{pesos(a.montoPropuesto)}</strong>{' '}
                  {a.tipo !== 'presupuesto' && <span className="suave">({signo(delta)})</span>}
                </p>
                <p className="suave pequeno" style={{ margin: 0 }}>
                  {a.tipo === 'presupuesto'
                    ? `Mano de obra ${pesos(a.deltaManoObra)} · Material ${pesos(a.deltaMaterial)}${cot.visitaAbonable ? ' · la visita ya va incluida' : ` · más la visita (${pesos(cot.costoVisita)})`}`
                    : [a.deltaManoObra ? `Mano de obra ${signo(a.deltaManoObra)}` : null, a.deltaMaterial ? `Material ${signo(a.deltaMaterial)}` : null].filter(Boolean).join(' · ')}
                </p>
                {a.motivo && a.motivo !== a.etiqueta && <p className="pequeno" style={{ margin: '0.35rem 0 0' }}>“{a.motivo}”</p>}
                {a.tieneFoto && <FotoProtegida ruta={`/requests/${id}/adjustments/${a.id}/files/foto`} alt="Foto de evidencia" />}
                {a.tieneTicket && (
                  <div className="pequeno" style={{ marginTop: '0.35rem' }}>
                    🧾 Ticket por {pesos(a.ticketMonto)}{a.ticketMonto < a.deltaMaterial ? ` — salió más barato, el total bajó ${pesos(a.deltaMaterial - a.ticketMonto)}` : ''}
                    {' '}<FotoProtegida ruta={`/requests/${id}/adjustments/${a.id}/files/ticket`} alt="Ticket" />
                  </div>
                )}
                {!a.tieneFoto && a.estado === 'pendiente' && esCliente && a.tipo !== 'presupuesto' && (
                  <p className="pequeno suave" style={{ margin: '0.35rem 0 0' }}>Sin foto. Puedes pedírsela por WhatsApp antes de decidir.</p>
                )}
                {a.estado === 'pendiente' && esCliente && (
                  <div className="acciones">
                    <button className="boton accion" disabled={ocupado}
                      onClick={() => accion(() => api.patch(`/requests/${id}/adjustments/${a.id}`, { decision: 'aceptar' }), a.tipo === 'presupuesto' ? 'Aprobaste el presupuesto. El trabajador ya puede empezar.' : 'Aceptaste el cambio. El total quedó actualizado.')}>
                      {a.tipo === 'presupuesto' ? `Aprobar ${pesos(a.montoPropuesto)}` : `Aceptar ${pesos(a.montoPropuesto)}`}
                    </button>
                    <button className="boton secundario" disabled={ocupado}
                      onClick={() => accion(() => api.patch(`/requests/${id}/adjustments/${a.id}`, { decision: 'rechazar' }), a.tipo === 'presupuesto' ? `Rechazaste el presupuesto. Solo se cobra la visita (${pesos(a.montoAnterior)}).` : 'Rechazaste el cambio. El trabajo sigue con el precio anterior.')}>
                      {a.tipo === 'presupuesto' ? `No, solo pago la visita (${pesos(a.montoAnterior)})` : `Seguir con ${pesos(a.montoAnterior)}`}
                    </button>
                  </div>
                )}
                {esTrabajador && a.estado === 'aceptado' && a.deltaMaterial > 0 && !a.tieneTicket && activo && (
                  <SubirTicket max={a.deltaMaterial} ocupado={ocupado}
                    onEnviar={(form) => accion(() => api.postForm(`/requests/${id}/adjustments/${a.id}/ticket`, form), 'Ticket guardado. Cuenta para tu insignia “Comprueba sus gastos”.')} />
                )}
                {esTrabajador && a.estado === 'rechazado' && CONTAR_TOPE.includes(a.tipo) && a.tipo !== 'mas_facil' && activo && (
                  <p className="pequeno suave" style={{ margin: '0.5rem 0 0' }}>
                    {a.tieneFoto
                      ? 'Si no puedes seguir con el precio anterior, cancela con el motivo “No puedo continuar con el precio original”: como tienes foto, no baja tu reputación.'
                      : 'El cliente rechazó el cambio. Sin foto no puedes cancelar sin penalización; propón de nuevo con foto si lo necesitas.'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {puedePresupuesto && (
        <FormularioPresupuesto cot={cot} ocupado={ocupado}
          onEnviar={(form) => enviar(form, 'Presupuesto enviado. El cliente debe aprobarlo antes de que empieces.')} />
      )}

      {puedeCambio && (
        <div style={{ marginTop: '1rem' }}>
          <p className="pequeno suave">¿Cambió algo al trabajar? Elige qué pasó. Mano de obra disponible para subir: {pesos(disponibleMO)} (+{Math.round(porcentaje * 100)} % en {s.oficio.nombre}). El material no tiene tope, pero súbele el ticket.</p>
          <div className="tipos">
            {TIPOS.map((t) => (
              <button key={t.tipo} type="button" className={`boton ${tipo === t.tipo ? '' : 'secundario'}`} aria-pressed={tipo === t.tipo} onClick={() => setTipo(tipo === t.tipo ? null : t.tipo)}>{t.titulo}</button>
            ))}
          </div>
          {tipo && (
            <FormularioCambio key={tipo} def={TIPOS.find((t) => t.tipo === tipo)} vigente={s.montoFinal}
              disponibleMO={tipo === 'cliente_pidio_mas' ? null : disponibleMO} ocupado={ocupado}
              onEnviar={(form) => enviar(form, tipo === 'mas_facil' ? 'Listo, bajaste el precio y le avisamos al cliente.' : 'Cambio enviado. El cliente debe aceptarlo antes de que lo hagas.').then((ok) => ok && setTipo(null))} />
          )}
        </div>
      )}
      {esTrabajador && pendiente && <p className="suave pequeno">Espera la respuesta del cliente antes de hacer lo que propusiste.</p>}
    </section>
  );
}

function FormularioPresupuesto({ cot, ocupado, onEnviar }) {
  const [mo, setMo] = useState('');
  const [mat, setMat] = useState('');
  const trabajo = redondear(num(mo) + num(mat));
  const total = cot.visitaAbonable ? Math.max(trabajo, cot.costoVisita) : redondear(trabajo + cot.costoVisita);
  return (
    <form style={{ marginTop: '1rem' }} onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      f.set('tipo', 'presupuesto');
      if (!f.get('foto')?.size) f.delete('foto');
      if (!String(f.get('detalle') || '').trim()) f.delete('detalle');
      onEnviar(f);
    }}>
      <p className="suave pequeno">Ya revisaste: escribe cuánto cuesta el trabajo completo. El cliente lo aprueba antes de que empieces.</p>
      <Campo etiqueta="Mano de obra (MXN)"><input name="deltaManoObra" type="number" inputMode="decimal" min="0" step="0.01" required value={mo} onChange={(e) => setMo(e.target.value)} /></Campo>
      <Campo etiqueta="Material (MXN)"><input name="deltaMaterial" type="number" inputMode="decimal" min="0" step="0.01" value={mat} onChange={(e) => setMat(e.target.value)} /></Campo>
      <p className="total">
        Total para el cliente: <strong>{pesos(total)}</strong>
        <span className="pequeno suave"> {cot.visitaAbonable ? `(la visita de ${pesos(cot.costoVisita)} ya va descontada)` : `(incluye la visita de ${pesos(cot.costoVisita)})`}</span>
      </p>
      <Campo etiqueta="¿Qué encontraste? (opcional)"><textarea name="detalle" maxLength={300} /></Campo>
      <Campo etiqueta="Foto (opcional)" ayuda="Ayuda a que el cliente entienda el presupuesto."><input name="foto" type="file" accept="image/jpeg,image/png" /></Campo>
      <button className="boton accion ancho" disabled={ocupado || trabajo <= 0}>Enviar presupuesto</button>
    </form>
  );
}

function FormularioCambio({ def, vigente, disponibleMO, ocupado, onEnviar }) {
  const baja = def.tipo === 'mas_facil';
  const [mo, setMo] = useState('');
  const [mat, setMat] = useState('');
  const delta = redondear((num(mo) + num(mat)) * (baja ? -1 : 1));
  const excede = !baja && disponibleMO !== null && num(mo) > disponibleMO;
  const etiquetas = { manoObra: baja ? 'Baja en mano de obra (MXN)' : 'Mano de obra extra (MXN)', material: baja ? 'Baja en material (MXN)' : 'Material extra (MXN)' };
  const valores = { manoObra: [mo, setMo], material: [mat, setMat] };

  return (
    <form style={{ marginTop: '0.75rem' }} onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const sg = baja ? -1 : 1;
      f.set('tipo', def.tipo);
      f.set('deltaManoObra', String(num(mo) * sg));
      f.set('deltaMaterial', String(num(mat) * sg));
      if (!f.get('foto')?.size) f.delete('foto');
      if (!String(f.get('detalle') || '').trim()) f.delete('detalle');
      onEnviar(f);
    }}>
      <p className="suave pequeno" style={{ marginTop: 0 }}>{def.ayuda}</p>
      {def.campos.map((c) => (
        <Campo key={c} etiqueta={etiquetas[c]} ayuda={c === 'manoObra' && !baja && disponibleMO !== null ? `Máximo ${pesos(disponibleMO)}.` : undefined}>
          <input type="number" inputMode="decimal" min="0" step="0.01" value={valores[c][0]} onChange={(e) => valores[c][1](e.target.value)} />
        </Campo>
      ))}
      <p className="total">Total: {pesos(vigente)} → <strong>{pesos(redondear(vigente + delta))}</strong> <span className="suave">({signo(delta)})</span></p>
      {excede && <p className="pequeno" style={{ color: 'var(--peligro, #b42318)' }}>Pasa el tope de mano de obra. Si es trabajo nuevo que pidió el cliente, usa “El cliente pidió algo más”.</p>}
      <Campo etiqueta="Explícale al cliente (opcional)"><textarea name="detalle" maxLength={300} /></Campo>
      {!baja && (
        <Campo etiqueta="Foto (recomendada)" ayuda="Con foto, si el cliente rechaza y no puedes seguir, puedes cancelar sin que baje tu reputación.">
          <input name="foto" type="file" accept="image/jpeg,image/png" />
        </Campo>
      )}
      <button className="boton ancho" disabled={ocupado || delta === 0 || excede}>{baja ? 'Bajar el precio' : 'Enviar al cliente'}</button>
    </form>
  );
}

function SubirTicket({ max, ocupado, onEnviar }) {
  return (
    <details style={{ marginTop: '0.5rem' }}>
      <summary className="pequeno">Subir ticket del material</summary>
      <form onSubmit={(e) => { e.preventDefault(); onEnviar(new FormData(e.currentTarget)); }}>
        <Campo etiqueta="¿Cuánto costó? (MXN)" ayuda={`Aprobado: ${pesos(max)}. Si salió más barato, el total baja solo.`}>
          <input name="ticketMonto" type="number" inputMode="decimal" min="0.01" step="0.01" required />
        </Campo>
        <Campo etiqueta="Foto del ticket"><input name="ticket" type="file" accept="image/jpeg,image/png" required /></Campo>
        <button className="boton secundario" disabled={ocupado}>Guardar ticket</button>
      </form>
    </details>
  );
}

// ---------- Preguntas antes de cotizar ----------
export function Preguntas({ s, rel, ocupado, accion, id }) {
  const esCliente = rel === 'clienteDueno';
  const abierta = ['abierta', 'cotizada'].includes(s.estado);
  const puedePreguntar = rel === 'trabajadorElegible' && abierta;
  const mias = s.preguntas.filter((q) => q.mia).length;
  if (!s.preguntas.length && !puedePreguntar) return null;
  const visibles = esCliente ? s.preguntas : s.preguntas.filter((q) => q.mia || q.respuesta);

  return (
    <section>
      <h2>Preguntas</h2>
      {esCliente && <p className="suave pequeno">Responder ayuda a que te coticen más exacto y haya menos cambios de precio después.</p>}
      {visibles.length > 0 && (
        <ul className="lista">
          {visibles.map((q) => (
            <li key={q.id} className="fila">
              <p style={{ margin: 0 }}><strong>P:</strong> {q.texto}</p>
              {q.respuesta
                ? <p style={{ margin: '0.35rem 0 0' }}><strong>R:</strong> {q.respuesta}</p>
                : esCliente && abierta ? (
                  <form onSubmit={(e) => { e.preventDefault(); const respuesta = new FormData(e.currentTarget).get('respuesta').trim(); accion(() => api.patch(`/requests/${id}/questions/${q.id}`, { respuesta }), 'Respuesta enviada.'); }}>
                    <Campo etiqueta="Tu respuesta" ayuda="No escribas teléfonos ni direcciones."><textarea name="respuesta" required minLength={2} maxLength={300} /></Campo>
                    <button className="boton secundario" disabled={ocupado}>Responder</button>
                  </form>
                ) : <p className="suave pequeno" style={{ margin: '0.35rem 0 0' }}>Sin respuesta todavía.</p>}
            </li>
          ))}
        </ul>
      )}
      {puedePreguntar && mias < 3 && (
        <form style={{ marginTop: '0.75rem' }} onSubmit={(e) => {
          e.preventDefault();
          const el = e.currentTarget;
          const texto = new FormData(el).get('texto').trim();
          accion(() => api.post(`/requests/${id}/questions`, { texto }), 'Pregunta enviada al cliente.').then((ok) => ok && el.reset());
        }}>
          <Campo etiqueta="Pregúntale algo al cliente antes de cotizar" ayuda={`Te quedan ${3 - mias} de 3. Sin teléfonos, correos ni enlaces.`}>
            <textarea name="texto" required minLength={5} maxLength={300} />
          </Campo>
          <button className="boton secundario" disabled={ocupado}>Enviar pregunta</button>
        </form>
      )}
    </section>
  );
}
