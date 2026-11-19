// Timeline of "mao-zedong": shots timed to the narration words (outputs/mao-zedong/build/voice/words.json, faster-whisper
// word times hand-fixed against the measured pauses). 54.0 s of audio (voice ends 53.62 s): 1911 at the palace gate ->
// the boy emperor falls -> young Mao enlists -> the map: 1927 red vs blue -> the Jinggang hills -> 1934 encirclement ->
// the Long March ribbon -> the snow pass -> the column thins -> 1937 Japan -> side by side in a trench -> 1945/49 on
// the map -> the gate, 1949 -> Korea on the map -> night march -> the son's cap in the snow -> the whole map -> modern
// skyline. Places are open exteriors 1000 m apart, each on its own ground; the MAP is a painted relief map of East Asia.
export const FPS = 30;
export const TOTAL = 1620; // 54.0 s = the narration file exactly
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const T = (f: number) => f / FPS;

// ---------------- places ----------------
export const GATE: V3 = [0, 0, 0];         // the palace gate (1911) / the same gate in 1949
export const CAMP: V3 = [1000, 0, 0];      // the barracks yard, Changsha 1911
export const HILLS: V3 = [-1000, 0, 0];    // the Jinggang mountains
export const SNOW: V3 = [0, 0, 1000];      // snow: the pass (+0), the night march (+60 x), the cap (+120 x)
export const TRENCH: V3 = [1000, 0, 1000]; // sandbags, 1937-45
export const CITY: V3 = [-1000, 0, 1000];  // modern skyline (golden)
export const MAP: V3 = [0, 0, -1000];      // the relief map: (lon 105, lat 35) at MAP
export const INSIDE_X = 1e9;               // no sealed interiors in this short
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- the map ----------------
/** map extent (degrees) and scale: 1 m per degree of latitude, cos(35 deg) per degree of longitude; north = -z */
export const MAP_BB = { lon0: 62, lon1: 152, lat0: 4, lat1: 60 };
export const KX = 0.82;
export const geo = (lon: number, lat: number, y = 0): V3 => [MAP[0] + (lon - 105) * KX, MAP[1] + y, MAP[2] - (lat - 35)];
export const MAP_W = (MAP_BB.lon1 - MAP_BB.lon0) * KX, MAP_H = MAP_BB.lat1 - MAP_BB.lat0;
export const MAP_C = geo((MAP_BB.lon0 + MAP_BB.lon1) / 2, (MAP_BB.lat0 + MAP_BB.lat1) / 2);

/** the Long March, Ruijin -> Xiang River -> Zunyi -> Chishui -> Jinsha -> Luding -> Jiajin Shan -> grasslands -> Wuqi -> Yan'an */
export const ROUTE: [number, number][] = [
  [116.0, 25.9], [114.6, 25.4], [113.2, 25.3], [111.6, 25.6], [110.6, 25.9], [109.4, 26.4], [108.2, 27.0], [106.9, 27.7],
  [105.9, 28.2], [105.4, 27.4], [104.6, 26.6], [103.4, 26.2], [102.6, 26.9], [102.4, 28.2], [102.2, 29.9], [102.7, 30.8],
  [102.6, 31.9], [102.6, 33.0], [103.6, 34.0], [105.2, 35.3], [106.8, 36.2], [108.2, 36.9], [109.5, 36.6],
];
export const RUIJIN: [number, number] = [116.0, 25.9];
export const YANAN: [number, number] = [109.5, 36.6];
export const JINGGANG: [number, number] = [114.1, 26.6];

