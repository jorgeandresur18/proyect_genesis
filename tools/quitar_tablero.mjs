// Quita el «fondo transparente falso» (tablero gris y blanco pintado) que a veces dejan los generadores de imágenes.
//   node tools/quitar_tablero.mjs <entrada.png> <salida.png>
// 1) Busca las zonas grandes y continuas de gris o blanco neutro: eso es el tablero (las letras y el metal
//    tienen tinte de color o forman manchas chicas, y se conservan).
// 2) Las vuelve transparentes.
// 3) En una franja alrededor, separa el color del tablero del brillo («color a alfa»), para que el resplandor
//    quede semitransparente y sin halo blanco.
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.log('Uso: node tools/quitar_tablero.mjs <entrada.png> <salida.png>');
  process.exit(1);
}
const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const N = W * H;

// Colores del tablero, medidos en la esquina superior izquierda.
let light = [0, 0, 0, 0], dark = [0, 0, 0, 0];
for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
  const i = (y * W + x) * 3;
  const t = (data[i] + data[i + 1] + data[i + 2]) / 3 > 240 ? light : dark;
  t[0] += data[i]; t[1] += data[i + 1]; t[2] += data[i + 2]; t[3]++;
}
light = light.slice(0, 3).map((v) => v / light[3]);
dark = dark.slice(0, 3).map((v) => v / dark[3]);
const minChecker = Math.min(...dark) - 14;

// 1) Píxeles neutros y claros, como los del tablero.
const neutral = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const i = p * 3, r = data[i], g = data[i + 1], b = data[i + 2];
  if (Math.max(r, g, b) - Math.min(r, g, b) <= 12 && Math.min(r, g, b) >= minChecker) neutral[p] = 1;
}

// 2) Componentes conectados de esos píxeles; los grandes son tablero.
const MIN_AREA = 400;
const removed = new Uint8Array(N);
const seen = new Uint8Array(N);
for (let start = 0; start < N; start++) {
  if (!neutral[start] || seen[start]) continue;
  const comp = [start];
  seen[start] = 1;
  for (let k = 0; k < comp.length; k++) {
    const p = comp[k], x = p % W;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
      if (q >= 0 && q < N && neutral[q] && !seen[q]) { seen[q] = 1; comp.push(q); }
    }
  }
  if (comp.length >= MIN_AREA) for (const p of comp) removed[p] = 1;
}

// 3) Franja alrededor de lo borrado, donde el brillo se mezcló con el tablero.
const BAND = 14;
let band = new Uint8Array(removed);
for (let pass = 0; pass < BAND; pass++) {
  const next = new Uint8Array(band);
  for (let p = 0; p < N; p++) {
    if (band[p]) continue;
    const x = p % W;
    if ((x > 0 && band[p - 1]) || (x < W - 1 && band[p + 1]) || (p >= W && band[p - W]) || (p + W < N && band[p + W])) next[p] = 1;
  }
  band = next;
}

const c2a = (i, bg) => {
  let a = 0;
  for (let c = 0; c < 3; c++) {
    const v = data[i + c], b = bg[c];
    const ac = v > b ? (v - b) / (255 - b || 1) : (b - v) / (b || 1);
    if (ac > a) a = ac;
  }
  return Math.min(1, a);
};

const out = Buffer.alloc(N * 4);
for (let p = 0; p < N; p++) {
  const i = p * 3, o = p * 4;
  if (removed[p]) continue; // transparente
  if (!band[p]) {
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = 255;
    continue;
  }
  // Se usa el color de cuadro (claro u oscuro) que deja menos opacidad: el más parecido al fondo real.
  const al = c2a(i, light), ad = c2a(i, dark);
  const bg = al <= ad ? light : dark;
  let a = Math.min(al, ad);
  if (a > 0.85) a = 1;
  for (let c = 0; c < 3; c++) out[o + c] = a > 0.004 ? Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - a) * bg[c]) / a))) : 0;
  out[o + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(output);
const pct = ((removed.reduce((s, v) => s + v, 0) / N) * 100).toFixed(1);
console.log(`Tablero quitado (${pct} % de la imagen) → ${output}`);
