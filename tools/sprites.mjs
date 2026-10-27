// Prepara los sprites del juego: public/sprites/<personaje>/<expresion>.webp.
//   npm run sprites
//
// Escala común: 15 px por cm y el mismo corte inferior para todos. Cada personaje sale en su propio lienzo
// según su estatura (src/data/estaturas.json): 1200x1600 hasta 1,65 m; los más altos (enemigos), más alto.
//
// Dos fuentes, en este orden:
// 1) PSD (docs/sprites/*.psd): un grupo por personaje con una capa por expresión, acomodadas a mano sobre
//    la plantilla. Un PSD con «enemigo» en el nombre usa la plantilla alta de los enemigos. Cada capa se
//    exporta tal cual está, recortando el lienzo de su estatura desde el borde de abajo.
// 2) PNG sueltos (docs/sprites/<PERSONAJE>/*.png) de personajes que no estén en un PSD: se recortan y se
//    escalan automáticamente para que la cabeza quede en su línea de estatura y el cuerpo toque abajo.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import agPsd from 'ag-psd';

const SOURCE = 'docs/sprites';
const TARGET = 'public/sprites';
const config = JSON.parse(readFileSync('tools/sprites.config.json', 'utf8'));
const estaturas = JSON.parse(readFileSync('src/data/estaturas.json', 'utf8'));
const BASE_CM = 165;
const PX_PER_CM = 15;
const HEAD_MARGIN = 64;
const canvasH = (cm) => 1600 + Math.max(0, cm - BASE_CM) * PX_PER_CM;
const canvasW = (cm) => Math.round(canvasH(cm) * 0.75);
const headLine = (cm) => HEAD_MARGIN + Math.max(0, BASE_CM - cm) * PX_PER_CM;
const statureOf = (character, expr) =>
  estaturas.expresiones[`${character}/${expr}`] ?? estaturas.personajes[character] ?? BASE_CM;
// Alto lógico de cada plantilla: la de personajes y la de enemigos (lienzo del más alto).
const TEMPLATE_PERSONAJES = 1600;
const TEMPLATE_ENEMIGOS = canvasH(Math.max(...Object.values(estaturas.personajes), ...Object.values(estaturas.expresiones)));
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
  const clean = name.replace(/\.png$/i, '').replace(/\s+copia(\s+\d+)?$/i, '').trim().toLowerCase();
  const m = clean.match(/^([a-z]+)[_-](.+)$/);
  const prefixes = config.personajes[character]?.prefijos ?? [];
  return m && (m[1].slice(0, 3) === character.slice(0, 3) || prefixes.includes(m[1])) ? m[2] : clean;
}

/** Nombre de grupo o carpeta -> personaje (acepta nombres anteriores, p. ej. «jorge» -> jair). */
function resolveCharacter(name) {
  const lower = name.trim().toLowerCase();
  if (config.personajes[lower] || estaturas.personajes[lower]) return lower;
  return Object.keys(config.personajes).find((k) => config.personajes[k].prefijos?.includes(lower)) ?? lower;
}

/** Capa suelta (sin grupo) -> personaje y expresión: «soldado» -> soldado_enmascarado/base, «sombra_armored» -> monstruo_sombras/armored. */
function looseLayer(name) {
  const clean = name.replace(/\s+copia(\s+\d+)?$/i, '').trim().toLowerCase();
  const whole = resolveCharacter(clean);
  if (estaturas.personajes[whole]) return { character: whole, expr: 'base' };
  const m = clean.match(/^([a-z]+)[_-](.+)$/);
  const character = m && resolveCharacter(m[1]);
  return character && estaturas.personajes[character] ? { character, expr: m[2] } : null;
}

/** Capas sin nombre propio («Capa 2 copia 12», «Rectángulo 1»): guías o restos, no son sprites. */
const isGenericLayer = (name) => /^(capa|layer|rect[aá]ngulo|fondo|background)\b/i.test(name.trim());

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

function headWarning(headY, cm) {
  const want = headLine(cm);
  if (Math.abs(headY - want) <= TOLERANCE) return null;
  const diff = ((want - headY) / PX_PER_CM).toFixed(1);
  return `la cabeza quedó en y=${headY} y su línea es y=${want} (se ve ${diff > 0 ? `${diff} cm más alto` : `${-diff} cm más bajo`}); si es pelo o un adorno que sobresale, ignóralo`;
}

