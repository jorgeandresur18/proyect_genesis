// Bootcamp Genesis (src/data/bootcamp/): que cada clase exista y se pueda resolver, que sus sprites existan,
// que los niveles se desbloqueen con escenas reales y que las estrellas y el progreso se guarden bien.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURSO, LECCIONES, NIVELES, TODAS, codigoDiploma, estrellas, finesDe } from '../src/engine/bootcamp';
import conoceMas from '../src/data/conoce_mas.json';
import { useStore } from '../src/engine/store';

type Comentario = { quien: string; texto: string; sprite?: string; respuesta?: Comentario };
const sprite = (s: string) => expect(existsSync(`public/${s}`), s).toBe(true);

describe('bootcamp', () => {
  it('cada clase de los niveles tiene su archivo, sin repetidas ni sueltas', () => {
    expect(new Set(TODAS).size).toBe(TODAS.length);
    for (const id of TODAS) expect(LECCIONES[id], id).toBeTruthy();
    for (const id of Object.keys(LECCIONES)) expect(TODAS, `${id} está en un nivel`).toContain(id);
  });

  it('el nivel N se abre al terminar el Capítulo N; los colores van del verde al rojo', () => {
    NIVELES.forEach((n, i) => {
      expect(n.capitulo, n.id).toBe(i + 1);
      expect(n.color, n.id).toMatch(/^#[0-9a-f]{6}$/);
      // Un nivel con clases tiene que poder abrirse: su capítulo existe y tiene escena final.
      if (n.lecciones.length) expect(finesDe(n.capitulo).length, `${n.id}: fin del Capítulo ${n.capitulo}`).toBeGreaterThan(0);
    });
    expect(NIVELES[0].color).toBe('#3ddc84');
    expect(NIVELES.at(-1)!.color).toBe('#ff4d5e');
  });

  it('GENESIS dice la cifra de tokens (no la palabra «googol») y los 8.112 años', () => {
    const textos = [...CURSO.ide.asistente.respuestas, ...CURSO.ide.asistente.reacciones.map((r) => r.texto)].join(' ');
    expect(textos.toLowerCase()).not.toContain('googol');
    expect(textos).toContain('10.' + '000.'.repeat(32) + '000');
    expect(textos).toContain('8.112 años');
  });

  it('las reseñas del curso: de 1 a 5 estrellas, con texto', () => {
    expect(CURSO.resenas.length).toBeGreaterThan(5);
    for (const r of CURSO.resenas) {
      expect(r.estrellas).toBeGreaterThanOrEqual(1);
      expect(r.estrellas).toBeLessThanOrEqual(5);
      expect(r.texto.length).toBeGreaterThan(10);
    }
  });

  it('la introducción, los retratos y el asistente', () => {
    expect(CURSO.introduccion[0].quien).toBe('Jair');
    for (const l of CURSO.introduccion) sprite(l.sprite);
    for (const s of Object.values(CURSO.ide.retratos)) sprite(s);
    expect(CURSO.ide.asistente.respuestas.length).toBeGreaterThan(0);
    sprite('marca/logo_monitor.webp');
  });

  for (const l of Object.values(LECCIONES)) {
    it(`${l.id}: el ejercicio tiene una sola solución posible y todo existe`, () => {
      const e = l.ejercicio as Required<typeof l.ejercicio> & { reacciones: Record<string, (string | Comentario)[]> };
      const main = e.archivos.find((f) => f.ruta === e.principal);
      expect(main, 'el archivo principal existe').toBeTruthy();
      const inCode = [...main!.lineas.join('\n').matchAll(/\[\[(\d+)\]\]/g)].map((m) => m[1]).sort();
      expect(inCode).toEqual(Object.keys(e.huecos).sort());
      for (const [n, h] of Object.entries(e.huecos)) {
        expect(e.paleta, `la respuesta del hueco ${n} está en la paleta`).toContain(h.respuesta);
        expect(h.error).toContain('{valor}');
      }
      // La paleta tiene distractores (si no, no hay nada que pensar) y no repite palabras.
      expect(e.paleta.length).toBeGreaterThan(Object.keys(e.huecos).length);
      expect(new Set(e.paleta).size).toBe(e.paleta.length);
      expect(e.exito.length).toBeGreaterThan(0);
      const quienes = Object.keys(CURSO.ide.retratos);
      const todos: Comentario[] = [
        ...(e.al_abrir ?? []),
        ...(e.al_resolver ?? []),
        ...Object.entries(e.reacciones).flatMap(([quien, list]) =>
          list.flatMap((r) => (typeof r === 'string' ? [] : [{ quien, ...r }, ...(r.respuesta ? [r.respuesta] : [])])),
        ),
      ];
      for (const c of todos) {
        if (c.sprite) sprite(c.sprite);
        expect(quienes, `${c.quien} tiene retrato`).toContain(c.quien);
      }
      for (const linea of [...l.charla, ...l.cierre]) sprite(linea.sprite);
    });
  }

  it('estrellas: 3 sin fallos, 2 con uno o dos, 1 con más', () => {
    expect([0, 1, 2, 3, 10].map(estrellas)).toEqual([3, 2, 2, 1, 1]);
  });

  it('el progreso se guarda y se queda con las mejores estrellas', () => {
    const { markBootcamp } = useStore.getState();
    markBootcamp('variables', 2);
    markBootcamp('variables', 1);
    expect(useStore.getState().bootcampHechas.variables).toBe(2);
    markBootcamp('variables', 3);
    expect(useStore.getState().bootcampHechas.variables).toBe(3);
  });

  it('el diploma: código con cara de oficial, siempre el mismo una vez emitido', () => {
    const codigo = codigoDiploma('trainee', new Date(2026, 9, 30));
    expect(codigo).toMatch(/^BG-TRA-2026-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    const { emitirDiploma } = useStore.getState();
    emitirDiploma('trainee', 'BG-TRA-2026-AAAA-BBBB');
    emitirDiploma('trainee', 'BG-TRA-2026-CCCC-DDDD');
    expect(useStore.getState().bootcampDiplomas.trainee.codigo).toBe('BG-TRA-2026-AAAA-BBBB');
  });

  it('el nombre del alumno se guarda sin espacios de más', () => {
    useStore.getState().setBootcampNombre('  Kevin  ');
    expect(useStore.getState().bootcampNombre).toBe('Kevin');
  });

  it('el diploma lleva el repositorio y la página del autor (desde Conoce más)', () => {
    const urls = (conoceMas.enlaces as { url: string; en_diploma?: boolean }[]).filter((l) => l.en_diploma).map((l) => l.url);
    expect(urls.some((u) => u.includes('github.com'))).toBe(true);
    expect(urls.length).toBe(2);
    sprite('marca/bootcamp_logo.webp');
    sprite('marca/bootcamp_emblema.webp');
    sprite(CURSO.ide.asistente.icono);
    expect(existsSync('public/fonts/GreatVibes-Regular.ttf')).toBe(true);
  });

  it('GENESIS tiene un límite de preguntas por sesión (entre 20 y 30)', () => {
    expect(CURSO.ide.asistente.limite).toBeGreaterThanOrEqual(20);
    expect(CURSO.ide.asistente.limite).toBeLessThanOrEqual(30);
    expect(CURSO.ide.asistente.bloqueado.length).toBeGreaterThan(10);
  });
});
