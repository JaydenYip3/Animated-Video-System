  // ---------- people build: uncanny ----------
  // Unsettlingly skinny: long legs and a long thin neck with tendon lines; narrow bony shoulders that slope from the neck in
  // one line; stick limbs that taper shoulder to wrist and hip to ankle with knobby elbows, knees and wrists; hands with a
  // palm wider than the wrist, three long spidery tapered fingers with knuckle bumps and an angled thumb; clothes are a
  // looser separate layer (sleeves much wider than the arm with a hem or rolled cuff, high-water trousers bunching above
  // bare stick ankles, folds at armpit, waist, crotch and the bent knee); shoes with a defined toe and a flat sole band.
  // Uncanny: a long gaunt irregular-oval head with hollow cheeks, a hard jaw corner and a long chin that runs into the
  // neck; sagging lines under the eyes; one eye slightly bigger with a smaller pupil; the gaze drifts apart; the eyes blink
  // out of step; a resting head tilt with a two-drawing twitch every few seconds. Weight sits on one leg, pelvis and
  // shoulders tilt against each other and the spine slouches between them. The open mouth and the too-wide 'grin' suit it.
  // A person P: { id, seed, tilt (resting head tilt), bigEye (-1|1: the slightly bigger eye), skin, shirt, pants, shoes,
  //   sole, hair ('curls'|'puff'), hairCol, glasses, goggles, tee (true: T-shirt with short sleeves; false: coveralls with
  //   rolled long sleeves), w (width scale), arm (arm length scale) }. The rig is about 445 units tall: PS = 0.85.
  const PEOPLE_BUILD = 'uncanny', PS = 0.85;
  // the pose rig: feet at the origin, about 445 units to the top of the hair (drawn at PS = 0.85). Unsettlingly skinny:
  // long legs and a long thin neck, narrow bony shoulders, stick limbs with knobby joints, a slouching spine.
  function rig(P, o) {
    const T = twos(o.t || 0), ws = o.weight || 1, ph = o.ph || 0, w = P.w || 1;
    const bob = Math.sin(T * 2.2 + ph) * 1.2, sway = Math.sin(T * 1.3 + ph * 2) * 1.4;
    const PC = [ws * 4 + sway * 0.6, -186];
    const legs = {};
    for (const sd of [-1, 1]) {
      const Hj = [PC[0] + sd * 10 * w, PC[1] + (sd === ws ? -3 : 3)], stand = sd === ws;
      const A = stand ? [PC[0] * 0.3 + sd * 8 * w, -13] : [sd * 24 * w - ws * 2, -13];
      const K = stand ? V.add(V.mix(Hj, A, 0.5), [sd * 1.5, 0]) : V.add(V.mix(Hj, A, 0.5), [-sd * 6, 2]);
      legs[sd] = { H: Hj, K, A, toe: stand ? sd * 0.5 : sd };
    }
    const N = [-ws * 1.5 + sway * 0.2, -282 + bob * 0.5];
    const spine = quadPts(PC, [-ws * 7, -236], N, 8);
    const S = (sd) => [N[0] + sd * 27 * w, -269 + (sd === ws ? 3 : -2) + bob * 0.4];
    const HC = [N[0] + (o.dir || 0) * 4 - ws * 2, -370 + bob];
    return { T, ws, w, PC, legs, N, spine, S, HC, AL: [66, 62] }; // AL: upper and fore arm lengths
  }
  const knob = (u, c, wd) => Math.exp(-Math.pow((u - c) / wd, 2)); // a knobby joint along a limb
  // hands: palm wider than the wrist, three long spidery fingers with knuckle bumps, a long angled thumb on the inner side
  const HANDS = {
    relax: { sp: 0.11, curl: [0.6, 0.55, 0.45], k: [1, 1, 1], th: 0.62, thc: -0.25, over: [0, 0, 0] },
    open: { sp: 0.3, curl: [-0.06, -0.04, -0.04], k: [1, 1, 1], th: 1.1, thc: 0.05, over: [0, 0, 0] },
    point: { sp: 0.06, curl: [2.6, 2.5, 0.04], k: [0.75, 0.75, 1.1], th: 0.45, thc: -0.35, over: [1, 1, 0] },
    grip: { sp: 0.04, curl: [2.7, 2.65, 2.6], k: [0.8, 0.8, 0.8], th: 0.35, thc: -0.5, over: [1, 1, 1] },
  };
  function handParts(Wr, ang, side, pose) {
    const H = HANDS[pose] || HANDS.relax, d = [Math.cos(ang), Math.sin(ang)], nv = V.mul(V.perp(d), side);
    const L = ([u, v]) => [Wr[0] + d[0] * u + nv[0] * v, Wr[1] + d[1] * u + nv[1] * v];
    const palm = [[-7, -2.4], [2, -3.2], [8, -5.2], [13.5, -5], [15.2, -2.2], [15.4, 1.4], [13.8, 3.9], [9, 5.4], [3, 4.4], [-7, 2.4]].map(L);
    const finger = (u0, v0, a0, curl, ln, w0, w1) => {
      const P = [[u0, v0]]; let a = a0, p = [u0, v0];
      [0.3, 0.37, 0.33].forEach((f, j) => { a += curl * (j === 0 ? 0.15 : 0.5); p = [p[0] + Math.cos(a) * ln * f, p[1] + Math.sin(a) * ln * f]; P.push(p); });
      return tube(chaikin(P.map(L), 1), (u) => lerp(w0, w1, u) + 0.5 * knob(u, 0.32, 0.07) + 0.4 * knob(u, 0.68, 0.07), 1, 0);
    };
    const F = [[-3.6, 15], [-0.2, 19], [3.2, 17]].map(([v0, ln], j) => ({ pts: finger(12.5, v0, (j - 1) * H.sp, H.curl[j], ln * H.k[j], 3.1, 1.8), over: H.over[j] }));
    return { palm, thumb: finger(3, 3.8, H.th, H.thc, 15, 3.4, 2.1), F };
  }
  function legsDraw(x, R, P) {
    for (const sd of [-1, 1]) { const A = R.legs[sd].A; flat(x, tube([V.add(A, [0, -26]), V.add(A, [0, -4])], (u) => 4.8 - u * 0.6 + 1.2 * knob(u, 0.78, 0.12)), P.skin, P.seed + 24 + sd, PLW, 0.12); } // bare stick ankles
    for (const sd of [-1, 1]) shoe(x, R.legs[sd].A, R.legs[sd].toe, P, P.seed + 20 + sd);
    const pl = [-1, 1].map((sd) => {
      const L = R.legs[sd], Cn = chaikin([L.H, L.K, V.add(L.A, [0, -20])], 2);
      const wf = (u) => (u < 0.5 ? lerp(22, 15.5, u / 0.5) : lerp(15.5, 15, (u - 0.5) / 0.5)) + 2.4 * knob(u, 0.5, 0.07) + (u > 0.84 ? 1.1 * Math.sin(((u - 0.84) / 0.16) * Math.PI * 3) + 2.2 * ((u - 0.84) / 0.16) : 0);
      return { sd, L, Cn, pts: tube(Cn, wf, 0.3, 0) };
    });
    const { PC, ws } = R;
    const seat = [[PC[0] - 19, -212], [PC[0] + 19, -212], [PC[0] + 21.5, -184], [PC[0] + 3, -168], [PC[0] - 3, -168], [PC[0] - 21.5, -184]];
    flatUnion(x, [[seat, P.pants, P.seed + 30], ...pl.map((l) => [l.pts, P.pants, P.seed + 31 + l.sd])]);
    for (const sd of [-1, 1]) fold(x, [[PC[0] + sd * 2.5, -171], [PC[0] + sd * 7, -179], [PC[0] + sd * 8, -186]], 2.2); // crotch
    for (const l of pl) {
      const inn = (f) => (V.dot(f.n, [-l.sd, 0]) >= 0 ? f.n : V.mul(f.n, -1));
      if (l.sd !== ws) { const k = along(l.Cn, 0.5), ni = inn(k); fold(x, [V.add(k.p, V.mul(ni, 7.5)), V.add(V.add(k.p, V.mul(ni, 2.5)), V.mul(k.d, 3))]); fold(x, [V.add(V.add(k.p, V.mul(ni, 8)), V.mul(k.d, 9)), V.add(V.add(k.p, V.mul(ni, 3)), V.mul(k.d, 11))]); }
      const a = along(l.Cn, 0.86), b = along(l.Cn, 0.94), na = inn(a), nb = inn(b);
      fold(x, [V.add(a.p, V.mul(na, 7.5)), V.add(V.add(a.p, V.mul(na, 2.5)), V.mul(a.d, 2)), V.add(a.p, V.mul(na, 0))], 2.2);
      fold(x, [V.add(b.p, V.mul(nb, -7.5)), V.add(V.add(b.p, V.mul(nb, -2.5)), V.mul(b.d, 2))], 2.2);
    }
  }
  function torsoParts(R, P) {
    const { N, ws, w } = R, CL = (sd) => [N[0] + sd * 9.5 * w, N[1] - 1];
    const slope = (sd) => quadPts(CL(sd), [N[0] + sd * 18 * w, N[1] + 1], R.S(sd), 8);
    const rows = [[-254, 23.5], [-236, 21.5], [-217, 20], [-198, 21.5], [-180, 24.5]]; // the shirt hangs off a narrow frame
    const side = (sd) => rows.map(([y, hw]) => [spineX(R, y) + sd * hw * w, y + (y > -205 ? (sd === ws ? -2 : 2) : 0)]);
    const Ls = side(-1), Rs = side(1);
    const hem = quadPts(Ls[Ls.length - 1], [spineX(R, -180), -176], Rs[Rs.length - 1], 6).slice(1, -1);
    const neck = quadPts(CL(1), [N[0], N[1] + (P.tee ? 12 : 16)], CL(-1), 8).slice(1, -1);
    return { pts: [...slope(-1), ...Ls, ...hem, ...Rs.reverse(), ...slope(1).reverse(), ...neck], slope, CL };
  }
  function torsoDetail(x, R, P, Tp) {
    const { N, ws, PC, w } = R;
    if (P.tee) fold(x, quadPts(V.add(Tp.CL(1), [-2.5, 3.5]), [N[0], N[1] + 16.5], V.add(Tp.CL(-1), [2.5, 3.5]), 8), 2.2); // neckband
    else { // coveralls: pointed collar, zip, chest pocket
      for (const sd of [-1, 1]) flat(x, [V.add(Tp.CL(sd), [sd * 1, -1]), [N[0] + sd * 17, N[1] + 3], [N[0] + sd * 11, N[1] + 16], [N[0] + sd * 2, N[1] + 15]], P.shirt, P.seed + 80 + sd);
      fold(x, [[N[0], N[1] + 17], [spineX(R, -235), -235], [spineX(R, -185), -185]], 2.3);
      const px = spineX(R, -245) + 6 * w;
      fold(x, [[px, -252], [px + 12, -253]], 2.4); fold(x, [[px + 1, -252], [px + 1.5, -241], [px + 11, -240.5], [px + 12, -253]], 2);
    }
    const yW = -205, xw = spineX(R, yW) + ws * 20 * w; // fabric gathers over the weight hip, pulls from the far armpit, hangs from the shoulder
    fold(x, [[xw, yW], [xw - ws * 7, yW + 3], [xw - ws * 11, yW + 2]]);
    fold(x, [[xw + ws, yW + 9], [xw - ws * 6, yW + 12]]);
    const xa = spineX(R, -250) - ws * 19 * w;
    fold(x, [[xa, -250], [xa + ws * 6, -241], [xa + ws * 7, -232]]);
    const sh = R.S(ws); fold(x, [[sh[0] - ws * 7, -262], [sh[0] - ws * 9, -248], [sh[0] - ws * 8.5, -236]], 2.2);
    fold(x, [[PC[0] - ws * 10, -180], [PC[0] - ws * 8.5, -189]]);
  }
  function sleeve(x, R, P, sd, A) {
    const Tp = torsoParts(R, P), RT = Tp.slope(sd)[5], RB = [spineX(R, -252) + sd * 21 * R.w, -252];
    const L1 = Math.hypot(A.E[0] - A.S[0], A.E[1] - A.S[1]), d = V.unit(V.sub(A.E, A.S)), long = !P.tee, k = long ? 0.88 : 0.45;
    const Hm = V.add(A.S, V.mul(d, L1 * k));
    let nt = V.perp(d); if (V.dot(nt, V.sub(RB, A.S)) > 0) nt = V.mul(nt, -1);
    const hw0 = 10, hw1 = long ? 8 : 10, HT = V.add(Hm, V.mul(nt, hw1)), HB = V.add(Hm, V.mul(nt, -hw1));
    const capP = V.add(A.S, V.add(V.mul(nt, hw0 * 0.9), V.mul(d, -3))), capQ = V.add(A.S, V.add(V.mul(nt, hw0), V.mul(d, 9)));
    const outline = [...chaikin([RT, capP, capQ, HT], 2), ...quadPts(HT, V.add(Hm, V.mul(d, 2.5)), HB, 5).slice(1),
      ...quadPts(HB, V.add(V.add(A.S, V.mul(d, L1 * k * 0.45)), V.mul(nt, -hw0)), RB, 6).slice(1)];
    const Wp = wob(outline, false, P.seed + sd * 5 + 40, 0.3);
    x.fillStyle = P.shirt; x.fill(toPath(Wp, true));
    x.save(); x.lineWidth = PLW; x.strokeStyle = C.ink; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(toPath(Wp, false)); x.restore();
    if (long) flat(x, tube([V.add(Hm, V.mul(d, -1)), V.add(Hm, V.mul(d, 4)), V.add(Hm, V.mul(d, 8))], (u) => 2 * hw1 + 3.5 - u * 1.5, 0.15, 0.15), P.shirt, P.seed + sd + 50, PLW, 0.2);
    else fold(x, [V.add(V.add(HT, V.mul(d, -4)), V.mul(nt, -1.5)), V.add(Hm, V.mul(d, -2.8)), V.add(V.add(HB, V.mul(d, -4)), V.mul(nt, 1.5))], 2.1);
    fold(x, [V.add(V.add(RB, V.mul(d, 5)), V.mul(nt, 2)), V.add(V.mix(RB, HB, 0.6), V.mul(nt, 3.5))], 2.2);
  }
  function arm(x, R, P, sd, o) {
    const A = armChain(R, P, sd, o), idx = sd < 0 ? 0 : 1, pose = (o.hands && o.hands[idx]) || 'relax';
    const armP = tube(chaikin([A.S, A.E, A.W], 2), (u) => lerp(7.6, 4.3, u) + 1.9 * knob(u, 0.5, 0.07) + 0.9 * knob(u, 0.96, 0.05), 0, 0); // stick arm, knobby elbow and wrist
    const fd = V.unit(V.sub(A.W, A.E)), nr = V.perp(fd);
    const side = pose === 'point' ? (nr[1] <= 0 ? 1 : -1) : (V.dot(nr, [-sd, 0]) >= 0 ? 1 : -1);
    const Hd = handParts(A.W, Math.atan2(fd[1], fd[0]) + side * (pose === 'relax' ? 0.12 : 0), side, pose), seed = P.seed * 7 + sd * 3;
    flatUnion(x, [[armP, P.skin, seed, 0.2], [Hd.palm, P.skin, seed + 1, 0.12], [Hd.thumb, P.skin, seed + 2, 0.08], ...Hd.F.filter((f) => !f.over).map((f, i) => [f.pts, P.skin, seed + 3 + i, 0.08])]);
    Hd.F.filter((f) => f.over).forEach((f, i) => flat(x, f.pts, P.skin, seed + 9 + i, PLW * 0.9, 0.08));
    sleeve(x, R, P, sd, A);
  }
  // a long gaunt head: hollow under the cheekbones, a hard jaw corner, a long chin
  function headPts(R, P, dir, jaw = 60) {
    const { HC } = R, rx = 46, out = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, c = Math.cos(a), s = Math.sin(a);
      let px, py;
      if (s <= 0) { px = c * rx; py = s * 60; }
      else { const j = Math.pow(s, 1.4); px = c * rx * (1 - 0.5 * j) * (1 - 0.09 * knob(s, 0.42, 0.11) + 0.08 * knob(s, 0.72, 0.1)) + dir * 9 * j; py = s * jaw; }
      const k = 1 + 0.03 * NZ.n2(c * 1.7 + P.seed, s * 1.7);
      out.push([HC[0] + px * k, HC[1] + py * k]);
    }
    return out;
  }
  const neckPts = (R, dir) => { const { N, HC } = R; return [...quadPts([HC[0] - 6 + dir * 5, HC[1] + 36], [N[0] - 5.5, N[1] - 16], [N[0] - 12, N[1] + 8], 8), ...quadPts([N[0] + 12, N[1] + 8], [N[0] + 5.5, N[1] - 16], [HC[0] + 6 + dir * 5, HC[1] + 36], 8)]; };
  const earPts = (c, sd) => { const out = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; out.push([c[0] + sd * Math.cos(a) * 10 * (1 - 0.18 * Math.sin(a)), c[1] + Math.sin(a) * 14]); } out.push([c[0] - sd * 5, c[1] + 11], [c[0] - sd * 5, c[1] - 11]); return out; };
  function curlsPts(HC, dir) {
    const cx = HC[0] + dir * 2, cy = HC[1], out = [];
    for (let i = 0; i <= 48; i++) { const u = i / 48, a = Math.PI - 0.34 + u * (Math.PI + 0.68), b = Math.abs(Math.sin(u * Math.PI * 9)); out.push([cx + Math.cos(a) * (51 + 6 * b), cy - 4 + Math.sin(a) * (64 + 6 * b)]); }
    for (let i = 0; i <= 26; i++) { const u = i / 26, b = Math.abs(Math.sin(u * Math.PI * 6)); out.push([cx + lerp(43, -43, u), cy - 27 + 30 * Math.pow(Math.abs(u - 0.5) * 2, 3) + 5 * b]); }
    return out;
  }
  const puffPts = (cx, cy, seed) => { const out = []; for (let i = 0; i < 44; i++) { const a = (i / 44) * TAU, b = 1 + 0.05 * Math.abs(Math.sin(a * 6)) + 0.05 * NZ.n2(Math.cos(a) * 1.5 + seed, Math.sin(a) * 1.5); out.push([cx + Math.cos(a) * 60 * b, cy + Math.sin(a) * 48 * b]); } return out; };
  function capPts(HC, dir) {
    const cx = HC[0] + dir * 2, cy = HC[1], out = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + 0.12 + (i / 24) * (Math.PI - 0.24); out.push([cx + Math.cos(a) * 48, cy + Math.sin(a) * 62]); }
    for (let i = 0; i <= 16; i++) { const u = i / 16; out.push([cx + lerp(46, -46, u), cy - 29 + 22 * Math.pow(Math.abs(u - 0.5) * 2, 2.5) + dir * 3 * (u - 0.5)]); }
    return out;
  }
  // uncanny face: one eye a little bigger with a smaller pupil, a gaze that drifts apart, eyes that blink out of step,
  // a permanent head tilt with an occasional two-drawing twitch, hollow cheeks, sagging lines under the eyes
  function headDraw(x, R, P, o) {
    const dir = o.dir || 0, { HC } = R, t = o.t || 0, sx = dir < 0 ? -1 : 1, seed = P.seed, ph = o.ph || 0;
    const twitch = (twos(t) + ph * 1.9) % 2.9 < 0.17 ? 1 : 0, tilt = (P.tilt || 0) + twitch * 0.14 * (seed % 2 ? 1 : -1);
    x.save(); x.translate(HC[0], HC[1] + 40); x.rotate(tilt); x.translate(-HC[0] - twitch * 2, -HC[1] - 40);
    const ears = [-1, 1].filter((sd) => !(Math.abs(dir) > 0.3 && Math.sign(dir) === sd)).map((sd) => { const c = [HC[0] + sd * 44 + dir * 3, HC[1] + 9]; flat(x, earPts(c, sd), P.skin, seed + 70 + sd, PLW, 0.15); return [c, sd]; });
    flat(x, headPts(R, P, dir, o.mouth === 'open' ? 66 : 60), P.skin, seed + 3, PLW, 0.25);
    ears.forEach(([c, sd]) => fold(x, [[c[0] + sd * 6, c[1] - 7], [c[0] + sd * 2.5, c[1]], [c[0] + sd * 5.5, c[1] + 7]], 2.1));
    if (P.hair === 'curls') flat(x, curlsPts(HC, dir), P.hairCol, seed + 4, PLW, 0.2);
    if (P.hair === 'puff') flat(x, capPts(HC, dir), P.hairCol, seed + 4, PLW, 0.2);
    if (P.goggles) {
      flat(x, tube(quadPts([HC[0] - 47, HC[1] - 25], [HC[0], HC[1] - 45], [HC[0] + 47, HC[1] - 25], 10), () => 8.5), '#3b3330', seed + 5, PLW, 0.15);
      for (const sd of [-1, 1]) { const gx = HC[0] + dir * 8 + sd * 17, gy = HC[1] - 35; flat(x, [...Array(16)].map((_, i) => [gx + Math.cos((i / 16) * TAU) * 12, gy + Math.sin((i / 16) * TAU) * 11]), C.lime, seed + 6 + sd, PLW, 0.15); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(gx - 4, gy - 4, 4, 2.4, -0.6, 0, TAU); x.fill(); }
    }
    // hollow cheeks under the cheekbones
    for (const sd of [-1, 1]) fold(x, [[HC[0] + dir * 5 + sd * 31, HC[1] + 15], [HC[0] + dir * 5 + sd * 26.5, HC[1] + 27], [HC[0] + dir * 5 + sd * 28, HC[1] + 37]], 2.1);
    const ex = HC[0] + dir * 10, ey = HC[1] + 2, look = o.look || [dir * 0.8, 0];
    for (const sd of [-1, 1]) {
      const big = sd === (P.bigEye || 1), r0 = (P.glasses ? 13 : 14) * (big ? 1.14 : 1), cx = ex + sd * (P.glasses ? 18.5 : 17);
      const bl = o.shut ? 1 : blinkAt(t, ph + (sd > 0 ? 1.37 : 0));
      eye(x, cx, ey, r0, { look: [look[0] + sd * 0.14, look[1] + (big ? 0.08 : 0)], blink: bl, wide: o.wide, lid: o.lid, skin: P.skin, seed: P.seed * 10 + sd, pr: big ? 0.15 : 0.21 });
      if (!o.shut) fold(x, [[cx - 7.5, ey + r0 + 2], [cx, ey + r0 + 4.5], [cx + 7.5, ey + r0 + 2]], 1.9); // sag under the eye
    }
    if (P.glasses) { x.save(); x.strokeStyle = C.ink; x.lineWidth = 2.4; for (const sd of [-1, 1]) { x.save(); x.translate(ex + sd * 19.5, ey); x.stroke(OV(0, 0, 18, 17, 0.3).path); x.restore(); } fold(x, [[ex - 2.5, ey - 5], [ex, ey - 7], [ex + 2.5, ey - 5]], 2.6); x.restore(); }
    if (o.brows) for (const sd of [-1, 1]) { const bx = ex + sd * 17; line(x, sd < 0 ? [[bx - 12, ey - 22], [bx + 10, ey - 28 - 4 * o.brows]] : [[bx - 10, ey - 28 - 4 * o.brows], [bx + 12, ey - 22]], 4); }
    const nx = HC[0] + dir * 17, ny = HC[1] + 21;
    fold(x, [[nx + sx * 1, ny - 7], [nx + sx * 7.5, ny + 3], [nx + sx * 1.5, ny + 6.5]], 3);
    mouth(x, HC[0] + dir * 12, HC[1] + 40, o.mouth || 'flat', dir);
    if (o.sweat) { const k = (twos(t) * 1.6) % 1; x.save(); x.translate(HC[0] - sx * 47, HC[1] - 24 + k * 26); flat(x, [[0, -14], [6, -3], [6, 4], [0, 8], [-6, 4], [-6, -3]], '#9fd8f0', seed + 90, PLW, 0.1); x.restore(); }
    x.restore();
  }
  function person(x, cx, fy, s, P, o = {}) {
    const R = rig(P, o), dir = o.dir || 0, { N, HC } = R;
    x.save(); x.translate(cx, fy); x.scale(s, s);
    if (o.legs !== false) legsDraw(x, R, P);
    if (P.hair === 'puff') flat(x, puffPts(HC[0] - dir * 4, HC[1] - 46, P.seed), P.hairCol, P.seed + 60, PLW, 0.3);
    flat(x, neckPts(R, dir), P.skin, P.seed + 1, PLW, 0.15);
    for (const sd of [-1, 1]) fold(x, [[HC[0] + dir * 5 + sd * 3.5, HC[1] + 58], [N[0] + sd * 2.5, N[1] - 10], [N[0] + sd * 1, N[1] - 1]], 1.7); // neck tendons
    const Tp = torsoParts(R, P); flat(x, Tp.pts, P.shirt, P.seed + 2);
    torsoDetail(x, R, P, Tp);
    for (const sd of [-1, 1]) if (o.armFront !== sd) arm(x, R, P, sd, o);
    headDraw(x, R, P, o);
    x.restore();
  }
  function personArm(x, cx, fy, s, P, sd, o) { x.save(); x.translate(cx, fy); x.scale(s, s); arm(x, rig(P, o), P, sd, o); x.restore(); }
