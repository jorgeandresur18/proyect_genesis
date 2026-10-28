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
  [60, 470, ['// TODO: que no se vayan']],
  [900, 300, ['espresso sip compilar() {', '  await cafeina(Infinity);', '  pour mundo.export();', '}']],
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
  <rect x="0" y="352" width="${W}" height="2" fill="#bfe9ff" opacity="0.18"/>
  <rect x="140" y="361" width="420" height="1" fill="#ff3c5a" opacity="0.25"/>
  <rect x="${W / 2 - 230}" y="508" width="460" height="1" fill="url(#rule)"/>
  <text x="${W / 2}" y="548" text-anchor="middle" font-family="Montserrat, 'Segoe UI', Arial, sans-serif" font-size="22" letter-spacing="7" fill="#d9dde4">NOVELA VISUAL · DEMO DEL CAPÍTULO 1</text>
  <text x="${W / 2}" y="582" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="17" letter-spacing="2" fill="#8f96a2">Ciencia ficción psicológica · comedia negra · meta-horror · 18+</text>
</svg>`;

const logo = await sharp('public/marca/logo.webp').resize({ height: 440 }).png().toBuffer();
const { width: lw } = await sharp(logo).metadata();

await sharp(Buffer.from(background))
  .composite([{ input: logo, left: Math.round((W - lw) / 2), top: 50 }])
  .png({ compressionLevel: 9 })
  .toFile('public/og-image.png');
console.log('public/og-image.png listo');
