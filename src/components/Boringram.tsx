import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from '../engine/store';
import { assetUrl } from '../engine/assets';
import { chatKey, postKey, storyKey, useBoringram, type Perfil, type Publicacion } from '../engine/boringram';
import { playCancel, playSelect } from '../engine/sound';
import { enterPlayMode, enterPortraitMode, isTouch, releaseOrientation } from '../engine/mobile';
import pantallas from '../data/pantallas.json';
import { NewDot } from './CgGallery';
import s from './Boringram.module.css';

type View =
  | { kind: 'feed' }
  | { kind: 'mensajes' }
  | { kind: 'perfil'; id: string }
  | { kind: 'post'; id: string; back: View }
  | { kind: 'story'; id: string; back: View }
  | { kind: 'chat'; id: string };

type B = ReturnType<typeof useBoringram>;

/** Al abrir: el logo sobre negro y, un instante, el esqueleto de la app cargando. */
const BOOT_LOGO_MS = 900;
const BOOT_SKELETON_MS = 650;
const CLOSE_MS = 260;

/**
 * Extras › Boringram: el celular de Jair, a pantalla completa y en vertical. Se llena con lo que pasa
 * en la historia. Se cierra con «Cerrar» (o Escape).
 */
export function BoringramScreen({ onClose }: { onClose: () => void }) {
  const b = useBoringram();
  const reduce = useStore((st) => st.settings.reduceEffects);
  const [boot, setBoot] = useState<'logo' | 'skeleton' | 'app'>(reduce ? 'app' : 'logo');
  const [closing, setClosing] = useState(false);
  const [shade, setShade] = useState(false);

  // En celular, Boringram va en vertical; al cerrarlo se suelta la orientación.
  useEffect(() => {
    void enterPortraitMode();
    return () => {
      if (useStore.getState().game) void enterPlayMode();
      else releaseOrientation();
    };
  }, []);

  useEffect(() => {
    if (boot === 'app') return;
    const timer = setTimeout(
      () => setBoot(boot === 'logo' ? 'skeleton' : 'app'),
      boot === 'logo' ? BOOT_LOGO_MS : BOOT_SKELETON_MS,
    );
    return () => clearTimeout(timer);
  }, [boot]);

  const close = () => {
    if (closing) return;
    playCancel();
    if (reduce) return onClose();
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shade) setShade(false);
      else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`${s.screen} ${closing ? s.closing : ''}`}>
      <div className={s.phone}>
        <StatusBar b={b} onPull={() => boot === 'app' && setShade(true)} />
        {shade && <Shade b={b} onClose={() => setShade(false)} />}
        {boot === 'logo' ? (
          <div className={s.splash}>
            <img src={assetUrl(pantallas.boringram.logo)} alt="Boringram" draggable={false} />
          </div>
        ) : boot === 'skeleton' ? (
          <Skeleton label={b.data.textos.cargando} />
        ) : (
          <App b={b} />
        )}
      </div>
      {/* Celular en horizontal: se pide girarlo (solo se ve con CSS en esa situación). */}
      <div className={s.rotateHint} role="alert">
        <div className={s.rotatePhone} aria-hidden />
        <p>{b.data.textos.girar}</p>
        <p className={s.rotateNote}>{b.data.textos.girar_nota}</p>
      </div>
      <button className={s.closeBtn} onClick={close}>
        {b.data.textos.cerrar}
      </button>
    </div>
  );
}

/**
 * Barra de estado: a la izquierda la hora y las notificaciones (Boringram si hay publicaciones o historias
 * nuevas, mensajes si hay chats nuevos y el correo lleno de spam); a la derecha la alarma, la señal, el wifi
 * y la batería con su porcentaje (la de la historia: 12 %, en rojo).
 */
