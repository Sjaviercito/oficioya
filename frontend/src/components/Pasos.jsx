const ORDEN = ['abierta', 'cotizada', 'aceptada', 'en_curso', 'completada'];
const NOMBRE = {
  abierta: 'Esperando cotizaciones',
  cotizada: 'Con cotizaciones',
  aceptada: 'Trabajador elegido',
  en_curso: 'Trabajo en curso',
  completada: 'Terminado',
};

// v1.4: la barra dice en palabras en qué paso va la solicitud (antes solo eran colores).
export default function Pasos({ estado }) {
  if (estado === 'cancelada') return null;
  const actual = ORDEN.indexOf(estado);
  return (
    <div className="pasos-contenedor">
      <ol className="pasos" aria-hidden="true">
        {ORDEN.map((e, i) => <li key={e} className={i < actual ? 'hecho' : i === actual ? 'actual' : ''} />)}
      </ol>
      <p className="pasos-texto">Paso {actual + 1} de {ORDEN.length}: <strong>{NOMBRE[estado]}</strong></p>
    </div>
  );
}
