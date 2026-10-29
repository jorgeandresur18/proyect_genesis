import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import pantallasEs from '../data/pantallas.json';
import pantallasEn from '../data/en/pantallas.json';
import { localized, useLang } from '../engine/i18n';
import { assetUrl } from '../engine/assets';
import { lineText } from '../engine/storyText';
import s from './CodeScreen.module.css';

/** Textos de las pantallas en el idioma en uso. */
function usePantallas() {
  return localized(pantallasEs, pantallasEn, useLang());
}

interface Line {
  speaker: string | null;
  text: string;
  /** Decisión del jugador (el correo la usa para saber qué botón se apretó). */
  choice?: boolean;
  /** Escena de la línea, para mostrarla en el idioma en uso. */
  sid?: string;
}

interface Props {
  id: string;
  /** Acción automática de la escena (el correo se borra o se descarga solo, con el puntero). */
  accion?: 'eliminar' | 'descargar';
  /** Historial de diálogo hasta la línea actual: de ahí salen la consola de GENESIS y los mensajes. */
  lines: Line[];
}

/** Fondos que no son imágenes: pantallas con texto que tiene que leerse bien (ver src/data/pantallas.json). */
export function CodeScreen({ id, lines, accion }: Props) {
  switch (id) {
    case 'gravity_ide':
      return <GravityIde lines={lines} />;
    case 'pc_correo':
      return <Correo lines={lines} accion={accion} />;
    case 'celular_mensaje':
      return <Celular lines={lines} />;
    case 'celular_favorito':
      return <CelularFavorito />;
    case 'celular_foto_nikki':
      return <CelularFoto />;
    case 'boringram_historia':
      return <Historia />;
    case 'nebulosa_magenta':
      return <Nebulosa />;
    default:
      return <div className={s.screen} style={{ background: '#000' }} />;
  }
}

