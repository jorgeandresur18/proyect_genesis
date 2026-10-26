// Prepara los sprites del juego: public/sprites/<personaje>/<expresion>.webp en un lienzo de 1200x1600.
//   npm run sprites
//
// Dos fuentes, en este orden:
// 1) PSD (docs/sprites/*.psd): un grupo por personaje con una capa por expresión, acomodadas a mano
//    sobre la plantilla. Cada capa se exporta tal cual está en el lienzo, solo reducida a 1200x1600.
// 2) PNG sueltos (docs/sprites/<PERSONAJE>/*.png) de personajes que no estén en un PSD: se recortan y se
//    escalan automáticamente para que la cabeza quede en su línea de estatura y el cuerpo toque abajo.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import agPsd from 'ag-psd';

const SOURCE = 'docs/sprites';
const TARGET = 'public/sprites';
const config = JSON.parse(readFileSync('tools/sprites.config.json', 'utf8'));
const { ancho: W, alto: H } = config.lienzo;
const ALPHA = 24; // Píxeles con menos opacidad que esto cuentan como fondo.
const TOLERANCE = 15; // 1 cm: más que esto respecto a la línea de estatura se avisa.

// ag-psd necesita crear imágenes; en Node basta con un búfer RGBA.
agPsd.initializeCanvas(
  () => { throw new Error('canvas no disponible'); },
  () => { throw new Error('canvas no disponible'); },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
);

/** "nikki_ebria1", "niki_celosa1", "nicole_x", "nikki-base" -> "ebria1", "celosa1", "x", "base". */
function expressionName(name, character) {
  const clean = name.replace(/\.png$/i, '').trim().toLowerCase();
  const m = clean.match(/^([a-z]+)[_-](.+)$/);
  const prefixes = config.personajes[character]?.prefijos ?? [];
  return m && (m[1].slice(0, 3) === character.slice(0, 3) || prefixes.includes(m[1])) ? m[2] : clean;
}

/** Caja de lo visible en un búfer RGBA. */
function visibleBox(data, width, height) {
  let top = height, bottom = -1, left = width, right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return bottom < 0 ? null : { top, bottom, left, right };
}

function headWarning(headY, character) {
  const want = config.personajes[character]?.cabeza;
  if (want === undefined || Math.abs(headY - want) <= TOLERANCE) return null;
  const cm = ((want - headY) / 15).toFixed(1);
  return `la cabeza quedó en y=${headY} y su línea es y=${want} (se ve ${cm > 0 ? `${cm} cm más alto` : `${-cm} cm más bajo`}); si es pelo o un adorno que sobresale, ignóralo`;
}

const results = { ok: 0, failed: 0, aliases: [] };
const fromPsd = new Set();
const generated = new Set(); // Rutas escritas desde una imagen real en esta corrida.

// ---------- 1) PSD ----------
for (const file of readdirSync(SOURCE).filter((f) => /\.psd$/i.test(f))) {
  console.log(`Leyendo ${file}...`);
  const psd = agPsd.readPsd(readFileSync(join(SOURCE, file)), { useImageData: true, skipCompositeImageData: true, skipThumbnail: true });
  const scale = H / psd.height;
  if (Math.abs(psd.width * scale - W) > 2) console.log(`  ! el lienzo del PSD (${psd.width}x${psd.height}) no es 3:4; se ajusta a ${W}x${H}`);
  for (const group of (psd.children ?? []).filter((g) => g.children)) {
    const character = group.name.trim().toLowerCase();
    mkdirSync(join(TARGET, character), { recursive: true });
    fromPsd.add(character);
    for (const layer of group.children) {
      const img = layer.imageData;
      if (!img || layer.children) continue;
      // Copia la capa a un lienzo del tamaño del PSD, recortando lo que se sale.
      const canvas = new Uint8ClampedArray(psd.width * psd.height * 4);
      for (let y = 0; y < img.height; y++) {
        const cy = layer.top + y;
        if (cy < 0 || cy >= psd.height) continue;
        const x0 = Math.max(0, -layer.left);
        const x1 = Math.min(img.width, psd.width - layer.left);
        if (x1 <= x0) continue;
        canvas.set(img.data.subarray((y * img.width + x0) * 4, (y * img.width + x1) * 4), (cy * psd.width + layer.left + x0) * 4);
      }
      layer.imageData = null;
      const box = visibleBox(canvas, psd.width, psd.height);
      const expr = expressionName(layer.name, character);
      if (!box) {
        console.log(`✗ ${group.name}/${layer.name}: la capa está vacía`);
        results.failed++;
        continue;
      }
      const dest = join(TARGET, character, `${expr}.webp`);
      const info = await sharp(Buffer.from(canvas.buffer), { raw: { width: psd.width, height: psd.height, channels: 4 } })
        .resize(W, H)
        .webp({ quality: 90, alphaQuality: 100 })
        .toFile(dest);
      generated.add(dest);
      console.log(`✓ ${group.name}/${layer.name} → ${dest} (${Math.round(info.size / 1024)} KB)`);
      const warn = headWarning(Math.round(box.top * scale), character);
      if (warn) console.log(`    ! ${warn}`);
      if (box.bottom < psd.height - 3) console.log('    ! el cuerpo no llega al borde de abajo');
      results.ok++;
    }
  }
}

