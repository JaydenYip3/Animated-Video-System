// Timeline of "The Lighthouse Keeper": shots timed to the voice words (projects/lighthouse-keeper/voice/words.json).
// Calm camera grammar (tender fable): cuts every ~3-5 s, 30-40 f glides, crossfades at time/place changes, no kicks,
// every hold creeps 0.15-0.3 %/f. Each reaction lands 0-3 f before its word.
export const FPS = 30;
export const TOTAL = 1043; // ceil(34.762 s x 30)
export type V3 = [number, number, number];

// ---------------- places ----------------
export const GROUND = 4.5;                 // islet plateau height (m above the sea)
export const TOWER: V3 = [0, GROUND, -3];  // tower axis base
export const TOWER_H = 17;
export const GY = GROUND + TOWER_H;        // gallery floor
export const LAMP: V3 = [0, GY + 1.35, -3];
export const DOOR: V3 = [7.5, GROUND, 3.5]; // cottage doorway (front wall z = 3.5, facing +z)
export const KEEPER_GAL: V3 = [-1.05, GY, -0.2];  // keeper on the gallery, sea side
export const KEEPER_DOOR: V3 = [7.5, GROUND, 3.85];
export const GIRL_DOOR: V3 = [7.5, GROUND, 5.55];
export const BOAT_REST: V3 = [3.0, 0, 23.4];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const T = (f: number) => f / FPS;

// ---------------- story beats (seconds, from words.json) ----------------
export const W = {
  lit: 6.14, anyway: 6.86, evening: 8.34, ashore: 10.48, girl: 12.36, map: 13.26, circled: 14.70,
  my: 16.33, drew: 17.31, told: 19.17, light: 22.61, looked: 25.63, map2: 26.35, recognized: 27.47, handwriting: 28.93,
  smiled: 30.63, stepped: 31.65, aside: 31.97, let: 33.11, in: 33.49,
};
export const LEAD = 2 / FPS;
/** lamp brightness 0..1: lights on "lit" (and stays lit at night / later evenings) */
export const lampOn = (id: number, t: number) => (id === 1 ? 0 : id === 2 ? smooth((t - (W.lit - LEAD)) / 0.35) : 1);
/** the rotating beam: one turn every 9 s */
export const beamAngle = (t: number) => (t / 9) * Math.PI * 2 + 0.9;
/** boat drifting in (shot 3), resting on the shingle after "ashore"; a small rock-and-settle on landing */
export const boatAt = (t: number): { p: V3; yaw: number; roll: number } => {
  const t0 = 7.4, t1 = W.ashore - LEAD, u = clamp01((t - t0) / (t1 - t0)), e = easeOut(u);
  const start: V3 = [5.6, 0, 35];
  const p: V3 = [start[0] + (BOAT_REST[0] - start[0]) * e, 0, start[2] + (BOAT_REST[2] - start[2]) * e];
  const land = t - t1, settle = land > 0 ? Math.exp(-land * 2.2) * Math.sin(land * 9) : 0;
  const bob = land > 0 ? 0 : 0.05 * Math.sin(t * 2.1);
  p[1] = bob + (land > 0 ? 0.12 * clamp01(land * 4) : 0);
  return { p, yaw: 0.25 * (1 - e) + 0.05 * Math.sin(t * 0.8) * (1 - clamp01(land)), roll: 0.04 * Math.sin(t * 1.7) * (land > 0 ? 0 : 1) + 0.06 * settle };
};

// ---------------- shots ----------------
export type Light = "dusk" | "night" | "lamp";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 138, light: "dusk", sunAz: 25, sunEl: 5 },     // empty sea, keeper on the gallery
  { id: 2, a: 138, b: 240, light: "night", sunAz: 70, sunEl: 30 },  // he lights the lamp; beam over the empty sea
  { id: 3, a: 240, b: 340, light: "dusk", sunAz: 95, sunEl: 8 },   // a boat drifts ashore
  { id: 4, a: 340, b: 488, light: "dusk", sunAz: 95, sunEl: 8 },    // the girl + the map insert
  { id: 5, a: 488, b: 575, light: "lamp", sunAz: 80, sunEl: 14 },  // at the door: two-shot
  { id: 6, a: 575, b: 718, light: "lamp", sunAz: 165, sunEl: 16 },  // the girl, from the keeper's eyes
  { id: 7, a: 718, b: 880, light: "lamp", sunAz: 20, sunEl: 22 },   // the keeper looks at the map: insert
  { id: 8, a: 880, b: TOTAL, light: "lamp", sunAz: 20, sunEl: 22 }, // he smiles, steps aside, lets her in
];
/** crossfades (frames) at time / place changes */
export const XFADE: Record<number, number> = { 2: 14, 3: 14, 5: 16 };
export const FLASH_AT = -100; // no white flash in this short (tender tone)

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
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// map insert positions (the map card is held between the hands in these shots)
export const MAP_BOAT: V3 = [BOAT_REST[0], 1.12, BOAT_REST[2] + 0.75];
export const MAP_DOOR: V3 = [7.5, GROUND + 1.12, 4.75];

