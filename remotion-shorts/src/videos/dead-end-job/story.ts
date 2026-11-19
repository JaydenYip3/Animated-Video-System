// Timeline of "Dead-End Job": shots timed to the narration words (outputs/dead-end-job/build/voice/words.json).
// Dark-comedy horror pitch: a neon night street + three small interiors (Justin's room, the agency office, the clinic).
// Cuts every ~3-6 s, 18-40 f glides, every hold creeps; flip kicks on the scare beats; reactions 0-3 f before the word.
export const FPS = 30;
export const TOTAL = 2540; // 84.67 s: 83.6 s of voice + an ending hold into black
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const T = (f: number) => f / FPS;

// ---------------- places ----------------
export const SWY = 0.15;                      // sidewalk top
export const FRONT = -8;                      // building fronts (far side of the street)
export const AG_DOOR: V3 = [-26, SWY, FRONT]; // the agency door
export const STORE_DOOR: V3 = [-8, SWY, FRONT];
export const HOUSE_DOOR: V3 = [15, 0.6, FRONT]; // the creepy house (milk delivery): door up a stoop
export const POSTER: V3 = [28, 1.75, FRONT + 0.03];
export const LAMPS_X = [-40, -20, 0, 20, 40, 60]; // street lamps on the far kerb (z = -4.6)
// interiors (far off the street, sealed rooms)
export const ROOM: V3 = [300, 0, 0];
export const OFFICE: V3 = [400, 0, 0];
export const CLINIC: V3 = [500, 0, 0];
export const BOARD: V3 = [302.97, 1.55, -0.9]; // clue board on the room's right wall (faces -x)

// ---------------- story beats (seconds, from words.json, hand-fixed) ----------------
export const W = {
  broke: 0.84, crushed: 1.94, debt: 2.94, finds: 5.28, strange: 5.84, agency: 6.9, offer: 8.14, refuse: 9.06,
  part: 10.2, fifty: 12.56, wage: 14.26, theres: 15.34, catch: 16.56,
  rules: 18.62, breaking: 20.0, life: 22.02,
  first: 23.92, store: 25.86, monsters: 27.4, midnight: 28.96,
  next: 30.2, follow: 31.9, clown: 32.34, never: 33.0, sight: 33.96,
  milk: 36.4, two: 38.42, reasons: 41.2, explain: 42.44,
  each: 43.76, twisted: 45.58, last: 46.52,
  sister: 48.26, pulled: 48.94, friend: 50.4, missing: 51.14, trial: 52.16, investigator: 54.62, questions: 56.88, agency2: 58.06,
  deeper: 59.94, digs: 61.1, truth: 62.76,
  dangerous: 66.52, traps: 67.7, feed: 69.5, drowning: 70.56, debt2: 71.32,
  father: 74.44, tied: 75.26,
  one: 78.2, shift: 78.86, survive: 79.5,
  can: 80.42, quit: 81.64, dead: 82.38, job: 82.92,
};
export const LEAD = 2 / FPS;

// ---------------- shots ----------------
export type Light = "night" | "lamp" | "neon" | "store" | "red";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "lamp", sunAz: 120, sunEl: 35 },     // Justin's room: bills pile up
  { id: 2, a: 150, b: 300, light: "night", sunAz: 70, sunEl: 30 },   // the street: the agency's neon eye wakes
  { id: 3, a: 300, b: 456, light: "neon", sunAz: 60, sunEl: 25 },    // the office: the offer, cash
  { id: 4, a: 456, b: 516, light: "red", sunAz: 40, sunEl: 20 },     // the recruiter: "one catch"
  { id: 5, a: 516, b: 690, light: "neon", sunAz: 60, sunEl: 25 },    // the rule sheet
  { id: 6, a: 690, b: 780, light: "night", sunAz: 60, sunEl: 30 },   // the convenience store at night
  { id: 7, a: 780, b: 900, light: "store", sunAz: 150, sunEl: 55 },  // inside: monsters walk in at midnight
  { id: 8, a: 900, b: 1050, light: "night", sunAz: 70, sunEl: 30 },  // following the clown
  { id: 9, a: 1050, b: 1209, light: "night", sunAz: 110, sunEl: 30 }, // milk delivery
  { id: 10, a: 1209, b: 1305, light: "night", sunAz: 70, sunEl: 30 }, // the door opens a crack
  { id: 11, a: 1305, b: 1422, light: "red", sunAz: 20, sunEl: 40 },  // each gig more twisted: surrounded
  { id: 12, a: 1422, b: 1500, light: "neon", sunAz: 60, sunEl: 25 }, // his sister pulled in
  { id: 13, a: 1500, b: 1600, light: "store", sunAz: 150, sunEl: 55 }, // the clinic: the friend vanishes
  { id: 14, a: 1600, b: 1755, light: "neon", sunAz: 80, sunEl: 35 }, // the investigator
  { id: 15, a: 1755, b: 1930, light: "lamp", sunAz: 120, sunEl: 35 }, // digging: the clue board
  { id: 16, a: 1930, b: 2157, light: "red", sunAz: 20, sunEl: 20 },  // the truth: the giant behind the agency
  { id: 17, a: 2157, b: 2307, light: "night", sunAz: 80, sunEl: 30 }, // the missing father
  { id: 18, a: 2307, b: 2406, light: "red", sunAz: 30, sunEl: 20 },  // one last shift
  { id: 19, a: 2406, b: TOTAL, light: "red", sunAz: 160, sunEl: 25 }, // can he quit?
];
/** crossfades (frames) at time / place changes */
export const XFADE: Record<number, number> = { 2: 10, 6: 10, 8: 10, 11: 12, 13: 10, 15: 12, 16: 10, 17: 12 };
export const FLASH_AT = Math.round((W.truth - LEAD) * FPS); // white flash as the truth lands
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

