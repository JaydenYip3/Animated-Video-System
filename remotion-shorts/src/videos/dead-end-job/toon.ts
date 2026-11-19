// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build; nose?: string; tie?: string; coat?: boolean;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const KEEPER: Outfit = { jacket: "#2c3a5a", pants: "#2b2f3d", boots: "#3a2a22", hat: "cap", cap: "#1f2740", moustache: "#8f877f", buttons: "#d8b45a", build: "stout", skin: "#f4cfae" };
export const GIRL: Outfit = { jacket: "#e8b42e", pants: "#3b4f7a", boots: "#b8392e", hat: "hair", hair: "#6b3e26", build: "kid", skin: "#f8d6b8" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "wonder" | "hopeful" | "tender" | "creep" | "worried" | "sly";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  wonder: { eye: ["dot", "dot"], brow: [-6, -5], mouth: "o" },
  hopeful: { eye: ["dot", "dot"], brow: [-4, 2], mouth: "smirk" },
  tender: { eye: ["happy", "happy"], brow: [-2, 0], mouth: "smile" },
  creep: { eye: ["dot", "dot"], brow: [5, -5], mouth: "grin" },
  worried: { eye: ["small", "small"], brow: [-5, 3], mouth: "frown" },
  sly: { eye: ["lid", "lid"], brow: [4, -3], mouth: "smirk" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
  if (NOSE.c) p.ell(cx + 7.5 * u * facing, cy + 9 * u, 9 * u, 8.5 * u, NOSE.c, 2.6 * u);
};
/** clown nose colour for the face being drawn (set by bodyFront / bodySide) */
const NOSE: { c?: string } = {};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
  if (NOSE.c) p.ell(hx + 47 * u, hy + 6 * u, 8 * u, 7.5 * u, NOSE.c, 2.6 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "fedora") {
    const yb = crown + 0.3 * HH, ht = 0.36 * HH, wb = 0.42 * W, wt = 0.34 * W, col = o.cap ?? "#4a3b2c";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht + 4 * u], [cx - 8 * u, yb - ht - 2 * u], [cx, yb - ht + 8 * u], [cx + 8 * u, yb - ht - 2 * u], [cx + wt, yb - ht + 4 * u]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.09 * HH], [cx + wt + 4 * u, yb - 0.09 * HH]]), "#2a2018", 0.09 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.66 * W, 0.075 * HH, shade(col, 0.82), ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "clown") {
    for (const sdir of [-1, 1]) for (const [dx, dy, r] of [[0.5, 0.05, 0.2], [0.58, 0.3, 0.17], [0.4, -0.18, 0.17]] as const) {
      const [qx, qy] = R([[cx + sdir * dx * W, hc + dy * HH - 0.1 * HH]])[0];
      p.ell(qx, qy, r * W, r * W * 0.9, "#e2363a", ow * 0.8);
    }
    const [tx, ty] = R([[cx + 6 * u, crown + 0.06 * HH]])[0];
    p.poly([[tx - 0.17 * W, ty + 6 * u], [tx + 0.15 * W, ty + 4 * u], [tx + 0.04 * W, ty - 0.5 * HH]], "#6fd0e0", ow * 0.8);
    p.dot(tx + 0.04 * W, ty - 0.5 * HH, 7 * u, "#f2d23a");
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | "crate" | "pad" | ["hammer", number] | ["map", number];

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** sweeping the right arm out toward a door: 0 down .. 1 extended at waist height, open hand */
  invite?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave, invite,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean };
  const arms: Arm[] = [];
  const isMap = Array.isArray(prop) && prop[0] === "map";
  const isCrate = prop === "crate";
  NOSE.c = o.nose;
  const mapK = isMap ? clamp((prop as ["map", number])[1], 0, 1) : 0;
  const mapY = chin + (0.62 - 0.55 * mapK) * HH, mapW = 0.62 * W, mapH = 0.44 * W;
  if (isCrate) for (const side of [-1, 1]) {
    const S = sh(side), Hd: P2 = [tcx + side * 0.36 * W, torsoBot - 0.02 * HH];
    arms.push({ pts: [S, [tcx + side * (1.1 * T.a + 6 * u), (S[1] + Hd[1]) / 2], Hd], front: true });
  }
  else if (isMap) for (const side of [-1, 1]) {
    const S = sh(side), Hd: P2 = [tcx + side * mapW * 0.5, mapY + mapH * 0.25];
    arms.push({ pts: [S, [tcx + side * (1.05 * T.a + 6 * u), (S[1] + Hd[1]) / 2 + 0.12 * HH], Hd], front: true });
  }
  else if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (invite !== undefined) {
      const S = sh(1), k = clamp(invite, 0, 1), down = hang(1, 0);
      const E = lerp2(down[1], [tcx + 1.25 * T.a + 14 * u, S[1] + 0.32 * HH], k), Hd = lerp2(down[2], [tcx + 1.3 * T.a + 46 * u, S[1] + 0.5 * HH], k);
      arms.push({ pts: [S, E, Hd], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream" || prop === "pad") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  const drawArm = (a: Arm) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.tie) {
        p.poly([[tcx - 16 * u, chin - 2 * u], [tcx, chin + 14 * u], [tcx + 16 * u, chin - 2 * u]], "#f1eee6", 1.5 * u);
        p.poly([[tcx - 5 * u, chin + 4 * u], [tcx + 5 * u, chin + 4 * u], [tcx + 8 * u, chin + 0.62 * HH], [tcx, chin + 0.72 * HH], [tcx - 8 * u, chin + 0.62 * HH]], o.tie, 1.8 * u);
      }
      if (o.coat) {
        p.stroke([[tcx - 0.9 * T.a, chin], [tcx - 6 * u, chin + 0.55 * HH], [tcx - 2 * u, torsoBot]], 2.2 * u, mix(o.jacket, INK, 0.5));
        p.band([[tcx - 1.3 * T.a, torsoBot - 0.36 * HH], [tcx + 1.3 * T.a, torsoBot - 0.36 * HH]], shade(o.jacket, 0.8), 0.08 * HH, 1.4 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      if (!o.tie) for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  if (isMap) {
    const R = 0.5 * mapW, Q = 0.5 * mapH;
    p.poly([[tcx - R, mapY - Q], [tcx + R, mapY - Q + 2 * u], [tcx + R - u, mapY + Q], [tcx - R + u, mapY + Q - u]], "#efdcaa", 2.4 * u);
    p.stroke([[tcx - R + 6 * u, mapY - 2 * u], [tcx - 4 * u, mapY + 4 * u], [tcx + 6 * u, mapY - 6 * u]], 1.4 * u, "#8a6a44");
    p.arc(tcx + R * 0.45, mapY - Q * 0.3, 7 * u, 6 * u, 0, 360, 2 * u, "#c8323a");
    for (const a of arms) { drawArm(a); }
  }
  if (isCrate) {
    const x0 = tcx - 0.42 * W, x1 = tcx + 0.42 * W, y1 = torsoBot + 0.12 * HH, y0 = y1 - 0.34 * W;
    for (let i = 0; i < 4; i++) { const bx = x0 + (i + 0.5) * (x1 - x0) / 4; p.poly(rrect(bx - 8 * u, y0 - 26 * u, bx + 8 * u, y0 + 6 * u, 5 * u), "#f6f4ee", 2 * u); p.ell(bx, y0 - 27 * u, 6 * u, 3 * u, "#4a8fd8", 1.6 * u); }
    p.poly(rrect(x0, y0, x1, y1, 4 * u), "#3f78c2", 2.6 * u);
    for (let i = 1; i < 4; i++) p.stroke([[x0 + i * (x1 - x0) / 4, y0 + 4 * u], [x0 + i * (x1 - x0) / 4, y1 - 4 * u]], 2 * u, "#2a5590");
    for (const a of arms) drawArm(a);
  }
  for (const a of arms) if (a.front && !isMap && !isCrate) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "pad") {
      p.poly([[hx - 14 * u, hy - 30 * u], [hx + 14 * u, hy - 32 * u], [hx + 15 * u, hy + 4 * u], [hx - 13 * u, hy + 6 * u]], "#f4eecc", 2 * u);
      for (let i = 0; i < 3; i++) p.stroke([[hx - 8 * u, hy - 22 * u + i * 8 * u], [hx + 8 * u, hy - 23 * u + i * 8 * u]], 1.3 * u, "#7a8aa0");
      p.dot(hx, hy, 5.5 * u);
    } else if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
  /** holding a map out in front (0 chest height .. 1 raised) */
  map?: number;
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  NOSE.c = o.nose;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else if (opts.map !== undefined) {
    const k = clamp(opts.map, 0, 1), hN: P2 = [S[0] + 0.62 * HH, S[1] + (0.32 - 0.5 * k) * HH];
    near = [S, [S[0] + 0.22 * HH, S[1] + 0.42 * HH - 0.25 * k * HH], hN];
    far = [S, [S[0] + 0.18 * HH, S[1] + 0.38 * HH - 0.25 * k * HH], [hN[0] - 4 * u, hN[1] - 3 * u]];
  }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (opts.map !== undefined) { // the map held out, seen edge-on-ish: a tilted sheet between the hands
    const [mx, my] = near[2];
    p.poly([[mx - 4 * u, my - 30 * u], [mx + 9 * u, my - 34 * u], [mx + 12 * u, my + 26 * u], [mx - 1 * u, my + 30 * u]], "#efdcaa", 2.2 * u);
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** the girl's map, 1000 x 700: yellowed chart, coastline, the islet + lighthouse sketch circled in red, a dotted route,
 *  compass rose and illegible cursive notes (no readable text: house rule). thumbs = two holding thumbs at the edges */
export const fxMap = (p: Pen, thumbs: boolean, skin = "#f8d6b8") => {
  const g = p.g, r = (k: number) => rnd(77, k);
  const edge: P2[] = [];
  for (let i = 0; i <= 40; i++) edge.push([60 + i * 22, 60 + 8 * r(i)]);
  for (let i = 0; i <= 26; i++) edge.push([940 - 6 * r(i + 50), 60 + i * 22]);
  for (let i = 40; i >= 0; i--) edge.push([60 + i * 22, 640 - 8 * r(i + 90)]);
  for (let i = 26; i >= 0; i--) edge.push([60 + 6 * r(i + 140), 60 + i * 22]);
  p.poly(edge, "#ead39c", 7);
  p.clip(edge, () => {
    const gr = g.createRadialGradient(500, 350, 120, 500, 350, 560); gr.addColorStop(0, "rgba(255,248,220,0.5)"); gr.addColorStop(1, "rgba(150,100,40,0.35)");
    g.fillStyle = gr; g.fillRect(0, 0, 1000, 700);
    g.strokeStyle = "rgba(130,95,50,0.35)"; g.lineWidth = 3; // folds
    g.beginPath(); g.moveTo(500, 50); g.lineTo(500, 650); g.moveTo(50, 350); g.lineTo(950, 350); g.stroke();
    // mainland coast (left) with hatching
    const coast: P2[] = [[60, 60], [250, 60], [230, 140], [270, 210], [210, 300], [240, 400], [180, 480], [220, 560], [160, 640], [60, 640]];
    p.poly(coast, "#d9bf86", 4);
    g.strokeStyle = "rgba(90,60,30,0.5)"; g.lineWidth = 2;
    for (let y = 80; y < 640; y += 18) { g.beginPath(); g.moveTo(70, y); g.lineTo(150, y - 10); g.stroke(); }
    // little islands + the islet
    p.ell(430, 170, 40, 22, "#d9bf86", 3); p.ell(360, 520, 30, 16, "#d9bf86", 3);
    p.ell(700, 330, 90, 52, "#d9bf86", 4);
    // lighthouse sketch on the islet
    p.poly([[685, 330], [715, 330], [708, 220], [692, 220]], "#f2e6c8", 4);
    p.poly([[688, 270], [712, 270], [710, 250], [690, 250]], "#c8323a", 0);
    p.poly([[686, 220], [714, 220], [700, 196]], "#4a3426", 3);
    for (const a of [-0.5, 0, 0.5]) p.stroke([[700 + 30 * Math.sin(a + 1.6), 214 - 6 * Math.cos(a)], [700 + 80 * Math.sin(a + 1.6), 205 - 22 * a]], 2.5, "#8a6a44");
    // dotted route from the mainland to the islet
    g.setLineDash([10, 12]); g.strokeStyle = "#5a3b2a"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(250, 470); g.bezierCurveTo(400, 420, 480, 440, 610, 360); g.stroke(); g.setLineDash([]);
    // red hand-drawn circle around the lighthouse (two loose loops)
    g.strokeStyle = "#c8323a"; g.lineCap = "round";
    for (const [w, k] of [[11, 0], [6, 1]] as const) {
      g.lineWidth = w; g.beginPath();
      for (let i = 0; i <= 64; i++) { const a = -0.6 + (i / 64) * (Math.PI * 2 + 0.5); const rr = 150 + 10 * Math.sin(a * 3 + k) + k * 8;
        const x = 700 + rr * Math.cos(a), y = 290 + rr * 0.78 * Math.sin(a); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    // compass rose
    p.poly([[860, 110], [872, 160], [860, 210], [848, 160]], "#5a3b2a", 3); p.poly([[810, 160], [860, 148], [910, 160], [860, 172]], "#efdcaa", 3);
    // cursive handwriting (illegible loops), in the keeper's hand
    // slanted looped cursive (illegible): tall loops, small eyes, humps, word gaps; ends with an underlined flourish
    const scrawl = (x0: number, y0: number, len: number, seed: number, sign = false) => {
      g.save(); g.translate(x0, y0); g.transform(1, 0, -0.32, 1, 0, 0);
      g.strokeStyle = "#2f2219"; g.lineWidth = 3.6; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(0, 0);
      let x = 0, k = 0;
      while (x < len) {
        const ty = rnd(seed, k++), w = 9 + 7 * rnd(seed + 1, k);
        if (ty < 0.28) { const hh = 30 + 10 * rnd(seed + 3, k); g.bezierCurveTo(x + w * 0.9, -hh * 0.5, x + w * 0.9, -hh, x + w * 0.45, -hh); g.bezierCurveTo(x, -hh, x + w * 0.2, -hh * 0.4, x + w * 0.6, 0); }
        else if (ty < 0.6) { g.bezierCurveTo(x + w, -6, x + w * 0.9, -14, x + w * 0.5, -13); g.bezierCurveTo(x + w * 0.1, -12, x + w * 0.2, 0, x + w * 0.8, 0); }
        else if (ty < 0.88) { g.bezierCurveTo(x + w * 0.2, -16, x + w * 0.6, -16, x + w * 0.6, 0); g.bezierCurveTo(x + w * 0.7, -16, x + w * 1.1, -16, x + w * 1.1, 0); }
        else { x += 18; g.moveTo(x + w * 0.4, 0); }
        x += w;
      }
      g.stroke();
      if (sign) { g.lineWidth = 3.2; g.beginPath(); g.moveTo(-10, 14); g.bezierCurveTo(len * 0.4, 6, len * 0.8, 22, len + 30, 4); g.stroke(); }
      g.restore();
    };
    scrawl(560, 525, 290, 3); scrawl(600, 580, 200, 5, true); scrawl(330, 125, 160, 7); scrawl(470, 625, 110, 9);
  });
  if (thumbs) for (const [x, y, s] of [[90, 600, -1], [910, 610, 1]] as const) {
    p.ell(x, y, 46, 30, skin, 6, 0, 360, s * 25); p.arc(x + s * 10, y - 6, 18, 10, 200, 320, 4);
  }
};
/** a gull: two arcs, flap 0..1 */
export const fxGull = (p: Pen, flap: number) => {
  const a = 30 - 40 * flap;
  p.stroke(curve([20, 100 - a * 0.6], [60, 70 - a * 0.2], [100, 100]), 9, "#2a2430");
  p.stroke(curve([100, 100], [140, 70 - a * 0.2], [180, 100 - a * 0.6]), 9, "#2a2430");
};

// ================= "Dead-End Job" cast + props (our own designs) =================
export const JUSTIN: Outfit = { jacket: "#e0a032", pants: "#3a4466", boots: "#e8e4dc", hat: "hair", hair: "#3b2a22", skin: "#f5d2b4", buttons: "#c07f1e" };
export const SISTER: Outfit = { jacket: "#3fa7a0", pants: "#2e3550", boots: "#c2456a", hat: "hair", hair: "#3b2a22", skin: "#f5d2b4", dress: "#c2456a" };
export const FRIEND: Outfit = { jacket: "#7ab648", pants: "#3b3f52", boots: "#2a2a30", hat: "cap", cap: "#d8433a", skin: "#c99067" };
export const DETECTIVE: Outfit = { jacket: "#a8865a", pants: "#3a3530", boots: "#2a2018", hat: "fedora", cap: "#4a3b2c", skin: "#ecd0b6", moustache: "#5a4030", coat: true, build: "stout", buttons: "#5a4030" };
export const RECRUITER: Outfit = { jacket: "#2b2238", pants: "#221b2c", boots: "#141018", hat: "hair", hair: "#141018", skin: "#e8e0d8", tie: "#d8264a" };
export const CLOWN: Outfit = { jacket: "#f0ece2", pants: "#d8433a", boots: "#2a2a30", hat: "clown", skin: "#f7f5f0", nose: "#e2263a", buttons: "#e2263a" };

/** monster A: tall lanky violet thing, one huge eye, long arms (600 x 1000 design, soles at 975); phase = walk 0..1 */
export const monsterTall = (p: Pen, phase: number, blink = 0, light = DEF_LIGHT) => {
  const two = Math.PI * 2, bob = 10 * Math.cos(2 * two * phase), thick = thickAngle(light);
  const col = "#7a4cc2", dark = "#4e2e86";
  for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
    const up = Math.max(0, Math.sin(two * (phase + ph))) * 40;
    p.stroke([[300 + side * 30, 640 + bob], [300 + side * 46, 820], [300 + side * 40, 965 - up]], 22, dark);
    p.ell(300 + side * 52, 968 - up, 34, 12, INK, 0);
  }
  const body = blobPts(300, 430 + bob, { a: 120, b: 250, nTop: 1.6, nBot: 2.4, egg: -0.15, asym: 0, rot: 0, noise: 0.02, seed: 4 });
  for (const side of [-1, 1]) {
    const sw = 18 * Math.sin(two * phase) * side;
    p.stroke(curve([300 + side * 95, 330 + bob], [300 + side * 175, 520 + bob + sw], [300 + side * 150, 760 + bob]), 18, dark);
    for (const k of [-1, 0, 1]) p.stroke([[300 + side * 150, 760 + bob], [300 + side * (150 + 12 * k), 800 + bob]], 7, INK);
  }
  p.shadedFill(body, col, dark, light, 200);
  p.inkRing(body, 12, thick);
  // the eye
  const ey = 330 + bob;
  p.ell(300, ey, 72, 62, "#fff8d8", 8);
  if (blink >= 1) p.stroke([[234, ey], [366, ey]], 10);
  else { p.ell(300, ey + 6, 30, 32, "#f2c230", 0); p.ell(300, ey + 6, 8, 26, INK, 0); }
  // little grin with teeth
  const my = 520 + bob;
  p.poly([[230, my], [370, my], [340, my + 40], [260, my + 40]], "#2a0e22", 6);
  for (let i = 0; i < 5; i++) p.poly([[245 + i * 25, my + 2], [270 + i * 25, my + 2], [257 + i * 25, my + 20]], "#fffbe8", 2);
};

/** monster B: squat green blob, three eyes, big toothy mouth (600 x 1000, soles 975); phase = waddle */
export const monsterBlob = (p: Pen, phase: number, blink = 0, light = DEF_LIGHT) => {
  const two = Math.PI * 2, sq = 1 + 0.05 * Math.sin(2 * two * phase), thick = thickAngle(light);
  const col = "#5fb04a", dark = "#3a7a34";
  for (const side of [-1, 1]) {
    const up = Math.max(0, Math.sin(two * (phase + (side > 0 ? 0.5 : 0)))) * 26;
    p.ell(300 + side * 70, 955 - up, 48, 26, dark, 8);
  }
  const body = blobPts(300, 800 - 120 * sq + 120, { a: 175 / Math.sqrt(sq), b: 170 * sq, nTop: 2.0, nBot: 2.6, egg: 0.12, asym: 0, rot: 0.04 * Math.sin(two * phase), noise: 0.025, seed: 9 });
  p.shadedFill(body, col, dark, light, 200);
  p.inkRing(body, 12, thick);
  const top = 800 - 170 * sq;
  for (const [dx, dy, r] of [[-70, 60, 30], [0, 30, 38], [70, 60, 30]] as const) {
    const ex = 300 + dx, ey = top + dy + 40;
    p.ell(ex, ey, r, r, "#fffbe8", 6);
    if (blink >= 1) p.stroke([[ex - r, ey], [ex + r, ey]], 8);
    else p.dot(ex + 4, ey + 4, r * 0.42, INK);
  }
  const my = top + 190;
  p.ell(300, my, 120, 70, "#2a0e22", 8, 0, 180);
  for (let i = 0; i < 6; i++) p.poly([[195 + i * 35, my + 2], [225 + i * 35, my + 2], [210 + i * 35, my + 30]], "#fffbe8", 2);
};

/** an unpaid bill (300 x 200 canvas): paper, a red PAST DUE stripe, scribble lines, a dollar sign */
export const fxBill = (p: Pen, seed: number) => {
  const r = (k: number) => rnd(seed, k);
  const tint = ["#f6f1e2", "#efe6cf", "#f3ecd9"][seed % 3];
  p.poly(rrect(10, 10, 290, 190, 6), tint, 6);
  p.poly([[10, 18], [290, 18], [290, 50], [10, 50]], ["#d8343a", "#e0603a", "#c22a4a"][seed % 3], 0);
  for (let i = 0; i < 4; i++) p.stroke([[40, 80 + i * 24], [40 + 140 + 60 * r(i), 80 + i * 24]], 6, "#8d8a9a");
  p.g.font = "bold 70px sans-serif"; p.g.fillStyle = "#c22a3a"; p.g.textAlign = "center"; p.g.fillText("$", 245, 170);
  p.poly(rrect(10, 10, 290, 190, 6), null, 6);
};

/** a fat stack of cash (400 x 300) */
export const fxCash = (p: Pen) => {
  for (let i = 5; i >= 0; i--) {
    const y = 60 + i * 34;
    p.poly(rrect(30, y, 370, y + 60, 8), i % 2 ? "#6fbf5a" : "#7fd06a", 5);
    p.ell(200, y + 30, 26, 20, "#4e9a42", 3);
    p.poly([[175, y], [225, y], [225, y + 60], [175, y + 60]], "#f2e6b8", 3);
  }
};

/** the rule sheet (700 x 1000): numbered rules as icons (eye, midnight clock, no-look), a signature line, a red seal; k = how red/doomed 0..1 */
export const fxRules = (p: Pen, k: number) => {
  p.poly([[40, 30], [660, 20], [672, 970], [30, 980]], "#f4ecd2", 10);
  p.poly([[40, 30], [660, 20], [662, 120], [38, 128]], "#2b2238", 0);
  p.ell(350, 74, 70, 34, "#f4ecd2", 4); p.ell(350, 74, 22, 22, "#d8264a", 0); p.dot(350, 74, 9, INK); // agency eye logo
  const rows: [number, (x: number, y: number) => void][] = [
    [230, (x, y) => { p.ell(x, y, 46, 30, "#ffffff", 5); p.dot(x, y, 15, INK); }],
    [420, (x, y) => { p.ell(x, y, 42, 42, "#ffffff", 5); p.stroke([[x, y], [x, y - 32]], 7); p.stroke([[x, y], [x + 2, y - 24]], 7); }],
    [610, (x, y) => { p.ell(x, y, 46, 30, "#ffffff", 5); p.stroke([[x - 50, y + 36], [x + 50, y - 36]], 9, "#d8264a"); }],
  ];
  rows.forEach(([y, icon], i) => {
    p.g.font = "bold 64px serif"; p.g.fillStyle = INK; p.g.textAlign = "center"; p.g.fillText(`${i + 1}`, 105, y + 22);
    icon(215, y);
    for (let j = 0; j < 3; j++) p.stroke([[300, y - 30 + j * 30], [600 - 60 * ((i + j) % 2), y - 30 + j * 30]], 9, "#5a5468");
  });
  p.stroke([[100, 840], [420, 830]], 6, "#5a5468");
  p.stroke([[110, 820], [150, 790], [190, 830], [230, 795], [280, 828]], 5, "#2a3a9a");
  if (k > 0) {
    p.g.save(); p.g.globalAlpha = Math.min(1, k);
    p.ell(560, 830, 80, 80, "#c41e2e", 8);
    // skull on the seal
    p.ell(560, 818, 40, 36, "#f4ecd2", 4); p.dot(545, 818, 10, "#c41e2e"); p.dot(575, 818, 10, "#c41e2e");
    p.poly([[540, 846], [580, 846], [575, 866], [545, 866]], "#f4ecd2", 4);
    p.g.restore();
  }
};

/** wall clock at midnight (300 x 300); glow = how much the face shines */
export const fxClock = (p: Pen, tick: number) => {
  p.ell(150, 150, 130, 130, "#f6f2e6", 12);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.stroke([[150 + 100 * Math.sin(a), 150 - 100 * Math.cos(a)], [150 + 115 * Math.sin(a), 150 - 115 * Math.cos(a)]], i % 3 ? 5 : 10); }
  p.stroke([[150, 150], [150, 70]], 14);
  const a = (tick / 60) * Math.PI * 2;
  p.stroke([[150, 150], [150 + 100 * Math.sin(a), 150 - 100 * Math.cos(a)]], 6, "#d8264a");
  p.dot(150, 150, 12);
};

/** a missing poster with the father's portrait and a big question mark (600 x 800); mark = red agency eye stamped on it 0..1 */
export const fxPoster = (p: Pen, mark: number) => {
  p.poly([[30, 30], [570, 22], [578, 780], [22, 772]], "#efe8d2", 8);
  p.poly([[90, 110], [510, 104], [512, 480], [88, 486]], "#9fb0c8", 6);
  // the portrait: a stout man with a moustache and glasses
  const H = headBlob(17, 118, 0);
  const sc = 1.25;
  p.g.save(); p.g.translate(300, 330); p.g.scale(sc, sc); p.g.translate(-300, -330);
  p.poly(blobPts(300, 470, { a: 150, b: 90, nTop: 2.2, nBot: 2.6, egg: 0, asym: 0, rot: 0, noise: 0.006, seed: 3 }), "#5a6a4a", 5);
  const hp = blobPts(300, 330, H);
  p.poly(hp, "#f2cfae", 6);
  p.poly(hp.filter(([, y]) => y < 260), "#6b5a4a", 6);
  faceFront(p, 300, 330, 2 * H.a, "tender", 0, 0, 0, false, "#f2cfae", "#6b5a4a", true);
  for (const s of [-1, 1]) p.ell(300 + s * 31, 330, 20, 17, null, 4);
  p.stroke([[290, 328], [310, 328]], 4);
  p.g.restore();
  p.g.font = "bold 190px serif"; p.g.fillStyle = "#c41e2e"; p.g.textAlign = "center"; p.g.fillText("?", 300, 700);
  for (const [x, y] of [[60, 60], [540, 54], [548, 746], [52, 740]]) p.dot(x, y, 12, "#d8264a");
  if (mark > 0) {
    p.g.save(); p.g.globalAlpha = Math.min(1, mark);
    p.ell(420, 640, 70, 42, "#d8264a", 8); p.ell(420, 640, 27, 27, "#efe8d2", 0); p.dot(420, 640, 12, INK);
    p.g.restore();
  }
};

/** cork board of clues (1000 x 760): photos, the agency card, a poster, pinned and joined with red string; k = strings drawn 0..1 */
export const fxBoard = (p: Pen, k: number) => {
  p.poly(rrect(10, 10, 990, 750, 14), "#b98a55", 14);
  const g = p.g, r = (i: number) => rnd(7, i);
  for (let i = 0; i < 260; i++) p.dot(30 + 940 * r(i), 30 + 700 * r(i + 500), 3 + 3 * r(i + 900), "#a57844");
  const pins: P2[] = [[180, 150], [500, 120], [820, 170], [260, 470], [620, 420], [840, 560], [420, 640]];
  const card = (x: number, y: number, w: number, h: number, i: number) => {
    p.poly([[x - w / 2, y - 10], [x + w / 2, y - 14], [x + w / 2 + 4, y + h], [x - w / 2 + 2, y + h + 4]], "#f4efe2", 5);
    const drawIn = [
      () => { p.ell(x, y + h * 0.5, w * 0.3, w * 0.3, "#7a4cc2", 4); p.ell(x, y + h * 0.42, w * 0.13, w * 0.11, "#fff8d8", 3); }, // monster
      () => { p.ell(x, y + h * 0.5, w * 0.3, w * 0.22, "#2b2238", 4); p.ell(x, y + h * 0.5, w * 0.09, w * 0.09, "#d8264a", 0); }, // agency eye
      () => { p.ell(x, y + h * 0.45, w * 0.22, w * 0.22, "#f7f5f0", 4); p.dot(x, y + h * 0.5, w * 0.06, "#e2263a"); p.dot(x - w * 0.2, y + h * 0.35, w * 0.08, "#e2363a"); p.dot(x + w * 0.2, y + h * 0.35, w * 0.08, "#e2363a"); }, // clown
      () => { p.poly(rrect(x - w * 0.12, y + h * 0.2, x + w * 0.12, y + h * 0.8, 8), "#ffffff", 4); p.ell(x, y + h * 0.2, w * 0.1, w * 0.04, "#4a8fd8", 2); }, // milk
      () => { p.ell(x, y + h * 0.45, w * 0.22, w * 0.22, "#f2cfae", 4); p.poly([[x - w * 0.25, y + h * 0.3], [x + w * 0.25, y + h * 0.3], [x, y + h * 0.1]], "#6b5a4a", 3); }, // father
      () => { p.poly([[x - w * 0.3, y + h * 0.3], [x + w * 0.3, y + h * 0.3], [x + w * 0.3, y + h * 0.75], [x - w * 0.3, y + h * 0.75]], "#e6ecf2", 4); p.stroke([[x, y + h * 0.36], [x, y + h * 0.69]], 10, "#3fa7a0"); p.stroke([[x - w * 0.12, y + h * 0.52], [x + w * 0.12, y + h * 0.52]], 10, "#3fa7a0"); }, // clinic
      () => { for (let j = 0; j < 3; j++) p.poly(rrect(x - w * 0.3 + j * 8, y + h * 0.3 + j * 10, x + w * 0.2 + j * 8, y + h * 0.6 + j * 10, 4), "#f6f1e2", 3); p.poly([[x - w * 0.3, y + h * 0.3], [x + w * 0.2, y + h * 0.3], [x + w * 0.2, y + h * 0.38], [x - w * 0.3, y + h * 0.38]], "#d8343a", 0); }, // bills
    ];
    drawIn[i % drawIn.length]();
  };
  pins.forEach(([x, y], i) => card(x, y, 170, 190, i));
  const order = [1, 0, 2, 1, 4, 6, 5, 1, 3, 4];
  const n = Math.floor(k * (order.length - 1) * 1.0001);
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const [a, b] = [pins[order[i]], pins[order[i + 1]]];
    p.stroke([[a[0], a[1] - 4], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 30], [b[0], b[1] - 4]], 6, "#d8202e");
  }
  for (const [x, y] of pins) { p.dot(x, y - 4, 13, INK); p.dot(x, y - 4, 10, "#e2363a"); }
};

/** a floating question mark (200 x 300) */
export const fxQ = (p: Pen, col = "#f2d23a") => {
  p.g.font = "bold 280px serif"; p.g.textAlign = "center";
  p.g.lineWidth = 22; p.g.strokeStyle = INK; p.g.strokeText("?", 100, 260);
  p.g.fillStyle = col; p.g.fillText("?", 100, 260);
};

/** glowing eyes in a dark gap (400 x 200) */
export const fxEyes = (p: Pen, open: number, col = "#f2e23a") => {
  for (const s of [-1, 1]) {
    const x = 200 + s * 70;
    p.ell(x, 100, 46, 46 * Math.max(0.05, open), col, 0, 0, 360, s * 12);
    if (open > 0.3) p.ell(x + s * 4, 104, 8, 30 * open, INK, 0);
  }
};

/** the giant debt monster (1000 x 1000): violet shadow with many eyes and a huge grin; open = eyes 0..1, maw = mouth 0..1 */
export const fxGiant = (p: Pen, open: number, maw: number) => {
  const body = blobPts(500, 560, { a: 440, b: 420, nTop: 1.7, nBot: 3.2, egg: -0.08, asym: 0, rot: 0, noise: 0.03, seed: 21 });
  for (const s of [-1, 1]) p.poly([[500 + s * 230, 230], [500 + s * 330, 30], [500 + s * 300, 260]], "#4a2270", 10);
  p.poly(body, "#4a2270", 0);
  p.shadedFill(body, "#5a2a86", "#2a1040", -Math.PI / 2, 440, 0.3);
  p.inkRing(body, 22, Math.PI / 2, 0.3, "#ff4ad8");
  const eyes: [number, number, number][] = [[380, 360, 50], [620, 360, 50], [500, 300, 38], [280, 450, 30], [720, 450, 30], [430, 250, 24], [570, 250, 24]];
  for (const [x, y, r] of eyes) {
    const k = Math.max(0.06, open);
    p.ell(x, y, r, r * k, "#ffe23a", 0);
    if (open > 0.35) p.ell(x, y, r * 0.25, r * 0.8 * k, INK, 0);
  }
  if (maw > 0) {
    const my = 600, mw = 300, mh = 40 + 170 * maw;
    p.ell(500, my, mw, mh, "#12040c", 0, 0, 180);
    p.ell(500, my, mw, 26, "#12040c", 0, 180, 360);
    for (let i = 0; i < 9; i++) {
      const x = 500 - mw + 40 + i * ((2 * mw - 80) / 8), y = my - 10;
      p.poly([[x - 26, y], [x + 26, y], [x, y + 46 + 20 * maw]], "#fff8e0", 4);
    }
  }
};

/** a white flash card / soft glow (256): used for light pools and puffs */
export const fxGlow = (p: Pen, col: string) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};

/** a blue milk crate full of bottles (300 x 260) */
export const fxCrate = (p: Pen) => {
  for (let i = 0; i < 4; i++) { const bx = 50 + i * 67; p.poly(rrect(bx - 20, 20, bx + 20, 120, 12), "#f6f4ee", 5); p.ell(bx, 20, 15, 7, "#4a8fd8", 4); }
  p.poly(rrect(14, 100, 286, 250, 10), "#3f78c2", 7);
  for (let i = 1; i < 4; i++) p.stroke([[14 + i * 68, 110], [14 + i * 68, 240]], 5, "#2a5590");
};
