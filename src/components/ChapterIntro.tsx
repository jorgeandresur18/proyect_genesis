import { useEffect } from 'react';
import { useStore } from '../engine/store';
import { storyFiles } from '../engine/story';
import { assetUrl } from '../engine/assets';
import { localized, useLang } from '../engine/i18n';
import textosEs from '../data/fin_capitulo.json';
import textosEn from '../data/en/fin_capitulo.json';

// Cuánto se queda la portada (sin contar la salida). Un clic, Espacio o Enter la saltan.
const HOLD_MS = 4200;
const OUT_MS = 900;

/** Primera escena de cada capítulo del juego base: ahí se muestra la portada. */
export const CHAPTER_STARTS = new Map<string, number>(
  storyFiles.filter((f) => f.ruta === 'base' && f.scenes.length).map((f) => [f.scenes[0].scene_id, f.chapter]),
);

/**
 * Portada de inicio de capítulo: «CAPÍTULO N» en grande y su nombre, sobre un lugar del capítulo oscurecido,
 * con la cuadrícula. Mismo estilo que la pantalla de fin de capítulo. Se va sola después de unos segundos.
 */
export function ChapterIntro({ chapter, leaving, onLeave }: { chapter: number; leaving: boolean; onLeave: () => void }) {
  const still = useStore((s) => s.settings.reduceEffects);
  const lang = useLang();
  const textos = localized(textosEs, textosEn, lang);
  const file = storyFiles.find((f) => f.ruta === 'base' && f.chapter === chapter);
  const title = lang === 'en' ? (file?.title_en ?? file?.title) : file?.title;
  const background = (textos.fondos_inicio as Record<string, string>)[String(chapter)];
  const label = textos.portada.replace('{n}', String(chapter));

  useEffect(() => {
    if (leaving) return;
    const t = setTimeout(onLeave, still ? 1800 : HOLD_MS);
    const skip = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onLeave();
      }
    };
    window.addEventListener('keydown', skip, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip, true);
    };
  }, [leaving, still, onLeave]);

  return (
    <div
      className={`screen chapter-end chapter-intro ${leaving ? 'chapter-intro-out' : ''} ${still ? 'chapter-end-still' : ''}`}
      style={{ animationDuration: leaving ? `${OUT_MS}ms` : undefined }}
      onClick={onLeave}
    >
      <div className="chapter-end-bg" aria-hidden>
        {background && <img src={assetUrl(background)} alt="" draggable={false} />}
        <div className="chapter-end-grid" />
      </div>
      <div className="chapter-end-text">
        <h1 className="chapter-end-title" data-text={label}>
          {label}
        </h1>
        {title && <p className="chapter-end-sub">{title}</p>}
      </div>
    </div>
  );
}

export const CHAPTER_INTRO_OUT_MS = OUT_MS;
