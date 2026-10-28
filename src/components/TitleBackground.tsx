import { useMemo } from 'react';
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
// Partículas que cruzan la pantalla: desde la izquierda o desde arriba.
const COMETS = [
  { axis: 'x', at: 18, color: 'plata', delay: 0 },
  { axis: 'x', at: 62, color: 'acero', delay: 4.5 },
  { axis: 'y', at: 30, color: 'acero', delay: 2 },
  { axis: 'y', at: 78, color: 'plata', delay: 7 },
] as const;

/** Fondo del título: espacio negro con estrellas, nebulosas, cuadrícula y elementos flotando. */
export function TitleBackground() {
  const still = useStore((s) => s.settings.reduceEffects);
  const { stars, hexes } = useMemo(() => {
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
        acero: rnd() < 0.45,
      })),
    };
  }, []);

  return (
    <div className={`${styles.bg} ${still ? styles.still : ''}`} aria-hidden>
      <div className={styles.grid} />
      <div className={`${styles.nebula} ${styles.nebulaPlata}`} />
      <div className={`${styles.nebula} ${styles.nebulaAcero}`} />
      <div className={styles.vignette} />
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
          className={`${styles.hex} ${h.acero ? styles.hexAcero : ''}`}
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
          className={`${styles.comet} ${c.axis === 'x' ? styles.cometX : styles.cometY} ${c.color === 'acero' ? styles.cometAcero : ''}`}
          style={{ [c.axis === 'x' ? 'top' : 'left']: `${c.at}%`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  );
}
