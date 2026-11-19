// Timeline of "nvidia-jensen-huang": shots timed to the narration words (outputs/nvidia-jensen-huang/build/voice/words.json,
// hand-fixed against the measured pauses). Fast biography: the 1996 crisis -> rewind -> Taiwan -> the Kentucky school ->
// bathrooms -> Oregon (dishes, table tennis, engineering, lab partner) -> the diner booth -> back to 1996 -> the last chip
// -> boxes -> data centre -> callback. Exteriors on open ground (TOWN, SCHOOL, OREGON, HQ); interiors are sealed rooms
// far off (x >= 990). Cuts every ~1-3 s, 18-40 f glides, every hold creeps; flip kicks on the punch words.
export const FPS = 30;
export const TOTAL = 1860; // 62.0 s: 60.3 s of voice + an ending hold into black
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const T = (f: number) => f / FPS;

// ---------------- places ----------------
export const TOWN: V3 = [0, 0, 0];        // Taiwan send-off street
export const SCHOOL: V3 = [0, 0, -400];   // the Kentucky "prep school"
export const OREGON: V3 = [0, 0, 400];    // pines, a little house
export const HQ: V3 = [400, 0, 0];        // the office building outside (boxes)
export const OFFICE: V3 = [1000, 0, 0];   // the 1996 office (sealed room)
export const BATH: V3 = [1020, 0, 0];
export const DINER: V3 = [1040, 0, 0];
export const GYM: V3 = [1060, 0, 0];
export const LAB: V3 = [1080, 0, 0];
export const DC: V3 = [1100, 0, 0];       // data centre aisle
export const INSIDE_X = 990;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// office layout (relative to OFFICE)
export const SIT_Y = 0.36;
export const J_SEAT: V3 = [0, SIT_Y, -4.65];
export const DESK_TOP = 0.78;
export const CASHBOX: V3 = [0.5, DESK_TOP, -3.9];
export const CHIPB: V3 = [-0.22, DESK_TOP, -3.86];
export const MONITOR: V3 = [-0.66, DESK_TOP, -4.15];
export const CAL: V3 = [1.35, 1.85, -5.47];
export const CLOCK: V3 = [-0.1, 2.42, -5.46];
export const COWORKERS: { at: V3; sit: boolean; gone: number }[] = [
  { at: [-1.3, SIT_Y, -2.6], sit: true, gone: 0 },
  { at: [1.3, SIT_Y, -2.6], sit: true, gone: 1 },
  { at: [-1.3, SIT_Y, -0.4], sit: true, gone: 2 },
  { at: [1.3, SIT_Y, -0.4], sit: true, gone: 0 },
  { at: [-2.75, 0, -3.9], sit: false, gone: 0 },
  { at: [2.75, 0, -1.9], sit: false, gone: 3 },
];
// bathroom (relative to BATH): three toilets along the back wall
export const TOILETS_X = [-1.6, 0, 1.6];
export const TOILET_Z = -2.05;
// diner (relative to DINER)
export const SINK: V3 = [-2.3, 0, -1.1];
export const BOOTH: V3 = [1.8, 0, -0.85];
export const NAPKIN: V3 = [1.8, 0.775, -0.05];
// gym, lab, dc
export const TT: V3 = [0, 0, -0.5];

