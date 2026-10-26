// Validación de la historia: la usa `npm run test:routes`. Ver docs/SPEC.md, sección 7.
import type { Condition, EndingInfo, GameConfig, Scene, StoryFile, VarDecl, Vars } from './types';
import { UI_EFFECTS } from './types';
import { applyChoice, checkAll, effectsOf, enterScene, resolveNext } from './logic';
import { isPlaceholder } from './assets';

const MAX_STATES = 200_000;

export interface Report {
  errors: string[];
  warnings: string[];
  reachedEndings: Set<string>;
  /** Capítulos cuyo fin (sin continuación todavía) se alcanza. */
  reachedChapterEnds: Set<number>;
  visitedScenes: Set<string>;
  states: number;
}

export function validateStory(
  files: StoryFile[],
  variables: VarDecl,
  endings: EndingInfo[],
  config: GameConfig,
  /** Comprueba que un recurso que no es PLACEHOLDER exista (en la prueba, dentro de public/). */
  assetExists: (ref: string) => boolean = () => true,
): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const scenes = new Map<string, Scene>();

  for (const file of files) {
    for (const scene of file.scenes) {
      if (scenes.has(scene.scene_id)) errors.push(`scene_id duplicado: ${scene.scene_id}`);
      scenes.set(scene.scene_id, scene);
    }
  }

  const endingIds = new Set<string>();
  for (const e of endings) {
    if (endingIds.has(e.id)) errors.push(`Final duplicado en el registro: ${e.id}`);
    endingIds.add(e.id);
  }

  if (!scenes.has(config.inicio)) errors.push(`La escena de inicio no existe: ${config.inicio}`);

  // Revisión estática de cada escena.
  const checkVars = (where: string, conds: Condition[] | undefined) => {
    for (const c of conds ?? []) {
      if (!(c.var in variables)) errors.push(`${where}: variable sin declarar "${c.var}"`);
    }
  };
  const checkTarget = (where: string, to: string) => {
    if (!scenes.has(to)) errors.push(`${where}: apunta a una escena inexistente "${to}"`);
  };

  for (const scene of scenes.values()) {
    const id = scene.scene_id;
    checkVars(id, scene.conditions);
    if (typeof scene.next === 'string') checkTarget(id, scene.next);
    if (Array.isArray(scene.next)) {
      for (const b of scene.next) {
        checkTarget(id, b.to);
        checkVars(id, b.conditions);
      }
    }
    scene.choices.forEach((c, i) => {
      const where = `${id} opción ${i + 1}`;
      checkTarget(where, c.next);
      checkVars(where, c.conditions);
      for (const k of Object.keys(c.set ?? {})) {
        if (!(k in variables)) errors.push(`${where}: variable sin declarar "${k}"`);
      }
      for (const k of Object.keys(c.add ?? {})) {
        if (!(k in variables)) errors.push(`${where}: variable sin declarar "${k}"`);
        else if (typeof variables[k] !== 'number') errors.push(`${where}: "add" sobre variable no numérica "${k}"`);
      }
    });
    for (const ref of [scene.background, scene.video_fondo, scene.audio, ...scene.characters.map((c) => c.sprite)]) {
      if (ref && ref !== 'silencio' && !isPlaceholder(ref) && !assetExists(ref)) errors.push(`${id}: recurso inexistente "${ref}"`);
    }
    for (const fx of effectsOf(scene)) {
      if (!(UI_EFFECTS as readonly string[]).includes(fx)) errors.push(`${id}: ui_effect desconocido "${fx}"`);
    }
    if (scene.transicion && !['negro', 'blanco'].includes(scene.transicion)) {
      errors.push(`${id}: transición desconocida "${scene.transicion}"`);
    }
    if (scene.choices.length > 0 && scene.next !== null) {
      errors.push(`${id}: tiene decisiones y "next" a la vez; usa solo uno`);
    }
    if (scene.ending) {
      if (!endingIds.has(scene.ending)) errors.push(`${id}: final no registrado "${scene.ending}"`);
      if (scene.next !== null || scene.choices.length > 0) errors.push(`${id}: una escena de final no puede continuar`);
      if (scene.fin_capitulo) errors.push(`${id}: una escena no puede ser final y fin de capítulo a la vez`);
    } else if (scene.fin_capitulo && scene.next === null && scene.choices.length > 0) {
      errors.push(`${id}: un fin de capítulo sin continuación no puede tener decisiones`);
    } else if (!scene.fin_capitulo && scene.choices.length === 0 && scene.next === null) {
      errors.push(`${id}: callejón sin salida (sin "next", decisiones ni final)`);
    }
  }

  // Recorrido de todas las rutas: cada estado es (escena, variables).
  const reachedEndings = new Set<string>();
  const reachedChapterEnds = new Set<number>();
  const visitedScenes = new Set<string>();
  const seen = new Set<string>();
  const queue: { scene: Scene; vars: Vars }[] = [];
  const lookup = (s: string) => scenes.get(s);

  const push = (from: string, to: string, vars: Vars) => {
    const { scene, error } = enterScene(to, vars, lookup);
    if (!scene) {
      errors.push(`${from} → ${to}: ${error}`);
      return;
    }
    const key = `${scene.scene_id}|${JSON.stringify(vars)}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ scene, vars });
  };

  if (scenes.has(config.inicio)) push('inicio', config.inicio, { ...variables });

  while (queue.length > 0) {
    if (seen.size > MAX_STATES) {
      errors.push(`Más de ${MAX_STATES} estados: revisa contadores que crecen sin límite`);
      break;
    }
    const { scene, vars } = queue.shift()!;
    visitedScenes.add(scene.scene_id);
    if (scene.ending) {
      reachedEndings.add(scene.ending);
      continue;
    }
    if (scene.fin_capitulo && scene.next === null) {
      reachedChapterEnds.add(scene.fin_capitulo);
      continue;
    }
    const visible = scene.choices.filter((c) => checkAll(c.conditions, vars));
    if (visible.length > 0) {
      const open = visible.filter((c) => !c.locked);
      if (open.length === 0) errors.push(`${scene.scene_id}: todas las opciones visibles están tachadas (bloqueo)`);
      for (const c of open) push(scene.scene_id, c.next, applyChoice(c, vars));
      continue;
    }
    const next = resolveNext(scene.next, vars);
    if (!next) {
      errors.push(`${scene.scene_id}: sin continuación con variables ${JSON.stringify(vars)}`);
      continue;
    }
    push(scene.scene_id, next, vars);
  }

  for (const e of endings) {
    if (e.estado === 'jugable' && !reachedEndings.has(e.id)) errors.push(`Final inalcanzable: ${e.id}`);
  }
  for (const id of scenes.keys()) {
    if (!visitedScenes.has(id)) warnings.push(`Escena inalcanzable: ${id}`);
  }

  return { errors: [...new Set(errors)], warnings, reachedEndings, reachedChapterEnds, visitedScenes, states: seen.size };
}
