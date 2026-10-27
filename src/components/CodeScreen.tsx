import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import pantallas from '../data/pantallas.json';
import s from './CodeScreen.module.css';

interface Line {
  speaker: string | null;
  text: string;
  /** Decisión del jugador (el correo la usa para saber qué botón se apretó). */
  choice?: boolean;
}

interface Props {
  id: string;
  /** Historial de diálogo hasta la línea actual: de ahí salen la consola de GENESIS y los mensajes. */
  lines: Line[];
}

/** Fondos que no son imágenes: pantallas con texto que tiene que leerse bien (ver src/data/pantallas.json). */
export function CodeScreen({ id, lines }: Props) {
  switch (id) {
    case 'gravity_ide':
      return <GravityIde lines={lines} />;
    case 'pc_correo':
      return <Correo lines={lines} />;
    case 'celular_mensaje':
      return <Celular lines={lines} />;
    case 'nebulosa_magenta':
      return <Nebulosa />;
    default:
      return <div className={s.screen} style={{ background: '#000' }} />;
  }
}

function GravityIde({ lines }: { lines: Line[] }) {
  const ide = pantallas.gravity_ide;
  const voices = ide.voces as Record<string, string>;
  const consola = lines.filter((l) => l.speaker !== null && l.speaker in voices).slice(-14);
  return (
    <div className={`${s.screen} ${s.desk}`}>
      <div className={s.window}>
        <div className={s.titlebar}>
          <span className={s.dots}>
            <i /> <i /> <i />
          </span>
          <span>{ide.titulo}</span>
          <span className={s.online}>● GENESIS</span>
        </div>
        <div className={s.ideBody}>
          <ul className={s.tree}>
            {ide.archivos.map((f) => (
              <li key={f} className={f.endsWith('/') ? s.folder : ''}>
                {f}
              </li>
            ))}
          </ul>
          <div className={s.editor}>
            <div className={s.tab}>{ide.pestana}</div>
            <pre className={s.code}>
              {ide.codigo.map((c, i) => (
                <div key={i} className={c.startsWith('//') ? s.comment : ''}>
                  <span className={s.gutter}>{i + 1}</span>
                  {c}
                </div>
              ))}
            </pre>
          </div>
          <div className={s.console}>
            <div className={s.consoleHead}>{ide.consola}</div>
            <div className={s.consoleLines}>
              {consola.map((l, i) =>
                voices[l.speaker!] === 'usuario' ? (
                  <div key={i} className={s.user}>
                    <span className={s.prompt}>{ide.prompt}</span> {l.text}
                  </div>
                ) : (
                  <div key={i} className={s.genesis}>
                    {'> '}
                    {l.text.replace(/^>\s*/, '')}
                  </div>
                ),
              )}
              <span className={s.cursor}>▌</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ClickPhase = 'idle' | 'move' | 'press' | 'done';

/** Última decisión del jugador que corresponde a un botón del correo (índice en el historial y botón). */
function lastClick(lines: Line[], clics: Record<string, number>): { at: number; button: number } | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].choice && lines[i].text in clics) return { at: i, button: clics[lines[i].text] };
  }
  return null;
}

function Correo({ lines }: { lines: Line[] }) {
  const c = pantallas.pc_correo;
  const click = lastClick(lines, c.clics as Record<string, number>);
  // La animación corre justo después de elegir (la decisión es lo anterior a la línea actual);
  // si se vuelve a esta pantalla más tarde, ya se muestra el resultado.
  const live = click !== null && click.at === lines.length - 2;
  return <CorreoVentana key={click?.at ?? -1} button={click?.button ?? null} live={live} />;
}

