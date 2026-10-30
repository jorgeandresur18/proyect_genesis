/**
 * Avatar de perfil inventado, al estilo de los de Reddit: un muñequito con colores, ojos, boca y accesorio que
 * salen del nombre (el mismo nombre siempre da el mismo avatar). Sin fotos de nadie.
 */
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function AvatarGenerado({ nombre, className = '' }: { nombre: string; className?: string }) {
  const h = hash(nombre);
  const pick = (n: number, shift: number) => (h >>> shift) % n;
  const hue = h % 360;
  const fondo = `hsl(${hue} 62% 52%)`;
  const cara = ['#f5f5f7', '#ffe3c2', '#d8f3ff', '#e9ffd8', '#ffd9ec'][pick(5, 8)];
  const tinta = '#1c1d24';
  const ojos = pick(4, 11);
  const boca = pick(3, 14);
  const extra = pick(5, 17);
  const antena = pick(2, 20) === 1;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="32" fill={fondo} />
      {antena && (
        <>
          <path d="M32 21 36 9" stroke={cara} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="37" cy="8" r="3.5" fill={cara} />
        </>
      )}
      <ellipse cx="32" cy="37" rx="19" ry="15.5" fill={cara} />
      {ojos === 0 && (
        <>
          <circle cx="25" cy="35" r="3.2" fill={tinta} />
          <circle cx="39" cy="35" r="3.2" fill={tinta} />
        </>
      )}
      {ojos === 1 && <rect x="20" y="31" width="24" height="7" rx="3.5" fill={tinta} />}
      {ojos === 2 && <path d="M21 35h7M36 35h7" stroke={tinta} strokeWidth="2.6" strokeLinecap="round" />}
      {ojos === 3 && (
        <>
          <circle cx="25" cy="35" r="4.5" fill="none" stroke={tinta} strokeWidth="2" />
          <circle cx="39" cy="35" r="4.5" fill="none" stroke={tinta} strokeWidth="2" />
          <path d="M29.5 35h5" stroke={tinta} strokeWidth="2" />
          <circle cx="25" cy="35" r="1.6" fill={tinta} />
          <circle cx="39" cy="35" r="1.6" fill={tinta} />
        </>
      )}
      {boca === 0 && <path d="M26 43q6 5 12 0" fill="none" stroke={tinta} strokeWidth="2.4" strokeLinecap="round" />}
      {boca === 1 && <path d="M27 44h10" stroke={tinta} strokeWidth="2.4" strokeLinecap="round" />}
      {boca === 2 && <ellipse cx="32" cy="44.5" rx="3" ry="2.4" fill={tinta} />}
      {extra === 1 && <path d="M14 30q18-22 36 0Z" fill={tinta} />}
      {extra === 2 && (
        <>
          <path d="M14 33q18-26 36 0" fill="none" stroke={tinta} strokeWidth="3" />
          <rect x="10" y="31" width="6" height="10" rx="2.5" fill={tinta} />
          <rect x="48" y="31" width="6" height="10" rx="2.5" fill={tinta} />
        </>
      )}
      {extra === 3 && <path d="M15 28q17-16 34 0l6 1-6 2Z" fill={`hsl(${(hue + 180) % 360} 70% 45%)`} />}
      {extra === 4 && <path d="M18 27q14-14 28 0" fill="none" stroke={`hsl(${(hue + 120) % 360} 70% 50%)`} strokeWidth="5" strokeLinecap="round" />}
    </svg>
  );
}
