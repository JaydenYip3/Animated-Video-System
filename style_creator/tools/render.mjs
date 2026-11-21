// Render a style preview page with headless Chrome over the DevTools protocol (no npm deps; Node 22 global WebSocket).
// Usage:
//   node tools/render.mjs stills <preview.html> <outDir> <t1,t2,...> [--scale 1] [--hero]
//   node tools/render.mjs video  <preview.html> <out.mp4> [--scale 1.5] [--fps 30]
//   node tools/render.mjs check  <preview.html>            (determinism + frame-time check)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Chrome: $CHROME, then Remotion's bundled headless shell, then any Chrome or Chromium on PATH or in the usual install places.
function findChrome() {
  const names = ['chrome-headless-shell', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome'];
  const onPath = (process.env.PATH || '').split(path.delimiter).flatMap((d) => names.map((n) => path.join(d, n)));
  const fixed = ['/root/code/videos/remotion-shorts/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
  const hit = [process.env.CHROME, ...fixed, ...onPath].find((f) => f && fs.existsSync(f));
  if (!hit) throw new Error('No Chrome found. Install Chrome or Chromium, or set CHROME=/path/to/chrome (or chrome-headless-shell).');
  return hit;
}
const CHROME = findChrome();
const [mode, page, out, extra] = process.argv.slice(2);
const flag = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes('--' + n);
const scale = Number(flag('scale', mode === 'video' ? 1.5 : 1));
const fps = Number(flag('fps', 30));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const userDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'chr-'));
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--no-sandbox', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=1400,900', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  for (let i = 0; i < 100; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = list.find((p) => p.type === 'page'); if (pg) { ws = pg.webSocketDebuggerUrl; break; } } catch (e) {}
    await sleep(100);
  }
  if (!ws) throw new Error('chrome did not start');
  const sock = new WebSocket(ws);
  await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
  let id = 0; const pend = new Map(), waiters = [];
  sock.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { const { res, rej } = pend.get(d.id); pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
    else if (d.method) { if (d.method === 'Runtime.consoleAPICalled') console.log('[page]', d.params.args.map((a) => a.value ?? a.description).join(' ')); if (d.method === 'Runtime.exceptionThrown') console.log('[page error]', d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); waiters.filter((w) => w.m === d.method).forEach((w) => w.r(d.params)); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); sock.send(JSON.stringify({ id: i, method, params })); });
  const once = (m) => new Promise((r) => waiters.push({ m, r }));
  const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  return { send, once, evalJs, close: async () => { try { sock.close(); } catch (e) {} proc.kill('SIGKILL'); await sleep(300); try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {} } };
}

async function open(b) {
  const url = 'file://' + path.resolve(page) + `?render=1&scale=${scale}` + (has('hero') ? '&hero=1' : '');
  const loaded = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url });
  await loaded;
  await b.evalJs('window.READY');
}
const grab = (b, t) => b.evalJs(`(window.seek(${t}), document.getElementById('c').toDataURL('image/png').split(',')[1])`);

const b = await launch();
try {
  await open(b);
  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of extra.split(',').map(Number)) {
      fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.png`), Buffer.from(await grab(b, t), 'base64'));
    }
    console.log('stills ->', out);
  } else if (mode === 'check') {
    const D = await b.evalJs('window.DURATION');
    // same t twice (with other times in between) must give identical pixels
    const ts = [0.5, 3.3, 5.0, 7.77, 9.9, D - 0.2], bad = [];
    const first = {};
    for (const t of ts) first[t] = await grab(b, t);
    for (const t of [...ts].reverse()) if ((await grab(b, t)) !== first[t]) bad.push(t);
    console.log('determinism:', bad.length ? 'MISMATCH at ' + bad.join(',') : 'ok (' + ts.length + ' times scrubbed out of order)');
    const ms = await b.evalJs(`(() => { const a = []; for (let i = 0; i < 60; i++) { const t0 = performance.now(); window.seek((i * 0.237) % ${D}); a.push(performance.now() - t0); } a.sort((x, y) => x - y); return { median: a[30], p95: a[57], max: a[59] }; })()`);
    console.log('frame ms (software canvas):', JSON.stringify(ms));
  } else if (mode === 'video') {
    const D = await b.evalJs('window.DURATION'), N = Math.round(D * fps);
    const wav = out.replace(/\.mp4$/, '.f32');
    const audio = await b.evalJs(`(async () => { const r = await SOUND.renderOffline(window.scoreSound, ${D}, 48000, { voiceover: false }); const u8 = new Uint8Array(r.inter.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return { b64: btoa(s), peak: r.peak }; })()`);
    fs.writeFileSync(wav, Buffer.from(audio.b64, 'base64'));
    console.log('audio peak', audio.peak.toFixed(3));
    // two-pass loudness: measure, then one static (linear) gain to -16 LUFS so the mix keeps its dynamics
    const meas = await new Promise((r) => { let e = ''; const p = spawn('ffmpeg', ['-hide_banner', '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-']); p.stderr.on('data', (d) => (e += d)); p.on('close', () => r(JSON.parse(e.match(/\{[^{}]*"input_i"[^{}]*\}/)[0])));
    });
    // static gain toward -16 LUFS (capped at +8 dB) and a fast peak limiter: hits stay bigger than the bed
    const gain = Math.min(8, -16 - Number(meas.input_i)).toFixed(2);
    const ln = `volume=${gain}dB,alimiter=limit=0.84:attack=4:release=60:level=false`;
    console.log('audio measured', meas.input_i, 'LUFS, LRA', meas.input_lra, '-> gain', gain, 'dB + limiter');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', wav,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-af', ln, '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      const buf = Buffer.from(await grab(b, i / fps), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    fs.rmSync(wav);
    console.log('video ->', out);
  }
} catch (e) { console.error('FAILED:', e.message); process.exitCode = 1; } finally { await b.close(); }
