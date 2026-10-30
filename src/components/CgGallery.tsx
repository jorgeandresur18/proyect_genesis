import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { TEXT_SPEED_INSTANT, useStore } from '../engine/store';
import { assetUrl } from '../engine/assets';
import galeriaEs from '../data/galeria.json';
import galeriaEn from '../data/en/galeria.json';
import { localized, useLang, useT } from '../engine/i18n';
import {
  CGS,
  CHARACTERS,
  TOTAL_SPRITES,
  characterColor,
  imageKey,
  spriteKey,
  useGalleryState,
} from '../engine/gallery';
import { Panel } from './Panels';
import { playCancel, playSelect, startTyping, stopTyping } from '../engine/sound';
import { NoData } from './NoData';

interface Texts {
  titulos: Record<string, string>;
  info_imagenes: Record<string, string>;
  personajes: Record<string, string>;
  sprites: Record<string, { nombre: string; info: string }>;
}
const useTexts = () => localized(galeriaEs, galeriaEn, useLang()) as unknown as Texts;

/** Bolita que parpadea sobre lo recién desbloqueado (hasta abrirlo en el visor). */
export function NewDot({ className = '' }: { className?: string }) {
  const t = useT();
  return <span className={`new-dot ${className}`} role="img" aria-label={t('galeria.nuevo')} />;
}

type Tab = 'imagenes' | 'personajes';

