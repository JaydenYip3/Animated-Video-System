// Assemble a style's deliverables from its folder (styles/<id>/):
//   config.json  { id, name, family, file, people?, fontNames, fontLink, topic, format? }   (examples: base, previewOnly)
//                format is "vertical" (720x1280, 9:16, the default) or "horizontal" (1280x720, 16:9). It is set per video;
//                an example does not take its base style's. --format vertical|horizontal on the command line overrides
//                it for one build. The build writes the frame size into the source's "const FW = .., FH = ..;" line.
//                (size: [width, height] sets an unusual frame directly and wins over format.)
//   card.txt     the style card lines (Name: ... through How it explains: ...)
//   <file>       the reference style source (registers one style with registerStyle)
// Writes styles/<id>/template.txt (prompt document in the 2D example format) and styles/<id>/preview.html (player).
// Usage: node tools/build.mjs styles/<id> [--format vertical|horizontal]
// Portable: a style folder that holds its own copy of tools/ and lib/ (with lib/template1.txt) builds with `node tools/build.mjs .`
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), fi = args.indexOf('--format'), cli = fi >= 0 ? args.splice(fi, 2)[1] : null;
const dir = path.resolve(args[0]);
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const card = cfg.previewOnly ? '' : fs.readFileSync(path.join(dir, 'card.txt'), 'utf8').trimEnd();
const bdir = cfg.base ? path.resolve(dir, cfg.base) : null, bcfg = bdir ? JSON.parse(fs.readFileSync(path.join(bdir, 'config.json'), 'utf8')) : null;
const FORMATS = { vertical: [720, 1280], horizontal: [1280, 720] };
const format = cli || cfg.format || 'vertical';
if (!FORMATS[format]) throw new Error(`${cfg.id}: format must be "vertical" or "horizontal", got "${format}"`);
const [FW, FH] = (!cli && cfg.size) || FORMATS[format];
if (!(FW > 0 && FH > 0 && FW % 2 === 0 && FH % 2 === 0)) throw new Error(`${cfg.id}: size must be two even numbers [width, height]`);
// every "1280x720" in the wrapper and kits (written for the landscape original) becomes this build's frame size
const sized = (s) => s.replaceAll('1280x720', `${FW}x${FH}`).replace('H.W = 1280; H.H = 720;', `H.W = ${FW}; H.H = ${FH};`);
// A style's source: config.file (paths resolve from the style folder, so styles can share one file), with the people
// build named by config.people spliced in at the source's "// @people-build" marker line, and registerStyle's id and name
// taken from the config.
function styleSource(sdir, scfg) {
  let s = fs.readFileSync(path.resolve(sdir, scfg.file), 'utf8').trimEnd();
  const mark = s.match(/^ *\/\/ @people-build\b.*$/m);
  if (!mark !== !scfg.people) throw new Error(mark ? `${scfg.id}: the source has a @people-build marker but config.people is not set` : `${scfg.id}: config.people is set but the source has no @people-build marker`);
  if (mark) s = s.replace(mark[0], () => fs.readFileSync(path.resolve(sdir, scfg.people), 'utf8').trimEnd());
  const reg = /(registerStyle\(\{\s*id: )'[^']*'(,\s*name: )'[^']*'/;
  if (reg.test(s)) s = s.replace(reg, (m, a, b) => `${a}'${scfg.id}'${b}'${scfg.name.replace(/'/g, "\\'")}'`);
  else if (!scfg.base) throw new Error(`${scfg.id}: no registerStyle({ id, name }) found`);
  return s;
}
// An example explainer (config.base = its style's folder) reuses the style's helpers and people build: the style's source
// up to its EXPLAINER SCENES marker, then the example's own scenes in an inner block (so it can shadow TL, header, ...),
// then the closing brace.
let src = styleSource(dir, cfg);
if (cfg.base) {
  const base = styleSource(bdir, bcfg), cut = base.indexOf('// ================= EXPLAINER SCENES');
  if (cut < 0) throw new Error('base has no EXPLAINER SCENES marker');
  src = base.slice(0, cut) + '// ================= EXAMPLE: ' + cfg.name + ' =================\n  {\n' + src + '\n  }\n}';
}
// the frame size: the source declares it once as "const FW = <w>, FH = <h>;" and this build sets it from the config
const frameLine = /const FW = \d+, FH = \d+;/;
if (!frameLine.test(src)) throw new Error(`${cfg.id}: the source has no "const FW = <w>, FH = <h>;" line`);
src = src.replace(frameLine, `const FW = ${FW}, FH = ${FH};`);
const harness = sized(fs.readFileSync(path.join(root, 'lib/harness.js'), 'utf8'));
if (!harness.includes(`H.W = ${FW}; H.H = ${FH};`)) throw new Error('harness frame size line moved');
const sound = fs.readFileSync(path.join(root, 'lib/sound.js'), 'utf8');

// ---------- template.txt: wrapper copied from the 2D example, only name/family, fonts and the reference's topic changed
// The wrapper and kits come from template1.txt: at the repo root, or in lib/ when the tools travel inside a style folder.
const wrapper = [path.join(root, 'template1.txt'), path.join(root, 'lib/template1.txt')].find((f) => fs.existsSync(f));
if (!wrapper) throw new Error('template1.txt not found next to tools/ or in lib/');
const ex = fs.readFileSync(wrapper, 'utf8').split('\n');
const top = ex.slice(0, 49).map(sized).map((l, i) => {
  if (i === 14) return l.replace(`A ${FW}x${FH} canvas`, `A ${FW}x${FH} canvas (${FH > FW ? 'vertical video, the default; if the request asks for a horizontal video use 1280x720' : 'horizontal video; if the request asks for a vertical video use 720x1280'}: set H.W, H.H in the harness and FW, FH in the style source to match, and lay out from VERT)`);
  if (i === 0) return l.replace('"Flat-Vector Science" visual style (Popular Explainer Looks)', `"${cfg.name}" visual style (${cfg.family})`);
  if (i === 18) return `- Load these Google Fonts before the first draw (await document.fonts.load for each spec you use): ${cfg.fontNames}`;
  if (i === 19) return `  <link rel="stylesheet" href="${cfg.fontLink}&display=block">`.replace('&display=block&display=block', '&display=block');
  if (i === 28) return l.replace('(it explains "How does AI learn?")', `(it explains "${cfg.topic}")`);
  return l;
});
for (const [i, want] of [[0, cfg.name], [14, `${FW}x${FH}`], [18, cfg.fontNames], [27, `${FW}x${FH}`], [28, cfg.topic]]) if (!top[i].includes(want)) throw new Error('wrapper line ' + (i + 1) + ' did not take the replacement');
const kits = ex.slice(56, 454).map(sized); // "H HELPER LIBRARY ..." through the SOUND kit fence and the blank line after it
if (!kits[0].startsWith('H HELPER LIBRARY') || kits[kits.length - 2] !== '```') throw new Error('kit slice moved');
const tpl = [...top, 'STYLE CARD', card, '', ...kits, `REFERENCE STYLE SOURCE (styles/${cfg.id}.js; W/H_ are always ${FW}x${FH})`, '```js', src, '```', ''].join('\n');
if (!cfg.previewOnly) fs.writeFileSync(path.join(dir, 'template.txt'), tpl);

// ---------- preview.html: the player the template asks for, running the reference itself
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${cfg.fontLink}">
<style>
  :root { --bg: #17120f; --bar: #241d19; --fg: #f3ead7; --dim: #b9ab92; --acc: #b8ec4f; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--bg); color: var(--fg); font: 14px/1.3 "Fredoka", system-ui, sans-serif; }
  body { display: flex; flex-direction: column; }
  #stage { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 12px 16px 0; }
  #c { max-width: 100%; max-height: 100%; aspect-ratio: ${FW} / ${FH}; width: auto; height: auto; background: #000; display: block; }
  #bar { display: flex; gap: 10px; align-items: center; padding: 10px 16px 14px; flex-wrap: wrap; }
  button { background: var(--bar); color: var(--fg); border: 2px solid #4a3d33; border-radius: 8px; padding: 6px 12px; font: inherit; font-weight: 600; cursor: pointer; }
  button[aria-pressed="true"] { border-color: var(--acc); }
  #scrub { flex: 1; min-width: 160px; accent-color: var(--acc); }
  #time { font-variant-numeric: tabular-nums; color: var(--dim); min-width: 92px; text-align: right; }
  body.render #bar { display: none; } body.render #stage { padding: 0; }
</style></head>
<body>
<div id="stage"><canvas id="c" width="${FW}" height="${FH}"></canvas></div>
<div id="bar">
  <button id="play" aria-label="Play">Play</button>
  <input id="scrub" type="range" min="0" max="1000" value="0" aria-label="Scrub">
  <span id="time">0.00 s</span>
  <button id="snd" aria-pressed="true">Sound on</button>
  <button id="loop" aria-pressed="true">Loop on</button>
  <button id="hero" aria-pressed="false">Hero still</button>
</div>
<script>
${harness}
</script>
<script>
${sound}
</script>
<script>
${src}
</script>
<script>
(async () => {
  const q = new URLSearchParams(location.search);
  const style = STYLES[STYLES.length - 1];
  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
  const k = Number(q.get('scale') || 1);
  canvas.width = Math.round(${FW} * k); canvas.height = Math.round(${FH} * k);
  if (q.get('render')) document.body.classList.add('render');
  let hero = !!q.get('hero');
  const DURATION = style.explainerDuration;
  window.DURATION = DURATION;
  window.scoreSound = (kit) => style.explainerSound(kit);
  const draw = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(canvas.width / ${FW}, canvas.height / ${FH});
    if (hero) style.draw(ctx, ${FW}, ${FH}, Math.min(t, style.duration)); else style.explainer(ctx, ${FW}, ${FH}, t);
    ctx.restore();
  };
  let cur = 0, playing = false, t0 = 0, p0 = 0, stopSound = null, soundOn = true, loop = true;
  window.seek = (t) => { cur = t; draw(t); };
  await Promise.all((style.fonts || []).map((f) => document.fonts.load(f, 'AaZz09%?')));
  await document.fonts.ready;
  window.READY = true;
  draw(hero ? style.frameT : 0);
  const $ = (id) => document.getElementById(id);
  const len = () => (hero ? style.duration : DURATION);
  const ui = () => { $('scrub').value = Math.round((cur / len()) * 1000); $('time').textContent = cur.toFixed(2) + ' s'; $('play').textContent = playing ? 'Pause' : 'Play'; };
  const stopS = () => { if (stopSound) { stopSound(); stopSound = null; } };
  const startS = () => { stopS(); if (soundOn && !hero) stopSound = SOUND.live(window.scoreSound, cur, { voiceover: false }); };
  const play = () => { if (cur >= len() - 0.01) cur = 0; playing = true; t0 = performance.now(); p0 = cur; startS(); requestAnimationFrame(tick); ui(); };
  const pause = () => { playing = false; stopS(); ui(); };
  function tick() {
    if (!playing) return;
    let t = p0 + (performance.now() - t0) / 1000;
    if (t >= len()) { if (loop) { t = 0; p0 = 0; t0 = performance.now(); startS(); } else { t = len(); playing = false; stopS(); } }
    cur = t; draw(t); ui();
    if (playing) requestAnimationFrame(tick);
  }
  $('play').onclick = () => (playing ? pause() : play());
  $('scrub').oninput = (e) => { const was = playing; pause(); cur = (e.target.value / 1000) * len(); draw(cur); ui(); if (was) play(); };
  $('snd').onclick = () => { soundOn = !soundOn; $('snd').setAttribute('aria-pressed', soundOn); $('snd').textContent = soundOn ? 'Sound on' : 'Sound off'; if (!soundOn) stopS(); else if (playing) startS(); };
  $('loop').onclick = () => { loop = !loop; $('loop').setAttribute('aria-pressed', loop); $('loop').textContent = loop ? 'Loop on' : 'Loop off'; };
  $('hero').onclick = () => { pause(); hero = !hero; $('hero').setAttribute('aria-pressed', hero); cur = hero ? style.frameT : 0; draw(cur); ui(); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
  ui();
})();
</script>
</body></html>
`;
fs.writeFileSync(path.join(dir, 'preview.html'), html);
console.log('built', cfg.previewOnly ? 'preview.html (example)' : `template.txt (${tpl.split('\n').length} lines) and preview.html`, `at ${FW}x${FH} (${FH > FW ? 'vertical' : 'horizontal'})`, 'in', path.relative(root, dir) || '.');
