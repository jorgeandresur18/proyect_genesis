// Orientación de los sprites: los personajes se miran entre sí.
// - Los de los costados miran hacia el centro.
// - El del centro mira a quien le habla, con inercia (ver centerFacing).
// Un sprite se voltea en espejo si su imagen mira hacia el lado contrario (src/data/orientacion.json).
import type { Character } from './types';
import orientacion from '../data/orientacion.json';
import { isPlaceholder } from './assets';

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

/**
 * Id del personaje en escena que corresponde a un hablante («Nikki (afuera)» → nikki).
 * Un hablante «???» es el único personaje en escena que todavía no habló con su nombre.
 */
function speakerId(speaker: string | null | undefined, onStage: Character[], all: (string | null)[]): string | null {
  if (!speaker) return null;
  const s = speaker.toLowerCase();
  const named = onStage.find((c) => s.startsWith(c.id))?.id;
  if (named) return named;
  if (!s.startsWith('???')) return null;
  const spoke = new Set(all.map((x) => x?.toLowerCase() ?? ''));
  const unnamed = onStage.filter((c) => !isPlaceholder(c.sprite) && ![...spoke].some((x) => x.startsWith(c.id)));
  return unnamed.length === 1 ? unnamed[0].id : null;
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
  /**
   * El del centro mira hacia quien le habla, con inercia: solo cambia de lado cuando el otro lado habla
   * dos veces seguidas. Sus propias líneas y la narración no cuentan. Así no gira en cada línea de un
   * ida y vuelta entre los dos costados.
   */
  const centerFacing = (self: string): Side | null => {
    let facing: Side | null = null;
    let streak = 0;
    for (const sp of speakers.slice(-60)) {
      const id = speakerId(sp, characters, speakers);
      const side = id && id !== self ? sideOf(id) : null;
      if (!side) continue;
      if (facing === null || side === facing) {
        facing = side;
        streak = 0;
      } else if (++streak >= 2) {
        facing = side;
        streak = 0;
      }
    }
    return facing ?? (characters.some((o) => o.pos === 'izquierda') ? 'izquierda' : null);
  };

  for (const c of characters) {
    let want: Side | null = c.mira ?? null;
    if (!want && c.pos === 'izquierda') want = 'derecha';
    if (!want && c.pos === 'derecha') want = 'izquierda';
    if (!want && c.pos === 'centro') want = centerFacing(c.id);
    const natural = naturalFacing(c);
    if (want && natural && natural !== 'frente' && natural !== want) flipped.add(c.id);
  }
  return flipped;
}