/** Galería: imágenes del juego y sprites de los personajes. Lo que no se vio todavía queda bloqueado. */
export function CgGallery({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('imagenes');
  const g = useGalleryState();
  const pick = (next: Tab) => {
    if (next === tab) return;
    playSelect();
    setTab(next);
  };
  return (
    <Panel
      title={t('galeria.titulo', { vistas: g.images.length + g.spriteCount, total: CGS.length + TOTAL_SPRITES })}
      onClose={onClose}
      wide
    >
      <TermWindow
        className="gallery-term"
        tabs={[
          {
            key: 'imagenes',
            label: t('galeria.imagenes'),
            extra: `${g.images.length}/${CGS.length}`,
            dot: g.newImages.size > 0,
          },
          {
            key: 'personajes',
            label: t('galeria.personajes'),
            extra: `${g.spriteCount}/${TOTAL_SPRITES}`,
            dot: g.newSpriteCount > 0,
          },
        ]}
        active={tab}
        onTab={(k) => pick(k as Tab)}
      >
        {tab === 'imagenes' ? <Images /> : <Characters />}
      </TermWindow>
    </Panel>
  );
}

interface TabSpec {
  key: string;
  label: string;
  extra?: string;
  /** Color de la pestaña (el del personaje). */
  color?: string;
  /** Hay algo nuevo adentro. */
  dot?: boolean;
  muted?: boolean;
}

/**
 * Ventana con pestañas como las de una terminal (ícono, título, ×, «+» y la flecha).
 * `onClose` muestra la × de la pestaña; el «+» y la flecha son decorativos.
 */
function TermWindow({
  tabs,
  active,
  onTab,
  onClose,
  right,
  color,
  className = '',
  children,
}: {
  tabs: TabSpec[];
  active?: string;
  onTab?: (key: string) => void;
  onClose?: () => void;
  right?: ReactNode;
  /** Color de la ventana entera (el del personaje). */
  color?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useT();
  const current = active ?? tabs[0].key;
  return (
    <section
      className={`wt-window ${color ? 'wt-colored' : ''} ${className}`}
      style={color ? ({ '--wt': color } as CSSProperties) : undefined}
    >
      <div className="wt-tabs" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            role="tab"
            aria-selected={tab.key === current}
            className={`wt-tab ${tab.key === current ? 'active' : ''} ${onTab ? 'clickable' : ''} ${tab.color ? 'wt-tab-colored' : ''} ${tab.muted ? 'wt-tab-muted' : ''}`}
            style={tab.color ? ({ '--wt': tab.color } as CSSProperties) : undefined}
            onClick={() => onTab?.(tab.key)}
          >
            <span className="wt-icon" aria-hidden>
              ›_
            </span>
            <span className="wt-label">{tab.label}</span>
            {tab.extra && <span className="wt-extra">{tab.extra}</span>}
            {tab.dot && <NewDot className="new-dot-tab" />}
            {onClose && (
              <button
                className="wt-close"
                aria-label={t('panel.cerrar')}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <span className="wt-plus" aria-hidden>
          +
        </span>
        <span className="wt-caret" aria-hidden>
          ⌄
        </span>
        {right && <span className="wt-right">{right}</span>}
      </div>
      <div className="wt-body">{children}</div>
    </section>
  );
}

function Images() {
  const t = useT();
  const texts = useTexts();
  const g = useGalleryState();
  const unlocked = g.images;
  const markOpened = useStore((s) => s.markGalleryOpened);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {CGS.length === 0 && <p className="muted">{t('galeria.vacia')}</p>}
      <div className="gallery-grid">
        {CGS.map((id) =>
          unlocked.includes(id) ? (
            <button key={id} className="gallery-item" onClick={() => setOpen(unlocked.indexOf(id))}>
              <div className="gallery-thumb">
                <img src={assetUrl(`fondos/${id}.webp`)} alt="" loading="lazy" draggable={false} />
                {g.newImages.has(id) && <NewDot className="new-dot-item" />}
              </div>
              <span className="gallery-title">{texts.titulos[id] ?? id}</span>
            </button>
          ) : (
            <button key={id} className="gallery-item gallery-locked" disabled>
              <div className="gallery-thumb">
                  <NoData />
                </div>
              <span className="gallery-title">???</span>
            </button>
          ),
        )}
      </div>
      {open !== null && (
        <Viewer
          src={(i) => assetUrl(`fondos/${unlocked[i]}.webp`)}
          label={(i) => texts.titulos[unlocked[i]] ?? unlocked[i]}
          info={(i) => ({ file: `${unlocked[i]}.webp`, text: texts.info_imagenes[unlocked[i]] ?? '' })}
          onShow={(i) => markOpened(imageKey(unlocked[i]))}
          count={unlocked.length}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

const ALL = 'todos';
const MISC = 'varios';
/** Personajes con pestaña propia (galeria.json «principales»); el resto (enemigos, NPC) va en «Varios». */
const MAIN = CHARACTERS.filter((c) => galeriaEs.principales.includes(c.id));
const OTHERS = CHARACTERS.filter((c) => !galeriaEs.principales.includes(c.id));

/**
 * Pestañas: Todos, una por personaje principal con su color, y Varios. Un personaje que todavía no
 * apareció en la historia se llama «???».
 */
function Characters() {
  const t = useT();
  const texts = useTexts();
  const g = useGalleryState();
  const markOpened = useStore((s) => s.markGalleryOpened);
  const [sel, setSel] = useState(ALL);
  // Posición en `flat`: el visor recorre todo lo visto de la pestaña abierta (en «Todos», de todos).
  const [open, setOpen] = useState<number | null>(null);
  const seenOf = (id: string) => g.sprites.get(id) ?? [];
  const known = (id: string) => seenOf(id).length > 0;
  const nameOf = (id: string, expr: string) => texts.sprites[`${id}/${expr}`]?.nombre ?? expr.replace(/_/g, ' ');
  const label = (id: string) => (known(id) ? (texts.personajes[id] ?? id) : '???');
  const shown = sel === ALL ? [...MAIN, ...OTHERS] : sel === MISC ? OTHERS : CHARACTERS.filter((c) => c.id === sel);
  const flat = shown.flatMap((c) => seenOf(c.id).map((sp) => ({ id: c.id, expr: sp.expr })));
  const newIn = (list: typeof CHARACTERS) => list.some((c) => (g.newSprites.get(c.id)?.length ?? 0) > 0);
  const miscKnown = OTHERS.some((c) => known(c.id));
  const count = (list: typeof CHARACTERS) =>
    `${list.reduce((n, c) => n + seenOf(c.id).length, 0)}/${list.reduce((n, c) => n + c.sprites.length, 0)}`;
  const pick = (key: string) => {
    if (key === sel) return;
    playSelect();
    setSel(key);
  };

  const grid = (c: (typeof CHARACTERS)[number]) => (
    <div className="sprite-grid">
      {c.sprites.map((s) =>
        seenOf(c.id).includes(s) ? (
          <button
            key={s.expr}
            className="sprite-item"
            onClick={() => setOpen(flat.findIndex((f) => f.id === c.id && f.expr === s.expr))}
          >
            <span className="sprite-cell">
              <img src={assetUrl(`sprites/${c.id}/${s.expr}.webp`)} alt="" loading="lazy" draggable={false} />
              {g.newSprites.get(c.id)?.includes(s) && <NewDot className="new-dot-item" />}
            </span>
            <span className="sprite-name">{nameOf(c.id, s.expr)}</span>
          </button>
        ) : (
          <div key={s.expr} className="sprite-item" aria-hidden>
            <span className="sprite-cell">
              <NoData />
            </span>
            <span className="sprite-name muted">???</span>
          </div>
        ),
      )}
    </div>
  );

  /** Una ventana por personaje principal, con su color. */
  const characterWindow = (c: (typeof CHARACTERS)[number]) => (
    <TermWindow
      key={c.id}
      className={known(c.id) ? '' : 'sprite-window-locked'}
      color={known(c.id) ? characterColor(c.id) : undefined}
      tabs={[{ key: c.id, label: label(c.id), color: known(c.id) ? characterColor(c.id) : undefined, dot: newIn([c]) }]}
      right={count([c])}
    >
      {grid(c)}
    </TermWindow>
  );

  /** Varios: una sección por personaje (enemigos y NPC), cada una con su nombre y su color. */
  const miscSections = (
    <div className="misc-sections">
      {OTHERS.map((c) => (
        <section
          key={c.id}
          className={`misc-section ${known(c.id) ? '' : 'misc-section-locked'}`}
          style={{ '--wt': known(c.id) ? characterColor(c.id) : '#5d626c' } as CSSProperties}
        >
          <header>
            <span className="misc-swatch" aria-hidden />
            <h4>{label(c.id)}</h4>
            {newIn([c]) && <NewDot className="new-dot-tab" />}
            <span className="misc-count">{count([c])}</span>
          </header>
          {grid(c)}
        </section>
      ))}
    </div>
  );

  const miscTab = {
    key: MISC,
    label: miscKnown ? t('galeria.varios') : '???',
    color: miscKnown ? characterColor(MISC) : undefined,
    muted: !miscKnown,
    dot: newIn(OTHERS),
  };
  const windowColor = sel === MISC ? miscTab.color : sel !== ALL && known(sel) ? characterColor(sel) : undefined;
  return (
    <>
      <TermWindow
        className="character-tabs"
        tabs={[
          { key: ALL, label: t('galeria.todos'), dot: g.newSpriteCount > 0 },
          ...MAIN.map((c) => ({
            key: c.id,
            label: label(c.id),
            color: known(c.id) ? characterColor(c.id) : undefined,
            muted: !known(c.id),
            dot: newIn([c]),
          })),
          ...(OTHERS.length ? [miscTab] : []),
        ]}
        active={sel}
        onTab={pick}
        color={windowColor}
      >
        {sel === ALL ? (
          <div className="sprite-windows">
            {MAIN.map(characterWindow)}
            {OTHERS.length > 0 && (
              <TermWindow
                className={miscKnown ? '' : 'sprite-window-locked'}
                color={miscTab.color}
                tabs={[{ ...miscTab, muted: false }]}
                right={count(OTHERS)}
              >
                {miscSections}
              </TermWindow>
            )}
          </div>
        ) : sel === MISC ? (
          <>
            <p className="sprite-count muted">{count(OTHERS)}</p>
            {miscSections}
          </>
        ) : (
          shown.map((c) => (
            <div key={c.id}>
              <p className="sprite-count muted">{count([c])}</p>
              {grid(c)}
            </div>
          ))
        )}
      </TermWindow>
      {open !== null && flat[open] && (
        <Viewer
          sprite
          src={(i) => assetUrl(`sprites/${flat[i].id}/${flat[i].expr}.webp`)}
          label={(i) => `${texts.personajes[flat[i].id] ?? flat[i].id} · ${nameOf(flat[i].id, flat[i].expr)}`}
          info={(i) => ({
            file: `${flat[i].id}/${flat[i].expr}.webp`,
            text: texts.sprites[`${flat[i].id}/${flat[i].expr}`]?.info ?? '',
          })}
          onShow={(i) => markOpened(spriteKey(flat[i].id, flat[i].expr))}
          count={flat.length}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** Visor a pantalla completa con flechas e «Información». Se cierra con «Cerrar» o Escape. */
function Viewer({
  src,
  label,
  info,
  onShow,
  count,
  index,
  onIndex,
  onClose,
  sprite,
}: {
  src: (i: number) => string;
  label: (i: number) => string;
  info: (i: number) => { file: string; text: string };
  /** Se llama con cada imagen que se muestra (para quitarle la marca de nueva). */
  onShow: (i: number) => void;
  count: number;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  sprite?: boolean;
}) {
  const t = useT();
  const [showInfo, setShowInfo] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onShow(index), [index]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % count);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onIndex, onClose]);
  const current = info(index);
  return (
    <div className={`gallery-viewer ${sprite ? 'gallery-viewer-sprite' : ''}`}>
      <div className="viewer-main">
        <div className="viewer-stage">
          <img key={index} src={src(index)} alt="" draggable={false} />
        </div>
        {showInfo && (
          <TermWindow
            className="info-window"
            tabs={[{ key: 'info', label: current.file }]}
            onClose={() => {
              playCancel();
              setShowInfo(false);
            }}
          >
            <TypedInfo key={current.file} file={current.file} text={current.text} />
            <button
              className="info-close"
              onClick={() => {
                playCancel();
                setShowInfo(false);
              }}
            >
              {t('galeria.cerrar_ficha')}
            </button>
          </TermWindow>
        )}
      </div>
      <div className="gallery-viewer-bar">
        <button onClick={() => onIndex((index - 1 + count) % count)} aria-label={t('galeria.anterior')}>
          ◀
        </button>
        <span>{label(index)}</span>
        <button onClick={() => onIndex((index + 1) % count)} aria-label={t('galeria.siguiente')}>
          ▶
        </button>
        {/* Solo abre la ficha: se cierra desde la ficha (× o «Cerrar»). El «Cerrar» de esta barra cierra el visor. */}
        <button
          className={showInfo ? 'active' : ''}
          aria-pressed={showInfo}
          onClick={() => {
            if (showInfo) return;
            playSelect();
            setShowInfo(true);
          }}
        >
          {t('galeria.informacion')}
        </button>
        <button
          onClick={() => {
            playCancel();
            onClose();
          }}
        >
          {t('panel.cerrar')}
        </button>
      </div>
    </div>
  );
}

/** Ficha que se escribe letra por letra, con el sonido de escritura de la caja de diálogo. */
function TypedInfo({ file, text }: { file: string; text: string }) {
  const speed = useStore((s) => s.settings.textSpeed);
  const instant = speed >= TEXT_SPEED_INSTANT || useStore.getState().settings.reduceEffects;
  const [count, setCount] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant || !text) return;
    const start = performance.now();
    let frame = 0;
    startTyping();
    const tick = (now: number) => {
      const n = Math.floor(((now - start) / 1000) * Math.max(speed, 45));
      if (n >= text.length) {
        setCount(text.length);
        stopTyping();
        return;
      }
      setCount(n);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      stopTyping();
    };
  }, [text, speed, instant]);
  const done = count >= text.length;
  return (
    <div className="info-text">
      <div className="term-boot">
        <span className="term-prompt">$</span> <span>cat {file.replace(/\.webp$/, '.txt')}</span>
      </div>
      <p>
        {text.slice(0, count)}
        <span className={`info-cursor ${done ? 'blink' : ''}`}>▌</span>
        <span className="info-hidden">{text.slice(count)}</span>
      </p>
    </div>
  );
}
