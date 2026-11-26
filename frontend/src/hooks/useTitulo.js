import { useEffect } from 'react';

// WCAG 2.4.2: cada pantalla tiene su propio título (pestaña, historial y lector de pantalla).
export default function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · OficioYa` : 'OficioYa: trabajadores de oficios verificados en Puebla';
  }, [titulo]);
}
