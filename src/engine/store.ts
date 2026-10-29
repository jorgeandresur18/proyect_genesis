import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Vars } from './types';
import { config, scenes, variables } from './story';
import { applyChoice, enterScene, resolveNext, visibleChoices } from './logic';

export const SAVE_SLOTS = 6;
const HISTORY_LIMIT = 300;

export interface HistoryEntry {
  speaker: string | null;
  text: string;
  /** true si la entrada es una decisión del jugador. */
  choice?: boolean;
  /** Escena de la línea (y posición de la opción elegida), para mostrarla traducida. */
  sid?: string;
  ci?: number;
}

export interface GameState {
  sceneId: string;
  vars: Vars;
  history: HistoryEntry[];
  /** ID del final mostrado al terminar la partida. */
  finished: string | null;
}

export interface SaveSlot {
  sceneId: string;
  vars: Vars;
  history: HistoryEntry[];
  date: string;
  preview: string;
  /** Guardado en la pantalla de fin de capítulo: al cargar se vuelve a ella. */
  finished?: string | null;
}

export interface Settings {
  reduceEffects: boolean;
  /** Pausa del modo auto después de que el texto terminó de escribirse. */
  autoDelayMs: number;
  /** Caracteres por segundo; TEXT_SPEED_INSTANT o más = texto instantáneo. */
  textSpeed: number;
  /** Volumen de los efectos de sonido, de 0 a 1. */
  sfxVolume: number;
  /** Sonido mientras el texto se escribe. */
  typingSound: boolean;
  /** Volumen de la música, de 0 a 1. */
  musicVolume: number;
  /** Silencia música y efectos sin tocar los volúmenes. */
  muted: boolean;
  /** Tamaño del texto de la caja de diálogo (1 = normal). */
  textScale: number;
  /** Opacidad del fondo de la caja de diálogo, de 0,4 a 1. */
  boxOpacity: number;
  /** Idioma: «auto» usa el del navegador (ver engine/i18n.ts). */
  language: 'auto' | 'es' | 'en';
}

export const TEXT_SPEED_INSTANT = 130;
const DEFAULT_SETTINGS: Settings = { reduceEffects: false, autoDelayMs: 1500, textSpeed: 45, sfxVolume: 0.6, typingSound: true, musicVolume: 0.5, muted: false, textScale: 1, boxOpacity: 0.88, language: 'auto' };

export type Mode = 'normal' | 'auto' | 'skip';

/** Prefijo de `game.finished` cuando la partida se detiene en un fin de capítulo (no es un final). */
export const CHAPTER_END = 'capitulo:';

/** Se puede guardar en medio de la partida y en el fin de capítulo, no en la pantalla de un final. */
export function canSaveGame(game: GameState): boolean {
  return !game.finished || game.finished.startsWith(CHAPTER_END);
}

interface Store {
  settings: Settings;
  game: GameState | null;
  saves: (SaveSlot | null)[];
  /** Escenas leídas alguna vez (para saltar texto leído y el mapa). */
  readScenes: Record<string, true>;
  /** Variables con las que se vio cada escena por primera vez (para saltar desde el mapa). */
  snapshots: Record<string, Vars>;
  /** Finales alcanzados, con fecha. */
  endingsSeen: Record<string, string>;
  /** Imágenes de la galería ya vistas (id del fondo, p. ej. `cg_beso_nikki`). */
  cgSeen: Record<string, true>;
  /** Opciones elegidas alguna vez, como `scene_id#índice` (índice en `scene.choices`). Para el mapa. */
  choicesTaken: Record<string, true>;
  mode: Mode;
  error: string | null;
  /** El texto de la línea actual ya terminó de escribirse (efecto máquina de escribir). */
  textDone: boolean;

  /** Partida nueva desde el inicio (o desde `start`, para probar un capítulo en borrador). */
  newGame: (start?: string) => void;
  advance: () => void;
  /** Clic o Espacio: si el texto se está escribiendo, lo completa; si ya terminó, avanza. */
  next: () => void;
  setTextDone: (done: boolean) => void;
  /** Marca una imagen de la galería como vista. */
  markCg: (id: string) => void;
  choose: (index: number) => void;
  jumpTo: (sceneId: string) => void;
  quitToTitle: () => void;
  save: (slot: number) => void;
  load: (slot: number) => void;
  deleteSave: (slot: number) => void;
  setMode: (mode: Mode) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Entra en una escena y registra lectura, historial, instantánea y final. */
      function goTo(id: string, vars: Vars, history: HistoryEntry[]) {
        const { scene, error } = enterScene(id, vars, (s) => scenes.get(s));
        if (!scene) {
          set({ error: error ?? 'Error desconocido', mode: 'normal' });
          return;
        }
        let nextVars = vars;
        // La música vigente viaja en las variables, así suena bien al cargar o saltar desde el mapa.
        if (scene.audio) nextVars = { ...nextVars, _musica: scene.audio };
        const patch: Partial<Store> = {};
        if (scene.ending) {
          nextVars = { ...nextVars, final_alcanzado: scene.ending };
          if (!get().endingsSeen[scene.ending]) {
            patch.endingsSeen = { ...get().endingsSeen, [scene.ending]: new Date().toISOString() };
          }
        }
        if (!get().snapshots[scene.scene_id]) {
          patch.snapshots = { ...get().snapshots, [scene.scene_id]: vars };
        }
        const nextHistory = scene.dialogue
          ? [...history, { speaker: scene.dialogue.speaker, text: scene.dialogue.text, sid: scene.scene_id }].slice(-HISTORY_LIMIT)
          : history;
        set({
          ...patch,
          error: null,
          textDone: !scene.dialogue,
          game: { sceneId: scene.scene_id, vars: nextVars, history: nextHistory, finished: null },
        });
      }

