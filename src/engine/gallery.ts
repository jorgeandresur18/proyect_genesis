// Contenido de la galería y qué está desbloqueado (y qué es nuevo). Lo usan la galería, Extras y el título.
// - Imágenes: los fondos `fondos/cg_*.webp` del guion; se desbloquean al verlos en el juego (cgSeen).
// - Sprites: los de los capítulos de galeria.json («capitulos_sprites»); se desbloquean al visitar una escena
//   donde aparecen (snapshots). Una expresión que hoy es sustituto de otra (alias en tools/sprites.config.json)
//   cuenta como la otra, para no repetir la misma imagen.
// - Nuevo: desbloqueado y todavía no abierto en el visor de la galería (galleryOpened).
import { useStore } from './store';
import { storyFiles } from './story';
import galeria from '../data/galeria.json';
import spriteConfig from '../../tools/sprites.config.json';

export const CGS: string[] = (() => {
  const ids: string[] = [];
  for (const file of storyFiles) {
    for (const scene of file.scenes) {
      const m = scene.background?.match(/^fondos\/(cg_[a-z0-9_]+)\.webp$/);
      if (m && !ids.includes(m[1])) ids.push(m[1]);
    }
  }
  return ids;
})();

const ALIAS = Object.fromEntries(
  Object.entries(spriteConfig.personajes).map(([id, c]) => [id, ('alias' in c ? c.alias : {}) as Record<string, string>]),
);

export interface CharacterSprites {
  id: string;
  /** Expresión (archivo real) -> escenas donde aparece. */
  sprites: { expr: string; scenes: string[] }[];
}

export const CHARACTERS: CharacterSprites[] = (() => {
  const byId = new Map<string, Map<string, string[]>>();
  for (const file of storyFiles) {
    if (!galeria.capitulos_sprites.includes(file.chapter)) continue;
    for (const scene of file.scenes) {
      for (const c of scene.characters) {
        const m = c.sprite.match(/^sprites\/([^/]+)\/([^/.]+)\.webp$/);
        if (!m) continue;
        const expr = ALIAS[m[1]]?.[m[2]] ?? m[2];
        const sprites = byId.get(m[1]) ?? new Map<string, string[]>();
        sprites.set(expr, [...(sprites.get(expr) ?? []), scene.scene_id]);
        byId.set(m[1], sprites);
      }
    }
  }
  const order = Object.keys(galeria.personajes);
  return [...byId.keys()]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map((id) => ({ id, sprites: [...byId.get(id)!].map(([expr, scenes]) => ({ expr, scenes })) }));
})();

export const TOTAL_SPRITES = CHARACTERS.reduce((n, c) => n + c.sprites.length, 0);

/** Color de la ventana de cada personaje (los mismos de la caja de diálogo). */
export const characterColor = (id: string): string => (galeria.colores as Record<string, string>)[id] ?? '#a3a8b2';

export const imageKey = (id: string) => `img:${id}`;
export const spriteKey = (character: string, expr: string) => `spr:${character}/${expr}`;

/** Qué hay desbloqueado y qué es nuevo, según la partida guardada. */
export function useGalleryState() {
  const cgSeen = useStore((s) => s.cgSeen);
  const visited = useStore((s) => s.snapshots);
  const opened = useStore((s) => s.galleryOpened);
  const images = CGS.filter((id) => cgSeen[id]);
  const sprites = new Map(
    CHARACTERS.map((c) => [c.id, c.sprites.filter((s) => s.scenes.some((scene) => visited[scene]))] as const),
  );
  const isNew = (key: string) => !opened[key];
  const newImages = images.filter((id) => isNew(imageKey(id)));
  const newSprites = new Map([...sprites].map(([id, list]) => [id, list.filter((s) => isNew(spriteKey(id, s.expr)))] as const));
  const newSpriteCount = [...newSprites.values()].reduce((n, l) => n + l.length, 0);
  return {
    images,
    sprites,
    spriteCount: [...sprites.values()].reduce((n, l) => n + l.length, 0),
    newImages: new Set(newImages),
    newSprites,
    newSpriteCount,
    hasNew: newImages.length + newSpriteCount > 0,
  };
}