function CorreoVentana({ button, live }: { button: number | null; live: boolean }) {
  const c = pantallas.pc_correo;
  const [phase, setPhase] = useState<ClickPhase>(button !== null && !live ? 'done' : 'idle');
  const buttonsRef = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLSpanElement>(null);
  const second = useRef<HTMLSpanElement>(null);
  const [spots, setSpots] = useState<{ idle: [number, number]; targets: [number, number][] } | null>(null);

  // Dónde está cada botón (relativo a su fila): el puntero va del medio de los dos al elegido.
  useLayoutEffect(() => {
    const row = buttonsRef.current;
    if (!row || !first.current || !second.current) return;
    const measure = () => {
      const r = row.getBoundingClientRect();
      const [a, b] = [first.current!.getBoundingClientRect(), second.current!.getBoundingClientRect()];
      const target = (x: DOMRect): [number, number] => [x.left - r.left + x.width * 0.55, x.top - r.top + x.height * 0.6];
      setSpots({ idle: [(a.right + b.left) / 2 - r.left, a.bottom - r.top + 4], targets: [target(a), target(b)] });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  // Secuencia del clic: el puntero viaja, aprieta y después se ve el resultado.
  useEffect(() => {
    if (button === null || !live) return;
    const timers = [
      setTimeout(() => setPhase('move'), 250),
      setTimeout(() => setPhase('press'), 1000),
      setTimeout(() => setPhase('done'), 1250),
    ];
    return () => timers.forEach(clearTimeout);
  }, [button, live]);

  const deleted = button === 1 && phase === 'done';
  const pos = spots && (phase === 'idle' || button === null ? spots.idle : spots.targets[button]);
  return (
    <div className={`${s.screen} ${s.desk}`}>
      <div className={`${s.window} ${s.light}`}>
        <div className={s.titlebar}>
          <span className={s.dots}>
            <i /> <i /> <i />
          </span>
          <span>{c.titulo}</span>
          <span />
        </div>
        <div className={s.mailBody}>
          <ul className={s.folders}>
            {c.carpetas.map((f, i) => (
              <li key={f} className={i === 0 ? s.selected : ''}>
                {f}
              </li>
            ))}
          </ul>
          <ul className={s.inbox}>
            {c.bandeja.map((m) => (
              <li key={m.asunto} className={`${'activo' in m ? s.selected : ''} ${'activo' in m && deleted ? s.gone : ''}`}>
                <b>{m.de}</b>
                <span>{m.asunto}</span>
              </li>
            ))}
          </ul>
          <div className={s.reading}>
            {deleted ? (
              <p className={s.empty}>{c.eliminado}</p>
            ) : (
              <>
                <h3>{c.asunto}</h3>
                <div className={s.from}>{c.remitente}</div>
                <div className={s.from}>{c.para}</div>
                {c.cuerpo.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                <div className={s.buttons} ref={buttonsRef}>
                  {c.botones.map((b, i) => (
                    <span
                      key={b}
                      ref={i === 0 ? first : second}
                      className={`${i === 0 ? s.primary : ''} ${button === i && phase === 'press' ? s.pressed : ''}`}
                    >
                      {b}
                    </span>
                  ))}
                  {pos && (
                    <svg
                      className={`${s.pointer} ${phase === 'press' ? s.pointerPress : ''}`}
                      style={{ left: pos[0], top: pos[1] }}
                      viewBox="0 0 16 24"
                      aria-hidden
                    >
                      <path d="M1 1v19l5-5 3.5 7.5 3-1.4L9 13.7h7z" />
                    </svg>
                  )}
                </div>
                {button === 0 && phase === 'done' && (
                  <div className={s.download}>
                    <span>{live ? c.descargando : c.descargado}</span>
                    <div className={s.bar}>
                      <i className={live ? s.barFill : s.barFull} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Celular({ lines }: { lines: Line[] }) {
  const c = pantallas.celular_mensaje;
  const mensajes = lines.filter((l) => l.speaker === c.voz).slice(-6);
  return (
    <div className={`${s.screen} ${s.night}`}>
      <div className={s.phone}>
        <div className={s.phoneHead}>
          <span className={s.avatar}>{c.contacto[0]}</span>
          <div>
            <b>{c.contacto}</b>
            <small>{c.estado}</small>
          </div>
        </div>
        <div className={s.chat}>
          <span className={s.day}>{c.dia}</span>
          {mensajes.map((m, i) => (
            <div key={i} className={s.bubble}>
              {m.text}
              <small>{c.hora}</small>
            </div>
          ))}
        </div>
        <div className={s.compose}>{c.escribir}</div>
      </div>
    </div>
  );
}

// Estrellas siempre en el mismo lugar (generador con semilla fija).
const STARS = (() => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 260 }, (_, i) => ({
    x: rand() * 100,
    y: rand() * 100,
    r: rand() < 0.9 ? 0.06 + rand() * 0.1 : 0.2 + rand() * 0.15,
    o: 0.35 + rand() * 0.65,
    twinkle: i % 9 === 0,
    delay: rand() * 4,
  }));
})();

function Nebulosa() {
  return (
    <div className={`${s.screen} ${s.nebula}`}>
      <svg className={s.stars} viewBox="0 0 100 56.25" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {STARS.map((st, i) => (
          <circle
            key={i}
            cx={st.x}
            cy={st.y * 0.5625}
            r={st.r}
            fill="#fff"
            opacity={st.o}
            className={st.twinkle ? s.twinkle : undefined}
            style={st.twinkle ? ({ animationDelay: `${st.delay}s` } as CSSProperties) : undefined}
          />
        ))}
      </svg>
    </div>
  );
}
