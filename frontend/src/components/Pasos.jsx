const ORDEN = ['abierta', 'cotizada', 'aceptada', 'en_curso', 'completada'];

export default function Pasos({ estado }) {
  if (estado === 'cancelada') return null;
  const actual = ORDEN.indexOf(estado);
  return (
    <ol className="pasos" aria-label={`Paso ${actual + 1} de ${ORDEN.length}`}>
      {ORDEN.map((e, i) => <li key={e} className={i <= actual ? 'hecho' : ''} />)}
    </ol>
  );
}