// ---------------- story beats (seconds, from words.json, hand-fixed) ----------------
export const W = {
  y1996: 0.02, nvidia: 1.8, cash: 3.58, first: 4.72, flopped: 5.4, half: 6.16, gone: 6.94, fails: 8.2, dead: 9.44,
  how: 10.34, here: 10.9, rewind: 11.64,
  jensen: 12.56, nine: 13.44, family: 14.82, taiwan: 15.78, america: 16.52, prep: 18.3, kentucky: 19.08,
  except: 20.04, not: 20.8, troubled: 22.76, kids: 23.12,
  job: 24.16, cleaning: 24.92, bathrooms: 25.34, every: 26.46, single: 26.72, day: 27.1,
  later: 28.22, oregon: 29.38, washes: 30.16, dishes: 30.44, dennys: 31.08,
  becomes: 31.74, nationally: 32.06, ranked: 32.46, table: 32.8, tennis: 33.12,
  studies: 34.04, engineering: 34.3, meets: 35.16, wife: 35.52, lab: 36.38, partner: 36.6,
  jensen2: 37.82, friends: 38.5, booth: 39.68, start: 40.12, company: 40.44, nvidia2: 41.2,
  back: 42.32, y1996b: 42.7, out: 44.24, money: 44.5, time: 45.3, bet: 46.0, everything: 46.22, one: 46.9, last: 47.12, chip: 47.4,
  it: 48.16, works: 48.26, riva: 49.26, sells: 49.94, million: 50.68, months: 51.88, nvidia3: 52.66, survives: 53.08,
  then: 54.14, gpus: 54.28, perfect: 55.5, ai: 56.2,
  from: 57.16, scrubbing: 57.3, toilets: 57.7, powering: 58.38, ai2: 58.96, revolution: 59.34, end: 60.0,
};
export const LEAD = 2 / FPS;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "indoor" | "night" | "lamp" | "dc";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 86, light: "indoor", sunAz: 130, sunEl: 40 },     // the 1996 office, wide
  { id: 2, a: 86, b: 132, light: "indoor", sunAz: 130, sunEl: 40 },   // CU cash box: a moth flies out
  { id: 3, a: 132, b: 180, light: "indoor", sunAz: 120, sunEl: 45 },  // CU chip: it fizzles
  { id: 4, a: 180, b: 222, light: "indoor", sunAz: 140, sunEl: 40 },  // half the staff vanish
  { id: 5, a: 222, b: 281, light: "indoor", sunAz: 130, sunEl: 40 },  // Jensen worried, push in
  { id: 6, a: 281, b: 300, light: "night", sunAz: 100, sunEl: 30 },   // lights out on "dead"
  { id: 7, a: 300, b: 348, light: "lamp", sunAz: 150, sunEl: 14 },    // how did they get here?
  { id: 8, a: 348, b: 372, light: "lamp", sunAz: 150, sunEl: 14 },    // rewind
  { id: 9, a: 372, b: 444, light: "day", sunAz: 120, sunEl: 45 },     // Taiwan: kid with a suitcase
  { id: 10, a: 444, b: 510, light: "day", sunAz: 110, sunEl: 45 },    // the plane to America
  { id: 11, a: 510, b: 597, light: "day", sunAz: 120, sunEl: 48 },    // the grand "prep school"
  { id: 12, a: 597, b: 714, light: "day", sunAz: 70, sunEl: 40 },     // troubled kids
  { id: 13, a: 714, b: 780, light: "indoor", sunAz: 130, sunEl: 50 }, // the bathroom: mop
  { id: 14, a: 780, b: 801, light: "indoor", sunAz: 120, sunEl: 50 }, // every
  { id: 15, a: 801, b: 813, light: "indoor", sunAz: 150, sunEl: 50 }, // single
  { id: 16, a: 813, b: 834, light: "indoor", sunAz: 100, sunEl: 50 }, // day
  { id: 17, a: 834, b: 897, light: "day", sunAz: 115, sunEl: 40 },    // Oregon pines
  { id: 18, a: 897, b: 948, light: "indoor", sunAz: 130, sunEl: 45 }, // dishes at the diner
  { id: 19, a: 948, b: 1017, light: "indoor", sunAz: 120, sunEl: 55 }, // table tennis
  { id: 20, a: 1017, b: 1047, light: "indoor", sunAz: 130, sunEl: 45 }, // studies engineering
  { id: 21, a: 1047, b: 1128, light: "indoor", sunAz: 140, sunEl: 40 }, // lab partner
  { id: 22, a: 1128, b: 1203, light: "indoor", sunAz: 130, sunEl: 40 }, // the booth
  { id: 23, a: 1203, b: 1236, light: "indoor", sunAz: 140, sunEl: 55 }, // napkin sketch
  { id: 24, a: 1236, b: 1269, light: "indoor", sunAz: 120, sunEl: 40 }, // "Nvidia."
  { id: 25, a: 1269, b: 1323, light: "lamp", sunAz: 150, sunEl: 14 },   // back to 1996
  { id: 26, a: 1323, b: 1374, light: "lamp", sunAz: 140, sunEl: 14 },   // out of money, out of time
  { id: 27, a: 1374, b: 1434, light: "lamp", sunAz: 160, sunEl: 20 },   // one last chip
  { id: 28, a: 1434, b: 1470, light: "lamp", sunAz: 150, sunEl: 14 },   // it works
  { id: 29, a: 1470, b: 1584, light: "day", sunAz: 110, sunEl: 45 },    // a million units
  { id: 30, a: 1584, b: 1620, light: "day", sunAz: 120, sunEl: 40 },    // survives
  { id: 31, a: 1620, b: 1704, light: "dc", sunAz: 150, sunEl: 40 },     // GPUs -> AI
  { id: 32, a: 1704, b: 1752, light: "indoor", sunAz: 130, sunEl: 50 }, // from scrubbing toilets
  { id: 33, a: 1752, b: TOTAL, light: "dc", sunAz: 150, sunEl: 35 },    // to powering the AI revolution
];
/** crossfades (frames) at time / place changes */
export const XFADE: Record<number, number> = { 11: 10, 17: 10, 18: 8, 22: 8, 29: 10, 31: 10 };
/** white flashes: the rewind and the jump back to 1996 */
export const FLASHES = [Math.round((W.jensen - 0.2) * FPS) - 2, Math.round((W.back - 0.1) * FPS) - 2];
/** fade to black at the very end (frames from the end) */
export const FADE_OUT = 36;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- motion ----------------
export const walkX = (t: number, w: { x0: number; x1: number; t0: number; t1: number }) => w.x0 + (w.x1 - w.x0) * clamp01((t - w.t0) / (w.t1 - w.t0));
/** the kid walks up toward the school (shot 11): x and z along the path */
export const KID_W = { x0: -2.0, x1: -0.3, t0: 17.0, t1: 19.3, z0: -399.4, z1: -401.5 };
export const kidPath = (t: number): V3 => { const u = clamp01((t - KID_W.t0) / (KID_W.t1 - KID_W.t0)); return [KID_W.x0 + (KID_W.x1 - KID_W.x0) * u, 0, KID_W.z0 + (KID_W.z1 - KID_W.z0) * u]; };
/** the family walks in among the pines (shot 17) */
export const FAM_W = { x0: -2.4, x1: 0.4, t0: 27.6, t1: 29.8, z: 403.4 };
/** the plane over Taiwan (shot 10) */
export const planeAt = (t: number): V3 => { const u = clamp01((t - 14.9) / 2.3); return [60 - 120 * u, 100 + 8 * u, -70]; };
/** a million boxes: how much of the pile has landed 0..1 (shot 29-30) */
export const pileK = (t: number) => clamp01((t - 49.15) / 3.6);

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
const O = OFFICE, B = BATH, D = DINER, G = GYM, L = LAB, C = DC, S = SCHOOL, R = OREGON, H = HQ;

