import type { ReactNode } from 'react';
import type { Scene } from '../engine/types';
import glitch from '../effects/glitch.module.css';
import { assetUrl, isPlaceholder } from '../engine/assets';

interface Props {
  scene: Scene;
  effects: string[];
  children: ReactNode;
}

/** Fondo, video y personajes. En greyboxing todo se dibuja como cajas grises con su marcador. */
export function SceneStage({ scene, effects, children }: Props) {
  const glitching = effects.includes('glitch');
  return (
    <div className={`stage ${glitching ? glitch.glitch : ''}`}>
      <div className="stage-bg">
        <span className="placeholder-label">
          {scene.video_fondo
            ? `${scene.video_fondo}${scene.loop_video ? ' (loop)' : ''}`
            : scene.background ?? 'sin fondo'}
        </span>
        {scene.audio && <span className="placeholder-audio">♪ {scene.audio}</span>}
      </div>
      <div className="stage-characters">
        {scene.characters.map((c) =>
          isPlaceholder(c.sprite) ? (
            <div key={c.id} className={`sprite sprite-placeholder sprite-${c.pos}`}>
              <span className="placeholder-label">{c.sprite}</span>
            </div>
          ) : (
            <img key={c.id} className={`sprite sprite-${c.pos}`} src={assetUrl(c.sprite)} alt="" draggable={false} />
          ),
        )}
      </div>
      {children}
    </div>
  );
}
