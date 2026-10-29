// Boringram en Extras: el celular de Jair, que se llena con la historia.
// - Datos en src/data/boringram.json; la versión en inglés (src/data/en/boringram.json) solo trae los textos
//   y se mezcla por posición también dentro de las listas.
// - Cada cosa se desbloquea al visitar su escena de «desbloqueo» (snapshots) y es nueva hasta que se ve
//   en el celular (galleryOpened, con claves «bor:…», igual que la galería).
import { useStore } from './store';
import { useLang } from './i18n';
import dataEs from '../data/boringram.json';
import dataEn from '../data/en/boringram.json';

export interface Perfil {
  usuario: string;
  nombre: string;
  foto: string;
  bio: string;
  publicaciones: number;
  seguidores: number;
  seguidos: number;
  te_sigue?: boolean;
  desbloqueo: string | null;
}
export interface Comentario {
  usuario: string;
  texto: string;
}
export interface Publicacion {
  id: string;
  autor: string;
  /** foto, texto (un pensamiento, como en X) o repost (de otra cuenta). */
  tipo: 'foto' | 'texto' | 'repost';
  imagen?: string;
  texto?: string;
  repost?: { usuario: string; texto: string };
  likes: number;
  /** Jair le dio me gusta. */
  te_gusta?: boolean;
  hace: string;
  comentarios: Comentario[];
  desbloqueo: string | null;
}
export interface Destacada {
  id: string;
  autor: string;
  titulo: string;
  imagen: string;
  texto: string;
  hace: string;
  desbloqueo: string | null;
}
export interface Mensaje {
  de: 'ella' | 'yo';
  texto: string;
  dia?: string;
  hora: string;
  destacado?: boolean;
  pendiente?: boolean;
  desbloqueo: string | null;
}
export interface Chat {
  id: string;
  perfil?: string;
  nombre?: string;
  estado: string;
  visto?: boolean;
  mensajes: Mensaje[];
}
export interface Notificacion {
  id: string;
  app: string;
  /** Emoji o símbolo; «bori» = el icono de Boringram. */
  icono: string;
  titulo: string;
  texto: string;
  hace: string;
  /** Solo se muestra con la batería baja (15 % o menos). */
  solo_bateria_baja?: boolean;
  desbloqueo: string | null;
}
export interface Estado {
  desbloqueo: string | null;
  reloj: string;
  bateria: number;
  /** Modo de ahorro de energía (batería en naranja). */
  ahorro?: boolean;
}
export interface BoringramData {
  yo: string;
  /** Dirección del juego publicado (para compartir). */
  sitio: string;
  sin_senal: { titulo: string; texto: string };
  perfiles: Record<string, Perfil>;
  publicaciones: Publicacion[];
  destacadas: Destacada[];
  chats: Chat[];
  notificaciones: Notificacion[];
  estado: Estado[];
  ajustes_rapidos: string[];
  dia: string;
  textos: Record<string, string>;
}

/** Mezcla profunda: objetos por clave y listas por posición (lo que no se traduce queda en español). */
function merge(a: unknown, b: unknown): unknown {
  if (b === undefined) return a;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => merge(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) out[k] = merge(out[k], v);
    return out;
  }
  return b;
}

/** Lo que agregan los capítulos siguientes (src/data/boringram/capNN.json), en orden de capítulo. */
type Extra = Partial<Pick<BoringramData, 'publicaciones' | 'destacadas' | 'notificaciones' | 'estado' | 'chats'>>;
const byName = (g: Record<string, Extra>) =>
  Object.keys(g)
    .sort()
    .map((k) => ({ name: k.split('/').pop()!, data: g[k] }));
const EXTRAS_ES = byName(import.meta.glob<Extra>('../data/boringram/*.json', { eager: true, import: 'default' }));
const EXTRAS_EN = byName(import.meta.glob<Extra>('../data/en/boringram/*.json', { eager: true, import: 'default' }));

