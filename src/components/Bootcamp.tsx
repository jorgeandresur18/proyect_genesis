import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../engine/store';
import { assetUrl, isPlaceholder } from '../engine/assets';
import { playCancel, playSelect } from '../engine/sound';
import { headTop } from '../engine/stature';
import {
  INTRO,
  NOMBRE_MAX,
  NOMBRE_MIN,
  PRUEBA,
  NIVELES,
  diplomaKey,
  estrellas,
  useBootcamp,
  type Linea,
  type Nivel,
} from '../engine/bootcamp';
import { CoffeeIDE, colorear, reiniciarPreguntas } from './CoffeeIDE';
import { DiplomaView } from './BootcampDiploma';
import { ejercicioDe, useCurso } from './bootcampDatos';
import { AvatarGenerado } from './AvatarGenerado';
import { speakerColor } from './DialogBox';

/**
 * Bootcamp Genesis (extra, no canon; docs/BOOTCAMP.md). Un monitor que ocupa la pantalla (se ven sus bordes, el
 * logo y el botón de apagar) y se prende como uno viejo. Adentro: el inicio con los niveles y sus clases, la
 * charla de cada clase, el ejercicio en el IDE del minijuego, el cierre con las estrellas, el diploma y
 * LinkedFired. La lógica (desbloqueos, estrellas, progreso) está en engine/bootcamp.ts.
 */
type Vista =
  | { kind: 'inicio' }
  | { kind: 'intro'; i: number }
  | { kind: 'charla'; id: string; i: number }
  | { kind: 'ide'; id: string }
  | { kind: 'cierre'; id: string; i: number; estrellas: number }
  | { kind: 'diploma'; nivel: string }
  | { kind: 'linkedfired'; nivel: string };

/** Lo que tarda en apagarse: crt-off, el monitor que se esconde y el fundido. */
const OFF_MS = 1300;
/** El arranque: el logo y la barra de carga con chistes (se salta con un clic). */
const BOOT_MS = 3400;
const BOOT_JOKE_MS = 650;
/** «Cerrando sesión…» antes de apagar la pantalla. */
const SHUTDOWN_MS = 900;
const fmt = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((out, [k, v]) => out.replace(`{${k}}`, String(v)), s);

