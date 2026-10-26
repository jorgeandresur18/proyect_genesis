import type { Choice } from '../engine/types';

interface Props {
  choices: Choice[];
  onChoose: (index: number) => void;
}

export function DecisionMenu({ choices, onChoose }: Props) {
  return (
    <div className="decisions">
      {choices.map((c, i) => (
        <button
          key={i}
          className={`decision ${c.locked ? 'decision-locked' : ''}`}
          disabled={c.locked}
          onClick={() => onChoose(i)}
        >
          {c.text}
        </button>
      ))}
    </div>
  );
}
