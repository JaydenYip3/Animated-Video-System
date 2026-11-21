{
  // ---------- Sci-fi sitcom, thin line: flat TV vector animation. One thin, even, near-black ink line on everything (the
  // same width on screen at any zoom), flat fills with no cel shadows, depth from darker side planes, big touching white
  // eyes with tiny scribble pupils, big-headed tube-limbed people framed large, pale domestic sets with thin-lined dressing
  // and sponge speckle in the shadow planes, soft glow only from lamps and screens; characters and props animate on twos ----------
  const TAU = Math.PI * 2;
  const cl = H.clamp, lerp = H.lerp;
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const eo = H.ease.out, eio = H.ease.inOut, ei = H.ease.in;
  const back = (u, s = 1.4) => { if (u <= 0) return 0; if (u >= 1) return 1; return 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
  // limited animation: characters and props hold each drawing for two frames (12 drawings a second).
  // Camera moves, the iris wipe and on-screen type run on ones (every frame), like a TV show's compositing.
  const twos = (t) => Math.floor(t * 12 + 1e-6) / 12;
  const TFONT = '"Fredoka", sans-serif', LFONT = TFONT;
  // The frame, in logical units. Two formats: vertical 720 x 1280 (9:16, the default, rendered at 1080 x 1920) and
  // horizontal 1280 x 720 (16:9, rendered at 1920 x 1080). The build writes the next line from config.json "format", so
  // choose the format there. Lay scenes out from FW, FH and VERT: a vertical frame stacks things top to bottom, a
  // horizontal one sets them side by side. Where the two layouts differ, write `VERT ? vertical : horizontal`.
  const FW = 720, FH = 1280;
  const VERT = FH > FW;
  const LW = 2; // ink width in SCREEN pixels (at the logical frame size) for characters and props; set lines use 1.5, small details 1.2
  const NZ = H.makeNoise(1717);

  const C = {
    ink: '#141211', shadow: '#2e2a3a', cream: '#fff6dc', paper: '#fdf9ec',
    wall: '#95a56b', wall2: '#8d9d64', wallSh: '#6c7d49',
    wood: '#ccae72', woodDk: '#8e694c', knob: '#e9a06f',
    tile: '#dbe1de', counter: '#cdd6d2', edge: '#aeb9b4',
    metal: '#8c8e94', metalDk: '#5c5e65', screen: '#16201f', digit: '#9ff0e0', copper: '#c98654',
    lime: '#b6ee54', limeDk: '#4fa83a', limeHi: '#e6ffb0', glow: '#c9ff6a',
    salmon: '#ee6a5c', mug: '#f4f1e6', coffee: '#6b3f27', lamp: '#f1ecab', star: '#f8e25c',
    oxy: '#e9604c', hyd: '#f6f1e6', brown: '#6f4631', brown2: '#7d5239', hot: '#b84a2c', hot2: '#cf6236',
    pot: '#c7744d', leaf: '#7fb24a', floor: '#8b9ca6',
  };
  const dark = (c, k = 0.3) => H.rgba(H.mix(c, C.shadow, k));   // the darker plane of a fill (side faces, undersides)
  const lite = (c, k = 0.45) => H.rgba(H.mix(c, '#fffbea', k));  // the lighter plane of a fill

  // ---------- timeline of the explainer (shared with explainerSound) ----------
  const TL = {
    title: 0.15, shrink: [1.7, 2.25], on: 0.9,
    push: [2.0, 3.2], xray: [2.9, 3.4], magLbl: 3.3, wave: [3.5, 4.2], waveLbl: 3.9, react: 4.25,
    dive: [4.45, 4.9, 5.45],            // the iris opens on the mug, holds a beat, then takes the frame
    mols: 5.5, field: [5.6, 6.05], fieldLbl: 6.05, align: 6.15, molLbl: 6.4,
    count: [6.7, 8.45], hit: 8.45, perSec: 8.7,
    heat: [9.05, 10.85], thermo: 9.1, temp: [9.35, 10.7], bumpLbl: 9.8,
    cut: 11.0, line1: 11.45, line2: 11.95, D: 14,
  };
  // the field flips: slowly while the counter runs, then faster and faster (never more than 12 a second)
  const FLIPS = (() => { const a = [6.75, 7.25, 7.7, 8.1, 8.45]; let s = 8.8, d = 0.3; while (s < TL.heat[1]) { a.push(+s.toFixed(3)); s += d; d = Math.max(1 / 11.5, d * 0.86); } return a; })();
  // molecules that bump into each other while the coffee heats: [time, a, b]
  const BONKS = VERT ? [[9.45, 0, 1], [9.75, 6, 7], [10.0, 3, 4], [10.22, 1, 2], [10.45, 5, 6], [10.65, 2, 4]] : [[9.45, 1, 2], [9.75, 5, 6], [10.0, 0, 4], [10.22, 2, 6], [10.45, 4, 5], [10.65, 3, 7]];
  const LAND = 0.5, CONTACT = 0.36; // a sign falls for CONTACT of LAND seconds, then squashes and settles

  // ---------- geometry: hand-drawn wobble, cached shapes ----------
  function resample(pts, closed, step) {
    const P = closed ? [...pts, pts[0]] : pts, out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let j = 0; j < n; j++) out.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
    }
    if (!closed) out.push(P[P.length - 1]);
    return out;
  }
  // push every point along its normal by smooth seeded noise: just enough that no edge is ruler-straight or compass-round.
  // Closed shapes sample the noise around a circle, so the wobble meets itself without a seam.
  function wob(pts, closed, seed, amp = 1) {
    const P = resample(pts, closed, 5), n = P.length, S = [0];
    for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = S[n - 1] + (closed ? Math.hypot(P[0][0] - P[n - 1][0], P[0][1] - P[n - 1][1]) : 0), rad = (tot * 0.021) / TAU, out = [];
    for (let i = 0; i < n; i++) {
      const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, th = (S[i] / tot) * TAU;
      const nv = closed ? NZ.n3(Math.cos(th) * rad + seed, Math.sin(th) * rad, seed * 0.37) : NZ.n2(S[i] * 0.021 + seed, seed * 0.37);
      out.push([P[i][0] + (nx / l) * nv * 1.6 * amp, P[i][1] + (ny / l) * nv * 1.6 * amp]);
    }
    return out;
  }
  const SHAPES = new Map();
  // shape(key, make): wobbled outline built once and cached as a Path2D. Keys must encode every size parameter;
  // animate with the canvas transform, never by changing sizes per frame.
  function shape(key, make, closed = true, amp = 1) {
    let S = SHAPES.get(key);
    if (!S) {
      let seed = 0; for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 9973;
      const pts = amp ? wob(make(), closed, seed % 97, amp) : make();
      const path = new Path2D(); pts.forEach(([a, b], i) => (i ? path.lineTo(a, b) : path.moveTo(a, b))); if (closed) path.closePath();
      S = { pts, path }; SHAPES.set(key, S);
    }
    return S;
  }
  function rrPts(X, Y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); const out = [];
    const arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(X + w - r, Y + r, -Math.PI / 2); arc(X + w - r, Y + h - r, 0); arc(X + r, Y + h - r, Math.PI / 2); arc(X + r, Y + r, Math.PI);
    return out;
  }
  const ovPts = (cx, cy, rx, ry) => { const n = Math.max(18, Math.ceil((rx + ry) * 0.6)), out = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
  const blobPts = (cx, cy, rx, ry, seed) => { const out = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU, k = 1 + 0.22 * NZ.n3(Math.cos(a) * 1.3, Math.sin(a) * 1.3, seed * 3.1); out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return out; };
  const RR = (X, Y, w, h, r, amp = 1) => shape(`rr${X},${Y},${w},${h},${r},${amp}`, () => rrPts(X, Y, w, h, r), true, amp);
  const OV = (cx, cy, rx, ry = rx, amp) => shape(`ov${cx},${cy},${rx},${ry},${amp}`, () => ovPts(cx, cy, rx, ry), true, amp == null ? Math.min(1, (rx + ry) / 50) : amp);
  const PG = (name, make, amp = 1) => shape('pg' + name, make, true, amp);

  // ---------- core drawing ----------
  // Ink is measured in screen pixels (at the logical frame size, FW wide). Every stroke takes its width from iw(), which divides out
  // the canvas scale in force (camera zoom, a person's size, a prop's scale), so a line is exactly as thin in a close-up
  // as in a wide shot. Always set stroke widths through ink() / iw(); never write x.lineWidth = n for ink.
  const iw = (x, w) => { const m = x.getTransform(); return (w * x.canvas.width) / FW / (Math.hypot(m.a, m.b) || 1); };
  const ink = (x, w = LW, col = C.ink) => { x.lineWidth = iw(x, w); x.strokeStyle = col; x.lineJoin = 'round'; x.lineCap = 'round'; };
  // cel(): the core shape. Flat fill, optional clipped inner detail, then the thin ink outline on top. There is no cel
  // shadow: depth comes from separate darker planes (a side face, an underside). o.tone = [dx, dy] adds ONE unoutlined
  // darker plane inside a round prop (the part of the shape not covered by itself shifted by tone); never use it on people.
  function cel(x, S, fill, o = {}) {
    if (fill) { x.fillStyle = fill; x.fill(S.path); }
    if (o.tone) {
      x.save(); x.clip(S.path);
      const p = new Path2D(); p.rect(-1e4, -1e4, 2e4, 2e4); p.addPath(S.path, new DOMMatrix([1, 0, 0, 1, o.tone[0], o.tone[1]]));
      x.fillStyle = o.toneCol || dark(fill, 0.2); x.fill(p, 'evenodd'); x.restore();
    }
    if (o.inner) { x.save(); x.clip(S.path); o.inner(); x.restore(); }
    if (o.lw !== 0) { ink(x, o.lw || LW, o.ink || C.ink); x.stroke(S.path); }
  }
  // union(): several shapes read as one drawing: ink all outlines at double width, then fill them all (the inner lines vanish)
  function union(x, list, lw = LW) {
    x.save(); ink(x, lw * 2);
    list.forEach(([S]) => x.stroke(S.path));
    list.forEach(([S, fill, o]) => cel(x, S, fill, Object.assign({}, o, { lw: 0 })));
    x.restore();
  }
  // a set of open ink lines, cached (tile grout, panel seams, cracks, hatching)
  function inkLines(x, key, segs, lw = 1.2, a = 1) {
    let p = SHAPES.get('L' + key);
    if (!p) { p = new Path2D(); segs.forEach((s, k) => wob(s, false, k * 7 + key.length, 0.4).forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v)))); SHAPES.set('L' + key, p); }
    x.save(); x.globalAlpha *= a; ink(x, lw); x.stroke(p); x.restore();
  }
  // panel(): a set-dressing rectangle inked the way the painted sets are: a flat fill and four separate strokes that each
  // run a little past the corner (seeded per panel). Use it for doors, drawers, frames, crates, signs on the wall.
  function panel(x, X, Y, w, h, fill, o = {}) {
    if (fill) { x.fillStyle = fill; x.fillRect(X, Y, w, h); }
    const key = `PN${X},${Y},${w},${h}`; let p = SHAPES.get(key);
    if (!p) {
      const r = H.rng(key), ov = () => r.range(0.5, o.over == null ? 3.5 : o.over); p = new Path2D();
      const edge = (a, b, k) => wob([a, b], false, k + (X + Y) % 13, 0.35).forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v)));
      edge([X - ov(), Y], [X + w + ov(), Y], 1); edge([X + w, Y - ov()], [X + w, Y + h + ov()], 2);
      edge([X + w + ov(), Y + h], [X - ov(), Y + h], 3); edge([X, Y + h + ov()], [X, Y - ov()], 4);
      SHAPES.set(key, p);
    }
    x.save(); ink(x, o.lw || 1.5); x.stroke(p); x.restore();
  }
  // speckle(): the sponge grain the sets carry in their shadow planes: sparse darker specks, clipped to a path
  let SPK = null;
  function speckle(x, path, a = 0.4) {
    if (!SPK) { const c = H.layer(256, 256), g = c.getContext('2d'), r = H.rng(77); g.fillStyle = '#1b1a12'; for (let i = 0; i < 2400; i++) { const s = r.range(0.6, 1.7); g.globalAlpha = r.range(0.25, 1); g.fillRect(r.range(0, 256), r.range(0, 256), s, s); } SPK = c; }
    x.save(); x.clip(path); x.globalAlpha *= a; x.fillStyle = x.createPattern(SPK, 'repeat'); x.fillRect(-2000, -2000, 5000, 5000); x.restore();
  }
  function cutTo(P, prog) {
    if (prog >= 1) return P;
    let tot = 0; const L = [0];
    for (let i = 1; i < P.length; i++) { tot += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(tot); }
    const want = tot * prog, out = [P[0]];
    for (let i = 1; i < P.length; i++) {
      if (L[i] >= want) { const u = (want - L[i - 1]) / (L[i] - L[i - 1] || 1); out.push([lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)]); break; }
      out.push(P[i]);
    }
    return out;
  }
  const bz = (P, n = 40) => { const out = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; out.push([a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]]); } return out; };
  function normals(P) { return P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l]; }); }
  // polygon around a polyline with half-width hw(u)
  function ribbon(P, hw) {
    const N = normals(P), n = P.length, p = new Path2D();
    for (let i = 0; i < n; i++) { const w = hw(i / (n - 1 || 1)), q = [P[i][0] + N[i][0] * w, P[i][1] + N[i][1] * w]; i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }
    for (let i = n - 1; i >= 0; i--) { const w = hw(i / (n - 1 || 1)); p.lineTo(P[i][0] - N[i][0] * w, P[i][1] - N[i][1] * w); }
    p.closePath(); return p;
  }
  // an even ink line along a polyline (folds, wires, motion lines), drawn on to o.prog. w is in screen px. Never tapered.
  function line(x, P, w = LW, o = {}) {
    const prog = o.prog == null ? 1 : o.prog; if (prog <= 0) return;
    const Q = cutTo(P, prog); if (Q.length < 2) return;
    x.save(); ink(x, w, o.col || C.ink); x.beginPath(); Q.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); x.restore();
  }
  // soft additive glow: only for light sources (lamp, screen, bulbs, energy); everything else stays flat
  function glow(x, cx, cy, r, col, a) {
    if (a <= 0 || r <= 0) return;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, H.rgba(col, a)); g.addColorStop(0.4, H.rgba(col, a * 0.35)); g.addColorStop(1, H.rgba(col, 0));
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.restore();
  }

  // ---------- arrows ----------
  // flat cartoon arrow along any polyline: flat fill, ONE thin ink outline around body + head, drawn on to prog.
  // o.wave = { a, k, ph } turns the body into a squiggle (radio waves, energy).
  function arrow(x, P, prog, o = {}) {
    if (prog <= 0.001) return;
    const w = o.w || 22, fill = o.fill || C.cream, lw = o.lw || LW;
    const Q = cutTo(resample(P, false, 6), prog); if (Q.length < 2) return;
    const S = [0]; for (let i = 1; i < Q.length; i++) S.push(S[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]));
    const tot = S[S.length - 1]; if (tot < 2) return;
    let j = Q.length - 2; while (j > 0 && tot - S[j] < 8) j--;
    const e = Q[Q.length - 1], ang = Math.atan2(e[1] - Q[j][1], e[0] - Q[j][0]), ca = Math.cos(ang), sa = Math.sin(ang);
    const hs = Math.min(1, tot / (w * 2.4)), hl = w * 1.4 * hs, hw = w * 1.08 * hs;
    let B = Q.filter((p, i) => S[i] <= tot - hl * 0.7);
    if (o.wave && B.length > 2) {
      const N = normals(B), Sb = S.slice(0, B.length), end = tot - hl * 0.7;
      B = B.map((p, i) => { const env = Math.min(1, Sb[i] / 30, (end - Sb[i]) / 30), d = Math.sin(Sb[i] * o.wave.k - (o.wave.ph || 0)) * o.wave.a * Math.max(0, env); return [p[0] + N[i][0] * d, p[1] + N[i][1] * d]; });
    }
    const body = B.length > 1 ? ribbon(B, (u) => (w / 2) * (0.78 + 0.22 * u)) : null;
    const bx = e[0] - ca * hl, by = e[1] - sa * hl, head = new Path2D();
    head.moveTo(e[0] + ca * 2, e[1] + sa * 2); head.lineTo(bx - sa * hw, by + ca * hw); head.lineTo(bx + ca * hl * 0.12, by + sa * hl * 0.12); head.lineTo(bx + sa * hw, by - ca * hw); head.closePath();
    x.save(); x.globalAlpha *= o.a == null ? 1 : o.a; ink(x, lw * 2);
    if (body) x.stroke(body); x.stroke(head);
    x.fillStyle = fill; if (body) x.fill(body); x.fill(head);
    x.restore();
  }

  // ---------- type ----------
  const CW = new Map();
  const cw = (x, ch) => { const k = x.font + ch; let v = CW.get(k); if (v == null) { v = x.measureText(ch).width; CW.set(k, v); } return v; };
  function lettersWidth(x, s, px) { x.save(); x.font = `700 ${px}px ${TFONT}`; let w = 0; for (const ch of s) w += cw(x, ch) + px * 0.02; x.restore(); return w - px * 0.02; }
  // display type: rounded bold face, flat fill, a thin ink outline and a short hard ink drop behind it. Each letter sits a
  // touch off the baseline with a slight tilt (seeded by the string, so it never jitters). o.fill or o.colors[i] per letter.
  function letters(x, s, cx, cy, px, o = {}) {
    x.save(); x.font = `700 ${px}px ${TFONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const r = H.rng('lt' + s), chars = [...s], sp = px * 0.02;
    const tot = lettersWidth(x, s, px);
    let xx = o.align === 'left' ? cx : o.align === 'right' ? cx - tot : cx - tot / 2;
    const L = chars.map((ch, i) => { const w = cw(x, ch), l = { ch, x: xx + w / 2, rot: r.range(-0.035, 0.035), dy: r.range(-0.025, 0.025) * px, col: (o.colors && o.colors[i]) || o.fill || C.cream }; xx += w + sp; return l; });
    x.globalAlpha *= o.a == null ? 1 : o.a; x.lineJoin = 'round'; x.strokeStyle = C.ink; x.lineWidth = Math.max(3.5, px * 0.085); // half of it shows
    const pass = (dx, dy, fn) => L.forEach((l) => { if (l.ch === ' ') return; x.save(); x.translate(l.x + dx, cy + l.dy + dy); x.rotate(l.rot); fn(l); x.restore(); });
    x.fillStyle = C.ink; pass(px * 0.03, px * 0.055, (l) => { x.strokeText(l.ch, 0, 0); x.fillText(l.ch, 0, 0); }); // hard drop
    pass(0, 0, (l) => x.strokeText(l.ch, 0, 0));
    pass(0, 0, (l) => { x.fillStyle = l.col; x.fillText(l.ch, 0, 0); });
    x.restore();
    return tot;
  }
  // a sign falls in, squashes on contact and springs back. u = 0..1 over LAND seconds
  function land(u) {
    if (u >= 1) return { dy: 0, sx: 1, sy: 1, a: 1 };
    if (u < CONTACT) { const v = u / CONTACT; return { dy: -80 * (1 - v * v), sx: 0.9, sy: 1.14, a: cl(v * 3) }; }
    const v = (u - CONTACT) / (1 - CONTACT), k = Math.exp(-v * 4) * Math.cos(v * 3 * Math.PI) * 0.24;
    return { dy: 0, sx: 1 + k * 0.7, sy: 1 - k, a: 1 };
  }
  // label sign: flat cream card with the thin ink line and a flat offset shadow, a slight tilt. Lands on what it labels.
  function sign(x, cx, cy, s, px, o = {}) {
    const u = o.u == null ? 1 : o.u, a = o.a == null ? 1 : o.a; if (u <= 0 || a <= 0) return;
    const L = land(u);
    x.save(); x.font = `600 ${px}px ${LFONT}`;
    const w = Math.round(x.measureText(s).width + px * 1.1), h = Math.round(px * 1.58), S = RR(-w / 2, -h / 2, w, h, 6, 0.35);
    x.translate(cx, cy + L.dy + h / 2); x.rotate(o.tilt || 0); x.scale(L.sx, L.sy); x.translate(0, -h / 2); x.globalAlpha *= L.a * a;
    x.save(); x.translate(3, 4); x.fillStyle = 'rgba(20,18,17,0.22)'; x.fill(S.path); x.restore();
    cel(x, S, o.bg || C.cream);
    x.fillStyle = o.fg || C.ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 0, px * 0.06);
    x.restore();
  }
  // leader from a sign to its target: a slightly bowed thin ink line drawn on, ending in a small dot on the thing it names
  function leader(x, a, b, prog, al = 1) {
    if (prog <= 0 || al <= 0) return;
    const m = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.12, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.12];
    const P = []; for (let i = 0; i <= 20; i++) { const u = i / 20, v = 1 - u; P.push([v * v * a[0] + 2 * v * u * m[0] + u * u * b[0], v * v * a[1] + 2 * v * u * m[1] + u * u * b[1]]); }
    const Q = cutTo(P, prog);
    x.save(); x.globalAlpha *= al; ink(x, LW);
    x.beginPath(); Q.forEach(([u, v], i) => (i ? x.lineTo(u, v) : x.moveTo(u, v))); x.stroke();
    if (prog >= 1) { x.fillStyle = C.cream; x.beginPath(); x.arc(b[0], b[1], 5, 0, TAU); x.fill(); x.stroke(); }
    x.restore();
  }
  // a labelled callout: sign lands at time t0, then its leader draws down onto the target
  function callout(x, t, t0, text, at, target, o = {}) {
    const a = o.a == null ? 1 : o.a;
    leader(x, [at[0], at[1] + (o.px || 30) * 0.8], target, eo(seg(t, t0 + LAND * CONTACT, t0 + LAND * CONTACT + 0.22)), a);
    sign(x, at[0], at[1], text, o.px || 30, { u: seg(t, t0, t0 + LAND), a, bg: o.bg, tilt: o.tilt });
  }
  // cartoon impact star (emphasis, bumps): flat jagged burst with the thin ink line
  function bang(x, cx, cy, rx, ry, k, o = {}) {
    if (k <= 0) return;
    const S = shape(`bang${rx},${ry},${o.n || 14}`, () => { const r = H.rng(rx + ry), n = o.n || 14, out = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, q = i % 2 ? 0.62 : r.range(0.92, 1.08); out.push([Math.cos(a) * rx * q, Math.sin(a) * ry * q]); } return out; }, true, 0.4);
    x.save(); x.translate(cx, cy); x.rotate(o.rot || 0); x.scale(k, k);
    cel(x, S, o.fill || C.star);
    x.restore();
  }

  // ---------- eyes ----------
  // The eye of the look: a big plain white disc with the thin ink rim and a TINY pupil that is an ink scribble (pupilPath:
  // an irregular little blot with a lumpy, spiky edge, seeded per eye so it holds its shape; never a geometric dot).
  // o: look [-1..1, -1..1], blink (0|1), wide (smaller pupil), pr (pupil size as a fraction of the eye, default 0.12),
  // odd (0..: an irregular rim instead of the clean disc, used on people), lid (0..1: a skin-coloured upper lid with an ink edge; o.skin sets its colour), lidTilt (slants the lid: + = inner end
  // down on a right-hand eye), happy (closed smiling arc). Faces stay upright when bodies turn.
  function eye(x, cx, cy, r, o = {}) {
    x.save(); x.translate(cx, cy);
    if (o.happy) { ink(x, LW); x.beginPath(); x.arc(0, r * 0.42, r * 0.62, Math.PI * 1.18, Math.PI * 1.82); x.stroke(); x.restore(); return; }
    if (o.blink) { ink(x, o.lw || LW); x.beginPath(); x.moveTo(-r * 0.92, -r * 0.05); x.quadraticCurveTo(0, r * 0.3, r * 0.92, -r * 0.05); x.stroke(); x.restore(); return; } // shut: one full-weight lid line
    const R = Math.max(4, Math.round(r)), S = o.odd ? oddEye(R, o.seed, o.odd) : OV(0, 0, R, R, 0.2);
    x.scale(r / R, (r / R) * (1 - 0.9 * (o.blink || 0)));
    cel(x, S, '#ffffff', { lw: o.lw || LW, inner: () => {
      const lk = o.look || [0, 0], pr = R * (o.pr || 0.12) * (o.wide ? 0.85 : 1);
      x.save(); x.translate(lk[0] * R * 0.58, lk[1] * R * 0.52); x.fillStyle = C.ink; x.fill(pupilPath(pr, o.seed == null ? (cx < 0 ? 1 : 2) : o.seed)); x.restore();
      if (o.lid) {
        const ly = -R + 2 * R * o.lid, tl = (o.lidTilt || 0) * R * 0.5;
        x.fillStyle = o.skin || C.cream; x.beginPath(); x.moveTo(-R - 3, -R - 3); x.lineTo(R + 3, -R - 3); x.lineTo(R + 3, ly + tl); x.lineTo(-R - 3, ly - tl); x.closePath(); x.fill();
        ink(x, o.lw || LW); x.beginPath(); x.moveTo(-R - 1, ly - tl); x.lineTo(R + 1, ly + tl); x.stroke();
      }
    } });
    x.restore();
  }
  // an eye rim that is not a compass circle: a slightly squashed, turned oval with two slow lumps, fixed per eye (seed)
  const oddEye = (R, seed, odd) => shape(`eye${R},${seed},${odd}`, () => {
    const r = H.rng('eye' + seed), kx = 1 + r.range(-0.04, 0.04) * odd, ky = 1 + r.range(-0.055, 0.025) * odd, rot = r.range(-0.6, 0.6), p1 = r.range(0, TAU), p2 = r.range(0, TAU), out = [];
    for (let i = 0; i < 44; i++) { const a = (i / 44) * TAU, k = 1 + odd * (0.022 * Math.sin(2 * a + p1) + 0.016 * Math.sin(3 * a + p2)), px = Math.cos(a) * R * kx * k, py = Math.sin(a) * R * ky * k; out.push([px * Math.cos(rot) - py * Math.sin(rot), px * Math.sin(rot) + py * Math.cos(rot)]); }
    return out;
  }, true, 0.3);
  const blinkAt = (t, ph) => { const u = (twos(t) + ph) % 3.7; return u < 0.17 ? 1 : 0; }; // shut for two drawings
  // the scribble pupil: a small blot whose edge has a few uneven spikes plus noise, cached per size and seed
  const PUPILS = new Map();
  function pupilPath(pr, seed) {
    const key = pr.toFixed(2) + ':' + seed; let p = PUPILS.get(key);
    if (!p) {
      const r = H.rng('pupil' + seed), ph1 = r.range(0, TAU), ph2 = r.range(0, TAU), ph3 = r.range(0, TAU), rot = r.range(-0.6, 0.6), P = [];
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * TAU, k = 1 + 0.2 * Math.sin(5 * a + ph1) + 0.1 * Math.sin(3 * a + ph2) + 0.07 * Math.sin(8 * a + ph3) + 0.1 * NZ.n2(Math.cos(a) * 2 + seed, Math.sin(a) * 2 + seed * 0.3);
        const px = Math.cos(a) * pr * k, py = Math.sin(a) * pr * 1.1 * k;
        P.push([px * Math.cos(rot) - py * Math.sin(rot), px * Math.sin(rot) + py * Math.cos(rot)]);
      }
      p = toPath(chaikin([...P, P[0]], 1)); PUPILS.set(key, p);
    }
    return p;
  }

  // ---------- people ----------
  // Flat-colour characters with the same thin even ink line as everything else and NO shading. Every part is a closed
  // outline rebuilt from a pose rig each drawing (on twos), slightly irregular, never a ruler-straight tube or a compass
  // circle. The build: a big head (a third of a child's height), huge white eyes that touch, tiny scribble pupils, a hook
  // of a nose, a one-line mouth, C-shaped ears; a short thin neck; narrow shoulders sloping from the neck in one line; tube
  // limbs that taper a little toward wrist and ankle with soft elbow and knee bends; hands with a palm wider than the
  // wrist, four fingers and an angled thumb; plain clothes as a slightly looser layer (sleeves wider than the arm with a
  // hem, trousers bunching once at the ankle, one or two short fold lines); shoes with a toe and a flat sole band.
  // Weight sits on one leg; pelvis and shoulders tilt against each other. Adults are the same rig with a bigger body
  // (P.tall) under a head that stays about the same size, so they read as 5 heads tall where a child is 3.5.
  // Draw with person(x, cx, feetY, PS * k, P, o); personArm(x, cx, feetY, s, P, side, o) redraws one arm over a prop.
  // A person P: { id, seed, tall (body scale: 1 child .. 1.45 adult), head (head scale, default 1), face ('round'|'long'|'oval'|'narrow'|'high'),
  //   skin, shirt, pants, shoes, sole, hair ('curls'|'puff'|'part'|'long'|'bald'), hairCol, tee (true: T-shirt, short
  //   sleeves; false: coveralls with rolled long sleeves, pointed collar and zip), collar (polo collar on a tee), glasses,
  //   goggles, bags (lines under the eyes), freckles, w (width scale), arm (arm length scale) }
  // o: { t, ph, dir (head turn -1..1), weight (-1|1: the leg that takes the weight), arms [[upper, fore] left, right]
  //      (radians from hanging down, + = outward; null = relaxed), hands ['relax'|'open'|'point'|'grip', ...],
  //      reach [leftHandTarget|null, rightHandTarget|null] (2-bone reach in the person's own units; the elbow bends
  //      outward and up, or down with elbow [-1|1, -1|1] = -1: use -1 to press, hold or carry something in front),
  //      armFront (side drawn later by personArm), legs (false hides them), look, mouth, brows (+ worried, - angry),
  //      lid, lidTilt, wide, shut, sweat }
  // Mouths: 'flat', 'smile', 'frown', 'wavy' (nervous), 'grin' (wide), 'grimace' (clenched teeth), 'open' (big maroon
  // mouth with a tongue, separate cream teeth, cheek lines and a chin curve; the head drops its jaw).
  const PLW = LW, PS = 1, PEOPLE_BUILD = 'thinline';
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k],
    mix: (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], perp: (a) => [-a[1], a[0]], dot: (a, b) => a[0] * b[0] + a[1] * b[1],
    unit: (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
  };
  const quadPts = (a, c, b, n = 8) => { const out = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; out.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]); } return out; };
  function chaikin(P, n = 2) { let Q = P; for (let k = 0; k < n; k++) { const R = [Q[0]]; for (let i = 0; i < Q.length - 1; i++) R.push(V.mix(Q[i], Q[i + 1], 0.25), V.mix(Q[i], Q[i + 1], 0.75)); R.push(Q[Q.length - 1]); Q = R; } return Q; }
  // closed outline around a centre line; width wf(u) for u = 0..1 along it; capE/capS round the ends (value = depth)
  function tube(Cn, wf, capE = 0, capS = 0) {
    const n = Cn.length, S = [0];
    for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(Cn[i][0] - Cn[i - 1][0], Cn[i][1] - Cn[i - 1][1]));
    const tot = S[n - 1] || 1, N = Cn.map((p, i) => V.unit(V.perp(V.sub(Cn[Math.min(n - 1, i + 1)], Cn[Math.max(0, i - 1)]))));
    const L = [], R = [];
    Cn.forEach((p, i) => { const h = wf(S[i] / tot) / 2; L.push(V.add(p, V.mul(N[i], h))); R.push(V.add(p, V.mul(N[i], -h))); });
    const cap = (p, nv, dv, h, k) => { const out = []; for (let j = 1; j < 6; j++) { const a = (j / 6) * Math.PI; out.push(V.add(p, V.add(V.mul(nv, Math.cos(a) * h), V.mul(dv, Math.sin(a) * h * k)))); } return out; };
    const out = [...L];
    if (capE) out.push(...cap(Cn[n - 1], N[n - 1], V.unit(V.sub(Cn[n - 1], Cn[n - 2])), wf(1) / 2, capE));
    out.push(...R.reverse());
    if (capS) out.push(...cap(Cn[0], V.mul(N[0], -1), V.unit(V.sub(Cn[0], Cn[1])), wf(0) / 2, capS));
    return out;
  }
  const along = (Cn, u) => { const i = Math.min(Cn.length - 2, Math.floor(u * (Cn.length - 1))); const d = V.unit(V.sub(Cn[i + 1], Cn[i])); return { p: Cn[i], d, n: V.perp(d) }; };
  const toPath = (P, closed = true) => { const p = new Path2D(); P.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b))); if (closed) p.closePath(); return p; };
  const wp = (P, seed, closed = true, amp = 0.2) => toPath(wob(P, closed, seed, amp), closed);
  // flat fill + thin ink; flatUnion inks several parts as one silhouette (no inner lines; touching parts keep a line)
  function flat(x, P, fill, seed, lw = PLW, amp = 0.2) { const p = wp(P, seed, true, amp); x.fillStyle = fill; x.fill(p); if (lw) { ink(x, lw); x.stroke(p); } return p; }
  function flatUnion(x, list, lw = PLW) {
    const ps = list.map(([P, fill, seed, amp]) => [wp(P, seed, true, amp == null ? 0.2 : amp), fill]);
    x.save(); ink(x, lw * 2); ps.forEach(([p]) => x.stroke(p)); ps.forEach(([p, f]) => { x.fillStyle = f; x.fill(p); }); x.restore();
  }
  // a short even ink line through a few points (folds, the nose, a mouth): smoothed, never tapered
  const fold = (x, P, w = 1.5) => line(x, chaikin(P, 2), w);

  // the pose rig, in body units: feet at the origin, neck base N at about -246, head centre about 60 above it
  function rig(P, o) {
    const T = twos(o.t || 0), ws = o.weight || 1, ph = o.ph || 0, w = P.w || 1;
    const bob = Math.sin(T * 2.2 + ph) * 1.2, sway = Math.sin(T * 1.3 + ph * 2) * 1.4;
    const PC = [ws * 4 + sway * 0.6, -160];
    const legs = {};
    for (const sd of [-1, 1]) {
      const Hj = [PC[0] + sd * 13 * w, PC[1] + (sd === ws ? -2 : 2)], stand = sd === ws;
      const A = stand ? [PC[0] * 0.3 + sd * 11 * w, -13] : [sd * 27 * w - ws * 2, -13];
      const K = stand ? V.add(V.mix(Hj, A, 0.5), [sd * 1, 0]) : V.add(V.mix(Hj, A, 0.5), [-sd * 4, 2]);
      legs[sd] = { H: Hj, K, A, toe: stand ? sd * 0.5 : sd };
    }
    const N = [-ws + sway * 0.2, -246 + bob * 0.5];
    const spine = quadPts(PC, [-ws * 3, -205], N, 8);
    const S = (sd) => [N[0] + sd * 34 * w, -232 + (sd === ws ? 2 : -1.5) + bob * 0.4];
    const HC = [N[0] + (o.dir || 0) * 4 - ws * 1.5, -306 + bob];
    return { T, ws, w, PC, legs, N, spine, S, HC, AL: [58, 54], K: P.tall || 1 }; // AL: upper and fore arm lengths; K: body scale
  }
  function spineX(R, y) {
    const s = R.spine; if (y >= s[0][1]) return s[0][0];
    for (let i = 1; i < s.length; i++) if (y >= s[i][1]) return lerp(s[i - 1][0], s[i][0], (y - s[i - 1][1]) / (s[i][1] - s[i - 1][1]));
    return s[s.length - 1][0];
  }
  function armChain(R, P, sd, o) {
    const idx = sd < 0 ? 0 : 1, L1 = R.AL[0] * (P.arm || 1), L2 = R.AL[1] * (P.arm || 1), S = R.S(sd), t0 = o.reach && o.reach[idx];
    if (t0) { // reach so the hand (not the wrist) lands on the target; targets come in person units, the rig works in body units
      const tgt = [t0[0] / R.K, t0[1] / R.K], g = V.sub(tgt, V.mul(V.unit(V.sub(tgt, S)), 10)), dx = g[0] - S[0], dy = g[1] - S[1];
      const d = cl(Math.hypot(dx, dy), 8, L1 + L2 - 1), bend = (o.elbow && o.elbow[idx]) || 1, a = Math.atan2(dy, dx) - sd * bend * Math.acos(cl((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const E = [S[0] + Math.cos(a) * L1, S[1] + Math.sin(a) * L1], b = Math.atan2(g[1] - E[1], g[0] - E[0]);
      return { S, E, W: [E[0] + Math.cos(b) * L2, E[1] + Math.sin(b) * L2] };
    }
    const [a1, a2] = (o.arms && o.arms[idx]) || (sd === R.ws ? [0.17, 0.05] : [0.09, -0.02]);
    const sw = Math.sin(R.T * 1.9 + sd + (o.ph || 0)) * 0.015;
    const E = [S[0] + sd * Math.sin(a1 + sw) * L1, S[1] + Math.cos(a1 + sw) * L1];
    return { S, E, W: [E[0] + sd * Math.sin(a2) * L2, E[1] + Math.cos(a2) * L2] };
  }
  // hands: palm wider than the wrist, four fingers that spread or curl, an angled thumb on the inner side
  const HANDS = {
    relax: { sp: 0.09, curl: [0.55, 0.52, 0.48, 0.42], k: [1, 1, 1, 1], th: 0.62, thc: -0.25, over: [0, 0, 0, 0] },
    open: { sp: 0.24, curl: [-0.06, -0.04, -0.04, -0.04], k: [1, 1, 1, 1], th: 1.1, thc: 0.05, over: [0, 0, 0, 0] },
    point: { sp: 0.05, curl: [2.6, 2.6, 2.5, 0.04], k: [0.8, 0.8, 0.8, 1.15], th: 0.45, thc: -0.35, over: [1, 1, 1, 0] },
    grip: { sp: 0.04, curl: [2.7, 2.7, 2.65, 2.6], k: [0.85, 0.85, 0.85, 0.85], th: 0.35, thc: -0.5, over: [1, 1, 1, 1] },
  };
  function handParts(Wr, ang, side, pose) {
    const H = HANDS[pose] || HANDS.relax, d = [Math.cos(ang), Math.sin(ang)], nv = V.mul(V.perp(d), side);
    const L = ([u, v]) => [Wr[0] + d[0] * u + nv[0] * v, Wr[1] + d[1] * u + nv[1] * v];
    const palm = [[-7, -3.8], [2, -4.6], [8, -7], [13.5, -6.8], [15.8, -3], [16, 2], [14.2, 5.4], [9, 7.2], [3, 6], [-7, 3.8]].map(L);
    const finger = (u0, v0, a0, curl, ln, w0, w1) => {
      const P = [[u0, v0]]; let a = a0, p = [u0, v0];
      [0.3, 0.37, 0.33].forEach((f, j) => { a += curl * (j === 0 ? 0.15 : 0.5); p = [p[0] + Math.cos(a) * ln * f, p[1] + Math.sin(a) * ln * f]; P.push(p); });
      return tube(chaikin(P.map(L), 1), (u) => lerp(w0, w1, u), 1, 0);
    };
    const F = [[-5.4, 9.5], [-2.2, 12], [1.2, 12.6], [4.6, 11]].map(([v0, ln], j) => ({ pts: finger(12.8, v0, (j - 1.5) * H.sp, H.curl[j], ln * H.k[j], 3.5, 2.4), over: H.over[j] }));
    return { palm, thumb: finger(3, 4.8, H.th, H.thc, 10.5, 4.4, 3), F };
  }
  function shoe(x, A, toe, P, seed) {
    const s = toe < 0 ? -1 : 1, k = 0.7 + 0.35 * Math.abs(toe), L = ([u, v]) => [A[0] + s * u * k - s * 3, A[1] + 13 + v * 1.1];
    const pts = [[-11, 0], [25, 0], [29.5, -3], [30, -8], [26, -12.5], [15, -15.5], [6, -19.5], [-5, -20], [-10.5, -15], [-12, -6]].map(L);
    const p = wp(pts, seed, true, 0.15);
    x.fillStyle = P.shoes; x.fill(p);
    x.save(); x.clip(p); x.fillStyle = P.sole; x.fillRect(A[0] - 40, A[1] + 9.2, 80, 8); x.restore();
    fold(x, [L([-11, -3.8]), L([10, -4]), L([29, -3.6])], 1.4);
    ink(x, PLW); x.stroke(p);
  }
  function legsDraw(x, R, P) {
    for (const sd of [-1, 1]) shoe(x, R.legs[sd].A, R.legs[sd].toe, P, P.seed + 20 + sd);
    const pl = [-1, 1].map((sd) => {
      const L = R.legs[sd], Cn = chaikin([L.H, L.K, V.add(L.A, [0, -3])], 2);
      const wf = (u) => (u < 0.5 ? lerp(28, 22.5, u / 0.5) : lerp(22.5, 21, (u - 0.5) / 0.5)) + (u > 0.86 ? 1.2 * Math.sin(((u - 0.86) / 0.14) * Math.PI * 2) + 2.4 * ((u - 0.86) / 0.14) : 0);
      return { sd, L, Cn, pts: tube(Cn, wf, 0.3, 0) };
    });
    const { PC, ws } = R;
    const seat = [[PC[0] - 26, -178], [PC[0] + 26, -178], [PC[0] + 29.5, -152], [PC[0] + 4, -138], [PC[0] - 4, -138], [PC[0] - 29.5, -152]];
    flatUnion(x, [[seat, P.pants, P.seed + 30], ...pl.map((l) => [l.pts, P.pants, P.seed + 31 + l.sd])]);
    fold(x, [[PC[0] - ws * 3, -141], [PC[0] - ws * 9, -150], [PC[0] - ws * 10, -157]], 1.4); // crotch
    for (const l of pl) { // one short bunch line at each ankle, one behind the bent knee
      const inn = (f) => (V.dot(f.n, [-l.sd, 0]) >= 0 ? f.n : V.mul(f.n, -1));
      if (l.sd !== ws) { const k = along(l.Cn, 0.5), ni = inn(k); fold(x, [V.add(k.p, V.mul(ni, 10)), V.add(V.add(k.p, V.mul(ni, 4)), V.mul(k.d, 3))], 1.4); }
      const a = along(l.Cn, 0.9), na = inn(a);
      fold(x, [V.add(a.p, V.mul(na, 10)), V.add(V.add(a.p, V.mul(na, 4)), V.mul(a.d, 2))], 1.4);
    }
  }
  function torsoParts(R, P) {
    const { N, ws, w } = R, CL = (sd) => [N[0] + sd * 10.5 * w, N[1] - 1];
    const slope = (sd) => quadPts(CL(sd), [N[0] + sd * 23 * w, N[1] + 0.5], R.S(sd), 8);
    const rows = [[-214, 31.5], [-197, 30.5], [-180, 29.5], [-164, 30.5], [-147, 32.5]];
    const side = (sd) => rows.map(([y, hw]) => [spineX(R, y) + sd * hw * w, y + (y > -170 ? (sd === ws ? -2 : 2) : 0)]);
    const Ls = side(-1), Rs = side(1);
    const hem = quadPts(Ls[Ls.length - 1], [spineX(R, -147), -143], Rs[Rs.length - 1], 6).slice(1, -1);
    const neck = quadPts(CL(1), [N[0], N[1] + (P.tee ? 8 : 16)], CL(-1), 8).slice(1, -1);
    return { pts: [...slope(-1), ...Ls, ...hem, ...Rs.reverse(), ...slope(1).reverse(), ...neck], slope, CL };
  }
  function torsoDetail(x, R, P, Tp) {
    const { N, ws, PC, w } = R;
    if (P.tee && P.collar) for (const sd of [-1, 1]) flat(x, [V.add(Tp.CL(sd), [sd * 0.5, -1.5]), [N[0] + sd * 21, N[1] + 9], [N[0] + sd * 10, N[1] + 19], [N[0], N[1] + 7.5]], P.shirt, P.seed + 80 + sd, PLW, 0.1); // polo collar: two wings meeting in a V
    else if (P.tee) fold(x, quadPts(V.add(Tp.CL(1), [-2.5, 3.5]), [N[0], N[1] + 12.5], V.add(Tp.CL(-1), [2.5, 3.5]), 8), 1.4); // neckband
    else { // coveralls: pointed collar, zip, chest pocket
      for (const sd of [-1, 1]) flat(x, [V.add(Tp.CL(sd), [sd * 1, -1]), [N[0] + sd * 22, N[1] + 3], [N[0] + sd * 13, N[1] + 16], [N[0] + sd * 2, N[1] + 15]], P.shirt, P.seed + 80 + sd, PLW, 0.1);
      fold(x, [[N[0], N[1] + 17], [spineX(R, -200), -200], [spineX(R, -150), -150]], 1.4);
      const px = spineX(R, -205) + 11 * w;
      fold(x, [[px, -212], [px + 15, -213]], 1.4); fold(x, [[px + 1, -212], [px + 1.5, -199], [px + 14, -198.5], [px + 15, -213]], 1.4);
    }
    const yW = -172, xw = spineX(R, yW) + ws * 28 * w; // the shirt gathers once over the weight hip and pulls once from the far armpit
    fold(x, [[xw, yW], [xw - ws * 8, yW + 3], [xw - ws * 12, yW + 2]], 1.4);
    const xa = spineX(R, -205) - ws * 27 * w;
    fold(x, [[xa, -205], [xa + ws * 7, -197], [xa + ws * 8, -189]], 1.4);
  }
  function sleeve(x, R, P, sd, A) {
    const Tp = torsoParts(R, P), RT = Tp.slope(sd)[5], RB = [spineX(R, -209) + sd * 28.5 * R.w, -209];
    const L1 = Math.hypot(A.E[0] - A.S[0], A.E[1] - A.S[1]), d = V.unit(V.sub(A.E, A.S)), long = !P.tee, k = long ? 0.88 : 0.45;
    const Hm = V.add(A.S, V.mul(d, L1 * k));
    let nt = V.perp(d); if (V.dot(nt, V.sub([spineX(R, -195), -185], A.S)) > 0) nt = V.mul(nt, -1); // the sleeve's top side faces away from the chest
    const hw0 = 11.5, hw1 = long ? 9 : 10.5, HT = V.add(Hm, V.mul(nt, hw1)), HB = V.add(Hm, V.mul(nt, -hw1));
    const capP = V.add(A.S, V.add(V.mul(nt, hw0 * 0.9), V.mul(d, -3))), capQ = V.add(A.S, V.add(V.mul(nt, hw0), V.mul(d, 9)));
    const outline = [...chaikin([RT, capP, capQ, HT], 2), ...quadPts(HT, V.add(Hm, V.mul(d, 2)), HB, 5).slice(1),
      ...quadPts(HB, V.add(V.add(A.S, V.mul(d, L1 * k * 0.45)), V.mul(nt, -hw0)), RB, 6).slice(1)];
    const Wp = wob(outline, false, P.seed + sd * 5 + 40, 0.2);
    x.fillStyle = P.shirt; x.fill(toPath(Wp, true));
    x.save(); ink(x, PLW); x.stroke(toPath(Wp, false)); x.restore(); // open stroke: the sleeve's root melts into the shirt
    if (long) flat(x, tube([V.add(Hm, V.mul(d, -1)), V.add(Hm, V.mul(d, 4)), V.add(Hm, V.mul(d, 8))], (u) => 2 * hw1 + 3.5 - u * 1.5, 0.15, 0.15), P.shirt, P.seed + sd + 50, PLW, 0.15);
  }
  function arm(x, R, P, sd, o) {
    const A = armChain(R, P, sd, o), idx = sd < 0 ? 0 : 1, pose = (o.hands && o.hands[idx]) || 'relax';
    const armP = tube(chaikin([A.S, A.E, A.W], 2), (u) => lerp(11.5, 7.6, u), 0, 0);
    const fd = V.unit(V.sub(A.W, A.E)), nr = V.perp(fd);
    const side = pose === 'point' ? (nr[1] <= 0 ? 1 : -1) : (V.dot(nr, [-sd, 0]) >= 0 ? 1 : -1);
    const Hd = handParts(A.W, Math.atan2(fd[1], fd[0]) + side * (pose === 'relax' ? 0.12 : 0), side, pose), seed = P.seed * 7 + sd * 3;
    flatUnion(x, [[armP, P.skin, seed, 0.2], [Hd.palm, P.skin, seed + 1, 0.1], [Hd.thumb, P.skin, seed + 2, 0.08], ...Hd.F.filter((f) => !f.over).map((f, i) => [f.pts, P.skin, seed + 3 + i, 0.08])]);
    Hd.F.filter((f) => f.over).forEach((f, i) => flat(x, f.pts, P.skin, seed + 9 + i, PLW * 0.8, 0.08));
    sleeve(x, R, P, sd, A);
  }
  // the head, in body units around the head centre HC. The references draw heads by hand: flat runs joined by soft
  // corners, the two sides never quite matching, never a compass circle or a clean ellipse. So each face (P.face) is a
  // hand-placed control loop (pts, clockwise from the crown, y down) that skull() rounds off by corner cutting:
  //   'round'  a child's ball: slightly taller than wide, flat-ish crown, full low cheeks, a broad chin with soft corners
  //   'long'   an adult's capsule: narrow, 1.5x as tall as wide, straight sides, a wide jaw with corners, a flat chin
  //   'oval'   a softer adult: round forehead, straight jaw lines running to a small chin
  //   'narrow' a tall thin head: high dome, straight converging sides, angular jaw corners, a small flat chin
  //   'high'   the adult capsule under a very tall forehead: room for wrinkles and a hat above the eyes
  // rx/top/jaw are the half width and the heights above and below HC; turn is how far the chin slides when the head
  // turns; eye and mouth place the features; er is the eye radius; lift raises the head off the shoulders so the neck
  // shows; neck is the neck's half width.
  const FACES = {
    round: { rx: 51, top: 54, jaw: 53, turn: 5.5, eye: -3, mouth: 16, er: 19, lift: 0, neck: 8.5,
      pts: [[-24, -54], [18, -55], [39, -44], [49, -20], [52, 5], [50, 25], [40, 43], [17, 54], [-14, 53], [-37, 45], [-50, 26], [-52, 4], [-48, -21], [-40, -43]] },
    long: { rx: 43, top: 64, jaw: 62, turn: 5.5, eye: -10, mouth: 27, er: 17.5, lift: 8, neck: 12.5,
      pts: [[-13, -64], [15, -63], [33, -53], [41, -31], [42, 0], [43, 29], [37, 50], [17, 62], [-15, 62], [-38, 51], [-45, 28], [-43, 0], [-40, -32], [-31, -54]] },
    oval: { rx: 45, top: 60, jaw: 62, turn: 8.5, eye: -7, mouth: 18, er: 18, lift: 5, neck: 8,
      pts: [[-14, -60], [13, -60], [35, -47], [44, -23], [45, 3], [40, 27], [26, 48], [8, 62], [-9, 62], [-26, 49], [-41, 27], [-45, 2], [-43, -24], [-33, -48]] },
    high: { rx: 43, top: 86, jaw: 60, turn: 5.5, eye: -8, mouth: 25, er: 17.5, lift: 8, neck: 12.5,
      pts: [[-12, -86], [13, -85], [30, -74], [39, -50], [42, -22], [42, 4], [43, 29], [37, 49], [17, 60], [-15, 60], [-38, 50], [-45, 28], [-43, 2], [-41, -22], [-38, -50], [-29, -75]] },
    narrow: { rx: 41, top: 66, jaw: 64, turn: 8.5, eye: -11, mouth: 24, er: 17, lift: 9, neck: 9.5,
      pts: [[-12, -66], [12, -66], [31, -54], [40, -30], [40, 0], [37, 28], [30, 49], [16, 64], [-15, 64], [-29, 50], [-37, 28], [-40, 0], [-39, -30], [-31, -54]] },
  };
  const headDims = (P) => FACES[P.face] || FACES.round;
  // ODD: how far every person is pushed off "correct" (0 = clean and symmetric, 1 = the look, 2 = strongly wrong). The
  // references are slightly off on purpose: eyes that do not match, a head that sits crooked, a mouth off the centre line.
  // quirks(P) fixes one set of these per person from P.seed (P.odd overrides ODD for that person):
  //   big   which eye is the larger one (it also sits higher; the smaller eye has the bigger pupil, drifts outward and
  //         blinks one drawing late)
  //   tilt  a constant head tilt; jaw: the chin pushed to one side; full: the fuller cheek
  //   mdx, mrot: the mouth's offset and slant; ear: the ear that sits lower and larger
  const ODD = 1, QUIRKS = new Map();
  function quirks(P) {
    const odd = P.odd == null ? ODD : P.odd, key = P.seed + ':' + odd; let q = QUIRKS.get(key);
    if (!q) { const r = H.rng('quirk' + P.seed), pm = () => (r.range(0, 1) < 0.5 ? -1 : 1); q = { odd, big: pm(), tilt: pm() * r.range(0.6, 1) * 0.05 * odd, jaw: pm() * r.range(1.5, 3.5) * odd, full: pm(), mdx: pm() * r.range(1, 2.8) * odd, mrot: pm() * r.range(0.5, 1) * 0.075 * odd, ear: pm() }; QUIRKS.set(key, q); }
    return q;
  }
  const loop = (P, n = 3) => { let Q = P; for (let k = 0; k < n; k++) { const R = []; for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; R.push(V.mix(a, b, 0.25), V.mix(a, b, 0.75)); } Q = R; } return Q; }; // closed corner cutting: flats stay flat, corners go soft
  // the head outline around [0, 0] (= HC): the face's control loop, nudged per person (seed) so no two heads match,
  // with the jaw stretched for an open mouth and the turn (dir) sliding the chin forward, the cranium back and bulging
  // the cheek on the side the face turns to
  function skull(P, D, dir, jaw) {
    const Q = quirks(P), k = 0.55 + 0.45 * Q.odd;
    const O = loop(D.pts.map(([px, py], i) => {
      let hx = px + NZ.n2(i * 1.9 + P.seed * 3.1, 0.5) * 3 * k, hy = py + NZ.n2(i * 1.9 + P.seed * 3.1, 7.5) * 2.4 * k;
      if (hy > 0) {
        const u = hy / D.jaw;
        if (hx * Q.full > 0) hx *= 1 + 0.055 * Q.odd * Math.sin(Math.min(1, u * 1.4) * Math.PI); // one cheek fuller than the other
        hx += Q.jaw * u * u;                                                                      // the chin sits off the centre line
        hx += dir * D.turn * Math.pow(u, 1.5); if (hx * dir > 0) hx += dir * 3.5 * Math.exp(-Math.pow((u - 0.45) / 0.25, 2));
        hy *= jaw / D.jaw;
      } else hx += dir * 3 * (hy / D.top);
      return [hx, hy];
    }));
    return O.map(([a, b]) => { const g = Math.atan2(b, a), m = 1 + 0.026 * Q.odd * NZ.n2(Math.cos(g) * 1.2 + P.seed * 5.7, Math.sin(g) * 1.2 + 3); return [a * m, b * m]; }); // slow lumps
  }
  // the outline's radius at any angle from HC, so hair and ears sit on the head as drawn
  function radial(O) {
    const A = O.map(([a, b]) => [Math.atan2(b, a), Math.hypot(a, b)]).sort((p, q) => p[0] - q[0]), n = A.length;
    return (a) => { a = Math.atan2(Math.sin(a), Math.cos(a)); let i = 0; while (i < n && A[i][0] < a) i++; const p = A[(i - 1 + n) % n], q = A[i % n]; let da = q[0] - p[0], d = a - p[0]; if (da <= 0) da += TAU; if (d < 0) d += TAU; return lerp(p[1], q[1], d / da); };
  }
  // a point on the head's own outline pushed out by a factor g plus add, with a slow lump so hair is not a scaled copy
  const rim = (F, a, g, add = 0) => { const r = (F.r(a) * g + add) * (1 + 0.035 * NZ.n2(Math.cos(a) * 1.4 + F.seed * 2.3, Math.sin(a) * 1.4)); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const neckPts = (R, dir, D) => { const { N, HC } = R, w = D.neck, by = N[1] + D.lift; return [...quadPts([HC[0] - w - 1.5 + dir * 5, HC[1] + 28], [N[0] - w, by - 6], [N[0] - w - 7.5, by + 6], 6), ...quadPts([N[0] + w + 7.5, by + 6], [N[0] + w, by - 6], [HC[0] + w + 1.5 + dir * 5, HC[1] + 28], 6)]; };
  const earPts = (c, sd) => { const out = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; out.push([c[0] + sd * Math.cos(a) * 9.5 * (1 - 0.18 * Math.sin(a)), c[1] + Math.sin(a) * 12.5]); } out.push([c[0] - sd * 5, c[1] + 10], [c[0] - sd * 5, c[1] - 10]); return out; };
  // hair: flat shapes with one simple silhouette each, sized to the head (D)
  function curlsPts(HC, dir, D, F) {
    const cx = HC[0], cy = HC[1], kx = D.rx / 50, out = [];
    for (let i = 0; i <= 48; i++) { const u = i / 48, a = Math.PI - 0.3 + u * (Math.PI + 0.6), b = Math.abs(Math.sin(u * Math.PI * 9)), q = rim(F, a, 1.08, 2 + 6 * b); out.push([cx + q[0], cy - 4 + q[1]]); }
    for (let i = 0; i <= 26; i++) { const u = i / 26, b = Math.abs(Math.sin(u * Math.PI * 6)); out.push([cx + lerp(47, -47, u) * kx, cy - 30 + 26 * Math.pow(Math.abs(u - 0.5) * 2, 3) + 5 * b]); }
    return out;
  }
  const puffPts = (cx, cy, seed) => { const out = []; for (let i = 0; i < 44; i++) { const a = (i / 44) * TAU, b = 1 + 0.05 * Math.abs(Math.sin(a * 6)) + 0.05 * NZ.n2(Math.cos(a) * 1.5 + seed, Math.sin(a) * 1.5); out.push([cx + Math.cos(a) * 64 * b, cy + Math.sin(a) * 50 * b]); } return out; };
  function capPts(HC, dir, D, F) { // a close cap of hair with a curved hairline
    const cx = HC[0], cy = HC[1], kx = D.rx / 50, out = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + 0.12 + (i / 24) * (Math.PI - 0.24), q = rim(F, a, 1.04, 0.5); out.push([cx + q[0], cy + q[1]]); }
    for (let i = 0; i <= 16; i++) { const u = i / 16; out.push([cx + lerp(50, -50, u) * kx, cy - 32 + 24 * Math.pow(Math.abs(u - 0.5) * 2, 2.5) + dir * 3 * (u - 0.5)]); }
    return out;
  }
  function partPts(HC, dir, D, F) { // smooth hair with a side part and short sideburns
    const cx = HC[0], cy = HC[1], kx = D.rx / 50, out = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI - 0.1 + (i / 24) * (Math.PI + 0.2), q = rim(F, a, 1.07, 1.5); out.push([cx + q[0], cy + 2 + q[1]]); }
    out.push(...chaikin([[cx + 50 * kx, cy + 8], [cx + 45 * kx, cy - 8], [cx + 40 * kx, cy - 27], [cx + 14 * kx, cy - 37], [cx - 12 * kx, cy - 30], [cx - 22 * kx, cy - 42], [cx - 40 * kx, cy - 28], [cx - 45 * kx, cy - 8], [cx - 50 * kx, cy + 8]], 2));
    return out;
  }
  const longPts = (HC, D) => { const kx = D.rx / 50, ky = D.top / 56; const P = [[-30, -64 * ky], [30, -64 * ky], [57, -32], [62, 22], [58, 72], [42, 100], [-42, 100], [-58, 72], [-62, 22], [-57, -32]].map(([a, b]) => [HC[0] + a * kx, HC[1] + b]); return chaikin([...P, P[0]], 2).slice(0, -1); };
  // open mouth: a large soft shape, flatter on top and round below, deep maroon with the face's ink; a pink tongue; teeth
  // are separate small cream shapes (short triangles with rounded tips, thin outline) hanging from the upper lip with
  // uneven gaps, smaller ones rising from the lower lip, none at the corners. Cheek lines bracket it; a curve marks the chin.
  const MOUTH = '#6B1F22', TOOTH = '#EDE7C6', TONGUE = '#E58A8E';
  function openMouth(x, cx, cy, dir = 0) {
    x.save(); x.translate(cx, cy); x.scale(1 - 0.22 * Math.abs(dir), 1); // a turned head narrows the mouth
    const mx = 0, my = 0, hw = 17, top = (dx) => my - 8 + 1.3 * Math.cos((dx / hw) * Math.PI / 2), bot = (dx) => my - 7 + 18 * Math.sqrt(Math.max(0, 1 - (dx / hw) * (dx / hw)));
    const P = [];
    for (let i = 0; i <= 6; i++) P.push([mx + (i / 6) * hw, top((i / 6) * hw)]);
    for (let i = 1; i < 18; i++) { const a = (i / 18) * Math.PI; P.push([mx + Math.cos(a) * hw, my - 7 + Math.sin(a) * 18]); }
    for (let i = 0; i <= 6; i++) P.push([mx - hw + (i / 6) * hw, top(-hw + (i / 6) * hw)]);
    const S = chaikin([...P, P[0]], 2), path = flat(x, S, MOUTH, 97, PLW, 0.1);
    const tooth = (cx, y0, w, L, up) => { const k = up ? -1 : 1, y = (f) => y0 + k * f; return [[cx - w / 2, y(-2)], [cx + w / 2, y(-2)], [cx + w * 0.36, y(L * 0.6)], [cx + w * 0.17, y(L * 0.92)], [cx, y(L)], [cx - w * 0.17, y(L * 0.92)], [cx - w * 0.36, y(L * 0.6)]]; };
    const teeth = [
      ...[[-10.6, 5.8, 5.4], [-4.2, 6.8, 6.4], [2.7, 6.2, 5.8], [9.2, 5.2, 4.6]].map(([dx, w, L]) => tooth(mx + dx, top(dx), w, L, false)),
      ...[[-6.6, 4.6, 3.6], [1.2, 5, 4.2], [7.8, 4.2, 3.2]].map(([dx, w, L]) => tooth(mx + dx, bot(dx), w, L, true)),
    ];
    x.save(); x.clip(path); ink(x, 1.1);
    x.fillStyle = TONGUE; x.beginPath(); x.ellipse(mx + 1.5, my + 9, 9.5, 5.5, 0.08, 0, TAU); x.fill(); x.stroke();
    for (const T of teeth) { const tp = toPath(chaikin([...T, T[0]], 1)); x.fillStyle = TOOTH; x.fill(tp); x.stroke(tp); }
    x.restore();
    ink(x, PLW); x.stroke(path); // lips over the tooth roots
    for (const sd of [-1, 1]) fold(x, [[mx + sd * 21, my - 12], [mx + sd * 24.5, my - 3], [mx + sd * 22, my + 6]], 1.5);
    fold(x, [[mx - 6, my + 16], [mx, my + 18.5], [mx + 6, my + 16]], 1.5);
    x.restore();
  }
  function mouth(x, mx, my, kind, dir = 0) {
    if (kind === 'smile') fold(x, quadPts([mx - 13, my - 4], [mx, my + 8], [mx + 13, my - 5], 6), PLW);
    else if (kind === 'frown') fold(x, quadPts([mx - 10, my + 3], [mx, my - 5], [mx + 10, my + 2], 6), PLW);
    else if (kind === 'wavy') { const P = []; for (let i = 0; i <= 6; i++) P.push([mx - 13 + i * 4.4, my + (i % 2 ? -2.5 : 1.5)]); line(x, P, PLW); }
    else if (kind === 'open') openMouth(x, mx, my, dir);
    else if (kind === 'grin') { x.save(); x.translate(mx, my); x.scale(1 - 0.22 * Math.abs(dir), 1); fold(x, quadPts([-20, -6], [0, 9], [20, -7], 8), PLW); fold(x, [[-20, -6], [-23, -10]], 1.5); fold(x, [[20, -7], [23, -11]], 1.5); x.restore(); }
    else if (kind === 'grimace') { flat(x, [[mx - 15, my - 6], [mx + 15, my - 7], [mx + 14, my + 6], [mx - 14, my + 7]], TOOTH, 96, PLW, 0.1); fold(x, [[mx - 14, my], [mx + 14, my - 0.5]], 1.2); fold(x, [[mx - 5, my - 6], [mx - 5, my + 6]], 1.2); fold(x, [[mx + 5, my - 6], [mx + 5, my + 6]], 1.2); }
    else fold(x, [[mx - 11, my], [mx, my + 1.2], [mx + 11, my - 0.8]], PLW);
  }
  // the outline's left and right x at a height (outline around [0, 0])
  function spanAt(O, hy) { let lo = 1e9, hi = -1e9; for (let i = 0; i < O.length; i++) { const p = O[i], q = O[(i + 1) % O.length]; if ((p[1] - hy) * (q[1] - hy) <= 0 && p[1] !== q[1]) { const u = (hy - p[1]) / (q[1] - p[1]), v = p[0] + (q[0] - p[0]) * u; lo = Math.min(lo, v); hi = Math.max(hi, v); } } return [lo, hi]; }
  // P.hat 'flat': a flat-crowned, short-brimmed hat pulled down over the top of the skull (hatCol, hatBand, hatTilt).
  // It is fitted to the head as drawn, so it works on any face and follows a turned head.
  function hatDraw(x, HC, P, D, O, dir) {
    const y0 = -(D.top - 20), [xl, xr] = spanAt(O, y0), w = (xr - xl) / 2 + 3, col = P.hatCol || '#3d3d44', band = P.hatBand || '#232226', seed = P.seed;
    x.save(); x.translate(HC[0] + (xl + xr) / 2, HC[1] + y0); x.rotate(P.hatTilt == null ? -0.045 : P.hatTilt);
    const crown = loop([[-w, 3], [-w + 0.5, -14], [-w + 2.5, -27], [-w + 9, -34], [-2, -31.5], [w - 9, -35], [w - 2.5, -27], [w - 0.5, -14], [w, 3]], 2);
    const cp = flat(x, crown, col, seed + 80, PLW, 0.15);
    x.save(); x.clip(cp); x.fillStyle = band; x.fillRect(-w - 4, -9, 2 * w + 8, 14); x.restore();
    fold(x, [[-w + 0.5, -9.5], [0, -8.5], [w - 0.5, -10]], 1.2);                       // the band's top edge
    fold(x, [[-w + 10, -28], [-2, -26], [w - 10, -29]], 1.2);                          // the crease round the flat top
    ink(x, PLW); x.stroke(cp);
    const b = w + 13, bd = dir * 5;
    flat(x, [...quadPts([-b + bd, -2], [bd, 3.5], [b + bd, -2.5], 12), ...quadPts([b + bd + 1, 2.5], [bd, 10.5], [-b + bd - 1, 3], 12)], col, seed + 81, PLW, 0.12); // the brim, in front
    x.restore();
  }
  // P.beard 'goatee': a moustache joined down both sides to a chin beard, with bare skin left around the lips, in the
  // mouth's own frame so it moves with the mouth
  const goateePts = () => loop([[-17, -4], [-12, -9.5], [0, -11], [12, -9.5], [17, -4], [18, 7], [14, 19], [7, 27], [0, 28.5], [-7, 27], [-14, 19], [-18, 7]], 2);
  const lipPatchPts = () => loop([[-10.5, -3], [-4, -4.6], [5, -4.4], [10.5, -3], [11, 3.5], [6.5, 8.5], [0, 9.6], [-6.5, 8.5], [-11, 3.5]], 2);
  // the face: two huge touching eyes (the far one first, so the near one overlaps it), thin brows, a hook nose, the mouth
  function headDraw(x, R, P, o) {
    const dir = o.dir || 0, { HC } = R, t = o.t || 0, sx = dir < 0 ? -1 : 1, seed = P.seed, D = headDims(P);
    const O = skull(P, D, dir, D.jaw + (o.mouth === 'open' ? 6 : 0)), F = { r: radial(O), seed };
    const sideX = (sd, hy) => { const a = Math.atan2(hy, sd * D.rx); return Math.cos(a) * F.r(a); }; // the outline's x at a height
    const Q = quirks(P), odd = Q.odd;
    const ears = [-1, 1].filter((sd) => !(Math.abs(dir) > 0.3 && Math.sign(dir) === sd)).map((sd) => { const low = sd === Q.ear ? 1 : 0, ky = 12 + low * 3.5 * odd, c = [HC[0] + sideX(sd, ky) - sd * 2, HC[1] + ky]; x.save(); x.translate(c[0], c[1]); x.scale(1 + low * 0.1 * odd, 1 + low * 0.1 * odd); flat(x, earPts([0, 0], sd), P.skin, seed + 70 + sd, PLW, 0.1); x.restore(); return [c, sd]; });
    const hp = flat(x, O.map((q) => [HC[0] + q[0], HC[1] + q[1]]), P.skin, seed + 3, PLW, 0.2);
    ears.forEach(([c, sd]) => fold(x, [[c[0] + sd * 5.5, c[1] - 6], [c[0] + sd * 2, c[1]], [c[0] + sd * 5, c[1] + 6]], 1.4));
    if (P.hair === 'curls') flat(x, curlsPts(HC, dir, D, F), P.hairCol, seed + 4, PLW, 0.2);
    if (P.hair === 'puff') flat(x, capPts(HC, dir, D, F), P.hairCol, seed + 4, PLW, 0.2);
    if (P.hair === 'part' || P.hair === 'long') flat(x, partPts(HC, dir, D, F), P.hairCol, seed + 4, PLW, 0.15);
    if (P.goggles) {
      flat(x, tube(quadPts([HC[0] - D.rx - 1, HC[1] - 30], [HC[0], HC[1] - 50], [HC[0] + D.rx + 1, HC[1] - 30], 10), () => 8), '#3b3330', seed + 5, PLW, 0.1);
      for (const sd of [-1, 1]) { const gx = HC[0] + dir * 8 + sd * 17, gy = HC[1] - 40; flat(x, [...Array(16)].map((_, i) => [gx + Math.cos((i / 16) * TAU) * 12, gy + Math.sin((i / 16) * TAU) * 11]), C.lime, seed + 6 + sd, PLW, 0.1); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(gx - 4, gy - 4, 4, 2.4, -0.6, 0, TAU); x.fill(); }
    }
    const er = D.er - (P.glasses ? 1.5 : 0), off = P.glasses ? er + 1 : er - 0.6, ex = HC[0] + dir * 11, ey = HC[1] + D.eye;
    if (P.wrinkles) { // forehead lines: three uneven, slightly wavy strokes between the brows and the hairline or hat
      const y1 = D.eye - er - 9, y2 = -(D.top - (P.hat ? 31 : 16)), r = H.rng('wr' + seed);
      for (let i = 0; i < 3; i++) { const wy = HC[1] + lerp(y1, y2, (i + 0.35) / 3), hw = [21, 25, 17][i] + r.range(-2, 2), cxw = HC[0] + dir * 8 + r.range(-3, 3), k = r.range(0.8, 1.6); fold(x, [[cxw - hw, wy + k], [cxw - hw * 0.45, wy - k], [cxw + 1, wy + 0.4 * k], [cxw + hw * 0.5, wy - k], [cxw + hw, wy + 0.6 * k]], 1.3); }
    }
    const look = o.look || [dir * 0.8, 0], gs = P.glasses ? 0 : 1; // behind glasses the eyes keep one size (the frames match); the pupils still differ
    // per eye: g = +1 for the larger eye, -1 for the smaller. They still touch (the two radii sum to the same width).
    const E = (sd) => { const g = sd * Q.big, small = g < 0; return { g, cx: ex + sd * off, cy: ey - g * 1.4 * odd * gs, r: er * (1 + g * 0.05 * odd * gs), bl: o.shut ? 1 : blinkAt(t, (o.ph || 0) + (small && odd > 0 ? 3.7 - 1 / 12 : 0)), look: small ? [look[0] + sd * 0.11 * odd, look[1] - 0.08 * odd] : look, pr: 0.12 * (1 - g * 0.15 * odd) }; };
    for (const sd of (dir >= 0 ? [1, -1] : [-1, 1])) {
      const e = E(sd);
      eye(x, e.cx, e.cy, e.r, { look: e.look, blink: e.bl, wide: o.wide, lid: o.lid == null ? P.lid : o.lid, lidTilt: -(o.lidTilt || 0) * sd, skin: P.skin, seed: seed * 10 + sd, pr: e.pr, odd });
      if (P.bags && !e.bl) fold(x, [[e.cx - e.r * 0.62, e.cy + e.r + 2], [e.cx, e.cy + e.r + 4.5], [e.cx + e.r * 0.62, e.cy + e.r + 2]], 1.3);
    }
    if (P.glasses) { x.save(); ink(x, 3.4); for (const sd of [-1, 1]) { x.save(); x.translate(ex + sd * off, ey); x.stroke(OV(0, 0, er + 1, er + 1, 0.2).path); x.restore(); } x.restore(); line(x, [[ex - sx * (off + er + 1), ey - 3], [HC[0] - sx * (D.rx - 3), ey + 2]], 2.4); } // dark round frames, one temple arm
    const br = o.brows || P.brows; // P.brows: the brows this person wears at rest (+ worried, - stern)
    if (br) for (const sd of [-1, 1]) { const cx = ex + sd * off; line(x, [[cx + sd * 13, ey - er - 4], [cx - sd * 9, ey - er - 8 - 5 * br]], 2.4); }
    if (P.freckles) { x.fillStyle = H.rgba(H.mix(P.skin, '#8a4a2a', 0.45)); for (const sd of [-1, 1]) for (const [a, b] of [[25, 20], [31, 24], [22, 26]]) { x.beginPath(); x.arc(HC[0] + dir * 8 + sd * a, HC[1] + b, 1.1, 0, TAU); x.fill(); } }
    const nx = HC[0] + dir * 15, ny = ey + er + 6;
    fold(x, [[nx + sx * 1, ny - 7], [nx + sx * 7.5, ny + 2], [nx + sx * 1.5, ny + 5]], PLW);
    const mAt = () => { x.translate(HC[0] + dir * 12 + Q.mdx, HC[1] + D.jaw - D.mouth); x.rotate(Q.mrot); }; // off the centre line and slanted
    if (P.beard === 'goatee') {
      x.save(); x.clip(hp); mAt(); x.scale(1 - 0.2 * Math.abs(dir), 1); flat(x, goateePts(), P.beardCol || '#6a4a36', seed + 85, PLW, 0.2); flat(x, lipPatchPts(), P.skin, seed + 86, 1.3, 0.15); x.restore();
      x.save(); x.beginPath(); x.rect(HC[0] - 120, HC[1] + 12, 240, 160); x.clip(); ink(x, PLW); x.stroke(hp); x.restore(); // the chin line back over the beard
    }
    x.save(); mAt(); mouth(x, 0, 0, o.mouth || 'flat', dir); x.restore();
    if (P.hat) hatDraw(x, HC, P, D, O, dir);
    if (o.sweat) { const k = (twos(t) * 1.6) % 1; x.save(); x.translate(HC[0] - sx * (D.rx + 1), HC[1] - 24 + k * 26); flat(x, [[0, -14], [6, -3], [6, 4], [0, 8], [-6, 4], [-6, -3]], '#a9def2', seed + 90, 1.5, 0.1); x.restore(); }
  }
  function person(x, cx, fy, s, P, o = {}) {
    const R = rig(P, o), dir = o.dir || 0, { N, HC, K } = R, hs = P.head || 1, D = headDims(P);
    const body = (fn) => { x.save(); x.scale(K, K); fn(); x.restore(); };
    const head = (fn) => { x.save(); x.translate(N[0] * K, N[1] * K); x.rotate(quirks(P).tilt); x.scale(hs, hs); x.translate(-N[0], -N[1] - D.lift); fn(); x.restore(); }; // the head sits a little crooked
    x.save(); x.translate(cx, fy); x.scale(s, s);
    if (o.legs !== false) body(() => legsDraw(x, R, P));
    head(() => {
      if (P.hair === 'puff') flat(x, puffPts(HC[0] - dir * 4, HC[1] - 44, P.seed), P.hairCol, P.seed + 60, PLW, 0.25);
      if (P.hair === 'long') flat(x, longPts(HC, D), P.hairCol, P.seed + 61, PLW, 0.15);
      flat(x, neckPts(R, dir, D), P.skin, P.seed + 1, PLW, 0.15);
    });
    body(() => { const Tp = torsoParts(R, P); flat(x, Tp.pts, P.shirt, P.seed + 2); torsoDetail(x, R, P, Tp); for (const sd of [-1, 1]) if (o.armFront !== sd) arm(x, R, P, sd, o); });
    head(() => headDraw(x, R, P, o));
    x.restore();
  }
  function personArm(x, cx, fy, s, P, sd, o) { const R = rig(P, o); x.save(); x.translate(cx, fy); x.scale(s * R.K, s * R.K); arm(x, R, P, sd, o); x.restore(); }
  // where a person's head sits, in the person's own units (multiply by the draw scale): centre y, top of the hair, radius
  const headAt = (P) => { const K = P.tall || 1, hs = P.head || 1, D = headDims(P); return { y: -(246 * K + (60 + D.lift) * hs), top: -(246 * K + (76 + D.lift + D.top) * hs), r: D.rx * hs }; };

  // ---------- props and creature characters ----------
  // a plain diner mug of coffee. origin = centre, r = half height. Body + handle are one union drawing; the right third of
  // the body is its darker plane.
  function mug(x, cx, cy, r, o = {}) {
    const R = Math.round(r);
    x.save(); x.translate(cx, cy); x.scale(r / R, r / R);
    const handle = shape(`mugh${R}`, () => { const out = []; for (let i = 0; i <= 16; i++) { const a = -1.5 + (i / 16) * 3; out.push([R * 0.7 + Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.6]); } for (let i = 16; i >= 0; i--) { const a = -1.5 + (i / 16) * 3; out.push([R * 0.7 + Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3]); } return out; }, true, 0.4);
    const body = RR(-R * 0.8, -R, R * 1.6, R * 2, R * 0.2, 0.4);
    union(x, [[handle, C.mug], [body, C.mug, { inner: () => { x.fillStyle = dark(C.mug, 0.17); x.fillRect(R * 0.34, -R, R * 0.6, R * 2); if (o.band) { x.fillStyle = o.band; x.fillRect(-R, -R * 0.2, R * 2, R * 0.42); } } }]]);
    cel(x, OV(0, -R, R * 0.8, R * 0.2, 0.3), lite(C.mug, 0.4), { lw: 1.5 });
    cel(x, OV(0, -R * 0.97, R * 0.64, R * 0.13, 0.3), C.coffee, { lw: 1.2 });
    x.restore();
    if (o.steam > 0) steam(x, cx, cy - r * 1.2, r, o.steam, o.t || 0);
  }
  // steam: three pale wisps with a thin outline, waving on twos
  function steam(x, cx, cy, r, a, t) {
    const T = twos(t);
    x.save();
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * r * 0.45, ph = T * 2.4 + i * 1.9, P = [];
      for (let j = 0; j <= 14; j++) { const u = j / 14; P.push([cx + ox + Math.sin(u * 5 + ph) * r * 0.18 * (0.3 + u), cy - u * r * (1.3 + 0.2 * i) * a]); }
      const rib = ribbon(P, (u) => r * 0.08 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.04)) + 0.6);
      ink(x, 1.2 * 2); x.stroke(rib); x.fillStyle = C.paper; x.fill(rib);
    }
    x.restore();
  }
  // a water molecule as a creature: red oxygen with the look's eyes, two white hydrogens at 104.5 degrees, each marked +.
  // ang = direction the hydrogen side points. The face stays upright while the molecule turns. Flat, thin line, no shading.
  function water(x, cx, cy, r, ang, o = {}) {
    const R = Math.round(r), hr = Math.round(R * 0.6), d = R * 1.08, half = 0.912;
    x.save(); x.translate(cx, cy); x.scale(r / R, r / R);
    for (const sg of [-1, 1]) {
      const a = ang + sg * half, hx = Math.cos(a) * d, hy = Math.sin(a) * d;
      x.save(); x.translate(hx, hy);
      cel(x, OV(0, 0, hr, hr, 0.3), C.hyd);
      ink(x, 1.6); x.beginPath(); x.moveTo(-hr * 0.3, 0); x.lineTo(hr * 0.3, 0); x.moveTo(0, -hr * 0.3); x.lineTo(0, hr * 0.3); x.stroke();
      x.restore();
    }
    cel(x, OV(0, 0, R, R, 0.3), C.oxy);
    const lk = [Math.cos(ang) * 0.8, Math.sin(ang) * 0.6], bl = blinkAt(o.t || 0, o.ph || 0), er = R * 0.4;
    eye(x, -er + 0.5, -R * 0.14, er, { look: o.dizzy ? [Math.cos(o.dizzy), Math.sin(o.dizzy)] : lk, blink: o.dizzy ? 0 : bl, wide: o.wide, pr: 0.15 });
    eye(x, er - 0.5, -R * 0.14, er, { look: o.dizzy ? [Math.cos(o.dizzy + 2), Math.sin(o.dizzy + 2)] : lk, blink: o.dizzy ? 0 : bl, wide: o.wide, pr: 0.15 });
    ink(x, 1.8); x.beginPath();
    if (o.wide) { x.moveTo(-R * 0.22, R * 0.56); for (let i = 1; i <= 4; i++) x.lineTo(-R * 0.22 + i * R * 0.11, R * (i % 2 ? 0.49 : 0.56)); }
    else { x.moveTo(-R * 0.14, R * 0.52); x.quadraticCurveTo(0, R * 0.6, R * 0.14, R * 0.5); }
    x.stroke();
    x.restore();
  }
  // thermometer: glass tube + bulb as one union drawing; the red column rises with frac (0..1). Origin = bulb centre.
  function thermo(x, cx, cy, h, frac) {
    x.save(); x.translate(cx, cy);
    const tube = RR(-21, -h - 20, 42, h + 30, 21, 0.4), bulb = OV(0, 0, 40, 40, 0.3);
    union(x, [[tube, '#eef3f1'], [bulb, C.oxy]]);
    x.save(); x.clip(tube.path); x.fillStyle = C.oxy; const top = -h * frac; x.fillRect(-11, top, 22, 30 - top);
    ink(x, 1.5); x.beginPath(); x.moveTo(-11, top); x.lineTo(11, top); x.stroke(); x.restore();
    inkLines(x, 'thermoticks' + h, Array.from({ length: 7 }, (_, i) => [[6, -h * (0.1 + i * 0.13)], [20, -h * (0.1 + i * 0.13)]]), 1.5);
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(-15, -h - 6, 4, h - 10);
    x.restore();
  }

  // ---------- the microwave (local 400 x 222, origin top-left) ----------
  // Flat grey box seen slightly from the left: a darker side plane, a darker door frame, a lit window with glass streaks.
  // o: { on, display, xray (0..1: the control panel lifts off to show the magnetron), inner() draws inside the window }
  function microwave(x, X, Y, o = {}) {
    const on = o.on || 0, xr = o.xray || 0;
    x.save(); x.translate(X, Y);
    cel(x, RR(28, 214, 40, 10, 2, 0.3), C.metalDk, { lw: 1.5 }); cel(x, RR(332, 214, 40, 10, 2, 0.3), C.metalDk, { lw: 1.5 });
    cel(x, PG('mwside', () => [[-13, 9], [0, 0], [0, 222], [-13, 213]], 0.3), C.metalDk);
    cel(x, RR(0, 0, 400, 222, 5, 0.4), C.metal);
    cel(x, RR(16, 16, 272, 190, 7, 0.4), dark(C.metal, 0.3), { lw: 1.5 });
    cel(x, RR(32, 32, 240, 158, 6, 0.4), on ? C.lamp : '#3e3d38', { lw: 1.5, inner: () => {
      if (on) { x.fillStyle = '#fbf8cd'; x.beginPath(); x.ellipse(152, 200, 150, 128, 0, Math.PI, TAU); x.fill(); } // the lamp's pool of light
      inkLines(x, 'mwback', [[[62, 54], [242, 54], [242, 152], [62, 152], [62, 54]], [[32, 32], [62, 54]], [[272, 32], [242, 54]], [[32, 190], [62, 152]], [[272, 190], [242, 152]]], 1.2, on ? 0.35 : 0.6);
      cel(x, OV(152, 171, 88, 12, 0.3), on ? '#e9dc93' : '#55534a', { lw: 1.3 });
      if (o.inner) o.inner();
      x.fillStyle = 'rgba(255,255,255,0.3)';
      x.beginPath(); x.moveTo(168, 32); x.lineTo(210, 32); x.lineTo(110, 190); x.lineTo(68, 190); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(226, 32); x.lineTo(238, 32); x.lineTo(138, 190); x.lineTo(126, 190); x.closePath(); x.fill();
    } });
    // control panel: cutaway interior underneath, the panel itself lifts off upward
    x.save(); x.beginPath(); x.rect(296, 8, 102, 206); x.clip();
    if (xr > 0) cutaway(x, on);
    x.translate(0, -eio(xr) * 240);
    x.fillStyle = C.metal; x.fillRect(296, 8, 102, 206);
    cel(x, RR(306, 26, 80, 36, 3, 0.3), C.screen, { lw: 1.5 });
    x.font = `600 25px ${LFONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = C.digit; x.fillText(o.display || '', 346, 45);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) cel(x, RR(310 + c * 25, 78 + r * 22, 20, 16, 2, 0.3), '#b7bac1', { lw: 1.2 });
    cel(x, RR(310, 172, 70, 24, 3, 0.3), dark(C.metal, 0.3), { lw: 1.4 });
    x.restore();
    line(x, [[294, 8], [294, 214]], 1.2);
    if (on) glow(x, 346, 45, 56, C.digit, 0.22);
    x.restore();
  }
  // the inside of the panel: dark cavity, copper-finned magnetron, a short waveguide stub, wires
  function cutaway(x, on) {
    x.fillStyle = '#3a4043'; x.fillRect(296, 8, 102, 206);
    inkLines(x, 'cutedge', [[[298, 10], [396, 10], [396, 212], [298, 212], [298, 10]]], 1.5);
    cel(x, RR(334, 14, 26, 70, 3, 0.3), '#596265', { lw: 1.5 });                              // waveguide stub
    for (let i = 0; i < 6; i++) cel(x, RR(318, 108 + i * 10, 58, 6, 2, 0.3), C.copper, { lw: 1.2 }); // cooling fins
    cel(x, RR(328, 98, 38, 76, 6, 0.3), '#8e969a', { lw: 1.6, inner: () => { x.fillStyle = dark('#8e969a', 0.25); x.fillRect(352, 90, 20, 90); } }); // magnetron body
    cel(x, OV(347, 92, 11, 9, 0.3), '#c9cfd2', { lw: 1.5 });                               // antenna dome
    line(x, [[330, 180], [318, 196], [336, 206], [370, 204]], 2);
    line(x, [[362, 180], [380, 192], [388, 206]], 2);
    if (on) glow(x, 347, 92, 40, C.glow, 0.35);
  }

  // ---------- the set: a sitcom kitchen (world coordinates, drawn under the camera) ----------
  // The set is taller than it is wide so a vertical frame can show a whole figure: wall above the upper cabinets (from
  // y -336 up), counter top at y 454, lower cabinets down to a dark kick board at y 912, then the floor from y 950.
  // Painted-set rules: flat fills, thin set lines (1.5) that overshoot the corners (panel()), a darker plane for every
  // underside and shadow, sponge speckle inside the shadow planes only, and plenty of small dressing.
  function kitchen(x) {
    x.fillStyle = C.wall; x.fillRect(-400, -1300, 2100, 2500);
    // the cabinets' shadow on the wall: a darker band with speckle, no outline
    const band = PG('cabsh', () => [[-400, 150], [1700, 150], [1700, 232], [-400, 240]], 0.5);
    cel(x, band, C.wallSh, { lw: 0 }); speckle(x, band.path, 0.45);
    // wall clock (it and the counter dressing sit clear of where the two people stand, so no prop pokes out behind a head)
    x.save(); x.translate(VERT ? 1150 : 905, VERT ? 296 : 300);
    cel(x, OV(0, 0, 44, 44, 0.3), C.woodDk); cel(x, OV(0, 0, 37, 37, 0.3), C.paper, { lw: 1.5 });
    inkLines(x, 'clockticks', Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return [[Math.cos(a) * 29, Math.sin(a) * 29], [Math.cos(a) * 34, Math.sin(a) * 34]]; }), 1.2);
    line(x, [[0, 0], [0, -25]], 2); line(x, [[0, 0], [17, 5]], 2);
    x.restore();
    // upper cabinets: plain doors with a bevel line and a round knob, a darker underside
    x.fillStyle = C.wood; x.fillRect(-400, -336, 2100, 484);
    cel(x, RR(-400, -350, 2100, 18, 2, 0.3), C.woodDk, { lw: 1.5 });   // the cabinets' top rail; plain wall above it
    for (let i = 0; i < 7; i++) {
      const X0 = -470 + i * 300;
      panel(x, X0 + 6, -330, 288, 462, null);
      inkLines(x, 'bev' + i, [[[X0 + 280, -322], [X0 + 280, 122]], [[X0 + 14, 122], [X0 + 280, 122]]], 1.2, 0.7);
      cel(x, OV(i % 2 ? X0 + 30 : X0 + 262, 104, 8, 8, 0.3), C.knob, { lw: 1.5 });
    }
    const under = PG('cabund', () => [[-400, 132], [1700, 132], [1700, 152], [-400, 152]], 0.4);
    cel(x, under, C.woodDk, { lw: 1.5 }); speckle(x, under.path, 0.25);
    // tiled backsplash: one row of pale tiles with thin grout
    x.fillStyle = C.tile; x.fillRect(-400, 408, 2100, 50);
    inkLines(x, 'tiles', [...Array.from({ length: 36 }, (_, i) => [[-390 + i * 56 + (i % 3) * 3, 410], [-390 + i * 56 + (i % 3) * 3, 456]]), [[-400, 408], [1700, 408]]], 1.2, 0.6);
    // counter top, its front edge, and the shadow it drops on the lower cabinets
    x.fillStyle = C.wood; x.fillRect(-400, 488, 2100, 426);
    const lip = PG('undercounter', () => [[-400, 488], [1700, 488], [1700, 503], [-400, 507]], 0.4);
    cel(x, lip, dark(C.wood, 0.3), { lw: 0 }); speckle(x, lip.path, 0.3);
    cel(x, RR(-400, 454, 2100, 20, 2, 0.3), C.counter, { lw: 1.5 });
    cel(x, RR(-400, 472, 2100, 17, 2, 0.3), C.edge, { lw: 1.5 });
    // lower cabinets: a drawer over a door in each bay, each with an inset panel line and a knob
    for (let i = 0; i < 7; i++) {
      const X0 = -470 + i * 300;
      panel(x, X0 + 8, 514, 284, 54, lite(C.wood, 0.1)); cel(x, RR(X0 + 20, 522, 260, 38, 5, 0.3), null, { lw: 1.2 });
      panel(x, X0 + 8, 582, 284, 322, lite(C.wood, 0.1)); cel(x, RR(X0 + 20, 594, 260, 298, 6, 0.3), null, { lw: 1.2 });
      cel(x, OV(X0 + 150, 541, 7, 7, 0.3), C.knob, { lw: 1.5 });
      cel(x, OV(i % 2 ? X0 + 34 : X0 + 266, 616, 7, 7, 0.3), C.knob, { lw: 1.5 });
    }
    // the floor: one flat plane, tile seams running to a point high behind the wall, a speckled shadow under the cabinets,
    // and the dark recessed kick board the cabinets stand on
    x.fillStyle = C.floor; x.fillRect(-400, 950, 2100, 1300);
    inkLines(x, 'floorseams', [...[1000, 1068, 1160, 1285, 1455, 1690].map((y) => [[-400, y], [1700, y]]),
      ...Array.from({ length: 17 }, (_, j) => { const px = 640 + (j - 8) * 150, k = (1900 - 250) / (950 - 250); return [[px, 950], [640 + (px - 640) * k, 1900]]; })], 1.2, 0.45);
    const fsh = PG('floorsh', () => [[-400, 950], [1700, 950], [1700, 978], [-400, 984]], 0.4);
    cel(x, fsh, dark(C.floor, 0.3), { lw: 0 }); speckle(x, fsh.path, 0.35);
    const kick = PG('kick', () => [[-400, 912], [1700, 912], [1700, 952], [-400, 952]], 0.3);
    cel(x, kick, dark(C.woodDk, 0.45), { lw: 1.5 }); speckle(x, kick.path, 0.3);
    // drip coffee maker: dark body, a glass carafe with measure marks
    x.save(); x.translate(VERT ? 54 : 252, 322);
    cel(x, RR(0, 0, 96, 132, 6, 0.4), C.metalDk, { inner: () => { x.fillStyle = dark(C.metalDk, 0.3); x.fillRect(0, 34, 96, 12); x.fillRect(66, 0, 30, 132); } });
    cel(x, RR(-6, -14, 108, 22, 9, 0.4), dark(C.metalDk, 0.25));
    cel(x, RR(12, 52, 62, 66, 8, 0.4), '#d6dcdb', { lw: 1.5, inner: () => { x.fillStyle = C.coffee; x.fillRect(0, 88, 96, 40); x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(20, 56, 6, 56); } });
    inkLines(x, 'carafe', [[[58, 66], [68, 66]], [[58, 78], [68, 78]], [[58, 90], [68, 90]]], 1.2);
    cel(x, RR(-4, 118, 104, 14, 4, 0.4), dark(C.metalDk, 0.25), { lw: 1.5 });
    x.restore();
    // two storage jars
    for (const [jx, jc] of (VERT ? [[-50, '#9c5a4c'], [-138, '#9c5a4c']] : [[60, '#9c5a4c'], [-28, '#9c5a4c']])) { x.save(); x.translate(jx, 372); cel(x, RR(0, 0, 66, 82, 7, 0.4), jc, { inner: () => { x.fillStyle = dark(jc, 0.25); x.fillRect(46, 0, 20, 82); } }); cel(x, RR(-3, -12, 72, 16, 5, 0.4), C.metalDk, { lw: 1.5 }); x.restore(); }
    // potted plant
    x.save(); x.translate(1210, 420);
    const leaf = (k, ang, len) => { x.save(); x.rotate(ang); cel(x, shape('leaf' + k, () => { const out = []; for (let i = 0; i <= 12; i++) { const u = i / 12; out.push([Math.sin(u * Math.PI) * len * 0.2, -u * len]); } for (let i = 11; i > 0; i--) { const u = i / 12; out.push([-Math.sin(u * Math.PI) * len * 0.2, -u * len]); } return out; }, true, 0.4), C.leaf, { lw: 1.5 }); line(x, [[0, -6], [0, -len * 0.8]], 1.2); x.restore(); };
    [[-0.9, 80], [-0.4, 104], [0.1, 110], [0.55, 96], [1.0, 74]].forEach(([a, l], k) => leaf(k, a, l));
    cel(x, PG('pot', () => [[-40, -26], [40, -26], [33, 36], [-33, 36]], 0.4), C.pot, { inner: () => { x.fillStyle = dark(C.pot, 0.25); x.fillRect(14, -30, 40, 70); } });
    cel(x, RR(-47, -36, 94, 15, 3, 0.4), lite(C.pot, 0.15), { lw: 1.5 });
    x.restore();
  }

  // ---------- the molecule world inside the coffee ----------
  const BLOBS = (() => { const r = H.rng(808), a = []; for (let i = 0; i < 9; i++) a.push({ x: r.range(0, FW + 220), y: r.range(20, FH - 20), rx: Math.round(r.range(130, 260)), ry: Math.round(r.range(60, 120)), sp: r.range(6, 14), s: i }); return a; })();
  const BUBBLES = (() => { const r = H.rng(909), a = []; for (let i = 0; i < 30; i++) a.push({ x: r.range(40, FW - 40), t0: r.range(3.6, 11), r: Math.round(r.range(7, 16)), sp: VERT ? r.range(110, 220) : r.range(70, 140), w: r.range(0.8, 2) }); return a; })();
  function goo(x, W, H_, t, heat) {
    const T = twos(t);
    x.fillStyle = H.rgba(H.mix(C.brown, C.hot, heat)); x.fillRect(0, 0, W, H_);
    const bc = H.rgba(H.mix(C.brown2, C.hot2, heat));
    BLOBS.forEach((b) => { x.save(); x.translate(((b.x + T * b.sp) % (FW + 280)) - 140, b.y); cel(x, shape('blob' + b.s, () => blobPts(0, 0, b.rx, b.ry, b.s + 5)), bc, { lw: 0 }); x.restore(); });
    const bf = H.rgba(H.mix('#a1714d', '#ee9a5c', heat));
    BUBBLES.forEach((b) => {
      const age = T - b.t0; if (age < 0) return;
      const y = FH + 40 - age * b.sp, xx = b.x + Math.sin(age * b.w * 2) * 14; if (y < -30) return;
      x.save(); x.translate(xx, y);
      cel(x, OV(0, 0, b.r, b.r, 0.3), bf, { lw: 1.5, inner: () => { x.fillStyle = 'rgba(255,250,235,0.75)'; x.beginPath(); x.ellipse(-b.r * 0.35, -b.r * 0.35, b.r * 0.3, b.r * 0.18, -0.7, 0, TAU); x.fill(); } });
      x.restore();
    });
    if (heat > 0) for (let i = 0; i < (VERT ? 6 : 9); i++) { // heat shimmer: wavy pale lines rising
      const ph = (T * (VERT ? 0.45 : 0.6) + i * 0.37) % 1, cx = VERT ? 60 + i * 120 : 70 + i * 140, P = [];
      for (let j = 0; j <= 12; j++) { const u = j / 12; P.push([cx + Math.sin(u * 7 + T * 4 + i) * 9, FH - ph * (FH + 40) - u * 110]); }
      x.save(); x.globalAlpha = 0.55 * heat; line(x, P, 3, { col: '#ffd3a1' }); x.restore();
    }
  }

  // ---------- the iris (the scene change) ----------
  // A flat disc of the next scene's colour opens on a point and grows over the frame; o.inside() draws the next scene
  // through it (fading in by o.see). Slightly uneven edge that changes on twos, thin ink rim.
  function iris(x, cx, cy, r, t, o = {}) {
    if (r < 2) return;
    const T = twos(t), p = new Path2D(), see = o.see == null ? 1 : o.see;
    for (let i = 0; i <= 90; i++) { const a = (i / 90) * TAU, w = 1 + 0.035 * NZ.n3(Math.cos(a) * 1.6, Math.sin(a) * 1.6, T * 1.7); const px = cx + Math.cos(a) * r * w, py = cy + Math.sin(a) * r * w; i ? p.lineTo(px, py) : p.moveTo(px, py); }
    p.closePath();
    x.save(); x.fillStyle = o.fill || C.coffee; x.fill(p);
    if (o.inside && see > 0.01) { x.save(); x.clip(p); x.globalAlpha *= see; o.inside(); x.restore(); }
    ink(x, LW); x.stroke(p); x.restore();
  }

  // ---------- finish: the look is clean vector, so only a whisper of grain (changing on twos) and painted-set mottle ----------
  let TEX = null;
  function textures() {
    if (TEX) return TEX;
    const mk = (w, h, f) => { const c = H.layer(w, h), cx = c.getContext('2d'), im = cx.createImageData(w, h), d = im.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; } cx.putImageData(im, 0, 0); return c; };
    const nz = H.makeNoise(31), r = H.rng(4242);
    TEX = {
      mot: mk(FW / 4, FH / 4, (x, y) => 128 + nz.fbm2(x * 0.03, y * 0.03, 4) * 80),
      grain: mk(256, 256, () => 128 + (r() + r() + r() - 1.5) * 70),
    };
    return TEX;
  }
  function finish(x, W, H_, t) {
    const T = textures(), f = Math.floor(t * 12 + 1e-6);
    x.save(); x.globalCompositeOperation = 'overlay'; x.imageSmoothingEnabled = true;
    x.globalAlpha = 0.045; x.drawImage(T.mot, 0, 0, W, H_);
    const pat = x.createPattern(T.grain, 'repeat'); pat.setTransform(new DOMMatrix().translateSelf((f * 97) % 256, (f * 57) % 256));
    x.globalAlpha = 0.035; x.fillStyle = pat; x.fillRect(0, 0, W, H_);
    x.restore();
  }

  // ---------- camera (one 2D camera over the set: world point (c.x, c.y) sits at screen centre, scale c.s) ----------
  // A scale of 1 shows FW x FH world units. A vertical frame is 720 wide: two people and a prop between them need a
  // scale near 0.8, and one subject can be framed at 1.5. A horizontal frame is 1280 wide: the same two-shot sits at 1.
  const camApply = (x, c) => { x.translate(FW / 2, FH / 2); x.scale(c.s, c.s); x.translate(-c.x, -c.y); };
  const toS = (c, p) => [FW / 2 + (p[0] - c.x) * c.s, FH / 2 + (p[1] - c.y) * c.s];
  const MW = [420, 232], MUG = [MW[0] + 152, MW[1] + 135], MAG = [MW[0] + 347, MW[1] + 128];
  const WAVE = bz([[MW[0] + 347, MW[1] + 88], [MW[0] + 347, MW[1] - 6], [MW[0] + 152, MW[1] - 14], [MW[0] + 152, MW[1] + 88]], 60);
  const WIDE = VERT ? { x: 625, y: 440, s: 0.8 } : { x: 640, y: 360, s: 1 };
  function kcam(t) {
    const p = eio(seg(t, TL.push[0], TL.push[1])), d = ei(seg(t, TL.dive[1], TL.dive[2]));
    let cx = lerp(WIDE.x, VERT ? 630 : 615, p), cy = lerp(WIDE.y, VERT ? 343 : 345, p), s = lerp(WIDE.s * (1 + 0.04 * seg(t, 0, 2)), VERT ? 1.5 : 1.75, p); // the two-shot, then the microwave alone
    cx = lerp(cx, MUG[0], d); cy = lerp(cy, MUG[1], d); s *= Math.exp(Math.log(2.4) * d); // dive at the mug as the iris takes the frame
    return { x: cx, y: cy, s };
  }
  const HDR = VERT ? [252, 58] : [262, 42];
  const header = (x, a, u = 1) => sign(x, HDR[0], HDR[1], 'How does a microwave heat food?', 27, { u, a, tilt: -0.012 });

  // ---------- recurring characters ----------
  // Characters that appear in more than one video live here, above the EXPLAINER SCENES marker, so every example has
  // them in scope: person(x, feetX, feetY, scale, CHARACTERS.vic, pose). Do not redefine them per video; change them here.
  //   vic: the lead. A bald man with a very tall, lined forehead under a flat-crowned dark hat, round dark glasses, a
  //   brown goatee, heavy-lidded stern eyes, a dark zip jacket and khaki trousers. An original design.
  const CHARACTERS = {
    vic: { id: 'vic', seed: 21, tall: 1.42, head: 1.04, face: 'high', hair: 'bald', skin: '#efc7a4', hat: 'flat', hatCol: '#3d3d44', hatBand: '#232226', wrinkles: true, beard: 'goatee', beardCol: '#7a563e', glasses: true, bags: true, lid: 0.2, brows: -0.5,
      tee: false, shirt: '#3b3d45', pants: '#b9a678', shoes: '#4a3a30', sole: '#d9d2c2', w: 1, arm: 1 },
  };

  // ================= EXPLAINER SCENES =================
  // the reference cast: two original characters. Never draw the references' own characters; change hair, colours and
  // clothes freely. Vertical framing is a full-figure two-shot: the two stand on the floor either side of the microwave and
  // their heads are about a fifth of the frame width. Horizontal framing is a waist-up two-shot: the feet stand below the
  // frame and the heads fill a third of its height.
  const CAST = {
    ravi: { id: 'ravi', seed: 5, tall: 1.45, head: 1.05, face: 'long', skin: '#c68d63', shirt: '#e2b340', collar: true, pants: '#3a466c', shoes: '#3b3531', sole: '#e9e4d6', hair: 'part', hairCol: '#2b2523', glasses: true, tee: true, w: 1, arm: 1 },
    pip: { id: 'pip', seed: 9, tall: 1, head: 1, face: 'round', skin: '#f4d0b2', shirt: '#5ab8a9', pants: '#7c4b6e', shoes: '#f1ece0', sole: '#cfc8b8', hair: 'curls', hairCol: '#cb6530', freckles: true, tee: true, w: 1, arm: 1 },
  };
  const PSC = 1.75, ADULT = VERT ? [975, 1010] : [1078, 992], KID = VERT ? [300, 985] : [150, 952];            // people scale and where their feet stand (world)
  const toP = (at, p) => [(p[0] - at[0]) / PSC, (p[1] - at[1]) / PSC]; // a world point in a person's own units (for reach)
  const BTN = [MW[0] + 345, MW[1] + 184];                            // the start button

  // ---- scene A: the kitchen. Hook title, a press of the button, camera trucks in, the panel lifts off, waves reach the mug
  function exKitchen(x, W, H_, t) {
    const c = kcam(t), T = twos(t), on = t >= TL.on ? 1 : 0;
    const secs = 30 - Math.floor(Math.max(0, t - TL.on));
    x.save(); camApply(x, c);
    kitchen(x);
    microwave(x, MW[0], MW[1], { on, xray: seg(t, TL.xray[0], TL.xray[1]), display: on ? `0:${String(secs).padStart(2, '0')}` : '0:30', inner: () => mug(x, 152, 135, 36) });
    if (on) glow(x, MUG[0], MUG[1] - 20, 210, C.lamp, 0.2 + 0.03 * Math.sin(T * 9));
    arrow(x, WAVE, eio(seg(t, TL.wave[0], TL.wave[1])), { w: 13, fill: C.lime, wave: { a: 6, k: 0.19, ph: t * 16 } });
    const ru = T - TL.react; if (ru >= 0 && ru < 0.25) bang(x, MUG[0], MUG[1] - 4, 50, 50, back(seg(ru, 0, 0.12), 2) * (1 - seg(ru, 0.17, 0.25)), { n: 9, rot: 0.3, fill: C.limeHi }); // the waves land
    // the cast, pose to pose on twos: the kid waits, the adult leans in, presses start and stands back
    const near = T >= TL.on - 0.35 && T < TL.on - 0.17, press = T >= TL.on - 0.17 && T < TL.on + 0.34;
    person(x, KID[0], KID[1], PSC, CAST.pip, { t, ph: 0.4, weight: -1, dir: 0.75, look: on ? [0.95, -0.1] : [0.8, -0.55], lid: on ? 0 : 0.42, wide: on, mouth: on ? 'flat' : 'frown' });
    person(x, ADULT[0], ADULT[1], PSC, CAST.ravi, { t, ph: 1.7, weight: 1, dir: -0.8, look: [-0.9, 0.3], mouth: on ? 'smile' : 'flat',
      reach: press ? [toP(ADULT, BTN), null] : near ? [toP(ADULT, [BTN[0] + 70, BTN[1] + 40]), null] : null, elbow: [VERT ? 1 : -1, 1], hands: press || near ? ['point', 'relax'] : null });
    x.restore();
    // callouts live in screen space so the type stays big; they land on world points through the camera
    const la = 1 - seg(t, TL.dive[0] - 0.05, TL.dive[0] + 0.15);
    callout(x, t, TL.magLbl, 'magnetron', VERT ? [520, 905] : [1092, 222], toS(c, [MAG[0] + 6, MAG[1] - 10]), { a: la, tilt: 0.02 });          // vertical: below the microwave, leader up
    callout(x, t, TL.waveLbl, 'microwaves', VERT ? [270, 300] : [700, 104], toS(c, [WAVE[30][0], WAVE[30][1] + 4]), { a: la, tilt: -0.02 }); // above it, leader down
    // hook title: words pop on with overshoot, then the whole title shrinks into the corner header
    const sp = eio(seg(t, TL.shrink[0], TL.shrink[1]));
    if (sp < 1) {
      x.save(); x.translate(lerp(VERT ? FW / 2 : 600, HDR[0], sp), lerp(VERT ? 206 : 112, HDR[1], sp)); x.scale(lerp(1, 0.34, sp), lerp(1, 0.34, sp)); x.globalAlpha = 1 - seg(sp, 0.7, 1);
      const lines = VERT ? [[['How', 'does', 'a'], -98, 62, C.cream], [['microwave'], -18, 80, C.cream], [['heat', 'food?'], 82, 104, C.lime]] // three stacked lines fill the narrow frame
        : [[['How', 'does', 'a', 'microwave'], -44, 60, C.cream], [['heat', 'food?'], 42, 86, C.lime]];
      let wi = 0;
      for (const [words, ly, px, col] of lines) {
        const ws = words.map((w) => lettersWidth(x, w, px)), gap = px * 0.3, tot = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
        let wx = -tot / 2;
        words.forEach((w, i) => { const u = back(seg(t, TL.title + wi * 0.11, TL.title + wi * 0.11 + 0.34), 1.8); if (u > 0) { x.save(); x.translate(wx + ws[i] / 2, ly + (1 - u) * 30); x.scale(u, u); letters(x, w, 0, 0, px, { fill: col }); x.restore(); } wx += ws[i] + gap; wi++; });
      }
      x.restore();
    }
    if (t > TL.shrink[1] - 0.2) header(x, 1, seg(t, TL.shrink[1] - 0.2, TL.shrink[1] - 0.2 + LAND));
  }

  // ---- scene B: inside the coffee. The field flips, water molecules turn to follow it, the count lands, then they jostle and heat up
  // Vertical layout, top to bottom: the field arrow, three staggered rows of molecules, then the readout (count, thermometer).
  // Horizontal layout: the arrow over two rows of molecules, the count under them, the thermometer at the right edge.
  const MOLS = (VERT ? [[150, 400], [360, 400], [570, 400], [255, 565], [465, 565], [150, 730], [360, 730], [570, 730]]
    : [[170, 300], [390, 300], [610, 300], [830, 300], [280, 445], [500, 445], [720, 445], [940, 445]]).map(([px, py], i) => { const r = H.rng(500 + i); return { x: px, y: py, a0: r.range(-Math.PI, Math.PI), spin: r.chance(0.5) ? 1 : -1, lag: r.range(0, 0.07) }; });
  const spr = (u) => (u <= 0 ? 0 : 1 - Math.exp(-u * 7) * Math.cos(u * 13)); // swing with a little overshoot
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function molAngle(m, T) { let a = m.a0 - wrap(m.a0) * spr(T - TL.align - m.lag); for (const tf of FLIPS) a += m.spin * Math.PI * spr(T - tf - m.lag); return a; }
  function fieldDir(t) { let n = 0, last = -1; for (const tf of FLIPS) if (t >= tf) { n++; last = tf; } const cur = n % 2 ? -1 : 1; return last < 0 ? 1 : cur * (2 * eio(seg(t, last, last + 0.1)) - 1); }
  const NUMY = VERT ? 985 : 592; // where the big count sits
  const FIELD = bz(VERT ? [[-290, 6], [-97, -9], [97, 9], [290, -3]] : [[-390, 6], [-130, -9], [130, 9], [390, -3]], 50);
  const bump = (u) => (u < -0.17 ? 0 : u < 0 ? Math.pow(1 + u / 0.17, 2) : Math.exp(-u * 9));
  function molPos(i, T, heat) {
    const m = MOLS[i]; let px = m.x + NZ.n2(i * 7.3, T * 6) * 46 * heat, py = m.y + NZ.n2(i * 7.3 + 50, T * 6) * 34 * heat;
    for (const [tb, a, b] of BONKS) { if (i !== a && i !== b) continue; const o = MOLS[i === a ? b : a], d = Math.hypot(o.x - m.x, o.y - m.y), k = 52 * bump(T - tb); px += ((o.x - m.x) / d) * k; py += ((o.y - m.y) / d) * k; }
    return [px, py];
  }
  const countAt = (t) => Math.round(2.45e9 * Math.pow(seg(t, TL.count[0], TL.count[1]), 2.4));
  const tempAt = (t) => Math.round(lerp(5, 65, eio(seg(t, TL.temp[0], TL.temp[1]))));
  function exMol(x, W, H_, t) {
    const T = twos(t), heat = eio(seg(t, TL.heat[0], TL.heat[1]));
    goo(x, W, H_, t, heat);
    // the field: one big flat arrow that flips direction (squashes through zero width)
    const fp = eio(seg(t, TL.field[0], TL.field[1]));
    x.save(); x.translate(FW / 2, VERT ? 238 : 168); x.scale(fieldDir(t), 1); arrow(x, FIELD, fp, { w: 40, fill: C.lime }); x.restore();
    // molecules
    const P = MOLS.map((m, i) => molPos(i, T, heat));
    MOLS.forEach((m, i) => {
      const s = back(seg(T, TL.mols + i * 0.05, TL.mols + i * 0.05 + 0.3), 1.8); if (s <= 0) return;
      if (heat > 0.05) { // motion lines trail behind the jostle
        const q = molPos(i, T - 1 / 12, heat), dx = P[i][0] - q[0], dy = P[i][1] - q[1], l = Math.hypot(dx, dy);
        if (l > 6) for (let k = -1; k <= 1; k++) { const nx = -dy / l, ny = dx / l, ox = P[i][0] - (dx / l) * 62 + nx * k * 22, oy = P[i][1] - (dy / l) * 62 + ny * k * 22; line(x, [[ox, oy], [ox - (dx / l) * 40, oy - (dy / l) * 40]], 2); }
      }
      water(x, P[i][0], P[i][1], (VERT ? 38 : 34) * s, molAngle(m, T) + (heat > 0 ? NZ.n2(i, T * 9) * 0.5 * heat : 0), { t, ph: i * 0.9, wide: heat > 0.3, dizzy: heat > 0.6 ? T * 9 + i : 0 });
    });
    for (const [tb, a, b] of BONKS) { const u = T - tb; if (u >= 0 && u < 0.25) bang(x, (P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2, 34, 34, back(seg(u, 0, 0.12), 2) * (1 - seg(u, 0.17, 0.25)), { n: 8, rot: tb }); }
    // labels
    const la = 1 - seg(t, TL.heat[0], TL.heat[0] + 0.3);
    callout(x, t, TL.fieldLbl, 'electric field', VERT ? [500, 152] : [820, 92], VERT ? [500, 220] : [820, 150], { a: la, tilt: 0.015 });
    callout(x, t, TL.molLbl, 'water molecule', VERT ? [196, 872] : [160, 572], VERT ? [MOLS[5].x - 10, MOLS[5].y + 40] : [MOLS[0].x - 10, MOLS[0].y + 36], { a: Math.min(la, 1 - seg(t, TL.hit - 0.3, TL.hit - 0.1)), tilt: -0.02 });
    // the counter: counts up, then SLAMS: overshoot scale, burst star behind, colour swap, screen shake (in explainer())
    const ca = seg(t, TL.count[0] - 0.2, TL.count[0]), out = ei(seg(t, TL.heat[0], TL.heat[0] + 0.45));
    if (ca > 0 && out < 1) {
      x.save(); x.translate(0, out * (VERT ? 460 : 260)); x.globalAlpha = ca;
      const hu = t - TL.hit;
      if (hu >= 0) bang(x, FW / 2, NUMY, VERT ? 322 : 360, VERT ? 104 : 84, back(seg(hu, 0, 0.3), 2), { n: 18, rot: 0.03 });
      const sc = hu >= 0 ? 1 + 0.4 * Math.exp(-hu * 7) * Math.cos(hu * 20) : 1;
      sign(x, FW / 2, VERT ? 1090 : 672, 'times a second', VERT ? 34 : 30, { u: seg(t, TL.perSec, TL.perSec + LAND), tilt: 0.01 }); // drops in behind the number
      x.save(); x.translate(FW / 2, NUMY); x.scale(sc, sc); letters(x, countAt(t).toLocaleString('en-US'), 0, 0, VERT ? 96 : 88, { fill: hu >= 0 ? C.lime : C.cream }); x.restore();
      x.restore();
    }
    // heat: thermometer slides in, column and number rise, the bump label lands on a collision
    if (t > TL.thermo) {
      // vertical: slides in from the left at the bottom, the big reading beside it. horizontal: slides in at the right edge, the reading above it
      const tx = lerp(VERT ? -160 : 1460, VERT ? 170 : 1150, back(seg(t, TL.thermo, TL.thermo + 0.5), 1.3));
      thermo(x, tx, VERT ? 1140 : 590, VERT ? 190 : 330, lerp(0.08, 0.9, eio(seg(t, TL.temp[0], TL.temp[1]))));
      letters(x, tempAt(t) + '°C', VERT ? tx + 270 : tx, VERT ? 1040 : 196, VERT ? 124 : 64, { fill: t > TL.temp[1] ? C.salmon : C.cream });
    }
    callout(x, t, TL.bumpLbl, 'bumping = heat', VERT ? [465, 884] : [610, 618], VERT ? [(P[6][0] + P[7][0]) / 2, (P[6][1] + P[7][1]) / 2 + 30] : [(P[5][0] + P[6][0]) / 2, (P[5][1] + P[6][1]) / 2 + 26], { bg: '#ffd6a0' });
  }

  // ---- scene C: hard cut back to the kitchen on the beep. The adult holds the hot mug, the kid points; the takeaway holds.
  function exEnd(x, W, H_, t) {
    const T = twos(t), c = VERT ? { x: 625, y: 270, s: 0.81 + 0.02 * seg(t, TL.cut, TL.D) } : { x: 640, y: 272, s: 1.06 + 0.03 * seg(t, TL.cut, TL.D) }; // lower than the wide shot: the cabinets fill the top for the takeaway
    x.save(); camApply(x, c);
    kitchen(x);
    const blinkOn = Math.floor((t - TL.cut) * 2.5) % 2 === 0, got = T >= TL.cut + 0.25, HOLD = VERT ? [ADULT[0] - 228, 518] : [850, 500];
    microwave(x, MW[0], MW[1], { on: 0, display: blinkOn ? '0:00' : '' });
    person(x, KID[0], KID[1], PSC, CAST.pip, { t, ph: 0.4, weight: -1, dir: 0.8, look: [0.9, 0.15], wide: true, brows: got ? 1 : 0, mouth: got ? 'open' : 'flat', arms: got ? [null, [1.45, 2.05]] : null, hands: got ? ['relax', 'point'] : null });
    person(x, ADULT[0], ADULT[1], PSC, CAST.ravi, { t, ph: 1.7, weight: 1, dir: -0.6, look: [-0.5, 0.55], mouth: got ? 'grin' : 'flat', reach: [toP(ADULT, HOLD), null], elbow: [-1, 1], hands: ['grip', 'relax'] });
    mug(x, HOLD[0] - 24, HOLD[1] - 4, 30, { t, band: C.salmon, steam: eo(seg(T, TL.cut, TL.cut + 0.5)) });
    x.restore();
    const l1 = back(seg(t, TL.line1, TL.line1 + 0.4), 1.8), l2 = back(seg(t, TL.line2, TL.line2 + 0.4), 1.8);
    if (l1 > 0) { x.save(); x.translate(FW / 2, (VERT ? 146 : 112) + (1 - l1) * 30); x.scale(l1, l1); letters(x, 'Microwaves shake water.', 0, 0, VERT ? 48 : 50); x.restore(); }
    const au = eio(seg(t, TL.line2 + 0.15, TL.line2 + 0.45)); // the arrow is the style's own flat arrow, drawing on after the words land
    if (l2 > 0 && VERT) { // "Shaking water", an arrow down, "HEAT": stacked for the vertical frame
      x.save(); x.translate(FW / 2, 236 + (1 - l2) * 30); x.scale(l2, l2);
      letters(x, 'Shaking water', 0, 0, 78, { fill: C.lime });
      arrow(x, [[0, 52], [0, 118]], au, { w: 24, fill: C.cream });
      letters(x, 'HEAT', 0, 188, 118, { fill: C.salmon });
      x.restore();
    } else if (l2 > 0) { // "Shaking water -> HEAT" on one line for the horizontal frame
      const a = 'Shaking water', b = 'HEAT', px = 70, wa = lettersWidth(x, a, px), wb = lettersWidth(x, b, px), gap = 140, x0 = -(wa + gap + wb) / 2;
      x.save(); x.translate(FW / 2, 192 + (1 - l2) * 30); x.scale(l2, l2);
      letters(x, a, x0, 0, px, { fill: C.lime, align: 'left' });
      arrow(x, [[x0 + wa + 22, 4], [x0 + wa + gap - 22, 4]], au, { w: 22, fill: C.cream });
      letters(x, b, x0 + wa + gap, 0, px, { fill: C.salmon, align: 'left' });
      x.restore();
    }
  }

  // ================= STILL (hero frame) =================
  function scene(x, W, H_, t, build) {
    const B = (a, b) => (build ? seg(t, a, b) : 1);
    const zk = build ? eo(seg(t, 0, 5)) : 1, c = VERT ? { x: 625, y: 440, s: 0.8 + 0.03 * zk } : { x: 668, y: 352, s: 1.1 + 0.04 * zk };
    const hk = VERT ? KID : [KID[0] + 80, KID[1]], ha = VERT ? ADULT : [ADULT[0] - 10, ADULT[1]];
    x.save(); camApply(x, c);
    kitchen(x);
    microwave(x, MW[0], MW[1], { on: 1, xray: B(1.2, 1.7), display: '0:07', inner: () => mug(x, 152, 135, 36) });
    glow(x, MUG[0], MUG[1] - 20, 210, C.lamp, 0.22);
    arrow(x, WAVE, eio(B(1.9, 2.6)), { w: 13, fill: C.lime, wave: { a: 6, k: 0.19, ph: t * 16 } });
    person(x, hk[0], hk[1], PSC, CAST.pip, { t, ph: 0.4, weight: -1, dir: 0.8, look: [0.95, -0.1], wide: true, mouth: 'open', brows: 1 });
    person(x, ha[0], ha[1], PSC, CAST.ravi, { t, ph: 1.7, weight: 1, dir: -0.7, look: [-0.9, 0.2], mouth: 'smile', reach: [toP(ha, VERT ? [MW[0] + 400, MW[1] + 150] : [MW[0] + 440, MW[1] + 120]), null], elbow: [-1, 1], hands: ['point', 'relax'] });
    x.restore();
    callout(x, t, 2.4, 'magnetron', VERT ? [470, 800] : [800, 640], toS(c, [MAG[0] + 4, MAG[1] + 30]), { tilt: 0.02 });
    callout(x, t, 2.8, 'microwaves', VERT ? [330, 380] : [560, 150], toS(c, [WAVE[30][0], WAVE[30][1] + 4]), { tilt: -0.02, bg: C.limeHi });
    const words = [['Kitchen', C.cream], ['Physics', C.lime]];
    words.forEach(([w, col], i) => { const u = back(B(0.2 + i * 0.18, 0.55 + i * 0.18), 1.8); if (u > 0) { x.save(); x.translate(40, (VERT ? 96 + i * 92 : 70 + i * 70) + (1 - u) * 30); x.scale(u, u); letters(x, w, 0, 0, VERT ? 88 : 66, { fill: col, align: 'left' }); x.restore(); } });
    sign(x, VERT ? 124 : 110, VERT ? 262 : 188, 'EPISODE 7', VERT ? 30 : 26, { u: B(0.9, 0.9 + LAND), bg: C.salmon, fg: C.cream, tilt: -0.03 });
  }

  registerStyle({
    id: 'sci-fi-sitcom-thinline',
    name: 'Sci-Fi Sitcom Thin Line',
    category: 'TV Cartoon Looks',
    description: 'Flat TV vector cartoon in the adult sci-fi sitcom manner: one thin, even, near-black ink line on everything, flat fills with no cel shadows, darker side planes for depth, big-headed tube-limbed people with huge touching white eyes and tiny scribble pupils framed large in a vertical 9:16 or horizontal 16:9 frame, pale thin-lined domestic sets with speckled shadow planes, rounded bold lettering, soft glow only from lamps and screens.',
    motion: 'Characters and props animate on twos (12 drawings a second) and move pose to pose with snappy overshoot pops, two-drawing blinks and jittery shakes; camera trucks and the iris wipe run smooth on ones; signs drop in, squash on contact and spring back.',
    fonts: ['700 64px "Fredoka"', '600 30px "Fredoka"'],
    duration: 5,
    frameT: 4.6,
    readsPixels: false,
    draw(ctx, W, H_, t) { scene(ctx, W, H_, t, true); finish(ctx, W, H_, t); },

    explainerDuration: TL.D,
    explainerNote: VERT
      ? 'A sitcom kitchen in a vertical 9:16 frame under one 2D camera, with two people in a full-figure two-shot either side of the microwave: the stacked hook title shrinks into a corner sign, the adult presses start, the camera trucks in on the microwave, its control panel lifts off to show the magnetron, and a lime squiggle arrow carries the microwaves to a mug of coffee; a coffee-coloured iris opens on the mug and grows over the frame into the molecule world, where water molecules turn to follow a flipping field arrow while 2,450,000,000 slams in below them; the molecules jostle, the coffee warms and a thermometer with a big reading climbs at the bottom, and a hard cut on the beep lands back in the kitchen, the adult holding the steaming mug under the stacked takeaway.'
      : 'A sitcom kitchen under one 2D camera with two people in a waist-up two-shot: the hook title shrinks into a corner sign, the adult presses start, the camera trucks in on the microwave, its control panel lifts off to show the magnetron, and a lime squiggle arrow carries the microwaves to a mug of coffee; a coffee-coloured iris opens on the mug and grows over the frame into the molecule world, where water molecules turn to follow a flipping field arrow while 2,450,000,000 slams in; the molecules jostle, the coffee warms, and a hard cut on the beep lands back in the kitchen, the adult holding the steaming mug under the takeaway.',
    explainer(ctx, W, H_, t) {
      const x = ctx;
      // impact shake after the key number, stepped on twos like the drawings
      const hu = t - TL.hit, sk = hu >= 0 && hu < 0.6 ? 16 * Math.exp(-hu * 6) : 0;
      x.save();
      if (sk > 0) { const T = twos(t), z = 1 + sk / 160; x.translate(FW / 2, FH / 2); x.scale(z, z); x.translate(-FW / 2 + NZ.n2(T * 40, 3) * sk * 1.6, -FH / 2 + NZ.n2(T * 40, 9) * sk * 1.6); } // zoom covers the edges
      if (t < TL.dive[0]) exKitchen(x, W, H_, t);
      else if (t < TL.dive[2]) {
        exKitchen(x, W, H_, t);
        const c = kcam(t), mp = toS(c, MUG), u0 = seg(t, TL.dive[0], TL.dive[1]), u1 = Math.pow(seg(t, TL.dive[1], TL.dive[2]), 2.2);
        iris(x, mp[0], mp[1] - 6, 66 * back(u0, 1.6) + (VERT ? 1600 : 1500) * u1, t, { fill: H.rgba(H.mix(C.brown, C.coffee, 0.3)), see: eo(seg(t, TL.dive[1] - 0.12, TL.dive[1] + 0.2)), inside: () => exMol(x, W, H_, t) });
      } else if (t < TL.cut) exMol(x, W, H_, t);
      else exEnd(x, W, H_, t);
      x.restore();
      if (t > TL.shrink[1]) header(x, 1);
      finish(x, W, H_, t);
    },

    explainerSound(k) {
      // Cartoon-show foley over a sci-fi undertone: spring boings for pops, wood-block clunks for signs landing, slide
      // whistles for moves, electric zaps for field flips, gloopy bloops in the coffee, a warbling iris, a microwave hum
      // and its beeps, a theremin for the strange part. All times come from TL / FLIPS / BONKS above.
      const D = TL.D, hz = k.hz;
      const up2 = (te) => Math.ceil(te * 12 - 1e-6) / 12;       // drawn motion is on twos: a pose shows on the next 1/12 s step
      const touch = (t0) => t0 + LAND * CONTACT;                 // a sign touches down
      const pan = (px, hx = px) => cl(((VERT ? px : hx) / FW) * 2 - 1, -1, 1) * 0.6;  // where the thing is on screen: its x in the vertical layout, then in the horizontal one
      const when = (t0, t1, ease, u) => { for (let i = 0; i <= 400; i++) { const tt = t0 + ((t1 - t0) * i) / 400; if (ease(i / 400) >= u - 1e-6) return tt; } return t1; };
      const peak = (t0, t1, s) => when(t0, t1, (u) => back(u, s), 1); // when an overshoot pop first reaches full size
      const vib = (f0, f1, dur, depth, rate) => { const a = []; for (let s = 0; s <= dur + 1e-6; s += 1 / (rate * 6)) a.push([Math.min(s, dur), lerp(f0, f1, s / dur) * (1 + depth * Math.sin(s * rate * TAU))]); return a; };
      // spring boing: a triangle that bounces in pitch
      const boing = (t, f0, g = 1, p = 0, minor = false) => { k.tone(t, { f: [[0, f0 * 0.7], [0.04, f0 * 1.5], [0.09, f0 * 1.05], [0.14, f0 * 1.35], [0.2, f0 * 1.12], [0.3, f0 * 1.25]], type: 'triangle', dur: 0.34, gain: 0.15 * g, a: 0.004, pan: p, minor }); k.tone(t, { f: f0 * 2, dur: 0.05, gain: 0.05 * g, pan: p, minor }); };
      // wood-block clunk: a sign hitting the set
      const clunk = (t, g = 1, p = 0) => { k.play('tock', t, { f: 360, gain: 0.6 * g, pan: p }); k.tone(t, { f: [[0, 170], [0.08, 90]], dur: 0.12, gain: 0.2 * g, pan: p }); };
      // slide whistle with a little vibrato
      const slide = (t, f0, f1, dur, g = 1, p = 0) => k.tone(t, { f: vib(f0, f1, dur, 0.012, 7), dur, gain: 0.08 * g, a: 0.03, hold: dur * 0.7, pan: p, verb: 0.15 });
      // electric zap: falling sawtooth through a band, plus crackle
      const zap = (t, g = 1, p = 0, minor = true) => { k.tone(t, { f: [[0, 1500], [0.09, 240]], type: 'sawtooth', dur: 0.11, gain: 0.07 * g, filter: 'bandpass', f2: 1700, q: 1.4, pan: p, minor }); k.noise(t, { dur: 0.07, filter: 'highpass', f: 3800, gain: 0.08 * g, pan: p, minor }); };
      const bloop = (t, g = 1, p = 0, f = 300) => k.tone(t, { f: [[0, f], [0.06, f * 3]], dur: 0.09, gain: 0.11 * g, a: 0.003, pan: p, minor: true });
      const bonk = (t, g = 1, p = 0) => { k.tone(t, { f: [[0, 760], [0.12, 190]], type: 'triangle', dur: 0.16, gain: 0.2 * g, pan: p }); k.play('tock', t, { f: 540, gain: 0.35 * g, pan: p }); };
      const theremin = (t, n, dur, g = 1, p = 0) => k.tone(t, { f: vib(hz(n), hz(n), dur, 0.018, 5.5), dur, gain: 0.05 * g, a: Math.min(0.25, dur * 0.3), hold: dur * 0.45, pan: p, verb: 0.35, bus: 'music' });
      const chord = (t, notes, g = 1, dur = 2) => notes.forEach((n, i) => { k.tone(t + i * 0.015, { f: vib(hz(n), hz(n), dur, 0.006, 5), type: 'triangle', dur, gain: 0.06 * g, a: 0.03, verb: 0.35, filter: 'lowpass', f2: 1900, pan: (i / (notes.length - 1) - 0.5) * 0.6, bus: 'music' }); k.tone(t + i * 0.015, { f: hz(n) * 1.003, dur, gain: 0.04 * g, a: 0.04, verb: 0.3, bus: 'music' }); });

      // ---- beds: room tone in the kitchen, the microwave hum while it runs, a low liquid drone in the coffee
      k.bed('room', 0, TL.dive[1], { gain: 0.8 });
      k.bed('room', TL.cut, D, { gain: 0.8 });
      k.bed('hum', TL.on, TL.dive[2], { gain: 1.1 });
      k.noise(TL.on, { dur: TL.dive[2] - TL.on, filter: 'bandpass', f: 240, q: 3, gain: 0.03, a: 0.1, hold: TL.dive[2] - TL.on - 0.4, bus: 'amb' }); // fan whirr
      k.noise(TL.dive[1], { dur: TL.cut - TL.dive[1], color: 'brown', filter: 'lowpass', f: 380, gain: 0.12, a: 0.5, hold: TL.cut - TL.dive[1] - 0.8, bus: 'amb' });
      k.tone(TL.dive[2], { f: vib(55, 55, TL.cut - TL.dive[2], 0.02, 0.7), dur: TL.cut - TL.dive[2], gain: 0.06, a: 0.4, hold: TL.cut - TL.dive[2] - 0.6, bus: 'amb' });
      BUBBLES.forEach((b, i) => { if (i % 3 === 0 && b.t0 > TL.dive[2] && b.t0 < TL.cut - 0.3) bloop(up2(b.t0 + 0.4), 0.5, pan(b.x), 260 + (i % 5) * 40); });

      // ---- 1 HOOK: title words boing on, the microwave starts, the title slides into the corner
      ['How', 'does', 'a', 'microwave', 'heat', 'food?'].forEach((w, i) => boing(peak(TL.title + i * 0.11, TL.title + i * 0.11 + 0.34, 1.8), [330, 370, 415, 440, 520, 590][i], i < 4 ? 0.7 : 1, (i % 3 - 1) * 0.2, i < 4));
      k.play('click', TL.on, { gain: 0.8, pan: pan(468, 765) }); k.play('blip', TL.on + 0.06, { f: 'A5', dur: 0.12, gain: 0.8, pan: pan(440, 700) });
      k.play('thud', TL.on + 0.05, { f: 80, gain: 0.25 });
      slide(TL.shrink[0], 900, 380, TL.shrink[1] - TL.shrink[0], 0.8, -0.4);
      clunk(touch(TL.shrink[1] - 0.2), 0.7, -0.5);

      // ---- 2 HOW IT WORKS: truck in, panel lifts off, magnetron label, waves squiggle across to the mug
      k.play('whoosh', TL.push[0], { dur: TL.push[1] - TL.push[0], top: 1400, gain: 0.45 });
      slide(TL.xray[0], 420, 1300, TL.xray[1] - TL.xray[0], 0.9, pan(590, 1000));
      k.play('swish', TL.xray[0] + 0.1, { dur: 0.3, gain: 0.6, pan: pan(590, 1000) });
      clunk(touch(TL.magLbl), 1, pan(520, 1092));
      const wd = TL.wave[1] - TL.wave[0];
      k.tone(TL.wave[0], { f: vib(500, 950, wd, 0.09, 13), dur: wd + 0.1, gain: 0.07, a: 0.05, hold: wd * 0.8, pan: 0.1 });
      k.play('neon', TL.wave[0], { dur: wd, gain: 0.4, pan: pan(450, 900) });
      k.tone(TL.wave[1], { f: vib(700, 700, TL.dive[0] - TL.wave[1], 0.09, 13), dur: TL.dive[0] - TL.wave[1] + 0.1, gain: 0.025, a: 0.05, hold: 0.1, minor: true }); // waves keep humming
      clunk(touch(TL.waveLbl), 1, pan(270, 700));
      boing(up2(TL.react), 640, 0.8, pan(300, 552)); // the waves land on the mug

      // ---- transition: the iris opens on the mug, then takes the frame
      const pd = TL.dive[2] - TL.dive[0];
      k.tone(TL.dive[0], { f: vib(110, 150, pd, 0.06, 7), type: 'sawtooth', dur: pd, gain: 0.07, a: pd * 0.4, filter: 'lowpass', f2: [[0, 300], [pd, 2600]], q: 4 });
      k.tone(TL.dive[0], { f: vib(165, 220, pd, 0.05, 5), type: 'square', dur: pd, gain: 0.025, a: pd * 0.5, filter: 'lowpass', f2: 900 });
      k.noise(TL.dive[0], { dur: pd, color: 'pink', filter: 'bandpass', f: [[0, 300], [pd * 0.85, 3200], [pd, 1400]], q: 2, gain: 0.18, a: pd * 0.75, verb: 0.3 });
      const po = peak(TL.dive[0], TL.dive[1], 1.6);
      for (let i = 0; i < 4; i++) bloop(po + i * 0.04, 0.8, i % 2 ? 0.2 : -0.2, 240 + i * 60);
      k.noise(po, { dur: 0.25, color: 'brown', filter: 'lowpass', f: 600, gain: 0.25 });
      k.play('whoosh', TL.dive[1], { dur: TL.dive[2] - TL.dive[1] + 0.1, top: 3000, gain: 0.8 });
      k.play('thud', TL.dive[2], { f: 70, gain: 0.3 });

      // ---- 3 THE MOLECULE WORLD: molecules boing in, the field arrow zaps on, labels clunk down, the field flips
      MOLS.forEach((m, i) => { if (i % 2 === 0) boing(up2(peak(TL.mols + i * 0.05, TL.mols + i * 0.05 + 0.3, 1.8)), 500 + i * 35, 0.7, pan(m.x), true); });
      const fd = TL.field[1] - TL.field[0];
      k.tone(TL.field[0], { f: [[0, 200], [fd, 900]], type: 'sawtooth', dur: fd + 0.05, gain: 0.05, a: fd * 0.8, filter: 'bandpass', f2: [[0, 600], [fd, 2400]], q: 2 });
      zap(TL.field[1], 1, 0, false);
      clunk(touch(TL.fieldLbl), 1, pan(500, 820));
      k.play('swish', up2(TL.align), { dur: 0.25, gain: 0.5 }); boing(up2(TL.align) + 0.08, 300, 0.6, 0, true);
      clunk(touch(TL.molLbl), 1, pan(196, 160));
      theremin(6.2, 'A4', 0.7, 1, -0.2); theremin(6.95, 'C5', 0.5, 1, 0); theremin(7.5, 'E5', 0.55, 1, 0.2); theremin(8.05, 'D#5', 0.4, 1, 0.1);
      FLIPS.forEach((tf, i) => { const fast = tf > TL.heat[0]; zap(tf, fast ? 0.45 + 0.3 * seg(tf, TL.heat[0], TL.heat[1]) : 0.9, (i % 2 ? 0.3 : -0.3)); });
      // counter ticks: speed up, never more than 12 a second, kept clear of the flip zaps
      for (let tt = TL.count[0] + 0.08; tt < TL.count[1] - 0.05;) { const u = seg(tt, TL.count[0], TL.count[1]); if (!FLIPS.some((f) => Math.abs(f - tt) < 0.04)) k.play('count', tt, { f: 4200 + 1400 * u, gain: 0.6 + 0.3 * u, minor: true }); tt += Math.max(1 / 12, 0.2 - 0.14 * u); }
      k.noise(TL.hit - 0.6, { dur: 0.62, color: 'pink', filter: 'bandpass', f: [[0, 300], [0.6, 2600]], q: 1, gain: 0.2, a: 0.58, verb: 0.2 });
      // 2,450,000,000: the biggest hit
      k.play('stamp', TL.hit, { gain: 1.3 }); k.play('impact', TL.hit, { gain: 1.0 });
      boing(TL.hit + 0.02, 160, 1.2, 0, false);
      chord(TL.hit + 0.05, ['A3', 'E4', 'A4', 'C#5'], 1.1, 1.6);
      clunk(touch(TL.perSec), 0.9, 0);

      // ---- 4 HEAT: the counter drops away, the thermometer slides in, molecules bonk, the column rises
      slide(TL.heat[0], 600, 250, 0.4, 0.6, 0);
      slide(TL.thermo, 300, 900, 0.45, 0.9, pan(170, 1150));
      k.play('thud', up2(peak(TL.thermo, TL.thermo + 0.5, 1.3)), { f: 120, gain: 0.25, pan: pan(170, 1150) });
      const td = TL.temp[1] - TL.temp[0];
      k.tone(TL.temp[0], { f: vib(320, 1100, td, 0.01, 6), dur: td, gain: 0.05, a: 0.2, hold: td - 0.3, pan: pan(170, 1150) }); // rising kettle tone
      k.noise(TL.heat[0], { dur: TL.cut - TL.heat[0], filter: 'highpass', f: [[0, 6000], [TL.cut - TL.heat[0], 3000]], gain: 0.018, a: TL.cut - TL.heat[0] - 0.1, bus: 'amb' }); // sizzle builds
      BONKS.forEach(([tb, a, b]) => bonk(up2(tb), 0.9, pan((MOLS[a].x + MOLS[b].x) / 2)));
      clunk(touch(TL.bumpLbl), 1, pan(465, 610));
      k.play('riser', TL.cut - 0.75, { dur: 0.75, gain: 0.6 });

      // ---- 5 CUT TO THE KITCHEN: the microwave beeps, the mug steams in the adult's hand, the takeaway resolves
      [0, 0.22, 0.44].forEach((d) => k.play('blip', TL.cut + d, { f: 'E6', dur: 0.14, gain: 0.55, pan: pan(350, 500) }));
      k.noise(TL.cut + 0.05, { dur: 1.6, filter: 'highpass', f: 2500, gain: 0.03, a: 0.4, pan: pan(450, 930) }); // steam hiss
      boing(up2(TL.cut + 0.25), 520, 0.9, pan(450, 930));
      boing(peak(TL.line1, TL.line1 + 0.4, 1.8), 440, 0.8, 0);
      const l2 = peak(TL.line2, TL.line2 + 0.4, 1.8);
      chord(l2, ['C3', 'G3', 'C4', 'E4', 'G4', 'D5'], 0.85, 2.0);
      k.play('ding', l2, { f: 'C6', gain: 0.6 });
      boing(l2, 392, 0.9, 0);
    },
  });
}
