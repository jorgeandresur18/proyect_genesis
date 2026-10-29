// Texto del guion en el idioma elegido.
// - El guion original (español) vive en src/data/chapters/. La versión en inglés de cada capítulo está en
//   src/data/en/chapters/<capítulo>.json: por escena, `t` (la línea) y `c` (las opciones, en el mismo orden).
// - El estado y el historial guardan siempre el texto en español (las pantallas de código lo comparan con
//   nombres y opciones en español); se traduce solo al mostrarlo.
import type { Dialogue, Scene } from './types';
import type { Lang } from './i18n';
import hablantes from '../data/en/hablantes.json';

interface SceneText {
  t: string;
  c?: string[];
}

const EN: Record<string, SceneText> = Object.assign(
  {},
  ...Object.values(import.meta.glob<Record<string, SceneText>>('../data/en/chapters/*.json', { eager: true, import: 'default' })),
);

/** Traducciones en inglés de todas las escenas (para la prueba de cobertura). */
export const englishScenes: Readonly<Record<string, SceneText>> = EN;

/** Nombre de un hablante: los que no están en la lista (Jair, Nikki, GRAVITY…) se escriben igual. */
export function speakerName(speaker: string, lang: Lang): string {
  return lang === 'en' ? ((hablantes as Record<string, string>)[speaker] ?? speaker) : speaker;
}

/** Línea de una escena; si falta la traducción queda el texto original. */
export function lineText(sceneId: string | undefined, text: string, lang: Lang): string {
  return (lang === 'en' && sceneId && EN[sceneId]?.t) || text;
}

/** Texto de la opción `index` (posición en `scene.choices`, no entre las visibles). */
export function choiceText(sceneId: string | undefined, index: number | undefined, text: string, lang: Lang): string {
  return (lang === 'en' && sceneId && index !== undefined && EN[sceneId]?.c?.[index]) || text;
}

/** Diálogo de una escena listo para la caja de texto. */
export function sceneDialogue(scene: Scene, lang: Lang): Dialogue | null {
  const d = scene.dialogue;
  if (!d || lang === 'es') return d;
  return { ...d, speaker: d.speaker && speakerName(d.speaker, lang), text: lineText(scene.scene_id, d.text, lang) };
}
