import type { Dialogue } from '../engine/types';
import { highlightAiVowels } from '../effects/aiVowels';

interface Props {
  dialogue: Dialogue | null;
  aiVowels: boolean;
  onAdvance: () => void;
}

export function DialogBox({ dialogue, aiVowels, onAdvance }: Props) {
  if (!dialogue) return null;
  const render = (t: string) => (aiVowels ? highlightAiVowels(t) : t);
  return (
    <div className="dialog" onClick={onAdvance} role="button" tabIndex={-1}>
      {dialogue.speaker && <div className="dialog-speaker">{render(dialogue.speaker)}</div>}
      <div className="dialog-text">{render(dialogue.text)}</div>
    </div>
  );
}
