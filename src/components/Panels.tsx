import type { ReactNode } from 'react';
import { SAVE_SLOTS, TEXT_SPEED_INSTANT, useStore } from '../engine/store';
import { BAD_END, endings } from '../engine/story';
import conoceMas from '../data/conoce_mas.json';

export function Panel({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="panel-backdrop" onClick={onClose}>
      <div className={`panel ${wide ? 'panel-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{title}</h2>
          <button onClick={onClose}>Cerrar</button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const history = useStore((s) => s.game?.history ?? []);
  return (
    <Panel title="Historial" onClose={onClose}>
      {history.length === 0 && <p className="muted">Vacío.</p>}
      {history.map((h, i) => (
        <p key={i} className={h.choice ? 'history-choice' : ''}>
          {h.choice ? '› ' : h.speaker ? <strong>{h.speaker}: </strong> : null}
          {h.text}
        </p>
      ))}
    </Panel>
  );
}

export function SaveLoadPanel({ mode, onClose }: { mode: 'save' | 'load'; onClose: () => void }) {
  const saves = useStore((s) => s.saves);
  const canSave = useStore((s) => !!s.game && !s.game.finished);
  const { save, load, deleteSave } = useStore.getState();
  return (
    <Panel title={mode === 'save' ? 'Guardar' : 'Cargar'} onClose={onClose}>
      {Array.from({ length: SAVE_SLOTS }, (_, i) => {
        const slot = saves[i];
        return (
          <div key={i} className="slot">
            <div className="slot-info">
              <strong>Espacio {i + 1}</strong>
              {slot ? (
                <>
                  <span className="muted">{new Date(slot.date).toLocaleString()}</span>
                  <span>{slot.preview}</span>
                </>
              ) : (
                <span className="muted">Vacío</span>
              )}
            </div>
            <div className="slot-actions">
              {mode === 'save' ? (
                <button disabled={!canSave} onClick={() => save(i)}>
                  Guardar
                </button>
              ) : (
                <button
                  disabled={!slot}
                  onClick={() => {
                    load(i);
                    onClose();
                  }}
                >
                  Cargar
                </button>
              )}
              <button disabled={!slot} onClick={() => deleteSave(i)}>
                Borrar
              </button>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

export function EndingsGallery({ onClose }: { onClose: () => void }) {
  const seen = useStore((s) => s.endingsSeen);
  const visible = endings.filter((e) => !e.oculto || seen[e.id]);
  const groups = [
    { title: 'Finales', list: visible.filter((e) => e.tipo !== BAD_END) },
    { title: 'Bad ends', list: visible.filter((e) => e.tipo === BAD_END) },
  ];
  return (
    <Panel title="Finales" onClose={onClose}>
      {groups.map((g) => (
        <section key={g.title} className="ending-group">
          <h3>
            {g.title} ({g.list.filter((e) => seen[e.id]).length}/{g.list.length})
          </h3>
          {g.list.map((e) => (
            <div key={e.id} className={`ending ${seen[e.id] ? '' : 'ending-locked'}`}>
              <strong>{seen[e.id] ? e.nombre : '???'}</strong>
              <span className="muted">
                {e.pieza} · {e.tipo}
                {seen[e.id] ? ` · ${new Date(seen[e.id]).toLocaleDateString()}` : ''}
              </span>
            </div>
          ))}
        </section>
      ))}
    </Panel>
  );
}

/** «Conoce más del proyecto»: qué es el juego, de qué trata, sus temas, cómo nació y enlaces del autor. */
export function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <Panel title={conoceMas.titulo} onClose={onClose}>
      <div className="about">
        <img className="about-logo" src={`${import.meta.env.BASE_URL}marca/logo.webp`} alt="PROYECT GENESIS" />
        {conoceMas.secciones.map((s) => (
          <section key={s.titulo} className="about-section">
            <h3>{s.titulo}</h3>
            {s.parrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
        <div className="about-links">
          {conoceMas.enlaces.map((l) => (
            <a
              key={l.url}
              className={`about-link ${'destacado' in l && l.destacado ? 'about-link-main' : ''}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {l.texto}
            </a>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function OptionsPanel({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  return (
    <Panel title="Opciones" onClose={onClose}>
      <label className="option">
        <input
          type="checkbox"
          checked={settings.reduceEffects}
          onChange={(e) => setSettings({ reduceEffects: e.target.checked })}
        />
        Reducir efectos (desactiva glitches y efectos de interfaz)
      </label>
      <label className="option">
        Velocidad del texto:{' '}
        {settings.textSpeed >= TEXT_SPEED_INSTANT ? 'instantáneo' : `${settings.textSpeed} letras por segundo`}
        <input
          type="range"
          min={10}
          max={TEXT_SPEED_INSTANT}
          step={5}
          value={Math.min(settings.textSpeed, TEXT_SPEED_INSTANT)}
          onChange={(e) => setSettings({ textSpeed: Number(e.target.value) })}
        />
      </label>
      <label className="option">
        Modo auto: pausa al terminar cada línea, {(settings.autoDelayMs / 1000).toFixed(1)} s
        <input
          type="range"
          min={300}
          max={5000}
          step={100}
          value={settings.autoDelayMs}
          onChange={(e) => setSettings({ autoDelayMs: Number(e.target.value) })}
        />
      </label>
    </Panel>
  );
}
