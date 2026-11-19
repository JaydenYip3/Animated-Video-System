// The relief map's painted top for "mao-zedong-3": a static base (sea, land, borders, rivers, relief hachures, paper
// grain) painted once, plus the story overlays painted per frame as pure functions of t: red (Communist) and blue
// (Nationalist) territories, the grey Japanese occupation, the Long March ribbon and cartoon arrows. No text.
import { CHINA, TAIWAN, KOREA, JAPAN, OTHER, RIVERS, Ring } from "./geo";
import { MAP_BB, KX, W, ROUTE, routeK, routeAt, ringR, smooth, easeOut, clamp01, LL, RUIJIN, JINGGANG, NANJING, YANAN, MANCHURIA, BEIJING } from "./story";
import { rng } from "./paint";

export const CW = 4096;
export const CH = Math.round((CW * (MAP_BB.lat1 - MAP_BB.lat0)) / ((MAP_BB.lon1 - MAP_BB.lon0) * KX));
const PX = CW / (MAP_BB.lon1 - MAP_BB.lon0); // canvas px per degree of longitude (PX / KX = PY: isotropic metres)
const PY = CH / (MAP_BB.lat1 - MAP_BB.lat0); // per degree of latitude
export const cx = (lon: number) => (lon - MAP_BB.lon0) * PX;
export const cy = (lat: number) => (MAP_BB.lat1 - lat) * PY;

export const COL = {
  sea: "#7d8f8d", seaDeep: "#6c7f7e", land: "#cbbd9b", china: "#ddc894", ink: "#2a2421", river: "#6f8a8c",
  red: "#b23a2c", redDark: "#6e1d17", blue: "#3e5f8a", blueDark: "#1f3352", grey: "#77746e", greyDark: "#3f3d3a",
};

/** clip a lon/lat ring to the map board (Sutherland-Hodgman) */
export const clipRing = (r: Ring): Ring => {
  const B = MAP_BB;
  const edges: [(p: [number, number]) => boolean, (a: [number, number], b: [number, number]) => [number, number]][] = [
    [(p) => p[0] >= B.lon0, (a, b) => { const t = (B.lon0 - a[0]) / (b[0] - a[0]); return [B.lon0, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[0] <= B.lon1, (a, b) => { const t = (B.lon1 - a[0]) / (b[0] - a[0]); return [B.lon1, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[1] >= B.lat0, (a, b) => { const t = (B.lat0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), B.lat0]; }],
    [(p) => p[1] <= B.lat1, (a, b) => { const t = (B.lat1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), B.lat1]; }],
  ];
  let out = r.slice();
  if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  for (const [inside, cut] of edges) {
    const inp = out; out = [];
    if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); }
      else if (inside(a)) out.push(cut(a, b));
    }
  }
  return out;
};
export const LANDS: { rings: Ring[]; china: boolean }[] = [
  { rings: CHINA.map(clipRing).filter((r) => r.length > 2), china: true },
  { rings: [...TAIWAN, ...KOREA, ...JAPAN, ...OTHER].map(clipRing).filter((r) => r.length > 2), china: false },
];

type G = CanvasRenderingContext2D;
const ringPath = (g: G, rings: Ring[]) => {
  g.beginPath();
  for (const r of rings) r.forEach(([lo, la], i) => (i ? g.lineTo(cx(lo), cy(la)) : g.moveTo(cx(lo), cy(la))));
};
const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

