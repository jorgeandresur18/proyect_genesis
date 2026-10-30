// El 100 % del juego: todo lo desbloqueable cuenta (decisión del autor; ver docs/SPEC.md), cada cosa vale lo mismo.
import { useStore } from './store';
import { endings } from './story';
import { CGS, TOTAL_SPRITES, useGalleryState } from './gallery';
import { useBoringramProgress } from './boringram';

export interface Progress {
  /** Clave de texto: progreso.<id>. */
  id: string;
  got: number;
  total: number;
}

export function useCompletion() {
  const seen = useStore((s) => s.endingsSeen);
  const g = useGalleryState();
  const bor = useBoringramProgress();
  const playable = endings.filter((e) => e.estado === 'jugable');
  const parts: Progress[] = [
    { id: 'finales', got: playable.filter((e) => seen[e.id]).length, total: playable.length },
    { id: 'imagenes', got: g.images.length, total: CGS.length },
    { id: 'sprites', got: g.spriteCount, total: TOTAL_SPRITES },
    ...Object.entries(bor).map(([id, p]) => ({ id, ...p })),
  ].filter((p) => p.total > 0);
  const got = parts.reduce((n, p) => n + p.got, 0);
  const total = parts.reduce((n, p) => n + p.total, 0);
  // Solo es 100 cuando no falta nada (no se redondea hacia arriba).
  const percent = total ? Math.floor((got / total) * 100) : 0;
  return { parts, got, total, percent, missing: total - got };
}
