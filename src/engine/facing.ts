// Orientación de los sprites: los personajes se miran entre sí.
// - Los de los costados miran hacia el centro.
// - El del centro mira a quien le habla; si habla él, a quien le habló antes.
// Un sprite se voltea en espejo si su imagen mira hacia el lado contrario (src/data/orientacion.json).
import type { Character } from './types';
import orientacion from '../data/orientacion.json';

export type Side = 'izquierda' | 'derecha';
type Natural = Side | 'frente';

const byCharacter = orientacion.personajes as Record<string, Natural>;
const byExpression = orientacion.expresiones as Record<string, Natural>;

/** Hacia dónde mira la imagen original del sprite. */
function naturalFacing(c: Character): Natural | null {
  const m = c.sprite.match(/sprites\/([^/]+)\/([^/.]+)\./);
  if (!m) return null; // Placeholders: no se voltean.
  return byExpression[`${m[1]}/${m[2]}`] ?? byCharacter[m[1]] ?? null;
}

/** Id del personaje en escena que corresponde a un hablante («Nikki (afuera)» → nikki). */
function speakerId(speaker: string | null | undefined, onStage: Character[]): string | null {
  if (!speaker) return null;
  const s = speaker.toLowerCase();
  return onStage.find((c) => s.startsWith(c.id))?.id ?? null;
}

/**
 * Devuelve los ids de personajes que hay que voltear.
 * `speakers` son los hablantes del historial, del más viejo al actual (el último es la línea en pantalla).
 */
export function flippedCharacters(characters: Character[], speakers: (string | null)[]): Set<string> {
  const flipped = new Set<string>();
  if (characters.length < 2) return flipped;
  const sideOf = (id: string): Side | null => {
    const pos = characters.find((c) => c.id === id)?.pos;
    return pos === 'izquierda' || pos === 'derecha' ? pos : null;
  };
  const current = speakerId(speakers[speakers.length - 1], characters);

  for (const c of characters) {
    let want: Side | null = c.mira ?? null;
    if (!want && c.pos === 'izquierda') want = 'derecha';
    if (!want && c.pos === 'derecha') want = 'izquierda';
    if (!want && c.pos === 'centro') {
      // Mira a quien habla; si habla él (o es narración), a quien habló antes.
      let target = current && current !== c.id ? current : null;
      for (let i = speakers.length - 2; !target && i >= 0; i--) {
        const id = speakerId(speakers[i], characters);
        if (id && id !== c.id) target = id;
      }
      want = (target ? sideOf(target) : null) ?? (characters.some((o) => o.pos === 'izquierda') ? 'izquierda' : null);
    }
    const natural = naturalFacing(c);
    if (want && natural && natural !== 'frente' && natural !== want) flipped.add(c.id);
  }
  return flipped;
}
