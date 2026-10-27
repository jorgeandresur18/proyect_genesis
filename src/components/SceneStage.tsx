import type { ReactNode } from 'react';
import type { Scene } from '../engine/types';
import glitch from '../effects/glitch.module.css';
import { assetUrl, isPlaceholder, screenOf } from '../engine/assets';
import { CodeScreen } from './CodeScreen';
import { flippedCharacters } from '../engine/facing';
import { BASE_CANVAS, canvasHeight, statureOf } from '../engine/stature';

interface Props {
  scene: Scene;
  effects: string[];
  /** Hablantes del historial, del más viejo a la línea actual (para que los personajes se miren). */
  speakers: (string | null)[];
  /** Historial de diálogo (para las pantallas en código: consola de GENESIS, mensajes). */
  lines: { speaker: string | null; text: string }[];
  children: ReactNode;
}

// Tamaño en pantalla de un sprite de 1,65 m sin enemigos en escena (porcentaje del alto y del ancho del escenario).
const SPRITE_HEIGHT = 92;
const SPRITE_MAX_WIDTH = 45;

/** Fondo, video y personajes. En greyboxing todo se dibuja como cajas grises con su marcador. */
export function SceneStage({ scene, effects, speakers, lines, children }: Props) {
  const glitching = effects.includes('glitch');
  const flipped = flippedCharacters(scene.characters, speakers);
  // Todos a la misma escala; si hay alguien más alto que 1,65 m (un enemigo), la «cámara» se aleja para que entre entero.
  const heights = new Map(scene.characters.map((c) => [c.id, canvasHeight(statureOf(c))]));
  const camera = BASE_CANVAS / Math.max(BASE_CANVAS, ...heights.values());
  const size = (id: string) => (heights.get(id)! / BASE_CANVAS) * camera;
  const screen = scene.background && !scene.video_fondo ? screenOf(scene.background) : null;

  return (
    <div className={`stage ${glitching ? glitch.glitch : ''}`}>
      <div className="stage-bg">
        {screen !== null ? (
          <CodeScreen id={screen} lines={lines} />
        ) : scene.background && !isPlaceholder(scene.background) && !scene.video_fondo ? (
          <img className="stage-bg-img" src={assetUrl(scene.background)} alt="" draggable={false} />
        ) : (
          <span className="placeholder-label">
            {scene.video_fondo
              ? `${scene.video_fondo}${scene.loop_video ? ' (loop)' : ''}`
              : scene.background ?? 'sin fondo'}
          </span>
        )}
        {scene.audio && <span className="placeholder-audio">♪ {scene.audio}</span>}
      </div>
      <div className="stage-characters">
        {scene.characters.map((c) =>
          isPlaceholder(c.sprite) ? (
            <div
              key={c.id}
              className={`sprite sprite-placeholder sprite-${c.pos}`}
              // Misma escala que un sprite real: así el placeholder ya muestra la estatura del personaje.
              style={{ height: `${SPRITE_HEIGHT * size(c.id)}%`, width: 'auto', aspectRatio: '3 / 4', maxWidth: `${SPRITE_MAX_WIDTH * size(c.id)}%` }}
            >
              <span className="placeholder-label">{c.sprite}</span>
            </div>
          ) : (
            <img
              key={c.id}
              className={`sprite sprite-${c.pos} ${flipped.has(c.id) ? 'sprite-flip' : ''}`}
              style={{ height: `${SPRITE_HEIGHT * size(c.id)}%`, maxWidth: `${SPRITE_MAX_WIDTH * size(c.id)}%` }}
              src={assetUrl(c.sprite)}
              alt=""
              draggable={false}
            />
          ),
        )}
      </div>
      {children}
    </div>
  );
}
