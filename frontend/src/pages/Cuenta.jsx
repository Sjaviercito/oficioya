import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, guardarSesion } from '../api/client';
import { useSesion } from '../api/sesion';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';

export default function Cuenta() {
  const { usuario, actualizarUsuario, salir } = useSesion();
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  async function enviar(fn, exito) {
    setAviso({ tipo: '', texto: '' });
    try { await fn(); setAviso({ tipo: 'ok', texto: exito }); } catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <h1>Mi cuenta</h1>
      <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>
      <dl>
        <div className="dato"><dt>Nombre</dt><dd>{usuario.nombre}</dd></div>
        <div className="dato"><dt>Correo</dt><dd>{usuario.email}</dd></div>
      </dl>

      <h2>Celular</h2>
      <p className="suave pequeno">Solo lo ve la otra parte de un trabajo aceptado, mientras el trabajo está activo.</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        const telefono = new FormData(e.currentTarget).get('telefono');
        enviar(async () => actualizarUsuario((await api.put('/auth/me/phone', { telefono })).usuario), 'Celular actualizado.');
      }}>
        <Campo etiqueta="Celular (10 dígitos)">
          <input name="telefono" type="tel" inputMode="numeric" autoComplete="tel-national" required defaultValue={usuario.telefono || ''} />
        </Campo>
        <button className="boton secundario">Guardar celular</button>
      </form>

      <h2>Contraseña</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const d = Object.fromEntries(new FormData(form));
        enviar(async () => { guardarSesion(await api.put('/auth/me/password', d)); form.reset(); }, 'Contraseña actualizada. Se cerraron tus otras sesiones.');
      }}>
        <Campo etiqueta="Contraseña actual"><input name="actual" type="password" autoComplete="current-password" required /></Campo>
        <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 8 caracteres."><input name="nueva" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Campo>
        <button className="boton secundario">Cambiar contraseña</button>
      </form>

      <h2>Privacidad</h2>
      <p><Link to="/privacidad">Aviso de privacidad</Link> · <Link to="/terminos">Términos y condiciones</Link></p>

      <h2>Eliminar cuenta</h2>
      {!confirmarBaja ? (
        <button className="boton peligro" onClick={() => setConfirmarBaja(true)}>Eliminar mi cuenta</button>
      ) : (
        <form onSubmit={(e) => {
          e.preventDefault();
          const password = new FormData(e.currentTarget).get('password');
          enviar(async () => { await api.delete('/auth/me', { password }); await salir(); }, 'Tu cuenta fue eliminada.');
        }}>
          <Aviso tipo="error">Se borrarán tu nombre, correo, celular, direcciones, fotos e INE. Tus reseñas quedarán como "Usuario eliminado". No se puede deshacer. Si tienes trabajos activos, primero termínalos o cancélalos.</Aviso>
          <Campo etiqueta="Escribe tu contraseña para confirmar"><input name="password" type="password" autoComplete="current-password" required /></Campo>
          <div className="acciones">
            <button className="boton peligro">Eliminar definitivamente</button>
            <button type="button" className="boton secundario" onClick={() => setConfirmarBaja(false)}>No eliminar</button>
          </div>
        </form>
      )}
    </>
  );
}
