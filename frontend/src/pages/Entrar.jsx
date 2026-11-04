import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../api/sesion';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';

export default function Entrar() {
  const { usuario, entrar } = useSesion();
  const navegar = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function enviar(e) {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    setError('');
    setEnviando(true);
    try {
      await entrar('/auth/login', datos);
      navegar('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Entrar</h1>
      <Aviso tipo="error">{error}</Aviso>
      <form onSubmit={enviar}>
        <Campo etiqueta="Correo">
          <input name="email" type="email" autoComplete="email" required />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input name="password" type="password" autoComplete="current-password" required />
        </Campo>
        <button className="boton ancho" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="suave" style={{ marginTop: '1rem' }}>¿No tienes cuenta? <Link to="/registro">Crea una</Link></p>
    </>
  );
}
