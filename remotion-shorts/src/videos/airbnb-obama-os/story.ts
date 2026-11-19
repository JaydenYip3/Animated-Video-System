// Timeline of "airbnb-obama-os": shots timed to the narration words (outputs/airbnb-obama-os/build/voice/words.json,
// whisper word times hand-fixed against the measured pauses). 15.1 s of voice: 2008 in a cramped apartment -> broke ->
// maxed-out credit cards -> cereal boxes -> the hero box -> $40 tag -> boxes sell, cash rains, counter to $30,000 ->
// the founders cheer -> golden city skyline with a growth chart for "worth billions".
// The apartment is a sealed room far off (x >= 990); the city plaza is the open exterior at the origin.
export const FPS = 30;
export const TOTAL = 495; // 16.5 s: 15.12 s of voice + an ending hold into a fade
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const T = (f: number) => f / FPS;

// ---------------- places ----------------
export const CITY: V3 = [0, 0, 0];      // golden plaza with the skyline behind
export const APT: V3 = [1000, 0, 0];    // the 2008 apartment (sealed room)
export const INSIDE_X = 990;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// apartment layout (relative to APT): room x -2.6..2.6, z -3.2..2.6, ceiling 2.55
export const ROOM = { x0: -2.6, x1: 2.6, z0: -3.2, z1: 2.6, h: 2.55 };
export const SIT_Y = 0.36;
export const COUCH_Z = -2.55;
export const SEATS: V3[] = [[-1.0, SIT_Y, -2.45], [-0.3, SIT_Y, -2.5], [0.4, SIT_Y, -2.45]];
export const TABLE_TOP = 0.44;
export const TABLE: V3 = [-0.3, TABLE_TOP, -1.55]; // coffee table centre (top)
export const HERO: V3 = [-0.3, TABLE_TOP, -1.45];  // the hero cereal box (bottom centre)
export const BOX = { w: 0.24, h: 0.34, d: 0.085 };
export const STANDS: V3[] = [[-1.0, 0, -2.02], [-0.3, 0, -2.08], [0.42, 0, -2.02]]; // founders standing behind the table
export const CAL: V3 = [1.25, 1.62, -3.18];
export const CARDS: V3[] = [[-0.37, TABLE_TOP, -1.36], [-0.23, TABLE_TOP, -1.52], [-0.36, TABLE_TOP, -1.68]];
export const WALLET: V3 = [-0.3, 0.98, -2.15];

// ---------------- story beats (seconds, from words.json, hand-fixed) ----------------
export const W = {
  y2008: 0.0, airbnb: 1.24, is: 1.8, broke: 2.26,
  the: 3.21, founders: 3.36, are: 3.66, maxing: 3.88, out: 4.34, credit: 4.46, cards: 4.74,
  so: 5.4, they: 5.52, sell: 5.64, cereal: 5.86,
  obama: 6.64, os: 6.98,
  forty: 7.57, a: 8.08, box: 8.3,
  they2: 9.09, raise: 9.16, about: 9.42, thirty: 9.6,
  the2: 10.92, company: 11.1, survives: 11.38,
  today: 12.4, airbnb2: 13.12, is2: 13.5, worth: 14.04, billions: 14.26, end: 14.82,
};
export const LEAD = 2 / FPS;
/** the cash counter: 0 at COUNT0, $30,000 at COUNT1 (ease-out) */
export const COUNT0 = 9.5, COUNT1 = 10.55;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "indoor" | "night" | "lamp" | "dc";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 36, light: "indoor", sunAz: 130, sunEl: 45 },    // 2008: calendar CU -> pull back to the cramped room
  { id: 2, a: 36, b: 92, light: "indoor", sunAz: 130, sunEl: 45 },   // Airbnb is broke: the founders on the couch, a moth
  { id: 3, a: 92, b: 160, light: "indoor", sunAz: 120, sunEl: 50 },  // maxing out credit cards: CU of the table
  { id: 4, a: 160, b: 197, light: "indoor", sunAz: 130, sunEl: 45 }, // so they sell cereal: boxes drop in
  { id: 5, a: 197, b: 226, light: "indoor", sunAz: 140, sunEl: 45 }, // "Obama O's": hero box CU
  { id: 6, a: 226, b: 266, light: "indoor", sunAz: 110, sunEl: 45 }, // $40 a box: price tag slap
  { id: 7, a: 266, b: 326, light: "indoor", sunAz: 130, sunEl: 45 }, // they raise about $30,000: boxes sell, cash rains
  { id: 8, a: 326, b: 368, light: "indoor", sunAz: 140, sunEl: 45 }, // the company survives: cheering
  { id: 9, a: 368, b: TOTAL, light: "golden", sunAz: 150, sunEl: 14 },  // today ... worth billions: skyline + growth chart
];
/** crossfades (frames) at time / place changes */
export const XFADE: Record<number, number> = { 9: 10 };
/** white flashes: the hero box reveal */
export const FLASHES = [197];
/** fade to black at the very end (frames from the end) */
export const FADE_OUT = 24;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- props over time ----------------
/** cereal boxes stacked on / around the coffee table (relative to APT): [x, y, z, yaw]; drop in from "sell" on */
export const STACK: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const y0 = TABLE_TOP;
  // back row on the table (behind the hero), two layers
  for (let i = 0; i < 4; i++) out.push([-0.72 + i * 0.28, y0, -1.72, (i - 1.5) * 0.06]);
  for (let i = 0; i < 3; i++) out.push([-0.58 + i * 0.28, y0 + 0.345, -1.72, (i - 1) * -0.08]);
  // side towers on the floor
  for (const [x, z] of [[-1.55, -1.45], [0.95, -1.4]] as const) for (let j = 0; j < 3; j++) out.push([x, j * 0.345, z, (j % 2 ? 0.12 : -0.08) + x * 0.05]);
  out.push([-0.92, y0, -1.38, 0.18]); out.push([0.32, y0, -1.38, -0.16]);
  return out;
})();
/** landing time (s) of stack box i */
export const stackT = (i: number) => W.sell - 0.12 + 0.045 * i;
/** sale time (s) of stack box i: they fly off during "They raise about" */
export const soldT = (i: number) => W.they2 - 0.05 + 0.055 * ((i * 7) % STACK.length);
export const countAt = (t: number) => Math.round(30000 * easeOut((t - COUNT0) / (COUNT1 - COUNT0)) / 10) * 10;

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
const A = APT, C = CITY;