// 1: the office, high and wide down the room to Jensen's desk at the back
const S1 = (f: number) => dolly(add(O, [0.5, 2.45, 2.9]), add(O, [0, 0.85, -3.4]), pushK(f, 0, 0.0028), { fov: 50, roll: -0.03 });
// 2: CU the cash box on the desk (Jensen behind, soft)
const S2 = (f: number) => dolly(add(O, [0.68, 1.2, -2.95]), add(O, [0.48, 0.9, -3.95]), pushK(f, 86, 0.004), { fov: 42, roll: 0.05 });
// 3: CU the chip on its test board
const S3 = (f: number) => dolly(add(O, [-0.05, 1.18, -3.15]), add(O, [-0.22, 0.8, -3.86]), pushK(f, 132, 0.004), { fov: 40, roll: -0.05 });
// 4: wide from the other side: half the staff vanish
const S4 = (f: number) => dolly(add(O, [-0.6, 2.2, 2.6]), add(O, [0.2, 0.8, -2.6]), pushK(f, 180, 0.003), { fov: 50, roll: 0.04 });
// 5/6: MS Jensen at his desk, push in; same framing when the lights die
const S5 = (f: number) => dolly(add(O, [0.15, 1.42, -2.35]), add(O, [0, 1.12, -4.6]), pushK(f, 222, 0.0045), { fov: 40 });
// 7: lamp-lit, Jensen looks up: how did they get here?
const S7 = (f: number) => dolly(add(O, [-0.35, 1.3, -2.55]), add(O, [0.0, 1.18, -4.6]), pushK(f, 300, 0.004), { fov: 40, roll: -0.04 });
// 8: rewind: a backwards barrel roll while pushing in
const S8 = (f: number) => { const u = clamp01((f - 348) / 24); return { ...dolly(add(O, [-0.35, 1.3, -2.55]), add(O, [0.0, 1.18, -4.6]), 0.8 - 0.35 * u * u), fov: 40 + 14 * u * u, roll: -0.04 + 1.6 * u * u * u }; };
// 9: Taiwan street: kid with a suitcase, parents behind
const S9 = (f: number) => dolly([0.3, 1.15, 2.1], [0, 1.0, -2.8], pushK(f, 372, 0.003), { fov: 46 });
// 10: low wide: the plane crosses the sky over the town
const S10 = (f: number) => dolly([1.4, 0.55, 2.4], [-0.4, 9.0, -9], pushK(f, 444, 0.0018), { fov: 56, roll: 0.05 });
// 11: the grand school, low; the kid walks up the path
const S11 = (f: number) => dolly(add(S, [0.6, 1.0, 5.5]), add(S, [-0.6, 4.0, -10]), pushK(f, 510, 0.0016), { fov: 52, roll: -0.03 });
// 12: MS of the kid, the school behind; tough kids gather; a window breaks
const S12a = (f: number) => dolly(add(S, [0.35, 1.05, 1.6]), add(S, [0, 1.05, -2.0]), pushK(f, 597, 0.0035), { fov: 44, roll: 0.03 });
const S12b = (f: number) => dolly(add(S, [-0.5, 1.2, 3.3]), add(S, [0.2, 1.6, -3.8]), pushK(f, 655, 0.003), { fov: 50, roll: -0.05 });
// 13: the bathroom: the kid gets a mop
const S13 = (f: number) => dolly(add(B, [0.6, 1.2, 1.9]), add(B, [-0.2, 0.85, -1.0]), pushK(f, 714, 0.0035), { fov: 46, roll: 0.03 });
// 14-16: every / single / day: three angles on the scrubbing
const S14 = (f: number) => dolly(add(B, [1.6, 1.15, 0.5]), add(B, [0.2, 0.65, -1.85]), pushK(f, 780, 0.008), { fov: 46, roll: -0.06 });
const S15 = (f: number) => dolly(add(B, [-0.55, 0.95, -0.85]), add(B, [0.05, 0.5, -2.05]), pushK(f, 801, 0.01), { fov: 40, roll: 0.07 });
const S16 = (f: number) => dolly(add(B, [0.1, 2.2, 0.6]), add(B, [0.35, 0.5, -1.6]), pushK(f, 813, 0.007), { fov: 46, roll: -0.04 });
// 17: Oregon: pines; the family walks in
const S17 = (f: number) => dolly(add(R, [0.3, 1.3, 9.0]), add(R, [0.2, 1.8, -2.0]), pushK(f, 834, 0.0022), { fov: 50, roll: 0.02 });
// 18: the diner sink: teen Jensen washing dishes
const S18 = (f: number) => dolly(add(D, [-1.95, 1.45, 1.15]), add(D, [-2.3, 1.05, -1.45]), pushK(f, 897, 0.0035), { fov: 42, roll: -0.03 });
// 19: table tennis, from behind the near end of the table
const S19 = (f: number) => dolly(add(G, [0.35, 1.55, 2.9]), add(G, [0, 1.0, -2.2]), pushK(f, 948, 0.0025), { fov: 42, roll: 0.03 });
// 20: studies engineering: with books before the circuit chalkboard
const S20 = (f: number) => dolly(add(L, [-0.6, 1.5, 1.2]), add(L, [-0.95, 1.3, -1.7]), pushK(f, 1017, 0.005), { fov: 44, roll: 0.04 });
// 21: lab partners at the bench
const S21 = (f: number) => dolly(add(L, [0.3, 1.45, 1.95]), add(L, [0, 1.15, -1.5]), pushK(f, 1047, 0.003), { fov: 44, roll: -0.02 });
// 22: the booth: three friends
const S22 = (f: number) => dolly(add(D, [1.95, 1.4, 2.6]), add(D, [1.8, 1.0, -0.9]), pushK(f, 1128, 0.0028), { fov: 44, roll: 0.02 });
// 23: CU the napkin sketch, top-down-ish
const S23 = (f: number) => dolly(add(D, [1.85, 1.45, 0.45]), add(D, [1.8, 0.78, -0.05]), pushK(f, 1203, 0.005), { fov: 40, roll: -0.05 });
// 24: "Nvidia." punch-in on the three
const S24 = (f: number) => dolly(add(D, [1.75, 1.3, 1.5]), add(D, [1.8, 1.15, -0.9]), pushK(f, 1236, 0.006), { fov: 44, roll: 0.05 });
// 25: back to 1996: the office at night, lamp-lit, wide-ish
const S25 = (f: number) => dolly(add(O, [-0.7, 1.75, -1.2]), add(O, [0.1, 0.95, -4.4]), pushK(f, 1269, 0.0035), { fov: 46, roll: 0.03 });
// 26: out of money, out of time: MS, the clock on the wall above
const S26 = (f: number) => dolly(add(O, [0.25, 1.45, -2.4]), add(O, [0.05, 1.45, -4.8]), pushK(f, 1323, 0.004), { fov: 46, roll: -0.03 });
// 27: low hero angle: one last chip raised high
const S27 = (f: number) => dolly(add(O, [0.45, 0.85, -2.6]), add(O, [0.0, 1.6, -4.6]), pushK(f, 1374, 0.005), { fov: 46, roll: 0.06 });
// 28: CU the monitor: it works
const S28 = (f: number) => dolly(add(O, [-0.5, 1.02, -3.15]), add(O, [-0.66, 0.98, -3.95]), pushK(f, 1434, 0.006), { fov: 40, roll: -0.04 });
// 29: outside HQ: boxes rain down into a mountain; crane up
const S29 = (f: number) => { const u = glide((f - 1470) / 114); return { pos: add(H, [1.0, 1.2 + 2.2 * u, 6.5 + 2.5 * u]), look: add(H, [0, 1.6 + 2.0 * u, -3.5]), fov: 50, roll: 0.02 - 0.04 * u }; };
// 30: MS Jensen: survives
const S30 = (f: number) => dolly(add(H, [0.3, 1.5, 1.6]), add(H, [0, 1.35, -1.3]), pushK(f, 1584, 0.005), { fov: 42, roll: 0.04 });
// 31: glide down the data-centre aisle
const S31 = (f: number) => { const u = glide((f - 1620) / 84); return { pos: add(C, [0.3, 1.5 - 0.25 * u, 3.2 - 4.2 * u]), look: add(C, [0, 1.55, -12]), fov: 48, roll: -0.03 + 0.05 * u }; };
// 32: callback: scrubbing toilets
const S32 = (f: number) => dolly(add(B, [-1.3, 1.2, 0.6]), add(B, [0.25, 0.65, -1.85]), pushK(f, 1704, 0.004), { fov: 46, roll: 0.05 });
// 33: Jensen in the glowing aisle; push in, then hold into the fade
const S33 = (f: number) => dolly(add(C, [0.35, 1.25, 0.4]), add(C, [0, 1.35, -3.6]), pushK(f, 1752, 0.0035), { fov: 46, roll: -0.03 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 86, s: S2 }], 3: [{ f: 132, s: S3 }], 4: [{ f: 180, s: S4 }],
  5: [{ f: 222, s: S5 }], 6: [{ f: 281, s: S5 }], 7: [{ f: 300, s: S7 }], 8: [{ f: 348, s: S8 }],
  9: [{ f: 372, s: S9 }], 10: [{ f: 444, s: S10 }], 11: [{ f: 500, s: S11 }], 12: [{ f: 597, s: S12a }, { f: 655, cut: true, s: S12b }],
  13: [{ f: 704, s: S13 }], 14: [{ f: 780, s: S14 }], 15: [{ f: 801, s: S15 }], 16: [{ f: 813, s: S16 }],
  17: [{ f: 824, s: S17 }], 18: [{ f: 890, s: S18 }], 19: [{ f: 948, s: S19 }], 20: [{ f: 1017, s: S20 }], 21: [{ f: 1047, s: S21 }],
  22: [{ f: 1120, s: S22 }], 23: [{ f: 1203, s: S23 }], 24: [{ f: 1236, s: S24 }], 25: [{ f: 1269, s: S25 }], 26: [{ f: 1323, s: S26 }],
  27: [{ f: 1374, s: S27 }], 28: [{ f: 1434, s: S28 }], 29: [{ f: 1460, s: S29 }], 30: [{ f: 1584, s: S30 }], 31: [{ f: 1610, s: S31 }],
  32: [{ f: 1704, s: S32 }], 33: [{ f: 1752, s: S33 }],
};

