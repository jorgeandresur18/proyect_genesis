// Ayudas para jugar en celular.
// En Android (Chrome) se puede pedir pantalla completa y fijar la orientación horizontal; en iPhone no
// existe esa opción, y el aviso «Gira tu celular» (CSS) hace el resto.

/** Pantalla táctil (celular o tableta). */
export function isTouch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

export function canFullscreen(): boolean {
  return typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function';
}

type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape' | 'portrait') => Promise<void> };

/** Al empezar a jugar en celular: pantalla completa y horizontal. Debe llamarse desde un toque del jugador. */
export async function enterPlayMode(): Promise<void> {
  if (!isTouch()) return;
  try {
    if (canFullscreen() && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    // El navegador no lo permite: no pasa nada, se juega igual.
  }
  try {
    await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape');
  } catch {
    // Sin bloqueo de orientación (iPhone o navegador de escritorio).
  }
}

/**
 * Boringram es una app vertical: en celular pide pantalla completa y orientación vertical (Android). Donde no
 * se puede fijar (iPhone), Boringram muestra «Gira tu celular». Debe llamarse desde un toque del jugador.
 */
export async function enterPortraitMode(): Promise<void> {
  if (!isTouch()) return;
  try {
    if (canFullscreen() && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    await (screen.orientation as LockableOrientation | undefined)?.lock?.('portrait');
  } catch {
    // Sin bloqueo de orientación: queda el aviso para girar el celular.
  }
}

/** Suelta la orientación fijada (al cerrar Boringram; al volver a jugar se fija otra vez en horizontal). */
export function releaseOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // Nada que soltar.
  }
}

/** Entra o sale de pantalla completa (botón del menú del juego). */
export async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  else await enterPlayMode();
}