// ---------------- motion ----------------
/** Justin walking to the agency (shot 2): x along the sidewalk, stops at the door */
export const J2 = { x0: -31.4, x1: -27.6, t0: 5.0, t1: 7.25, z: -5.7 };
export const walkX = (t: number, w: { x0: number; x1: number; t0: number; t1: number }) => w.x0 + (w.x1 - w.x0) * clamp01((t - w.t0) / (w.t1 - w.t0));
/** the clown and Justin (shot 8): both walk +x along the sidewalk; the clown stops and turns on "never lose sight" */
export const CLOWN_W = { x0: 41.5, x1: 45.2, t0: 30.0, t1: W.never - 0.1, z: -5.8 };
export const JFOL_W = { x0: 38.4, x1: 41.6, t0: 30.0, t1: W.never + 0.25, z: -5.5 };
/** milk walk (shot 9): toward the lens along the sidewalk (-x) */
export const MILK_W = { x0: 22.5, x1: 17.4, t0: 35.0, t1: 39.6, z: -5.6 };
/** last shift walk (shot 18) */
export const LAST_W = { x0: -29.6, x1: -26.9, t0: 76.9, t1: 79.6, z: -5.2 };
/** the giant rising behind the agency (shot 16) */
export const giantRise = (t: number) => easeOut((t - 64.6) / 2.6);

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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const R = ROOM, O = OFFICE, C = CLINIC;