// shot 1: wide from the sea, slow push; then the keeper on the gallery looking out at the empty sea (side view)
const S1a = (f: number) => zoom([30, 6.5, 62], [0, 13.5, -3], 40, pushK(f, 0, 0.0016));
const S1b = (f: number) => dolly([-4.9, GY + 1.65, 2.7], [-1.05, GY + 1.4, -0.2], pushK(f, 66, 0.0022), { fov: 40 });
// shot 2: the keeper in front of the lamp (it lights behind him on "lit"), then the beam over the empty sea
const S2a = (f: number) => dolly([0.6, GY + 1.75, 6.6], [-0.6, GY + 1.55, -1.2], pushK(f, 126, 0.002), { fov: 38 });
const S2b = (f: number) => zoom([-46, 9, 58], [0, 16, -3], 40, pushK(f, 206, 0.0015));
// shot 3: low over the water behind the boat: it drifts away from the lens onto the shingle under the lit tower
const S3a = (f: number) => dolly([8.5, 2.7, 45], [3.2, 3.6, 17], pushK(f, 226, 0.0018), { fov: 40 });
// shot 4: the girl in the boat holding the map (front, MS); insert on the map "the lighthouse circled in red"
const S4a = (f: number) => dolly([3.4, 1.55, 27.0], [3.0, 1.3, BOAT_REST[2]], pushK(f, 338, 0.0022), { fov: 42 });
const S4b = (f: number) => dolly(add(MAP_BOAT, [0.05, 0.12, 1.05]), add(MAP_BOAT, [0.1, 0.03, 0]), pushK(f, 419, 0.003), { fov: 36 });
// shot 5: two-shot at the door, 3/4 from the sea side (keeper in the warm doorway, the girl holding up the map)
const S5a = (f: number) => dolly([11.4, GROUND + 1.45, 9.2], [7.5, GROUND + 1.05, 4.6], pushK(f, 476, 0.002), { fov: 38 });
// shot 6: the girl from the keeper's eyes (looking down at her), slow push on "a light here"
const S6a = (f: number) => dolly([7.75, GROUND + 1.72, 3.95], [7.5, GROUND + 0.95, GIRL_DOOR[2]], pushK(f, 575, 0.0022), { fov: 40 });
// shot 7: the keeper (from the girl's eyes, looking up) -> the map insert, push toward the handwriting
const S7a = (f: number) => dolly([7.35, GROUND + 0.95, 6.3], [7.5, GROUND + 1.45, KEEPER_DOOR[2]], pushK(f, 718, 0.0025), { fov: 36 });
const S7b = (f: number) => dolly(add(MAP_DOOR, [0.16, -0.02, 0.66]), add(MAP_DOOR, [0.14, -0.05, 0]), pushK(f, 748, 0.0025), { fov: 34 });
// shot 8: the keeper's face as he understands -> smiles; wide: he steps aside, she goes in
const S8a = (f: number) => dolly([7.4, GROUND + 1.1, 5.7], [7.5, GROUND + 1.55, KEEPER_DOOR[2]], pushK(f, 880, 0.0028), { fov: 32 });
const S8b = (f: number) => dolly([10.9, GROUND + 1.8, 9.4], [7.0, GROUND + 1.15, 3.9], pushK(f, 945, 0.0018), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 66, cut: true, s: S1b }],
  2: [{ f: 126, s: S2a }, { f: 206, cut: true, s: S2b }],
  3: [{ f: 226, s: S3a }],
  4: [{ f: 338, s: S4a }, { f: 419, cut: true, s: S4b }],
  5: [{ f: 476, s: S5a }],
  6: [{ f: 575, s: S6a }],
  7: [{ f: 718, s: S7a }, { f: 748, cut: true, s: S7b }],
  8: [{ f: 880, s: S8a }, { f: 945, cut: true, s: S8b }],
};

export const kickAt = (_t: number) => 0;
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 30);
  return Math.max(f, e);
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const head = (p: V3, h = 1.75): (() => V3) => () => [p[0], p[1] + h, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                    // establishing wide
  { f: 66, cInf: 10, focus: head(KEEPER_GAL, 1.9) },    // keeper on the gallery
  { f: 138, cInf: 11, focus: head(KEEPER_GAL, 1.9) },   // keeper + lamp
  { f: 206, cInf: 0 },                                  // beam wide, boat drift
  { f: 338, cInf: 12, focus: () => [BOAT_REST[0], 1.2, BOAT_REST[2] + 0.2] }, // girl MS
  { f: 419, cInf: 14 },                                 // map insert (focus = look)
  { f: 488, cInf: 8, focus: () => [7.5, GROUND + 1.4, 4.7] }, // two-shot
  { f: 575, cInf: 13, focus: head(GIRL_DOOR, 1.25) },   // girl CU
  { f: 718, cInf: 13, focus: head(KEEPER_DOOR, 1.85) }, // keeper CU
  { f: 748, cInf: 15 },                                 // map insert
  { f: 880, cInf: 13, focus: head(KEEPER_DOOR, 1.85) }, // keeper CU
  { f: 945, cInf: 6, focus: () => [7.2, GROUND + 1.3, 4.3] }, // wide at the door
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