// 1: CU of the "2008" calendar, then a hard cut to the wide cramped room
const S1a = (f: number) => dolly(add(A, [1.05, 1.62, -2.05]), add(A, [1.25, 1.6, -3.18]), pushK(f, 0, 0.004), { fov: 40, roll: 0.05 });
const S1b = (f: number) => dolly(add(A, [1.75, 1.75, 2.0]), add(A, [-0.2, 0.9, -2.4]), pushK(f, 14, 0.003), { fov: 56, roll: -0.03 });
// 2: MS the three founders on the couch
const S2 = (f: number) => dolly(add(A, [-0.25, 1.2, 1.1]), add(A, [-0.3, 0.95, -2.45]), pushK(f, 36, 0.003), { fov: 60, roll: 0.02 });
// 3: CU the coffee table: credit cards (founders soft behind)
const S3 = (f: number) => dolly(add(A, [-0.22, 1.22, -0.55]), add(A, [-0.3, 0.4, -1.28]), pushK(f, 92, 0.003), { fov: 42, roll: -0.04 });
// 4: MS the founders jump up behind the table as the boxes drop in
const S4 = (f: number) => dolly(add(A, [0.1, 1.2, 1.5]), add(A, [-0.3, 0.95, -2.0]), pushK(f, 160, 0.004), { fov: 60, roll: 0.03 });
// 5: hero CU of the "Obama O's" box
const S5 = (f: number) => dolly(add(A, [-0.18, 0.66, -0.78]), add(A, [-0.3, 0.6, -1.45]), pushK(f, 197, 0.006), { fov: 38, roll: -0.05 });
// 6: low 3/4 angle on the box for the price tag
const S6 = (f: number) => dolly(add(A, [-0.6, 0.6, -0.68]), add(A, [-0.28, 0.64, -1.45]), pushK(f, 226, 0.005), { fov: 42, roll: 0.06 });
// 7: wide: boxes sell, cash rains
const S7 = (f: number) => dolly(add(A, [0.95, 1.5, 1.45]), add(A, [-0.3, 1.0, -1.9]), pushK(f, 266, 0.0032), { fov: 60, roll: -0.03 });
// 8: low hero angle on the cheering founders
const S8 = (f: number) => dolly(add(A, [-0.2, 0.8, 0.85]), add(A, [-0.3, 1.2, -2.2]), pushK(f, 326, 0.004), { fov: 62, roll: 0.05 });
// 9: the golden plaza: founders, the growth chart, the skyline; crane up and back
const S9 = (f: number) => {
  const u = glide((f - 372) / 110);
  return { pos: add(C, [0.4 + 0.5 * u, 1.35 + 2.2 * u, 5.2 + 3.6 * u]), look: add(C, [0.55, 1.9 + 3.6 * u, -6 - 8 * u]), fov: 50 + 4 * u, roll: 0.03 - 0.05 * u };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 14, cut: true, s: S1b }], 2: [{ f: 36, s: S2 }], 3: [{ f: 92, s: S3 }], 4: [{ f: 160, s: S4 }],
  5: [{ f: 197, s: S5 }], 6: [{ f: 226, s: S6 }], 7: [{ f: 266, s: S7 }], 8: [{ f: 326, s: S8 }], 9: [{ f: 362, s: S9 }],
};

/** impact flip-shakes (seconds) */
export const KICKS: [number, number][] = [
  [W.broke - LEAD, 0.05], [W.cards - LEAD, 0.04], [W.sell - LEAD, 0.03], [W.os - LEAD, 0.05], [W.forty - LEAD, 0.05],
  [W.thirty + 0.95, 0.04], [W.survives - LEAD, 0.05], [W.billions - LEAD, 0.04],
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
  { f: 0, cInf: 12, focus: () => add(A, CAL) },
  { f: 14, cInf: 4, focus: () => add(A, [-0.3, 0.95, -2.45]) },
  { f: 36, cInf: 11, focus: () => add(A, [-0.3, 1.2, -2.45]) },
  { f: 92, cInf: 14, focus: () => add(A, [-0.3, TABLE_TOP, -1.52]) },
  { f: 160, cInf: 9, focus: () => add(A, [-0.3, 1.2, -2.3]) },
  { f: 197, cInf: 15, focus: () => add(A, [-0.3, 0.62, -1.4]) },
  { f: 226, cInf: 14, focus: () => add(A, [-0.3, 0.65, -1.4]) },
  { f: 266, cInf: 5, focus: () => add(A, [-0.3, 1.1, -2.2]) },
  { f: 326, cInf: 11, focus: () => add(A, [-0.3, 1.3, -2.3]) },
  { f: 368, cInf: 0 },
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
