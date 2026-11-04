import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../api/sesion';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';

export default function Registro() {
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
      const u = await entrar('/auth/register', datos);
      navegar(u.rol === 'trabajador' ? '/perfil' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Crear cuenta</h1>
      <Aviso tipo="error">{error}</Aviso>
      <form onSubmit={enviar}>
        <fieldset>
          <legend>¿Cómo vas a usar OficioYa?</legend>
          <div className="opciones">
            <label className="opcion"><input type="radio" name="rol" value="cliente" defaultChecked /> Necesito un trabajo</label>
            <label className="opcion"><input type="radio" name="rol" value="trabajador" /> Ofrezco mi oficio</label>
          </div>
        </fieldset>
        <Campo etiqueta="Nombre">
          <input name="nombre" autoComplete="name" required minLength={2} maxLength={100} />
        </Campo>
        <Campo etiqueta="Correo">
          <input name="email" type="email" autoComplete="email" required />
        </Campo>
        <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres.">
          <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </Campo>
        <button className="boton accion ancho" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
      <p className="suave" style={{ marginTop: '1rem' }}>¿Ya tienes cuenta? <Link to="/entrar">Entra</Link></p>
    </>
  );
}
