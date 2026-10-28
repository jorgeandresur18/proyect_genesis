import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../engine/store';
import { playSelect } from '../engine/sound';
import textosEs from '../data/pantalla_final.json';
import textosEn from '../data/en/pantalla_final.json';
import { localized, useLang } from '../engine/i18n';

interface Props {
  /** Nombre del final (src/data/registro_finales.json). */
  name: string;
  /** La última escena: se ve mientras se funde a negro. */
  lastScene: ReactNode;
  /** Vuelve al título con fundido a negro. */
  onTitle: () => void;
}

const FADE_MS = 1800;

/** Bad end: fundido a negro, «BAD END» y el nombre del final en rojo con glitch, y el botón para volver al menú. */
export function BadEnd({ name, lastScene, onTitle }: Props) {
  const still = useStore((s) => s.settings.reduceEffects);
  const textos = localized(textosEs, textosEn, useLang());
  const [faded, setFaded] = useState(false);

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

  return (
    <div className={`screen bad-end ${still ? 'bad-end-still' : ''}`}>
      <div className="bad-end-scan" aria-hidden />
      <p className="bad-end-label">{textos.etiqueta}</p>
      <h1 className="bad-end-title" data-text={name}>
        {name}
      </h1>
      <button
        className="bad-end-button"
        onClick={() => {
          playSelect();
          onTitle();
        }}
      >
        {textos.volver}
      </button>
    </div>
  );
}
