import { useEffect } from 'react';
import type { Choice } from '../engine/types';

interface Props {
  choices: Choice[];
  onChoose: (index: number) => void;
}

/**
 * Menú de decisiones: oscurece la escena, se anuncia con «Elige» y muestra opciones grandes y numeradas.
 * También se elige con las teclas 1, 2, 3…
 */
export function DecisionMenu({ choices, onChoose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > choices.length || choices[n - 1].locked) return;
      e.preventDefault();
      onChoose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, onChoose]);

  return (
    <>
      <div className="decisions-dim" aria-hidden />
      <div className="decisions" role="menu">
        <p className="decisions-label">Elige</p>
        {choices.map((c, i) => (
          <button
            key={i}
            role="menuitem"
            className={`decision ${c.locked ? 'decision-locked' : ''}`}
            style={{ animationDelay: `${0.08 * i + 0.1}s` }}
            disabled={c.locked}
            onClick={() => onChoose(i)}
          >
            <span className="decision-key" aria-hidden>
              {i + 1}
            </span>
            <span className="decision-text">{c.text}</span>
          </button>
        ))}
      </div>
    </>
  );
}
