import { useEffect, useState } from 'react';
import { assetUrl } from '../engine/assets';
import { localized, useLang } from '../engine/i18n';
import { playCancel, playSelect, startTyping, stopTyping } from '../engine/sound';
import { TEXT_SPEED_INSTANT, useStore } from '../engine/store';
import eggEs from '../data/easter_egg.json';
import eggEn from '../data/en/easter_egg.json';
import conoceMas from '../data/conoce_mas.json';

export type EggPhase = 'off' | 'on' | 'gone';
type Reply = 'ask' | 'later' | 'thanks';

// Después de la última frase, cuánto espera Nikki y cuánto dura el glitch con el que se va.
const BYE_WAIT_MS = 1200;
const GLITCH_MS = 700;

const paypal = conoceMas.enlaces.find((l) => 'destacado' in l && l.destacado)?.url;

/** Escribe las líneas letra por letra, como en los diálogos del juego, con su sonido. */
function useTypewriter(lines: string[]): { shown: string[]; done: boolean } {
  const speed = useStore((s) => s.settings.textSpeed);
  const total = lines.reduce((n, l) => n + l.length, 0);
  const [count, setCount] = useState(speed >= TEXT_SPEED_INSTANT ? total : 0);
  const key = lines.join('\n');

  useEffect(() => {
    if (speed >= TEXT_SPEED_INSTANT) {
      setCount(total);
      return;
    }
    setCount(0);
    const start = performance.now();
    let frame = 0;
    startTyping();
    const tick = (now: number) => {
      const n = Math.floor(((now - start) / 1000) * speed);
      if (n >= total) {
        setCount(total);
        stopTyping();
        return;
      }
      setCount(n);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      stopTyping();
    };
    // Se reinicia solo si cambian las líneas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, speed]);

  let left = count;
  const shown = lines.map((l) => {
    const part = l.slice(0, Math.max(0, left));
    left -= l.length;
    return part;
  });
  return { shown, done: count >= total };
}

/**
 * Easter egg del título (69 clics en el logo): Nikki aparece sobre la pantalla oscurecida y no deja usar el
 * menú hasta que le respondas. «En otro momento»: se pone celosa y se va con un glitch. «Donar»: abre PayPal,
 * agradece y se va.
 */
export function EasterEgg({ phase, onGone }: { phase: EggPhase; onGone: () => void }) {
  if (phase !== 'on') return null;
  return <Nikki onGone={onGone} />;
}

function Nikki({ onGone }: { onGone: () => void }) {
  const egg = localized(eggEs, eggEn, useLang());
  const [reply, setReply] = useState<Reply>('ask');
  const lines = reply === 'ask' ? egg.hola : [reply === 'later' ? egg.adios : egg.gracias];
  const { shown, done } = useTypewriter(lines);
  const [leaving, setLeaving] = useState(false);

  // Después de responder: termina su frase, espera un momento y se va con un glitch.
  useEffect(() => {
    if (reply === 'ask' || !done) return;
    const a = setTimeout(() => setLeaving(true), BYE_WAIT_MS);
    const b = setTimeout(onGone, BYE_WAIT_MS + GLITCH_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reply, done, onGone]);

  return (
    <div className={`egg-backdrop ${leaving ? 'egg-backdrop-out' : ''}`} role="dialog" aria-modal>
      <div className={`egg ${leaving ? 'egg-bye' : ''}`}>
        <img
          className="egg-nikki"
          src={assetUrl(`sprites/nikki/${reply === 'later' ? 'celosa1' : 'tierna1'}.webp`)}
          alt=""
          draggable={false}
        />
        <div className="egg-bubble">
          <span className="egg-name">Nikki</span>
          {/* Lo que falta escribir ocupa su lugar sin verse: el globo no cambia de tamaño mientras habla. */}
          {lines.map((line, i) => (
            <p key={`${reply}${i}`}>
              {shown[i]}
              <span className="dialog-hidden">{line.slice(shown[i].length)}</span>
            </p>
          ))}
          {reply === 'ask' && done && (
            <div className="egg-actions">
              {paypal && (
                <a
                  className="egg-donate"
                  href={paypal}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    playSelect();
                    setReply('thanks');
                  }}
                >
                  {egg.donar}
                </a>
              )}
              <button
                className="egg-later"
                onClick={() => {
                  playCancel();
                  setReply('later');
                }}
              >
                {egg.despues}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
