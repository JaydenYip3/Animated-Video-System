// Timeline of "mao-zedong-3": shots timed to the narration words (outputs/mao-zedong-3/build/voice/words.json,
// faster-whisper word times, phrase onsets hand-fixed to the measured silences). 54.0 s of audio, voice ends 53.74 s.
// 1911 the palace gate, the dragon flag falls -> the barracks yard, Mao joins as a private -> map 1927 red vs blue ->
// the Jinggang hills, the peasant army rises -> map 1934: the blockhouse ring closes, the Long March ribbon ->
// the snow pass, the column thins -> map 1937: Japan -> side by side in a trench, the truce cracks -> map 1945-49 ->
// the gate 1949, the red flag rises -> map 1950: across the Yalu -> a cap in the night snow -> map, half a century ->
// the gate at sunset. Places are open exteriors 1000 m apart; the MAP is a relief map lying on a charcoal table.
import type { LightName } from "./lights";

export const FPS = 30;
export const TOTAL = 1650; // 55.0 s: 54.0 s of narration (voice ends 53.74 s) + a short hold into black
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
export const GATE: V3 = [0, 0, 0];         // the palace gate (1911, 1949, the end)
export const CAMP: V3 = [1000, 0, 0];      // the barracks yard, Changsha 1911
export const HILLS: V3 = [-1000, 0, 0];    // the Jinggang mountains
export const SNOW: V3 = [0, 0, 1000];      // the snow pass on the Long March
export const TRENCH: V3 = [1000, 0, 1000]; // sandbags, 1937
export const NIGHT: V3 = [-1000, 0, 1000]; // Korea, winter night 1950
export const MAP: V3 = [0, 0, -1000];      // the relief map

// ---------------- the map ----------------
/** map board extent (degrees); 1 m per degree of latitude, KX m per degree of longitude; north = -z */
export const MAP_BB = { lon0: 76, lon1: 142, lat0: 12, lat1: 56 };
export const KX = 0.84;
export const LAND_H = 0.16;
export const geo = (lon: number, lat: number, y = 0): V3 => [MAP[0] + (lon - 108) * KX, MAP[1] + y, MAP[2] - (lat - 33)];
export type LL = [number, number];
export const RUIJIN: LL = [116.0, 25.9];
export const JINGGANG: LL = [114.1, 26.6];
export const NANJING: LL = [118.8, 32.05];
export const YANAN: LL = [109.5, 36.6];
export const BEIJING: LL = [116.4, 39.9];
export const TAIPEI: LL = [121.5, 25.0];
export const MANCHURIA: LL = [125.3, 43.9];
/** the Long March, Ruijin -> Xiang River -> Zunyi -> Chishui -> Jinsha -> Luding -> snow mountains -> grasslands -> Yan'an */
export const ROUTE: LL[] = [
  [116.0, 25.9], [114.6, 25.4], [113.2, 25.3], [111.6, 25.6], [110.6, 25.9], [109.4, 26.4], [108.2, 27.0], [106.9, 27.7],
  [105.9, 28.2], [105.4, 27.4], [104.6, 26.6], [103.4, 26.2], [102.6, 26.9], [102.4, 28.2], [102.2, 29.9], [102.7, 30.8],
  [102.6, 31.9], [102.6, 33.0], [103.6, 34.0], [105.2, 35.3], [106.8, 36.2], [108.2, 36.9], [109.5, 36.6],
];

// ---------------- word times (seconds, hand-fixed) ----------------
export const W = {
  y1911: 0.12, revolution: 0.96, swept: 1.42, china: 1.92, last: 2.9, emperor: 3.18, fell: 3.54,
  seventeen: 4.64, mao: 5.4, joined: 6.04, army: 6.6, private: 7.2,
  by: 8.16, y1927: 8.3, communists: 9.62, nationalists: 10.3, war: 11.26,
  mao2: 12.07, fled: 12.32, mountains: 12.96, built: 13.6, peasant: 13.98, army2: 14.36,
  in34: 15.33, y1934: 15.45, nationalist: 16.66, forces: 17.04, surrounded: 17.5, them: 17.98,
  maos: 18.74, broke: 19.36, out: 19.66, began: 20.14, long: 20.68, march: 20.94, about: 21.83, six: 22.08, miles: 22.8,
  fighting: 23.4, starvation: 23.96,
  most: 25.27, roughly: 25.78, n86: 26.06, set: 27.28, never: 27.72, finished: 28.0,
  in37: 29.09, y1937: 29.25, japan: 30.4, invaded: 30.7,
  rivals: 31.81, fought: 32.28, side: 32.64, side2: 33.18, against: 33.58, japan2: 33.88, but: 34.72, truce: 35.04, never2: 35.4, held: 35.98,
  japan3: 37.0, surrendered: 37.32, y1945: 38.04, and: 38.9, civil: 39.56, war2: 39.78, again: 40.42,
  four: 41.14, years: 41.34, later: 41.66, mao3: 42.16, won: 42.34,
  in50: 43.09, y1950: 43.3, sent: 44.28, troops: 44.58, korea: 45.06, fight: 45.8, united: 46.14, states: 46.4,
  his: 47.45, son: 47.74, killed: 48.3, there: 48.54,
  mao4: 49.4, fought2: 49.62, half: 50.4, century: 50.84, those: 51.71, wars: 52.04, built2: 52.46, modern: 52.82, china2: 53.22, end: 53.74,
};
export const LEAD = 2 / FPS;