function StatusBar({ b, onPull }: { b: B; onPull: () => void }) {
  const c = pantallas.boringram_historia;
  const low = c.bateria <= 15;
  // Se baja el panel de notificaciones arrastrando la barra hacia abajo (o tocándola).
  const start = useRef<number | null>(null);
  return (
    <div
      className={s.status}
      onPointerDown={(e) => {
        start.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current !== null && e.clientY - start.current > 24) {
          start.current = null;
          onPull();
        }
      }}
      onPointerUp={() => {
        if (start.current !== null) onPull();
        start.current = null;
      }}
    >
      <span className={s.statusSide}>
        <span>{c.reloj}</span>
        {(b.newPosts.size > 0 || b.newStories.size > 0) && (
          <img className={s.statusApp} src={assetUrl('marca/boringram_icono.webp')} alt="" draggable={false} />
        )}
        {b.newChats.size > 0 && (
          <svg viewBox="0 0 24 24" className={s.statusIcon} aria-hidden>
            <path d="M4 5h16v11H9l-5 4z" fill="currentColor" />
          </svg>
        )}
        <svg viewBox="0 0 24 24" className={s.statusIcon} aria-hidden>
          <path d="M3 6h18v12H3z" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="m3 7 9 6 9-6" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </span>
      <span className={s.notch} />
      <span className={`${s.statusSide} ${s.statusRight}`}>
        <svg viewBox="0 0 24 24" className={s.statusIcon} aria-hidden>
          <circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path
            d="M12 9v4l2.5 2M5 4 2 7M19 4l3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <svg viewBox="0 0 24 24" className={s.statusIcon} aria-hidden>
          <rect x="2" y="15" width="3.6" height="5" rx="0.8" fill="currentColor" />
          <rect x="7.4" y="11" width="3.6" height="9" rx="0.8" fill="currentColor" />
          <rect x="12.8" y="7" width="3.6" height="13" rx="0.8" fill="currentColor" />
          <rect x="18.2" y="3" width="3.6" height="17" rx="0.8" fill="currentColor" opacity="0.35" />
        </svg>
        <svg viewBox="0 0 24 24" className={s.statusIcon} aria-hidden>
          <path d="M2 9.5a15 15 0 0 1 20 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M5.5 13a10 10 0 0 1 13 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M9 16.5a5 5 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="19.6" r="1.6" fill="currentColor" />
        </svg>
        <span className={`${s.batteryText} ${low ? s.batteryLow : ''}`}>{c.bateria}%</span>
        <span className={`${s.battery} ${low ? s.batteryLow : ''}`}>
          <i style={{ width: `${c.bateria}%` }} />
        </span>
      </span>
    </div>
  );
}

/**
 * Panel de notificaciones: baja desde la barra de estado, con la hora grande, ajustes rápidos que se prenden
 * y apagan y las notificaciones (apps parodia; se desbloquean con la historia). Se cierra arrastrando hacia
 * arriba, con la manija o tocando fuera de la lista.
 */
