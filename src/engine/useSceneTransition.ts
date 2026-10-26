import { useEffect, useState } from 'react';
import type { Scene } from './types';

export type TransitionPhase = 'idle' | 'out' | 'in';
export type TransitionColor = 'negro' | 'blanco';

/** Duraciones (ms) de cada tipo de transición: oscurecer/aclarar y volver a aparecer. */
export const TRANSITIONS: Record<TransitionColor, { out: number; in: number }> = {
  negro: { out: 350, in: 450 },
  blanco: { out: 1200, in: 1600 },
};

/**
 * Transición entre escenas: si cambia el fondo, la pantalla funde a negro, se cambia la escena y vuelve a
 * aparecer. Una escena con `transicion: "blanco"` entra con un fundido largo a blanco.
 * Devuelve la escena que hay que mostrar (atrasada durante el fundido), la fase y el color.
 * Con `instant` (p. ej. «Saltar leído») el cambio es inmediato.
 */
export function useSceneTransition(scene: Scene | null, instant: boolean) {
  const [shown, setShown] = useState<Scene | null>(scene);
  // Al entrar al juego (nueva partida o carga) la escena aparece desde negro.
  const [phase, setPhase] = useState<TransitionPhase>('in');
  const [color, setColor] = useState<TransitionColor>('negro');

  useEffect(() => {
    if (!scene) return;
    if (!shown || scene.scene_id === shown.scene_id) {
      if (!shown) setShown(scene);
      return;
    }
    if (instant || (!scene.transicion && scene.background === shown.background)) {
      setShown(scene);
      return;
    }
    const kind = scene.transicion ?? 'negro';
    setColor(kind);
    setPhase('out');
    const t = setTimeout(() => {
      setShown(scene);
      setPhase('in');
    }, TRANSITIONS[kind].out);
    return () => clearTimeout(t);
    // `shown` no va en las dependencias: solo se reacciona al cambio de escena del motor.
  }, [scene, instant]);

  useEffect(() => {
    if (phase !== 'in') return;
    const t = setTimeout(() => setPhase('idle'), TRANSITIONS[color].in);
    return () => clearTimeout(t);
  }, [phase, color]);

  return { shown: shown ?? scene, phase, color };
}