// ---------------- story beats (seconds, from words.json, hand-fixed) ----------------
export const W = {
  y1911: 0.12, revolution: 0.96, swept: 1.42, china: 1.92, last: 2.9, emperor: 3.18, fell: 3.54,
  seventeen: 4.64, mao: 5.4, joined: 6.04, army: 6.6, private: 7.2,
  by: 8.16, y1927: 8.3, communists: 9.62, nationalists: 10.3, war: 11.26,
  mao2: 12.14, fled: 12.32, mountains: 12.96, built: 13.6, peasant: 13.98, army2: 14.36,
  y1934: 15.42, nationalist: 16.66, forces: 17.04, surrounded: 17.5, them: 17.98,
  maos: 18.8, broke: 19.36, out: 19.66, began: 20.14, long: 20.68, march: 20.94, about: 21.86, miles: 22.8, fighting: 23.4, starvation: 23.96,
  most: 25.32, roughly: 25.78, n86: 26.06, set: 27.28, never: 27.72, finished: 28.0,
  y1937: 29.22, japan: 30.4, invaded: 30.7,
  rivals: 31.88, fought: 32.28, side: 32.64, side2: 33.18, against: 33.58, japan2: 33.88, but: 34.78, truce: 35.04, never2: 35.4, held: 35.98,
  japan3: 37.04, surrendered: 37.32, y1945: 38.04, and: 39.34, civil: 39.56, war2: 39.78, again: 40.42,
  four: 41.14, years: 41.34, later: 41.66, mao3: 42.16, won: 42.34,
  y1950: 43.28, sent: 44.34, troops: 44.58, korea: 45.06, fight: 45.8, united: 46.14, states: 46.4,
  his: 47.44, son: 47.74, killed: 48.3, there: 48.54,
  mao4: 49.4, fought2: 49.62, half: 50.4, century: 50.84, those: 51.8, wars: 52.04, built2: 52.46, modern: 52.82, china2: 53.22, end: 53.62,
};
export const LEAD = 2 / FPS;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk" | "night" | "lamp" | "indoor";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; map?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 62, light: "day", sunAz: 120, sunEl: 40 },               // the gate, 1911: revolutionaries march in
  { id: 2, a: 62, b: 122, light: "day", sunAz: 110, sunEl: 40 },             // the boy emperor: his flag and hat fall
  { id: 3, a: 122, b: 236, light: "day", sunAz: 115, sunEl: 45 },            // the barracks yard: Mao joins the line
  { id: 4, a: 236, b: 362, light: "day", sunAz: 140, sunEl: 50, map: true }, // map 1927: red pockets, blue floods
  { id: 5, a: 362, b: 458, light: "day", sunAz: 120, sunEl: 35 },            // Jinggang: Mao + the peasant army
  { id: 6, a: 458, b: 560, light: "day", sunAz: 140, sunEl: 50, map: true }, // map 1934: the ring closes
  { id: 7, a: 560, b: 655, light: "day", sunAz: 140, sunEl: 50, map: true }, // map: break-out, the ribbon heads west
  { id: 8, a: 655, b: 750, light: "day", sunAz: 100, sunEl: 30 },            // the snow pass: the column trudges
  { id: 9, a: 750, b: 874, light: "dusk", sunAz: 40, sunEl: 8 },             // the long column thins out
  { id: 10, a: 874, b: 946, light: "day", sunAz: 140, sunEl: 50, map: true }, // map 1937: grey from the north-east
  { id: 11, a: 946, b: 1103, light: "dusk", sunAz: 150, sunEl: 14 },         // side by side in a trench
  { id: 12, a: 1103, b: 1234, light: "day", sunAz: 140, sunEl: 50, map: true }, // map 1945-49
  { id: 13, a: 1234, b: 1294, light: "golden", sunAz: 160, sunEl: 12 },      // the gate, 1949: Mao won
  { id: 14, a: 1294, b: 1356, light: "day", sunAz: 140, sunEl: 50, map: true }, // map 1950: across the Yalu
  { id: 15, a: 1356, b: 1414, light: "night", sunAz: 70, sunEl: 30 },        // night march in the snow
  { id: 16, a: 1414, b: 1476, light: "dusk", sunAz: 30, sunEl: 6 },          // the son's cap in the snow
  { id: 17, a: 1476, b: 1548, light: "day", sunAz: 140, sunEl: 45, map: true }, // the whole map: half a century
  { id: 18, a: 1548, b: TOTAL, light: "golden", sunAz: 170, sunEl: 10 },     // modern China at sunset
];
/** crossfades (frames) at time / place changes */
export const XFADE: Record<number, number> = { 4: 10, 5: 8, 8: 10, 9: 10, 11: 8, 13: 8, 15: 8, 16: 12, 17: 12, 18: 12 };
/** white flashes: the break-out and the 1949 gate */
export const FLASHES = [Math.round((W.broke - 0.05) * FPS)];
/** fade to black at the very end (frames from the end) */
export const FADE_OUT = 14;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the map state over time (pure functions of t) ----------------
/** Long March ribbon progress 0..1 */
export const routeK = (t: number) => t < W.broke - 0.05 ? 0 : t < 22.0 ? 0.55 * easeOut((t - (W.broke - 0.05)) / 2.6) : Math.min(1, 0.55 + 0.45 * smooth((t - 22.0) / 7.2));
/** point along the route at k (lon, lat), by arc length */
const routeLen = (() => { const out = [0]; for (let i = 1; i < ROUTE.length; i++) out.push(out[i - 1] + Math.hypot((ROUTE[i][0] - ROUTE[i - 1][0]) * KX, ROUTE[i][1] - ROUTE[i - 1][1])); return out; })();
export const routeAt = (k: number): [number, number] => {
  const L = routeLen[routeLen.length - 1] * clamp01(k);
  let i = 1; while (i < routeLen.length - 1 && routeLen[i] < L) i++;
  const u = (L - routeLen[i - 1]) / Math.max(1e-6, routeLen[i] - routeLen[i - 1]);
  return [ROUTE[i - 1][0] + (ROUTE[i][0] - ROUTE[i - 1][0]) * u, ROUTE[i - 1][1] + (ROUTE[i][1] - ROUTE[i - 1][1]) * u];
};
/** the 1934 ring radius (degrees) around Ruijin */
export const ringR = (t: number) => 4.6 - 2.6 * smooth((t - (W.forces - 0.2)) / 1.4);
/** the Korea arrows 0..1 */
export const arrowK = (t: number) => easeOut((t - (W.troops - 0.15)) / 1.1);

