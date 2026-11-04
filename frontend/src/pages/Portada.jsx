import { Link } from 'react-router-dom';

export default function Portada() {
  return (
    <section className="portada">
      <h1>Plomeros, electricistas y más, con identidad verificada.</h1>
      <p className="suave">
        Publica lo que necesitas, recibe cotizaciones de trabajadores de tu zona en Puebla y elige.
        Solo quien ya contrató a alguien puede calificarlo.
      </p>
      <div className="acciones">
        <Link to="/registro" className="boton accion">Crear cuenta</Link>
        <Link to="/entrar" className="boton secundario">Ya tengo cuenta</Link>
      </div>
    </section>
  );
}