export function BootcampScreen({ onClose }: { onClose: () => void }) {
  const { CURSO, tx } = useCurso();
  const still = useStore((s) => s.settings.reduceEffects);
  // Arranque (logo y carga) → el bootcamp → cerrando sesión → la pantalla se apaga.
  const [fase, setFase] = useState<'boot' | 'on' | 'apagando'>(still ? 'on' : 'boot');
  const [off, setOff] = useState(false);
  const encendido = useCallback(() => setFase('on'), []);
  const rango = useBootcamp().colorRango;
  // Al cerrar el Bootcamp se puede volver a preguntarle a GENESIS (con el mismo límite).
  useEffect(() => reiniciarPreguntas, []);
  const apagar = () => {
    if (fase === 'apagando' || off) return;
    playCancel();
    if (still) return onClose();
    setFase('apagando');
    setTimeout(() => setOff(true), SHUTDOWN_MS);
    setTimeout(onClose, SHUTDOWN_MS + OFF_MS);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') apagar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div
      className={`bc-overlay ${off ? 'off' : ''}`}
      role="dialog"
      aria-label={CURSO.titulo}
      style={{ '--rank': rango } as CSSProperties}
    >
      <div className="bc-bezel">
        <div className="bc-screen">
          <div className="bc-crt">
            {fase === 'boot' ? (
              <Arranque onListo={encendido} />
            ) : fase === 'apagando' ? (
              <Apagando />
            ) : (
              <Contenido />
            )}
          </div>
        </div>
        <div className="bc-chin">
          <span className="bc-led" aria-hidden />
          <img className="bc-logo" src={assetUrl('marca/logo_monitor.webp')} alt="" draggable={false} />
          <button className="bc-power" onClick={apagar} aria-label={tx.apagar} title={tx.apagar}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** El arranque: el logo del bootcamp, el emblema girando y una barra que «instala» cosas con chistes. */
function Arranque({ onListo }: { onListo: () => void }) {
  const { CURSO, tx } = useCurso();
  const [k, setK] = useState(0);
  useEffect(() => {
    const t1 = setInterval(() => setK((x) => x + 1), BOOT_JOKE_MS);
    const t2 = setTimeout(onListo, BOOT_MS);
    return () => {
      clearInterval(t1);
      clearTimeout(t2);
    };
  }, [onListo]);
  const chistes = tx.carga_chistes;
  return (
    <div className="bc-boot" onClick={onListo}>
      <img className="bc-boot-emblem" src={assetUrl('marca/bootcamp_emblema.webp')} alt="" draggable={false} />
      <img className="bc-boot-logo" src={assetUrl('marca/bootcamp_logo.webp')} alt={CURSO.titulo} draggable={false} />
      <div className="bc-boot-bar">
        <i style={{ animationDuration: `${BOOT_MS}ms` }} />
      </div>
      <p key={k} className="bc-boot-joke">
        <span>{tx.cargando}</span> {chistes[k % chistes.length]}
      </p>
    </div>
  );
}

/** Al apagar: «cerrando sesión» con el emblema, antes de que la pantalla se cierre. */
function Apagando() {
  const { tx } = useCurso();
  return (
    <div className="bc-boot bc-shutdown">
      <img className="bc-boot-emblem" src={assetUrl('marca/bootcamp_emblema.webp')} alt="" draggable={false} />
      <p className="bc-boot-joke">{tx.apagando}</p>
    </div>
  );
}

/** La primera vez: el nombre del alumno (sale manuscrito en los diplomas). También sirve para cambiarlo. */
function Inscripcion({ onListo }: { onListo: () => void }) {
  const { CURSO, tx } = useCurso();
  const actual = useStore((s) => s.bootcampNombre);
  const guardar = useStore((s) => s.setBootcampNombre);
  const [nombre, setNombre] = useState(actual);
  const [error, setError] = useState('');
  const enviar = () => {
    if (nombre.trim().length < NOMBRE_MIN) {
      playCancel();
      return setError(fmt(tx.nombre_corto, { n: NOMBRE_MIN }));
    }
    playSelect();
    guardar(nombre);
    onListo();
  };
  return (
    <div className="bc-boot bc-signup">
      <img className="bc-boot-logo bc-signup-logo" src={assetUrl('marca/bootcamp_logo.webp')} alt={CURSO.titulo} draggable={false} />
      <form
        className="bc-signup-card"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <h2>{tx.nombre_titulo}</h2>
        <p>{tx.nombre_texto}</p>
        <input
          autoFocus
          value={nombre}
          maxLength={NOMBRE_MAX}
          placeholder={tx.nombre_placeholder}
          onChange={(e) => {
            setNombre(e.target.value);
            setError('');
          }}
          // Que las teclas no lleguen al juego (M silencia, Escape apaga).
          onKeyDown={(e) => e.stopPropagation()}
        />
        <span className="bc-signup-preview">{nombre.trim() || tx.nombre_placeholder}</span>
        {error && <small className="bc-signup-error">{error}</small>}
        <button className="bc-btn bc-btn-go" type="submit">
          {tx.nombre_ok} →
        </button>
      </form>
    </div>
  );
}

function Contenido() {
  const { CURSO, tx, LECCIONES } = useCurso();
  const b = useBootcamp();
  const guardar = useStore((s) => s.markBootcamp);
  // En el modo de prueba (?bootcamp=todo) no se guarda el progreso: solo que ya se vio la introducción.
  const marcar = (id: string, valor?: number) => {
    if (!PRUEBA || id === INTRO) guardar(id, valor);
  };
  const nombre = useStore((s) => s.bootcampNombre);
  const [renombrar, setRenombrar] = useState(false);
  const [vista, setVista] = useState<Vista>(() => (b.introVista ? { kind: 'inicio' } : { kind: 'intro', i: 0 }));
  const inicio = () => setVista({ kind: 'inicio' });

  if (!b.abierto) return <Cerrado />;
  // Primero, la inscripción (una sola vez); después, si no la vio, la introducción.
  if (!nombre || renombrar) return <Inscripcion onListo={() => setRenombrar(false)} />;

  if (vista.kind === 'ide') {
    const l = LECCIONES[vista.id];
    return (
      <div className="bc-stage">
        <CoffeeIDE
          id={`bootcamp:${l.id}`}
          data={ejercicioDe(CURSO, l)}
          onSolved={(fallos) => setVista({ kind: 'cierre', id: l.id, i: 0, estrellas: estrellas(fallos) })}
          onExit={() => setVista({ kind: 'charla', id: l.id, i: l.charla.length - 1 })}
        />
      </div>
    );
  }

  if (vista.kind === 'intro' || vista.kind === 'charla' || vista.kind === 'cierre') {
    const l = vista.kind === 'intro' ? null : LECCIONES[vista.id];
    const lineas: Linea[] = vista.kind === 'intro' ? CURSO.introduccion : vista.kind === 'charla' ? l!.charla : l!.cierre;
    const salir = () => {
      if (vista.kind === 'intro') marcar(INTRO);
      inicio();
    };
    const terminar = () => {
      if (vista.kind !== 'cierre' || !l) return salir();
      marcar(l.id, vista.estrellas);
      // La última clase del nivel lleva al diploma.
      const nivel = NIVELES.find((n) => n.lecciones.at(-1) === l.id);
      if (nivel?.diploma) return setVista({ kind: 'diploma', nivel: nivel.id });
      inicio();
    };
    return (
      <Charla
        key={`${vista.kind}-${l?.id ?? ''}`}
        titulo={l ? l.titulo : CURSO.titulo}
        lineas={lineas}
        i={vista.i}
        estrellas={vista.kind === 'cierre' ? vista.estrellas : undefined}
        final={vista.kind === 'charla' ? tx.abrir_ide : vista.kind === 'intro' ? tx.empezar : tx.terminar}
        salirTexto={vista.kind === 'intro' ? tx.saltar : tx.volver}
        onSiguiente={() => setVista({ ...vista, i: vista.i + 1 })}
        onFinal={() => (vista.kind === 'charla' ? setVista({ kind: 'ide', id: l!.id }) : terminar())}
        onSalir={salir}
      />
    );
  }

  if (vista.kind === 'diploma' || vista.kind === 'linkedfired') {
    const nivel = CURSO.niveles.find((n) => n.id === vista.nivel)!;
    if (vista.kind === 'diploma')
      return (
        <DiplomaView
          nivel={nivel}
          onPublicar={() => {
            playSelect();
            marcar(diplomaKey(nivel.id), 2);
            setVista({ kind: 'linkedfired', nivel: nivel.id });
          }}
          onVolver={() => {
            marcar(diplomaKey(nivel.id), 1);
            inicio();
          }}
        />
      );
    return (
      <LinkedFired
        nivel={nivel}
        onVolver={() => {
          playCancel();
          inicio();
        }}
      />
    );
  }

  return (
    <Inicio
      onNombre={() => {
        playSelect();
        setRenombrar(true);
      }}
      onIntro={() => {
        playSelect();
        setVista({ kind: 'intro', i: 0 });
      }}
      onClase={(id) => {
        playSelect();
        setVista({ kind: 'charla', id, i: 0 });
      }}
      onDiploma={(nivel) => {
        playSelect();
        setVista({ kind: 'diploma', nivel });
      }}
    />
  );
}

/** Antes de terminar el Capítulo 1: inscripciones cerradas. */
function Cerrado() {
  const { tx } = useCurso();
  return (
    <div className="bc-closed">
      <span className="bc-closed-lock" aria-hidden>
        🔒
      </span>
      <h2>{tx.cerrado_titulo}</h2>
      <p>{tx.cerrado_texto}</p>
    </div>
  );
}

/** El inicio: cabecera, los niveles (con su estado) y las clases del nivel elegido. */
function Inicio({
  onNombre,
  onIntro,
  onClase,
  onDiploma,
}: {
  onNombre: () => void;
  onIntro: () => void;
  onClase: (id: string) => void;
  onDiploma: (nivel: string) => void;
}) {
  const { CURSO, tx, LECCIONES } = useCurso();
  const b = useBootcamp();
  const nombre = useStore((s) => s.bootcampNombre);
  // Se abre en el último nivel disponible.
  const [sel, setSel] = useState(() => [...NIVELES].reverse().find((n) => b.nivelAbierto(n))?.id ?? NIVELES[0].id);
  const nivel = CURSO.niveles.find((n) => n.id === sel)!;
  const abierto = b.nivelAbierto(nivel);
  const pct = b.progreso.total ? Math.round((b.progreso.hechas / b.progreso.total) * 100) : 0;
  const lvl = { '--lvl': nivel.color } as CSSProperties;
  return (
    <div className="bc-home">
      <header className="bc-hero">
        <div>
          <img className="bc-hero-logo" src={assetUrl('marca/bootcamp_logo.webp')} alt={CURSO.titulo} draggable={false} />
          <p>{CURSO.lema}</p>
          <button className="bc-student" onClick={onNombre} title={tx.nombre_cambiar}>
            🎓 {fmt(tx.alumno, { nombre })} <span>✎</span>
          </button>
        </div>
        <div className="bc-stats">
          {PRUEBA && <span className="bc-chip bc-chip-test">{tx.prueba}</span>}
          <span className="bc-chip">{fmt(tx.clases, { n: b.progreso.hechas, total: b.progreso.total })}</span>
          <span className="bc-chip bc-chip-gold">{fmt(tx.estrellas, { n: b.estrellas })}</span>
          <span className="bc-ring" style={{ '--pct': pct } as CSSProperties}>
            {pct}%
          </span>
          <button className="bc-btn bc-btn-ghost" onClick={onIntro}>
            ▶ {tx.introduccion}
          </button>
        </div>
      </header>

      <nav className="bc-levels" aria-label={tx.niveles}>
        {CURSO.niveles.map((n, i) => {
          const open = b.nivelAbierto(n);
          const done = n.lecciones.filter((id) => b.hechas[id]).length;
          return (
            <button
              key={n.id}
              className={`bc-level ${sel === n.id ? 'active' : ''} ${open ? '' : 'locked'} ${b.nivelTerminado(n) ? 'done' : ''}`}
              onClick={() => {
                playSelect();
                setSel(n.id);
              }}
              style={{ animationDelay: `${i * 50}ms`, '--lvl': n.color } as CSSProperties}
            >
              <small>{fmt(tx.nivel, { n: i + 1 })}</small>
              <b>{n.nombre}</b>
              {open ? (
                <span className="bc-bar">
                  <i style={{ width: `${(done / n.lecciones.length) * 100}%` }} />
                </span>
              ) : (
                <span className="bc-level-lock">{b.nivelDesbloqueado(n) ? '⏳' : '🔒'}</span>
              )}
            </button>
          );
        })}
      </nav>

      <section className="bc-level-detail" style={lvl}>
        <div className="bc-level-head">
          <div>
            <h2>{nivel.nombre}</h2>
            <p>{nivel.descripcion}</p>
          </div>
          {nivel.diploma && b.nivelTerminado(nivel) && (
            <button className="bc-btn bc-btn-gold" onClick={() => onDiploma(nivel.id)}>
              🎓 {tx.ver_diploma}
            </button>
          )}
        </div>
        {!abierto ? (
          <p className="bc-empty">
            {b.nivelDesbloqueado(nivel) ? tx.proximamente : `🔒 ${nivel.bloqueo}`}
          </p>
        ) : (
          <div className="bc-grid">
            {nivel.lecciones.map((id, i) => {
              const l = LECCIONES[id];
              const ok = b.leccionAbierta(id);
              const st = b.hechas[id] ?? 0;
              return (
                <button
                  key={id}
                  className={`bc-card ${st ? 'done' : ''}`}
                  disabled={!ok}
                  onClick={() => onClase(id)}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="bc-card-top">
                    <small>{fmt(tx.clase, { n: i + 1 })}</small>
                    <span className="bc-stars" aria-label={`${st}/3`}>
                      {'★'.repeat(st)}
                      <i>{'★'.repeat(3 - st)}</i>
                    </span>
                  </span>
                  <b>{l.titulo}</b>
                  <span className="bc-card-tema">{ok ? l.tema : tx.bloqueada}</span>
                  <span className="bc-card-go">{!ok ? '🔒' : st ? tx.repetir : tx.empezar} →</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <Resenas />
    </div>
  );
}

/** Largo máximo de la reseña del jugador. */
const RESENA_MAX = 280;

/** Una reseña: avatar inventado, usuario, cuándo, estrellas y texto. */
function Resena({
  usuario,
  hace,
  estrellas: st,
  texto,
  mia,
}: {
  usuario: string;
  hace: string;
  estrellas: number;
  texto: string;
  mia?: boolean;
}) {
  return (
    <article className={`bc-review ${mia ? 'mia' : ''}`}>
      <span className="bc-review-top">
        <AvatarGenerado nombre={usuario} className="bc-review-avatar" />
        <span>
          <b>{usuario}</b>
          <small>{hace}</small>
        </span>
        <span className="bc-stars">
          {'★'.repeat(st)}
          <i>{'★'.repeat(5 - st)}</i>
        </span>
      </span>
      <p>{texto}</p>
    </article>
  );
}

/** Reseñas del curso: de alumnos cualquiera, sobre el curso (no sobre los personajes); y la tuya, primera. */
function Resenas() {
  const { CURSO, tx } = useCurso();
  const mia = useStore((s) => s.bootcampCalificacion);
  const calificar = useStore((s) => s.calificarBootcamp);
  const resena = useStore((s) => s.bootcampResena);
  const resenar = useStore((s) => s.resenarBootcamp);
  const nombre = useStore((s) => s.bootcampNombre);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [gracias, setGracias] = useState(false);
  const lista = CURSO.resenas;
  // El carrusel: páginas de reseñas que se deslizan (con el dedo, arrastrando, con las flechas o las bolitas).
  const pista = useRef<HTMLDivElement>(null);
  const [pagina, setPagina] = useState(0);
  const [paginas, setPaginas] = useState(1);
  // Lo que avanza una página: el ancho visible más el espacio entre tarjetas.
  const paso = (el: HTMLElement) => el.clientWidth + (parseFloat(getComputedStyle(el).columnGap) || 0);
  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    setPaginas(Math.max(1, Math.ceil((el.scrollWidth - 2) / paso(el))));
    setPagina(Math.round(el.scrollLeft / paso(el)));
  }, []);
  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir, resena]);
  const irA = (n: number) => {
    const el = pista.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(paginas - 1, n));
    el.scrollTo({ left: destino * paso(el), behavior: 'smooth' });
  };
  // Arrastrar con el mouse (en pantallas táctiles, el deslizamiento ya es nativo).
  const arrastre = useRef<{ x: number; left: number } | null>(null);
  const todas = [...lista.map((r) => r.estrellas), ...(mia ? [mia] : [])];
  const promedio = todas.reduce((n, x) => n + x, 0) / todas.length;
  const publicar = () => {
    if (!mia) {
      playCancel();
      return setError(tx.resena_falta);
    }
    if (!texto.trim()) return;
    playSelect();
    resenar(texto);
    setTexto('');
    // Tu reseña sale primera y el sistema te agradece.
    setGracias(true);
    pista.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };
  const estrellasBtn = (
    <span className="bc-rate">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={n <= mia ? 'on' : ''}
          aria-label={`${n}/5`}
          onClick={() => {
            playSelect();
            calificar(n);
            setError('');
          }}
        >
          ★
        </button>
      ))}
    </span>
  );
  return (
    <section className="bc-reviews">
      <header>
        <h2>{tx.resenas}</h2>
        <span className="bc-reviews-avg">
          <b>{promedio.toFixed(1)}</b>
          <span className="bc-stars">
            {'★'.repeat(Math.round(promedio))}
            <i>{'★'.repeat(5 - Math.round(promedio))}</i>
          </span>
          <small>{fmt(tx.resenas_total, { n: todas.length })}</small>
        </span>
      </header>
      {!resena && (
        <div className="bc-review-form">
          <AvatarGenerado nombre={nombre} className="bc-review-avatar" />
          <div>
            <span className="bc-review-form-top">
              <b>{tx.tu_resena}</b>
              {estrellasBtn}
            </span>
            <textarea
              value={texto}
              maxLength={RESENA_MAX}
              rows={2}
              placeholder={tx.resena_placeholder}
              onChange={(e) => {
                setTexto(e.target.value);
                setError('');
              }}
              // Que las teclas no lleguen al juego (M silencia, Escape apaga).
              onKeyDown={(e) => e.stopPropagation()}
            />
            <span className="bc-review-form-bottom">
              <small>{error || `${texto.length}/${RESENA_MAX}`}</small>
              <button className="bc-btn bc-btn-go" onClick={publicar} disabled={!texto.trim()}>
                {tx.resena_publicar}
              </button>
            </span>
          </div>
        </div>
      )}
      {gracias && resena && (
        <p className="bc-review-thanks" role="status">
          {fmt(tx.gracias_resena, { n: mia })}
        </p>
      )}
      <div
        className="bc-reviews-list"
        ref={pista}
        onScroll={medir}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || !pista.current) return;
          arrastre.current = { x: e.clientX, left: pista.current.scrollLeft };
          pista.current.classList.add('arrastrando');
        }}
        onPointerMove={(e) => {
          if (arrastre.current && pista.current) pista.current.scrollLeft = arrastre.current.left - (e.clientX - arrastre.current.x);
        }}
        onPointerUp={() => {
          if (!arrastre.current || !pista.current) return;
          arrastre.current = null;
          pista.current.classList.remove('arrastrando');
          irA(Math.round(pista.current.scrollLeft / paso(pista.current)));
        }}
        onPointerLeave={() => {
          if (!arrastre.current || !pista.current) return;
          arrastre.current = null;
          pista.current.classList.remove('arrastrando');
          irA(Math.round(pista.current.scrollLeft / paso(pista.current)));
        }}
      >
        {resena && (
          <div className="bc-review-own">
            <Resena usuario={nombre} hace={tx.hace_momento} estrellas={mia} texto={resena.texto} mia />
            <span>
              {estrellasBtn}
              <button
                className="bc-btn bc-btn-ghost"
                onClick={() => {
                  playCancel();
                  resenar(null);
                  setGracias(false);
                }}
              >
                {tx.resena_borrar}
              </button>
            </span>
          </div>
        )}
        {lista.map((r, i) => (
          <Resena key={i} usuario={r.usuario} hace={r.hace} estrellas={r.estrellas} texto={r.texto} />
        ))}
      </div>
      {paginas > 1 && (
        <nav className="bc-reviews-nav">
          <button
            className="bc-reviews-arrow"
            aria-label={tx.resenas_anterior}
            disabled={pagina <= 0}
            onClick={() => {
              playSelect();
              irA(pagina - 1);
            }}
          >
            ‹
          </button>
          <span className="bc-reviews-dots">
            {Array.from({ length: paginas }, (_, n) => (
              <button
                key={n}
                className={n === pagina ? 'on' : ''}
                aria-label={fmt(tx.resenas_pagina, { n: n + 1 })}
                aria-current={n === pagina}
                onClick={() => {
                  playSelect();
                  irA(n);
                }}
              />
            ))}
          </span>
          <button
            className="bc-reviews-arrow"
            aria-label={tx.resenas_siguientes}
            disabled={pagina >= paginas - 1}
            onClick={() => {
              playSelect();
              irA(pagina + 1);
            }}
          >
            ›
          </button>
        </nav>
      )}
    </section>
  );
}