function GravityIde({ lines }: { lines: Line[] }) {
  const pantallas = usePantallas();
  const lang = useLang();
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
                    <span className={s.prompt}>{ide.prompt}</span> {lineText(l.sid, l.text, lang)}
                  </div>
                ) : (
                  <div key={i} className={s.genesis}>
                    {'> '}
                    {lineText(l.sid, l.text, lang).replace(/^>\s*/, '')}
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

function Correo({ lines, accion }: { lines: Line[]; accion?: 'eliminar' | 'descargar' }) {
  const pantallas = usePantallas();
  const c = pantallas.pc_correo;
  if (accion) return <CorreoVentana key={`accion-${accion}`} button={accion === 'eliminar' ? 1 : 0} live />;
  const click = lastClick(lines, c.clics as Record<string, number>);
  // La animación corre justo después de elegir (la decisión es lo anterior a la línea actual);
  // si se vuelve a esta pantalla más tarde, ya se muestra el resultado.
  const live = click !== null && click.at === lines.length - 2;
  return <CorreoVentana key={click?.at ?? -1} button={click?.button ?? null} live={live} />;
}

function CorreoVentana({ button, live }: { button: number | null; live: boolean }) {
  const pantallas = usePantallas();
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
      // Al borrar el correo, los botones desaparecen: ya no hay nada que medir.
      if (!first.current || !second.current) return;
      const r = row.getBoundingClientRect();
      const [a, b] = [first.current.getBoundingClientRect(), second.current.getBoundingClientRect()];
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

interface PhoneProps {
  reloj: string;
  bateria: number;
  children: ReactNode;
  /** Pantalla completa (historias): sin la barra de la app. */
  full?: boolean;
}

/** Celular con Boringram abierto: barra de estado (hora, señal, batería) y la barra de la app con el logo. */
function Phone({ reloj, bateria, children, full }: PhoneProps) {
  const pantallas = usePantallas();
  return (
    <div className={`${s.screen} ${s.night}`}>
      <div className={s.phone}>
        <div className={`${s.statusBar} ${full ? s.statusOver : ''}`}>
          <span>{reloj}</span>
          <span className={s.notch} />
          <span className={s.statusIcons}>
            <i className={s.signal} />
            <span className={`${s.battery} ${bateria <= 15 ? s.batteryLow : ''}`}>
              <i style={{ width: `${bateria}%` }} />
            </span>
            {bateria}%
          </span>
        </div>
        {!full && (
          <div className={s.appBar}>
            <img src={assetUrl(pantallas.boringram.logo)} alt="Boringram" draggable={false} />
            <span className={s.appIcons} aria-hidden>
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
              <svg viewBox="0 0 24 24"><path d="M21 3 3 10.5l7 2.5 2.5 7z" /></svg>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Cabecera del chat: foto de perfil (con el anillo de colores si hay historia nueva), nombre y estado. */
function PhoneHead({ contacto, estado, foto, historia }: { contacto: string; estado: string; foto?: string; historia?: boolean }) {
  return (
    <div className={s.phoneHead}>
      <span className={`${s.avatarRing} ${historia ? s.avatarStory : ''}`}>
        {foto ? (
          <img className={s.avatar} src={assetUrl(foto)} alt="" draggable={false} />
        ) : (
          <span className={s.avatar}>{contacto[0]}</span>
        )}
      </span>
      <div>
        <b>{contacto}</b>
        <small>{estado}</small>
      </div>
    </div>
  );
}

function Celular({ lines }: { lines: Line[] }) {
  const pantallas = usePantallas();
  const lang = useLang();
  const c = pantallas.celular_mensaje;
  const mensajes = lines.filter((l) => l.speaker === c.voz).slice(-6);
  return (
    <Phone reloj={c.reloj} bateria={c.bateria}>
      <PhoneHead contacto={c.contacto} estado={c.estado} foto={c.foto} historia={c.historia} />
      <div className={s.chat}>
        <span className={s.day}>{c.dia}</span>
        {mensajes.map((m, i) => (
          <div key={i} className={s.bubble}>
            {lineText(m.sid, m.text, lang)}
            <small>{c.hora}</small>
          </div>
        ))}
      </div>
      <div className={s.compose}>{c.escribir}</div>
    </Phone>
  );
}

/** Los mensajes destacados del chat con Nikki: hay uno solo. */
function CelularFavorito() {
  const pantallas = usePantallas();
  const c = pantallas.celular_favorito;
  return (
    <Phone reloj={c.reloj} bateria={c.bateria}>
      <PhoneHead contacto={c.contacto} estado={c.estado} foto={c.foto} />
      <div className={`${s.chat} ${s.chatCenter}`}>
        <div className={`${s.bubble} ${s.starred}`}>
          <span className={s.star}>{c.marca}</span>
          {c.texto}
          <small>{c.fecha}</small>
        </div>
      </div>
    </Phone>
  );
}

/** La foto de perfil de Nikki, abierta en grande. */
function CelularFoto() {
  const pantallas = usePantallas();
  const c = pantallas.celular_foto_nikki;
  return (
    <Phone reloj={c.reloj} bateria={c.bateria}>
      <PhoneHead contacto={c.contacto} estado={c.estado} foto={c.foto} />
      <div className={s.photoView}>
        <img src={assetUrl(c.foto)} alt="" draggable={false} />
      </div>
    </Phone>
  );
}

/** Una historia de Boringram: imagen a pantalla completa, barra de avance, quién la subió y el texto. */
function Historia() {
  const pantallas = usePantallas();
  const c = pantallas.boringram_historia;
  return (
    <Phone reloj={c.reloj} bateria={c.bateria} full>
      <div className={s.story}>
        {/* La imagen de fondo, desenfocada, rellena lo que la foto no cubre (como en las historias de verdad). */}
        <img className={s.storyBlur} src={assetUrl(c.imagen)} alt="" draggable={false} aria-hidden />
        <img className={s.storyImg} src={assetUrl(c.imagen)} alt="" draggable={false} />
        <div className={s.storyTop}>
          <div className={s.storyProgress}>
            <i />
          </div>
          <div className={s.storyWho}>
            <img src={assetUrl(c.foto)} alt="" draggable={false} />
            <b>{c.contacto}</b>
            <small>{c.hace}</small>
          </div>
        </div>
        <span className={s.storyCaption}>{c.texto}</span>
        <div className={s.storyReply}>
          <span>{c.responder}</span>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
        </div>
      </div>
    </Phone>
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
