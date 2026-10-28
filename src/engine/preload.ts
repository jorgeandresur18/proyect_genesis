// Precarga las imágenes de las escenas que vienen, para que el fondo y los sprites ya estén listos al llegar
// (si no, el navegador muestra la imagen anterior hasta que termina de descargar la nueva).
import { assetUrl, isPlaceholder, screenOf } from './assets';
import { scenes } from './story';

const DEPTH = 12; // escenas hacia adelante, siguiendo todas las ramas
const requested = new Set<string>();

function isImage(ref: string | null): ref is string {
  return !!ref && !isPlaceholder(ref) && screenOf(ref) === null && /\.(webp|png|jpe?g)$/i.test(ref);
}

export function preloadFrom(sceneId: string): void {
  let frontier = [sceneId];
  const seen = new Set(frontier);
  for (let d = 0; d < DEPTH && frontier.length; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const s = scenes.get(id);
      if (!s) continue;
      for (const ref of [s.background, ...s.characters.map((c) => c.sprite)]) {
        if (!isImage(ref) || requested.has(ref)) continue;
        requested.add(ref);
        const img = new Image();
        img.decoding = 'async';
        img.src = assetUrl(ref);
      }
      const targets = [
        ...(typeof s.next === 'string' ? [s.next] : Array.isArray(s.next) ? s.next.map((b) => b.to) : []),
        ...s.choices.map((c) => c.next),
      ];
      for (const t of targets) {
        if (!seen.has(t)) {
          seen.add(t);
          next.push(t);
        }
      }
    }
    frontier = next;
  }
}
