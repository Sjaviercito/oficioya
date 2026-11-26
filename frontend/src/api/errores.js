// v1.4 (WCAG 3.3.1 y 3.3.3): si el servidor dice qué campo está mal, se marca ese campo con el
// mensaje nativo del navegador (lo anuncian los lectores de pantalla y lleva el foco ahí).
export function marcarCampo(form, error) {
  const el = error && error.campo && form && form.elements ? form.elements.namedItem(error.campo) : null;
  if (!el || typeof el.setCustomValidity !== 'function') return false;
  el.setCustomValidity(error.message);
  el.setAttribute('aria-invalid', 'true');
  el.reportValidity();
  el.focus();
  const limpiar = () => { el.setCustomValidity(''); el.removeAttribute('aria-invalid'); };
  el.addEventListener('input', limpiar, { once: true });
  el.addEventListener('change', limpiar, { once: true });
  return true;
}
