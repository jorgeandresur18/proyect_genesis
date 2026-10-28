// Idiomas del juego: español e inglés.
// - El idioma «automático» sale del navegador, que normalmente usa el del sistema operativo. En una versión de
//   escritorio (p. ej. empaquetada para Steam), aquí se leería directamente el idioma del sistema.
// - Los textos de la interfaz están en src/data/i18n/<idioma>.json. Los textos de pantallas y menús que viven en
//   otros JSON (advertencia, correo, fin de capítulo…) tienen su versión en inglés en src/data/en/, que solo
//   reemplaza lo que traduce (ver `localized`).
// - El guion de los capítulos todavía está solo en español.
import { useStore } from './store';
import es from '../data/i18n/es.json';
import en from '../data/i18n/en.json';

export type Lang = 'es' | 'en';
export type LangSetting = Lang | 'auto';

const DICTS: Record<Lang, Record<string, string>> = { es, en };

/** Idioma detectado y el código exacto del que salió (p. ej. «es-EC»), para mostrarlo en pantalla. */
export function detectLanguage(): { lang: Lang; code: string } {
  const list = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const code of list) {
    const base = code?.toLowerCase().slice(0, 2);
    if (base === 'es' || base === 'en') return { lang: base, code };
  }
  // Cualquier otro idioma: inglés, que lo entiende más gente.
  return { lang: 'en', code: list[0] ?? '' };
}

export function resolveLang(setting: LangSetting): Lang {
  return setting === 'auto' ? detectLanguage().lang : setting;
}

/** Idioma en uso (según Opciones; «automático» = el detectado). */
export function useLang(): Lang {
  return resolveLang(useStore((s) => s.settings.language));
}

/** Traduce una clave de la interfaz. `{n}` y demás marcadores se reemplazan con `vars`. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let text = DICTS[lang][key] ?? DICTS.es[key] ?? key;
  for (const [k, v] of Object.entries(vars ?? {})) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

export function useT() {
  const lang = useLang();
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

/** Mezcla la versión en inglés de un JSON sobre la original: los objetos se combinan; listas y textos se reemplazan. */
export function localized<T>(base: T, english: unknown, lang: Lang): T {
  if (lang === 'es' || english === undefined) return base;
  return merge(base, english) as T;
}

function merge(a: unknown, b: unknown): unknown {
  if (b === undefined) return a;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) out[k] = merge(out[k], v);
    return out;
  }
  return b;
}
