    // ---------- CHARACTER SHEET: Vic (CHARACTERS.vic). Not a video: one page that shows the lead from the front, turned
    // both ways, in two full-body poses and six expressions. Render a still at t = 1 to refresh characters/vic.png. ----------
    const P = CHARACTERS.vic, HA = headAt(P);
    // a head-and-shoulders view in a framed box: the head centre lands on (cx, cy)
    function bust(x, cx, cy, s, w, h, pose, label) {
      x.save(); x.beginPath(); x.rect(cx - w / 2, cy - h / 2, w, h); x.clip();
      x.fillStyle = '#d9d3b4'; x.fillRect(cx - w / 2, cy - h / 2, w, h);
      person(x, cx, cy + 22 * s - HA.y * s, s, P, pose);
      x.restore();
      panel(x, cx - w / 2, cy - h / 2, w, h, null);
      if (label) sign(x, cx, cy + h / 2 - 2, label, 15, { u: 1, bg: C.cream, fg: C.ink });
    }
    function sheet(x, W, H_, t) {
      x.fillStyle = '#e9e2c4'; x.fillRect(0, 0, 1280, 720);
      x.fillStyle = '#d9d3b4'; x.fillRect(0, 668, 620, 52);
      letters(x, 'VIC', 28, 52, 54, { fill: C.lime, align: 'left' });
      letters(x, 'the lead', 150, 58, 24, { fill: C.cream, align: 'left' });
      // two full-body poses
      person(x, 150, 690, 1.08, P, { t, ph: 0.2, weight: -1, dir: 0, mouth: 'flat' });
      person(x, 385, 690, 1.08, P, { t, ph: 1.1, weight: 1, dir: 0.8, look: [0.8, -0.3], mouth: 'smile', arms: [null, [1.5, 1.85]], hands: ['relax', 'point'] });
      // three views
      bust(x, 745, 150, 1.05, 190, 250, { t, ph: 0.2, dir: -0.8, mouth: 'flat' }, 'left');
      bust(x, 950, 150, 1.05, 190, 250, { t, ph: 0.2, dir: 0, mouth: 'flat' }, 'front');
      bust(x, 1155, 150, 1.05, 190, 250, { t, ph: 0.2, dir: 0.8, mouth: 'flat' }, 'right');
      // six expressions
      const EX = [
        ['stern', { mouth: 'frown', brows: -1, lid: 0.3, lidTilt: 0.5 }], ['pleased', { mouth: 'grin', lid: 0.12 }], ['talking', { mouth: 'open', lid: 0 }],
        ['shocked', { mouth: 'open', wide: true, brows: 1, lid: 0 }], ['worried', { mouth: 'wavy', brows: 1, lid: 0, sweat: true }], ['tense', { mouth: 'grimace', brows: -0.6, lid: 0.15 }],
      ];
      EX.forEach(([label, pose], i) => bust(x, 720 + (i % 3) * 205 + 25, 412 + Math.floor(i / 3) * 190, 0.72, 180, 165, { t, ph: 0.2 + i, dir: i % 2 ? 0.5 : -0.3, ...pose }, label));
      finish(x, W, H_, t);
    }
    registerStyle({
      id: 'sci-fi-sitcom-thinline-vic-sheet', name: 'Vic character sheet', category: 'TV Cartoon Looks',
      description: 'Character sheet for the recurring lead, Vic.', motion: 'Still page; only the blink and idle sway move.',
      fonts: ['700 64px "Fredoka"', '600 30px "Fredoka"'], duration: 4, frameT: 1, readsPixels: false,
      draw(ctx, W, H_, t) { sheet(ctx, W, H_, t); },
      explainerDuration: 4, explainerNote: 'Character sheet for Vic: two full-body poses, three views, six expressions.',
      explainer(ctx, W, H_, t) { sheet(ctx, W, H_, t); },
      explainerSound(k) {},
    });
