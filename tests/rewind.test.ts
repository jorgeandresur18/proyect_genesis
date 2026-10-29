// Retroceder: vuelve a la línea anterior y deshace las decisiones (escena, variables e historial).
import { describe, expect, it } from 'vitest';
import { useStore } from '../src/engine/store';

describe('retroceder', () => {
  it('vuelve línea por línea y deshace una decisión', () => {
    const s = useStore.getState();
    s.newGame('cap01_019');
    const start = useStore.getState().game!;
    expect(start.trail).toEqual([]);
    expect(useStore.getState().back()).toBe(false); // Al principio no hay adónde volver.

    useStore.getState().choose(1); // «noche: sin_bar»
    const after = useStore.getState().game!;
    expect(after.vars.noche).toBe('sin_bar');
    useStore.getState().advance();
    expect(useStore.getState().game!.trail).toHaveLength(2);

    expect(useStore.getState().back()).toBe(true);
    expect(useStore.getState().game!.sceneId).toBe(after.sceneId);
    expect(useStore.getState().back()).toBe(true);
    const back = useStore.getState().game!;
    expect(back.sceneId).toBe('cap01_019');
    expect(back.vars.noche).toBe(start.vars.noche);
    expect(back.history).toEqual(start.history);
  });
});
