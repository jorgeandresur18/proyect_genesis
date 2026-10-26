// Libreto editable de los capítulos, sincronizado con los JSON del juego.
//   node tools/guion.mjs exportar [--forzar]   src/data/chapters/*.json -> docs/guion/*.md
//   node tools/guion.mjs importar              docs/guion/*.md -> src/data/chapters/*.json
// La importación solo cambia hablantes y textos (diálogos y opciones) de escenas que ya existen.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const CHAPTERS = 'src/data/chapters';
const GUION = 'docs/guion';
const REGISTRO = 'src/data/registro_finales.json';

const chapterFiles = () =>
  readdirSync(CHAPTERS)
    .filter((f) => f.endsWith('.json'))
    .sort();

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, data) => writeFileSync(p, JSON.stringify(data, null, 2) + '\n');

// IDs cortos en el libreto: "cap01_063" se muestra como "063".
const shortId = (base, id) => (id.startsWith(`${base}_`) ? id.slice(base.length + 1) : id);
const fullId = (base, id, known) => (known.has(`${base}_${id}`) ? `${base}_${id}` : id);

const placeholder = (ref) => (ref ? ref.replace(/^PLACEHOLDER:/, '') : 'sin fondo');
const cond = (c) => `${c.var} ${c.op} ${JSON.stringify(c.value)}`;
const effects = (c) =>
  [
    ...Object.entries(c.set ?? {}).map(([k, v]) => `${k} = ${JSON.stringify(v)}`),
    ...Object.entries(c.add ?? {}).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`),
  ].join(', ');

function exportChapter(file, endings) {
  const base = basename(file, '.json');
  const data = readJson(join(CHAPTERS, file));
  const id = (s) => shortId(base, s);
  const out = [
    `<!-- guion:${file} -->`,
    `# Capítulo ${data.chapter} — ${data.title}`,
    '',
    `> **Estado:** ${data.estado ?? 'sin estado'}. ${data.nota ?? ''}`,
    '>',
    '> **Cómo editar:** cambia el hablante (entre `**...:**`) o el texto de cualquier línea, o el texto de una opción.',
    '> No borres ni cambies los códigos entre comillas invertidas (`063`): así se sabe a qué escena corresponde cada línea.',
    '> Narración: líneas que empiezan con «—». Las líneas que empiezan con «>» son notas y no se importan.',
    '> Al terminar, corre `npm run guion:importar` y después `npm run test:routes`.',
    '> Para agregar, quitar o reordenar escenas, pídemelo: la importación solo cambia textos.',
    '',
  ];
  let lastBg = null;
  data.scenes.forEach((s, i) => {
    if (s.background !== lastBg) {
      out.push('', `### ${placeholder(s.background)}`, '');
      lastBg = s.background;
    }
    if (s.audio === 'silencio') out.push('> ♪ silencio');
    else if (s.audio) out.push(`> ♪ música: ${basename(s.audio).replace(/\.[a-z0-9]+$/, '')}`);
    if (s.conditions.length) out.push(`> solo si ${s.conditions.map(cond).join(' y ')}`);
    const d = s.dialogue;
    // Línea en blanco después de cada diálogo para que la vista previa no los junte en un párrafo.
    if (d) out.push(d.speaker ? `\`${id(s.scene_id)}\` **${d.speaker}:** ${d.text}` : `\`${id(s.scene_id)}\` — ${d.text}`, '');
    if (s.choices.length) {
      out.push('', '> **DECISIÓN**');
      s.choices.forEach((c, n) => {
        const text = c.locked ? `~~${c.text}~~` : c.text;
        const extra = [c.locked ? 'tachada' : `va a \`${id(c.next)}\``, effects(c), c.conditions?.length ? `solo si ${c.conditions.map(cond).join(' y ')}` : '']
          .filter(Boolean)
          .join(' · ');
        out.push(`- \`${id(s.scene_id)}#${n}\` ${text} ⟶ ${extra}`);
      });
      out.push('');
    }
    if (s.ending) {
      const e = endings.find((x) => x.id === s.ending);
      out.push(`> **${e?.tipo === 'Bad end' ? 'BAD END' : 'FIN'}: ${e?.nombre ?? s.ending}**`, '', '---');
    } else if (typeof s.next === 'string' && data.scenes[i + 1]?.scene_id !== s.next) {
      out.push(`> ⤷ continúa en \`${id(s.next)}\``, '');
    } else if (Array.isArray(s.next)) {
      out.push(`> ⤷ ${s.next.map((b) => `${b.conditions?.length ? `si ${b.conditions.map(cond).join(' y ')}` : 'si no'} → \`${id(b.to)}\``).join(' · ')}`, '');
    }
  });
  return out.join('\n') + '\n';
}

function exportar(force) {
  mkdirSync(GUION, { recursive: true });
  const endings = readJson(REGISTRO);
  for (const file of chapterFiles()) {
    const target = join(GUION, file.replace(/\.json$/, '.md'));
    const md = exportChapter(file, endings);
    if (existsSync(target) && !force) {
      const current = readFileSync(target, 'utf8');
      if (current !== md && hasEdits(current, file)) {
        console.error(`✗ ${target} tiene cambios que no están en el juego. Corre primero "npm run guion:importar" (o usa --forzar para descartarlos).`);
        process.exitCode = 1;
        continue;
      }
    }
    writeFileSync(target, md);
    console.log(`✓ ${target}`);
  }
}

/** Lee las líneas editables de un libreto. */
function parse(md) {
  const lines = [];
  const choices = [];
  const ignored = [];
  md.split(/\r?\n/).forEach((raw, n) => {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^- `([^`#]+)#(\d+)` (.*?)(?: ⟶ .*)?$/))) {
      choices.push({ id: m[1], index: Number(m[2]), text: m[3].replace(/^~~(.*)~~$/, '$1').trim(), line: n + 1 });
    } else if ((m = line.match(/^`([^`]+)` — (.*)$/))) {
      lines.push({ id: m[1], speaker: null, text: m[2].trim(), line: n + 1 });
    } else if ((m = line.match(/^`([^`]+)` \*\*(.+?):\*\* (.*)$/))) {
      lines.push({ id: m[1], speaker: m[2].trim(), text: m[3].trim(), line: n + 1 });
    } else if (/^`[^`]+`/.test(line)) {
      ignored.push(`línea ${n + 1}: formato no reconocido → ${line.slice(0, 60)}`);
    }
  });
  return { lines, choices, ignored };
}

/** Aplica el libreto sobre los datos del capítulo. Devuelve cuántos cambios hubo. */
function apply(md, file, data, report) {
  const base = basename(file, '.json');
  const byId = new Map(data.scenes.map((s) => [s.scene_id, s]));
  const known = new Set(byId.keys());
  const { lines, choices, ignored } = parse(md);
  report.push(...ignored);
  let changes = 0;
  const seen = new Set();
  for (const l of lines) {
    const s = byId.get(fullId(base, l.id, known));
    if (!s || !s.dialogue) {
      report.push(`línea ${l.line}: la escena \`${l.id}\` no existe; se ignora`);
      continue;
    }
    seen.add(s.scene_id);
    if (!l.text) {
      report.push(`línea ${l.line}: \`${l.id}\` quedó sin texto; se ignora`);
      continue;
    }
    if (s.dialogue.speaker !== l.speaker || s.dialogue.text !== l.text) {
      s.dialogue.speaker = l.speaker;
      s.dialogue.text = l.text;
      changes++;
    }
  }
  for (const c of choices) {
    const s = byId.get(fullId(base, c.id, known));
    const choice = s?.choices[c.index];
    if (!choice) {
      report.push(`línea ${c.line}: la opción \`${c.id}#${c.index}\` no existe; se ignora`);
      continue;
    }
    if (c.text && choice.text !== c.text) {
      choice.text = c.text;
      changes++;
    }
  }
  const missing = data.scenes.filter((s) => s.dialogue && !seen.has(s.scene_id)).length;
  if (missing) report.push(`${missing} escenas no aparecen en el libreto; se dejan como estaban (para borrar escenas, pídemelo)`);
  return changes;
}

function hasEdits(md, file) {
  const data = readJson(join(CHAPTERS, file));
  return apply(md, file, data, []) > 0;
}

function importar() {
  const endings = readJson(REGISTRO);
  for (const file of chapterFiles()) {
    const source = join(GUION, file.replace(/\.json$/, '.md'));
    if (!existsSync(source)) continue;
    const path = join(CHAPTERS, file);
    const data = readJson(path);
    const report = [];
    const changes = apply(readFileSync(source, 'utf8'), file, data, report);
    if (changes) writeJson(path, data);
    console.log(`${changes ? '✓' : '·'} ${source}: ${changes} cambio(s) pasados a ${path}`);
    for (const r of report) console.log(`  ! ${r}`);
    // Normaliza el libreto con el formato actual.
    writeFileSync(source, exportChapter(file, endings));
  }
  console.log('Ahora corre "npm run test:routes".');
}

const [cmd, flag] = process.argv.slice(2);
if (cmd === 'exportar') exportar(flag === '--forzar');
else if (cmd === 'importar') importar();
else console.log('Uso: node tools/guion.mjs exportar|importar');
