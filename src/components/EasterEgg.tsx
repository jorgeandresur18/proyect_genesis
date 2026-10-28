import { useEffect, useState } from 'react';
import { assetUrl } from '../engine/assets';
import { localized, useLang, useT } from '../engine/i18n';
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

/** Escribe una línea letra por letra, como en los diálogos del juego, con su sonido. */
function useTypewriter(line: string): { shown: string; done: boolean; skip: () => void } {
  const speed = useStore((s) => s.settings.textSpeed);
  const [count, setCount] = useState(speed >= TEXT_SPEED_INSTANT ? line.length : 0);

  useEffect(() => {
    if (speed >= TEXT_SPEED_INSTANT) {
      setCount(line.length);
      return;
    }
    setCount(0);
    const start = performance.now();
    let frame = 0;
    startTyping();
    const tick = (now: number) => {
      const n = Math.floor(((now - start) / 1000) * speed);
      if (n >= line.length) {
        setCount(line.length);
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
  }, [line, speed]);

  return {
    shown: line.slice(0, count),
    done: count >= line.length,
    skip: () => {
      stopTyping();
      setCount(line.length);
    },
  };
}

/**
 * Easter egg del título (69 clics en el logo): Nikki aparece sobre la pantalla oscurecida y no deja usar el
 * menú hasta que le respondas. Habla línea por línea con «Siguiente». «En otro momento»: se pone celosa y se
 * va con un glitch. «Donar»: abre PayPal, agradece y se va.
 */
export function EasterEgg({ phase, onGone }: { phase: EggPhase; onGone: () => void }) {
  if (phase !== 'on') return null;
  return <Nikki onGone={onGone} />;
}

function Nikki({ onGone }: { onGone: () => void }) {
  const egg = localized(eggEs, eggEn, useLang());
  const t = useT();
  const [reply, setReply] = useState<Reply>('ask');
  const [index, setIndex] = useState(0);
  const lines = reply === 'ask' ? egg.hola : [reply === 'later' ? egg.adios : egg.gracias];
  const line = lines[Math.min(index, lines.length - 1)];
  const { shown, done, skip } = useTypewriter(line);
  const last = index >= lines.length - 1;
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

  const answer = (r: Reply) => {
    setIndex(0);
    setReply(r);
  };

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
          <p>
            {shown}
            <span className="dialog-hidden">{line.slice(shown.length)}</span>
          </p>
          {reply === 'ask' && (
            <div className="egg-actions">
              {!last || !done ? (
                <button
                  className={`dialog-advance egg-next ${done ? 'dialog-advance-ready' : ''}`}
                  onClick={() => (done ? setIndex((i) => i + 1) : skip())}
                >
                  {done ? t('dialogo.siguiente') : t('dialogo.mostrar_todo')}
                </button>
              ) : (
                <>
                  {paypal && (
                    <a
                      className="egg-donate"
                      href={paypal}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playSelect();
                        answer('thanks');
                      }}
                    >
                      {egg.donar}
                    </a>
                  )}
                  <button
                    className="egg-later"
                    onClick={() => {
                      playCancel();
                      answer('later');
                    }}
                  >
                    {egg.despues}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