/** La charla (introducción, antes del ejercicio y el cierre): el aula, quien habla y su caja. */
function Charla({
  titulo,
  lineas,
  i,
  estrellas: st,
  final,
  salirTexto,
  onSiguiente,
  onFinal,
  onSalir,
}: {
  titulo: string;
  lineas: Linea[];
  i: number;
  estrellas?: number;
  final: string;
  salirTexto: string;
  onSiguiente: () => void;
  onFinal: () => void;
  onSalir: () => void;
}) {
  const { tx } = useCurso();
  const linea = lineas[i];
  const ultima = i === lineas.length - 1;
  // La pizarra: el último ejemplo de código hasta esta línea (el profe explica con código detrás).
  let pizarra = i;
  while (pizarra >= 0 && !lineas[pizarra].codigo) pizarra--;
  return (
    <div
      className={`bc-stage bc-talk ${pizarra >= 0 ? 'bc-con-pizarra' : ''}`}
      onClick={() => {
        playSelect();
        if (ultima) onFinal();
        else onSiguiente();
      }}
    >
      <Fondo />
      {pizarra >= 0 && (
        <div className="bc-pizarra" aria-label={tx.ejemplo}>
          <div className="bc-pizarra-bar">
            <span className="ide-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {tx.ejemplo}
          </div>
          <pre key={pizarra} className="bc-pizarra-code">
            {lineas[pizarra].codigo!.map((l, k) => (
              <div key={k} className="ide-line" style={{ animationDelay: `${k * 60}ms` }}>
                <span className="ide-num">{k + 1}</span>
                <span>{colorear(l)}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
      <img key={`${i}-${linea.sprite}`} className="bc-sprite" src={assetUrl(linea.sprite)} alt="" draggable={false} />
      <div className="bc-talk-top">
        <span className="bc-chip">{titulo}</span>
        {st !== undefined && (
          <span className="bc-chip bc-chip-gold bc-earned">
            {'★'.repeat(st)}
            <i>{'★'.repeat(3 - st)}</i>
          </span>
        )}
        <button
          className="bc-btn bc-btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            playCancel();
            onSalir();
          }}
        >
          {salirTexto}
        </button>
      </div>
      <div key={i} className="bc-box" style={{ ['--who' as string]: speakerColor(linea.quien) }}>
        <b>{linea.quien}</b>
        <p>{linea.texto}</p>
        <span className="bc-dots" aria-hidden>
          {lineas.map((_, k) => (
            <i key={k} className={k <= i ? 'on' : ''} />
          ))}
        </span>
        <span className="bc-next">{ultima ? final : tx.siguiente} ▸</span>
      </div>
    </div>
  );
}

/** La publicación en LinkedFired: el diploma, las vistas y los comentarios (y el remate del final). */
function LinkedFired({ nivel, onVolver }: { nivel: Nivel; onVolver: () => void }) {
  const { CURSO, tx } = useCurso();
  const d = nivel.diploma!;
  const retrato = (quien: string, sprite?: string) => sprite ?? CURSO.ide.retratos[quien as keyof typeof CURSO.ide.retratos];
  return (
    <div className="bc-stage bc-lf-wrap">
      <div className="bc-lf">
        <header className="bc-lf-bar">
          <b>
            Linked<span>Fired</span>
          </b>
          <button className="bc-btn bc-btn-ghost" onClick={onVolver}>
            {tx.listo}
          </button>
        </header>
        <article className="bc-lf-post">
          <div className="bc-lf-author">
            <span className="bc-lf-me" aria-hidden>
              ?
            </span>
            <span>
              <b>{tx.tu}</b>
              <small>{fmt(tx.tu_titulo, { titulo: d.titulo })}</small>
            </span>
          </div>
          <p>{d.linkedfired.texto}</p>
          <div className="bc-lf-card">
            <small>BOOTCAMP GENESIS</small>
            <b>{d.titulo}</b>
          </div>
          {d.remate && (
            <figure className="bc-lf-remate">
              {isPlaceholder(d.remate.imagen) ? (
                <div className="bc-placeholder">{d.remate.imagen}</div>
              ) : (
                <img src={assetUrl(d.remate.imagen)} alt="" />
              )}
              <figcaption>{d.remate.texto}</figcaption>
            </figure>
          )}
          <p className="bc-lf-views">👁 {d.linkedfired.vistas}</p>
          <div className="bc-lf-actions">
            <span>👍 {tx.me_gusta}</span>
            <span>💬 {tx.comentar}</span>
          </div>
          <ul className="bc-lf-comments">
            {d.linkedfired.comentarios.map((c, i) => (
              <li key={i} style={{ ['--who' as string]: speakerColor(c.quien), animationDelay: `${300 + i * 350}ms` }}>
                <span className="bc-avatar" style={{ ['--head' as string]: headTop(retrato(c.quien, c.sprite)) }}>
                  <img src={assetUrl(retrato(c.quien, c.sprite))} alt="" draggable={false} />
                </span>
                <span>
                  <b>{c.quien}</b>
                  <span>{c.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

/** El aula (mientras no haya arte, un fondo con el nombre del placeholder). */
function Fondo() {
  const { CURSO } = useCurso();
  if (isPlaceholder(CURSO.fondo)) {
    return (
      <div className="bc-bg bc-bg-placeholder" aria-hidden>
        <span>{CURSO.fondo}</span>
      </div>
    );
  }
  return <img className="bc-bg" src={assetUrl(CURSO.fondo)} alt="" draggable={false} />;
}
