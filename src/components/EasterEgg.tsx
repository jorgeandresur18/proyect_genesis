import { useEffect } from 'react';
import { assetUrl } from '../engine/assets';
import { localized, useLang } from '../engine/i18n';
import { playSelect } from '../engine/sound';
import eggEs from '../data/easter_egg.json';
import eggEn from '../data/en/easter_egg.json';
import conoceMas from '../data/conoce_mas.json';

export type EggPhase = 'off' | 'on' | 'bye' | 'gone';

// Cuánto se queda Nikki despidiéndose antes de desaparecer con el glitch.
const BYE_MS = 2600;
const GLITCH_MS = 700;

const paypal = conoceMas.enlaces.find((l) => 'destacado' in l && l.destacado)?.url;

/**
 * Easter egg del título (69 clics en el logo): Nikki pequeña con un globo de texto que pide una donación.
 * Se queda hasta que se recargue la página; si el jugador elige una opción del menú y vuelve, se despide y
 * desaparece con un glitch.
 */
export function EasterEgg({ phase, onGone }: { phase: EggPhase; onGone: () => void }) {
  const egg = localized(eggEs, eggEn, useLang());

  useEffect(() => {
    if (phase !== 'bye') return;
    const t = setTimeout(onGone, BYE_MS + GLITCH_MS);
    return () => clearTimeout(t);
  }, [phase, onGone]);

  if (phase === 'off' || phase === 'gone') return null;
  const bye = phase === 'bye';
  return (
    <div className={`egg ${bye ? 'egg-bye' : ''}`} style={{ animationDelay: bye ? `${BYE_MS}ms` : undefined }}>
      <img className="egg-nikki" src={assetUrl(`sprites/nikki/${bye ? 'celosa1' : 'tierna1'}.webp`)} alt="" draggable={false} />
      <div className="egg-bubble" key={phase}>
        {bye ? (
          <p>{egg.adios}</p>
        ) : (
          <>
            {egg.hola.map((line, i) => (
              <p key={i} className={i === egg.hola.length - 1 ? 'egg-joke' : ''}>
                {line}
              </p>
            ))}
            {paypal && (
              <a className="egg-donate" href={paypal} target="_blank" rel="noopener noreferrer" onClick={() => playSelect()}>
                {egg.donar}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