      function markRead(id: string) {
        if (!get().readScenes[id]) set({ readScenes: { ...get().readScenes, [id]: true } });
      }

      return {
        settings: DEFAULT_SETTINGS,
        game: null,
        saves: Array(SAVE_SLOTS).fill(null),
        readScenes: {},
        snapshots: {},
        endingsSeen: {},
        cgSeen: {},
        choicesTaken: {},
        mode: 'normal',
        error: null,
        textDone: false,

        newGame: (start) => goTo(start && scenes.has(start) ? start : config.inicio, { ...variables }, []),

        next: () => {
          if (get().textDone) get().advance();
          else set({ textDone: true });
        },

        setTextDone: (done) => set({ textDone: done }),

        markCg: (id) => {
          if (!get().cgSeen[id]) set({ cgSeen: { ...get().cgSeen, [id]: true } });
        },

        advance: () => {
          const { game } = get();
          if (!game) return;
          // En una pantalla de final o de fin de capítulo se sale con sus botones, no avanzando
          // (un doble clic en la última línea se saltaba la pantalla del final).
          if (game.finished) return;
          const scene = scenes.get(game.sceneId);
          if (!scene || visibleChoices(scene, game.vars).length > 0) return;
          markRead(scene.scene_id);
          if (scene.ending) {
            set({ game: { ...game, finished: scene.ending }, mode: 'normal' });
            return;
          }
          if (scene.fin_capitulo && scene.next === null) {
            set({ game: { ...game, finished: `${CHAPTER_END}${scene.fin_capitulo}` }, mode: 'normal' });
            return;
          }
          const next = resolveNext(scene.next, game.vars);
          if (!next) {
            set({ error: `La escena ${scene.scene_id} no tiene continuación`, mode: 'normal' });
            return;
          }
          goTo(next, game.vars, game.history);
        },

        choose: (index) => {
          const { game } = get();
          if (!game) return;
          const scene = scenes.get(game.sceneId);
          const choice = scene && visibleChoices(scene, game.vars)[index];
          if (!scene || !choice || choice.locked) return;
          markRead(scene.scene_id);
          const ci = scene.choices.indexOf(choice);
          const key = `${scene.scene_id}#${ci}`;
          if (!get().choicesTaken[key]) set({ choicesTaken: { ...get().choicesTaken, [key]: true } });
          goTo(choice.next, applyChoice(choice, game.vars), [
            ...game.history,
            { speaker: null, text: choice.text, choice: true, sid: scene.scene_id, ci },
          ]);
          if (get().mode === 'skip') set({ mode: 'normal' });
        },

        jumpTo: (sceneId) => {
          const vars = get().snapshots[sceneId];
          if (vars) goTo(sceneId, vars, []);
        },

        quitToTitle: () => set({ game: null, mode: 'normal', error: null }),

        save: (slot) => {
          const { game, saves } = get();
          if (!game || !canSaveGame(game)) return;
          const text = game.finished
            ? `Fin del capítulo ${game.finished.slice(CHAPTER_END.length)}`
            : scenes.get(game.sceneId)?.dialogue?.text ?? game.sceneId;
          const next = [...saves];
          next[slot] = {
            sceneId: game.sceneId,
            vars: game.vars,
            history: game.history,
            date: new Date().toISOString(),
            preview: text.slice(0, 80),
            finished: game.finished,
          };
          set({ saves: next });
        },

        load: (slot) => {
          const data = get().saves[slot];
          if (!data) return;
          if (!scenes.has(data.sceneId)) {
            set({ error: `La partida apunta a una escena que ya no existe: ${data.sceneId}` });
            return;
          }
          // Variables nuevas declaradas después de guardar toman su valor por defecto.
          set({
            error: null,
            mode: 'normal',
            textDone: false,
            game: { sceneId: data.sceneId, vars: { ...variables, ...data.vars }, history: data.history, finished: data.finished ?? null },
          });
        },

        deleteSave: (slot) => {
          const next = [...get().saves];
          next[slot] = null;
          set({ saves: next });
        },

        setMode: (mode) => set({ mode }),
        setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      };
    },
    {
      name: 'genesis-vn',
      version: 1,
      // Las opciones guardadas antes de agregar una opción nueva toman su valor por defecto.
      merge: (persisted, current) => {
        const p = persisted as Partial<Store>;
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
      partialize: (s) => ({
        settings: s.settings,
        game: s.game,
        saves: s.saves,
        readScenes: s.readScenes,
        snapshots: s.snapshots,
        endingsSeen: s.endingsSeen,
        cgSeen: s.cgSeen,
        choicesTaken: s.choicesTaken,
      }),
    },
  ),
);