// ---------------- shots ----------------
export type ShotDef = { id: number; a: number; b: number; light: LightName; sunAz?: number; sunEl?: number; map?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 122, light: "day", sunAz: 120, sunEl: 40 },             // the gate, 1911: the dragon flag falls
  { id: 2, a: 122, b: 240, light: "day", sunAz: 115, sunEl: 42 },           // the barracks yard: Mao joins the line
  { id: 3, a: 240, b: 362, light: "map", map: true },                        // map 1927: red pockets, blue floods
  { id: 4, a: 362, b: 458, light: "day", sunAz: 125, sunEl: 32 },           // Jinggang: Mao + the peasant army
  { id: 5, a: 458, b: 750, light: "map", map: true },                        // map 1934: the ring closes, the Long March
  { id: 6, a: 750, b: 874, light: "snow", sunAz: 100, sunEl: 25 },          // the snow pass: the column thins
  { id: 7, a: 874, b: 946, light: "map", map: true },                        // map 1937: Japan invades
  { id: 8, a: 946, b: 1110, light: "dusk", sunAz: 150, sunEl: 12 },         // side by side behind sandbags
  { id: 9, a: 1110, b: 1234, light: "map", map: true },                      // map 1945-49
  { id: 10, a: 1234, b: 1293, light: "day", sunAz: 120, sunEl: 38 },        // the gate, 1949: the red flag rises
  { id: 11, a: 1293, b: 1424, light: "map", map: true },                     // map 1950: across the Yalu
  { id: 12, a: 1424, b: 1482, light: "night", sunAz: 60, sunEl: 30 },       // a cap in the night snow
  { id: 13, a: 1482, b: 1548, light: "map", map: true },                     // the whole map: half a century
  { id: 14, a: 1548, b: TOTAL, light: "golden", sunAz: 150, sunEl: 10 },    // the gate at sunset
];
/** crossfades (frames) at time / place changes */
export const XFADE: Record<number, number> = { 4: 10, 6: 10, 8: 8, 12: 12, 13: 12, 14: 12 };
/** white flash: the dragon flag falls (the hook) */
export const FLASHES = [Math.round((W.fell - 0.03) * FPS)];
/** fade to black at the very end (frames from the end) */
export const FADE_OUT = 30;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- map state (pure functions of t) ----------------
const routeLen = (() => { const out = [0]; for (let i = 1; i < ROUTE.length; i++) out.push(out[i - 1] + Math.hypot((ROUTE[i][0] - ROUTE[i - 1][0]) * KX, ROUTE[i][1] - ROUTE[i - 1][1])); return out; })();
/** Long March ribbon progress 0..1: out of the ring fast, then the long haul west and north */
export const routeK = (t: number) => t < W.broke - 0.05 ? 0 : t < 21.6 ? 0.42 * easeOut((t - (W.broke - 0.05)) / 2.3) : Math.min(1, 0.42 + 0.58 * smooth((t - 21.6) / 2.9));
export const routeAt = (k: number): LL => {
  const L = routeLen[routeLen.length - 1] * clamp01(k);
  let i = 1; while (i < routeLen.length - 1 && routeLen[i] < L) i++;
  const u = (L - routeLen[i - 1]) / Math.max(1e-6, routeLen[i] - routeLen[i - 1]);
  return [ROUTE[i - 1][0] + (ROUTE[i][0] - ROUTE[i - 1][0]) * u, ROUTE[i - 1][1] + (ROUTE[i][1] - ROUTE[i - 1][1]) * u];
};
/** the 1934 blockhouse ring radius (degrees) around Ruijin */
export const ringR = (t: number) => 5.2 - 2.7 * smooth((t - (W.nationalist - 0.1)) / 1.5);
/** mile counter on the Long March (shown by the overlay) */
export const milesAt = (t: number) => Math.round((6000 * easeOut((t - W.about) / 1.25)) / 50) * 50;

