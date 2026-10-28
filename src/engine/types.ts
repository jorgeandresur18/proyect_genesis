// Modelo de datos de la historia. Ver docs/SPEC.md, sección 3.

export type VarValue = number | boolean | string | null;
export type Vars = Record<string, VarValue>;

export type ConditionOp = '==' | '!=' | '>' | '>=' | '<' | '<=';

export interface Condition {
  var: string;
  op: ConditionOp;
  value: VarValue;
}

/** Rama condicional de `next`: la primera cuyas condiciones se cumplen gana. */
export interface Branch {
  conditions?: Condition[];
  to: string;
}

export type Next = string | Branch[] | null;

export interface Character {
  id: string;
  sprite: string;
  pos: 'izquierda' | 'centro' | 'derecha';
  /** Fuerza hacia dónde mira; si no está, el motor lo decide (ver engine/facing.ts). */
  mira?: 'izquierda' | 'derecha';
}

export interface Dialogue {
  speaker: string | null;
  text: string;
}

export interface Choice {
  text: string;
  next: string;
  /** Asigna valores absolutos. */
  set?: Vars;
  /** Suma a variables numéricas (p. ej. confianza). */
  add?: Record<string, number>;
  /** Opción tachada: se ve, pero no se puede elegir (efecto locked_choice). */
  locked?: boolean;
  /** Si no se cumplen, la opción no se muestra. */
  conditions?: Condition[];
}

export const UI_EFFECTS = ['os_menu', 'glitch', 'boringram_flash', 'ai_vowels', 'locked_choice'] as const;
export type UiEffect = (typeof UI_EFFECTS)[number];

export interface Scene {
  scene_id: string;
  chapter: number;
  background: string | null;
  video_fondo: string | null;
  loop_video: boolean;
  characters: Character[];
  dialogue: Dialogue | null;
  choices: Choice[];
  /** Si no se cumplen al entrar, la escena se salta y se sigue su `next`. */
  conditions: Condition[];
  audio: string | null;
  ui_effect: UiEffect | UiEffect[] | null;
  next: Next;
  /** ID de final (docs/FINALES.md). La escena cierra la partida y se registra en la galería. */
  ending?: string;
  /**
   * Fin de capítulo: no es un final ni va a la galería. Muestra «Fin del capítulo N» y, mientras no exista
   * el capítulo siguiente, vuelve al título. Cuando exista, esta escena pasa a tener `next` hacia él.
   */
  fin_capitulo?: number;
  /**
   * Transición al entrar a esta escena. Por defecto, fundido a negro solo si cambia el fondo.
   * «blanco»: fundido largo a blanco (cruce del mundo real al de la IA); se hace aunque no cambie el fondo.
   */
  transicion?: 'negro' | 'blanco';
}

export interface StoryFile {
  ruta: string;
  chapter: number;
  title: string;
  /** Título en inglés (pantalla de fin de capítulo). */
  title_en?: string;
  /** `borrador` mientras el autor no apruebe los diálogos. */
  estado?: 'borrador' | 'aprobado';
  nota?: string;
  scenes: Scene[];
}

export type VarDecl = Record<string, VarValue>;

export interface EndingInfo {
  id: string;
  nombre: string;
  /** Nombre en inglés. */
  nombre_en?: string;
  pieza: string;
  tipo: string;
  /** Solo los finales `jugable` deben ser alcanzables en la prueba de rutas. */
  estado: 'jugable' | 'por_escribir';
  /** Los finales de prueba no se muestran en la galería ni van en FINALES.md. */
  oculto?: boolean;
}

export interface GameConfig {
  inicio: string;
  /** Tema de la pantalla de título. */
  musica_titulo?: string;
  /** Versión que se ve en una esquina del título. */
  version?: string;
}
