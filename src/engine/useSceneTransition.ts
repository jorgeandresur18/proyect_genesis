import { useEffect, useState } from 'react';
import type { Scene } from './types';

export type TransitionPhase = 'idle' | 'out' | 'in';

export const FADE_OUT_MS = 350;
export const FADE_IN_MS = 450;

/**
 * Transición entre escenas: si cambia el fondo, la pantalla funde a negro, se cambia la escena y vuelve a
 * aparecer. Devuelve la escena que hay que mostrar (atrasada durante el fundido) y la fase actual.
 * Con `instant` (p. ej. «Saltar leído») el cambio es inmediato.
 */
export function useSceneTransition(scene: Scene | null, instant: boolean) {
  const [shown, setShown] = useState<Scene | null>(scene);
  // Al entrar al juego (nueva partida o carga) la escena aparece desde negro.
  const [phase, setPhase] = useState<TransitionPhase>('in');

  useEffect(() => {
    if (!scene) return;
    if (!shown || scene.scene_id === shown.scene_id) {
      if (!shown) setShown(scene);
      return;
    }
    if (instant || scene.background === shown.background) {
      setShown(scene);
      return;
    }
    setPhase('out');
    const t = setTimeout(() => {
      setShown(scene);
      setPhase('in');
    }, FADE_OUT_MS);
    return () => clearTimeout(t);
    // `shown` no va en las dependencias: solo se reacciona al cambio de escena del motor.
  }, [scene, instant]);

  useEffect(() => {
    if (phase !== 'in') return;
    const t = setTimeout(() => setPhase('idle'), FADE_IN_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return { shown: shown ?? scene, phase };
}
