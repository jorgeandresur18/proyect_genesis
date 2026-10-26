import { describe, expect, it } from 'vitest';
import { flippedCharacters } from '../src/engine/facing';
import type { Character } from '../src/engine/types';

const jorge: Character = { id: 'jorge', sprite: 'sprites/jorge/base.webp', pos: 'izquierda' };
const nikkiDer: Character = { id: 'nikki', sprite: 'sprites/nikki/base.webp', pos: 'derecha' };
const camiCentro: Character = { id: 'cami', sprite: 'sprites/cami/base.webp', pos: 'centro' };
const rikkaDer: Character = { id: 'rikka', sprite: 'sprites/rikka/base.webp', pos: 'derecha' };

describe('los personajes se miran entre sí', () => {
  it('Nikki a la derecha se voltea hacia Jorge; Jorge (de frente) no', () => {
    const f = flippedCharacters([jorge, nikkiDer], ['Jorge']);
    expect(f.has('nikki')).toBe(true);
    expect(f.has('jorge')).toBe(false);
  });
  it('sola en pantalla no se voltea', () => {
    expect(flippedCharacters([nikkiDer], ['Nikki']).size).toBe(0);
  });
  it('Cami en el centro mira a quien le habla', () => {
    // Cami mira a la derecha en su imagen: si le habla Rikka (derecha) no se voltea; si le habla Jorge (izquierda), sí.
    expect(flippedCharacters([jorge, camiCentro, rikkaDer], ['Rikka']).has('cami')).toBe(false);
    expect(flippedCharacters([jorge, camiCentro, rikkaDer], ['Jorge']).has('cami')).toBe(true);
  });
  it('si habla Cami, mira a quien le habló antes', () => {
    expect(flippedCharacters([jorge, camiCentro, rikkaDer], ['Rikka', 'Cami']).has('cami')).toBe(false);
    expect(flippedCharacters([jorge, camiCentro, rikkaDer], ['Jorge', 'Cami']).has('cami')).toBe(true);
  });
  it('los placeholders no se voltean', () => {
    const box: Character = { id: 'monstruo', sprite: 'PLACEHOLDER:monstruo', pos: 'derecha' };
    expect(flippedCharacters([jorge, box], ['Jorge']).size).toBe(0);
  });
});
