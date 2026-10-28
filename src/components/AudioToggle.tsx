import { useEffect } from 'react';
import { useStore } from '../engine/store';
import { stopTyping } from '../engine/sound';
import { useT } from '../engine/i18n';

/** Botón para silenciar o activar todo el audio (también con la tecla M). */
export function AudioToggle() {
  const muted = useStore((s) => s.settings.muted);
  const t = useT();
  const toggle = () => {
    const next = !useStore.getState().settings.muted;
    if (next) stopTyping();
    useStore.getState().setSettings({ muted: next });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const label = muted ? t('audio.activar') : t('audio.silenciar');
  return (
    <button
      className={`audio-toggle ${muted ? 'audio-toggle-off' : ''}`}
      onClick={toggle}
      // Que no quede enfocado: Espacio debe seguir avanzando el texto.
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {muted ? (
          <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
        ) : (
          <>
            <path d="M16 9a4 4 0 0 1 0 6" />
            <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        )}
      </svg>
    </button>
  );
}
