import { useEffect, useRef, useState } from 'react';
import { useStore } from '../engine/store';
import { assetUrl } from '../engine/assets';
import { chatKey, postKey, storyKey, useBoringram, type Perfil, type Publicacion } from '../engine/boringram';
import { playCancel, playSelect } from '../engine/sound';
import { enterPortraitMode, releaseOrientation } from '../engine/mobile';
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

  // En celular, Boringram va en vertical; al cerrarlo se suelta la orientación.
  useEffect(() => {
    void enterPortraitMode();
    return releaseOrientation;
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`${s.screen} ${closing ? s.closing : ''}`}>
      <div className={s.phone}>
        <StatusBar />
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

function StatusBar() {
  const c = pantallas.boringram_historia;
  return (
    <div className={s.status}>
      <span>{c.reloj}</span>
      <span className={s.notch} />
      <span className={s.battery}>
        <i style={{ width: `${c.bateria}%` }} />
      </span>
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

function App({ b }: { b: B }) {
  const tx = b.data.textos;
  const [view, setView] = useState<View>({ kind: 'feed' });
  const scroller = useDragScroll();
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
    <>
      <AppBar />
      <div className={s.content} ref={scroller}>
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
    </>
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
  const tx = b.data.textos;
  return (
    <>
      <div className={s.postActions} aria-hidden>
        <svg viewBox="0 0 24 24" className={post.te_gusta ? s.liked : ''}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
        </svg>
      </div>
      <p className={s.likes}>
        {post.te_gusta
          ? tx.te_gusta.replace('{n}', String(post.likes - 1))
          : tx.me_gusta.replace('{n}', String(post.likes))}
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
  return (
    <article className={`${s.post} ${post.tipo !== 'foto' ? s.textPost : ''}`}>
      {post.tipo === 'repost' && <p className={s.repostTag}>⟳ {tx.reposteo.replace('{usuario}', user)}</p>}
      <PostHead b={b} post={post} onPerfil={onPerfil} />
      {post.tipo === 'foto' && (
        <div className={s.postImage}>
          <img src={assetUrl(post.imagen!)} alt="" loading="lazy" draggable={false} />
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
  const [tab, setTab] = useState<'fotos' | 'pensamientos'>('fotos');
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
        {(['fotos', 'pensamientos'] as const).map((k) => (
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
            {tx[k]}
            {(k === 'fotos' ? photos : thoughts).some((x) => b.newPosts.has(x.id)) && (
              <NewDot className={s.inlineDot} />
            )}
          </button>
        ))}
      </div>
      {tab === 'fotos' ? (
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
