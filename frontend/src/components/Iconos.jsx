// Íconos propios en SVG (trazo de 1.8 px). Decorativos: el texto junto a ellos da el significado.
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };

export const Icono = {
  lista: (p) => <svg {...base} {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="2.6" /></svg>,
  mas: (p) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  buscar: (p) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>,
  campana: (p) => <svg {...base} {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>,
  persona: (p) => <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.3-3.6 4.2-5.2 7.5-5.2s6.2 1.6 7.5 5.2" /></svg>,
  herramienta: (p) => <svg {...base} {...p}><path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z" /><path d="m14.5 6.5 3-3" /></svg>,
  insignia: (p) => <svg {...base} {...p}><path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.3 6.8 19l1-5.8-4.2-4.1 5.8-.8z" /></svg>,
  escudo: (p) => <svg {...base} {...p}><path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>,
  flecha: (p) => <svg {...base} {...p}><path d="M15 5 8 12l7 7" /></svg>,
  cerrar: (p) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  ticket: (p) => <svg {...base} {...p}><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" /><path d="M9 8h6M9 12h6" /></svg>,
  camara: (p) => <svg {...base} {...p}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg>,
  check: (p) => <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
  alerta: (p) => <svg {...base} {...p}><path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4M12 17h.01" /></svg>,
  salir: (p) => <svg {...base} {...p}><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" /></svg>,
};
