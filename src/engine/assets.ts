// Recursos de la historia: `PLACEHOLDER:nombre` se dibuja como caja gris; `PANTALLA:nombre` es una pantalla
// dibujada en código (src/components/CodeScreen.tsx); cualquier otro valor es una ruta dentro de public/
// (p. ej. `sprites/nikki/ebria1.png`).
import pantallas from '../data/pantallas.json';

export function isPlaceholder(ref: string): boolean {
  return ref.startsWith('PLACEHOLDER:');
}

export function screenOf(ref: string): string | null {
  return ref.startsWith('PANTALLA:') ? ref.slice('PANTALLA:'.length) : null;
}

export function isKnownScreen(id: string): boolean {
  return id !== 'nota' && id in pantallas;
}

export function assetUrl(ref: string): string {
  return `${import.meta.env.BASE_URL}${ref}`;
}
