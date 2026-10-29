import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { playSelect } from '../engine/sound';
import s from './Boringram.module.css';

/**
 * Teclado del celular de Boringram. Los campos de texto no son <input>: se escriben con este teclado
 * (tocando las teclas) o con el teclado físico. Así, en el celular de verdad no aparece el teclado del
 * sistema, y escribir no depende de que el campo tenga el foco.
 */
interface Field {
  id: string;
  text: string;
  placeholder: string;
  submitLabel: string;
  /** Devuelve true si se envió (se cierra el teclado y se borra el texto). */
  onSubmit: (text: string) => boolean;
}

interface Ctx {
  field: Field | null;
  open: (f: Omit<Field, 'text'>) => void;
}

const KeyboardContext = createContext<Ctx>({ field: null, open: () => {} });
const SetContext = createContext<(f: Field | null) => void>(() => {});

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [field, setField] = useState<Field | null>(null);
  return (
    <SetContext.Provider value={setField}>
      <KeyboardContext.Provider
        value={{ field, open: (f) => setField((old) => (old?.id === f.id ? old : { ...f, text: '' })) }}
      >
        {children}
        {field && <Keyboard field={field} setField={setField} />}
      </KeyboardContext.Provider>
    </SetContext.Provider>
  );
}

/** Campo de texto que se escribe con el teclado del celular. */
export function KeyboardField({
  id,
  placeholder,
  submitLabel,
  onSubmit,
  className = '',
  openRef,
}: {
  id: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => boolean;
  className?: string;
  /** Para abrir el teclado desde otro botón (p. ej. el globo de comentar). */
  openRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const { field, open } = useContext(KeyboardContext);
  const active = field?.id === id;
  const start = () => open({ id, placeholder, submitLabel, onSubmit });
  if (openRef) openRef.current = start;
  return (
    <button type="button" className={`${s.kbField} ${active ? s.kbFieldOn : ''} ${className}`} onClick={start}>
      {active && field.text ? (
        <span className={s.kbText}>{field.text}</span>
      ) : (
        <span className={s.kbPlaceholder}>{placeholder}</span>
      )}
      {active && <i className={s.kbCaret} />}
    </button>
  );
}

const ROWS = [
  ['á', 'é', 'í', 'ó', 'ú', '¿', '?', '¡', '!'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
];
const MAX = 140;

function Keyboard({ field, setField }: { field: Field; setField: (f: Field | null) => void }) {
  const [shift, setShift] = useState(false);
  const type = (ch: string) => {
    if (field.text.length >= MAX) return;
    setField({ ...field, text: field.text + (shift ? ch.toUpperCase() : ch) });
    setShift(false);
  };
  const erase = () => setField({ ...field, text: field.text.slice(0, -1) });
  const submit = () => {
    if (!field.text.trim()) return;
    if (field.onSubmit(field.text.trim())) setField(null);
  };
  // Teclado físico: se escucha en la fase de captura, para que las teclas no lleguen al juego (M, H, Espacio…).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let handled = true;
      if (e.key === 'Escape') setField(null);
      else if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') erase();
      else if (e.key.length === 1) {
        if (field.text.length < MAX) setField({ ...field, text: field.text + e.key });
      } else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const key = (ch: string, extra = '') => (
    <button
      key={ch}
      type="button"
      className={`${s.kbKey} ${extra}`}
      onPointerDown={(e) => {
        e.preventDefault();
        playSelect();
        type(ch);
      }}
    >
      {shift ? ch.toUpperCase() : ch}
    </button>
  );
  return (
    <div className={s.keyboard} onPointerDown={(e) => e.stopPropagation()}>
      <div className={s.kbBar}>
        <button type="button" className={s.kbHide} onClick={() => setField(null)} aria-label="Cerrar teclado">
          ⌄
        </button>
        {/* Lo que se va escribiendo: el teclado tapa el campo, así que se ve aquí. */}
        <span className={s.kbPreview}>
          {field.text ? (
            <span className={s.kbText}>{field.text}</span>
          ) : (
            <span className={s.kbPlaceholder}>{field.placeholder}</span>
          )}
          <i className={s.kbCaret} />
        </span>
        <button type="button" className={s.kbSend} disabled={!field.text.trim()} onClick={submit}>
          {field.submitLabel}
        </button>
      </div>
      <div className={`${s.kbRow} ${s.kbAccents}`}>{ROWS[0].map((c) => key(c, s.kbSmall))}</div>
      <div className={s.kbRow}>{ROWS[1].map((c) => key(c))}</div>
      <div className={s.kbRow}>{ROWS[2].map((c) => key(c))}</div>
      <div className={s.kbRow}>
        <button
          type="button"
          className={`${s.kbKey} ${s.kbWide} ${shift ? s.kbOn : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            setShift(!shift);
          }}
        >
          ⇧
        </button>
        {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((c) => key(c))}
        <button
          type="button"
          className={`${s.kbKey} ${s.kbWide}`}
          onPointerDown={(e) => {
            e.preventDefault();
            erase();
          }}
          aria-label="Borrar"
        >
          ⌫
        </button>
      </div>
      <div className={s.kbRow}>
        {key(',', s.kbWide)}
        <button
          type="button"
          className={`${s.kbKey} ${s.kbSpace}`}
          onPointerDown={(e) => {
            e.preventDefault();
            type(' ');
          }}
        >
          espacio
        </button>
        {key('.', s.kbWide)}
      </div>
    </div>
  );
}
