import { useEffect, useState } from 'react';
import { useStore } from '../engine/store';
import { storyFiles } from '../engine/story';
import { assetUrl } from '../engine/assets';
import galeriaEs from '../data/galeria.json';
import galeriaEn from '../data/en/galeria.json';
import spriteConfig from '../../tools/sprites.config.json';
import { localized, useLang, useT } from '../engine/i18n';
import { Panel } from './Panels';
import { playCancel, playSelect } from '../engine/sound';

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
      <div className="gallery-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'imagenes'} className={tab === 'imagenes' ? 'active' : ''} onClick={() => pick('imagenes')}>
          {t('galeria.imagenes')} <span className="muted">{cgCount}/{CGS.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'personajes'} className={tab === 'personajes' ? 'active' : ''} onClick={() => pick('personajes')}>
          {t('galeria.personajes')} <span className="muted">{spriteCount}/{TOTAL_SPRITES}</span>
        </button>
      </div>
      {tab === 'imagenes' ? <Images /> : <Characters />}
    </Panel>
  );
}

function Images() {
  const seen = useStore((s) => s.cgSeen);
  const t = useT();
  const titles = localized(galeriaEs, galeriaEn, useLang()).titulos as Record<string, string>;
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
              <span className="gallery-title">{titles[id] ?? id}</span>
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
          label={(i) => titles[unlocked[i]] ?? unlocked[i]}
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
  const names = localized(galeriaEs, galeriaEn, useLang()).personajes as Record<string, string>;
  const [open, setOpen] = useState<{ id: string; index: number } | null>(null);
  const seenOf = (c: CharacterSprites) => c.sprites.filter((s) => s.scenes.some((id) => visited[id]));
  const current = open && CHARACTERS.find((c) => c.id === open.id);
  const currentSeen = current ? seenOf(current) : [];
  return (
    <>
      <div className="sprite-windows">
        {CHARACTERS.map((c) => {
          const seen = seenOf(c);
          const known = seen.length > 0;
          return (
            <section key={c.id} className={`sprite-window ${known ? '' : 'sprite-window-locked'}`}>
              <header className="sprite-window-head">
                <span className="term-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <h3>{known ? (names[c.id] ?? c.id) : '???'}</h3>
                <span className="muted">
                  {seen.length}/{c.sprites.length}
                </span>
              </header>
              <div className="sprite-grid">
                {c.sprites.map((s) =>
                  seen.includes(s) ? (
                    <button
                      key={s.expr}
                      className="sprite-cell"
                      onClick={() => setOpen({ id: c.id, index: seen.indexOf(s) })}
                      title={s.expr}
                    >
                      <img src={assetUrl(`sprites/${c.id}/${s.expr}.webp`)} alt="" loading="lazy" draggable={false} />
                    </button>
                  ) : (
                    <div key={s.expr} className="sprite-cell save-thumb-empty" aria-hidden>
                      <span className="save-thumb-nodata" data-text={t('guardar.sin_datos')}>
                        {t('guardar.sin_datos')}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
      {current && open && (
        <Viewer
          sprite
          src={(i) => assetUrl(`sprites/${current.id}/${currentSeen[i].expr}.webp`)}
          label={(i) => `${names[current.id] ?? current.id} · ${currentSeen[i].expr.replace(/_/g, ' ')}`}
          count={currentSeen.length}
          index={open.index}
          onIndex={(index) => setOpen({ id: current.id, index })}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** Visor a pantalla completa con flechas. Se cierra con «Cerrar» o Escape. */
function Viewer({
  src,
  label,
  count,
  index,
  onIndex,
  onClose,
  sprite,
}: {
  src: (i: number) => string;
  label: (i: number) => string;
  count: number;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  sprite?: boolean;
}) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % count);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onIndex, onClose]);
  return (
    <div className={`gallery-viewer ${sprite ? 'gallery-viewer-sprite' : ''}`}>
      <img key={index} src={src(index)} alt="" draggable={false} />
      <div className="gallery-viewer-bar">
        <button onClick={() => onIndex((index - 1 + count) % count)} aria-label={t('galeria.anterior')}>
          ◀
        </button>
        <span>{label(index)}</span>
        <button onClick={() => onIndex((index + 1) % count)} aria-label={t('galeria.siguiente')}>
          ▶
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
