import { useEffect } from 'react';
import { useStore } from './store';
import { scenes } from './story';
import { effectsOf, visibleChoices } from './logic';

const SKIP_DELAY_MS = 60;

/** Escena actual, decisiones visibles y temporizadores de autoavance y salto de texto leído. */
export function useStoryEngine() {
  const game = useStore((s) => s.game);
  const mode = useStore((s) => s.mode);
  const readScenes = useStore((s) => s.readScenes);
  const settings = useStore((s) => s.settings);
  const advance = useStore((s) => s.advance);
  const setMode = useStore((s) => s.setMode);

  const scene = game ? scenes.get(game.sceneId) ?? null : null;
  const choices = scene && game ? visibleChoices(scene, game.vars) : [];
  const waitingChoice = choices.length > 0;
  const effects = scene && !settings.reduceEffects ? effectsOf(scene) : [];

  useEffect(() => {
    if (!scene || game?.finished || waitingChoice || mode === 'normal') return;
    if (mode === 'skip' && !readScenes[scene.scene_id]) {
      // El salto se detiene en el primer texto no leído.
      setMode('normal');
      return;
    }
    const delay = mode === 'skip' ? SKIP_DELAY_MS : settings.autoDelayMs;
    const t = setTimeout(advance, delay);
    return () => clearTimeout(t);
  }, [scene, game?.finished, waitingChoice, mode, readScenes, settings.autoDelayMs, advance, setMode]);

  return { game, scene, choices, waitingChoice, effects, mode };
}