// 1: Justin at his table, bills raining; CU on "debt"
const S1a = (f: number) => dolly(add(R, [0.9, 1.75, 2.1]), add(R, [0, 1.0, -0.9]), pushK(f, 0, 0.0028), { fov: 42, roll: -0.03 });
const S1b = (f: number) => dolly(add(R, [-0.35, 1.25, 0.75]), add(R, [0, 1.1, -1.0]), pushK(f, 86, 0.003), { fov: 38, roll: 0.05 });
// 2: tracking along the street with Justin, then low on the agency as the eye wakes
const S2a = (f: number) => { const x = walkX(T(f), J2); return { pos: [x - 0.2, 1.55, 1.4] as V3, look: [x + 0.5, 1.25, -6.2] as V3, fov: 42 }; };
const S2b = (f: number) => dolly([-23.6, 0.75, -2.2], [-26.4, 2.6, -8], pushK(f, 214, 0.0022), { fov: 44, roll: 0.06 });
// 3: the office two-shot; CU Justin as the cash lands
const S3a = (f: number) => dolly(add(O, [-2.6, 1.55, 3.7]), add(O, [-0.4, 1.2, -0.4]), pushK(f, 300, 0.0018), { fov: 46 });
const S3b = (f: number) => dolly(add(O, [-0.4, 1.45, 1.6]), add(O, [-1.1, 1.3, 0.3]), pushK(f, 376, 0.003), { fov: 38, roll: -0.04 });
// 4: CU on the recruiter's grin, slow push
const S4a = (f: number) => dolly(add(O, [0.75, 1.55, 0.6]), add(O, [0.4, 1.62, -1.2]), pushK(f, 456, 0.004), { fov: 38, roll: 0.07 });
// 5: the rule sheet held up over the desk
const S5a = (f: number) => dolly(add(O, [0.1, 1.2, 1.25]), add(O, [0.0, 1.12, -0.25]), pushK(f, 516, 0.0026), { fov: 40, roll: -0.03 });
// 6: the store across the dark street
const S6a = (f: number) => dolly([-4.0, 1.5, 4.0], [-8.6, 1.6, -7.6], pushK(f, 690, 0.002), { fov: 46 });
// 7: inside the store, from the front corner, toward the counter and the door
const S7a = (f: number) => dolly([-3.0, 1.6, -9.9], [-3.8, 1.45, -17.2], pushK(f, 780, 0.0022), { fov: 54, roll: -0.04 });
// 8: tracking alongside Justin following the clown; push on "never lose sight"
const S8a = (f: number) => { const x = (walkX(T(f), CLOWN_W) + walkX(T(f), JFOL_W)) / 2; return { pos: [x - 0.4, 1.5, 6.0] as V3, look: [x, 1.15, -5.7] as V3, fov: 50 }; };
const S8b = (f: number) => dolly([45.0, 1.7, -2.6], [45.2, 1.6, -5.8], pushK(f, 1002, 0.006), { fov: 40, roll: 0.06 });
// 9: Justin walks toward the lens with a milk crate; the cash bursts on "two hundred"
const S9a = (f: number) => dolly([12.2, 1.35, -4.3], [17.5, 1.25, -5.9], pushK(f, 1050, 0.0015), { fov: 42 });
// 10: at the creepy door; it opens a crack, eyes in the dark
const S10a = (f: number) => dolly([19.6, 1.4, -2.6], [15.2, 1.5, -7.6], pushK(f, 1209, 0.0026), { fov: 42, roll: -0.05 });
// 11: high over the road: Justin ringed by the things from every job; crane down + roll
const S11a = (f: number) => {
  const u = glide((f - 1305) / 117);
  return { pos: [-1.5 + 1.5 * u, 8 - 3.5 * u, 8 - 2.5 * u] as V3, look: [0, 0.6, -3] as V3, fov: 44, roll: 0.02 + 0.06 * u };
};
// 12: the agency door: the recruiter takes his sister in
const S12a = (f: number) => dolly([-23.4, 1.5, 1.2], [-26.9, 1.35, -7.0], pushK(f, 1422, 0.0022), { fov: 44 });
// 13: the clinic: friend by the bed, then gone
const S13a = (f: number) => dolly(add(C, [-1.6, 1.6, 2.4]), add(C, [0.3, 1.1, -1.5]), pushK(f, 1500, 0.002), { fov: 44, roll: 0.03 });
// 14: the investigator under a street lamp, the agency glowing behind
const S14a = (f: number) => dolly([-20.2, 1.5, -1.5], [-21.8, 1.45, -5.8], pushK(f, 1600, 0.0026), { fov: 40 });
// 15: Justin at the clue board in his room; push in as the strings connect
const S15a = (f: number) => dolly(add(R, [-1.4, 1.6, 2.2]), add(R, [2.4, 1.35, -0.9]), pushK(f, 1755, 0.0016), { fov: 44 });
const S15b = (f: number) => dolly(add(R, [1.25, 1.55, -0.9]), add(R, [3.0, 1.55, -0.9]), pushK(f, 1838, 0.0032), { fov: 42, roll: 0.03 });
// 16: low on the agency; the giant rises behind it
const S16a = (f: number) => dolly([-25.5, 1.0, 9.5], [-26, 9.0, -12], pushK(f, 1930, 0.0012), { fov: 52, roll: -0.02 });
const S16b = (f: number) => dolly([-24.5, 1.4, 6.0], [-26, 12.0, -19], pushK(f, 2050, 0.0022), { fov: 50, roll: 0.05 });
// 17: Justin at the missing poster; the insert
const S17a = (f: number) => dolly([25.0, 1.6, -1.8], [28.1, 1.5, -7.9], pushK(f, 2157, 0.0024), { fov: 44 });
const S17b = (f: number) => dolly([28.0, 1.72, -5.95], [28.0, 1.72, -7.97], pushK(f, 2225, 0.003), { fov: 42, roll: -0.02 });
// 18: low tracking behind Justin walking to the open red door
const S18a = (f: number) => { const x = walkX(T(f), LAST_W); return { pos: [x - 2.6, 0.8, -1.4] as V3, look: [x + 0.6, 1.4, -7.4] as V3, fov: 44, roll: 0.04 }; };
// 19: Justin at the door, facing us; then the neon eye shuts
const S19a = (f: number) => dolly([-25.6, 1.55, -4.0], [-26.0, 1.5, -7.0], pushK(f, 2406, 0.0032), { fov: 40, roll: -0.03 });
const S19b = (f: number) => dolly([-26.0, 3.75, -5.4], [-26.0, 3.75, -7.95], pushK(f, 2492, 0.004), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 86, cut: true, s: S1b }],
  2: [{ f: 140, s: S2a }, { f: 214, cut: true, s: S2b }],
  3: [{ f: 300, s: S3a }, { f: 376, cut: true, s: S3b }],
  4: [{ f: 456, s: S4a }],
  5: [{ f: 516, s: S5a }],
  6: [{ f: 680, s: S6a }],
  7: [{ f: 780, s: S7a }],
  8: [{ f: 890, s: S8a }, { f: 1002, cut: true, s: S8b }],
  9: [{ f: 1040, s: S9a }],
  10: [{ f: 1209, s: S10a }],
  11: [{ f: 1295, s: S11a }],
  12: [{ f: 1422, s: S12a }],
  13: [{ f: 1490, s: S13a }],
  14: [{ f: 1600, s: S14a }],
  15: [{ f: 1745, s: S15a }, { f: 1838, cut: true, s: S15b }],
  16: [{ f: 1920, s: S16a }, { f: 2050, cut: true, s: S16b }],
  17: [{ f: 2147, s: S17a }, { f: 2225, cut: true, s: S17b }],
  18: [{ f: 2307, s: S18a }],
  19: [{ f: 2406, s: S19a }, { f: 2492, cut: true, s: S19b }],
};

