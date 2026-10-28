import { useEffect, useState } from 'react';
import { useStore } from '../engine/store';
import { storyFiles } from '../engine/story';
import { assetUrl } from '../engine/assets';
import galeria from '../data/galeria.json';
import { Panel } from './Panels';

const titles = galeria.titulos as Record<string, string>;

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

/** Galería de imágenes: las que ya se vieron en el juego se pueden abrir en grande; las demás, bloqueadas. */
export function CgGallery({ onClose }: { onClose: () => void }) {
  const seen = useStore((s) => s.cgSeen);
  const unlocked = CGS.filter((id) => seen[id]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i! + 1) % unlocked.length);
      if (e.key === 'ArrowLeft') setOpen((i) => (i! - 1 + unlocked.length) % unlocked.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, unlocked.length]);

  return (
    <Panel title={`Galería (${unlocked.length}/${CGS.length})`} onClose={onClose} wide>
      {CGS.length === 0 && <p className="muted">Todavía no hay imágenes.</p>}
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
        <div className="gallery-viewer" onClick={() => setOpen(null)}>
          <img src={assetUrl(`fondos/${unlocked[open]}.webp`)} alt="" draggable={false} />
          <div className="gallery-viewer-bar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen((open - 1 + unlocked.length) % unlocked.length)} aria-label="Anterior">
              ◀
            </button>
            <span>{titles[unlocked[open]] ?? unlocked[open]}</span>
            <button onClick={() => setOpen((open + 1) % unlocked.length)} aria-label="Siguiente">
              ▶
            </button>
            <button onClick={() => setOpen(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </Panel>
  );
}