// ---------------- motion ----------------
/** Mao walks into the recruits' line (shot 3), x relative to CAMP */
export const MAO_W = { x0: 4.6, x1: 1.25, t0: 4.55, t1: 6.2 };
export const maoX = (t: number) => MAO_W.x0 + (MAO_W.x1 - MAO_W.x0) * smooth((t - MAO_W.t0) / (MAO_W.t1 - MAO_W.t0));
/** Mao climbs the hill path (shot 5) */
export const HILL_W = { t0: 12.0, t1: 13.55 };
export const hillPath = (t: number): V3 => { const u = smooth((t - HILL_W.t0) / (HILL_W.t1 - HILL_W.t0)); return [-2.4 + 2.4 * u, 0, -0.6 - 2.4 * u]; };
/** the column on the snow pass (shot 8): walking +x at 0.75 m/s */
export const PASS_V = 0.75;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 30)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const G = GATE, C = CAMP, H = HILLS, S = SNOW, TR = TRENCH, CI = CITY;
/** a map camera: looking at (lon, lat) from dLat degrees south, dLon east, height h */
const mapCam = (lon: number, lat: number, dLon: number, dLat: number, h: number, k: number, rest: Partial<Cam> = {}): Shot =>
  dolly(geo(lon + dLon, lat - dLat, h), geo(lon, lat), k, rest);