/** impact flip-shakes (seconds): the cash, the seal stamps, midnight, the clown's turn, the eyes, the giant */
export const KICKS: [number, number][] = [
  [W.crushed - LEAD, 0.05], [W.fifty - LEAD, 0.04], [W.catch - LEAD, 0.03], [W.breaking - LEAD, 0.05], [W.life - LEAD, 0.04],
  [W.midnight - LEAD, 0.05], [W.never - LEAD, 0.04], [W.two - LEAD, 0.04], [W.reasons - LEAD, 0.03], [W.missing - LEAD, 0.04],
  [W.traps - LEAD, 0.06], [W.feed - LEAD, 0.04], [W.tied - LEAD, 0.04], [W.job - LEAD, 0.05],
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
  { f: 0, cInf: 10, focus: () => add(R, [0, 1.3, -1.2]) },
  { f: 86, cInf: 13, focus: () => add(R, [0, 1.3, -1.2]) },
  { f: 150, cInf: 6, focus: (f) => [walkX(T(f), J2), 1.3, J2.z] },
  { f: 214, cInf: 0 },
  { f: 300, cInf: 9, focus: () => add(O, [0.0, 1.4, -0.4]) },
  { f: 376, cInf: 13, focus: () => add(O, [-1.1, 1.5, 0.3]) },
  { f: 456, cInf: 14, focus: () => add(O, [0.4, 1.65, -1.2]) },
  { f: 516, cInf: 12 },
  { f: 690, cInf: 0 },
  { f: 780, cInf: 6, focus: () => [-3.0, 1.4, -17.0] },
  { f: 900, cInf: 5, focus: (f) => [(walkX(T(f), CLOWN_W) + walkX(T(f), JFOL_W)) / 2, 1.3, -5.6] },
  { f: 1002, cInf: 12, focus: () => [45.2, 1.6, -5.8] },
  { f: 1050, cInf: 8, focus: (f) => [walkX(T(f), MILK_W), 1.3, MILK_W.z] },
  { f: 1209, cInf: 9, focus: () => [15.3, 1.4, -6.4] },
  { f: 1305, cInf: 0 },
  { f: 1422, cInf: 6, focus: () => [-26.0, 1.4, -7.0] },
  { f: 1500, cInf: 8, focus: () => add(C, [0.0, 1.3, -1.0]) },
  { f: 1600, cInf: 11, focus: () => [-21.8, 1.6, -5.8] },
  { f: 1755, cInf: 7, focus: () => add(R, [1.8, 1.4, -0.7]) },
  { f: 1838, cInf: 10 },
  { f: 1930, cInf: 0 },
  { f: 2157, cInf: 9, focus: () => [28.4, 1.5, -6.5] },
  { f: 2225, cInf: 10 },
  { f: 2307, cInf: 6, focus: (f) => [walkX(T(f), LAST_W), 1.3, LAST_W.z] },
  { f: 2406, cInf: 12, focus: () => [-26.0, 1.55, -7.0] },
  { f: 2492, cInf: 8 },
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
