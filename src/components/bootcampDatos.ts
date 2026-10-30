// Bootcamp Genesis: las clases (y su inglés). Van con la pantalla del Bootcamp, que se carga recién al abrirla;
// el motor (engine/bootcamp.ts) solo necesita los niveles para los desbloqueos.
import { useLang } from '../engine/i18n';
import { cursoDe, mezclar, type Curso, type Leccion } from '../engine/bootcamp';
import type { CoffeeExercise } from './CoffeeIDE';

const ES = import.meta.glob<Leccion>('../data/bootcamp/lecciones/*.json', { eager: true, import: 'default' });
const EN = import.meta.glob<Partial<Leccion>>('../data/en/bootcamp/lecciones/*.json', { eager: true, import: 'default' });
const porId = (list: Leccion[]) => Object.fromEntries(list.map((l) => [l.id, l]));
export const LECCIONES_ES: Record<string, Leccion> = porId(Object.values(ES));
export const LECCIONES_EN: Record<string, Leccion> = porId(
  Object.entries(ES).map(([path, l]) => mezclar(l, EN[path.replace('/data/bootcamp/', '/data/en/bootcamp/')])),
);

/** El ejercicio de una clase con lo común del curso (comando, textos del IDE, asistente, retratos…). */
export const ejercicioDe = (curso: Curso, l: Leccion) =>
  ({
    ...curso.ide,
    ...l.ejercicio,
    textos: { ...curso.ide.textos, ...l.ejercicio.textos },
    retratos: { ...curso.ide.retratos, ...l.ejercicio.retratos },
  }) as CoffeeExercise;

/** El curso y las clases en el idioma del juego. */
export function useCurso() {
  const lang = useLang();
  const CURSO = cursoDe(lang);
  return { CURSO, tx: CURSO.textos, LECCIONES: lang === 'en' ? LECCIONES_EN : LECCIONES_ES };
}
