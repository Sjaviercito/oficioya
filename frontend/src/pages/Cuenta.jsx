import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, guardarSesion } from '../api/client';
import { useSesion } from '../api/sesion';
import Aviso from '../components/Aviso';
import Campo from '../components/Campo';
import { useNotificar } from '../components/Notificador';
import { marcarCampo } from '../api/errores';
import useTitulo from '../hooks/useTitulo';

export default function Cuenta() {
  const { usuario, actualizarUsuario, salir } = useSesion();
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const notificar = useNotificar();
  useTitulo('Mi cuenta');

  async function enviar(fn, exito, form) {
    try { await fn(); notificar.ok(exito); } catch (err) { if (!marcarCampo(form, err)) notificar.error(err.message); }
  }

  return (
    <>
      <h1>Mi cuenta</h1>
      <dl>
        <div className="dato"><dt>Nombre</dt><dd>{usuario.nombre}</dd></div>
        <div className="dato"><dt>Correo</dt><dd>{usuario.email}</dd></div>
      </dl>

      <h2>Celular</h2>
      <p className="suave pequeno">Solo lo ve la otra parte de un trabajo aceptado, mientras el trabajo está activo.</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const telefono = new FormData(form).get('telefono');
        enviar(async () => actualizarUsuario((await api.put('/auth/me/phone', { telefono })).usuario), 'Celular actualizado.', form);
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
        enviar(async () => { guardarSesion(await api.put('/auth/me/password', d)); form.reset(); }, 'Contraseña actualizada. Se cerraron tus otras sesiones.', form);
      }}>
        <Campo etiqueta="Contraseña actual"><input name="actual" type="password" autoComplete="current-password" required /></Campo>
        <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 8 caracteres."><input name="nueva" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Campo>
        <button className="boton secundario">Cambiar contraseña</button>
      </form>

      <h2>Privacidad</h2>
      <ul className="pequeno" style={{ paddingLeft: '1.1rem', lineHeight: 2.2 }}>
        <li><Link to="/privacidad">Aviso de privacidad</Link></li>
        <li><Link to="/terminos">Términos y condiciones</Link></li>
      </ul>

      <h2>Sesión</h2>
      <button type="button" className="boton secundario" onClick={salir}>Cerrar sesión</button>

      <h2>Eliminar cuenta</h2>
      {!confirmarBaja ? (
        <button className="boton peligro" onClick={() => setConfirmarBaja(true)}>Eliminar mi cuenta</button>
      ) : (
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const password = new FormData(form).get('password');
          enviar(async () => { await api.delete('/auth/me', { password }); await salir(); }, 'Tu cuenta fue eliminada.', form);
        }}>
          <Aviso tipo="error">Se borrarán tu nombre, correo, celular, direcciones, fotos e INE. Tus reseñas quedarán como "Usuario eliminado". No se puede deshacer. Si tienes trabajos activos, primero termínalos o cancélalos.</Aviso>
          <Campo etiqueta="Escribe tu contraseña para confirmar"><input name="password" type="password" autoComplete="current-password" required /></Campo>
          <div className="acciones">
            <button className="boton peligro-lleno">Eliminar definitivamente</button>
            <button type="button" className="boton secundario" onClick={() => setConfirmarBaja(false)}>No eliminar</button>
          </div>
        </form>
      )}
    </>
  );
}
