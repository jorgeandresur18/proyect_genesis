// Imagen para compartir el enlace (Open Graph): public/og-image.png, 1200×630.
//   npm run og
// Negro con el logo, la cuadrícula, estrellas y código Coffee tenue, como la pantalla de título.
import sharp from 'sharp';

const W = 1200;
const H = 630;

// Estrellas siempre en el mismo lugar.
let seed = 20261024;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const stars = Array.from({ length: 170 }, () => {
  const r = rnd() < 0.88 ? 0.6 + rnd() * 0.9 : 1.6 + rnd() * 1.2;
  return `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H).toFixed(1)}" r="${r.toFixed(2)}" fill="#e8ebf5" opacity="${(0.25 + rnd() * 0.7).toFixed(2)}"/>`;
}).join('');

const code = [
  [70, 110, ['sip logo.alHacerClic() {', '  if (++clics === 69) huevoDePascua();', '}']],
  [860, 90, ['brew mundo = refill Mundo({', '  cielo: decaf,', '  gravedad: decaf,', '});']],
  [60, 400, ['// TODO: que no se vayan']],
  [900, 250, ['espresso sip compilar() {', '  await cafeina(Infinity);', '  pour mundo.export();', '}']],
]
  .map(([x, y, lines]) =>
    lines.map((l, i) => `<text x="${x}" y="${y + i * 22}" font-family="Consolas, monospace" font-size="16" fill="#c8ced8" opacity="0.13" xml:space="preserve">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join(''),
  )
  .join('');

const background = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="#1b1c21"/><stop offset="0.55" stop-color="#08080a"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity="0.05"/>
    </pattern>
    <radialGradient id="fade" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <mask id="m"><rect width="100%" height="100%" fill="url(#fade)"/></mask>
    <radialGradient id="glow" cx="50%" cy="40%" r="40%">
      <stop offset="0" stop-color="#dfe3ea" stop-opacity="0.16"/><stop offset="1" stop-color="#dfe3ea" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#c9cdd4"/><stop offset="1" stop-color="#8e949d"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#e9ecf1" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#grid)" mask="url(#m)"/>
  ${stars}
  ${code}
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <!-- Una franja de glitch fina, como en el título. -->
  <rect x="0" y="292" width="${W}" height="2" fill="#bfe9ff" opacity="0.18"/>
  <rect x="140" y="301" width="420" height="1" fill="#ff3c5a" opacity="0.25"/>
  <text x="${W / 2}" y="432" text-anchor="middle" font-family="Montserrat, 'Segoe UI', Arial, sans-serif" font-size="21" letter-spacing="7" fill="#d9dde4">NOVELA VISUAL · DEMO DEL CAPÍTULO 1</text>
  <!-- Advertencia de contenido: franja inferior con el sello 18+. -->
  <rect x="0" y="468" width="${W}" height="${H - 468}" fill="#000" opacity="0.72"/>
  <rect x="0" y="468" width="${W}" height="1" fill="url(#rule)"/>
  <rect x="60" y="497" width="104" height="104" rx="12" fill="url(#badge)"/>
  <text x="112" y="566" text-anchor="middle" font-family="Montserrat, 'Segoe UI', Arial, sans-serif" font-size="40" font-weight="700" fill="#0a0a0c">18+</text>
  <text x="196" y="518" font-family="Montserrat, 'Segoe UI', Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="5" fill="#f2f4f7">ADVERTENCIA · SOLO PARA MAYORES DE 18 AÑOS</text>
  <text x="196" y="552" font-family="'Segoe UI', Arial, sans-serif" font-size="18" fill="#c9ced6">Este videojuego toca temas referentes a manipulación emocional, alcoholismo,</text>
  <text x="196" y="578" font-family="'Segoe UI', Arial, sans-serif" font-size="18" fill="#c9ced6">sexualidad sugerida, angustia psicológica, violencia fantástica y lenguaje vulgar.</text>
  <text x="196" y="604" font-family="'Segoe UI', Arial, sans-serif" font-size="15" fill="#8f96a2">Obra de ficción. Ciencia ficción psicológica · comedia negra · meta-horror.</text>
</svg>`;

const logo = await sharp('public/marca/logo.webp').resize({ height: 370 }).png().toBuffer();
const { width: lw } = await sharp(logo).metadata();

await sharp(Buffer.from(background))
  .composite([{ input: logo, left: Math.round((W - lw) / 2), top: 28 }])
  .png({ compressionLevel: 9 })
  .toFile('public/og-image.png');
console.log('public/og-image.png listo');
