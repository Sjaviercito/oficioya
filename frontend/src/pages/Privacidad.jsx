import { CONTACTO_PRIVACIDAD, RESPONSABLE, VERSION_PRIVACIDAD } from '../legal';

export default function Privacidad() {
  return (
    <article>
      <h1>Aviso de privacidad</h1>
      <p className="suave pequeno">Versión {VERSION_PRIVACIDAD}</p>

      <h2>Quién es responsable de tus datos</h2>
      <p>{RESPONSABLE}. Contacto para temas de privacidad: {CONTACTO_PRIVACIDAD}.</p>

      <h2>Qué datos recabamos</h2>
      <p>De todos los usuarios: nombre, correo, número de celular y contraseña (guardada de forma irreversible). De los clientes: colonia, dirección exacta, descripción y fotos de cada solicitud. De los trabajadores: foto de perfil, oficios, zonas, años de experiencia, y una foto de su INE y una selfie sosteniéndola, que se guardan cifradas.</p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Crear y operar tu cuenta.</li>
        <li>Verificar la identidad de los trabajadores.</li>
        <li>Conectar a clientes con trabajadores y mostrar la reputación basada en trabajos reales.</li>
        <li>Permitir el contacto entre cliente y trabajador durante un trabajo aceptado.</li>
        <li>Atender reportes, prevenir fraudes y proteger a los usuarios.</li>
      </ul>
      <p>No usamos tus datos para publicidad ni los vendemos.</p>

      <h2>Con quién se comparten</h2>
      <p>Tu dirección exacta y tu celular solo los ve la otra parte de un trabajo aceptado, y solo mientras el trabajo está activo. Tu INE y tu selfie solo las ve el equipo de verificación. Los datos se almacenan con proveedores de infraestructura (servidores y base de datos) que actúan por cuenta de OficioYa.</p>

      <h2>Tus derechos (acceso, rectificación, cancelación y oposición)</h2>
      <p>Puedes ver y corregir tus datos desde "Mi cuenta" y "Mi perfil", y eliminar tu cuenta en cualquier momento desde "Mi cuenta": se borran tus datos personales, tu INE y tus fotos. Para oponerte a algún uso o revocar tu consentimiento, escribe a {CONTACTO_PRIVACIDAD}.</p>

      <h2>Cambios a este aviso</h2>
      <p>Si este aviso cambia, te lo mostraremos al entrar y te pediremos aceptarlo de nuevo.</p>
    </article>
  );
}
