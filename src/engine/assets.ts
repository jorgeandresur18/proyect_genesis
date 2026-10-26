// Recursos de la historia: `PLACEHOLDER:nombre` se dibuja como caja gris;
// cualquier otro valor es una ruta dentro de public/ (p. ej. `sprites/nikki/ebria1.png`).

export function isPlaceholder(ref: string): boolean {
  return ref.startsWith('PLACEHOLDER:');
}

export function assetUrl(ref: string): string {
  return `${import.meta.env.BASE_URL}${ref}`;
}
