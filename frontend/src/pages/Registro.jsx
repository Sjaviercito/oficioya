import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../api/sesion';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';
import { marcarCampo } from '../api/errores';
import useTitulo from '../hooks/useTitulo';

export default function Registro() {
  const { usuario, entrar } = useSesion();
  const navegar = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  useTitulo('Crear cuenta');

  if (usuario) return <Navigate to="/" replace />;

  async function enviar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    datos.aceptaPrivacidad = datos.aceptaPrivacidad === 'on';
    setError('');
    setEnviando(true);
    try {
      const u = await entrar('/auth/register', datos);
      navegar(u.rol === 'trabajador' ? '/perfil' : '/');
    } catch (err) {
      if (!marcarCampo(form, err)) setError(err.message);
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
        <Campo etiqueta="Celular" ayuda="10 dígitos. Solo lo verá la otra parte de un trabajo aceptado.">
          <input name="telefono" type="tel" inputMode="numeric" autoComplete="tel-national" required />
        </Campo>
        <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres.">
          <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </Campo>
        <label className="casilla">
          <input type="checkbox" name="aceptaPrivacidad" required />
          <span>Acepto el <Link to="/privacidad" target="_blank">aviso de privacidad</Link> y los <Link to="/terminos" target="_blank">términos y condiciones</Link></span>
        </label>
        <button className="boton accion ancho" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
      <p className="suave" style={{ marginTop: '1rem' }}>¿Ya tienes cuenta? <Link to="/entrar">Entra</Link></p>
    </>
  );
}
