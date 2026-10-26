// Lógica pura del motor, compartida por la interfaz y por la prueba de rutas.
import type { Choice, Condition, Next, Scene, Vars } from './types';

export function checkCondition(c: Condition, vars: Vars): boolean {
  const v = vars[c.var];
  switch (c.op) {
    case '==':
      return v === c.value;
    case '!=':
      return v !== c.value;
    case '>':
      return (v as number) > (c.value as number);
    case '>=':
      return (v as number) >= (c.value as number);
    case '<':
      return (v as number) < (c.value as number);
    case '<=':
      return (v as number) <= (c.value as number);
  }
}

export function checkAll(conditions: Condition[] | undefined, vars: Vars): boolean {
  return (conditions ?? []).every((c) => checkCondition(c, vars));
}

export function resolveNext(next: Next, vars: Vars): string | null {
  if (next === null || typeof next === 'string') return next;
  return next.find((b) => checkAll(b.conditions, vars))?.to ?? null;
}

export function applyChoice(choice: Choice, vars: Vars): Vars {
  const out = { ...vars, ...choice.set };
  for (const [k, n] of Object.entries(choice.add ?? {})) {
    out[k] = ((out[k] as number) ?? 0) + n;
  }
  return out;
}

export function visibleChoices(scene: Scene, vars: Vars): Choice[] {
  return scene.choices.filter((c) => checkAll(c.conditions, vars));
}

/**
 * Entra en una escena: salta las escenas cuyas condiciones no se cumplen.
 * Devuelve la escena donde realmente se detiene, o null si una cadena de saltos termina sin destino.
 */
export function enterScene(
  id: string,
  vars: Vars,
  lookup: (id: string) => Scene | undefined,
): { scene: Scene | null; error?: string } {
  let current: string | null = id;
  for (let guard = 0; guard < 1000 && current; guard++) {
    const scene = lookup(current);
    if (!scene) return { scene: null, error: `Escena inexistente: ${current}` };
    if (checkAll(scene.conditions, vars)) return { scene };
    current = resolveNext(scene.next, vars);
  }
  return { scene: null, error: `Salto sin destino desde ${id}` };
}

export function effectsOf(scene: Scene): string[] {
  if (!scene.ui_effect) return [];
  return Array.isArray(scene.ui_effect) ? scene.ui_effect : [scene.ui_effect];
}
