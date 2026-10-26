import type { ReactNode } from 'react';
import styles from './aiVowels.module.css';

// Nombres que siguen la regla de las vocales (docs/CANON.md, sección 2).
const NAMES = /\b(Rikka|Cami|Sashi|Aylin)\b/g;

/** Devuelve el texto con las letras A e I resaltadas dentro de esos nombres. */
export function highlightAiVowels(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(NAMES)) {
    out.push(text.slice(last, m.index));
    [...m[0]].forEach((ch, i) => {
      out.push(/[aiAI]/.test(ch) ? <span key={`${m.index}-${i}`} className={styles.vowel}>{ch}</span> : ch);
    });
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}
