import { useEffect, useState, type ReactNode } from 'react';
import { TEXT_SPEED_INSTANT, useStore } from '../engine/store';
import { storyFiles } from '../engine/story';
import { assetUrl } from '../engine/assets';
import galeriaEs from '../data/galeria.json';
import galeriaEn from '../data/en/galeria.json';
import spriteConfig from '../../tools/sprites.config.json';
import { localized, useLang, useT } from '../engine/i18n';
import { Panel } from './Panels';
import { playCancel, playSelect, startTyping, stopTyping } from '../engine/sound';

/** Todas las imágenes de la galería: los fondos `fondos/cg_*.webp` del guion, en el orden en que aparecen. */
const CGS: string[] = (() => {
  const ids: string[] = [];
  for (const file of storyFiles) {
    for (const scene of file.scenes) {
      const m = scene.background?.match(/^fondos\/(cg_[a-z0-9_]+)\.webp$/);
      if (m && !ids.includes(m[1])) ids.push(m[1]);
    }
  }
  return ids;
})();

const ALIAS = Object.fromEntries(
  Object.entries(spriteConfig.personajes).map(([id, c]) => [id, ('alias' in c ? c.alias : {}) as Record<string, string>]),
);

interface CharacterSprites {
  id: string;
  /** Expresión (archivo real, sin sustitutos repetidos) -> escenas donde aparece. */
  sprites: { expr: string; scenes: string[] }[];
}

/**
 * Sprites de la galería: solo los que salen en los capítulos listados en galeria.json («capitulos_sprites»),
 * en el orden de «personajes». Una expresión que hoy es un sustituto de otra (ver tools/sprites.config.json)
 * cuenta como la otra, para no repetir la misma imagen.
 */
const CHARACTERS: CharacterSprites[] = (() => {
  const byId = new Map<string, Map<string, string[]>>();
  for (const file of storyFiles) {
    if (!galeriaEs.capitulos_sprites.includes(file.chapter)) continue;
    for (const scene of file.scenes) {
      for (const c of scene.characters) {
        const m = c.sprite.match(/^sprites\/([^/]+)\/([^/.]+)\.webp$/);
        if (!m) continue;
        const expr = ALIAS[m[1]]?.[m[2]] ?? m[2];
        const sprites = byId.get(m[1]) ?? new Map<string, string[]>();
        sprites.set(expr, [...(sprites.get(expr) ?? []), scene.scene_id]);
        byId.set(m[1], sprites);
      }
    }
  }
  const order = Object.keys(galeriaEs.personajes);
  return [...byId.keys()]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map((id) => ({ id, sprites: [...byId.get(id)!].map(([expr, scenes]) => ({ expr, scenes })) }));
})();

const TOTAL_SPRITES = CHARACTERS.reduce((n, c) => n + c.sprites.length, 0);

interface Texts {
  titulos: Record<string, string>;
  info_imagenes: Record<string, string>;
  personajes: Record<string, string>;
  sprites: Record<string, { nombre: string; info: string }>;
}
const useTexts = () => localized(galeriaEs, galeriaEn, useLang()) as unknown as Texts;

type Tab = 'imagenes' | 'personajes';

