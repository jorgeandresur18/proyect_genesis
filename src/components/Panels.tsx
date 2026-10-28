import type { CSSProperties, ReactNode } from 'react';
import { SAVE_SLOTS, TEXT_SPEED_INSTANT, canSaveGame, useStore } from '../engine/store';
import { BAD_END, endingName, endings } from '../engine/story';
import { detectLanguage, localized, useLang, useT } from '../engine/i18n';
import conoceMasEs from '../data/conoce_mas.json';
import conoceMasEn from '../data/en/conoce_mas.json';
import { enterPlayMode } from '../engine/mobile';
import { playCancel, playSelect } from '../engine/sound';
import { SaveThumb } from './SaveThumb';

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
  const t = useT();
  const close = () => {
    playCancel();
    onClose();
  };
  // Cada panel se abre como una terminal: la ventana se enciende, se «escribe» el comando y aparece el contenido.
  const slug = title.toLowerCase().replace(/\s*\(.*\)$/, '').replace(/\s+/g, '_');
  return (
    <div className="panel-backdrop" onClick={close}>
      <div className={`panel panel-terminal ${wide ? 'panel-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span className="term-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <h2>{title}</h2>
          <span className="term-path" aria-hidden>
            genesis@nexus:~/{slug}
          </span>
          <button onClick={close}>{t('panel.cerrar')}</button>
        </div>
        <div className="term-boot" aria-hidden>
          <span className="term-prompt">$</span> <span className="term-cmd">{t('terminal.abrir', { nombre: slug })}</span>
          <span className="term-ok"> {t('terminal.listo')}</span>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const history = useStore((s) => s.game?.history ?? []);
  const t = useT();
  return (
    <Panel title={t('historial.titulo')} onClose={onClose}>
      {history.length === 0 && <p className="muted">{t('historial.vacio')}</p>}
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
  const canSave = useStore((s) => !!s.game && canSaveGame(s.game));
  const { save, load, deleteSave } = useStore.getState();
  const t = useT();
  const lang = useLang();
  return (
    <Panel title={mode === 'save' ? t('guardar.titulo') : t('cargar.titulo')} onClose={onClose}>
      {Array.from({ length: SAVE_SLOTS }, (_, i) => {
        const slot = saves[i];
        return (
          <div key={i} className="slot">
            {slot ? (
              <SaveThumb sceneId={slot.sceneId} finished={slot.finished} />
            ) : (
              <div className="save-thumb save-thumb-empty" aria-hidden>
                <span className="save-thumb-nodata" data-text={t('guardar.sin_datos')}>
                  {t('guardar.sin_datos')}
                </span>
              </div>
            )}
            <div className="slot-info">
              <strong>{t('guardar.espacio', { n: i + 1 })}</strong>
              {slot ? (
                <>
                  <span className="muted">{new Date(slot.date).toLocaleString(lang)}</span>
                  <span>{slot.preview}</span>
                </>
              ) : (
                <span className="muted">{t('guardar.vacio')}</span>
              )}
            </div>
            <div className="slot-actions">
              {mode === 'save' ? (
                <button disabled={!canSave} onClick={() => save(i)}>
                  {t('guardar.guardar')}
                </button>
              ) : (
                <button
                  disabled={!slot}
                  onClick={() => {
                    void enterPlayMode();
                    load(i);
                    onClose();
                  }}
                >
                  {t('guardar.cargar')}
                </button>
              )}
              <button disabled={!slot} onClick={() => deleteSave(i)}>
                {t('guardar.borrar')}
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
  const t = useT();
  const lang = useLang();
  // Solo los finales que existen en esta versión: los del juego completo aparecen cuando estén escritos.
  const visible = endings.filter((e) => e.estado === 'jugable' && (!e.oculto || seen[e.id]));
  const groups = [
    { title: t('finales.grupo'), list: visible.filter((e) => e.tipo !== BAD_END) },
    { title: t('finales.bad'), list: visible.filter((e) => e.tipo === BAD_END) },
  ];
  return (
    <Panel title={t('finales.titulo')} onClose={onClose}>
      {groups.map((g) => (
        <section key={g.title} className="ending-group">
          <h3>
            {g.title} ({g.list.filter((e) => seen[e.id]).length}/{g.list.length})
          </h3>
          {g.list.length === 0 && (
            <p className="muted">{t('finales.proximos')}</p>
          )}
          {g.list.map((e) => (
            <div key={e.id} className={`ending ${seen[e.id] ? '' : 'ending-locked'}`}>
              <strong>{seen[e.id] ? endingName(e, lang) : '???'}</strong>
              <span className="muted">
                {e.pieza} · {e.tipo}
                {seen[e.id] ? ` · ${new Date(seen[e.id]).toLocaleDateString(lang)}` : ''}
              </span>
            </div>
          ))}
        </section>
      ))}
    </Panel>
  );
}

/** Extras: entradas a la galería de imágenes y a los finales, como comandos de la terminal. */
export function ExtrasPanel({ onClose, onOpen }: { onClose: () => void; onOpen: (o: 'gallery' | 'endings') => void }) {
  const t = useT();
  const entries = [
    { id: 'gallery' as const, cmd: 'galeria', label: t('extras.galeria'), desc: t('extras.galeria_desc') },
    { id: 'endings' as const, cmd: 'finales', label: t('extras.finales'), desc: t('extras.finales_desc') },
  ];
  return (
    <Panel title={t('extras.titulo')} onClose={onClose}>
      <div className="extras">
        {entries.map((e) => (
          <button
            key={e.id}
            className="extras-entry"
            onClick={() => {
              playSelect();
              onOpen(e.id);
            }}
          >
            <span className="term-prompt">&gt;</span>
            <span>
              <strong>{e.label}</strong>
              <small>{e.desc}</small>
            </span>
            <span className="extras-run">./{e.cmd}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

/** «Conoce más del proyecto»: qué es el juego, de qué trata, sus temas, cómo nació y enlaces del autor. */
export function AboutPanel({ onClose }: { onClose: () => void }) {
  const conoceMas = localized(conoceMasEs, conoceMasEn, useLang());
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

// Tamaños de texto de la caja de diálogo.
const TEXT_SIZES = [
  { label: 'opciones.tam_pequena', value: 0.9 },
  { label: 'opciones.tam_normal', value: 1 },
  { label: 'opciones.tam_grande', value: 1.15 },
  { label: 'opciones.tam_muy_grande', value: 1.3 },
];

export function OptionsPanel({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const t = useT();
  const lang = useLang();
  const detected = detectLanguage();
  return (
    <Panel title={t('opciones.titulo')} onClose={onClose}>
      <h3 className="options-section">{t('opciones.idioma')}</h3>
      <div className="option">
        <div className="segmented">
          {(['auto', 'es', 'en'] as const).map((l) => (
            <button key={l} className={settings.language === l ? 'active' : ''} onClick={() => setSettings({ language: l })}>
              {l === 'auto' ? `${t('idioma.auto')} (${t(`idioma.${detected.lang}`)})` : t(`idioma.${l}`)}
            </button>
          ))}
        </div>
        <span className="muted options-tip">
          {settings.language === 'auto'
            ? t('idioma.detectado', { idioma: t(`idioma.${detected.lang}`), codigo: detected.code })
            : t('idioma.elegido', { idioma: t(`idioma.${lang}`) })}
        </span>
        {t('idioma.historia_es') && <span className="muted options-tip">{t('idioma.historia_es')}</span>}
      </div>

      <h3 className="options-section">{t('opciones.lectura')}</h3>
      {/* Vista previa: muestra al momento el tamaño del texto y la opacidad de la caja. */}
      <div className="reading-preview" aria-hidden>
        <div className="dialog dialog-has-speaker" style={{ '--speaker': '#ff6fa5' } as CSSProperties}>
          <div className="dialog-speaker">Nikki</div>
          <div className="dialog-text">{t('opciones.preview')}</div>
        </div>
      </div>
      <div className="option">
        {t('opciones.tamano')}
        <div className="segmented">
          {TEXT_SIZES.map((s) => (
            <button
              key={s.value}
              className={settings.textScale === s.value ? 'active' : ''}
              onClick={() => setSettings({ textScale: s.value })}
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>
      <label className="option">
        {t('opciones.opacidad', { n: Math.round(settings.boxOpacity * 100) })}
        <input
          type="range"
          min={0.4}
          max={1}
          step={0.04}
          value={settings.boxOpacity}
          onChange={(e) => setSettings({ boxOpacity: Number(e.target.value) })}
        />
      </label>
      <label className="option">
        {t('opciones.velocidad', {
          v: settings.textSpeed >= TEXT_SPEED_INSTANT ? t('opciones.instantaneo') : t('opciones.letras', { n: settings.textSpeed }),
        })}
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
        {t('opciones.auto', { n: (settings.autoDelayMs / 1000).toFixed(1) })}
        <input
          type="range"
          min={300}
          max={5000}
          step={100}
          value={settings.autoDelayMs}
          onChange={(e) => setSettings({ autoDelayMs: Number(e.target.value) })}
        />
      </label>
      <p className="muted options-tip">{t('opciones.ocultar_tip')}</p>

      <h3 className="options-section">{t('opciones.sonido')}</h3>
      <label className="option">
        <input type="checkbox" checked={settings.muted} onChange={(e) => setSettings({ muted: e.target.checked })} />
        {t('opciones.silenciar')}
      </label>
      <label className="option">
        {t('opciones.musica', { n: Math.round(settings.musicVolume * 100) })}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.musicVolume}
          onChange={(e) => setSettings({ musicVolume: Number(e.target.value) })}
        />
      </label>
      <label className="option">
        {t('opciones.efectos', { n: Math.round(settings.sfxVolume * 100) })}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfxVolume}
          onChange={(e) => setSettings({ sfxVolume: Number(e.target.value) })}
        />
      </label>
      <label className="option">
        <input
          type="checkbox"
          checked={settings.typingSound}
          onChange={(e) => setSettings({ typingSound: e.target.checked })}
        />
        {t('opciones.tecleo')}
      </label>

      <h3 className="options-section">{t('opciones.pantalla')}</h3>
      <label className="option">
        <input
          type="checkbox"
          checked={settings.reduceEffects}
          onChange={(e) => setSettings({ reduceEffects: e.target.checked })}
        />
        {t('opciones.reducir')}
      </label>
    </Panel>
  );
}
