{
  // ---------- Sci-fi sitcom cartoon: TV cel animation. Flat fills, wobbly warm-black ink outlines, one hard cel shadow per
  // prop and creature, big white eyes with irregular blob pupils, thin-lined flat-colour people (the people build sets
  // their body and face), lime sci-fi glow and a swirl portal; characters and props animate on twos ----------
  const TAU = Math.PI * 2;
  const cl = H.clamp, lerp = H.lerp;
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const eo = H.ease.out, eio = H.ease.inOut, ei = H.ease.in;
  const back = (u, s = 1.4) => { if (u <= 0) return 0; if (u >= 1) return 1; return 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
  // limited animation: characters and props hold each drawing for two frames (12 drawings a second).
  // Camera moves, the portal wipe and on-screen type run on ones (every frame), like a TV show's compositing.
  const twos = (t) => Math.floor(t * 12 + 1e-6) / 12;
  const TFONT = '"Luckiest Guy", "Fredoka", sans-serif', LFONT = '"Fredoka", sans-serif';
  const LW = 3; // ink line width for props and characters at 1280x720; set pieces use 2.2, small details 1.6
  const NZ = H.makeNoise(1717);

  const C = {
    ink: '#251d1a', shadow: '#3a2d4c', cream: '#fff3d1', paper: '#fbf6e6',
    wall: '#a7b67a', wall2: '#9dad70', wallSh: '#8a9a61',
    wood: '#d8b474', woodDk: '#9a7350', knob: '#e59f6e',
    tile: '#e2e6dd', counter: '#eceee7', edge: '#c3c7be',
    metal: '#aab0b2', metalDk: '#6d7477', screen: '#1f2b2b', digit: '#8af2dc', copper: '#cf8a58',
    lime: '#b8ec4f', limeDk: '#4fa83a', limeHi: '#e6ffb0', glow: '#c9ff6a',
    salmon: '#ec6f55', mug: '#e9785f', coffee: '#6b3f27', lamp: '#f6eaa4', star: '#f6e05a',
    oxy: '#e25b47', hyd: '#f4efe3', brown: '#6f4631', brown2: '#7d5239', hot: '#b84a2c', hot2: '#cf6236',
    pot: '#c7744d', leaf: '#7fb24a',
  };
  const dark = (c, k = 0.3) => H.rgba(H.mix(c, C.shadow, k));   // the one cel-shadow tone of a fill
  const lite = (c, k = 0.45) => H.rgba(H.mix(c, '#fffbea', k));  // hard highlight tone

  // ---------- timeline of the explainer (shared with explainerSound) ----------
  const TL = {
    title: 0.15, shrink: [1.7, 2.25], on: 0.9,
    push: [2.0, 3.2], xray: [2.9, 3.4], magLbl: 3.3, wave: [3.5, 4.2], waveLbl: 3.9, react: 4.25,
    portal: [4.45, 4.9, 5.45],          // opens on the mug, holds a beat, then swallows the frame
    mols: 5.5, field: [5.6, 6.05], fieldLbl: 6.05, align: 6.15, molLbl: 6.4,
    count: [6.7, 8.45], hit: 8.45, perSec: 8.7,
    heat: [9.05, 10.85], thermo: 9.1, temp: [9.35, 10.7], bumpLbl: 9.8,
    cut: 11.0, line1: 11.45, line2: 11.95, D: 14,
  };
  // the field flips: slowly while the counter runs, then faster and faster (never more than 12 a second)
  const FLIPS = (() => { const a = [6.75, 7.25, 7.7, 8.1, 8.45]; let s = 8.8, d = 0.3; while (s < TL.heat[1]) { a.push(+s.toFixed(3)); s += d; d = Math.max(1 / 11.5, d * 0.86); } return a; })();
  // molecules that bump into each other while the coffee heats: [time, a, b]
  const BONKS = [[9.45, 1, 2], [9.75, 5, 6], [10.0, 0, 4], [10.22, 2, 6], [10.45, 4, 5], [10.65, 3, 7]];
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
  // push every point along its normal by smooth seeded noise, so no edge is ruler-straight or compass-round.
  // Closed shapes sample the noise around a circle, so the wobble meets itself without a seam.
  function wob(pts, closed, seed, amp = 1) {
    const P = resample(pts, closed, 5), n = P.length, S = [0];
    for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = S[n - 1] + (closed ? Math.hypot(P[0][0] - P[n - 1][0], P[0][1] - P[n - 1][1]) : 0), rad = (tot * 0.021) / TAU, out = [];
    for (let i = 0; i < n; i++) {
      const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, th = (S[i] / tot) * TAU;
      const nv = closed ? NZ.n3(Math.cos(th) * rad + seed, Math.sin(th) * rad, seed * 0.37) : NZ.n2(S[i] * 0.021 + seed, seed * 0.37);
      out.push([P[i][0] + (nx / l) * nv * 2.4 * amp, P[i][1] + (ny / l) * nv * 2.4 * amp]);
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
  // cel(): the core cartoon shape. Flat fill, then ONE hard cel shadow (the part of the shape not covered by itself shifted
  // toward the light: shade [-dx,-dy] = light from the upper left), optional clipped inner detail, then the ink outline on top.
  function cel(x, S, fill, o = {}) {
    if (fill) { x.fillStyle = fill; x.fill(S.path); }
    if (o.shade) {
      x.save(); x.clip(S.path);
      const p = new Path2D(); p.rect(-1e4, -1e4, 2e4, 2e4); p.addPath(S.path, new DOMMatrix([1, 0, 0, 1, o.shade[0], o.shade[1]]));
      x.fillStyle = o.shadeCol || dark(fill); x.fill(p, 'evenodd'); x.restore();
    }
    if (o.inner) { x.save(); x.clip(S.path); o.inner(); x.restore(); }
    if (o.lw !== 0) { x.lineWidth = o.lw || LW; x.strokeStyle = o.ink || C.ink; x.lineJoin = 'round'; x.stroke(S.path); }
  }
  // union(): several shapes read as one drawing: ink all outlines at double width, then fill them all (the inner lines vanish)
  function union(x, list, lw = LW) {
    x.save(); x.lineJoin = 'round'; x.strokeStyle = C.ink; x.lineWidth = lw * 2;
    list.forEach(([S]) => x.stroke(S.path));
    list.forEach(([S, fill, o]) => cel(x, S, fill, Object.assign({ lw: 0 }, o)));
    x.restore();
  }
  // a set of wobbly open ink lines, cached (tile grout, panel seams, cracks)
  function inkLines(x, key, segs, lw = 1.6, a = 1) {
    let p = SHAPES.get('L' + key);
    if (!p) { p = new Path2D(); segs.forEach((s, k) => wob(s, false, k * 7 + key.length, 0.5).forEach(([u, v], i) => (i ? p.lineTo(u, v) : p.moveTo(u, v)))); SHAPES.set('L' + key, p); }
    x.save(); x.globalAlpha *= a; x.lineWidth = lw; x.strokeStyle = C.ink; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(p); x.restore();
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
  // tapered brush line (folds, wires, swirl arms, motion lines): thin at both ends, drawn on to prog
  function line(x, P, w, o = {}) {
    const prog = o.prog == null ? 1 : o.prog; if (prog <= 0) return;
    const Q = cutTo(P, prog); if (Q.length < 2) return;
    x.fillStyle = o.col || C.ink; x.fill(ribbon(Q, (u) => (w / 2) * Math.min(1, 0.12 + Math.sin(Math.PI * u) * 1.8)));
  }
  // soft additive glow: only for sci-fi light (lamp, screen, portal); everything else stays flat
  function glow(x, cx, cy, r, col, a) {
    if (a <= 0 || r <= 0) return;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, H.rgba(col, a)); g.addColorStop(0.4, H.rgba(col, a * 0.35)); g.addColorStop(1, H.rgba(col, 0));
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.restore();
  }

  // ---------- arrows ----------
  // inked cartoon arrow along any polyline: flat fill, chunky head, ONE ink outline around body + head (union), a hard
  // highlight stripe, drawn on to prog. o.wave = { a, k, ph } turns the body into a squiggle (radio waves, energy).
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
    x.save(); x.globalAlpha *= o.a == null ? 1 : o.a; x.lineJoin = 'round'; x.strokeStyle = C.ink; x.lineWidth = lw * 2;
    if (body) x.stroke(body); x.stroke(head);
    x.fillStyle = fill; if (body) x.fill(body); x.fill(head);
    if (o.hi !== false && B.length > 3) { const N = normals(B); line(x, B.map((p, i) => [p[0] - N[i][0] * w * 0.2, p[1] - N[i][1] * w * 0.2]), w * 0.17, { col: lite(fill, 0.6) }); }
    x.restore();
  }

  // ---------- type ----------
  const CW = new Map();
  const cw = (x, ch) => { const k = x.font + ch; let v = CW.get(k); if (v == null) { v = x.measureText(ch).width; CW.set(k, v); } return v; };
  function lettersWidth(x, s, px) { x.save(); x.font = `${px}px ${TFONT}`; let w = 0; for (const ch of s) w += cw(x, ch) + px * 0.02; x.restore(); return w - px * 0.02; }
  // hand-lettered display type: chunky cartoon face, thick ink outline, hard offset ink shadow, every letter slightly
  // tilted and bounced off the baseline (seeded by the string, so it never jitters). o.fill or o.colors[i] per letter.
  function letters(x, s, cx, cy, px, o = {}) {
    x.save(); x.font = `${px}px ${TFONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const r = H.rng('lt' + s), chars = [...s], sp = px * 0.02;
    const tot = lettersWidth(x, s, px);
    let xx = o.align === 'left' ? cx : o.align === 'right' ? cx - tot : cx - tot / 2;
    const L = chars.map((ch, i) => { const w = cw(x, ch), l = { ch, x: xx + w / 2, rot: r.range(-0.06, 0.06), dy: r.range(-0.035, 0.035) * px, col: (o.colors && o.colors[i]) || o.fill || C.cream }; xx += w + sp; return l; });
    x.globalAlpha *= o.a == null ? 1 : o.a; x.lineJoin = 'round'; x.strokeStyle = C.ink; x.lineWidth = Math.max(3, px * 0.15);
    const pass = (dx, dy, fn) => L.forEach((l) => { if (l.ch === ' ') return; x.save(); x.translate(l.x + dx, cy + l.dy + dy); x.rotate(l.rot); fn(l); x.restore(); });
    x.fillStyle = C.ink; pass(px * 0.045, px * 0.075, (l) => { x.strokeText(l.ch, 0, 0); x.fillText(l.ch, 0, 0); }); // hard shadow
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
  // label sign: cream card, ink outline, one cel shadow, flat cast shadow, a slight tilt. Lands on what it labels.
  function sign(x, cx, cy, s, px, o = {}) {
    const u = o.u == null ? 1 : o.u, a = o.a == null ? 1 : o.a; if (u <= 0 || a <= 0) return;
    const L = land(u);
    x.save(); x.font = `600 ${px}px ${LFONT}`;
    const w = Math.round(x.measureText(s).width + px * 1.1), h = Math.round(px * 1.62), S = RR(-w / 2, -h / 2, w, h, 7);
    x.translate(cx, cy + L.dy + h / 2); x.rotate(o.tilt || 0); x.scale(L.sx, L.sy); x.translate(0, -h / 2); x.globalAlpha *= L.a * a;
    x.save(); x.translate(5, 6); x.fillStyle = 'rgba(37,29,26,0.3)'; x.fill(S.path); x.restore();
    cel(x, S, o.bg || C.cream, { shade: [-4, -5], lw: 3 });
    x.fillStyle = o.fg || C.ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 0, px * 0.06);
    x.restore();
  }
  // leader from a sign to its target: a slightly bowed ink line drawn on, ending in a pin dot on the thing it names
  function leader(x, a, b, prog, al = 1) {
    if (prog <= 0 || al <= 0) return;
    const m = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.12, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.12];
    const P = []; for (let i = 0; i <= 20; i++) { const u = i / 20, v = 1 - u; P.push([v * v * a[0] + 2 * v * u * m[0] + u * u * b[0], v * v * a[1] + 2 * v * u * m[1] + u * u * b[1]]); }
    const Q = cutTo(P, prog);
    x.save(); x.globalAlpha *= al; x.strokeStyle = C.ink; x.lineWidth = 4; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); Q.forEach(([u, v], i) => (i ? x.lineTo(u, v) : x.moveTo(u, v))); x.stroke();
    if (prog >= 1) { x.fillStyle = C.cream; x.lineWidth = 3; x.beginPath(); x.arc(b[0], b[1], 7, 0, TAU); x.fill(); x.stroke(); }
    x.restore();
  }
  // a labelled callout: sign lands at time t0, then its leader draws down onto the target
  function callout(x, t, t0, text, at, target, o = {}) {
    const a = o.a == null ? 1 : o.a;
    leader(x, [at[0], at[1] + (o.px || 30) * 0.8], target, eo(seg(t, t0 + LAND * CONTACT, t0 + LAND * CONTACT + 0.22)), a);
    sign(x, at[0], at[1], text, o.px || 30, { u: seg(t, t0, t0 + LAND), a, bg: o.bg, tilt: o.tilt });
  }
  // cartoon impact star (emphasis, bumps): jagged ink-outlined burst
  function bang(x, cx, cy, rx, ry, k, o = {}) {
    if (k <= 0) return;
    const S = shape(`bang${rx},${ry},${o.n || 14}`, () => { const r = H.rng(rx + ry), n = o.n || 14, out = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, q = i % 2 ? 0.62 : r.range(0.92, 1.08); out.push([Math.cos(a) * rx * q, Math.sin(a) * ry * q]); } return out; }, true, 0.6);
    x.save(); x.translate(cx, cy); x.rotate(o.rot || 0); x.scale(k, k);
    cel(x, S, o.fill || C.star, { shade: [-rx * 0.06, -ry * 0.1], lw: o.lw || 3.4 });
    x.restore();
  }

  // ---------- eyes ----------
  // the show-style eye: big white disc, ink rim, small pupil that is an irregular ink blob with a slightly lumpy, uneven
  // edge (pupilPath, seeded per eye so it holds its shape; never a geometric dot); o.pr sets its size as a fraction of the
  // eye. Optional heavy lid in skin colour, a two-drawing blink, or closed happy arcs. Faces stay upright when bodies turn.
  function eye(x, cx, cy, r, o = {}) {
    x.save(); x.translate(cx, cy);
    if (o.happy) { x.lineCap = 'round'; x.strokeStyle = C.ink; x.lineWidth = Math.max(3, r * 0.17); x.beginPath(); x.arc(0, r * 0.42, r * 0.62, Math.PI * 1.18, Math.PI * 1.82); x.stroke(); x.restore(); return; }
    const R = Math.max(4, Math.round(r)), S = OV(0, 0, R, R);
    x.scale(r / R, (r / R) * (1 - 0.9 * (o.blink || 0)));
    cel(x, S, '#ffffff', { lw: Math.max(2.4, R * 0.1), inner: () => {
      const lk = o.look || [0, 0], pr = R * (o.pr || 0.2) * (o.wide ? 0.8 : 1);
      x.save(); x.translate(lk[0] * R * 0.5, lk[1] * R * 0.45); x.fillStyle = C.ink; x.fill(pupilPath(pr, o.seed == null ? (cx < 0 ? 1 : 2) : o.seed)); x.restore();
      if (o.lid) { const ly = -R + 2 * R * o.lid; x.fillStyle = o.skin || C.mug; x.fillRect(-R - 3, -R - 3, 2 * R + 6, ly + R + 3); x.strokeStyle = C.ink; x.lineWidth = Math.max(2.4, R * 0.1); x.beginPath(); x.moveTo(-R, ly); x.lineTo(R, ly); x.stroke(); }
    } });
    x.restore();
  }
  const blinkAt = (t, ph) => { const u = (twos(t) + ph) % 3.7; return u < 0.17 ? 1 : 0; }; // shut for two drawings
  // an irregular ink-blob pupil: lumpy, uneven edge from a few low waves plus noise, cached per size and seed
  const PUPILS = new Map();
  function pupilPath(pr, seed) {
    const key = pr.toFixed(2) + ':' + seed; let p = PUPILS.get(key);
    if (!p) {
      const r = H.rng('pupil' + seed), ph1 = r.range(0, TAU), ph2 = r.range(0, TAU), ph3 = r.range(0, TAU), rot = r.range(-0.6, 0.6), P = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU, k = 1 + 0.07 * Math.sin(2 * a + ph1) + 0.06 * Math.sin(4 * a + ph2) + 0.05 * Math.sin(7 * a + ph3) + 0.06 * NZ.n2(Math.cos(a) * 2 + seed, Math.sin(a) * 2 + seed * 0.3);
        const px = Math.cos(a) * pr * k, py = Math.sin(a) * pr * 1.12 * k;
        P.push([px * Math.cos(rot) - py * Math.sin(rot), px * Math.sin(rot) + py * Math.cos(rot)]);
      }
      p = toPath(chaikin([...P, P[0]], 2)); PUPILS.set(key, p);
    }
    return p;
  }

  // ---------- people ----------
  // Flat-colour characters (no cel shadow) with a thinner (PLW 2.2), slightly irregular ink line than the props. Every part
  // is a tapered or irregular outline rebuilt from a pose rig each drawing (on twos), never a uniform tube or a plain
  // circle; folds and small details are tapered brush lines. This kit is shared by every people build; the build after it
  // (PEOPLE_BUILD) sets the body, the face and PS, the scale that makes a person about 375 units from sole to hair top.
  // Draw with person(x, cx, feetY, PS * k, P, o); personArm(x, cx, feetY, s, P, side, o) redraws one arm over a prop.
  // o: { t, ph, dir (head turn -1..1), weight (-1|1: the leg that takes the weight), arms [[upper, fore] left, right]
  //      (radians from hanging down, + = outward; null = relaxed), hands ['relax'|'open'|'point'|'grip', ...],
  //      reach [leftHandTarget|null, rightHandTarget|null] (2-bone reach, elbows outward), armFront (side drawn later by
  //      personArm), legs, look, mouth, brows, lid, wide, shut, sweat }
  // Mouths: 'flat', 'smile', 'wavy' (nervous), 'grin' (too wide, flicked corners), 'grimace' (clenched teeth), 'open' (big
  // maroon mouth with separate cream teeth, cheek lines and a chin curve; the head drops its jaw).
  const PLW = 2.2;
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
  const wp = (P, seed, closed = true, amp = 0.3) => toPath(wob(P, closed, seed, amp), closed);
  // flat fill + thin wobbly ink; flatUnion inks several parts as one silhouette (no inner lines; touching parts keep a line)
  function flat(x, P, fill, seed, lw = PLW, amp = 0.3) { const p = wp(P, seed, true, amp); x.fillStyle = fill; x.fill(p); if (lw) { x.lineWidth = lw; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(p); } return p; }
  function flatUnion(x, list, lw = PLW) {
    const ps = list.map(([P, fill, seed, amp]) => [wp(P, seed, true, amp == null ? 0.3 : amp), fill]);
    x.save(); x.lineJoin = 'round'; x.strokeStyle = C.ink; x.lineWidth = lw * 2; ps.forEach(([p]) => x.stroke(p)); ps.forEach(([p, f]) => { x.fillStyle = f; x.fill(p); }); x.restore();
  }
  const fold = (x, P, w = 2.5) => line(x, chaikin(P, 2), w); // tapered brush fold / detail line

  function spineX(R, y) {
    const s = R.spine; if (y >= s[0][1]) return s[0][0];
    for (let i = 1; i < s.length; i++) if (y >= s[i][1]) return lerp(s[i - 1][0], s[i][0], (y - s[i - 1][1]) / (s[i][1] - s[i - 1][1]));
    return s[s.length - 1][0];
  }
  function armChain(R, P, sd, o) {
    const idx = sd < 0 ? 0 : 1, L1 = R.AL[0] * (P.arm || 1), L2 = R.AL[1] * (P.arm || 1), S = R.S(sd), tgt = o.reach && o.reach[idx];
    if (tgt) { // reach so the hand (not the wrist) lands on the target
      const g = V.sub(tgt, V.mul(V.unit(V.sub(tgt, S)), 10)), dx = g[0] - S[0], dy = g[1] - S[1];
      const d = cl(Math.hypot(dx, dy), 8, L1 + L2 - 1), a = Math.atan2(dy, dx) - sd * Math.acos(cl((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const E = [S[0] + Math.cos(a) * L1, S[1] + Math.sin(a) * L1], b = Math.atan2(g[1] - E[1], g[0] - E[0]);
      return { S, E, W: [E[0] + Math.cos(b) * L2, E[1] + Math.sin(b) * L2] };
    }
    const [a1, a2] = (o.arms && o.arms[idx]) || (sd === R.ws ? [0.17, 0.05] : [0.09, -0.02]);
    const sw = Math.sin(R.T * 1.9 + sd + (o.ph || 0)) * 0.015;
    const E = [S[0] + sd * Math.sin(a1 + sw) * L1, S[1] + Math.cos(a1 + sw) * L1];
    return { S, E, W: [E[0] + sd * Math.sin(a2) * L2, E[1] + Math.cos(a2) * L2] };
  }
  function shoe(x, A, toe, P, seed) {
    const s = toe < 0 ? -1 : 1, k = 0.7 + 0.35 * Math.abs(toe), L = ([u, v]) => [A[0] + s * u * k - s * 3, A[1] + 13 + v * 1.1];
    const pts = [[-11, 0], [25, 0], [29.5, -3], [30, -8], [26, -12.5], [15, -15.5], [6, -19.5], [-5, -20], [-10.5, -15], [-12, -6]].map(L);
    const p = wp(pts, seed, true, 0.2);
    x.fillStyle = P.shoes; x.fill(p);
    x.save(); x.clip(p); x.fillStyle = P.sole; x.fillRect(A[0] - 40, A[1] + 9.2, 80, 8); x.restore();
    fold(x, [L([-11, -3.8]), L([10, -4]), L([29, -3.6])], 2.6);
    x.lineWidth = PLW; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(p);
  }
  // open mouth: a large soft shape, flatter on top and round below, deep maroon with the face's ink. Teeth are separate
  // small cream shapes (short triangles with rounded tips, thin outline) hanging from the upper lip with uneven gaps,
  // smaller ones rising from the lower lip, none at the corners. Cheek lines bracket the mouth; a small curve marks the chin.
  const MOUTH = '#6B1F22', TOOTH = '#EDE7C6';
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
    x.save(); x.clip(path); x.lineJoin = 'round'; x.lineWidth = 1.3; x.strokeStyle = C.ink;
    for (const T of teeth) { const tp = toPath(chaikin([...T, T[0]], 1)); x.fillStyle = TOOTH; x.fill(tp); x.stroke(tp); }
    x.restore();
    x.lineWidth = PLW; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(path); // lips over the tooth roots
    for (const sd of [-1, 1]) fold(x, [[mx + sd * 21, my - 12], [mx + sd * 24.5, my - 3], [mx + sd * 22, my + 6]], 2.4);
    fold(x, [[mx - 6, my + 16], [mx, my + 18.5], [mx + 6, my + 16]], 2.2);
    x.restore();
  }
  function mouth(x, mx, my, kind, dir = 0) {
    if (kind === 'smile') fold(x, quadPts([mx - 14, my - 4], [mx, my + 9], [mx + 14, my - 5], 6), 3.2);
    else if (kind === 'wavy') { const P = []; for (let i = 0; i <= 6; i++) P.push([mx - 13 + i * 4.4, my + (i % 2 ? -2.5 : 1.5)]); line(x, P, 3); }
    else if (kind === 'open') openMouth(x, mx, my, dir);
    else if (kind === 'grin') { x.save(); x.translate(mx, my); x.scale(1 - 0.22 * Math.abs(dir), 1); fold(x, quadPts([-21, -6], [0, 9], [21, -7], 8), 2.8); fold(x, [[-21, -6], [-24, -10]], 2.2); fold(x, [[21, -7], [24, -11]], 2.2); x.restore(); }
    else if (kind === 'grimace') { flat(x, [[mx - 16, my - 7], [mx + 16, my - 8], [mx + 15, my + 7], [mx - 15, my + 8]], '#fffdf4', PLW, 0.15); fold(x, [[mx - 15, my], [mx + 15, my - 0.5]], 2); fold(x, [[mx - 5, my - 7], [mx - 5, my + 7]], 2); fold(x, [[mx + 6, my - 7], [mx + 6, my + 7]], 2); }
    else fold(x, [[mx - 12, my], [mx, my + 1.5], [mx + 12, my - 1]], 3);
  }
  // @people-build: tools/build.mjs splices the style's people file (config.people) in here

  // ---------- characters and props ----------
  // the mug: a diner mug with a face. origin = centre, r = half height. Body + handle are one union drawing.
  function mug(x, cx, cy, r, o = {}) {
    const R = Math.round(r), t = o.t || 0;
    x.save(); x.translate(cx, cy); x.scale(r / R * (o.sx || 1), r / R * (o.sy || 1));
    const handle = shape(`mugh${R}`, () => { const out = []; for (let i = 0; i <= 16; i++) { const a = -1.5 + (i / 16) * 3; out.push([R * 0.7 + Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.6]); } for (let i = 16; i >= 0; i--) { const a = -1.5 + (i / 16) * 3; out.push([R * 0.7 + Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3]); } return out; });
    const body = RR(-R * 0.8, -R, R * 1.6, R * 2, R * 0.24);
    union(x, [[handle, C.mug, { shade: [-R * 0.08, -R * 0.08] }], [body, C.mug, { shade: [-R * 0.18, -R * 0.1] }]]);
    cel(x, OV(0, -R, R * 0.8, R * 0.2), lite(C.mug, 0.3), { lw: 2.6 });
    cel(x, OV(0, -R * 0.97, R * 0.64, R * 0.13), C.coffee, { lw: 2 });
    // hard highlight on the body
    x.fillStyle = lite(C.mug, 0.5); x.fillRect(-R * 0.6, -R * 0.62, R * 0.1, R * 1.1);
    const look = o.look || [0, 0], bl = blinkAt(t, o.ph || 0);
    eye(x, -R * 0.26, -R * 0.22, R * 0.3, { look, blink: bl, happy: o.happy, wide: o.wide, lid: o.lid, skin: C.mug });
    eye(x, R * 0.26, -R * 0.22, R * 0.3, { look, blink: bl, happy: o.happy, wide: o.wide, lid: o.lid, skin: C.mug });
    x.strokeStyle = C.ink; x.lineWidth = Math.max(2.4, R * 0.07); x.lineCap = 'round'; x.beginPath();
    if (o.happy) { x.arc(0, R * 0.22, R * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); }
    else if (o.wide) { x.ellipse(0, R * 0.36, R * 0.09, R * 0.12, 0, 0, TAU); }
    else { x.moveTo(-R * 0.16, R * 0.34); x.quadraticCurveTo(0, R * 0.28, R * 0.16, R * 0.36); }
    x.stroke();
    x.restore();
    if (o.steam > 0) steam(x, cx, cy - r * 1.18, r, o.steam, t);
  }
  // cartoon steam: three cream wisps with ink outlines, waving on twos
  function steam(x, cx, cy, r, a, t) {
    const T = twos(t);
    x.save(); x.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * r * 0.45, ph = T * 2.4 + i * 1.9, P = [];
      for (let j = 0; j <= 14; j++) { const u = j / 14; P.push([cx + ox + Math.sin(u * 5 + ph) * r * 0.18 * (0.3 + u), cy - u * r * (1.3 + 0.2 * i) * a]); }
      const rib = ribbon(P, (u) => r * 0.09 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.04)) + 0.6);
      x.strokeStyle = C.ink; x.lineWidth = 2.6; x.stroke(rib); x.fillStyle = C.paper; x.fill(rib);
    }
    x.restore();
  }
  // a water molecule: red oxygen with a face, two white hydrogens at 104.5 degrees, each marked +.
  // ang = direction the hydrogen side points. The face stays upright while the molecule turns.
  function water(x, cx, cy, r, ang, o = {}) {
    const R = Math.round(r), hr = Math.round(R * 0.6), d = R * 1.08, half = 0.912;
    x.save(); x.translate(cx, cy); x.scale(r / R, r / R);
    for (const sg of [-1, 1]) {
      const a = ang + sg * half, hx = Math.cos(a) * d, hy = Math.sin(a) * d;
      x.save(); x.translate(hx, hy);
      cel(x, OV(0, 0, hr, hr), C.hyd, { shade: [-hr * 0.24, -hr * 0.24] });
      x.strokeStyle = C.ink; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(-hr * 0.32, 0); x.lineTo(hr * 0.32, 0); x.moveTo(0, -hr * 0.32); x.lineTo(0, hr * 0.32); x.stroke();
      x.restore();
    }
    cel(x, OV(0, 0, R, R), C.oxy, { shade: [-R * 0.2, -R * 0.2] });
    x.fillStyle = lite(C.oxy, 0.55); x.beginPath(); x.ellipse(-R * 0.5, -R * 0.52, R * 0.16, R * 0.09, -0.7, 0, TAU); x.fill();
    const lk = [Math.cos(ang) * 0.8, Math.sin(ang) * 0.6], bl = blinkAt(o.t || 0, o.ph || 0);
    eye(x, -R * 0.3, -R * 0.1, R * 0.36, { look: o.dizzy ? [Math.cos(o.dizzy), Math.sin(o.dizzy)] : lk, blink: o.dizzy ? 0 : bl, wide: o.wide });
    eye(x, R * 0.3, -R * 0.1, R * 0.36, { look: o.dizzy ? [Math.cos(o.dizzy + 2), Math.sin(o.dizzy + 2)] : lk, blink: o.dizzy ? 0 : bl, wide: o.wide });
    x.strokeStyle = C.ink; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath();
    if (o.wide) { x.moveTo(-R * 0.22, R * 0.5); for (let i = 1; i <= 4; i++) x.lineTo(-R * 0.22 + i * R * 0.11, R * (i % 2 ? 0.43 : 0.5)); }
    else { x.moveTo(-R * 0.14, R * 0.46); x.quadraticCurveTo(0, R * 0.54, R * 0.14, R * 0.44); }
    x.stroke();
    x.restore();
  }
  // thermometer: glass tube + bulb as one union drawing; the red column rises with frac (0..1). Origin = bulb centre.
  function thermo(x, cx, cy, h, frac) {
    x.save(); x.translate(cx, cy);
    const tube = RR(-21, -h - 20, 42, h + 30, 21), bulb = OV(0, 0, 40, 40);
    union(x, [[tube, '#eef3f1', { shade: [-7, 0] }], [bulb, C.oxy, { shade: [-9, -9] }]]);
    x.save(); x.clip(tube.path); x.fillStyle = C.oxy; const top = -h * frac; x.fillRect(-11, top, 22, 30 - top);
    x.strokeStyle = C.ink; x.lineWidth = 2.6; x.beginPath(); x.moveTo(-11, top); x.lineTo(11, top); x.stroke(); x.restore();
    inkLines(x, 'thermoticks' + h, Array.from({ length: 7 }, (_, i) => [[6, -h * (0.1 + i * 0.13)], [20, -h * (0.1 + i * 0.13)]]), 2.2);
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(-15, -h - 6, 5, h - 10);
    x.fillStyle = lite(C.oxy, 0.55); x.beginPath(); x.ellipse(-16, -14, 9, 5, -0.7, 0, TAU); x.fill();
    x.restore();
  }

  // ---------- the microwave (local 400 x 222, origin top-left) ----------
  // o: { on, display, xray (0..1: the control panel lifts off to show the magnetron), inner() draws inside the window }
  function microwave(x, X, Y, o = {}) {
    const on = o.on || 0, xr = o.xray || 0;
    x.save(); x.translate(X, Y);
    cel(x, RR(30, 212, 44, 14, 3), C.metalDk, { lw: 2.4 }); cel(x, RR(326, 212, 44, 14, 3), C.metalDk, { lw: 2.4 });
    cel(x, RR(0, 0, 400, 222, 16), C.metal, { shade: [-9, -9] });
    cel(x, RR(14, 14, 278, 194, 10), '#9ca2a5', { shade: [-5, -5], lw: 2.6 });
    cel(x, RR(32, 32, 214, 152, 8), on ? C.lamp : '#44423a', { lw: 2.6, inner: () => {
      inkLines(x, 'mwback', [[[60, 52], [218, 52], [218, 150], [60, 150], [60, 52]], [[32, 32], [60, 52]], [[246, 32], [218, 52]], [[32, 184], [60, 150]], [[246, 184], [218, 150]]], 1.8, on ? 0.45 : 0.6);
      cel(x, OV(139, 166, 84, 15), on ? '#e2d48a' : '#5c594e', { lw: 2.2 });
      if (o.inner) o.inner();
      x.fillStyle = 'rgba(255,255,255,0.26)';
      x.beginPath(); x.moveTo(150, 32); x.lineTo(196, 32); x.lineTo(100, 184); x.lineTo(54, 184); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(212, 32); x.lineTo(226, 32); x.lineTo(130, 184); x.lineTo(116, 184); x.closePath(); x.fill();
    } });
    cel(x, RR(258, 44, 18, 128, 8), C.metalDk, { shade: [-4, 0], lw: 2.4 });
    // control panel: cutaway interior underneath, the panel itself lifts off upward
    x.save(); x.beginPath(); x.rect(296, 8, 102, 206); x.clip();
    if (xr > 0) cutaway(x, on);
    x.translate(0, -eio(xr) * 240);
    cel(x, RR(306, 28, 80, 38, 5), C.screen, { lw: 2.4 });
    x.font = `700 26px ${LFONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = C.digit; x.fillText(o.display || '', 346, 48);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) cel(x, RR(310 + c * 25, 82 + r * 22, 19, 15, 3), '#d3d7d8', { lw: 1.6, shade: [-2, -2] });
    cel(x, RR(310, 176, 69, 20, 5), C.lime, { lw: 2, shade: [-3, -3] });
    x.restore();
    if (on) glow(x, 346, 48, 60, C.digit, 0.25);
    x.restore();
  }
  // the inside of the panel: dark cavity, copper-finned magnetron, a short waveguide stub, wires
  function cutaway(x, on) {
    x.fillStyle = '#3f4649'; x.fillRect(296, 8, 102, 206);
    inkLines(x, 'cutedge', [[[298, 10], [396, 10], [396, 212], [298, 212], [298, 10]]], 2.6);
    cel(x, RR(334, 14, 26, 70, 4), '#5d6669', { lw: 2.2, shade: [-4, 0] });                  // waveguide stub
    for (let i = 0; i < 6; i++) cel(x, RR(318, 108 + i * 10, 58, 6, 2), C.copper, { lw: 1.6 }); // cooling fins
    cel(x, RR(328, 98, 38, 76, 8), '#8e969a', { shade: [-6, -6], lw: 2.6 });                 // magnetron body
    cel(x, OV(347, 92, 11, 9), '#c9cfd2', { lw: 2.2 });                                    // antenna dome
    line(x, [[330, 180], [318, 196], [336, 206], [370, 204]], 4);
    line(x, [[362, 180], [380, 192], [388, 206]], 4);
    if (on) glow(x, 347, 92, 40, C.glow, 0.35);
  }

  // ---------- the set: a sitcom kitchen (world coordinates 1280 x 720, drawn under the camera) ----------
  function kitchen(x) {
    x.fillStyle = C.wall; x.fillRect(-80, -80, 1440, 880);
    [[210, 330, 170, 60], [700, 210, 240, 40], [1050, 330, 150, 70], [470, 390, 130, 30]].forEach(([a, b, c, d], i) => cel(x, shape('wsm' + i, () => blobPts(a, b, c, d, i)), C.wall2, { lw: 0 }));
    cel(x, PG('cabsh', () => [[-80, 168], [1360, 168], [1360, 204], [-80, 232]], 0.6), C.wallSh, { lw: 0 });
    // wall clock
    x.save(); x.translate(195, 278);
    cel(x, OV(0, 0, 50, 50), C.paper, { lw: 3.2, shade: [-6, -6] }); cel(x, OV(0, 0, 40, 40), null, { lw: 1.8 });
    inkLines(x, 'clockticks', Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return [[Math.cos(a) * 33, Math.sin(a) * 33], [Math.cos(a) * 38, Math.sin(a) * 38]]; }), 2.2);
    line(x, [[0, 0], [0, -30]], 5); line(x, [[0, 0], [20, 6]], 5);
    x.restore();
    // upper cabinets: doors with recessed panels and knobs, a darker underside
    cel(x, RR(-60, -40, 1400, 190, 0, 0.6), C.wood, { lw: 2.4 });
    for (let i = 0; i < 4; i++) {
      const X0 = -40 + i * 340;
      cel(x, RR(X0 + 10, -4, 320, 146, 6), C.wood, { lw: 2.2, shade: [-5, -6] });
      cel(x, RR(X0 + 34, 12, 272, 112, 5), lite(C.wood, 0.1), { lw: 1.6, shade: [4, 4] });
      cel(x, OV(i % 2 ? X0 + 40 : X0 + 300, 112, 8, 8), C.knob, { lw: 2.2 });
    }
    cel(x, PG('cabund', () => [[-60, 142], [1340, 142], [1340, 170], [-60, 170]], 0.5), C.woodDk, { lw: 2.4 });
    // tiled backsplash
    cel(x, RR(-60, 410, 1400, 50, 0, 0.4), C.tile, { lw: 2 });
    inkLines(x, 'tiles', [...Array.from({ length: 27 }, (_, i) => [[-40 + i * 52, 412], [-40 + i * 52, 458]]), [[-60, 435], [1340, 435]]], 1.4, 0.55);
    // microwave cast shadow on the tiles
    cel(x, PG('mwsh', () => [[820, 410], [852, 410], [852, 456], [820, 456]], 0.3), dark(C.tile, 0.28), { lw: 0 });
    // counter + lower cabinets
    cel(x, RR(-60, 454, 1400, 20, 3, 0.4), C.counter, { lw: 2.4 });
    cel(x, RR(-60, 472, 1400, 18, 3, 0.4), C.edge, { lw: 2.4, shade: [0, -5] });
    cel(x, RR(-60, 488, 1400, 300, 0, 0.6), C.wood, { lw: 2.4 });
    cel(x, PG('undercounter', () => [[-60, 490], [1340, 490], [1340, 504], [-60, 512]], 0.4), dark(C.wood, 0.25), { lw: 0 });
    for (let i = 0; i < 4; i++) {
      const X0 = -40 + i * 340;
      cel(x, RR(X0 + 12, 512, 316, 50, 5), C.wood, { lw: 2.2, shade: [-4, -5] });
      cel(x, RR(X0 + 12, 576, 316, 200, 5), C.wood, { lw: 2.2, shade: [-4, -5] });
      cel(x, OV(X0 + 170, 537, 7, 7), C.knob, { lw: 2.2 });
      cel(x, OV(X0 + 170, 600, 7, 7), C.knob, { lw: 2.2 });
    }
    // toaster
    x.save(); x.translate(110, 362);
    cel(x, RR(0, 0, 170, 96, 26), C.metal, { shade: [-10, -8], inner: () => { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(22, 14, 9, 66); x.fillRect(38, 14, 4, 66); } });
    cel(x, RR(30, -5, 46, 10, 5), C.ink, { lw: 0 }); cel(x, RR(94, -5, 46, 10, 5), C.ink, { lw: 0 });
    cel(x, RR(170, 34, 16, 26, 4), C.metalDk, { lw: 2.2 });
    cel(x, RR(20, 92, 30, 8, 3), C.metalDk, { lw: 2 }); cel(x, RR(120, 92, 30, 8, 3), C.metalDk, { lw: 2 });
    x.restore();
    // potted plant
    x.save(); x.translate(1210, 420);
    const leaf = (k, ang, len) => { x.save(); x.rotate(ang); cel(x, shape('leaf' + k, () => { const out = []; for (let i = 0; i <= 12; i++) { const u = i / 12; out.push([Math.sin(u * Math.PI) * len * 0.22, -u * len]); } for (let i = 11; i > 0; i--) { const u = i / 12; out.push([-Math.sin(u * Math.PI) * len * 0.22, -u * len]); } return out; }), C.leaf, { shade: [4, 0] }); line(x, [[0, -6], [0, -len * 0.8]], 2.4); x.restore(); };
    [[-0.9, 80], [-0.4, 104], [0.1, 110], [0.55, 96], [1.0, 74]].forEach(([a, l], k) => leaf(k, a, l));
    cel(x, PG('pot', () => [[-42, -26], [42, -26], [34, 36], [-34, 36]]), C.pot, { shade: [-8, 0] });
    cel(x, RR(-50, -36, 100, 16, 4), lite(C.pot, 0.15), { lw: 2.6 });
    x.restore();
  }

  // ---------- the molecule world inside the coffee ----------
  const BLOBS = (() => { const r = H.rng(808), a = []; for (let i = 0; i < 9; i++) a.push({ x: r.range(0, 1500), y: r.range(20, 700), rx: Math.round(r.range(130, 260)), ry: Math.round(r.range(60, 120)), sp: r.range(6, 14), s: i }); return a; })();
  const BUBBLES = (() => { const r = H.rng(909), a = []; for (let i = 0; i < 30; i++) a.push({ x: r.range(40, 1240), t0: r.range(3.6, 11), r: Math.round(r.range(7, 16)), sp: r.range(70, 140), w: r.range(0.8, 2) }); return a; })();
  function goo(x, W, H_, t, heat) {
    const T = twos(t);
    x.fillStyle = H.rgba(H.mix(C.brown, C.hot, heat)); x.fillRect(0, 0, W, H_);
    const bc = H.rgba(H.mix(C.brown2, C.hot2, heat));
    BLOBS.forEach((b) => { x.save(); x.translate(((b.x + T * b.sp) % 1560) - 140, b.y); cel(x, shape('blob' + b.s, () => blobPts(0, 0, b.rx, b.ry, b.s + 5)), bc, { lw: 0 }); x.restore(); });
    const bf = H.rgba(H.mix('#a1714d', '#ee9a5c', heat));
    BUBBLES.forEach((b) => {
      const age = T - b.t0; if (age < 0) return;
      const y = 760 - age * b.sp, xx = b.x + Math.sin(age * b.w * 2) * 14; if (y < -30) return;
      x.save(); x.translate(xx, y);
      cel(x, OV(0, 0, b.r, b.r), bf, { lw: 2.2, inner: () => { x.fillStyle = 'rgba(255,250,235,0.75)'; x.beginPath(); x.ellipse(-b.r * 0.35, -b.r * 0.35, b.r * 0.3, b.r * 0.18, -0.7, 0, TAU); x.fill(); } });
      x.restore();
    });
    if (heat > 0) for (let i = 0; i < 9; i++) { // heat shimmer: wavy brush lines rising
      const ph = (T * 0.6 + i * 0.37) % 1, cx = 70 + i * 140, P = [];
      for (let j = 0; j <= 12; j++) { const u = j / 12; P.push([cx + Math.sin(u * 7 + T * 4 + i) * 9, 720 - ph * 760 - u * 110]); }
      x.save(); x.globalAlpha = 0.55 * heat; line(x, P, 7, { col: '#ffd3a1' }); x.restore();
    }
  }

  // ---------- the swirl portal (the scene change) ----------
  // wobbly lime disc: stepped rings, spinning tapered arms, goo drips, ink rim, soft glow. o.inside() draws what is seen
  // through it (clipped to the inner rim), so the portal can grow over the frame as a wipe into the next scene.
  function portal(x, cx, cy, r, t, o = {}) {
    if (r < 2) return;
    const T = twos(t);
    const rim = (k, ph) => { const p = new Path2D(); for (let i = 0; i <= 90; i++) { const a = (i / 90) * TAU, w = 1 + 0.06 * NZ.n3(Math.cos(a) * 1.6 + ph, Math.sin(a) * 1.6, T * 1.7 + ph); const px = cx + Math.cos(a) * r * k * w, py = cy + Math.sin(a) * r * k * w; i ? p.lineTo(px, py) : p.moveTo(px, py); } p.closePath(); return p; };
    glow(x, cx, cy, r * 1.7, C.glow, 0.5 * (o.glowA == null ? 1 : o.glowA));
    const lw = Math.max(LW, r * 0.022);
    x.save(); x.lineJoin = 'round'; x.strokeStyle = C.ink;
    for (let i = 0; i < 3; i++) { // goo drips hanging off the lower rim
      const a = Math.PI * (0.3 + i * 0.2), len = r * (0.2 + 0.07 * Math.sin(T * 3 + i * 2)), bw = r * 0.07;
      const dx = cx + Math.cos(a) * r * 0.9, dy = cy + Math.sin(a) * r * 0.9, p = new Path2D();
      p.moveTo(dx - bw, dy); p.quadraticCurveTo(dx - bw, dy + len * 0.7, dx - bw * 0.7, dy + len * 0.85); p.arc(dx, dy + len * 0.85, bw * 0.7, Math.PI, 0, true); p.quadraticCurveTo(dx + bw, dy + len * 0.7, dx + bw, dy); p.closePath();
      x.lineWidth = lw * 2; x.stroke(p); x.fillStyle = C.limeDk; x.fill(p);
    }
    const outer = rim(1, 0);
    x.lineWidth = lw * 2; x.stroke(outer); x.fillStyle = C.limeDk; x.fill(outer);
    x.clip(outer);
    x.fillStyle = '#74c844'; x.fill(rim(0.8, 3)); x.fillStyle = C.lime; x.fill(rim(0.58, 6)); x.fillStyle = C.limeHi; x.fill(rim(0.34, 9));
    for (let i = 0; i < 8; i++) {
      const P = []; for (let j = 0; j <= 22; j++) { const u = j / 22, a = (i * TAU) / 8 + u * 3.4 - T * 3.2; P.push([cx + Math.cos(a) * r * (0.06 + 0.94 * u), cy + Math.sin(a) * r * (0.06 + 0.94 * u)]); }
      line(x, P, r * (i % 2 ? 0.075 : 0.05), { col: i % 2 ? 'rgba(40,120,40,0.75)' : 'rgba(240,255,200,0.9)' });
    }
    x.restore();
    if (o.inside && (o.see == null ? 1 : o.see) > 0.01) {
      const inner = rim(0.78 * (o.see == null ? 1 : o.see), 3);
      x.save(); x.clip(inner); o.inside(); x.restore();
      x.save(); x.lineWidth = Math.max(LW, r * 0.012); x.strokeStyle = C.ink; x.lineJoin = 'round'; x.stroke(inner); x.restore();
    }
  }

  // ---------- print finish: painted-background mottle, dry-brush streaks, fine grain that changes on twos ----------
  let TEX = null;
  function textures() {
    if (TEX) return TEX;
    const mk = (w, h, f) => { const c = H.layer(w, h), cx = c.getContext('2d'), im = cx.createImageData(w, h), d = im.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; } cx.putImageData(im, 0, 0); return c; };
    const nz = H.makeNoise(31), r = H.rng(4242);
    TEX = {
      mot: mk(320, 180, (x, y) => 128 + nz.fbm2(x * 0.03, y * 0.03, 4) * 80 + nz.n2(x * 0.25, y * 0.25) * 14),
      brush: mk(640, 360, (x, y) => 128 + nz.fbm2(x * 0.006 + 40, y * 0.09, 3) * 70),
      grain: mk(256, 256, () => 128 + (r() + r() + r() - 1.5) * 70),
    };
    return TEX;
  }
  function finish(x, W, H_, t) {
    const T = textures(), f = Math.floor(t * 12 + 1e-6);
    x.save(); x.globalCompositeOperation = 'overlay'; x.imageSmoothingEnabled = true;
    x.globalAlpha = 0.1; x.drawImage(T.mot, 0, 0, W, H_);
    x.globalAlpha = 0.07; x.drawImage(T.brush, 0, 0, W, H_);
    const pat = x.createPattern(T.grain, 'repeat'); pat.setTransform(new DOMMatrix().translateSelf((f * 97) % 256, (f * 57) % 256));
    x.globalAlpha = 0.06; x.fillStyle = pat; x.fillRect(0, 0, W, H_);
    x.restore();
  }

  // ---------- camera (one 2D camera over the set: world point (c.x, c.y) sits at screen centre, scale c.s) ----------
  const camApply = (x, c) => { x.translate(640, 360); x.scale(c.s, c.s); x.translate(-c.x, -c.y); };
  const toS = (c, p) => [640 + (p[0] - c.x) * c.s, 360 + (p[1] - c.y) * c.s];
  const MW = [420, 232], MUG = [MW[0] + 139, MW[1] + 124], MAG = [MW[0] + 347, MW[1] + 128];
  const WAVE = bz([[MW[0] + 347, MW[1] + 88], [MW[0] + 347, MW[1] - 6], [MW[0] + 139, MW[1] - 14], [MW[0] + 139, MW[1] + 80]], 60);
  function kcam(t) {
    const p = eio(seg(t, TL.push[0], TL.push[1])), d = ei(seg(t, TL.portal[1], TL.portal[2]));
    let cx = lerp(640, 615, p), cy = lerp(360, 345, p), s = lerp(1 + 0.04 * seg(t, 0, 2), 1.75, p);
    cx = lerp(cx, MUG[0], d); cy = lerp(cy, MUG[1], d); s *= Math.exp(Math.log(2.4) * d); // dive at the mug as the portal swallows the frame
    return { x: cx, y: cy, s };
  }
  const header = (x, a, u = 1) => sign(x, 272, 44, 'How does a microwave heat food?', 28, { u, a, tilt: -0.012 });

  // ================= EXPLAINER SCENES =================
  // ---- scene A: the kitchen. Hook title, camera trucks in, the panel lifts off, waves run from the magnetron to the mug
  function exKitchen(x, W, H_, t) {
    const c = kcam(t), T = twos(t), on = t >= TL.on ? 1 : 0;
    const secs = 30 - Math.floor(Math.max(0, t - TL.on));
    const react = T >= TL.react;
    x.save(); camApply(x, c);
    kitchen(x);
    microwave(x, MW[0], MW[1], { on, xray: seg(t, TL.xray[0], TL.xray[1]), display: on ? `0:${String(secs).padStart(2, '0')}` : '0:30', inner: () => mug(x, 139, 124, 36, { t, ph: 0.6, look: react ? [0.6, -0.8] : [0.3, 0.2], wide: react, lid: react ? 0 : 0.3 }) });
    if (on) glow(x, MUG[0], MUG[1] - 20, 210, C.lamp, 0.2 + 0.03 * Math.sin(T * 9));
    arrow(x, WAVE, eio(seg(t, TL.wave[0], TL.wave[1])), { w: 13, fill: C.lime, lw: 2.4, wave: { a: 6, k: 0.19, ph: t * 16 } });
    x.restore();
    // callouts live in screen space so the type stays big; they land on world points through the camera
    const la = 1 - seg(t, TL.portal[0] - 0.05, TL.portal[0] + 0.15);
    callout(x, t, TL.magLbl, 'magnetron', [1092, 222], toS(c, [MAG[0] + 6, MAG[1] - 10]), { a: la, tilt: 0.02 });
    callout(x, t, TL.waveLbl, 'microwaves', [700, 104], toS(c, [WAVE[30][0], WAVE[30][1] + 4]), { a: la, tilt: -0.02 });
    // hook title: words pop on with overshoot, then the whole title shrinks into the corner header
    const sp = eio(seg(t, TL.shrink[0], TL.shrink[1]));
    if (sp < 1) {
      x.save(); x.translate(lerp(640, 272, sp), lerp(120, 44, sp)); x.scale(lerp(1, 0.34, sp), lerp(1, 0.34, sp)); x.globalAlpha = 1 - seg(sp, 0.7, 1);
      const lines = [[['How', 'does', 'a', 'microwave'], -46, 62, C.cream], [['heat', 'food?'], 46, 88, C.lime]];
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
  const MOLS = [[170, 300], [390, 300], [610, 300], [830, 300], [280, 445], [500, 445], [720, 445], [940, 445]].map(([px, py], i) => { const r = H.rng(500 + i); return { x: px, y: py, a0: r.range(-Math.PI, Math.PI), spin: r.chance(0.5) ? 1 : -1, lag: r.range(0, 0.07) }; });
  const spr = (u) => (u <= 0 ? 0 : 1 - Math.exp(-u * 7) * Math.cos(u * 13)); // swing with a little overshoot
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function molAngle(m, T) { let a = m.a0 - wrap(m.a0) * spr(T - TL.align - m.lag); for (const tf of FLIPS) a += m.spin * Math.PI * spr(T - tf - m.lag); return a; }
  function fieldDir(t) { let n = 0, last = -1; for (const tf of FLIPS) if (t >= tf) { n++; last = tf; } const cur = n % 2 ? -1 : 1; return last < 0 ? 1 : cur * (2 * eio(seg(t, last, last + 0.1)) - 1); }
  const FIELD = bz([[-390, 6], [-130, -9], [130, 9], [390, -3]], 50);
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
    // the field: one big inked arrow that flips direction (squashes through zero width)
    const fp = eio(seg(t, TL.field[0], TL.field[1]));
    x.save(); x.translate(640, 168); x.scale(fieldDir(t), 1); arrow(x, FIELD, fp, { w: 42, fill: C.lime, lw: 3.2 }); x.restore();
    // molecules
    const P = MOLS.map((m, i) => molPos(i, T, heat));
    MOLS.forEach((m, i) => {
      const s = back(seg(T, TL.mols + i * 0.05, TL.mols + i * 0.05 + 0.3), 1.8); if (s <= 0) return;
      if (heat > 0.05) { // motion lines trail behind the jostle
        const q = molPos(i, T - 1 / 12, heat), dx = P[i][0] - q[0], dy = P[i][1] - q[1], l = Math.hypot(dx, dy);
        if (l > 6) for (let k = -1; k <= 1; k++) { const nx = -dy / l, ny = dx / l, ox = P[i][0] - (dx / l) * 62 + nx * k * 22, oy = P[i][1] - (dy / l) * 62 + ny * k * 22; line(x, [[ox, oy], [ox - (dx / l) * 40, oy - (dy / l) * 40]], 5); }
      }
      water(x, P[i][0], P[i][1], 34 * s, molAngle(m, T) + (heat > 0 ? NZ.n2(i, T * 9) * 0.5 * heat : 0), { t, ph: i * 0.9, wide: heat > 0.3, dizzy: heat > 0.6 ? T * 9 + i : 0 });
    });
    for (const [tb, a, b] of BONKS) { const u = T - tb; if (u >= 0 && u < 0.25) bang(x, (P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2, 34, 34, back(seg(u, 0, 0.12), 2) * (1 - seg(u, 0.17, 0.25)), { n: 8, rot: tb }); }
    // labels
    const la = 1 - seg(t, TL.heat[0], TL.heat[0] + 0.3);
    callout(x, t, TL.fieldLbl, 'electric field', [820, 92], [820, 150], { a: la, tilt: 0.015 });
    callout(x, t, TL.molLbl, 'water molecule', [160, 572], [MOLS[0].x - 10, MOLS[0].y + 36], { a: Math.min(la, 1 - seg(t, TL.hit - 0.3, TL.hit - 0.1)), tilt: -0.02 });
    // the counter: counts up, then SLAMS: overshoot scale, burst star behind, colour swap, screen shake (in explainer())
    const ca = seg(t, TL.count[0] - 0.2, TL.count[0]), out = ei(seg(t, TL.heat[0], TL.heat[0] + 0.45));
    if (ca > 0 && out < 1) {
      x.save(); x.translate(0, out * 260); x.globalAlpha = ca;
      const hu = t - TL.hit;
      if (hu >= 0) bang(x, 640, 592, 360, 84, back(seg(hu, 0, 0.3), 2), { n: 18, rot: 0.03 });
      const sc = hu >= 0 ? 1 + 0.4 * Math.exp(-hu * 7) * Math.cos(hu * 20) : 1;
      sign(x, 640, 672, 'times a second', 30, { u: seg(t, TL.perSec, TL.perSec + LAND), tilt: 0.01 }); // drops in behind the number
      x.save(); x.translate(640, 592); x.scale(sc, sc); letters(x, countAt(t).toLocaleString('en-US'), 0, 0, 88, { fill: hu >= 0 ? C.lime : C.cream }); x.restore();
      x.restore();
    }
    // heat: thermometer slides in, column and number rise, the bump label lands on a collision
    if (t > TL.thermo) {
      const tx = lerp(1460, 1150, back(seg(t, TL.thermo, TL.thermo + 0.5), 1.3));
      thermo(x, tx, 590, 330, lerp(0.08, 0.9, eio(seg(t, TL.temp[0], TL.temp[1]))));
      letters(x, tempAt(t) + '°C', tx, 196, 64, { fill: t > TL.temp[1] ? C.salmon : C.cream });
    }
    callout(x, t, TL.bumpLbl, 'bumping = heat', [610, 618], [(P[5][0] + P[6][0]) / 2, (P[5][1] + P[6][1]) / 2 + 26], { bg: '#ffd6a0' });
  }

  // ---- scene C: hard cut back to the kitchen on the ding. The mug steams; the takeaway holds.
  function exEnd(x, W, H_, t) {
    const T = twos(t), c = { x: 720, y: 290, s: 1.2 + 0.04 * seg(t, TL.cut, TL.D) };
    x.save(); camApply(x, c);
    kitchen(x);
    const blinkOn = Math.floor((t - TL.cut) * 2.5) % 2 === 0;
    microwave(x, MW[0], MW[1], { on: 0, display: blinkOn ? '0:00' : '', inner: () => cel(x, OV(139, 150, 26, 6), dark('#44423a', 0.3), { lw: 0 }) });
    mug(x, 930, 418, 36, { t, happy: T >= TL.cut + 0.25, wide: T < TL.cut + 0.25, look: [0, -0.5], steam: eo(seg(T, TL.cut, TL.cut + 0.5)) });
    x.restore();
    const l1 = back(seg(t, TL.line1, TL.line1 + 0.4), 1.8), l2 = back(seg(t, TL.line2, TL.line2 + 0.4), 1.8);
    if (l1 > 0) { x.save(); x.translate(640, 124 + (1 - l1) * 30); x.scale(l1, l1); letters(x, 'Microwaves shake water.', 0, 0, 52); x.restore(); }
    if (l2 > 0) { // "SHAKING WATER  ->  HEAT": the arrow is the style's own inked arrow, drawing on after the words land
      const a = 'Shaking water', b = 'HEAT', px = 74, wa = lettersWidth(x, a, px), wb = lettersWidth(x, b, px), gap = 150, x0 = -(wa + gap + wb) / 2;
      x.save(); x.translate(640, 214 + (1 - l2) * 30); x.scale(l2, l2);
      letters(x, a, x0, 0, px, { fill: C.lime, align: 'left' });
      arrow(x, [[x0 + wa + 22, 4], [x0 + wa + gap - 22, 4]], eio(seg(t, TL.line2 + 0.15, TL.line2 + 0.45)), { w: 24, fill: C.cream, lw: 3 });
      letters(x, b, x0 + wa + gap, 0, px, { fill: C.salmon, align: 'left' });
      x.restore();
    }
  }

  // ================= STILL (hero frame) =================
  function scene(x, W, H_, t, build) {
    const B = (a, b) => (build ? seg(t, a, b) : 1);
    const c = { x: 700, y: 336, s: 1.25 + 0.05 * (build ? eo(seg(t, 0, 5)) : 1) };
    x.save(); camApply(x, c);
    kitchen(x);
    microwave(x, MW[0], MW[1], { on: 1, xray: B(1.2, 1.7), display: '0:07', inner: () => mug(x, 139, 124, 36, { t, ph: 0.4, wide: true, look: [0.9, -0.6] }) });
    glow(x, MUG[0], MUG[1] - 20, 210, C.lamp, 0.22);
    arrow(x, WAVE, eio(B(1.9, 2.6)), { w: 13, fill: C.lime, lw: 2.4, wave: { a: 6, k: 0.19, ph: t * 16 } });
    const pr = 104 * back(B(0.4, 1.2), 1.3);
    portal(x, 1030, 290, pr, t, { inside: () => { x.save(); x.translate(1030, 290); x.scale(0.34, 0.34); x.translate(-640, -380); goo(x, 1280, 720, t, 0); water(x, 560, 360, 70, 0.5 + Math.sin(twos(t) * 2) * 0.3, { t }); water(x, 760, 420, 60, 2.6, { t, ph: 1.3 }); x.restore(); } });
    x.restore();
    callout(x, t, 2.4, 'magnetron', [800, 612], toS(c, [MAG[0] + 4, MAG[1] + 20]), { tilt: 0.02 });
    callout(x, t, 2.8, 'molecule world', [1050, 120], toS(c, [1030, 210]), { tilt: -0.02, bg: C.limeHi });
    const words = [['Kitchen', C.cream], ['Physics', C.lime]];
    words.forEach(([w, col], i) => { const u = back(B(0.2 + i * 0.18, 0.55 + i * 0.18), 1.8); if (u > 0) { x.save(); x.translate(56, 92 + i * 82 + (1 - u) * 30); x.scale(u, u); letters(x, w, 0, 0, 78, { fill: col, align: 'left' }); x.restore(); } });
    sign(x, 118, 222, 'EPISODE 7', 28, { u: B(0.9, 0.9 + LAND), bg: C.salmon, fg: C.cream, tilt: -0.03 });
  }

  registerStyle({
    id: 'sci-fi-sitcom',
    name: 'Sci-Fi Sitcom Cartoon',
    category: 'TV Cartoon Looks',
    description: 'Adult sci-fi sitcom cel animation: flat muted fills (sage walls, tan wood, grey appliances), slightly wobbly warm-black ink outlines on everything, one hard-edged cel shadow per prop, flat cast shadows, big white eyes with irregular blob pupils, thin-lined flat-colour people, chunky ink-outlined lettering, and lime sci-fi glow with a swirling goo portal.',
    motion: 'Characters and props animate on twos (12 drawings a second) with snappy overshoot pops, two-drawing blinks and jittery shakes; camera trucks and the portal wipe run smooth on ones; signs drop in, squash on contact and spring back.',
    fonts: ['400 64px "Luckiest Guy"', '600 30px "Fredoka"', '700 26px "Fredoka"'],
    duration: 5,
    frameT: 4.6,
    readsPixels: false,
    draw(ctx, W, H_, t) { scene(ctx, W, H_, t, true); finish(ctx, W, H_, t); },

    explainerDuration: TL.D,
    explainerNote: 'A sitcom kitchen set under one 2D camera: the hook title shrinks into a corner sign, the camera trucks in on the microwave, its control panel lifts off to show the magnetron, and an inked squiggle arrow carries the microwaves to a mug with a face; a lime swirl portal opens on the mug and grows over the frame into the molecule world, where water molecules turn to follow a flipping field arrow while 2,450,000,000 slams in; the molecules jostle, the coffee warms, and a hard cut on the ding lands the takeaway back in the kitchen.',
    explainer(ctx, W, H_, t) {
      const x = ctx;
      // impact shake after the key number, stepped on twos like the drawings
      const hu = t - TL.hit, sk = hu >= 0 && hu < 0.6 ? 16 * Math.exp(-hu * 6) : 0;
      x.save();
      if (sk > 0) { const T = twos(t), z = 1 + sk / 160; x.translate(640, 360); x.scale(z, z); x.translate(-640 + NZ.n2(T * 40, 3) * sk * 1.6, -360 + NZ.n2(T * 40, 9) * sk * 1.6); } // zoom covers the edges
      if (t < TL.portal[0]) exKitchen(x, W, H_, t);
      else if (t < TL.portal[2]) {
        exKitchen(x, W, H_, t);
        const c = kcam(t), mp = toS(c, MUG), u0 = seg(t, TL.portal[0], TL.portal[1]), u1 = Math.pow(seg(t, TL.portal[1], TL.portal[2]), 2.2);
        portal(x, mp[0], mp[1] - 6, 78 * back(u0, 1.6) + 1500 * u1, t, { see: eo(seg(t, TL.portal[1] - 0.12, TL.portal[1] + 0.2)), inside: () => exMol(x, W, H_, t) });
      } else if (t < TL.cut) exMol(x, W, H_, t);
      else exEnd(x, W, H_, t);
      x.restore();
      if (t > TL.shrink[1]) header(x, 1);
      finish(x, W, H_, t);
    },

    explainerSound(k) {
      // Cartoon-show foley over a sci-fi undertone: spring boings for pops, wood-block clunks for signs landing, slide
      // whistles for moves, electric zaps for field flips, gloopy bloops in the coffee, a warbling portal, a microwave hum
      // and its beeps, a theremin for the strange part. All times come from TL / FLIPS / BONKS above.
      const D = TL.D, hz = k.hz;
      const up2 = (te) => Math.ceil(te * 12 - 1e-6) / 12;       // drawn motion is on twos: a pose shows on the next 1/12 s step
      const touch = (t0) => t0 + LAND * CONTACT;                 // a sign touches down
      const pan = (px) => cl((px / 1280) * 2 - 1, -1, 1) * 0.6;
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
      k.bed('room', 0, TL.portal[1], { gain: 0.8 });
      k.bed('room', TL.cut, D, { gain: 0.8 });
      k.bed('hum', TL.on, TL.portal[2], { gain: 1.1 });
      k.noise(TL.on, { dur: TL.portal[2] - TL.on, filter: 'bandpass', f: 240, q: 3, gain: 0.03, a: 0.1, hold: TL.portal[2] - TL.on - 0.4, bus: 'amb' }); // fan whirr
      k.noise(TL.portal[1], { dur: TL.cut - TL.portal[1], color: 'brown', filter: 'lowpass', f: 380, gain: 0.12, a: 0.5, hold: TL.cut - TL.portal[1] - 0.8, bus: 'amb' });
      k.tone(TL.portal[2], { f: vib(55, 55, TL.cut - TL.portal[2], 0.02, 0.7), dur: TL.cut - TL.portal[2], gain: 0.06, a: 0.4, hold: TL.cut - TL.portal[2] - 0.6, bus: 'amb' });
      BUBBLES.forEach((b, i) => { if (i % 3 === 0 && b.t0 > TL.portal[2] && b.t0 < TL.cut - 0.3) bloop(up2(b.t0 + 0.4), 0.5, pan(b.x), 260 + (i % 5) * 40); });

      // ---- 1 HOOK: title words boing on, the microwave starts, the title slides into the corner
      ['How', 'does', 'a', 'microwave', 'heat', 'food?'].forEach((w, i) => boing(peak(TL.title + i * 0.11, TL.title + i * 0.11 + 0.34, 1.8), [330, 370, 415, 440, 520, 590][i], i < 4 ? 0.7 : 1, (i % 3 - 1) * 0.2, i < 4));
      k.play('click', TL.on, { gain: 0.8, pan: pan(700) }); k.play('blip', TL.on + 0.06, { f: 'A5', dur: 0.12, gain: 0.8, pan: pan(700) });
      k.play('thud', TL.on + 0.05, { f: 80, gain: 0.25 });
      slide(TL.shrink[0], 900, 380, TL.shrink[1] - TL.shrink[0], 0.8, -0.4);
      clunk(touch(TL.shrink[1] - 0.2), 0.7, -0.5);

      // ---- 2 HOW IT WORKS: truck in, panel lifts off, magnetron label, waves squiggle across to the mug
      k.play('whoosh', TL.push[0], { dur: TL.push[1] - TL.push[0], top: 1400, gain: 0.45 });
      slide(TL.xray[0], 420, 1300, TL.xray[1] - TL.xray[0], 0.9, pan(1000));
      k.play('swish', TL.xray[0] + 0.1, { dur: 0.3, gain: 0.6, pan: pan(1000) });
      clunk(touch(TL.magLbl), 1, pan(1092));
      const wd = TL.wave[1] - TL.wave[0];
      k.tone(TL.wave[0], { f: vib(500, 950, wd, 0.09, 13), dur: wd + 0.1, gain: 0.07, a: 0.05, hold: wd * 0.8, pan: 0.1 });
      k.play('neon', TL.wave[0], { dur: wd, gain: 0.4, pan: pan(900) });
      k.tone(TL.wave[1], { f: vib(700, 700, TL.portal[0] - TL.wave[1], 0.09, 13), dur: TL.portal[0] - TL.wave[1] + 0.1, gain: 0.025, a: 0.05, hold: 0.1, minor: true }); // waves keep humming
      clunk(touch(TL.waveLbl), 1, pan(700));
      boing(up2(TL.react), 640, 0.8, pan(552)); // the mug notices

      // ---- transition: the portal opens on the mug, then swallows the frame
      const pd = TL.portal[2] - TL.portal[0];
      k.tone(TL.portal[0], { f: vib(110, 150, pd, 0.06, 7), type: 'sawtooth', dur: pd, gain: 0.07, a: pd * 0.4, filter: 'lowpass', f2: [[0, 300], [pd, 2600]], q: 4 });
      k.tone(TL.portal[0], { f: vib(165, 220, pd, 0.05, 5), type: 'square', dur: pd, gain: 0.025, a: pd * 0.5, filter: 'lowpass', f2: 900 });
      k.noise(TL.portal[0], { dur: pd, color: 'pink', filter: 'bandpass', f: [[0, 300], [pd * 0.85, 3200], [pd, 1400]], q: 2, gain: 0.18, a: pd * 0.75, verb: 0.3 });
      const po = peak(TL.portal[0], TL.portal[1], 1.6);
      for (let i = 0; i < 4; i++) bloop(po + i * 0.04, 0.8, i % 2 ? 0.2 : -0.2, 240 + i * 60);
      k.noise(po, { dur: 0.25, color: 'brown', filter: 'lowpass', f: 600, gain: 0.25 });
      k.play('whoosh', TL.portal[1], { dur: TL.portal[2] - TL.portal[1] + 0.1, top: 3000, gain: 0.8 });
      k.play('thud', TL.portal[2], { f: 70, gain: 0.3 });

      // ---- 3 THE MOLECULE WORLD: molecules boing in, the field arrow zaps on, labels clunk down, the field flips
      MOLS.forEach((m, i) => { if (i % 2 === 0) boing(up2(peak(TL.mols + i * 0.05, TL.mols + i * 0.05 + 0.3, 1.8)), 500 + i * 35, 0.7, pan(m.x), true); });
      const fd = TL.field[1] - TL.field[0];
      k.tone(TL.field[0], { f: [[0, 200], [fd, 900]], type: 'sawtooth', dur: fd + 0.05, gain: 0.05, a: fd * 0.8, filter: 'bandpass', f2: [[0, 600], [fd, 2400]], q: 2 });
      zap(TL.field[1], 1, 0, false);
      clunk(touch(TL.fieldLbl), 1, pan(820));
      k.play('swish', up2(TL.align), { dur: 0.25, gain: 0.5 }); boing(up2(TL.align) + 0.08, 300, 0.6, 0, true);
      clunk(touch(TL.molLbl), 1, pan(160));
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
      slide(TL.thermo, 300, 900, 0.45, 0.9, pan(1150));
      k.play('thud', up2(peak(TL.thermo, TL.thermo + 0.5, 1.3)), { f: 120, gain: 0.25, pan: pan(1150) });
      const td = TL.temp[1] - TL.temp[0];
      k.tone(TL.temp[0], { f: vib(320, 1100, td, 0.01, 6), dur: td, gain: 0.05, a: 0.2, hold: td - 0.3, pan: pan(1150) }); // rising kettle tone
      k.noise(TL.heat[0], { dur: TL.cut - TL.heat[0], filter: 'highpass', f: [[0, 6000], [TL.cut - TL.heat[0], 3000]], gain: 0.018, a: TL.cut - TL.heat[0] - 0.1, bus: 'amb' }); // sizzle builds
      BONKS.forEach(([tb, a, b]) => bonk(up2(tb), 0.9, pan((MOLS[a].x + MOLS[b].x) / 2)));
      clunk(touch(TL.bumpLbl), 1, pan(610));
      k.play('riser', TL.cut - 0.75, { dur: 0.75, gain: 0.6 });

      // ---- 5 CUT TO THE KITCHEN: the microwave beeps, the mug steams, the takeaway resolves
      [0, 0.22, 0.44].forEach((d) => k.play('blip', TL.cut + d, { f: 'E6', dur: 0.14, gain: 0.55, pan: pan(500) }));
      k.noise(TL.cut + 0.05, { dur: 1.6, filter: 'highpass', f: 2500, gain: 0.03, a: 0.4, pan: pan(930) }); // steam hiss
      boing(up2(TL.cut + 0.25), 520, 0.9, pan(930));
      boing(peak(TL.line1, TL.line1 + 0.4, 1.8), 440, 0.8, 0);
      const l2 = peak(TL.line2, TL.line2 + 0.4, 1.8);
      chord(l2, ['C3', 'G3', 'C4', 'E4', 'G4', 'D5'], 0.85, 2.0);
      k.play('ding', l2, { f: 'C6', gain: 0.6 });
      boing(l2, 392, 0.9, 0);
    },
  });
}
