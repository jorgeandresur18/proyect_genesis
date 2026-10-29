import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../engine/store';
import { assetUrl } from '../engine/assets';
import { useT } from '../engine/i18n';
import { chatKey, postKey, storyKey, useBoringram, type Perfil, type Publicacion } from '../engine/boringram';
import { playCancel, playSelect } from '../engine/sound';
import pantallas from '../data/pantallas.json';
import { Panel } from './Panels';
import { NewDot } from './CgGallery';
import s from './Boringram.module.css';

type View =
  | { kind: 'feed' }
  | { kind: 'mensajes' }
  | { kind: 'perfil'; id: string }
  | { kind: 'post'; id: string; back: View }
  | { kind: 'story'; id: string; back: View }
  | { kind: 'chat'; id: string };

/** Extras › Boringram: el celular de Jair. Se llena con lo que pasa en la historia. */
export function BoringramPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Panel title={t('extras.boringram')} onClose={onClose}>
      <div className={s.wrap}>
        <Phone />
      </div>
    </Panel>
  );
}

function Phone() {
  const b = useBoringram();
  const tx = b.data.textos;
  const [view, setView] = useState<View>({ kind: 'feed' });
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
      <Frame>
        <div className={s.noSignal}>
          <span className={s.noSignalIcon} aria-hidden>
            ✕
          </span>
          <b>{b.data.sin_senal.titulo}</b>
          <p>{b.data.sin_senal.texto}</p>
        </div>
      </Frame>
    );
  }

  const tab =
    view.kind === 'mensajes' || view.kind === 'chat'
      ? 'mensajes'
      : view.kind === 'perfil' && view.id === b.data.yo
        ? 'perfil'
        : 'inicio';
  return (
    <Frame>
      <div className={s.content}>
        {view.kind === 'feed' && <Feed b={b} onPerfil={(id) => go({ kind: 'perfil', id })} />}
        {view.kind === 'perfil' && (
          <Profile
            b={b}
            id={view.id}
            onPost={(id) => go({ kind: 'post', id, back: view })}
            onStory={(id) => go({ kind: 'story', id, back: view })}
            onBack={view.id === b.data.yo ? undefined : () => back({ kind: 'feed' })}
          />
        )}
        {view.kind === 'post' && (
          <PostView b={b} id={view.id} onBack={() => back(view.back)} onPerfil={(id) => go({ kind: 'perfil', id })} />
        )}
        {view.kind === 'mensajes' && <Inbox b={b} onChat={(id) => go({ kind: 'chat', id })} />}
        {view.kind === 'chat' && (
          <ChatView
            b={b}
            id={view.id}
            onBack={() => back({ kind: 'mensajes' })}
            onPerfil={(id) => go({ kind: 'perfil', id })}
          />
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
    </Frame>
  );
}

type B = ReturnType<typeof useBoringram>;

/** Marco del celular: barra de estado y la barra de la app, como en las escenas del juego. */
function Frame({ children }: { children: ReactNode }) {
  const c = pantallas.boringram_historia;
  return (
    <div className={s.phone}>
      <div className={s.status}>
        <span>{c.reloj}</span>
        <span className={s.notch} />
        <span className={s.battery}>
          <i style={{ width: `${c.bateria}%` }} />
        </span>
      </div>
      <div className={s.appBar}>
        <img src={assetUrl(pantallas.boringram.logo)} alt="Boringram" draggable={false} />
      </div>
      {children}
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

function PostHead({ b, autor, hace, onPerfil }: { b: B; autor: string; hace: string; onPerfil: (id: string) => void }) {
  const p = b.perfiles[autor];
  return (
    <button className={s.postHead} onClick={() => onPerfil(autor)}>
      <Avatar perfil={p} small ring={b.destacadas.some((d) => d.autor === autor && b.newStories.has(d.id))} />
      <b>{p?.usuario ?? autor}</b>
      <small>{hace}</small>
    </button>
  );
}

function Post({ b, post, onPerfil }: { b: B; post: Publicacion; onPerfil: (id: string) => void }) {
  const tx = b.data.textos;
  return (
    <article className={s.post}>
      <PostHead b={b} autor={post.autor} hace={post.hace} onPerfil={onPerfil} />
      <div className={s.postImage}>
        <img src={assetUrl(post.imagen)} alt="" loading="lazy" draggable={false} />
        {b.newPosts.has(post.id) && <NewDot className={s.itemDot} />}
      </div>
      <div className={s.postActions} aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
        </svg>
      </div>
      <p className={s.likes}>{tx.me_gusta.replace('{n}', String(post.likes))}</p>
      <p className={s.caption}>
        <b>{b.perfiles[post.autor]?.usuario}</b> {post.texto}
      </p>
    </article>
  );
}

function Feed({ b, onPerfil }: { b: B; onPerfil: (id: string) => void }) {
  if (b.publicaciones.length === 0) return <p className={s.empty}>{b.data.textos.sin_publicaciones}</p>;
  return (
    <div className={s.feed}>
      {b.publicaciones.map((p) => (
        <Post key={p.id} b={b} post={p} onPerfil={onPerfil} />
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
  const p = b.perfiles[id];
  const posts = b.publicaciones.filter((x) => x.autor === id);
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
      <div className={s.grid}>
        {posts.map((x) => (
          <button key={x.id} className={s.gridItem} onClick={() => onPost(x.id)}>
            <img src={assetUrl(x.imagen)} alt="" loading="lazy" draggable={false} />
            {b.newPosts.has(x.id) && <NewDot className={s.itemDot} />}
          </button>
        ))}
      </div>
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
      <Post b={b} post={post} onPerfil={onPerfil} />
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
        <button className={s.chatTitle} onClick={() => perfil && onPerfil(chat.perfil!)} disabled={!perfil}>
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