// 1: low wide on the plaza, the gate tower above; the revolutionaries stream in
const S1 = (f: number) => dolly(add(G, [1.5, 1.6, 17]), add(G, [0, 6.8, -8]), pushK(f, 0, 0.0035), { fov: 56, roll: -0.03 });
// 2: CU the boy emperor before the gate, the dragon flag over his shoulder
const S2 = (f: number) => dolly(add(G, [0.35, 0.95, 0.4]), add(G, [0.1, 0.95, -3.0]), pushK(f, 62, 0.004), { fov: 44, roll: 0.04 });
// 3: the barracks yard: the line of recruits, Mao walks in from the right; glide in to an MS on him
const S3a = (f: number) => dolly(add(C, [0.9, 1.45, 5.2]), add(C, [0.6, 1.25, -2.5]), pushK(f, 122, 0.003), { fov: 48, roll: -0.02 });
const S3b = (f: number) => dolly(add(C, [1.35, 1.5, 0.75]), add(C, [1.25, 1.45, -2.5]), pushK(f, 190, 0.004), { fov: 42, roll: 0.03 });
// 4: map, south-east China from the south, slow push
const S4 = (f: number) => mapCam(113.2, 27.6, -0.6, 7.5, 19, pushK(f, 236, 0.0016), { fov: 46, roll: 0.02 });
// 5: Jinggang: low front, Mao climbs toward the lens; the peasants gather behind him
const S5 = (f: number) => dolly(add(H, [0.5, 1.25, 4.2]), add(H, [0, 1.35, -3.2]), pushK(f, 362, 0.0028), { fov: 48, roll: -0.03 });
// 6: map, close over Jiangxi: the ring closes on Ruijin
const S6 = (f: number) => mapCam(115.8, 26.0, -0.4, 4.8, 11.5, pushK(f, 458, 0.0022), { fov: 46, roll: -0.02 });
// 7: map: follow the head of the ribbon west
const S7 = (f: number) => {
  const t = T(f), hd = routeAt(Math.max(0.02, routeK(t))), lag = routeAt(Math.max(0.0, routeK(t - 0.5)));
  const lon = 0.65 * hd[0] + 0.35 * lag[0], lat = 0.65 * hd[1] + 0.35 * lag[1];
  return mapCam(lon, lat, 0.8, 5.0, 11.5, 1, { fov: 46, roll: 0.03 });
};
// 8: the snow pass: side tracking with the column
const S8 = (f: number) => { const x = PASS_V * (T(f) - 21.8); return { pos: add(S, [x + 0.6, 1.25, 4.6]), look: add(S, [x + 0.9, 1.35, -2.4]), fov: 44, roll: 0.02 }; };
// 9: the long column climbs away into the pass at dusk; slow push
const S9 = (f: number) => dolly(add(S, [4.5, 2.4, 9.5]), add(S, [-3, 5.2, -36]), pushK(f, 750, 0.0018), { fov: 50, roll: -0.02 });
// 10: map, north and east China
const S10 = (f: number) => mapCam(114.5, 35.5, -1.0, 9.0, 24, pushK(f, 874, 0.0018), { fov: 50, roll: 0.02 });
// 11: the trench: MS two-shot, push in; slight push at the glare
const S11 = (f: number) => dolly(add(TR, [0, 1.5, 2.6]), add(TR, [0, 1.38, -1.3]), pushK(f, 946, 0.0022), { fov: 44, roll: -0.02 });
// 12: map: wide over China, rising slowly
const S12 = (f: number) => { const u = glide((f - 1103) / 131); return mapCam(112.0, 32.0 - 2 * u, -1.0, 15 + 2 * u, 30 + 8 * u, 1, { fov: 50, roll: 0.02 - 0.03 * u }); };
// 13: the gate in 1949, golden: low angle up at the balcony, crowd in front
const S13 = (f: number) => dolly(add(G, [-2.0, 1.4, 14]), add(G, [0, 8.6, -7]), pushK(f, 1234, 0.004), { fov: 50, roll: 0.04 });
// 14: map: the Korean peninsula
const S14 = (f: number) => mapCam(126.0, 38.6, -0.6, 6.2, 13.5, pushK(f, 1294, 0.0024), { fov: 46, roll: -0.03 });
// 15: night march across the frozen river
const S15 = (f: number) => dolly(add(S, [60.4, 1.0, 5.0]), add(S, [60.0, 1.6, -4]), pushK(f, 1356, 0.003), { fov: 46, roll: 0.03 });
// 16: the cap in the snow, very slow push
const S16 = (f: number) => dolly(add(S, [120.35, 0.62, 1.55]), add(S, [120.0, 0.18, -0.2]), pushK(f, 1414, 0.0028), { fov: 40, roll: -0.03 });
// 17: the whole map, pulling back and up
const S17 = (f: number) => { const u = glide((f - 1470) / 78); return mapCam(108.0, 33.5, 0, 17 + 6 * u, 36 + 14 * u, 1, { fov: 52, roll: -0.02 + 0.02 * u }); };
// 18: the modern skyline at sunset: crane up
const S18 = (f: number) => { const u = glide((f - 1540) / 80); return { pos: add(CI, [0.4, 1.6 + 2.6 * u, 6.0 + 2.5 * u]), look: add(CI, [-1.0, 6 + 10 * u, -60]), fov: 50, roll: 0.03 - 0.04 * u }; };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 62, s: S2 }], 3: [{ f: 122, s: S3a }, { f: 186, dur: 34, s: S3b }], 4: [{ f: 228, s: S4 }],
  5: [{ f: 356, s: S5 }], 6: [{ f: 458, s: S6 }], 7: [{ f: 560, s: S6 }, { f: 568, dur: 26, s: S7 }], 8: [{ f: 648, s: S8 }],
  9: [{ f: 744, s: S9 }], 10: [{ f: 868, s: S10 }], 11: [{ f: 940, s: S11 }], 12: [{ f: 1097, s: S12 }], 13: [{ f: 1228, s: S13 }],
  14: [{ f: 1294, s: S14 }], 15: [{ f: 1350, s: S15 }], 16: [{ f: 1406, s: S16 }], 17: [{ f: 1470, s: S17 }], 18: [{ f: 1540, s: S18 }],
};

