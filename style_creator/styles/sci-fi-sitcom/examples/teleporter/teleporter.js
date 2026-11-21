    // ---------- EXAMPLE: "How would a teleporter work?" (10 s). Reuses every helper above: cel, union, arrow, letters,
    // sign/callout, eye, bang, glow, finish, twos, the camera, and the people (person / personArm). Adds a cast, a garage
    // lab, pads and beams. Runs with either people build: PS and PEOPLE_BUILD come from the style's people file. ----------
    const TL = {
      title: 0.1, shrink: [1.15, 1.5], lever: 1.3, beamA: [1.35, 1.6], scan: [1.6, 2.45], scanLbl: 1.65,
      hit: 2.45, atomsLbl: 2.6, numOut: [3.3, 3.5], send: [3.45, 3.95], sendLbl: 3.7, stream: [3.6, 5.15],
      pan: [4.25, 4.9], beamB: [4.3, 4.55], build: [4.95, 5.85], buildLbl: 5.05, beamOff: [5.85, 6.1], tada: 6.15,
      cut: 6.7, q1: 6.85, q2: 6.95, sweat: 7.05, line1: 7.3, line2: 7.8, D: 10,
    };
    const PADA = [300, 610], PADB = [880, 610], CONS = [1110, 552], BEAM_H = 420;
    const ARC = bz([[PADA[0], PADA[1] - BEAM_H], [PADA[0] + 90, 50], [PADB[0] - 90, 50], [PADB[0], PADB[1] - BEAM_H]], 80);
    const ARC_L = (() => { const L = [0]; for (let i = 1; i < ARC.length; i++) L.push(L[i - 1] + Math.hypot(ARC[i][0] - ARC[i - 1][0], ARC[i][1] - ARC[i - 1][1])); return L; })();
    const alongArc = (u) => { const want = cl(u) * ARC_L[ARC_L.length - 1]; let i = 1; while (i < ARC.length - 1 && ARC_L[i] < want) i++; const k = (want - ARC_L[i - 1]) / (ARC_L[i] - ARC_L[i - 1] || 1); return [lerp(ARC[i - 1][0], ARC[i][0], k), lerp(ARC[i - 1][1], ARC[i][1], k)]; };
    const NDOTS = 34, dotT0 = (i) => TL.stream[0] + i * 0.04, DOT_TRIP = 0.8;

    // ---------- the cast (people are drawn by the style's person() / personArm()) ----------
    // the uncanny build gets a paler Gus, a longer reach for the doc (its arms are thinner for their length) and too-wide grins
    const UNCANNY = PEOPLE_BUILD === 'uncanny';
    const CAST = {
      gus: { id: 'gus', seed: 3, tilt: 0.07, bigEye: 1, skin: UNCANNY ? '#ecd0b4' : '#f2c9a2', shirt: '#e8894a', pants: '#c3ab7a', shoes: '#6a4c38', sole: '#efe6d2', hair: 'curls', hairCol: '#4a3426', glasses: true, tee: true, w: 1, arm: 1 },
      doc: { id: 'doc', seed: 11, tilt: -0.06, bigEye: -1, skin: '#9b6748', shirt: '#5f9c8f', pants: '#5f9c8f', shoes: '#3a3433', sole: '#2a2524', hair: 'puff', hairCol: '#2d2224', goggles: true, tee: false, w: 0.95, arm: UNCANNY ? 1.24 : 1.1 },
    };

    // a plain rod for props (the lever)
    function limb(x, pts, w, col) {
      x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      x.strokeStyle = C.ink; x.lineWidth = w + LW * 2; x.stroke(); x.strokeStyle = col; x.lineWidth = w; x.stroke(); x.restore();
    }

    // ---------- the set: a garage lab ----------
    function garage(x) {
      x.fillStyle = '#a4ad9c'; x.fillRect(-120, -120, 1700, 960);
      inkLines(x, 'gpanels', Array.from({ length: 10 }, (_, i) => [[-60 + i * 180, 70], [-60 + i * 180, 530]]), 1.6, 0.45);
      [[120, 420, 90, 40], [760, 300, 130, 34], [1290, 380, 80, 60], [560, 470, 80, 25]].forEach(([a, b, c, d], i) => cel(x, shape('gst' + i, () => blobPts(a, b, c, d, i + 20)), '#98a190', { lw: 0 }));
      cel(x, RR(-120, 38, 1700, 22, 10, 0.5), '#8d8a82', { shade: [0, -5], lw: 2.4 });
      for (let i = 0; i < 6; i++) cel(x, RR(40 + i * 290, 30, 16, 38, 3), '#6d6a64', { lw: 2 });
      // pegboard with tools
      x.save(); x.translate(470, 110);
      cel(x, RR(0, 0, 250, 160, 6), '#c9a46a', { shade: [-6, -6], lw: 2.6 });
      x.fillStyle = dark('#c9a46a', 0.45); for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) { x.beginPath(); x.arc(16 + c * 24.5, 14 + r * 26, 2.6, 0, TAU); x.fill(); }
      cel(x, RR(36, 46, 14, 92, 5), C.wood, { lw: 2.2 }); cel(x, RR(16, 32, 54, 22, 4), C.metal, { lw: 2.2, shade: [-3, -3] });
      cel(x, RR(110, 38, 20, 48, 8), '#e04a3c', { lw: 2.2, shade: [-3, -3] }); cel(x, RR(116, 86, 8, 52, 2), C.metal, { lw: 2 });
      cel(x, RR(180, 40, 15, 100, 7), C.metal, { lw: 2.2, shade: [-3, 0] }); cel(x, OV(187, 38, 19, 17), C.metal, { lw: 2.2, inner: () => { x.fillStyle = '#c9a46a'; x.fillRect(181, 18, 12, 18); } });
      x.restore();
      // shelf with glowing jars
      cel(x, RR(1190, 236, 300, 14, 3), C.woodDk, { lw: 2.4 });
      [[1220, 170, 50, 66], [1290, 186, 40, 50], [1350, 160, 56, 76]].forEach(([a, b, w, h], i) => { cel(x, RR(a, b, w, h, 8), i === 1 ? '#ef9a5a' : C.lime, { shade: [-6, 0], inner: () => { x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(a + 6, b + 10, 5, h - 20); } }); cel(x, RR(a - 3, b - 10, w + 6, 12, 3), C.metalDk, { lw: 2.2 }); glow(x, a + w / 2, b + h / 2, 70, i === 1 ? '#ffb070' : C.glow, 0.2); });
      // floor
      cel(x, RR(-120, 528, 1700, 16, 0, 0.4), '#6f726a', { lw: 2.2 });
      cel(x, RR(-120, 544, 1700, 320, 0, 0.4), '#8b8e85', { lw: 2.4 });
      [[600, 680, 110, 22], [1180, 640, 80, 16], [80, 660, 70, 14]].forEach(([a, b, c, d], i) => cel(x, shape('oil' + i, () => blobPts(a, b, c, d, i + 40)), '#7c7f77', { lw: 0 }));
      line(x, [[440, 700], [470, 668], [462, 640], [500, 612]], 3); line(x, [[1250, 720], [1270, 690], [1310, 676]], 3);
      // cables from the pads to the console
      line(x, [[PADA[0] + 100, 632], [520, 660], [760, 650], [1040, 590]], 9);
      line(x, [[PADB[0] + 100, 626], [980, 612], [1050, 586]], 9);
    }
    function pad(x, cx, cy, on) {
      cel(x, OV(cx, cy + 12, 120, 30), C.metalDk, { lw: 2.6 });
      cel(x, OV(cx, cy, 120, 28), '#b9bfc1', { shade: [0, -6] });
      cel(x, OV(cx, cy, 86, 19), on ? C.lime : '#7d8589', { lw: 2.4 });
      if (on) glow(x, cx, cy, 150, C.glow, 0.35);
    }
    // the beam: a lime light column with an ink rim that grows up from the pad; a scan ring sweeps down it; the scanned
    // part gets a faint pixel grid
    function beam(x, cx, fy, grow, a, t, scanU) {
      if (grow <= 0 || a <= 0) return;
      const T = twos(t), top = fy - BEAM_H * grow, S = RR(cx - 78, fy - BEAM_H, 156, BEAM_H + 6, 34);
      x.save(); x.globalAlpha *= a;
      glow(x, cx, top + (fy - top) / 2, 260, C.glow, 0.3);
      x.beginPath(); x.rect(cx - 140, top, 280, fy - top + 20); x.clip();
      x.save(); x.clip(S.path);
      x.globalAlpha *= 0.5; x.fillStyle = C.lime; x.fillRect(cx - 90, top, 180, fy - top + 10);
      x.fillStyle = C.limeHi; for (let i = 0; i < 3; i++) { const bx = cx - 78 + ((i * 52 + T * 70) % 156); x.fillRect(bx, top, 14, fy - top + 10); }
      if (scanU > 0) { const ry = lerp(fy - BEAM_H + 20, fy, Math.min(1, scanU)); x.globalAlpha = a * 0.35; inkLines(x, 'grid' + cx, [...Array.from({ length: 11 }, (_, i) => [[cx - 78 + i * 16, fy - BEAM_H], [cx - 78 + i * 16, fy]]), ...Array.from({ length: 27 }, (_, i) => [[cx - 78, fy - BEAM_H + i * 16], [cx + 78, fy - BEAM_H + i * 16]])], 1.4); x.globalCompositeOperation = 'source-over'; x.globalAlpha = a * 0.5; x.fillStyle = C.lime; x.fillRect(cx - 90, ry, 180, fy - ry + 10); }
      x.restore();
      x.lineWidth = 3; x.strokeStyle = C.ink; x.stroke(S.path);
      x.restore();
      if (scanU > 0 && scanU < 1) { // the ring
        const ry = lerp(fy - BEAM_H + 20, fy, scanU);
        x.save(); x.lineWidth = 9; x.strokeStyle = C.ink; x.beginPath(); x.ellipse(cx, ry, 96, 18, 0, 0, TAU); x.stroke(); x.lineWidth = 4.5; x.strokeStyle = C.limeHi; x.stroke(); x.restore();
        glow(x, cx, ry, 140, C.glow, 0.5);
      }
    }
    // a data pixel: small lime square with an ink rim
    function pix(x, px, py, s, rot) { x.save(); x.translate(px, py); x.rotate(rot); x.scale(s * 1.3, s * 1.3); cel(x, RR(-6, -6, 12, 12, 2, 0), C.lime, { lw: 2.2 }); x.restore(); }
    // the console + lever (the lever's handle position is needed for the doc's reach)
    const leverAng = (p) => lerp(0.35, -0.6, p);
    const leverTip = (p) => [CONS[0] - 70 + Math.sin(leverAng(p)) * 64, 486 - Math.cos(leverAng(p)) * 64];
    function consoleBox(x, t, p) {
      const T = twos(t);
      x.save(); x.translate(CONS[0], 0);
      cel(x, RR(-56, 380, 112, 72, 7), C.metalDk, { shade: [-5, -5] });
      cel(x, RR(-46, 390, 92, 52, 4), C.screen, { lw: 2.2, inner: () => { const P = []; for (let i = 0; i <= 30; i++) P.push([-46 + i * 3.1, 416 + Math.sin(i * 0.9 + T * 9) * 10 * Math.sin(i / 30 * Math.PI)]); line(x, P, 4, { col: C.lime }); } });
      cel(x, RR(-74, 450, 148, 122, 8), C.metal, { shade: [-8, -8] });
      cel(x, OV(-40, 520, 9, 9), C.lime, { lw: 2.2 }); cel(x, OV(-14, 520, 9, 9), '#e04a3c', { lw: 2.2 }); cel(x, RR(12, 510, 44, 20, 4), C.screen, { lw: 2.2 });
      x.restore();
      const tip = leverTip(p); limb(x, [[CONS[0] - 70, 486], tip], 9, '#5a5f62');
      cel(x, OV(CONS[0] - 70, 488, 13, 9), C.metalDk, { lw: 2.2 });
      x.save(); x.translate(tip[0], tip[1]); cel(x, OV(0, 0, 13, 13), '#e04a3c', { shade: [-4, -4] }); x.restore();
    }
    const DOC_S = 0.9 * PS; // the doc stands a little smaller, behind the console
    const toDoc = (p) => [(p[0] - CONS[0]) / DOC_S, (p[1] - CONS[1]) / DOC_S];

    // ---------- camera ----------
    function cam(t) {
      if (t >= TL.cut) return { x: 670, y: 350, s: 1.02 + 0.02 * seg(t, TL.cut, TL.D) };
      const p = eio(seg(t, TL.pan[0], TL.pan[1]));
      return { x: lerp(640, 900, p), y: lerp(360, 400, p), s: lerp(1 + 0.03 * seg(t, 0, TL.pan[0]), 1.35, p) };
    }
    const header = (x, a, u = 1) => sign(x, 232, 44, 'How would a teleporter work?', 28, { u, a, tilt: -0.012 });

    // ---------- the explainer ----------
    function frame(x, W, H_, t) {
      const T = twos(t), c = cam(t), after = t >= TL.cut;
      const lever = eio(seg(T, TL.lever, TL.lever + 0.15));
      const growA = after ? 0 : eo(seg(t, TL.beamA[0], TL.beamA[1])), aA = after ? 0 : 1 - seg(t, TL.pan[1], TL.pan[1] + 0.2);
      const growB = eo(seg(t, TL.beamB[0], TL.beamB[1])), aB = 1 - seg(t, TL.beamOff[0], TL.beamOff[1]);
      const buildY = lerp(PADB[1] + 6, PADB[1] - 380, eio(seg(T, TL.build[0], TL.build[1])));
      x.save(); camApply(x, c);
      garage(x);
      pad(x, PADA[0], PADA[1], growA > 0); pad(x, PADB[0], PADB[1], growB > 0 && aB > 0.5);
      // the scientist behind the console: pulls the lever, watches, and sweats after the cut
      const docO = after
        ? { t, ph: 1.1, weight: -1, dir: -0.4, look: [-0.6, -0.1], mouth: 'grimace', wide: true, sweat: T >= TL.sweat, legs: false, armFront: -1, reach: [toDoc(leverTip(1)), null], arms: [null, [0.35, 1.25]], hands: ['grip', 'open'] }
        : { t, ph: 1.1, weight: -1, dir: t < TL.pan[0] ? -0.6 : -0.2, look: t < TL.stream[0] ? [-0.9, 0] : [-0.2, -0.4], lid: 0.32, mouth: lever > 0.5 ? 'smile' : 'flat', legs: false, armFront: -1, reach: [toDoc(leverTip(lever)), null], hands: ['grip', 'relax'] };
      person(x, CONS[0], CONS[1], DOC_S, CAST.doc, docO);
      consoleBox(x, t, after ? 1 : lever);
      personArm(x, CONS[0], CONS[1], DOC_S, CAST.doc, -1, docO);
      // the traveller on pad A: nervous, then eyes shut in the beam; after the cut, still there
      const gA = after
        ? { t, weight: -1, dir: 0.8, look: [1, -0.1], wide: true, mouth: 'open', arms: [null, [0.55, 1.5]], hands: ['relax', 'point'] }
        : { t, weight: 1, dir: 0.15, look: [0.3, -0.4], brows: 1, mouth: 'wavy', shut: growA > 0.5 };
      person(x, PADA[0], PADA[1], PS, CAST.gus, gA);
      beam(x, PADA[0], PADA[1], growA, aA, t, seg(t, TL.scan[0], TL.scan[1]));
      // the copy on pad B: built bottom-up inside the beam, then "ta-da", then the awkward look after the cut
      if (T >= TL.build[0]) {
        const tada = T >= TL.tada;
        const gB = after
          ? { t, ph: 0.7, weight: 1, dir: -0.8, look: [-1, -0.1], wide: true, mouth: UNCANNY ? 'grin' : 'flat', brows: 0.6, arms: [null, [1.95, 2.7]], hands: ['relax', 'open'] }
          : { t, ph: 0.7, weight: -1, dir: 0, look: [0, 0.2], mouth: tada ? (UNCANNY ? 'grin' : 'smile') : 'flat', shut: !tada, arms: tada ? [[2.45, 2.85], [2.45, 2.85]] : null, hands: tada ? ['open', 'open'] : null };
        x.save(); x.beginPath(); x.rect(PADB[0] - 200, buildY, 400, 800); x.clip(); person(x, PADB[0], PADB[1], PS, CAST.gus, gB); x.restore();
        if (T < TL.build[1]) for (let i = 0; i < 9; i++) pix(x, PADB[0] - 64 + i * 16 + NZ.n2(i, T * 9) * 4, buildY + NZ.n2(i + 9, T * 9) * 5, 1, NZ.n2(i, T * 5));
      }
      beam(x, PADB[0], PADB[1], growB, aB, t, 0);
      // the data: an inked squiggle arrow from beam to beam, pixels riding it, then falling into beam B
      if (!after) {
        arrow(x, ARC, eio(seg(t, TL.send[0], TL.send[1])), { w: 15, fill: C.lime, lw: 2.6, wave: { a: 6, k: 0.16, ph: t * 14 }, a: 1 - seg(t, TL.build[1], TL.build[1] + 0.3) });
        for (let i = 0; i < NDOTS; i++) {
          const u = (T - dotT0(i)) / DOT_TRIP; if (u <= 0) continue;
          if (u < 1) { const p = alongArc(eio(u)); pix(x, p[0] + Math.sin(u * 14 + i) * 7, p[1] + Math.cos(u * 11 + i) * 7, 1, u * 6 + i); }
          else { const f = (u - 1) * DOT_TRIP / 0.25; if (f < 1) pix(x, PADB[0] + ((i % 7) - 3) * 14, lerp(PADB[1] - BEAM_H, buildY, f), 1 - f * 0.4, i); }
        }
      }
      x.restore();

      // ---- type and labels (screen space; labels pinned to world points through the camera)
      const W2S = (p) => toS(c, p);
      if (!after) {
        const la = 1 - seg(t, TL.pan[0], TL.pan[0] + 0.25);
        const sl = W2S([175, 190]); callout(x, t, TL.scanLbl, '1  scan every atom', sl, W2S([PADA[0] - 76, 330]), { a: la, tilt: -0.02 });
        const nl = W2S([590, 150]); callout(x, t, TL.sendLbl, '2  send the data', nl, W2S([590, 64]), { a: la, tilt: 0.015 });
        callout(x, t, TL.buildLbl, '3  rebuild with new atoms', [300, 330], W2S([PADB[0] - 78, 420]), { a: 1 - seg(t, TL.tada + 0.2, TL.tada + 0.4), tilt: -0.015, bg: C.limeHi });
        // the key number: slams in when the scan ends, then lifts away before the arrow
        const out = eio(seg(t, TL.numOut[0], TL.numOut[1])), hu = t - TL.hit;
        if (hu >= 0 && out < 1) {
          x.save(); x.translate(0, -out * 220); x.globalAlpha = 1 - out;
          bang(x, 590, 150, 300, 82, back(seg(hu, 0, 0.3), 2), { n: 16, rot: -0.02 });
          sign(x, 590, 262, 'atoms in one person', 30, { u: seg(t, TL.atomsLbl, TL.atomsLbl + LAND), tilt: 0.012 });
          const sc = 1 + 0.45 * Math.exp(-hu * 7) * Math.cos(hu * 20);
          x.save(); x.translate(590, 150); x.scale(sc, sc); letters(x, '7 OCTILLION', 0, 0, 84, { fill: C.lime }); x.restore();
          x.restore();
        }
        // hook title, then it shrinks into the corner header
        const sp = eio(seg(t, TL.shrink[0], TL.shrink[1]));
        if (sp < 1) {
          x.save(); x.translate(lerp(640, 232, sp), lerp(112, 44, sp)); x.scale(lerp(1, 0.34, sp), lerp(1, 0.34, sp)); x.globalAlpha = 1 - seg(sp, 0.7, 1);
          const lines = [[['HOW', 'WOULD', 'A'], -44, 62, C.cream], [['TELEPORTER', 'WORK?'], 46, 86, C.lime]];
          let wi = 0;
          for (const [words, ly, px, col] of lines) {
            const ws = words.map((w) => lettersWidth(x, w, px)), gap = px * 0.42, tot = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
            let wx = -tot / 2;
            words.forEach((w, i) => { const u = back(seg(t, TL.title + wi * 0.1, TL.title + wi * 0.1 + 0.32), 1.8); if (u > 0) { x.save(); x.translate(wx + ws[i] / 2, ly + (1 - u) * 30); x.scale(u, u); letters(x, w, 0, 0, px, { fill: col }); x.restore(); } wx += ws[i] + gap; wi++; });
          }
          x.restore();
        }
      } else {
        // the twist: "?" pops over both heads, then the takeaway
        for (const [tq, wp] of [[TL.q1, [PADB[0] - 4, 196]], [TL.q2, [PADA[0] + 4, 196]]]) { const u = back(seg(t, tq, tq + 0.3), 2) * (1 - eio(seg(t, TL.line1 - 0.15, TL.line1 + 0.1))); if (u > 0.01) { const p = W2S(wp); x.save(); x.translate(p[0], p[1]); x.scale(u, u); x.rotate(Math.sin(twos(t) * 7 + tq) * 0.12); letters(x, '?', 0, 0, 70, { fill: C.cream }); x.restore(); } }
        const l1 = back(seg(t, TL.line1, TL.line1 + 0.4), 1.8), l2 = back(seg(t, TL.line2, TL.line2 + 0.4), 1.8);
        if (l1 > 0) { x.save(); x.translate(640, 96 + (1 - l1) * 30); x.scale(l1, l1); letters(x, "TELEPORTERS DON'T MOVE YOU.", 0, 0, 50); x.restore(); }
        if (l2 > 0) { const s = 'THEY MAKE A COPY.', cols = [...s].map((ch, i) => (i >= 12 && i < 16 ? C.salmon : C.lime)); x.save(); x.translate(640, 168 + (1 - l2) * 30); x.scale(l2, l2); letters(x, s, 0, 0, 76, { colors: cols }); x.restore(); }
      }
    }

    registerStyle({
      id: 'sci-fi-sitcom-teleporter',
      name: 'Teleporter (Sci-Fi Sitcom Cartoon example)',
      category: 'TV Cartoon Looks',
      description: 'Example explainer in the Sci-Fi Sitcom Cartoon style: how a teleporter would work, with a twist.',
      motion: 'Characters on twos, camera on ones.',
      fonts: ['400 64px "Luckiest Guy"', '600 30px "Fredoka"', '700 26px "Fredoka"'],
      duration: TL.D,
      frameT: 7.2,
      readsPixels: false,
      draw(ctx, W, H_, t) { this.explainer(ctx, W, H_, t); },
      explainerDuration: TL.D,
      explainerNote: 'A garage lab under one 2D camera: the scientist pulls a lever, a lime beam scans the traveller, 7 OCTILLION slams in, an inked squiggle arrow carries data pixels to the second pad while the camera pans with them, the copy is rebuilt bottom-up and says ta-da; a hard cut with a record scratch reveals the original never left.',
      explainer(ctx, W, H_, t) {
        const x = ctx, hu = t - TL.hit, sk = hu >= 0 && hu < 0.5 ? 14 * Math.exp(-hu * 7) : 0;
        x.save();
        if (sk > 0) { const T = twos(t), z = 1 + sk / 160; x.translate(640, 360); x.scale(z, z); x.translate(-640 + NZ.n2(T * 40, 3) * sk * 1.6, -360 + NZ.n2(T * 40, 9) * sk * 1.6); }
        frame(x, W, H_, t);
        x.restore();
        if (t > TL.shrink[1] - 0.2) header(x, 1, seg(t, TL.shrink[1] - 0.2, TL.shrink[1] - 0.2 + LAND));
        finish(x, W, H_, t);
      },
      explainerSound(k) {
        // Same palette as the reference: boings, wood-block clunks, slide whistles, zaps, a theremin; plus a lever clunk,
        // beam hum, scan sweep, chirping data pixels, a build sweep and a record scratch on the cut.
        const D = TL.D, hz = k.hz;
        const up2 = (te) => Math.ceil(te * 12 - 1e-6) / 12;
        const touch = (t0) => t0 + LAND * CONTACT;
        const pan = (px) => cl((px / 1280) * 2 - 1, -1, 1) * 0.6;
        const when = (t0, t1, ease, u) => { for (let i = 0; i <= 400; i++) { const tt = t0 + ((t1 - t0) * i) / 400; if (ease(i / 400) >= u - 1e-6) return tt; } return t1; };
        const peak = (t0, t1, s) => when(t0, t1, (u) => back(u, s), 1);
        const vib = (f0, f1, dur, depth, rate) => { const a = []; for (let s = 0; s <= dur + 1e-6; s += 1 / (rate * 6)) a.push([Math.min(s, dur), lerp(f0, f1, s / dur) * (1 + depth * Math.sin(s * rate * TAU))]); return a; };
        const boing = (t, f0, g = 1, p = 0, minor = false) => { k.tone(t, { f: [[0, f0 * 0.7], [0.04, f0 * 1.5], [0.09, f0 * 1.05], [0.14, f0 * 1.35], [0.2, f0 * 1.12], [0.3, f0 * 1.25]], type: 'triangle', dur: 0.34, gain: 0.15 * g, a: 0.004, pan: p, minor }); k.tone(t, { f: f0 * 2, dur: 0.05, gain: 0.05 * g, pan: p, minor }); };
        const clunk = (t, g = 1, p = 0) => { k.play('tock', t, { f: 360, gain: 0.6 * g, pan: p }); k.tone(t, { f: [[0, 170], [0.08, 90]], dur: 0.12, gain: 0.2 * g, pan: p }); };
        const slide = (t, f0, f1, dur, g = 1, p = 0) => k.tone(t, { f: vib(f0, f1, dur, 0.012, 7), dur, gain: 0.08 * g, a: 0.03, hold: dur * 0.7, pan: p, verb: 0.15 });
        const chord = (t, notes, g = 1, dur = 2) => notes.forEach((n, i) => { k.tone(t + i * 0.015, { f: vib(hz(n), hz(n), dur, 0.006, 5), type: 'triangle', dur, gain: 0.06 * g, a: 0.03, verb: 0.35, filter: 'lowpass', f2: 1900, pan: (i / (notes.length - 1) - 0.5) * 0.6, bus: 'music' }); k.tone(t + i * 0.015, { f: hz(n) * 1.003, dur, gain: 0.04 * g, a: 0.04, verb: 0.3, bus: 'music' }); });
        const hum = (t0, t1, p) => { const d = t1 - t0; k.tone(t0, { f: vib(98, 98, d, 0.03, 6), type: 'sawtooth', dur: d, gain: 0.038, a: 0.15, hold: d - 0.3, filter: 'lowpass', f2: 700, q: 2, pan: p, bus: 'amb' }); k.tone(t0, { f: vib(196, 196, d, 0.02, 4), dur: d, gain: 0.03, a: 0.2, hold: d - 0.4, pan: p, bus: 'amb' }); };
        const powerUp = (t, p) => { k.tone(t, { f: [[0, 120], [0.3, 900]], type: 'sawtooth', dur: 0.34, gain: 0.06, a: 0.25, filter: 'lowpass', f2: [[0, 400], [0.3, 3000]], pan: p }); k.play('riser', t - 0.05, { dur: 0.3, gain: 0.3, pan: p }); };

        k.bed('room', 0, D, { gain: 0.7 });
        // 1 hook
        ['How', 'would', 'a', 'teleporter', 'work?'].forEach((w, i) => boing(peak(TL.title + i * 0.1, TL.title + i * 0.1 + 0.32, 1.8), [330, 370, 415, 470, 560][i], i < 3 ? 0.7 : 1, (i % 3 - 1) * 0.2, i < 3));
        slide(TL.shrink[0], 900, 380, TL.shrink[1] - TL.shrink[0], 0.8, -0.4);
        clunk(touch(TL.shrink[1] - 0.2), 0.7, -0.5);
        // 2 scan
        clunk(up2(TL.lever + 0.15), 1.1, pan(1030)); k.play('thud', up2(TL.lever + 0.15), { f: 90, gain: 0.35, pan: pan(1030) });
        powerUp(TL.beamA[0], pan(300)); hum(TL.beamA[0], TL.pan[1] + 0.2, pan(300));
        const sd = TL.scan[1] - TL.scan[0];
        k.tone(TL.scan[0], { f: vib(1300, 320, sd, 0.06, 14), dur: sd, gain: 0.06, a: 0.05, hold: sd * 0.85, pan: pan(300) });
        k.noise(TL.scan[0], { dur: sd, filter: 'bandpass', f: [[0, 4000], [sd, 900]], q: 3, gain: 0.08, a: 0.05, hold: sd * 0.8, pan: pan(300) });
        clunk(touch(TL.scanLbl), 1, pan(175));
        // the key number: the biggest hit
        k.play('stamp', TL.hit, { gain: 1.3 }); k.play('impact', TL.hit, { gain: 1.0 }); boing(TL.hit + 0.02, 160, 1.2);
        chord(TL.hit + 0.05, ['A3', 'E4', 'A4', 'C#5'], 1.1, 1.3);
        clunk(touch(TL.atomsLbl), 0.9, 0);
        k.play('swish', TL.numOut[0], { dur: 0.2, gain: 0.5 });
        // 3 send: the squiggle draws, pixels chirp along it (at most 12 a second), the camera follows
        const ad = TL.send[1] - TL.send[0];
        k.tone(TL.send[0], { f: vib(500, 950, ad, 0.09, 13), dur: ad + 0.1, gain: 0.06, a: 0.05, hold: ad * 0.8 });
        clunk(touch(TL.sendLbl), 1, pan(590));
        const notes = ['C6', 'E6', 'G6', 'A6', 'D6', 'G6'];
        for (let i = 0, last = -1; i < NDOTS; i++) { const tt = up2(dotT0(i)); if (tt - last < 1 / 12 - 1e-6) continue; last = tt; k.play('blip', tt, { f: notes[i % notes.length], dur: 0.04, gain: 0.35, pan: pan(lerp(300, 880, i / NDOTS)), minor: true }); }
        k.play('whoosh', TL.pan[0], { dur: TL.pan[1] - TL.pan[0], top: 1500, gain: 0.55 });
        // 4 rebuild
        powerUp(TL.beamB[0], pan(640)); hum(TL.beamB[0], TL.beamOff[1], pan(640));
        const bd = TL.build[1] - TL.build[0];
        k.tone(TL.build[0], { f: vib(300, 1300, bd, 0.06, 14), dur: bd, gain: 0.06, a: 0.05, hold: bd * 0.85, pan: pan(640) });
        clunk(touch(TL.buildLbl), 1, pan(300));
        k.tone(TL.beamOff[0], { f: [[0, 700], [0.25, 90]], type: 'sawtooth', dur: 0.28, gain: 0.05, filter: 'lowpass', f2: 1200, pan: pan(640) });
        boing(up2(TL.tada), 520, 1, pan(640)); k.play('sparkle', up2(TL.tada) + 0.04, { gain: 0.8, pan: pan(640) });
        // 5 the twist: record scratch on the cut, two question boings, a sweat bloop, the takeaway resolves
        k.noise(TL.cut, { dur: 0.22, filter: 'bandpass', f: [[0, 900], [0.08, 3200], [0.22, 500]], q: 4, gain: 0.85, a: 0.005 }); k.play('thud', TL.cut, { f: 70, gain: 0.3 });
        k.tone(TL.cut, { f: [[0, 400], [0.08, 1100], [0.2, 150]], type: 'sawtooth', dur: 0.22, gain: 0.05, filter: 'bandpass', f2: 1500, q: 2 });
        boing(peak(TL.q1, TL.q1 + 0.3, 2), 600, 0.9, pan(880)); boing(peak(TL.q2, TL.q2 + 0.3, 2), 450, 0.9, pan(300));
        k.tone(up2(TL.sweat), { f: [[0, 900], [0.08, 300]], dur: 0.1, gain: 0.08, pan: pan(1100) });
        boing(peak(TL.line1, TL.line1 + 0.4, 1.8), 440, 0.7);
        const l2 = peak(TL.line2, TL.line2 + 0.4, 1.8);
        chord(l2, ['C3', 'G3', 'C4', 'E4', 'G4', 'D5'], 0.7, 1.9); k.play('ding', l2, { f: 'C6', gain: 0.5 });
        k.tone(l2 + 0.1, { f: vib(hz('G4'), hz('C4'), 1.1, 0.02, 5.5), dur: 1.2, gain: 0.04, a: 0.1, hold: 0.7, verb: 0.35, bus: 'music' }); // theremin sigh
      },
    });