// ---------- 2) PNG sueltos ----------
async function normalizePng(input, headY) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const a = (x, y) => data[(y * width + x) * 4 + 3];
  if ([a(0, 0), a(width - 1, 0), a(0, height - 1), a(width - 1, height - 1)].some((v) => v > ALPHA)) {
    return { error: 'no tiene fondo transparente' };
  }
  const box = visibleBox(data, width, height);
  if (!box) return { error: 'la imagen está vacía' };
  const warnings = [];
  if (box.bottom < height - 3) warnings.push('el cuerpo no llega al borde de abajo: revisa que el encuadre sea el mismo (cabeza a medio muslo)');
  const boxW = box.right - box.left + 1;
  const boxH = box.bottom - box.top + 1;
  const scale = (H - headY) / boxH;
  let w = Math.round(boxW * scale);
  let crop = { left: box.left, top: box.top, width: boxW, height: boxH };
  if (w > W) {
    warnings.push('es más ancho que el lienzo; se recortaron los costados');
    const keep = Math.floor(W / scale);
    crop = { left: box.left + Math.floor((boxW - keep) / 2), top: box.top, width: keep, height: boxH };
    w = W;
  }
  const body = await sharp(input).extract(crop).resize(w, H - headY, { fit: 'fill' }).toBuffer();
  const out = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: body, left: Math.round((W - w) / 2), top: headY }])
    .webp({ quality: 90, alphaQuality: 100 });
  return { out, warnings };
}

for (const folder of readdirSync(SOURCE)) {
  const dir = join(SOURCE, folder);
  if (!statSync(dir).isDirectory()) continue;
  const character = folder.toLowerCase();
  if (fromPsd.has(character)) continue; // El PSD manda.
  const settings = config.personajes[character];
  if (!settings) {
    console.log(`! ${folder}: personaje sin estatura en tools/sprites.config.json; se omite`);
    continue;
  }
  mkdirSync(join(TARGET, character), { recursive: true });
  for (const file of readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort()) {
    const dest = join(TARGET, character, `${expressionName(file, character)}.webp`);
    const r = await normalizePng(join(dir, file), settings.cabeza);
    if (r.error) {
      console.log(`✗ ${folder}/${file}: ${r.error}`);
      results.failed++;
      continue;
    }
    const info = await r.out.toFile(dest);
    generated.add(dest);
    console.log(`✓ ${folder}/${file} → ${dest} (${Math.round(info.size / 1024)} KB)`);
    for (const w of r.warnings) console.log(`    ! ${w}`);
    results.ok++;
  }
}

// ---------- 3) Sustitutos temporales ----------
// Si el juego pide una expresión que todavía no existe, se copia la más parecida (ver "alias" en la config).
for (const [character, settings] of Object.entries(config.personajes)) {
  for (const [expr, stand] of Object.entries(settings.alias ?? {})) {
    const dest = join(TARGET, character, `${expr}.webp`);
    if (generated.has(dest)) continue; // Ya existe de verdad: el alias deja de usarse.
    const source = join(TARGET, character, `${stand}.webp`);
    if (!generated.has(source)) {
      console.log(`✗ alias ${character}/${expr} → ${stand}: no existe ${stand}`);
      results.failed++;
      continue;
    }
    copyFileSync(source, dest);
    results.aliases.push(`${character}/${expr}→${stand}`);
  }
}
if (results.aliases.length) console.log(`Sustitutos temporales (${results.aliases.length}): ${results.aliases.join(', ')}`);

console.log(`${results.ok} sprites listos${results.failed ? `, ${results.failed} con problemas` : ''}.`);
if (results.failed) process.exitCode = 1;
