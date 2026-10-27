import { useMemo, type CSSProperties } from 'react';
import { useStore } from '../engine/store';
import styles from './TitleBackground.module.css';

// Generador pseudoaleatorio con semilla fija: las estrellas quedan siempre en el mismo lugar.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const STARS = 140;
const HEXES = 7;
const SHAPES = 16;
// Figuras que nacen y se alejan en la variante negra (fin de capítulo).
const SHAPE_POINTS: Record<string, string> = {
  triangulo: '50,6 94,88 6,88',
  cuadrado: '12,12 88,12 88,88 12,88',
  rombo: '50,4 96,50 50,96 4,50',
  hexagono: '50,4 90,27 90,73 50,96 10,73 10,27',
};
const SHAPE_KINDS = [...Object.keys(SHAPE_POINTS), 'circulo'];
// Partículas que cruzan la pantalla: desde la izquierda o desde arriba, como en la landing del autor.
const COMETS = [
  { axis: 'x', at: 18, color: 'cyan', delay: 0 },
  { axis: 'x', at: 62, color: 'violet', delay: 4.5 },
  { axis: 'y', at: 30, color: 'violet', delay: 2 },
  { axis: 'y', at: 78, color: 'cyan', delay: 7 },
] as const;

/**
 * Fondo del título: espacio negro con estrellas, nebulosas, cuadrícula y elementos flotando.
 * `negro`: la misma estética pero todo en negro, con figuras geométricas que nacen y se alejan (fin de capítulo).
 */
export function TitleBackground({ negro = false }: { negro?: boolean }) {
  const still = useStore((s) => s.settings.reduceEffects);
  const { stars, hexes, shapes } = useMemo(() => {
    const rnd = seeded(20261024);
    return {
      stars: Array.from({ length: STARS }, () => ({
        left: rnd() * 100,
        top: rnd() * 100,
        size: rnd() < 0.85 ? 1 + rnd() * 1.2 : 2 + rnd() * 1.5,
        delay: rnd() * 4,
        duration: 2.4 + rnd() * 3,
      })),
      hexes: Array.from({ length: HEXES }, () => ({
        left: 5 + rnd() * 90,
        top: 5 + rnd() * 90,
        size: 28 + rnd() * 70,
        delay: rnd() * 6,
        duration: 9 + rnd() * 8,
        rotate: rnd() * 60,
        violet: rnd() < 0.45,
      })),
      shapes: Array.from({ length: SHAPES }, (_, i) => {
        const angle = rnd() * Math.PI * 2;
        const dist = 30 + rnd() * 45;
        return {
          kind: SHAPE_KINDS[i % SHAPE_KINDS.length],
          // Nacen cerca del centro y se alejan hacia afuera.
          dx: `${Math.cos(angle) * dist}vw`,
          dy: `${Math.sin(angle) * dist}vh`,
          size: 24 + rnd() * 90,
          delay: rnd() * 10,
          duration: 7 + rnd() * 6,
          spin: `${(rnd() < 0.5 ? -1 : 1) * (90 + rnd() * 270)}deg`,
          color: rnd() < 0.6 ? 'white' : rnd() < 0.5 ? 'cyan' : 'violet',
        };
      }),
    };
  }, []);

  return (
    <div className={`${styles.bg} ${negro ? styles.negro : ''} ${still ? styles.still : ''}`} aria-hidden>
      <div className={styles.grid} />
      {!negro && <div className={`${styles.nebula} ${styles.nebulaCyan}`} />}
      {!negro && <div className={`${styles.nebula} ${styles.nebulaViolet}`} />}
      {negro && <div className={styles.pulse} />}
      {negro &&
        shapes.map((f, i) => (
          <svg
            key={`f${i}`}
            className={`${styles.shape} ${styles[f.color]}`}
            viewBox="0 0 100 100"
            style={
              {
                width: f.size,
                height: f.size,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.duration}s`,
                '--dx': f.dx,
                '--dy': f.dy,
                '--spin': f.spin,
              } as CSSProperties
            }
          >
            {f.kind === 'circulo' ? <circle cx="50" cy="50" r="44" /> : <polygon points={SHAPE_POINTS[f.kind]} />}
          </svg>
        ))}
      {stars.map((s, i) => (
        <span
          key={i}
          className={styles.star}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
      {hexes.map((h, i) => (
        <svg
          key={i}
          className={`${styles.hex} ${h.violet ? styles.hexViolet : ''}`}
          viewBox="0 0 100 100"
          style={{
            left: `${h.left}%`,
            top: `${h.top}%`,
            width: h.size,
            height: h.size,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            rotate: `${h.rotate}deg`,
          }}
        >
          <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" />
        </svg>
      ))}
      {COMETS.map((c, i) => (
        <span
          key={i}
          className={`${styles.comet} ${c.axis === 'x' ? styles.cometX : styles.cometY} ${c.color === 'violet' ? styles.cometViolet : ''}`}
          style={{ [c.axis === 'x' ? 'top' : 'left']: `${c.at}%`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  );
}