/** impact flip-shakes (seconds) */
export const KICKS: [number, number][] = [
  [W.flopped - LEAD, 0.05], [W.half - LEAD, 0.03], [W.dead - LEAD, 0.06], [W.troubled - LEAD, 0.05], [W.job - LEAD, 0.03],
  [W.every - LEAD, 0.03], [W.single - LEAD, 0.03], [W.day - LEAD, 0.03], [W.ranked - LEAD, 0.04], [W.nvidia2 - LEAD, 0.05],
  [W.works - LEAD, 0.05], [W.million - LEAD, 0.04], [W.survives - LEAD, 0.04], [W.ai - LEAD, 0.04], [W.revolution - LEAD, 0.05],
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
  { f: 0, cInf: 6, focus: () => add(O, [0, 1.1, -4.6]) },
  { f: 86, cInf: 13, focus: () => add(O, CASHBOX) },
  { f: 132, cInf: 14, focus: () => add(O, CHIPB) },
  { f: 180, cInf: 0 },
  { f: 222, cInf: 12, focus: () => add(O, [0, 1.25, -4.65]) },
  { f: 300, cInf: 12, focus: () => add(O, [0, 1.25, -4.65]) },
  { f: 372, cInf: 10, focus: () => [0, 0.95, -2.4] },
  { f: 444, cInf: 0 },
  { f: 597, cInf: 11, focus: () => add(S, [0, 1.0, -2.0]) },
  { f: 655, cInf: 6, focus: () => add(S, [0, 1.0, -2.0]) },
  { f: 714, cInf: 9, focus: () => add(B, [-0.2, 0.9, -0.8]) },
  { f: 780, cInf: 12, focus: () => add(B, [0.45, 0.8, -1.6]) },
  { f: 801, cInf: 13, focus: () => add(B, [0, 0.5, -2.0]) },
  { f: 813, cInf: 8, focus: () => add(B, [0.45, 0.8, -1.6]) },
  { f: 834, cInf: 0 },
  { f: 897, cInf: 11, focus: () => add(D, [-2.3, 1.2, -1.75]) },
  { f: 948, cInf: 9, focus: () => add(G, [0, 1.2, -2.3]) },
  { f: 1017, cInf: 12, focus: () => add(L, [-0.95, 1.3, -1.6]) },
  { f: 1047, cInf: 10, focus: () => add(L, [0, 1.3, -1.6]) },
  { f: 1128, cInf: 8, focus: () => add(D, [1.8, 1.1, -0.85]) },
  { f: 1203, cInf: 13, focus: () => add(D, NAPKIN) },
  { f: 1236, cInf: 12, focus: () => add(D, [1.8, 1.15, -0.85]) },
  { f: 1269, cInf: 8, focus: () => add(O, [0, 1.1, -4.6]) },
  { f: 1323, cInf: 12, focus: () => add(O, [0, 1.25, -4.65]) },
  { f: 1374, cInf: 11, focus: () => add(O, [0, 1.6, -4.5]) },
  { f: 1434, cInf: 14, focus: () => add(O, [-0.66, 0.98, -3.93]) },
  { f: 1470, cInf: 0 },
  { f: 1584, cInf: 12, focus: () => add(H, [0, 1.4, -1.3]) },
  { f: 1620, cInf: 4, focus: () => add(C, [0, 1.5, -7]) },
  { f: 1704, cInf: 12, focus: () => add(B, [0.45, 0.8, -1.6]) },
  { f: 1752, cInf: 11, focus: () => add(C, [0, 1.4, -3.6]) },
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
