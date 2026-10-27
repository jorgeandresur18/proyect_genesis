import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// El texto del juego no se puede seleccionar, copiar ni arrastrar (los campos de texto sí funcionan).
const editable = (t: EventTarget | null) => t instanceof HTMLElement && t.closest('input, textarea') !== null;
for (const type of ['copy', 'cut', 'selectstart', 'dragstart', 'contextmenu'] as const) {
  document.addEventListener(type, (e) => {
    if (!editable(e.target)) e.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
