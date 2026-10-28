import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Scene } from '../engine/types';
import glitch from '../effects/glitch.module.css';
import { assetUrl, isPlaceholder, screenOf } from '../engine/assets';
import { CodeScreen } from './CodeScreen';
import volteadas from '../data/volteadas.json';
import { flippedCharacters } from '../engine/facing';
import { BASE_CANVAS, canvasHeight, statureOf } from '../engine/stature';

interface Props {
  scene: Scene;
  effects: string[];
  /** Hablantes del historial, del más viejo a la línea actual (para que los personajes se miren). */
  speakers: (string | null)[];
  /** Historial de diálogo (para las pantallas en código: consola de GENESIS, mensajes). */
  lines: { speaker: string | null; text: string; choice?: boolean }[];
  children: ReactNode;
}

// Tamaño en pantalla de un sprite de 1,65 m sin enemigos en escena (porcentaje del alto y del ancho del escenario).
const SPRITE_HEIGHT = 92;
const SPRITE_MAX_WIDTH = 45;

/** Si un sprite que hay que voltear tiene su versión dibujada en espejo (`<expresión>_volteada`), se usa esa. */
const MIRRORED = volteadas as Record<string, string>;
function mirroredSprite(sprite: string): string | null {
  const m = sprite.match(/^sprites\/([^/]+\/[^/.]+)\.webp$/);
  const v = m && MIRRORED[m[1]];
  return v ? `sprites/${v}.webp` : null;
}

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
          <CodeScreen id={screen} lines={lines} accion={scene.accion_pantalla} />
        ) : scene.background && !isPlaceholder(scene.background) && !scene.video_fondo ? (
          <Backdrop src={assetUrl(scene.background)} />
        ) : (
          <span className="placeholder-label">
            {scene.video_fondo
              ? `${scene.video_fondo}${scene.loop_video ? ' (loop)' : ''}`
              : scene.background ?? 'sin fondo'}
          </span>
        )}
        {/* Solo los audios provisionales muestran su nombre (los reales ya suenan). */}
        {scene.audio && isPlaceholder(scene.audio) && <span className="placeholder-audio">♪ {scene.audio}</span>}
      </div>
      <div className="stage-characters">
        {scene.characters.map((c) => {
          const mirrored = flipped.has(c.id) ? mirroredSprite(c.sprite) : null;
          return isPlaceholder(c.sprite) ? (
            <div
              key={c.id}
              className={`sprite sprite-placeholder sprite-${c.pos}`}
              // Misma escala que un sprite real: así el placeholder ya muestra la estatura del personaje.
              style={{ height: `${SPRITE_HEIGHT * size(c.id)}%`, width: 'auto', aspectRatio: '3 / 4', maxWidth: `${SPRITE_MAX_WIDTH * size(c.id)}%` }}
            >
              <span className="placeholder-label">{c.sprite}</span>
            </div>
          ) : (
            <Sprite
              key={c.id}
              className={`sprite sprite-${c.pos} ${flipped.has(c.id) && !mirrored ? 'sprite-flip' : ''}`}
              style={{ height: `${SPRITE_HEIGHT * size(c.id)}%`, maxWidth: `${SPRITE_MAX_WIDTH * size(c.id)}%` }}
              src={assetUrl(mirrored ?? c.sprite)}
            />
          );
        })}
      </div>
      {children}
    </div>
  );
}

// Duración del cambio de expresión: 180 ms de la nueva + la anterior que se va desde los 150 ms (ver styles.css).
const SWAP_MS = 320;

interface Shown {
  src: string;
  className: string;
}

/**
 * Sprite de un personaje. Cuando cambia de expresión, la nueva se funde encima de la anterior, que se queda
 * opaca debajo hasta que la nueva termina de aparecer: así no se transparenta el fondo (no hay parpadeo).
 * La anterior también espera a que la nueva cargue, así nunca queda un hueco.
 */
function Sprite({ src, className, style }: { src: string; className: string; style: CSSProperties }) {
  const [current, setCurrent] = useState<Shown>({ src, className });
  const [previous, setPrevious] = useState<Shown | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Hasta el primer cambio de expresión, el sprite tiene la animación de entrada a escena.
  const [entered, setEntered] = useState(false);
  if (src !== current.src) {
    // Cambio de expresión: la que estaba pasa abajo y la nueva espera a cargar.
    setPrevious(current);
    setCurrent({ src, className });
    setLoaded(false);
    setEntered(true);
  } else if (className !== current.className) {
    setCurrent({ src, className });
  }
  const swapping = previous !== null;
  // Cuando la nueva ya cargó y terminó su fundido, la anterior se quita.
  useEffect(() => {
    if (!loaded || !previous) return;
    const t = setTimeout(() => setPrevious(null), SWAP_MS);
    return () => clearTimeout(t);
  }, [loaded, previous]);
  return (
    <>
      {previous && (
        <img
          className={`${previous.className} sprite-hold ${loaded ? 'sprite-leave' : ''}`}
          style={style}
          src={previous.src}
          alt=""
          draggable={false}
          aria-hidden
        />
      )}
      <img
        key={current.src}
        className={`${current.className} ${swapping ? (loaded ? 'sprite-swap' : 'sprite-loading') : entered ? '' : 'sprite-enter'}`}
        style={style}
        src={current.src}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}

// Duración del fundido entre fondos (igual que en styles.css).
const BG_SWAP_MS = 700;

/**
 * Fondo de imagen. Al cambiar de lugar, el nuevo se funde encima del anterior, y solo cuando terminó de
 * cargar: así nunca se ve el fondo viejo con los personajes de la escena nueva por una descarga lenta.
 */
function Backdrop({ src }: { src: string }) {
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  if (src !== current) {
    setPrevious(current);
    setCurrent(src);
    setLoaded(false);
  }
  useEffect(() => {
    if (!loaded || !previous) return;
    const t = setTimeout(() => setPrevious(null), BG_SWAP_MS);
    return () => clearTimeout(t);
  }, [loaded, previous]);
  return (
    <>
      {previous && <img className="stage-bg-img" src={previous} alt="" draggable={false} aria-hidden />}
      <img
        key={current}
        className={`stage-bg-img ${previous ? (loaded ? 'stage-bg-in' : 'stage-bg-loading') : ''}`}
        src={current}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
