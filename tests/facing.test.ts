import { describe, expect, it } from 'vitest';
import { flippedCharacters } from '../src/engine/facing';
import type { Character } from '../src/engine/types';

const jair: Character = { id: 'jair', sprite: 'sprites/jair/base.webp', pos: 'izquierda' };
const nikkiDer: Character = { id: 'nikki', sprite: 'sprites/nikki/base.webp', pos: 'derecha' };
const camiCentro: Character = { id: 'cami', sprite: 'sprites/cami/base.webp', pos: 'centro' };
const rikkaDer: Character = { id: 'rikka', sprite: 'sprites/rikka/base.webp', pos: 'derecha' };

describe('los personajes se miran entre sí', () => {
  it('Nikki a la derecha se voltea hacia Jair; Jair (de frente) no', () => {
    const f = flippedCharacters([jair, nikkiDer], ['Jair']);
    expect(f.has('nikki')).toBe(true);
    expect(f.has('jair')).toBe(false);
  });
  it('sola en pantalla no se voltea', () => {
    expect(flippedCharacters([nikkiDer], ['Nikki']).size).toBe(0);
  });
  it('Cami en el centro mira a quien le habla', () => {
    // Cami mira a la derecha en su imagen: si le habla Rikka (derecha) no se voltea; si le habla Jair (izquierda), sí.
    expect(flippedCharacters([jair, camiCentro, rikkaDer], ['Rikka']).has('cami')).toBe(false);
    expect(flippedCharacters([jair, camiCentro, rikkaDer], ['Jair']).has('cami')).toBe(true);
  });
  it('si habla Cami, mira a quien le habló antes', () => {
    expect(flippedCharacters([jair, camiCentro, rikkaDer], ['Rikka', 'Cami']).has('cami')).toBe(false);
    expect(flippedCharacters([jair, camiCentro, rikkaDer], ['Jair', 'Cami']).has('cami')).toBe(true);
  });
  it('los placeholders no se voltean', () => {
    const box: Character = { id: 'monstruo', sprite: 'PLACEHOLDER:monstruo', pos: 'derecha' };
    expect(flippedCharacters([jair, box], ['Jair']).size).toBe(0);
  });
});

describe('hablantes sin nombre', () => {
  it('«???» es el personaje en escena que todavía no habló con su nombre', () => {
    // Rikka habla como «???» antes de presentarse: Cami (centro) la mira a ella, no a Jair.
    const speakers = ['Jair', 'Cami', '???'];
    expect(flippedCharacters([jair, camiCentro, rikkaDer], speakers).has('cami')).toBe(false);
  });
});
