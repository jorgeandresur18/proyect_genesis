import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../engine/store';
import { storyFiles } from '../engine/story';
import { playSelect } from '../engine/sound';
import textosEs from '../data/fin_capitulo.json';
import textosEn from '../data/en/fin_capitulo.json';
import { localized, useLang } from '../engine/i18n';
import { assetUrl } from '../engine/assets';

interface Props {
  chapter: number;
  /** La última escena del capítulo: se ve mientras se funde a negro. */
  lastScene: ReactNode;
  onSave: () => void;
  /** Vuelve al título con fundido a negro. */
  onTitle: () => void;
}

const FADE_MS = 1800;
const n = (text: string, chapter: number) => text.replace('{n}', String(chapter));

/** Fin de capítulo: fundido a negro, «FIN DEL CAPÍTULO N» en grande y Continuar / Guardar / Volver al inicio. */
export function ChapterEnd({ chapter, lastScene, onSave, onTitle }: Props) {
  const still = useStore((s) => s.settings.reduceEffects);
  const [faded, setFaded] = useState(false);
  const [soon, setSoon] = useState(false);
  const lang = useLang();
  const textos = localized(textosEs, textosEn, lang);
  const file = storyFiles.find((f) => f.ruta === 'base' && f.chapter === chapter);
  const title = lang === 'en' ? (file?.title_en ?? file?.title) : file?.title;
  const background = (textos.fondos as Record<string, string>)[String(chapter)];

  useEffect(() => {
    const t = setTimeout(() => setFaded(true), still ? 400 : FADE_MS);
    return () => clearTimeout(t);
  }, [still]);

  if (!faded) {
    return (
      <div className="chapter-fade-wrap">
        {lastScene}
        <div className="chapter-fade" style={{ animationDuration: `${still ? 400 : FADE_MS}ms` }} aria-hidden />
      </div>
    );
  }

  const click = (fn: () => void) => () => {
    playSelect();
    fn();
  };
  return (
    <div className={`screen chapter-end ${still ? 'chapter-end-still' : ''}`}>
      {/* Fondo: un lugar del capítulo, oscurecido, con la cuadrícula del título encima. */}
      <div className="chapter-end-bg" aria-hidden>
        {background && <img src={assetUrl(background)} alt="" draggable={false} />}
        <div className="chapter-end-grid" />
      </div>
      <div className="chapter-end-text">
        <h1 className="chapter-end-title" data-text={n(textos.fin, chapter)}>
          {n(textos.fin, chapter)}
        </h1>
        {title && <p className="chapter-end-sub">{title}</p>}
      </div>
      <nav className="chapter-end-menu">
        <button onClick={click(() => setSoon(true))}>{textos.continuar}</button>
        <button onClick={click(onSave)}>{textos.guardar}</button>
        <button onClick={click(onTitle)}>{textos.inicio}</button>
      </nav>
      {soon && (
        <div className="chapter-soon-backdrop" onClick={() => setSoon(false)}>
          <div className="chapter-soon" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <p className="chapter-soon-label">{textos.proximo.estado}</p>
            <h2>{n(textos.proximo.titulo, chapter + 1)}</h2>
            <p className="chapter-soon-text">{textos.proximo.texto}</p>
            <button onClick={click(() => setSoon(false))}>{textos.proximo.cerrar}</button>
          </div>
        </div>
      )}
    </div>
  );
}