function Shade({ b, onClose }: { b: B; onClose: () => void }) {
  const tx = b.data.textos;
  const c = pantallas.boringram_historia;
  const [tiles, setTiles] = useState<Record<string, boolean>>({ 0: true, 1: true });
  const [cleared, setCleared] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<number | null>(null);
  const close = () => {
    if (leaving) return;
    playCancel();
    setLeaving(true);
    setTimeout(onClose, 220);
  };
  const list = cleared ? [] : b.notificaciones;
  return (
    <div
      className={`${s.shade} ${leaving ? s.shadeOut : ''}`}
      onPointerDown={(e) => (start.current = e.clientY)}
      onPointerMove={(e) => {
        if (start.current !== null && start.current - e.clientY > 40) {
          start.current = null;
          close();
        }
      }}
      onPointerUp={() => (start.current = null)}
    >
      <div className={s.shadeHead}>
        <span className={s.shadeClock}>{c.reloj}</span>
        <span className={s.shadeDay}>{b.data.dia}</span>
      </div>
      <div className={s.tiles}>
        {b.data.ajustes_rapidos.map((name, i) => (
          <button
            key={name}
            className={tiles[i] ? s.tileOn : ''}
            onClick={() => {
              playSelect();
              setTiles({ ...tiles, [i]: !tiles[i] });
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className={s.notifHead}>
        <b>{tx.notificaciones}</b>
        {list.length > 0 && (
          <button
            onClick={() => {
              playCancel();
              setCleared(true);
            }}
          >
            {tx.borrar_todo}
          </button>
        )}
      </div>
      <div className={s.notifList}>
        {list.length === 0 && <p className={s.empty}>{tx.sin_notificaciones}</p>}
        {list.map((n) => (
          <div key={n.id} className={s.notif}>
            <span className={s.notifIcon}>
              {n.icono === 'bori' ? (
                <img src={assetUrl('marca/boringram_icono.webp')} alt="" draggable={false} />
              ) : (
                n.icono
              )}
            </span>
            <span className={s.notifBody}>
              <small>
                {n.app} · {n.hace}
              </small>
              <b>{n.titulo}</b>
              <span>{n.texto}</span>
            </span>
          </div>
        ))}
      </div>
      <button className={s.shadeHandle} onClick={close} aria-label={tx.cerrar}>
        <i />
      </button>
    </div>
  );
}

/** Abre la ventana de compartir de una foto (ver ShareSheet). */
const ShareContext = createContext<(id: string) => void>(() => {});
const useShare = () => useContext(ShareContext);

/**
 * Compartir una foto de verdad: muestra la miniatura que se verá en las redes (public/compartir/<id>.jpg,
 * con su página <id>.html, ver tools/compartir.mjs) y abre Facebook, WhatsApp o X con el enlace, copia el
 * enlace, o comparte la imagen (Instagram no deja publicar desde la web: se guarda la imagen y se copia el
 * enlace).
 */
function ShareSheet({ b, id, onClose }: { b: B; id: string; onClose: () => void }) {
  const tx = b.data.textos;
  const post = b.publicaciones.find((p) => p.id === id);
  const [note, setNote] = useState('');
  // La imagen se prepara al abrir: compartir tiene que pedirse en el mismo toque, sin esperar una descarga
  // (si no, el navegador lo bloquea en silencio).
  const file = useRef<File | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(assetUrl(`compartir/${id}.jpg`))
      .then((r) => r.blob())
      .then((blob) => {
        if (alive) file.current = new File([blob], `${id}.jpg`, { type: 'image/jpeg' });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  if (!post) return null;
  const user = b.perfiles[post.autor]?.usuario ?? post.autor;
  const url = `${b.data.sitio}compartir/${id}.html`;
  const text = `${tx.compartir_texto} · ${user}: «${post.texto}»`;
  const card = assetUrl(`compartir/${id}.jpg`);
  const open = (href: string) => {
    playSelect();
    window.open(href, '_blank', 'noopener,noreferrer');
  };
  const copy = async () => {
    playSelect();
    try {
      await navigator.clipboard.writeText(url);
      setNote(tx.copiado);
    } catch {
      setNote(url);
    }
  };
  // En computadora, Instagram no deja publicar desde la web: se guarda la imagen, se copia el enlace y se
  // abre Instagram en otra pestaña para subirla.
  const instagramWeb = () => {
    const f = file.current;
    const a = document.createElement('a');
    a.href = f ? URL.createObjectURL(f) : card;
    a.download = `${id}.jpg`;
    a.click();
    if (f) setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    navigator.clipboard?.writeText(url).catch(() => {});
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setNote(tx.instagram_nota);
  };
  // En el celular: el menú de compartir del teléfono con la imagen (ahí se elige Instagram).
  const instagram = () => {
    playSelect();
    const f = file.current;
    if (isTouch() && f && navigator.canShare?.({ files: [f] })) {
      navigator.share({ files: [f] }).catch((e: Error) => {
        if (e.name !== 'AbortError') instagramWeb();
      });
      return;
    }
    instagramWeb();
  };
  const native = async () => {
    playSelect();
    await navigator.share?.({ title: 'PROYECT GENESIS', text, url }).catch(() => {});
  };
  return (
    <div className={s.sheetBackdrop} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <i className={s.sheetHandle} />
        <b className={s.sheetTitle}>{tx.compartir}</b>
        <a className={s.preview} href={url} target="_blank" rel="noreferrer">
          <img src={card} alt="" draggable={false} />
          <span>
            <b>{user} en Boringram · PROYECT GENESIS</b>
            <small>{new URL(b.data.sitio).host}</small>
          </span>
        </a>
        <div className={s.shareRow}>
          <button onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}>
            <span className={s.shareFb}>f</span>Facebook
          </button>
          <button onClick={instagram}>
            <img className={s.shareImg} src={assetUrl('marca/redes/instagram.webp')} alt="" draggable={false} />
            Instagram
          </button>
          <button onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`)}>
            <img className={s.shareImg} src={assetUrl('marca/redes/whatsapp.webp')} alt="" draggable={false} />
            WhatsApp
          </button>
          <button
            onClick={() =>
              open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
            }
          >
            <img className={s.shareImg} src={assetUrl('marca/redes/x.webp')} alt="" draggable={false} />X
          </button>
          <button onClick={copy}>
            <span className={s.shareLink}>🔗</span>
            {tx.copiar_enlace}
          </button>
          {typeof navigator.share === 'function' && (
            <button onClick={native}>
              <span className={s.shareLink}>⋯</span>
              {tx.mas}
            </button>
          )}
        </div>
        {note && <p className={s.shareNote}>{note}</p>}
      </div>
    </div>
  );
}

/** Esqueleto mientras «carga»: bloques grises en lugar de la cabecera, la foto y el texto. */
function Skeleton({ label }: { label: string }) {
  return (
    <div className={s.skeleton} aria-label={label}>
      <div className={s.skBar} />
      {[0, 1].map((i) => (
        <div key={i} className={s.skPost}>
          <div className={s.skHead}>
            <i className={s.skAvatar} />
            <i className={s.skLine} style={{ width: '38%' }} />
          </div>
          <i className={s.skImage} />
          <i className={s.skLine} style={{ width: '70%' }} />
          <i className={s.skLine} style={{ width: '45%' }} />
        </div>
      ))}
      <div className={s.skNav}>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

/**
 * Se desplaza como un celular: sin barra, arrastrando con el mouse (y soltando con inercia). Con el dedo,
 * el navegador ya desplaza solo. Si se arrastró, el clic al soltar no cuenta.
 */
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startY = 0;
    let startTop = 0;
    let lastY = 0;
    let lastT = 0;
    let speed = 0;
    let dragging = false;
    let moved = false;
    let frame = 0;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(frame);
      dragging = true;
      moved = false;
      startY = lastY = e.clientY;
      startTop = el.scrollTop;
      lastT = performance.now();
      speed = 0;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      if (Math.abs(e.clientY - startY) > 4) moved = true;
      el.scrollTop = startTop - (e.clientY - startY);
      const now = performance.now();
      speed = (lastY - e.clientY) / Math.max(1, now - lastT);
      lastY = e.clientY;
      lastT = now;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      let v = speed * 16;
      const glide = () => {
        if (Math.abs(v) < 0.4) return;
        el.scrollTop += v;
        v *= 0.94;
        frame = requestAnimationFrame(glide);
      };
      frame = requestAnimationFrame(glide);
    };
    const click = (e: MouseEvent) => {
      if (!moved) return;
      e.stopPropagation();
      e.preventDefault();
      moved = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('click', click, true);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('click', click, true);
    };
  }, []);
  return ref;
}

/**
 * Jalar para recargar: en el inicio, arrastrando hacia abajo desde arriba del todo (mouse o dedo) aparece
 * el icono girando; al soltar lo bastante abajo, «recarga» un momento y avisa que ya estás al día.
 */
function usePullToRefresh(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [pull, setPull] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let startY: number | null = null;
    let current = 0;
    const begin = (y: number) => {
      if (el.scrollTop <= 0 && state === 'idle') startY = y;
    };
    const drag = (y: number, e?: Event) => {
      if (startY === null) return;
      const dy = y - startY;
      if (dy <= 0) {
        current = 0;
        setPull(0);
        return;
      }
      if (e && e.cancelable) e.preventDefault();
      current = Math.min(110, dy * 0.5);
      setPull(current);
    };
    const end = () => {
      if (startY === null) return;
      startY = null;
      if (current > 60) {
        setState('loading');
        setPull(56);
        setTimeout(() => {
          setState('done');
          setTimeout(() => {
            setState('idle');
            setPull(0);
          }, 900);
        }, 1000);
      } else setPull(0);
      current = 0;
    };
    const md = (e: PointerEvent) => e.pointerType === 'mouse' && begin(e.clientY);
    const mm = (e: PointerEvent) => e.pointerType === 'mouse' && drag(e.clientY);
    const ts = (e: TouchEvent) => begin(e.touches[0].clientY);
    const tm = (e: TouchEvent) => drag(e.touches[0].clientY, e);
    el.addEventListener('pointerdown', md);
    window.addEventListener('pointermove', mm);
    window.addEventListener('pointerup', end);
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', end);
    return () => {
      el.removeEventListener('pointerdown', md);
      window.removeEventListener('pointermove', mm);
      window.removeEventListener('pointerup', end);
      el.removeEventListener('touchstart', ts);
      el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', end);
    };
  }, [ref, enabled, state]);
  return { pull, state };
}

function App({ b }: { b: B }) {
  const tx = b.data.textos;
  const [view, setView] = useState<View>({ kind: 'feed' });
  const scroller = useDragScroll();
  const refresh = usePullToRefresh(scroller, view.kind === 'feed');
  const [sharing, setSharing] = useState<string | null>(null);
  // Cada vista empieza arriba, como al cambiar de pantalla en el celular.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [view, scroller]);
  const markOpened = useStore((st) => st.markGalleryOpened);
  const go = (next: View) => {
    playSelect();
    setView(next);
  };
  const back = (to: View) => {
    playCancel();
    setView(to);
  };

  // Lo que se ve en el inicio deja de ser nuevo después de un momento (para que se alcance a ver la marca).
  useEffect(() => {
    if (view.kind !== 'feed') return;
    const timer = setTimeout(() => b.publicaciones.forEach((p) => markOpened(postKey(p.id))), 1500);
    return () => clearTimeout(timer);
  }, [view.kind, b.publicaciones, markOpened]);

  if (!b.unlocked) {
    return (
      <>
        <AppBar />
        <div className={s.noSignal}>
          <span className={s.noSignalIcon} aria-hidden>
            ✕
          </span>
          <b>{b.data.sin_senal.titulo}</b>
          <p>{b.data.sin_senal.texto}</p>
        </div>
      </>
    );
  }

  const onPerfil = (id: string) => {
    if (b.perfiles[id]) go({ kind: 'perfil', id });
  };
  const tab =
    view.kind === 'mensajes' || view.kind === 'chat'
      ? 'mensajes'
      : view.kind === 'perfil' && view.id === b.data.yo
        ? 'perfil'
        : 'inicio';
  return (
    <ShareContext.Provider
      value={(id) => {
        playSelect();
        setSharing(id);
      }}
    >
      <AppBar />
      <div className={s.content} ref={scroller}>
        {view.kind === 'feed' && (refresh.pull > 0 || refresh.state !== 'idle') && (
          <div className={s.pull} style={{ height: refresh.state === 'idle' ? refresh.pull : 56 }}>
            {refresh.state === 'done' ? (
              <span className={s.pullDone}>✓ {tx.al_dia}</span>
            ) : (
              <img
                className={refresh.state === 'loading' ? s.pullSpin : ''}
                style={
                  refresh.state === 'idle'
                    ? { transform: `rotate(${refresh.pull * 4}deg)`, opacity: refresh.pull / 60 }
                    : undefined
                }
                src={assetUrl('marca/boringram_icono.webp')}
                alt=""
                draggable={false}
              />
            )}
          </div>
        )}
        {view.kind === 'feed' && (
          <Feed b={b} onPerfil={onPerfil} onPost={(id) => go({ kind: 'post', id, back: view })} />
        )}
        {view.kind === 'perfil' && (
          <Profile
            b={b}
            id={view.id}
            onPost={(id) => go({ kind: 'post', id, back: view })}
            onStory={(id) => go({ kind: 'story', id, back: view })}
            onBack={view.id === b.data.yo ? undefined : () => back({ kind: 'feed' })}
          />
        )}
        {view.kind === 'post' && <PostView b={b} id={view.id} onBack={() => back(view.back)} onPerfil={onPerfil} />}
        {view.kind === 'mensajes' && <Inbox b={b} onChat={(id) => go({ kind: 'chat', id })} />}
        {view.kind === 'chat' && (
          <ChatView b={b} id={view.id} onBack={() => back({ kind: 'mensajes' })} onPerfil={onPerfil} />
        )}
      </div>
      {sharing && <ShareSheet b={b} id={sharing} onClose={() => setSharing(null)} />}
      {view.kind === 'story' && <StoryView b={b} id={view.id} onClose={() => back(view.back)} />}
      <nav className={s.nav}>
        <button className={tab === 'inicio' ? s.navOn : ''} onClick={() => go({ kind: 'feed' })} aria-label={tx.inicio}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />
          </svg>
          {b.newPosts.size > 0 && <NewDot className={s.navDot} />}
        </button>
        <button
          className={tab === 'mensajes' ? s.navOn : ''}
          onClick={() => go({ kind: 'mensajes' })}
          aria-label={tx.mensajes}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
          </svg>
          {b.newChats.size > 0 && <NewDot className={s.navDot} />}
        </button>
        <button
          className={tab === 'perfil' ? s.navOn : ''}
          onClick={() => go({ kind: 'perfil', id: b.data.yo })}
          aria-label={tx.perfil}
        >
          <Avatar perfil={b.perfiles[b.data.yo]} small />
        </button>
      </nav>
    </ShareContext.Provider>
  );
}

function AppBar() {
  return (
    <div className={s.appBar}>
      <img src={assetUrl(pantallas.boringram.logo)} alt="Boringram" draggable={false} />
    </div>
  );
}

function Avatar({
  perfil,
  small,
  ring,
  inicial,
}: {
  perfil?: Perfil;
  small?: boolean;
  ring?: boolean;
  inicial?: string;
}) {
  return (
    <span className={`${s.avatarRing} ${ring ? s.avatarStory : ''} ${small ? s.small : ''}`}>
      {perfil ? (
        <img className={s.avatar} src={assetUrl(perfil.foto)} alt="" draggable={false} />
      ) : (
        <span className={`${s.avatar} ${s.initial}`}>{inicial?.[0]?.toUpperCase()}</span>
      )}
    </span>
  );
}

function PostHead({ b, post, onPerfil }: { b: B; post: Publicacion; onPerfil: (id: string) => void }) {
  const p = b.perfiles[post.autor];
  return (
    <button className={s.postHead} onClick={() => onPerfil(post.autor)}>
      <Avatar perfil={p} small ring={b.destacadas.some((d) => d.autor === post.autor && b.newStories.has(d.id))} />
      <b>{p?.usuario ?? post.autor}</b>
      <small>{post.hace}</small>
    </button>
  );
}

/** Corazón (rojo si Jair le dio me gusta), comentar y enviar; luego los me gusta. */
function PostActions({ b, post }: { b: B; post: Publicacion }) {
  const onShare = useShare();
  const tx = b.data.textos;
  const setLike = useStore((st) => st.setBoringramLike);
  const liked = b.liked(post);
  const [pop, setPop] = useState(0);
  const n = b.likeCount(post);
  return (
    <>
      <div className={s.postActions}>
        <button
          className={s.likeBtn}
          aria-pressed={liked}
          aria-label={tx.me_gusta.replace('{n}', String(n))}
          onClick={() => {
            if (!liked) playSelect();
            setLike(post.id, !liked);
            setPop((p) => p + 1);
          }}
        >
          <svg key={pop} viewBox="0 0 24 24" className={`${liked ? s.liked : ''} ${pop ? s.likePop : ''}`}>
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          </svg>
        </button>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
        {post.tipo === 'foto' ? (
          <button className={s.likeBtn} onClick={() => onShare(post.id)} aria-label={tx.compartir}>
            <svg viewBox="0 0 24 24" className={s.shareIcon}>
              <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
            </svg>
          </button>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
          </svg>
        )}
      </div>
      <p className={s.likes}>
        {liked ? tx.te_gusta.replace('{n}', String(n - 1)) : tx.me_gusta.replace('{n}', String(n))}
      </p>
    </>
  );
}

/** En el inicio, los dos primeros comentarios (y «Ver los N comentarios» si hay más); abierta, todos. */
function Comments({ b, post, all, onMore }: { b: B; post: Publicacion; all?: boolean; onMore?: () => void }) {
  const tx = b.data.textos;
  if (post.comentarios.length === 0) return null;
  const list = all ? post.comentarios : post.comentarios.slice(0, 2);
  return (
    <div className={s.comments}>
      {!all && post.comentarios.length > 2 && (
        <button className={s.moreComments} onClick={onMore}>
          {tx.ver_comentarios.replace('{n}', String(post.comentarios.length))}
        </button>
      )}
      {list.map((c, i) => (
        <p key={i} className={c.usuario === b.data.yo ? s.myComment : ''}>
          <b>{c.usuario}</b> {c.texto}
        </p>
      ))}
    </div>
  );
}

function Post({
  b,
  post,
  onPerfil,
  onPost,
  full,
}: {
  b: B;
  post: Publicacion;
  onPerfil: (id: string) => void;
  onPost?: (id: string) => void;
  full?: boolean;
}) {
  const tx = b.data.textos;
  const user = b.perfiles[post.autor]?.usuario ?? post.autor;
  const isNew = b.newPosts.has(post.id);
  const setLike = useStore((st) => st.setBoringramLike);
  const [burst, setBurst] = useState(0);
  // Doble toque en la foto: me gusta (nunca lo quita), con el corazón grande.
  const doubleTap = () => {
    if (!b.liked(post)) playSelect();
    setLike(post.id, true);
    setBurst((x) => x + 1);
  };
  return (
    <article className={`${s.post} ${post.tipo !== 'foto' ? s.textPost : ''}`}>
      {post.tipo === 'repost' && <p className={s.repostTag}>⟳ {tx.reposteo.replace('{usuario}', user)}</p>}
      <PostHead b={b} post={post} onPerfil={onPerfil} />
      {post.tipo === 'foto' && (
        <div className={s.postImage} onDoubleClick={doubleTap}>
          <img src={assetUrl(post.imagen!)} alt="" loading="lazy" draggable={false} />
          {burst > 0 && (
            <svg key={burst} viewBox="0 0 24 24" className={s.burst} aria-hidden>
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
          )}
          {isNew && <NewDot className={s.itemDot} />}
        </div>
      )}
      {post.tipo === 'texto' && (
        <p className={s.thought}>
          {post.texto}
          {isNew && <NewDot className={s.inlineDot} />}
        </p>
      )}
      {post.tipo === 'repost' && (
        <blockquote className={s.quoted}>
          <b>@{post.repost!.usuario}</b>
          <span>{post.repost!.texto}</span>
          {isNew && <NewDot className={s.inlineDot} />}
        </blockquote>
      )}
      <PostActions b={b} post={post} />
      {post.tipo === 'foto' && (
        <p className={s.caption}>
          <b>{user}</b> {post.texto}
        </p>
      )}
      <Comments b={b} post={post} all={full} onMore={() => onPost?.(post.id)} />
    </article>
  );
}

function Feed({ b, onPerfil, onPost }: { b: B; onPerfil: (id: string) => void; onPost: (id: string) => void }) {
  if (b.publicaciones.length === 0) return <p className={s.empty}>{b.data.textos.sin_publicaciones}</p>;
  return (
    <div className={s.feed}>
      {b.publicaciones.map((p) => (
        <Post key={p.id} b={b} post={p} onPerfil={onPerfil} onPost={onPost} />
      ))}
    </div>
  );
}

function Profile({
  b,
  id,
  onPost,
  onStory,
  onBack,
}: {
  b: B;
  id: string;
  onPost: (id: string) => void;
  onStory: (id: string) => void;
  onBack?: () => void;
}) {
  const tx = b.data.textos;
  const [tab, setTab] = useState<'fotos' | 'pensamientos' | 'me_gusta'>('fotos');
  const mine = id === b.data.yo;
  const likedPosts = b.publicaciones.filter((x) => b.liked(x));
  const p = b.perfiles[id];
  const photos = b.publicaciones.filter((x) => x.autor === id && x.tipo === 'foto');
  const thoughts = b.publicaciones.filter((x) => x.autor === id && x.tipo !== 'foto');
  const stories = b.destacadas.filter((x) => x.autor === id);
  if (!p) return null;
  return (
    <div className={s.profile}>
      <div className={s.topBar}>
        {onBack && (
          <button className={s.backBtn} onClick={onBack} aria-label={tx.atras}>
            ‹
          </button>
        )}
        <b>{p.usuario}</b>
      </div>
      <div className={s.profileHead}>
        <Avatar perfil={p} ring={stories.some((x) => b.newStories.has(x.id))} />
        <div className={s.counts}>
          <span>
            <b>{p.publicaciones}</b>
            {tx.publicaciones}
          </span>
          <span>
            <b>{p.seguidores.toLocaleString()}</b>
            {tx.seguidores}
          </span>
          <span>
            <b>{p.seguidos}</b>
            {tx.seguidos}
          </span>
        </div>
      </div>
      <div className={s.bio}>
        <b>{p.nombre}</b>
        <p>{p.bio}</p>
      </div>
      {id !== b.data.yo && (
        <div className={s.followRow}>
          <span className={s.following}>{tx.siguiendo}</span>
          {p.te_sigue && <span className={s.followsYou}>{tx.te_sigue}</span>}
        </div>
      )}
      {stories.length > 0 && (
        <div className={s.highlights}>
          {stories.map((h) => (
            <button key={h.id} className={s.highlight} onClick={() => onStory(h.id)}>
              <span className={`${s.highlightRing} ${b.newStories.has(h.id) ? s.avatarStory : ''}`}>
                <img src={assetUrl(h.imagen)} alt="" draggable={false} />
              </span>
              <small>{h.titulo}</small>
              {b.newStories.has(h.id) && <NewDot className={s.highlightDot} />}
            </button>
          ))}
        </div>
      )}
      <div className={s.profileTabs} role="tablist">
        {(['fotos', 'pensamientos', 'me_gusta'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? s.profileTabOn : ''}
            onClick={() => {
              if (tab === k) return;
              playSelect();
              setTab(k);
            }}
          >
            {k === 'me_gusta' ? tx.me_gusta_tab : tx[k]}
            {k !== 'me_gusta' && (k === 'fotos' ? photos : thoughts).some((x) => b.newPosts.has(x.id)) && (
              <NewDot className={s.inlineDot} />
            )}
          </button>
        ))}
      </div>
      {tab === 'me_gusta' ? (
        !mine ? (
          <p className={s.privateLikes}>
            <span aria-hidden>🔒</span>
            {tx.likes_privados.replace('{usuario}', p.usuario)}
          </p>
        ) : likedPosts.length === 0 ? (
          <p className={s.empty}>{tx.likes_vacios}</p>
        ) : (
          <div className={s.grid}>
            {likedPosts.map((x) =>
              x.tipo === 'foto' ? (
                <button key={x.id} className={s.gridItem} onClick={() => onPost(x.id)}>
                  <img src={assetUrl(x.imagen!)} alt="" loading="lazy" draggable={false} />
                </button>
              ) : (
                <button key={x.id} className={`${s.gridItem} ${s.gridText}`} onClick={() => onPost(x.id)}>
                  <span>{x.tipo === 'repost' ? x.repost!.texto : x.texto}</span>
                </button>
              ),
            )}
          </div>
        )
      ) : tab === 'fotos' ? (
        <div className={s.grid}>
          {photos.map((x) => (
            <button key={x.id} className={s.gridItem} onClick={() => onPost(x.id)}>
              <img src={assetUrl(x.imagen!)} alt="" loading="lazy" draggable={false} />
              {b.newPosts.has(x.id) && <NewDot className={s.itemDot} />}
            </button>
          ))}
        </div>
      ) : (
        <div className={s.feed}>
          {thoughts.map((x) => (
            <Post key={x.id} b={b} post={x} onPerfil={() => undefined} onPost={onPost} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostView({
  b,
  id,
  onBack,
  onPerfil,
}: {
  b: B;
  id: string;
  onBack: () => void;
  onPerfil: (id: string) => void;
}) {
  const markOpened = useStore((st) => st.markGalleryOpened);
  useEffect(() => markOpened(postKey(id)), [id, markOpened]);
  const post = b.publicaciones.find((p) => p.id === id);
  if (!post) return null;
  return (
    <div className={s.feed}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack} aria-label={b.data.textos.atras}>
          ‹
        </button>
        <b>{b.perfiles[post.autor]?.usuario}</b>
      </div>
      <Post b={b} post={post} onPerfil={onPerfil} full />
    </div>
  );
}

/** Historia destacada: ocupa todo el celular, con la barra de progreso arriba. Se cierra con la ×. */
function StoryView({ b, id, onClose }: { b: B; id: string; onClose: () => void }) {
  const markOpened = useStore((st) => st.markGalleryOpened);
  useEffect(() => markOpened(storyKey(id)), [id, markOpened]);
  const h = b.destacadas.find((x) => x.id === id);
  if (!h) return null;
  const p = b.perfiles[h.autor];
  return (
    <div className={s.story}>
      <img className={s.storyImage} src={assetUrl(h.imagen)} alt="" draggable={false} />
      <div className={s.storyProgress}>
        <i />
      </div>
      <div className={s.storyHead}>
        <Avatar perfil={p} small />
        <b>{p?.usuario}</b>
        <small>{h.hace}</small>
        <button className={s.storyClose} onClick={onClose} aria-label={b.data.textos.atras}>
          ×
        </button>
      </div>
      <span className={s.storyText}>{h.texto}</span>
    </div>
  );
}

function Inbox({ b, onChat }: { b: B; onChat: (id: string) => void }) {
  const tx = b.data.textos;
  return (
    <div className={s.inbox}>
      <div className={s.topBar}>
        <b>{tx.mensajes}</b>
      </div>
      {b.chats.map((c) => {
        const perfil = c.perfil ? b.perfiles[c.perfil] : undefined;
        const last = c.mensajes[c.mensajes.length - 1];
        const isNew = b.newChats.has(c.id);
        return (
          <button key={c.id} className={`${s.chatRow} ${isNew ? s.unread : ''}`} onClick={() => onChat(c.id)}>
            <Avatar perfil={perfil} inicial={c.nombre} />
            <span className={s.chatInfo}>
              <b>{perfil?.usuario ?? c.nombre}</b>
              <small>
                {last.de === 'yo' ? `${tx.tu} ` : ''}
                {last.texto}
              </small>
            </span>
            {c.visto ? <span className={s.seen}>{tx.visto}</span> : isNew && <NewDot />}
          </button>
        );
      })}
    </div>
  );
}

function ChatView({
  b,
  id,
  onBack,
  onPerfil,
}: {
  b: B;
  id: string;
  onBack: () => void;
  onPerfil: (id: string) => void;
}) {
  const tx = b.data.textos;
  const markOpened = useStore((st) => st.markGalleryOpened);
  const chat = b.chats.find((c) => c.id === id);
  useEffect(() => {
    if (chat) markOpened(chatKey(chat.id, chat.mensajes.length));
  }, [chat, markOpened]);
  if (!chat) return null;
  const perfil = chat.perfil ? b.perfiles[chat.perfil] : undefined;
  return (
    <div className={s.chatView}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack} aria-label={tx.atras}>
          ‹
        </button>
        <button className={s.chatTitle} onClick={() => chat.perfil && onPerfil(chat.perfil)} disabled={!perfil}>
          <Avatar perfil={perfil} small inicial={chat.nombre} />
          <span>
            <b>{perfil?.usuario ?? chat.nombre}</b>
            <small>{chat.estado}</small>
          </span>
        </button>
      </div>
      <div className={s.messages}>
        {chat.mensajes.map((m, i) => (
          <div key={i} className={s.messageBlock}>
            {m.dia && <span className={s.day}>{m.dia}</span>}
            <div className={`${s.bubble} ${m.de === 'yo' ? s.mine : ''} ${m.destacado ? s.starred : ''}`}>
              {m.destacado && <span className={s.star}>{tx.destacado}</span>}
              {m.texto}
              <small>{m.pendiente ? '🕓' : m.hora}</small>
            </div>
          </div>
        ))}
        {chat.visto && <span className={s.seenLine}>{tx.visto_chat}</span>}
      </div>
      <div className={s.compose}>{tx.escribir}</div>
    </div>
  );
}
