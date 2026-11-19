// Timeline of the lighthouse ghost short (eerie, quiet): 3 shots timed to the voice words
// (/root/code/orchestration/outputs/lighthouse-keeper/build/voice/words.json, faster-whisper word times).
//   0.00-5.34 "Every night, at three a.m., the lighthouse turned on by itself."   -> shot 1: the dark tower; the lamp
//            flickers on by itself on "turned on" (3.54 s)
//   6.28-9.46 "The keeper had been dead for forty years."                          -> shot 2: his empty, dusty room
//  10.30-15.32 "Tonight, for the first time, the light turned toward town."        -> shot 3: the beam leaves the sea and
//            slowly swings onto the little lit town across the bay, landing on "town"; ~1.3 s quiet hold after.
// Calm camera: slow creeping dollies only, soft crossfades between shots, no kicks, no flash.
export const FPS = 30;
export const TOTAL = 500; // 16.67 s: voice ends 15.32 s + ~1.3 s hold
export type V3 = [number, number, number];

// ---------------- places ----------------
export const GROUND = 4.5;
export const TOWER: V3 = [0, GROUND, -3];
export const TOWER_H = 17;
export const GY = GROUND + TOWER_H;
export const LAMP: V3 = [0, GY + 1.35, -3];
export const DOOR: V3 = [7.5, GROUND, 3.5];
export const TOWN: V3 = [-10, 2, -330];          // the little town across the bay (straight "inland" of the tower)
export const CHAIR: V3 = [8.35, GROUND, 0.75];   // the keeper's chair, in the moonlight from the back window
export const WIN_X = 8.4;                        // back-wall window centre (x)

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---------------- story beats (seconds, from words.json) ----------------
export const W = { turned: 3.54, on: 4.2, itself: 4.88, keeper: 6.52, dead: 7.82, tonight: 10.3, light: 13.26, turned2: 13.6, toward: 14.3, town: 14.78, end: 15.32 };
export const LEAD = 2 / FPS;

/** lamp brightness 0..1: dark, then a few uneven flickers from "turned", steady by "on" */
export const lampOn = (id: number, t: number) => {
  if (id !== 1) return 1;
  const t0 = W.turned - LEAD;
  if (t < t0) return 0;
  const u = t - t0;
  // stutter: on / off / on-dim / off / on (like an old filament or a mantle catching)
  const flick: [number, number][] = [[0.0, 0.7], [0.1, 0.0], [0.2, 0.45], [0.27, 0.05], [0.4, 0.85], [0.5, 0.3], [0.6, 1.0]];
  let v = 0;
  for (const [s, k] of flick) if (u >= s) v = k;
  return v;
};
/** beam yaw (rotation.y of the pivot; the beam points along (cos a, 0, -sin a)). a = PI/2 points at the town (-z). */
export const A_TOWN = Math.atan2(-(TOWN[2] - LAMP[2]), TOWN[0] - LAMP[0]);
export const beamAngle = (id: number, t: number) => {
  if (id === 1) return 0.35 + (t - W.turned) * (Math.PI * 2 / 11);          // one slow turn every 11 s, out to sea
  if (id === 2) return 0.35 + (t - W.turned) * (Math.PI * 2 / 11);
  // shot 3: starts sweeping over the open sea (screen right), then slows and swings round to the town, lands on "town"
  const t0 = 9.6, t1 = W.town + 0.25;
  return A_TOWN - 1.9 * (1 - glide((t - t0) / (t1 - t0)) ** 0.85);
};
/** how hard the beam is resting on the town (0..1) */
export const beamOnTown = (t: number) => smooth((t - (W.toward + 0.1)) / 0.9);

// ---------------- shots ----------------
export type Light = "ghost" | "room";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number; sunDir?: V3 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 186, light: "ghost", sunDir: [0.55, 0.42, -0.72] },    // dark tower in the fog; the lamp turns on
  { id: 2, a: 186, b: 296, light: "room", sunDir: [0.08, 0.5, -0.86] },    // the keeper's empty room (moon through the window)
  { id: 3, a: 296, b: TOTAL, light: "ghost", sunDir: [0.55, 0.42, -0.72] }, // the beam turns toward the town
];
/** crossfades (frames) at the place changes */
export const XFADE: Record<number, number> = { 2: 18, 3: 18 };
export const FLASH_AT = -100; // none (quiet ghost story)

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
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
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** a slow move from A to B over the frame span (smoothstep in, linear-ish middle: never a dead hold) */
const move = (f: number, f0: number, f1: number, A: Shot & { fov?: number }, B: Shot & { fov?: number }): Shot => {
  const u = clamp01((f - f0) / (f1 - f0)), k = 0.5 * u + 0.5 * smooth(u);
  return { pos: lerp3(A.pos, B.pos, k), look: lerp3(A.look, B.look, k), fov: (A.fov ?? 40) + ((B.fov ?? 40) - (A.fov ?? 40)) * k, roll: 0 };
};

// shot 1: low over the foggy sea, looking up at the dark tower on its rocks; slow creep in + a slight rise
const S1 = (f: number) => move(f, 0, 196,
  { pos: [22, 3.2, 62], look: [0, 15.5, -3], fov: 42 },
  { pos: [15.5, 4.6, 45], look: [0, 17.5, -3], fov: 40 });
// shot 2: inside the keeper's cottage, from near the door: the empty chair in the window's moonlight; slow push + drift
const S2 = (f: number) => move(f, 176, 306,
  { pos: [6.3, GROUND + 1.6, 3.0], look: [8.75, GROUND + 0.95, -0.45], fov: 46 },
  { pos: [6.75, GROUND + 1.45, 2.45], look: [8.7, GROUND + 0.9, -0.3], fov: 44 });
// shot 3: high behind the lighthouse, looking across the bay to the town; a slow crane down/in as the beam swings round
const S3 = (f: number) => move(f, 286, TOTAL,
  { pos: [16, 44, 46], look: [-4, 9, -140], fov: 42 },
  { pos: [11, 37, 33], look: [-6, 6, -170], fov: 38 });

const CAMS: Record<number, Key[]> = { 1: [{ f: 0, s: S1 }], 2: [{ f: 176, s: S2 }], 3: [{ f: 286, s: S3 }] };

export const kickAt = (_t: number) => 0;
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                                    // establishing wide: sharp
  { f: 176, cInf: 9, focus: () => [CHAIR[0], CHAIR[1] + 0.8, CHAIR[2]] }, // interior medium: focus on the chair
  { f: 286, cInf: 0 },                                                  // bay wide: sharp
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i];
  return { cInf: d.cInf, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
/** lens per shot (each crossfade layer uses its own shot's lens) */
export const dofFor = (id: number) => DOF[id - 1];