const results = { ok: 0, failed: 0, aliases: [] };
const fromPsd = new Set();
const generated = new Set(); // Rutas escritas desde una imagen real en esta corrida.

// ---------- 1) PSD ----------
for (const file of readdirSync(SOURCE).filter((f) => /\.psd$/i.test(f))) {
  console.log(`Leyendo ${file}...`);
  const psd = agPsd.readPsd(readFileSync(join(SOURCE, file)), { useImageData: true, skipCompositeImageData: true, skipThumbnail: true });
  const template = /enemigo/i.test(file) ? TEMPLATE_ENEMIGOS : TEMPLATE_PERSONAJES;
  const k = psd.height / template; // px del PSD por px del sprite
  if (Math.abs(psd.width / psd.height - 0.75) > 0.01) console.log(`  ! el lienzo del PSD (${psd.width}x${psd.height}) no es 3:4`);
  // Un grupo por personaje con una capa por expresión, o capas sueltas con el nombre del personaje (p. ej. los enemigos).
  const entries = [];
  for (const node of psd.children ?? []) {
    if (node.children) {
      const character = resolveCharacter(node.name);
      for (const layer of node.children) {
        if (layer.children) continue;
        if (isGenericLayer(layer.name)) console.log(`  · ${node.name}/${layer.name}: capa sin nombre de expresión, se omite`);
        else entries.push({ character, label: `${node.name}/${layer.name}`, layer, expr: expressionName(layer.name, character) });
      }
    } else if (!isGenericLayer(node.name)) {
      const loose = looseLayer(node.name);
      if (loose) entries.push({ ...loose, label: node.name, layer: node });
      else console.log(`  · ${node.name}: no corresponde a ningún personaje de src/data/estaturas.json, se omite`);
    }
  }
  for (const { character, label, layer, expr } of entries) {
    mkdirSync(join(TARGET, character), { recursive: true });
    fromPsd.add(character);
    {
      const img = layer.imageData;
      if (!img) continue;
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
      if (!box) {
        console.log(`✗ ${label}: la capa está vacía`);
        results.failed++;
        continue;
      }
      // Lienzo de su estatura, recortado desde el borde de abajo y centrado.
      const cm = statureOf(character, expr);
      const W = canvasW(cm);
      const H = canvasH(cm);
      if (H > template) console.log(`    ! mide ${cm} cm y no entra en esta plantilla: va en el PSD de enemigos`);
      const regionH = Math.min(psd.height, Math.round(H * k));
      const regionW = Math.min(psd.width, Math.round(W * k));
      const region = { left: Math.round((psd.width - regionW) / 2), top: psd.height - regionH, width: regionW, height: regionH };
      const dest = join(TARGET, character, `${expr}.webp`);
      const info = await sharp(Buffer.from(canvas.buffer), { raw: { width: psd.width, height: psd.height, channels: 4 } })
        .extract(region)
        .resize(W, H)
        .webp({ quality: 90, alphaQuality: 100 })
        .toFile(dest);
      generated.add(dest);
      console.log(`✓ ${label} → ${dest} (${W}x${H}, ${Math.round(info.size / 1024)} KB)`);
      if (box.left < region.left || box.right >= region.left + region.width) console.log('    ! se sale por los costados de su lienzo; se recortó');
      const warn = headWarning(Math.round((box.top - region.top) / k), cm);
      if (warn) console.log(`    ! ${warn}`);
      if (box.bottom < psd.height - 3) console.log('    ! el cuerpo no llega al borde de abajo');
      results.ok++;
    }
  }
}

// ---------- 2) PNG sueltos ----------
async function normalizePng(input, cm) {
  const W = canvasW(cm);
  const H = canvasH(cm);
  const headY = headLine(cm);
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
  const character = resolveCharacter(folder);
  if (fromPsd.has(character)) continue; // El PSD manda.
  if (!estaturas.personajes[character]) {
    console.log(`! ${folder}: personaje sin estatura en src/data/estaturas.json; se omite`);
    continue;
  }
  mkdirSync(join(TARGET, character), { recursive: true });
  for (const file of readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort()) {
    const expr = expressionName(file, character);
    const dest = join(TARGET, character, `${expr}.webp`);
    const r = await normalizePng(join(dir, file), statureOf(character, expr));
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