// ---------------- motion ----------------
/** young Mao walks into the recruits' line (shot 2), x relative to CAMP */
export const MAO_W = { x0: 5.6, x1: 2.7, t0: 4.5, t1: 6.25 };
export const maoX = (t: number) => MAO_W.x0 + (MAO_W.x1 - MAO_W.x0) * smooth((t - MAO_W.t0) / (MAO_W.t1 - MAO_W.t0));
/** Mao climbs the hill path (shot 4), x relative to HILLS */
export const HILL_W = { x0: -2.8, x1: 0.2, t0: 11.9, t1: 13.5 };
export const hillX = (t: number) => HILL_W.x0 + (HILL_W.x1 - HILL_W.x0) * smooth((t - HILL_W.t0) / (HILL_W.t1 - HILL_W.t0));
/** the column on the snow pass (shot 6) walks +x at PASS_V m/s */
export const PASS_V = 0.62;
export const passX = (t: number) => (t - 25.0) * PASS_V;
/** hill terrain height (relative to HILLS): flat path, a ridge at z -4.6 that hides the peasants, slopes behind */
export const hillH = (x: number, z: number) => {
  const ridge = 1.05 * Math.exp(-(((z + 4.6) / 1.1) ** 2)) * (1 + 0.12 * Math.sin(x * 0.7));
  const back = 0.09 * Math.max(0, -z - 6.5) ** 1.35 + 0.6 * Math.sin(x * 0.11 + 1) * smooth((-z - 8) / 10);
  const front = 0.03 * Math.max(0, z - 4) ** 1.3;
  return ridge + back + front + 0.05 * Math.sin(x * 1.3 + z * 0.7);
};
/** snow terrain height (relative to SNOW): a ledge path along x at z 0, the slope rising behind, falling in front */
export const snowH = (x: number, z: number) => {
  const behind = 0.22 * Math.max(0, -z - 1.2) ** 1.25 + 0.8 * Math.sin(x * 0.09) * smooth((-z - 4) / 8);
  const front = -0.12 * Math.max(0, z - 1.5) ** 1.2;
  return behind + front + 0.04 * Math.sin(x * 1.1 + z * 0.9) + 0.012 * x;
};

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
/** map camera: looking at (lon, lat) from height h, pulled back (south) by back metres */
const mapCam = (ll: LL, h: number, back: number, rest: Partial<Cam> = {}): Shot => {
  const L = geo(ll[0], ll[1], LAND_H);
  return { pos: [L[0], L[1] + h, L[2] + back], look: L, fov: 38, ...rest };
};
const lerpLL = (a: LL, b: LL, k: number): LL => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const T = (f: number) => f / FPS;
const G = GATE, C = CAMP, H = HILLS, S = SNOW, R = TRENCH, N = NIGHT;