/** Galería: imágenes del juego y sprites de los personajes. Lo que no se vio todavía queda bloqueado. */
export function CgGallery({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('imagenes');
  const cgSeen = useStore((s) => s.cgSeen);
  const visited = useStore((s) => s.snapshots);
  const cgCount = CGS.filter((id) => cgSeen[id]).length;
  const spriteCount = CHARACTERS.reduce((n, c) => n + c.sprites.filter((s) => s.scenes.some((id) => visited[id])).length, 0);
  const pick = (next: Tab) => {
    if (next === tab) return;
    playSelect();
    setTab(next);
  };
  return (
    <Panel title={t('galeria.titulo', { vistas: cgCount + spriteCount, total: CGS.length + TOTAL_SPRITES })} onClose={onClose} wide>
      <TermWindow
        className="gallery-term"
        tabs={[
          { key: 'imagenes', label: t('galeria.imagenes'), extra: `${cgCount}/${CGS.length}` },
          { key: 'personajes', label: t('galeria.personajes'), extra: `${spriteCount}/${TOTAL_SPRITES}` },
        ]}
        active={tab}
        onTab={(k) => pick(k as Tab)}
      >
        {tab === 'imagenes' ? <Images /> : <Characters />}
      </TermWindow>
    </Panel>
  );
}

/**
 * Ventana con pestañas como las de una terminal (ícono, título, ×, «+» y la flecha).
 * `onClose` en una pestaña muestra su ×; el «+» y la flecha son decorativos.
 */
function TermWindow({
  tabs,
  active,
  onTab,
  onClose,
  right,
  className = '',
  children,
}: {
  tabs: { key: string; label: string; extra?: string }[];
  active?: string;
  onTab?: (key: string) => void;
  onClose?: () => void;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section className={`wt-window ${className}`}>
      <div className="wt-tabs" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            role="tab"
            aria-selected={tab.key === (active ?? tabs[0].key)}
            className={`wt-tab ${tab.key === (active ?? tabs[0].key) ? 'active' : ''} ${onTab ? 'clickable' : ''}`}
            onClick={() => onTab?.(tab.key)}
          >
            <span className="wt-icon" aria-hidden>
              ›_
            </span>
            <span className="wt-label">{tab.label}</span>
            {tab.extra && <span className="wt-extra">{tab.extra}</span>}
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
  const seen = useStore((s) => s.cgSeen);
  const t = useT();
  const texts = useTexts();
  const unlocked = CGS.filter((id) => seen[id]);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {CGS.length === 0 && <p className="muted">{t('galeria.vacia')}</p>}
      <div className="gallery-grid">
        {CGS.map((id) =>
          seen[id] ? (
            <button key={id} className="gallery-item" onClick={() => setOpen(unlocked.indexOf(id))}>
              <div className="gallery-thumb">
                <img src={assetUrl(`fondos/${id}.webp`)} alt="" loading="lazy" draggable={false} />
              </div>
              <span className="gallery-title">{texts.titulos[id] ?? id}</span>
            </button>
          ) : (
            <button key={id} className="gallery-item gallery-locked" disabled>
              <div className="gallery-thumb">?</div>
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
          count={unlocked.length}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** Una ventana por personaje. Si todavía no apareció en la historia, su nombre es «???». */
function Characters() {
  const visited = useStore((s) => s.snapshots);
  const t = useT();
  const texts = useTexts();
  const [open, setOpen] = useState<{ id: string; index: number } | null>(null);
  const seenOf = (c: CharacterSprites) => c.sprites.filter((s) => s.scenes.some((id) => visited[id]));
  const nameOf = (id: string, expr: string) => texts.sprites[`${id}/${expr}`]?.nombre ?? expr.replace(/_/g, ' ');
  const current = open && CHARACTERS.find((c) => c.id === open.id);
  const currentSeen = current ? seenOf(current) : [];
  return (
    <>
      <div className="sprite-windows">
        {CHARACTERS.map((c) => {
          const seen = seenOf(c);
          const known = seen.length > 0;
          return (
            <TermWindow
              key={c.id}
              className={known ? '' : 'sprite-window-locked'}
              tabs={[{ key: c.id, label: known ? (texts.personajes[c.id] ?? c.id) : '???' }]}
              right={`${seen.length}/${c.sprites.length}`}
            >
              <div className="sprite-grid">
                {c.sprites.map((s) =>
                  seen.includes(s) ? (
                    <button key={s.expr} className="sprite-item" onClick={() => setOpen({ id: c.id, index: seen.indexOf(s) })}>
                      <span className="sprite-cell">
                        <img src={assetUrl(`sprites/${c.id}/${s.expr}.webp`)} alt="" loading="lazy" draggable={false} />
                      </span>
                      <span className="sprite-name">{nameOf(c.id, s.expr)}</span>
                    </button>
                  ) : (
                    <div key={s.expr} className="sprite-item" aria-hidden>
                      <span className="sprite-cell save-thumb-empty">
                        <span className="save-thumb-nodata" data-text={t('guardar.sin_datos')}>
                          {t('guardar.sin_datos')}
                        </span>
                      </span>
                      <span className="sprite-name muted">???</span>
                    </div>
                  ),
                )}
              </div>
            </TermWindow>
          );
        })}
      </div>
      {current && open && (
        <Viewer
          sprite
          src={(i) => assetUrl(`sprites/${current.id}/${currentSeen[i].expr}.webp`)}
          label={(i) => `${texts.personajes[current.id] ?? current.id} · ${nameOf(current.id, currentSeen[i].expr)}`}
          info={(i) => ({
            file: `${current.id}/${currentSeen[i].expr}.webp`,
            text: texts.sprites[`${current.id}/${currentSeen[i].expr}`]?.info ?? '',
          })}
          count={currentSeen.length}
          index={open.index}
          onIndex={(index) => setOpen({ id: current.id, index })}
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
  count,
  index,
  onIndex,
  onClose,
  sprite,
}: {
  src: (i: number) => string;
  label: (i: number) => string;
  info: (i: number) => { file: string; text: string };
  count: number;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  sprite?: boolean;
}) {
  const t = useT();
  const [showInfo, setShowInfo] = useState(false);
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
    <div className={`gallery-viewer ${sprite ? 'gallery-viewer-sprite' : ''} ${showInfo ? 'gallery-viewer-info' : ''}`}>
      <img key={index} src={src(index)} alt="" draggable={false} />
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
            {t('panel.cerrar')}
          </button>
        </TermWindow>
      )}
      <div className="gallery-viewer-bar">
        <button onClick={() => onIndex((index - 1 + count) % count)} aria-label={t('galeria.anterior')}>
          ◀
        </button>
        <span>{label(index)}</span>
        <button onClick={() => onIndex((index + 1) % count)} aria-label={t('galeria.siguiente')}>
          ▶
        </button>
        <button
          className={showInfo ? 'active' : ''}
          onClick={() => {
            if (showInfo) playCancel();
            else playSelect();
            setShowInfo(!showInfo);
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
