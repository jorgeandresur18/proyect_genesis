// Páginas para compartir las fotos de Boringram: public/compartir/<id>.html y <id>.jpg (1200×630).
//   npm run compartir
// Cada página tiene la miniatura de esa foto (Open Graph / Twitter) y lleva al juego. Así, al compartir
// una foto en Facebook, WhatsApp o X se ve la foto con el enlace del juego. Se vuelve a correr cuando se
// agregan fotos a src/data/boringram.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const W = 1200;
const H = 630;
const OUT = 'public/compartir';
const data = JSON.parse(readFileSync('src/data/boringram.json', 'utf8'));
const en = JSON.parse(readFileSync('src/data/en/boringram.json', 'utf8'));
const SITIO = data.sitio;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parte el texto en líneas de unos `max` caracteres. */
function wrap(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

mkdirSync(OUT, { recursive: true });
const fotos = data.publicaciones.map((p, i) => ({ ...p, en: en.publicaciones[i] })).filter((p) => p.tipo === 'foto');
for (const p of fotos) {
  const user = data.perfiles[p.autor]?.usuario ?? p.autor;
  const src = `public/${p.imagen}`;
  // Fondo: la misma foto, desenfocada y oscura. Encima, la foto entera a la izquierda.
  const bg = await sharp(src).resize(W, H, { fit: 'cover' }).blur(28).modulate({ brightness: 0.45 }).toBuffer();
  const photoH = 560;
  const photo = await sharp(src).resize({ height: photoH, width: 520, fit: 'inside' }).toBuffer();
  const { width: pw } = await sharp(photo).metadata();
  const logo = await sharp('public/marca/boringram.webp').resize({ width: 330 }).toBuffer();
  // Foto de perfil de quien publica, en círculo.
  const circle = Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32"/></svg>');
  const icon = await sharp(`public/${data.perfiles[p.autor].foto}`)
    .resize(64, 64, { fit: 'cover', position: 'top' })
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const textX = 35 + pw + 55;
  const caption = wrap(p.texto, 30)
    .map((l, i) => `<text x="${textX}" y="${290 + i * 40}" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#f1f1f4">${esc(l)}</text>`)
    .join('');
  const overlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="0.55" stop-color="#ff3d7f"/><stop offset="1" stop-color="#a64dff"/></linearGradient></defs>
  <rect x="31" y="31" width="${pw + 8}" height="${photoH + 8}" rx="18" fill="none" stroke="url(#g)" stroke-width="4"/>
  <text x="${textX + 80}" y="222" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">${esc(user)}</text>
  ${caption}
  <text x="${textX}" y="560" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#c9c9d2">PROYECT GENESIS · Juega gratis en el navegador</text>
  <text x="${textX}" y="596" font-family="Consolas, monospace" font-size="22" fill="#ff8ab5">proyect-genesis.vercel.app</text>
  <rect x="${W - 92}" y="28" width="64" height="34" rx="8" fill="#000" fill-opacity="0.6" stroke="#ff4f8b"/>
  <text x="${W - 60}" y="52" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="#ff4f8b">+18</text>
</svg>`;
  await sharp(bg)
    .composite([
      { input: photo, left: 35, top: 35 },
      { input: logo, left: textX, top: 70 },
      { input: icon, left: textX, top: 178 },
      { input: Buffer.from(overlay), left: 0, top: 0 },
    ])
    .jpeg({ quality: 86 })
    .toFile(`${OUT}/${p.id}.jpg`);

  const title = `${user} en Boringram · PROYECT GENESIS`;
  const desc = `«${p.texto}» Novela visual para adultos (18+). Juega gratis en el navegador.`;
  const url = `${SITIO}compartir/${p.id}.html`;
  const img = `${SITIO}compartir/${p.id}.jpg`;
  writeFileSync(
    `${OUT}/${p.id}.html`,
    `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="PROYECT GENESIS" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:width" content="${W}" />
<meta property="og:image:height" content="${H}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${img}" />
<meta http-equiv="refresh" content="0; url=../" />
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#ccc;font-family:system-ui,sans-serif}</style>
</head>
<body><a href="../" style="color:#ff8ab5">PROYECT GENESIS</a><script>location.replace('../');</script></body>
</html>
`,
  );
  console.log(`✓ ${p.id}`);
}
console.log(`${fotos.length} páginas para compartir en ${OUT}/`);
