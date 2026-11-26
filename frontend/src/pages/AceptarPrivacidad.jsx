import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSesion } from '../api/sesion';
import Aviso from '../components/Aviso';

// Para cuentas creadas antes del aviso, o cuando el aviso cambia de versión.
export default function AceptarPrivacidad() {
  const { actualizarUsuario } = useSesion();
  const navegar = useNavigate();
  const [error, setError] = useState('');
  return (
    <>
      <h1>Antes de continuar</h1>
      <p>Actualizamos nuestro aviso de privacidad y los términos. Para seguir usando OficioYa necesitas aceptarlos.</p>
      <Aviso tipo="error">{error}</Aviso>
      <form onSubmit={async (e) => {
        e.preventDefault();
        try { actualizarUsuario((await api.post('/auth/me/privacy')).usuario); navegar('/'); } catch (err) { setError(err.message); }
      }}>
        <label className="opcion" style={{ borderRadius: 'var(--radio)' }}>
          <input type="checkbox" required /> Acepto el <Link to="/privacidad" target="_blank">aviso de privacidad</Link> y los <Link to="/terminos" target="_blank">términos</Link>
        </label>
        <button className="boton ancho">Aceptar y continuar</button>
      </form>
    </>
  );
}
