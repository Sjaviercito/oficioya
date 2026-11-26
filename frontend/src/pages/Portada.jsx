import { Link } from 'react-router-dom';
import useTitulo from '../hooks/useTitulo';

export default function Portada() {
  useTitulo('');
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
      <h2>Cómo funciona</h2>
      <ol className="como">
        <li><span><strong>Describe el trabajo.</strong> Tu dirección exacta solo la ve quien elijas.</span></li>
        <li><span><strong>Recibe cotizaciones</strong> con mano de obra, material y vigencia, de trabajadores con INE verificada.</span></li>
        <li><span><strong>Elige y coordínate</strong> por WhatsApp. Si el precio cambia, tú lo apruebas antes, con foto.</span></li>
      </ol>
    </section>
  );
}
