// El 100 % del juego: todo lo desbloqueable cuenta (decisión del autor; ver docs/SPEC.md). Cada tipo pesa lo mismo
// (si no, las miles de escenas taparían a los finales).
import { useStore } from './store';
import { endings, storyFiles } from './story';
import { CGS, TOTAL_SPRITES, useGalleryState } from './gallery';
import { useBoringramProgress } from './boringram';

/** Todas las escenas (cada una es una línea de diálogo) y todas las opciones de todas las decisiones. */
const SCENES = storyFiles.flatMap((f) => f.scenes);
const CHOICES = SCENES.flatMap((sc) => sc.choices.map((_, i) => `${sc.scene_id}#${i}`));

export interface Progress {
  /** Clave de texto: progreso.<id>. */
  id: string;
  got: number;
  total: number;
}

export function useCompletion() {
  const seen = useStore((s) => s.endingsSeen);
  const read = useStore((s) => s.readScenes);
  const taken = useStore((s) => s.choicesTaken);
  const g = useGalleryState();
  const bor = useBoringramProgress();
  const playable = endings.filter((e) => e.estado === 'jugable');
  const parts: Progress[] = [
    { id: 'escenas', got: SCENES.filter((sc) => read[sc.scene_id]).length, total: SCENES.length },
    { id: 'decisiones', got: CHOICES.filter((k) => taken[k]).length, total: CHOICES.length },
    { id: 'finales', got: playable.filter((e) => seen[e.id]).length, total: playable.length },
    { id: 'imagenes', got: g.images.length, total: CGS.length },
    { id: 'sprites', got: g.spriteCount, total: TOTAL_SPRITES },
    ...Object.entries(bor).map(([id, p]) => ({ id, ...p })),
  ].filter((p) => p.total > 0);
  const got = parts.reduce((n, p) => n + p.got, 0);
  const total = parts.reduce((n, p) => n + p.total, 0);
  // Promedio de los tipos; solo es 100 cuando no falta nada (no se redondea hacia arriba).
  const ratio = parts.length ? parts.reduce((n, p) => n + p.got / p.total, 0) / parts.length : 0;
  const percent = got === total ? 100 : Math.min(99, Math.floor(ratio * 100));
  return { parts, got, total, percent, missing: total - got };
}
