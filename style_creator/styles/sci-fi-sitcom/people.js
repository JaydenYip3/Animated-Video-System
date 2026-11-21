  // ---------- people build: regular ----------
  // Long thin limbs that taper shoulder to wrist and hip to ankle with soft elbow and knee bends; hands with a palm wider
  // than the wrist, three tapered fingers and an angled thumb; shoulders that slope from the neck in one continuous line;
  // clothes are a looser separate layer (sleeves wider than the arm with a hem or rolled cuff, trousers bunching at the
  // ankles over the shoes, a few folds at armpit, waist, crotch and the bent knee); shoes with a defined toe and a flat sole
  // band; an irregular oval head with a defined jaw that flows into the neck; two equal eyes with blob pupils that blink
  // together. The pose is relaxed and asymmetric: weight on one leg, pelvis and shoulders tilted against each other and a
  // slight curve in the spine between them.
  // A person P: { id, seed, skin, shirt, pants, shoes, sole, hair ('curls'|'puff'), hairCol, glasses, goggles, tee (true:
  //   T-shirt with short sleeves; false: coveralls with rolled long sleeves), w (width scale), arm (arm length scale) }.
  //   The rig is about 375 units tall: PS = 1.
  const PEOPLE_BUILD = 'regular', PS = 1;
  // the pose rig: feet at the origin, about 375 units to the top of the hair (drawn at PS = 1)
  function rig(P, o) {
    const T = twos(o.t || 0), ws = o.weight || 1, ph = o.ph || 0, w = P.w || 1;
    const bob = Math.sin(T * 2.2 + ph) * 1.2, sway = Math.sin(T * 1.3 + ph * 2) * 1.4;
    const PC = [ws * 5 + sway * 0.6, -160];
    const legs = {};
    for (const sd of [-1, 1]) {
      const Hj = [PC[0] + sd * 15 * w, PC[1] + (sd === ws ? -3 : 3)], stand = sd === ws;
      const A = stand ? [PC[0] * 0.3 + sd * 12 * w, -13] : [sd * 31 * w - ws * 2, -13];
      const K = stand ? V.add(V.mix(Hj, A, 0.5), [sd * 1.5, 0]) : V.add(V.mix(Hj, A, 0.5), [-sd * 6, 2]);
      legs[sd] = { H: Hj, K, A, toe: stand ? sd * 0.5 : sd };
    }
    const N = [-ws + sway * 0.2, -246 + bob * 0.5];
    const spine = quadPts(PC, [-ws * 4, -205], N, 8);
    const S = (sd) => [N[0] + sd * 37 * w, -231 + (sd === ws ? 3 : -2) + bob * 0.4];
    const HC = [N[0] + (o.dir || 0) * 4 - ws * 1.5, -306 + bob];
    return { T, ws, w, PC, legs, N, spine, S, HC, AL: [58, 54] }; // AL: upper and fore arm lengths
  }
  // hands: palm wider than the wrist, three tapered fingers that spread or curl, an angled thumb on the inner side
  const HANDS = {
    relax: { sp: 0.11, curl: [0.55, 0.5, 0.42], k: [1, 1, 1], th: 0.62, thc: -0.25, over: [0, 0, 0] },
    open: { sp: 0.3, curl: [-0.06, -0.04, -0.04], k: [1, 1, 1], th: 1.1, thc: 0.05, over: [0, 0, 0] },
    point: { sp: 0.06, curl: [2.6, 2.5, 0.04], k: [0.8, 0.8, 1.15], th: 0.45, thc: -0.35, over: [1, 1, 0] },
    grip: { sp: 0.04, curl: [2.7, 2.65, 2.6], k: [0.85, 0.85, 0.85], th: 0.35, thc: -0.5, over: [1, 1, 1] },
  };
  function handParts(Wr, ang, side, pose) {
    const H = HANDS[pose] || HANDS.relax, d = [Math.cos(ang), Math.sin(ang)], nv = V.mul(V.perp(d), side);
    const L = ([u, v]) => [Wr[0] + d[0] * u + nv[0] * v, Wr[1] + d[1] * u + nv[1] * v];
    const palm = [[-7, -3.6], [2, -4.3], [8, -6.4], [13.5, -6], [15.6, -2.6], [15.8, 1.6], [14, 4.6], [9, 6.6], [3, 5.6], [-7, 3.6]].map(L);
    const finger = (u0, v0, a0, curl, ln, w0, w1) => {
      const P = [[u0, v0]]; let a = a0, p = [u0, v0];
      [0.3, 0.37, 0.33].forEach((f, j) => { a += curl * (j === 0 ? 0.15 : 0.5); p = [p[0] + Math.cos(a) * ln * f, p[1] + Math.sin(a) * ln * f]; P.push(p); });
      return tube(chaikin(P.map(L), 1), (u) => lerp(w0, w1, u), 1, 0);
    };
    const F = [[-4.3, 10], [-0.2, 12.5], [3.8, 11.5]].map(([v0, ln], j) => ({ pts: finger(12.5, v0, (j - 1) * H.sp, H.curl[j], ln * H.k[j], 4, 2.6), over: H.over[j] }));
    return { palm, thumb: finger(3, 4.4, H.th, H.thc, 11, 4.6, 3), F };
  }
  function legsDraw(x, R, P) {
    for (const sd of [-1, 1]) shoe(x, R.legs[sd].A, R.legs[sd].toe, P, P.seed + 20 + sd);
    const pl = [-1, 1].map((sd) => {
      const L = R.legs[sd], Cn = chaikin([L.H, L.K, V.add(L.A, [0, -3])], 2);
      const wf = (u) => (u < 0.5 ? lerp(32, 25.5, u / 0.5) : lerp(25.5, 24, (u - 0.5) / 0.5)) + (u > 0.82 ? 1.5 * Math.sin(((u - 0.82) / 0.18) * Math.PI * 3) + 3 * ((u - 0.82) / 0.18) : 0);
      return { sd, L, Cn, pts: tube(Cn, wf, 0.3, 0) };
    });
    const { PC, ws } = R;
    const seat = [[PC[0] - 28, -178], [PC[0] + 28, -178], [PC[0] + 33, -152], [PC[0] + 4, -138], [PC[0] - 4, -138], [PC[0] - 33, -152]].map(([a, b]) => [a, b]);
    flatUnion(x, [[seat, P.pants, P.seed + 30], ...pl.map((l) => [l.pts, P.pants, P.seed + 31 + l.sd])]);
    for (const sd of [-1, 1]) fold(x, [[PC[0] + sd * 3, -141], [PC[0] + sd * 10, -151], [PC[0] + sd * 12, -159]], 2.3); // crotch
    for (const l of pl) {
      const inn = (f) => (V.dot(f.n, [-l.sd, 0]) >= 0 ? f.n : V.mul(f.n, -1));
      if (l.sd !== ws) { const k = along(l.Cn, 0.5), ni = inn(k); fold(x, [V.add(k.p, V.mul(ni, 11)), V.add(V.add(k.p, V.mul(ni, 4)), V.mul(k.d, 3))]); fold(x, [V.add(V.add(k.p, V.mul(ni, 12)), V.mul(k.d, 9)), V.add(V.add(k.p, V.mul(ni, 5)), V.mul(k.d, 11))]); }
      const a = along(l.Cn, 0.86), b = along(l.Cn, 0.94), na = inn(a), nb = inn(b);
      fold(x, [V.add(a.p, V.mul(na, 11)), V.add(V.add(a.p, V.mul(na, 4)), V.mul(a.d, 2)), V.add(a.p, V.mul(na, 0))], 2.3);
      fold(x, [V.add(b.p, V.mul(nb, -11)), V.add(V.add(b.p, V.mul(nb, -4)), V.mul(b.d, 2))], 2.3);
    }
  }
  function torsoParts(R, P) {
    const { N, ws, w } = R, CL = (sd) => [N[0] + sd * 10.5 * w, N[1] - 1];
    const slope = (sd) => quadPts(CL(sd), [N[0] + sd * 25 * w, N[1] + 0.5], R.S(sd), 8);
    const rows = [[-213, 34.5], [-197, 33], [-180, 31.5], [-164, 33], [-147, 35.5]];
    const side = (sd) => rows.map(([y, hw]) => [spineX(R, y) + sd * hw * w, y + (y > -170 ? (sd === ws ? -2 : 2) : 0)]);
    const Ls = side(-1), Rs = side(1);
    const hem = quadPts(Ls[Ls.length - 1], [spineX(R, -147), -143], Rs[Rs.length - 1], 6).slice(1, -1);
    const neck = quadPts(CL(1), [N[0], N[1] + (P.tee ? 8 : 16)], CL(-1), 8).slice(1, -1);
    return { pts: [...slope(-1), ...Ls, ...hem, ...Rs.reverse(), ...slope(1).reverse(), ...neck], slope, CL };
  }
  function torsoDetail(x, R, P, Tp) {
    const { N, ws, PC, w } = R;
    if (P.tee) fold(x, quadPts(V.add(Tp.CL(1), [-2.5, 3.5]), [N[0], N[1] + 12.5], V.add(Tp.CL(-1), [2.5, 3.5]), 8), 2.3); // neckband
    else { // coveralls: pointed collar, zip, chest pocket
      for (const sd of [-1, 1]) flat(x, [V.add(Tp.CL(sd), [sd * 1, -1]), [N[0] + sd * 23, N[1] + 3], [N[0] + sd * 14, N[1] + 16], [N[0] + sd * 2, N[1] + 15]], P.shirt, P.seed + 80 + sd);
      fold(x, [[N[0], N[1] + 17], [spineX(R, -200), -200], [spineX(R, -150), -150]], 2.4);
      const px = spineX(R, -205) + 12 * w;
      fold(x, [[px, -212], [px + 17, -213]], 2.6); fold(x, [[px + 1, -212], [px + 1.5, -198], [px + 16, -197.5], [px + 17, -213]], 2.2);
    }
    const yW = -172, xw = spineX(R, yW) + ws * 30 * w; // fabric gathers over the weight hip, pulls from the far armpit
    fold(x, [[xw, yW], [xw - ws * 9, yW + 3], [xw - ws * 14, yW + 2]]);
    fold(x, [[xw + ws, yW + 10], [xw - ws * 8, yW + 13]]);
    const xa = spineX(R, -205) - ws * 29 * w;
    fold(x, [[xa, -205], [xa + ws * 8, -196], [xa + ws * 9, -187]]);
    fold(x, [[PC[0] - ws * 13, -146], [PC[0] - ws * 11, -155]]);
  }
  function sleeve(x, R, P, sd, A) {
    const Tp = torsoParts(R, P), RT = Tp.slope(sd)[5], RB = [spineX(R, -208) + sd * 31 * R.w, -208];
    const L1 = Math.hypot(A.E[0] - A.S[0], A.E[1] - A.S[1]), d = V.unit(V.sub(A.E, A.S)), long = !P.tee, k = long ? 0.88 : 0.47;
    const Hm = V.add(A.S, V.mul(d, L1 * k));
    let nt = V.perp(d); if (V.dot(nt, V.sub(RB, A.S)) > 0) nt = V.mul(nt, -1);
    const hw0 = 12.5, hw1 = long ? 9.5 : 11.5, HT = V.add(Hm, V.mul(nt, hw1)), HB = V.add(Hm, V.mul(nt, -hw1));
    const capP = V.add(A.S, V.add(V.mul(nt, hw0 * 0.9), V.mul(d, -3))), capQ = V.add(A.S, V.add(V.mul(nt, hw0), V.mul(d, 9)));
    const outline = [...chaikin([RT, capP, capQ, HT], 2), ...quadPts(HT, V.add(Hm, V.mul(d, 2.5)), HB, 5).slice(1),
      ...quadPts(HB, V.add(V.add(A.S, V.mul(d, L1 * k * 0.45)), V.mul(nt, -hw0)), RB, 6).slice(1)];
    const Wp = wob(outline, false, P.seed + sd * 5 + 40, 0.3);
    x.fillStyle = P.shirt; x.fill(toPath(Wp, true));
    x.save(); x.lineWidth = PLW; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(toPath(Wp, false)); x.restore();
    if (long) flat(x, tube([V.add(Hm, V.mul(d, -1)), V.add(Hm, V.mul(d, 4)), V.add(Hm, V.mul(d, 8))], (u) => 2 * hw1 + 3.5 - u * 1.5, 0.15, 0.15), P.shirt, P.seed + sd + 50, PLW, 0.2);
    else fold(x, [V.add(V.add(HT, V.mul(d, -4)), V.mul(nt, -1.5)), V.add(Hm, V.mul(d, -2.8)), V.add(V.add(HB, V.mul(d, -4)), V.mul(nt, 1.5))], 2.2);
    fold(x, [V.add(V.add(RB, V.mul(d, 5)), V.mul(nt, 2)), V.add(V.mix(RB, HB, 0.6), V.mul(nt, 4.5))], 2.3);
  }
  function arm(x, R, P, sd, o) {
    const A = armChain(R, P, sd, o), idx = sd < 0 ? 0 : 1, pose = (o.hands && o.hands[idx]) || 'relax';
    const armP = tube(chaikin([A.S, A.E, A.W], 2), (u) => lerp(12.5, 7.2, u) + Math.sin(Math.PI * cl((u - 0.45) / 0.55)), 0, 0);
    const fd = V.unit(V.sub(A.W, A.E)), nr = V.perp(fd);
    const side = pose === 'point' ? (nr[1] <= 0 ? 1 : -1) : (V.dot(nr, [-sd, 0]) >= 0 ? 1 : -1);
    const Hd = handParts(A.W, Math.atan2(fd[1], fd[0]) + side * (pose === 'relax' ? 0.12 : 0), side, pose), seed = P.seed * 7 + sd * 3;
    flatUnion(x, [[armP, P.skin, seed, 0.3], [Hd.palm, P.skin, seed + 1, 0.12], [Hd.thumb, P.skin, seed + 2, 0.1], ...Hd.F.filter((f) => !f.over).map((f, i) => [f.pts, P.skin, seed + 3 + i, 0.1])]);
    Hd.F.filter((f) => f.over).forEach((f, i) => flat(x, f.pts, P.skin, seed + 9 + i, PLW * 0.9, 0.1));
    sleeve(x, R, P, sd, A);
  }
  function headPts(R, P, dir, jaw = 52) {
    const { HC } = R, rx = 50, out = [];
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * TAU, c = Math.cos(a), s = Math.sin(a);
      let px, py;
      if (s <= 0) { px = c * rx; py = s * 56; }
      else { const j = Math.pow(s, 1.5); px = c * rx * (1 - 0.4 * j) * (1 + 0.07 * Math.exp(-Math.pow((s - 0.55) / 0.16, 2))) + dir * 9 * j; py = s * jaw; }
      const k = 1 + 0.025 * NZ.n2(c * 1.7 + P.seed, s * 1.7);
      out.push([HC[0] + px * k, HC[1] + py * k]);
    }
    return out;
  }
  const neckPts = (R, dir) => { const { N, HC } = R; return [...quadPts([HC[0] - 11 + dir * 5, HC[1] + 28], [N[0] - 9.5, N[1] - 6], [N[0] - 17, N[1] + 6], 6), ...quadPts([N[0] + 17, N[1] + 6], [N[0] + 9.5, N[1] - 6], [HC[0] + 11 + dir * 5, HC[1] + 28], 6)]; };
  const earPts = (c, sd) => { const out = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; out.push([c[0] + sd * Math.cos(a) * 9 * (1 - 0.18 * Math.sin(a)), c[1] + Math.sin(a) * 12.5]); } out.push([c[0] - sd * 5, c[1] + 10], [c[0] - sd * 5, c[1] - 10]); return out; };
  function curlsPts(HC, dir) {
    const cx = HC[0] + dir * 2, cy = HC[1], out = [];
    for (let i = 0; i <= 48; i++) { const u = i / 48, a = Math.PI - 0.34 + u * (Math.PI + 0.68), b = Math.abs(Math.sin(u * Math.PI * 9)); out.push([cx + Math.cos(a) * (55 + 6 * b), cy - 4 + Math.sin(a) * (60 + 6 * b)]); }
    for (let i = 0; i <= 26; i++) { const u = i / 26, b = Math.abs(Math.sin(u * Math.PI * 6)); out.push([cx + lerp(47, -47, u), cy - 24 + 30 * Math.pow(Math.abs(u - 0.5) * 2, 3) + 5 * b]); }
    return out;
  }
  const puffPts = (cx, cy, seed) => { const out = []; for (let i = 0; i < 44; i++) { const a = (i / 44) * TAU, b = 1 + 0.05 * Math.abs(Math.sin(a * 6)) + 0.05 * NZ.n2(Math.cos(a) * 1.5 + seed, Math.sin(a) * 1.5); out.push([cx + Math.cos(a) * 64 * b, cy + Math.sin(a) * 50 * b]); } return out; };
  function capPts(HC, dir) {
    const cx = HC[0] + dir * 2, cy = HC[1], out = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + 0.12 + (i / 24) * (Math.PI - 0.24); out.push([cx + Math.cos(a) * 52, cy + Math.sin(a) * 58]); }
    for (let i = 0; i <= 16; i++) { const u = i / 16; out.push([cx + lerp(50, -50, u), cy - 26 + 22 * Math.pow(Math.abs(u - 0.5) * 2, 2.5) + dir * 3 * (u - 0.5)]); }
    return out;
  }
  // face: two equal eyes with blob pupils that blink together, a hooked nose line, the mouth
  function headDraw(x, R, P, o) {
    const dir = o.dir || 0, { HC } = R, t = o.t || 0, sx = dir < 0 ? -1 : 1, seed = P.seed;
    const ears = [-1, 1].filter((sd) => !(Math.abs(dir) > 0.3 && Math.sign(dir) === sd)).map((sd) => { const c = [HC[0] + sd * 48 + dir * 3, HC[1] + 7]; flat(x, earPts(c, sd), P.skin, seed + 70 + sd, PLW, 0.15); return [c, sd]; });
    flat(x, headPts(R, P, dir, o.mouth === 'open' ? 58 : 52), P.skin, seed + 3, PLW, 0.25);
    ears.forEach(([c, sd]) => fold(x, [[c[0] + sd * 5.5, c[1] - 6], [c[0] + sd * 2, c[1]], [c[0] + sd * 5, c[1] + 6]], 2.2));
    if (P.hair === 'curls') flat(x, curlsPts(HC, dir), P.hairCol, seed + 4, PLW, 0.2);
    if (P.hair === 'puff') flat(x, capPts(HC, dir), P.hairCol, seed + 4, PLW, 0.2);
    if (P.goggles) {
      flat(x, tube(quadPts([HC[0] - 51, HC[1] - 22], [HC[0], HC[1] - 40], [HC[0] + 51, HC[1] - 22], 10), () => 9), '#3b3330', seed + 5, PLW, 0.15);
      for (const sd of [-1, 1]) { const gx = HC[0] + dir * 8 + sd * 19, gy = HC[1] - 31; flat(x, [...Array(16)].map((_, i) => [gx + Math.cos((i / 16) * TAU) * 13, gy + Math.sin((i / 16) * TAU) * 12]), C.lime, seed + 6 + sd, PLW, 0.15); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(gx - 4, gy - 4, 4, 2.4, -0.6, 0, TAU); x.fill(); }
    }
    const ex = HC[0] + dir * 10, ey = HC[1] + 2, bl = o.shut ? 1 : blinkAt(t, o.ph || 0), look = o.look || [dir * 0.8, 0];
    for (const sd of [-1, 1]) eye(x, ex + sd * (P.glasses ? 18.5 : 17), ey, P.glasses ? 13 : 14.5, { look, blink: bl, wide: o.wide, lid: o.lid, skin: P.skin, seed: P.seed * 10 + sd });
    if (P.glasses) { x.save(); x.strokeStyle = C.ink; x.lineWidth = 2.4; for (const sd of [-1, 1]) { x.save(); x.translate(ex + sd * 19.5, ey); x.stroke(OV(0, 0, 18, 17, 0.3).path); x.restore(); } fold(x, [[ex - 2.5, ey - 5], [ex, ey - 7], [ex + 2.5, ey - 5]], 2.6); x.restore(); }
    if (o.brows) for (const sd of [-1, 1]) { const bx = ex + sd * 17; line(x, sd < 0 ? [[bx - 12, ey - 21], [bx + 10, ey - 27 - 4 * o.brows]] : [[bx - 10, ey - 27 - 4 * o.brows], [bx + 12, ey - 21]], 4); }
    const nx = HC[0] + dir * 17, ny = HC[1] + 19;
    fold(x, [[nx + sx * 1, ny - 6], [nx + sx * 7, ny + 3], [nx + sx * 1.5, ny + 6]], 3);
    mouth(x, HC[0] + dir * 12, HC[1] + 36, o.mouth || 'flat', dir);
    if (o.sweat) { const k = (twos(t) * 1.6) % 1; x.save(); x.translate(HC[0] - sx * 50, HC[1] - 24 + k * 26); flat(x, [[0, -14], [6, -3], [6, 4], [0, 8], [-6, 4], [-6, -3]], '#9fd8f0', seed + 90, PLW, 0.1); x.restore(); }
  }
  function person(x, cx, fy, s, P, o = {}) {
    const R = rig(P, o), dir = o.dir || 0;
    x.save(); x.translate(cx, fy); x.scale(s, s);
    if (o.legs !== false) legsDraw(x, R, P);
    if (P.hair === 'puff') flat(x, puffPts(R.HC[0] - dir * 4, R.HC[1] - 44, P.seed), P.hairCol, P.seed + 60, PLW, 0.3);
    flat(x, neckPts(R, dir), P.skin, P.seed + 1, PLW, 0.2);
    const Tp = torsoParts(R, P); flat(x, Tp.pts, P.shirt, P.seed + 2);
    torsoDetail(x, R, P, Tp);
    for (const sd of [-1, 1]) if (o.armFront !== sd) arm(x, R, P, sd, o);
    headDraw(x, R, P, o);
    x.restore();
  }
  function personArm(x, cx, fy, s, P, sd, o) { x.save(); x.translate(cx, fy); x.scale(s, s); arm(x, rig(P, o), P, sd, o); x.restore(); }