let BASE: HTMLCanvasElement | null = null;
const base = () => {
  if (BASE) return BASE;
  const c = mk(CW, CH), g = c.getContext("2d")!, r = rng(1949);
  // sea with a soft vignette toward the board edge, faint graticule
  g.fillStyle = COL.sea; g.fillRect(0, 0, CW, CH);
  const gr = g.createRadialGradient(CW * 0.55, CH * 0.5, CW * 0.15, CW * 0.55, CH * 0.5, CW * 0.75);
  gr.addColorStop(0, "rgba(255,250,235,0.06)"); gr.addColorStop(1, "rgba(40,36,32,0.25)");
  g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
  g.strokeStyle = "rgba(240,232,214,0.16)"; g.lineWidth = 3;
  for (let lo = 80; lo <= 140; lo += 10) { g.beginPath(); g.moveTo(cx(lo), 0); g.lineTo(cx(lo), CH); g.stroke(); }
  for (let la = 15; la <= 55; la += 10) { g.beginPath(); g.moveTo(0, cy(la)); g.lineTo(CW, cy(la)); g.stroke(); }
  // sea wave ticks
  g.strokeStyle = "rgba(230,236,226,0.18)"; g.lineWidth = 4;
  for (let i = 0; i < 260; i++) {
    const x = r() * CW, y = r() * CH;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 8, x + 28, y); g.stroke();
  }
  // land
  for (const L of [LANDS[1], LANDS[0]]) {
    ringPath(g, L.rings); g.fillStyle = L.china ? COL.china : COL.land; g.fill("evenodd");
  }
  // paper grain + relief hachures in the west (clipped to land)
  g.save(); ringPath(g, [...LANDS[0].rings, ...LANDS[1].rings]); g.clip("evenodd");
  for (let i = 0; i < 26000; i++) {
    const x = r() * CW, y = r() * CH;
    g.fillStyle = r() < 0.5 ? "rgba(120,96,60,0.07)" : "rgba(255,248,226,0.08)";
    g.fillRect(x, y, 3 + r() * 5, 3 + r() * 5);
  }
  g.strokeStyle = "rgba(110,86,52,0.35)"; g.lineWidth = 4; g.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const lo = 78 + r() * 26, la = 27 + r() * 12;
    if (lo > 100 && la < 30) continue;
    const x = cx(lo), y = cy(la), s = 10 + r() * 12;
    g.beginPath(); g.moveTo(x - s, y + s * 0.5); g.lineTo(x, y - s * 0.6); g.lineTo(x + s, y + s * 0.5); g.stroke();
  }
  g.restore();
  // rivers
  g.strokeStyle = COL.river; g.lineCap = "round"; g.lineJoin = "round";
  for (const rv of RIVERS) {
    g.lineWidth = rv.n === "Yangtze" || rv.n === "Chang Jiang" || rv.n === "Huang" ? 9 : 6;
    g.beginPath(); rv.p.forEach(([lo, la], i) => (i ? g.lineTo(cx(lo), cy(la)) : g.moveTo(cx(lo), cy(la)))); g.stroke();
  }
  // borders: other countries thin, China bold
  g.strokeStyle = COL.ink; g.lineWidth = 5;
  ringPath(g, LANDS[1].rings); g.stroke();
  g.lineWidth = 9; ringPath(g, LANDS[0].rings); g.stroke();
  // board edge frame
  g.strokeStyle = "rgba(42,36,33,0.8)"; g.lineWidth = 26; g.strokeRect(13, 13, CW - 26, CH - 26);
  g.strokeStyle = "rgba(42,36,33,0.5)"; g.lineWidth = 6; g.strokeRect(52, 52, CW - 104, CH - 104);
  BASE = c;
  return c;
};

// ---------------- territories ----------------
type Blob = [number, number, number]; // lon, lat, radius (deg of latitude)
const HALF = 2; // territory layers at half resolution
const layer = (() => { let c: HTMLCanvasElement | null = null; return () => (c ??= mk(CW / HALF, CH / HALF)); })();
/** paint a union of discs as one flat territory with a dark rim, clipped to `clip`, onto g */
const territory = (g: G, blobs: Blob[], fill: string, rim: string, alpha: number, clip: Ring[] | null) => {
  const live = blobs.filter((b) => b[2] > 0.02);
  if (!live.length || alpha <= 0.01) return;
  const L = layer(), lg = L.getContext("2d")!;
  lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, L.width, L.height); lg.setTransform(1 / HALF, 0, 0, 1 / HALF, 0, 0);
  const disc = (b: Blob, extra: number) => { lg.beginPath(); lg.ellipse(cx(b[0]), cy(b[1]), b[2] * PY + extra, b[2] * PY + extra, 0, 0, Math.PI * 2); lg.fill(); };
  lg.fillStyle = rim; for (const b of live) disc(b, 14);
  lg.fillStyle = fill; for (const b of live) disc(b, 0);
  // diagonal hatch for texture
  lg.globalCompositeOperation = "source-atop"; lg.strokeStyle = "rgba(255,240,220,0.10)"; lg.lineWidth = 10;
  for (let x = -CH; x < CW; x += 46) { lg.beginPath(); lg.moveTo(x, CH); lg.lineTo(x + CH, 0); lg.stroke(); }
  lg.globalCompositeOperation = "source-over";
  g.save();
  if (clip) { ringPath(g, clip); g.clip("evenodd"); }
  g.globalAlpha = alpha; g.drawImage(L, 0, 0, CW, CH); g.globalAlpha = 1;
  g.restore();
};
const fillLand = (g: G, rings: Ring[], fill: string, alpha: number) => {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha = alpha; ringPath(g, rings); g.fillStyle = fill; g.fill("evenodd"); g.restore();
};

