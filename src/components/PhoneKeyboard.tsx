import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { playSelect } from '../engine/sound';
import s from './Boringram.module.css';

/**
 * Teclado del celular de Boringram. Los campos de texto no son <input>: se escriben con este teclado
 * (tocando las teclas: letras, números, signos y emojis) o con el teclado físico. Así, en el celular de verdad no aparece el teclado del
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
    <button
      type="button"
      className={`${s.kbField} ${active ? s.kbFieldOn : ''} ${className}`}
      data-kb-on={active || undefined}
      onClick={start}
    >
      {active && field.text ? (
        <span className={s.kbText}>{field.text}</span>
      ) : (
        <span className={s.kbPlaceholder}>{placeholder}</span>
      )}
      {active && <i className={s.kbCaret} />}
    </button>
  );
}

type Layout = 'abc' | 'sym' | 'emoji';
const LETTERS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const SYMBOLS = [
  ['á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '?', '¡', '!'],
  ['@', '#', '$', '%', '&', '-', '+', '(', ')', '/'],
  ['*', '"', "'", ':', ';', '_', '=', '<', '>', '~'],
  ['[', ']', '{', '}', '|', '€', '°', '^', '…'],
];
const EMOJIS = [
  '😂',
  '🤣',
  '😅',
  '😊',
  '😍',
  '🥰',
  '😘',
  '😎',
  '🤔',
  '🙄',
  '😏',
  '😳',
  '🥺',
  '😭',
  '😡',
  '🤯',
  '😴',
  '🤮',
  '💀',
  '👀',
  '🙏',
  '👏',
  '👍',
  '👎',
  '💪',
  '🔥',
  '✨',
  '💯',
  '❤️',
  '💔',
  '🍺',
  '🎉',
];
const MAX = 140;

type Segmenter = new (l: string, o: object) => { segment: (t: string) => Iterable<{ segment: string }> };

/** Borra el último carácter visible (un emoji puede ocupar varios). */
function dropLast(text: string) {
  const Seg = (Intl as unknown as { Segmenter?: Segmenter }).Segmenter;
  const parts = Seg
    ? [...new Seg('es', { granularity: 'grapheme' }).segment(text)].map((x) => x.segment)
    : Array.from(text);
  return parts.slice(0, -1).join('');
}

function Keyboard({ field, setField }: { field: Field; setField: (f: Field | null) => void }) {
  const [shift, setShift] = useState(!field.text);
  const [layout, setLayout] = useState<Layout>('abc');
  const ref = useRef<HTMLDivElement>(null);
  const type = (ch: string) => {
    if (field.text.length >= MAX) return;
    setField({ ...field, text: field.text + (shift ? ch.toUpperCase() : ch) });
    setShift(false);
  };
  const erase = () => setField({ ...field, text: dropLast(field.text) });
  const submit = () => {
    if (!field.text.trim()) return;
    if (field.onSubmit(field.text.trim())) setField(null);
  };
  // La altura del teclado queda en --kb-h, para que la pantalla suba lo que tapa (el pie de las historias, la lista).
  useLayoutEffect(() => {
    const host = ref.current?.offsetParent as HTMLElement | null;
    if (!ref.current || !host) return;
    host.style.setProperty('--kb-h', `${ref.current.offsetHeight}px`);
    return () => {
      host.style.removeProperty('--kb-h');
    };
  }, []);
  // Si el campo queda debajo del teclado, se desplaza la lista hasta que se vea.
  useEffect(() => {
    const kb = ref.current;
    const host = kb?.offsetParent;
    const el = document.querySelector<HTMLElement>('[data-kb-on]');
    const list = el?.closest<HTMLElement>(`.${s.content}`);
    if (!kb || !host || !el || !list) return;
    const kbTop = host.getBoundingClientRect().bottom - kb.getBoundingClientRect().height;
    const over = el.getBoundingClientRect().bottom + 10 - kbTop;
    if (over > 0) list.scrollBy({ top: over, behavior: 'smooth' });
  }, [field.id]);
  // Teclado físico: se escucha en la fase de captura, para que las teclas no lleguen al juego (M, H, Espacio…).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let handled = true;
      if (e.key === 'Escape') setField(null);
      else if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') erase();
      else if (e.key.length === 1 || /\p{Extended_Pictographic}/u.test(e.key)) {
        if (field.text.length < MAX) setField({ ...field, text: field.text + e.key });
        setShift(false);
      } else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const btn = (label: ReactNode, action: () => void, extra = '', k = String(label), aria?: string) => (
    <button
      key={k}
      type="button"
      className={`${s.kbKey} ${extra}`}
      aria-label={aria}
      onPointerDown={(e) => {
        e.preventDefault();
        playSelect();
        action();
      }}
    >
      {label}
    </button>
  );
  const key = (ch: string, extra = '') => btn(shift ? ch.toUpperCase() : ch, () => type(ch), extra, ch);
  const raw = (ch: string, extra = '') => btn(ch, () => type(ch), extra, ch);
  const backspace = btn('⌫', erase, s.kbWide, 'borrar', 'Borrar');
  return (
    <div ref={ref} className={s.keyboard} onPointerDown={(e) => e.stopPropagation()}>
      <div className={s.kbBar}>
        <button type="button" className={s.kbHide} onClick={() => setField(null)} aria-label="Cerrar teclado">
          ⌄
        </button>
      </div>
      {layout === 'emoji' ? (
        <div className={s.kbEmojis}>{EMOJIS.map((c) => raw(c, s.kbEmoji))}</div>
      ) : layout === 'sym' ? (
        <>
          {SYMBOLS.slice(0, 3).map((row, i) => (
            <div key={i} className={s.kbRow}>
              {row.map((c) => raw(c))}
            </div>
          ))}
          <div className={s.kbRow}>
            {SYMBOLS[3].map((c) => raw(c))}
            {backspace}
          </div>
        </>
      ) : (
        <>
          <div className={s.kbRow}>{LETTERS[0].map((c) => raw(c, s.kbSmall))}</div>
          <div className={s.kbRow}>{LETTERS[1].map((c) => key(c))}</div>
          <div className={s.kbRow}>{LETTERS[2].map((c) => key(c))}</div>
          <div className={s.kbRow}>
            {btn('⇧', () => setShift(!shift), `${s.kbWide} ${shift ? s.kbOn : ''}`, 'shift', 'Mayúscula')}
            {LETTERS[3].map((c) => key(c))}
            {backspace}
          </div>
        </>
      )}
      <div className={s.kbRow}>
        {layout === 'abc'
          ? btn('?123', () => setLayout('sym'), `${s.kbWide} ${s.kbMode}`, 'modo')
          : btn('ABC', () => setLayout('abc'), `${s.kbWide} ${s.kbMode}`, 'modo')}
        {layout !== 'emoji' && btn('😊', () => setLayout('emoji'), s.kbWide, 'emojis', 'Emojis')}
        {raw(',')}
        {btn('espacio', () => type(' '), s.kbSpace)}
        {raw('.')}
        {layout === 'emoji' && backspace}
        <button
          type="button"
          className={`${s.kbKey} ${s.kbEnter}`}
          disabled={!field.text.trim()}
          aria-label={field.submitLabel}
          title={field.submitLabel}
          onPointerDown={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          ↵
        </button>
      </div>
    </div>
  );
}