// 1: low under the gate, looking up at the dragon flag; the column marches across the foreground
const S1 = (f: number) => dolly(add(G, [6.8, 1.3, 20.5]), add(G, [7.0, 10.2, -10]), pushK(f, 0, 0.0016), { fov: 54, roll: 0.03 });
// 2: MS the line of recruits, Mao walks in from the right
const S2 = (f: number) => dolly(add(C, [1.6, 1.42, 6.2]), add(C, [1.0, 1.2, -1.0]), pushK(f, 122, 0.0018), { fov: 44, roll: -0.025 });
// 3: the map, 1927: centre-east China, slow push toward the Jinggang hills
const S3 = (f: number) => mapCam(lerpLL([114.5, 30.5], [114.4, 28.4], glide((f - 240) / 122)), 30 - 7 * glide((f - 240) / 122), 17 - 4 * glide((f - 240) / 122));
// 4: the hills: Mao on the path, the ridge behind him
const S4 = (f: number) => dolly(add(H, [0.6, 1.25, 6.6]), add(H, [-0.2, 1.55, -5]), pushK(f, 362, 0.0022), { fov: 50, roll: 0.03 });
// 5: the map, 1934: on Ruijin while the ring closes, then riding the Long March ribbon west and north
const S5a = (f: number) => mapCam([115.6, 25.6], 15.5 - 1.5 * glide((f - 458) / 100), 9.5, { roll: -0.02 });
const S5b = (f: number) => {
  const t = T(f), hk = routeAt(Math.max(0, routeK(t) - 0.04));
  const z = glide((t - 19.3) / 5.2);
  return mapCam(lerpLL([114.5, 26.5], [hk[0] + 0.5, hk[1] - 0.6], 0.75 + 0.25 * z), 17 + 9 * z, 10 + 6 * z, { roll: -0.02 + 0.03 * z });
};
// 6: the snow pass: side-on, tracking the column
const S6 = (f: number) => {
  const xc = passX(T(f)) - 9;
  return { pos: add(S, [xc + 3.2, 2.2, 10.5]), look: add(S, [xc - 1.0, 1.25, -0.5]), fov: 46, roll: -0.03 };
};
// 7: the map, 1937: north and east China
const S7 = (f: number) => mapCam([118.5, 36.0], 34 - 3 * glide((f - 874) / 72), 20, { roll: 0.02 });
// 8: the trench: two soldiers behind the sandbags
const S8 = (f: number) => dolly(add(R, [0.1, 1.42, 4.3]), add(R, [0, 1.38, -0.6]), pushK(f, 946, 0.0016), { fov: 40, roll: -0.02 });
// 9: the map, 1945-49: all of eastern China
const S9 = (f: number) => mapCam([113.5, 32.0], 40 + 4 * glide((f - 1110) / 124), 24, { roll: -0.015 });
// 10: the gate, 1949: low in the crowd, the red flag climbs
const S10 = (f: number) => dolly(add(G, [1.5, 1.5, 18.5]), add(G, [6.0, 10.6, -10]), pushK(f, 1234, 0.0022), { fov: 54, roll: -0.03 });
// 11: the map, 1950: from Beijing across to Korea
const S11a = (f: number) => mapCam([121.0, 38.2], 26, 15);
const S11b = (f: number) => mapCam([125.8, 38.6], 22 - 2 * glide((f - 1330) / 90), 13, { roll: 0.02 });
// 12: Korea at night: a cap in the snow
const S12 = (f: number) => dolly(add(N, [0.35, 0.62, 2.1]), add(N, [0, 0.12, 0]), pushK(f, 1424, 0.003), { fov: 42, roll: 0.03 });
// 13: the whole map, pulling back
const S13 = (f: number) => mapCam([111.5, 32.5], 44 + 10 * glide((f - 1482) / 66), 26 + 5 * glide((f - 1482) / 66));
// 14: the gate at sunset: on Mao at the rostrum, craning back to the whole gate
const S14 = (f: number) => {
  const u = glide((f - 1548) / 72);
  return { pos: add(G, [1.0 - 1.0 * u, 10.9 - 2.5 * u, -15.5 + 33 * u]), look: add(G, [0, 10.6 - 0.8 * u, -21.5]), fov: 40 + 12 * u, roll: 0.02 - 0.03 * u };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 122, s: S2 }], 3: [{ f: 236, s: S3 }], 4: [{ f: 357, s: S4 }],
  5: [{ f: 458, s: S5a }, { f: Math.round((W.broke - 0.25) * FPS), dur: 34, s: S5b }],
  6: [{ f: 745, s: S6 }], 7: [{ f: 874, s: S7 }], 8: [{ f: 942, s: S8 }], 9: [{ f: 1110, s: S9 }], 10: [{ f: 1234, s: S10 }],
  11: [{ f: 1293, s: S11a }, { f: 1318, dur: 40, s: S11b }], 12: [{ f: 1418, s: S12 }], 13: [{ f: 1476, s: S13 }], 14: [{ f: 1542, s: S14 }],
};

/** impact flip-shakes (seconds, amplitude rad) */
export const KICKS: [number, number][] = [
  [W.fell - LEAD, 0.05], [W.private - LEAD, 0.03], [W.war - LEAD, 0.035], [W.surrounded + 0.4, 0.03], [W.broke - LEAD, 0.045],
  [W.invaded - LEAD, 0.04], [W.held - LEAD, 0.04], [W.won - LEAD, 0.035], [W.troops - LEAD, 0.035],
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
  { f: 0, cInf: 3 },
  { f: 122, cInf: 10, focus: () => add(C, [1.0, 1.6, -1.0]) },
  { f: 240, cInf: 5 },
  { f: 362, cInf: 9, focus: (f) => add(H, [hillX(T(f)), 1.7, -1.6]) },
  { f: 458, cInf: 5 },
  { f: 750, cInf: 6, focus: (f) => add(S, [passX(T(f)) - 9.5, 1.3, 0]) },
  { f: 874, cInf: 5 },
  { f: 946, cInf: 11, focus: () => add(R, [0, 1.6, -0.7]) },
  { f: 1110, cInf: 4 },
  { f: 1234, cInf: 3 },
  { f: 1293, cInf: 5 },
  { f: 1424, cInf: 13, focus: () => add(N, [0, 0.1, 0]) },
  { f: 1482, cInf: 3 },
  { f: 1548, cInf: 9, focus: () => add(G, [0, 10.6, -21.3]) },
  { f: 1572, dur: 40, cInf: 2, focus: () => add(G, [0, 10.6, -21.3]) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export { T };