/** impact flip-shakes (seconds) */
export const KICKS: [number, number][] = [
  [W.fell - LEAD, 0.04], [W.private - LEAD, 0.025], [W.war - LEAD, 0.04], [W.army2 - LEAD, 0.03], [W.surrounded - LEAD + 0.5, 0.03],
  [W.broke - LEAD, 0.05], [W.invaded - LEAD, 0.04], [W.held - LEAD, 0.035], [W.won - LEAD, 0.04], [W.troops - LEAD, 0.03],
];
export const kickAt = (t: number) => {
  let k = 0;
  for (const [t0, a] of KICKS) {
    const n = Math.round((t - t0) * FPS);
    if (n >= 0 && n < 7) k += a * (n % 2 ? -1 : 1) * (1 - n / 7);
  }
  return k;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), k = kickAt(f / FPS);
  return k ? { ...c, roll: c.roll + k, pos: [c.pos[0], c.pos[1] + k * 0.6, c.pos[2]] } : c;
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 62, cInf: 13, focus: () => add(G, [0.1, 0.95, -3.0]) },
  { f: 122, cInf: 6, focus: () => add(C, [0.6, 1.4, -2.5]) },
  { f: 186, dur: 30, cInf: 11, focus: () => add(C, [1.25, 1.5, -2.5]) },
  { f: 236, cInf: 0 },
  { f: 362, cInf: 9, focus: (f) => add(H, add(hillPath(T(f)), [0, 1.4, 0])) },
  { f: 458, cInf: 0 },
  { f: 655, cInf: 8, focus: (f) => add(S, [PASS_V * (T(f) - 21.8) + 0.9, 1.3, -2.4]) },
  { f: 750, cInf: 0 },
  { f: 946, cInf: 10, focus: () => add(TR, [0, 1.45, -1.25]) },
  { f: 1103, cInf: 0 },
  { f: 1356, cInf: 5, focus: () => add(S, [60, 1.3, -2.6]) },
  { f: 1414, cInf: 14, focus: () => add(S, [120.0, 0.12, -0.2]) },
  { f: 1476, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
export { T };