// ---------------- arrows + ribbon ----------------
const pathPts = (pts: LL[], k: number): [number, number][] => {
  const P = pts.map(([lo, la]) => [cx(lo), cy(la)] as [number, number]);
  const seg = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]));
  const tot = seg.reduce((a, b) => a + b, 0) * clamp01(k);
  const out: [number, number][] = [P[0]];
  let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= tot) { const u = (tot - acc) / (seg[i] || 1); out.push([P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u]); break; }
    acc += seg[i]; out.push(P[i + 1]);
  }
  return out;
};
/** smooth a polyline (Chaikin, 2 rounds) */
const chaikin = (p: [number, number][], n = 2): [number, number][] => {
  let q = p;
  for (let r = 0; r < n; r++) {
    if (q.length < 3) return q;
    const o: [number, number][] = [q[0]];
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i], b = q[i + 1];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    o.push(q[q.length - 1]); q = o;
  }
  return q;
};
/** fat cartoon arrow along pts (lon/lat), grown to k (0..1), ink rim */
const arrow = (g: G, pts: LL[], k: number, fill: string, w = 46, alpha = 1) => {
  if (k <= 0.01 || alpha <= 0.01) return;
  const P = chaikin(pathPts(pts, k));
  if (P.length < 2) return;
  const a = P[P.length - 2], b = P[P.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const head = w * 1.5, tip: [number, number] = [b[0] + Math.cos(ang) * head * 0.9, b[1] + Math.sin(ang) * head * 0.9];
  g.save(); g.globalAlpha = alpha; g.lineCap = "round"; g.lineJoin = "round";
  const line = (ww: number, col: string) => { g.strokeStyle = col; g.lineWidth = ww; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const tri = () => { g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(b[0] + Math.cos(ang + 1.9) * head, b[1] + Math.sin(ang + 1.9) * head); g.lineTo(b[0] + Math.cos(ang - 1.9) * head, b[1] + Math.sin(ang - 1.9) * head); g.closePath(); };
  line(w + 20, COL.ink); tri(); g.fillStyle = COL.ink; g.lineWidth = 20; g.strokeStyle = COL.ink; g.stroke(); g.fill();
  line(w, fill); tri(); g.fillStyle = fill; g.fill();
  g.restore();
};
/** the Long March: dashed red ribbon with an ink rim */
const ribbon = (g: G, k: number, alpha = 1) => {
  if (k <= 0.005 || alpha <= 0.01) return;
  const P = chaikin(pathPts(ROUTE, k));
  g.save(); g.globalAlpha = alpha; g.lineCap = "round"; g.lineJoin = "round";
  const line = (w: number, col: string, dash: number[] = []) => { g.setLineDash(dash); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  line(58, COL.ink); line(40, COL.red); line(10, "#f3dcc0", [34, 40]);
  g.setLineDash([]); g.restore();
};

// ---------------- the state of the map at time t ----------------
const R = (t: number, t0: number, dur: number) => easeOut((t - t0) / dur);
const S = (t: number, t0: number, dur: number) => smooth((t - t0) / dur);
const mainland = () => LANDS[0].rings;

export const paintMap = (g: G, t: number) => {
  g.drawImage(base(), 0, 0);
  const china = mainland();
  // ---- blue: Nationalist China ----
  const nat = t < 15 ? R(t, W.nationalists - 0.1, 1.0) : 1;
  const shrink = 1 - S(t, 39.5, 1.7);
  const blue: Blob[] = t < 15
    ? [[NANJING[0], NANJING[1], 9.5 * nat], [113.3, 23.1, 4.2 * R(t, W.nationalists + 0.2, 0.9)], [114.3, 30.6, 5.5 * R(t, W.nationalists + 0.1, 1.0)]]
    : [[NANJING[0], NANJING[1], 10.5 * shrink], [113.3, 23.1, 6 * shrink], [114.3, 30.6, 7 * shrink], [106.5, 29.5, 6 * shrink], [116.4, 39.9, 6 * shrink], [102.7, 25.0, 5 * shrink]];
  territory(g, blue, COL.blue, COL.blueDark, 0.62, china);
  // Taiwan turns Nationalist as the mainland is lost
  fillLand(g, TAIWAN, COL.blue, 0.75 * S(t, 40.5, 0.5));
  // ---- red: Communist bases ----
  const red: Blob[] = [];
  if (t < 15) {
    red.push([JINGGANG[0], JINGGANG[1], 1.2 * R(t, W.communists - 0.1, 0.5)], [115.7, 27.4, 0.8 * R(t, W.communists + 0.05, 0.5)], [115.0, 31.4, 0.75 * R(t, W.communists + 0.2, 0.5)]);
  } else if (t < 37) {
    const pocket = t < W.broke ? Math.min(2.3, ringR(t) - 0.6) : 2.3 * (1 - S(t, W.broke, 0.8));
    red.push([RUIJIN[0] - 0.4, RUIJIN[1] + 0.3, pocket]);
    red.push([YANAN[0], YANAN[1] + 0.2, 1.9 * S(t, 24.0, 0.8)]);
  } else {
    const g1 = S(t, 38.9, 2.0), g2 = S(t, 38.7, 1.6);
    red.push([YANAN[0], YANAN[1] + 0.2, 1.9 + 22 * g1], [MANCHURIA[0], MANCHURIA[1], 11 * g2], [BEIJING[0], BEIJING[1], 6 * g2]);
  }
  territory(g, red, COL.red, COL.redDark, 0.72, china);
  if (t >= 41.0) fillLand(g, china, COL.red, 0.72 * S(t, 41.0, 0.3));
  // ---- grey: Japan's empire (1937 shot): its colonies, Manchuria, the north and the coast ----
  if (t > 28 && t < 39) {
    const a = 0.7 * (1 - S(t, W.surrendered - 0.1, 0.9));
    fillLand(g, [...JAPAN, ...KOREA, ...TAIWAN], COL.grey, a * 0.9);
    const inv = R(t, W.japan - 0.05, 1.1);
    territory(g, [[127.0, 45.0, 6.5], [123.0, 42.0, 4.2], [BEIJING[0], BEIJING[1], 3.6 * inv], [118.0, 37.0, 3.2 * inv], [121.0, 31.4, 2.6 * inv], [NANJING[0], NANJING[1], 1.8 * inv]],
      COL.grey, COL.greyDark, a, china);
    arrow(g, [[126.5, 43.5], [122.0, 41.3], [117.6, 40.0]], R(t, W.japan, 0.8), COL.grey, 44, a / 0.7);
    arrow(g, [[126.0, 29.5], [123.6, 30.6], [121.8, 31.1]], R(t, W.invaded - 0.1, 0.7), COL.grey, 44, a / 0.7);
  }
  // ---- arrows of the war years ----
  if (t > 9 && t < 15) arrow(g, [[NANJING[0] - 0.6, NANJING[1] - 0.6], [116.6, 29.5], [115.0, 27.6]], R(t, W.nationalists + 0.35, 0.8), COL.blue, 40);
  if (t > 38 && t < 43) {
    const fa = 1 - S(t, 41.1, 0.3);
    arrow(g, [[110.0, 36.0], [112.6, 32.5], [113.4, 28.0], [113.6, 24.2]], R(t, W.civil - 0.1, 1.4), COL.red, 46, fa);
    arrow(g, [[124.0, 42.0], [118.6, 37.6], [118.6, 33.0], [119.6, 29.0]], R(t, W.civil + 0.1, 1.3), COL.red, 46, fa);
    arrow(g, [[107.5, 33.0], [105.0, 29.8], [103.0, 26.0]], R(t, W.again - 0.2, 0.9), COL.red, 40, fa);
  }
  if (t > 43 && t < 48) {
    arrow(g, [[124.4, 40.4], [125.6, 39.1], [126.7, 37.7]], R(t, W.troops - 0.1, 0.9), COL.red, 40);
    arrow(g, [[126.5, 41.6], [127.2, 40.2], [127.8, 38.6]], R(t, W.troops + 0.1, 0.9), COL.red, 40);
    arrow(g, [[128.9, 35.3], [128.3, 36.6], [127.4, 38.1]], R(t, W.united - 0.15, 0.8), COL.blue, 40);
  }
  // ---- the Long March ribbon (stays on the map afterwards, quieter) ----
  const rk = routeK(t);
  ribbon(g, rk, t < 26 ? 1 : 0.55);
  // overview: the half century's arrows, faint
  if (t > 49) {
    arrow(g, [[110.0, 36.0], [112.6, 32.5], [113.4, 28.0], [113.6, 24.2]], 1, COL.red, 40, 0.4);
    arrow(g, [[124.4, 40.4], [125.6, 39.1], [126.7, 37.7]], 1, COL.red, 34, 0.4);
  }
};
export { routeAt };