/** Suma los extras: lo nuevo arriba en el inicio, los mensajes en su chat y el estado al final. */
function withExtras(base: BoringramData, extras: Extra[]): BoringramData {
  const out: BoringramData = { ...base, chats: base.chats.map((c) => ({ ...c, mensajes: [...c.mensajes] })) };
  for (const x of extras) {
    out.publicaciones = [...(x.publicaciones ?? []), ...out.publicaciones];
    out.destacadas = [...(x.destacadas ?? []), ...out.destacadas];
    out.notificaciones = [...(x.notificaciones ?? []), ...out.notificaciones];
    out.estado = [...out.estado, ...(x.estado ?? [])];
    for (const chat of x.chats ?? []) {
      const own = out.chats.find((c) => c.id === chat.id);
      if (own) own.mensajes.push(...chat.mensajes);
      else out.chats.unshift({ ...chat, mensajes: [...chat.mensajes] });
    }
  }
  return out;
}

const ES = withExtras(
  dataEs as unknown as BoringramData,
  EXTRAS_ES.map((x) => x.data),
);
const EN = withExtras(
  merge(dataEs, dataEn) as BoringramData,
  EXTRAS_ES.map((x) => merge(x.data, EXTRAS_EN.find((y) => y.name === x.name)?.data) as Extra),
);

/** Todas las escenas que desbloquean algo (para la prueba de rutas). */
export const unlockScenes = (): string[] =>
  [...Object.values(ES.perfiles), ...ES.publicaciones, ...ES.destacadas, ...ES.chats.flatMap((c) => c.mensajes), ...ES.notificaciones, ...ES.estado]
    .map((x) => x.desbloqueo)
    .filter((x): x is string => !!x);

export const postKey = (id: string) => `bor:post:${id}`;
export const storyKey = (id: string) => `bor:story:${id}`;
export const chatKey = (id: string, n: number) => `bor:chat:${id}:${n}`;

/** Lo desbloqueado en la partida guardada, y qué es nuevo. */
export function useBoringram() {
  const data = useLang() === 'en' ? EN : ES;
  const visited = useStore((s) => s.snapshots);
  const opened = useStore((s) => s.galleryOpened);
  const likes = useStore((s) => s.boringramLikes);
  const open = (x: { desbloqueo: string | null }) => !x.desbloqueo || !!visited[x.desbloqueo];
  const perfiles = Object.fromEntries(Object.entries(data.perfiles).filter(([, p]) => open(p)));
  const publicaciones = data.publicaciones.filter((p) => open(p) && perfiles[p.autor]);
  const destacadas = data.destacadas.filter((d) => open(d) && perfiles[d.autor]);
  const chats = data.chats
    .map((c) => ({ ...c, mensajes: c.mensajes.filter(open) }))
    .filter((c) => c.mensajes.length > 0);
  // Hora y batería: las del último punto de la historia que ya se jugó.
  const estado = [...data.estado].reverse().find((x) => open(x)) ?? data.estado[0];
  const notificaciones = data.notificaciones
    .filter(open)
    .filter((n) => !n.solo_bateria_baja || estado.bateria <= 15)
    .map((n) => ({ ...n, titulo: n.titulo.replace('{bateria}', String(estado.bateria)) }));
  // Me gusta: lo que el jugador tocó manda; si no tocó nada, lo de la historia (te_gusta).
  const liked = (p: Publicacion) => likes[p.id] ?? !!p.te_gusta;
  const likeCount = (p: Publicacion) => p.likes - (p.te_gusta ? 1 : 0) + (liked(p) ? 1 : 0);
  const newPosts = new Set(publicaciones.filter((p) => !opened[postKey(p.id)]).map((p) => p.id));
  const newStories = new Set(destacadas.filter((d) => !opened[storyKey(d.id)]).map((d) => d.id));
  // Los chats que Jair dejó en visto ya están leídos: no cuentan como nuevos.
  const newChats = new Set(chats.filter((c) => !c.visto && !opened[chatKey(c.id, c.mensajes.length)]).map((c) => c.id));
  return {
    data,
    unlocked: !!perfiles[data.yo],
    perfiles,
    publicaciones,
    destacadas,
    chats,
    notificaciones,
    estado,
    liked,
    likeCount,
    newPosts,
    newStories,
    newChats,
    hasNew: newPosts.size + newStories.size + newChats.size > 0,
  };
}
