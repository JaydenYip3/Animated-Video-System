// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing. Characters are yaw-only billboards shaded by cardShade() (scene tint,
// bright floor, side gradient toward the sun, painted crescent in the drawing); standing ones get a soft multiply
// contact blob. Effects are unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never
// outlines their quads. Staging per shot of "nvidia-jensen-huang" at the bottom.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts,
  fxQ, fxBurst, fxPuff, JENSEN, JENSEN_KID, JENSEN_TEEN, JENSEN_YOUNG, LORI, DAD, MOM, PAL1, PAL2, STAFF, TOUGH,
  fxChip, fxMoth, fxRewind, fxPlane, fxHeart, fxBulb, fxMedal, fxBall, fxNapkin, fxBubbles, fxSparkle, fxGPU, fxBrain, fxConfetti, fxClock,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, easeOut, W, walkX, add, OFFICE, BATH, DINER, GYM, LAB, DC, SCHOOL, OREGON, HQ, TOWN,
  J_SEAT, CASHBOX, CHIPB, CLOCK, COWORKERS, SIT_Y, SINK, BOOTH, NAPKIN, kidPath, FAM_W, planeAt, camAt,
} from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";


// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: string = "dusk";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = { 5: [W.fails], 12: [W.except], 13: [W.job], 19: [W.ranked], 24: [W.nvidia2] };
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<string, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], dusk: [0.24, 0.2, 0.33], night: [0.2, 0.21, 0.33], lamp: [0.22, 0.2, 0.33], neon: [0.2, 0.16, 0.3], store: [0.26, 0.3, 0.34], red: [0.22, 0.12, 0.2], indoor: [0.3, 0.27, 0.36], dc: [0.12, 0.2, 0.26] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- staging by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const J: Who = { i: 1, o: JENSEN, okey: "jensen" };
const JK: Who = { i: 2, o: JENSEN_KID, okey: "jkid" };
const JT: Who = { i: 3, o: JENSEN_TEEN, okey: "jteen" };
const JY: Who = { i: 4, o: JENSEN_YOUNG, okey: "jyoung" };
const LO: Who = { i: 5, o: LORI, okey: "lori" };
const DA: Who = { i: 6, o: DAD, okey: "dad" };
const MO: Who = { i: 7, o: MOM, okey: "mom" };
const P1: Who = { i: 8, o: PAL1, okey: "pal1" };
const P2: Who = { i: 9, o: PAL2, okey: "pal2" };
const ST = (k: number): Who => ({ i: 10 + k, o: STAFF[k], okey: "staff" + k });
const TG = (k: number): Who => ({ i: 20 + k, o: TOUGH[k], okey: "tough" + k });

const stand = (cam: CamInfo, who: Who, at: V3, fo: FrontOpts, so: SideOpts, dirX: number, dirZ: number, front: boolean, scale = 1, shadow = true, mirror?: boolean) => (out: Stage) => {
  const view = front ? { side: false, mirror: !!mirror } : viewOf(cam, at[0], at[2], dirX, dirZ);
  const pl = person(cam, who, at[0], at[1], at[2], { side: !front, mirror: view.mirror }, fo, so, scale);
  if (front && mirror) pl.mirror = true;
  out.places.push(pl);
  if (shadow) blob(out, at[0], at[1], at[2], scale);
};
/** front-view person (the common case) */
const front = (cam: CamInfo, out: Stage, who: Who, at: V3, fo: FrontOpts, scale = 1, shadow = true) => stand(cam, who, at, fo, {}, 0, 1, true, scale, shadow)(out);
const sit = (cam: CamInfo, out: Stage, who: Who, at: V3, fo: FrontOpts) => stand(cam, who, at, { mode: "sit", ...fo }, {}, 0, 1, true, 1, false)(out);
const burst = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s: number, col = "#fff3b0") => {
  const u = (t - t0) / 0.35;
  if (u >= 0 && u < 1) out.fx.push({ key: `burst${col}${q(u, 12)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 12), col), x, y, z, w: s, h: s });
};
const puff = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s: number) => {
  const u = (t - t0) / 0.6;
  if (u >= 0 && u < 1) out.fx.push({ key: `puff${q(u, 15)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 15)), x, y, z, w: s, h: s, soft: true });
};
const qmark = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s: number, col = "#f2d23a") => {
  const u = (t - t0) / 0.3;
  if (u < 0) return;
  const k = easeOut(u) * (1 + 0.15 * Math.exp(-(t - t0 - 0.3) * 6) * (u >= 1 ? 1 : 0)), bob = 0.04 * Math.sin((t - t0) * 4);
  out.fx.push({ key: `q${col}`, cw: 200, ch: 300, draw: (p) => fxQ(p, col), x, y: y + bob, z, w: 0.22 * s * k, h: 0.33 * s * k, rot: 0.15 * Math.sin((t - t0) * 2 + x) });
};
/** pop-in scale: overshoot then settle */
const popK = (t: number, t0: number, dur = 0.22) => (t < t0 ? 0 : easeOut((t - t0) / dur) * (1 + 0.18 * Math.exp(-Math.max(0, t - t0 - dur) * 7) * (t - t0 > dur ? 1 : 0)));
const sparkle = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s: number, col = "#fffbe0") => {
  const u = (t - t0) / 0.45;
  if (u >= 0 && u < 1) out.fx.push({ key: `spk${col}${q(u, 12)}`, cw: 300, ch: 300, draw: (p) => fxSparkle(p, q(u, 12), col), x, y, z, w: s, h: s, rot: u * 1.2 });
};
const bubbles = (out: Stage, t: number, x: number, y: number, z: number, s: number, seed: number) => {
  const k = Math.floor(t * 6) % 4; // re-seeded 6x a second: the suds shimmer
  out.fx.push({ key: `bub${seed}_${k}`, cw: 400, ch: 400, draw: (p) => fxBubbles(p, seed * 10 + k), x, y: y + 0.03 * Math.sin(t * 5 + seed), z, w: s, h: s, soft: true });
};
const CONF = ["#e2453c", "#f2b33a", "#3f8fd8", "#5fbf5a", "#c25ac9", "#3fc2b8"];
const confetti = (out: Stage, t: number, t0: number, c: V3, n: number, spread: number, fall = 2.2) => {
  if (t < t0) return;
  for (let i = 0; i < n; i++) {
    const u = t - t0 - 0.03 * i;
    if (u < 0) continue;
    const vx = (hh(i, 2) - 0.5) * spread * 2.2, vy = 1.2 + 2.2 * hh(i, 3), vz = (hh(i, 4) - 0.5) * spread;
    const y = c[1] + vy * u - 0.5 * 4.0 * u * u;
    if (y < 0.02 || u > fall) continue;
    const col = CONF[i % CONF.length];
    out.fx.push({ key: `conf${col}`, cw: 64, ch: 64, draw: (p) => fxConfetti(p, col), x: c[0] + vx * u * 0.6 + 0.05 * Math.sin(u * 9 + i), y, z: c[2] + vz * u * 0.6, w: 0.07, h: 0.07, rot: u * (6 + 4 * hh(i, 5)) + i });
  }
};
const blinkOf = (t: number, i: number, id: number) => lidAt(t, i, SWAPS[id]);
/** the scrubbing motion -1..1 */
const scrub = (t: number, rate = 14) => q(Math.sin(t * rate), 8);

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const after = (w: number) => t > w - LEAD;
  const jb = blinkOf(t, 1, id);
  const O = OFFICE;
  // ---------------- the 1996 office ----------------
  if (id <= 8 || (id >= 25 && id <= 28)) {
    const lamp = s.light === "lamp" || s.light === "night";
    // coworkers: all here in shots 1-3, half of them gone from "half" on; nobody but Jensen at night
    if (!lamp) COWORKERS.forEach((c, k) => {
      const tGone = W.half - LEAD + (c.gone - 1) * 0.16;
      if (c.gone && (id > 4 || (id === 4 && t > tGone))) { if (id === 4) puff(out, t, tGone, O[0] + c.at[0], 1.1, O[2] + c.at[2], 1.3); return; }
      const expr: Expr = id === 4 && after(W.half) ? "shock" : k % 2 ? "nervous" : "worried";
      const p = add(O, c.at), b = lidAt(t, 10 + k);
      if (c.sit) sit(cam, out, ST(k), p, { expr, blink: b, look: k % 2 ? -0.5 : 0.5 });
      else front(cam, out, ST(k), p, { mode: "stand", expr, blink: b, facing: k === 4 ? 1 : -1 });
    });
    if (id === 1) sit(cam, out, J, add(O, J_SEAT), { expr: "worried", blink: jb, look: 0.3 });
    if (id === 2) {
      sit(cam, out, J, add(O, J_SEAT), { expr: after(W.cash) ? "pained" : "worried", blink: jb, headTilt: after(W.cash) ? 6 : 0 });
      moth(out, t, W.cash - 0.12, add(O, [CASHBOX[0], CASHBOX[1] + 0.1, CASHBOX[2]]), 1);
    }
    if (id === 3) {
      sit(cam, out, J, add(O, J_SEAT), { expr: after(W.flopped) ? "shock" : "hopeful", blink: jb });
      const br = smooth((t - (W.flopped - LEAD)) / 0.1), c = add(O, CHIPB);
      out.fx.push({ key: `chip${q(br, 4)}`, cw: 400, ch: 400, draw: (p) => fxChip(p, q(br, 4), 0), x: c[0], y: c[1] + 0.006, z: c[2], w: 0.3, h: 0.3, flat: true });
      burst(out, t, W.flopped - LEAD, c[0], c[1] + 0.1, c[2], 0.35, "#ffd24a");
      for (let i = 0; i < 3; i++) puff(out, t, W.flopped - LEAD + 0.1 + i * 0.25, c[0] + 0.02 * i, c[1] + 0.12 + 0.1 * i, c[2], 0.3 + 0.08 * i);
    }
    if (id === 4) sit(cam, out, J, add(O, J_SEAT), { expr: after(W.half) ? "shock" : "worried", blink: jb, look: after(W.half) ? 1 : 0 });
    if (id === 5) sit(cam, out, J, add(O, J_SEAT), { expr: after(W.fails) ? "nervous" : "worried", blink: jb, headTilt: after(W.fails) ? -4 : 0 });
    if (id === 6) sit(cam, out, J, add(O, J_SEAT), { expr: "shock", blink: 0 });
    if (id === 7 || id === 8) {
      sit(cam, out, J, add(O, J_SEAT), { expr: after(W.here) ? "wonder" : "worried", blink: jb, look: after(W.how) ? -0.6 : 0, headTilt: after(W.how) ? -6 : 0 });
      qmark(out, t, W.here - LEAD, O[0] + 0.32, 1.98, O[2] - 4.5, 1.1);
    }
    if (id === 8) rewindIcon(out, id, t, -1, W.rewind - 0.1);
    if (id === 25) {
      sit(cam, out, J, add(O, J_SEAT), { expr: "worried", blink: jb });
      rewindIcon(out, id, t, 1, 42.1);
    }
    if (id === 26) {
      sit(cam, out, J, add(O, J_SEAT), { expr: after(W.time) ? "pained" : "worried", blink: jb, look: after(W.time) ? -0.5 : 0, headTilt: after(W.time) ? -5 : 0 });
      moth(out, t, W.money - 0.15, add(O, [0.45, 1.0, -4.1]), -1);
      const spin = after(W.time) ? (t - (W.time - LEAD)) * 90 : 0;
      out.fx.push({ key: `clock${Math.floor(spin) % 60}`, cw: 300, ch: 300, draw: (p) => fxClock(p, Math.floor(spin) % 60), x: O[0] + CLOCK[0], y: CLOCK[1], z: O[2] + CLOCK[2] + 0.02, w: 0.42 * (1 + 0.15 * Math.exp(-Math.max(0, t - W.time) * 6) * (after(W.time) ? 1 : 0)), h: 0.42 });
    }
    if (id === 27) {
      const raise = smooth((t - (W.bet - 0.05)) / 0.45), glow = smooth((t - (W.one - 0.1)) / 0.5);
      front(cam, out, J, add(O, [0, 0, -4.7]), { mode: "stand", expr: after(W.chip) ? "hopeful" : "stern", blink: jb, hold: { kind: "chip", k: q(raise, 20), glow: q(glow, 10) } }, 1, false);
      sparkle(out, t, W.chip - LEAD, O[0] + 0.35, 2.15, O[2] - 4.6, 0.35, "#b8ffc4");
    }
    if (id === 28) {
      sit(cam, out, J, add(O, J_SEAT), { expr: after(W.works) ? "laugh" : "nervous", blink: jb });
      burst(out, t, W.works - LEAD, O[0] - 0.66, 0.99, O[2] - 3.9, 0.5, "#9bff7a");
      sparkle(out, t, W.works, O[0] - 0.45, 1.15, O[2] - 3.85, 0.18);
      sparkle(out, t, W.works + 0.15, O[0] - 0.86, 0.85, O[2] - 3.85, 0.14);
    }
  }
  // ---------------- Taiwan ----------------
  if (id === 9) {
    const T0 = TOWN;
    front(cam, out, JK, add(T0, [0, 0, -2.4]), { mode: "stand", expr: after(W.family) ? "nervous" : "hopeful", blink: jb, hold: { kind: "suitcase", k: 0 }, look: after(W.taiwan) ? 0.6 : 0 });
    front(cam, out, MO, add(T0, [-0.9, 0, -3.5]), { mode: "stand", expr: "tender", blink: lidAt(t, 7), facing: 1, wave: after(W.family) ? q(0.5 + 0.5 * Math.sin(t * 7), 10) : undefined });
    front(cam, out, DA, add(T0, [0.95, 0, -3.6]), { mode: "stand", expr: "smile", blink: lidAt(t, 6), facing: -1 });
  }
  if (id === 10) {
    const T0 = TOWN;
    front(cam, out, JK, add(T0, [0.5, 0, -1.2]), { mode: "stand", expr: after(W.america) ? "wonder" : "hopeful", blink: jb, look: -0.6, wave: q(0.5 + 0.5 * Math.sin(t * 8), 10) });
    front(cam, out, MO, add(T0, [-0.7, 0, -2.4]), { mode: "stand", expr: "tender", blink: lidAt(t, 7), wave: q(0.5 + 0.5 * Math.sin(t * 7 + 1), 10) });
    front(cam, out, DA, add(T0, [-1.6, 0, -2.9]), { mode: "stand", expr: "smile", blink: lidAt(t, 6), wave: q(0.5 + 0.5 * Math.sin(t * 6 + 2), 10) });
    const pp = planeAt(t);
    if (t > 14.85 && t < 17.3) out.fx.push({ key: "plane", cw: 800, ch: 400, draw: (p) => fxPlane(p), x: pp[0], y: pp[1], z: pp[2], w: 30, h: 15, rot: -0.1 });
  }
  // ---------------- the school ----------------
  if (id === 11) {
    const p = add(kidPath(t), [0, 0, 0]), moving = t > 17.0 && t < 19.3;
    front(cam, out, JK, p, { mode: moving ? "stroll" : "stand", phase: moving ? q(((t - 17) * 1.6) % 1, 30) : 0, expr: after(W.prep) ? "wonder" : "hopeful", blink: jb, facing: 1, hold: { kind: "suitcase", k: 0 } });
    sparkle(out, t, W.prep - 0.1, SCHOOL[0] - 3.5, 8.2, SCHOOL[2] - 9.6, 1.2);
    sparkle(out, t, W.kentucky - LEAD, SCHOOL[0] + 4.2, 6.5, SCHOOL[2] - 9.6, 1.0);
    sparkle(out, t, W.kentucky + 0.2, SCHOOL[0], 12.6, SCHOOL[2] - 9.0, 1.4);
  }
  if (id === 12) {
    const S0 = SCHOOL;
    const e: Expr = after(W.troubled) ? "shock" : after(W.not) ? "nervous" : after(W.except) ? "worried" : "hopeful";
    front(cam, out, JK, add(S0, [0, 0, -2.0]), { mode: "stand", expr: e, blink: jb, hold: { kind: "suitcase", k: 0 }, look: after(W.except) ? Math.sin(t * 2) : 0 });
    const gang: [V3, number, Expr][] = [[[-1.15, 0, -3.1], -1, "stern"], [[1.2, 0, -3.3], 1, "sly"], [[0.55, 0, -4.7], 1, "creep"], [[-0.6, 0, -5.3], -1, "stern"]];
    gang.forEach(([pos, side, ex], k) => {
      const t0 = W.except - LEAD + 0.15 * k, u = easeOut((t - t0) / 0.45);
      if (t < t0) return;
      const p = add(S0, [pos[0] + side * 2.2 * (1 - u), 0, pos[2]]);
      front(cam, out, TG(k), p, { mode: u < 1 ? "stroll" : "stand", phase: q(((t - t0) * 2) % 1, 20), expr: ex, blink: lidAt(t, 20 + k), facing: (-side) as -1 | 1 });
    });
    // a ball through a window on "troubled"
    const tb = W.troubled - LEAD - 0.35, ub = (t - tb) / 0.35;
    if (ub > 0 && ub < 1) out.fx.push({ key: "ball", cw: 100, ch: 100, draw: (p) => fxBall(p), x: S0[0] + 1.2 + 1.4 * ub, y: 1.0 + 2.4 * ub + 1.2 * Math.sin(ub * Math.PI), z: S0[2] - 3.3 - 6.5 * ub, w: 0.28, h: 0.28 });
    burst(out, t, W.troubled - LEAD, S0[0] + 2.6, 3.4, S0[2] - 9.8, 2.2, "#bfe8ff");
  }
  // ---------------- the bathroom ----------------
  if (id === 13) {
    const B = BATH, k = after(W.cleaning) ? scrub(t, 11) : 0;
    front(cam, out, JK, add(B, [-0.2, 0, -0.8]), { mode: "stand", expr: after(W.cleaning) ? "pained" : after(W.job) ? "shock" : "nervous", blink: jb, hold: { kind: "mop", k } });
    if (after(W.cleaning)) { bubbles(out, t, B[0] + 0.25, 0.18, B[2] - 0.55, 0.55, 1); bubbles(out, t, B[0] - 0.35, 0.12, B[2] - 0.4, 0.4, 2); }
  }
  if (id === 14 || id === 15 || id === 32) {
    const B = BATH, k = scrub(t, 16);
    front(cam, out, JK, add(B, [0.45, 0, -1.6]), { mode: "stand", expr: id === 32 ? "stern" : "pained", blink: jb, hold: { kind: "brush", k }, facing: -1 });
    bubbles(out, t, B[0] + 0.05, 0.55, B[2] - 1.95, 0.38, 3);
    const tw = id === 14 ? W.every : id === 15 ? W.single : W.scrubbing;
    sparkle(out, t, tw - LEAD, B[0] - 0.12, 0.62, B[2] - 1.9, 0.28);
    sparkle(out, t, tw + 0.12, B[0] + 0.12, 0.5, B[2] - 1.9, 0.2);
  }
  if (id === 16) {
    const B = BATH;
    front(cam, out, JK, add(B, [0.45, 0, -1.6]), { mode: "stand", expr: "dazed", blink: 0, hold: { kind: "mop", k: scrub(t, 9) }, headTilt: 8, tilt: 5 });
    sparkle(out, t, W.day - LEAD, B[0] - 1.6, 0.6, B[2] - 1.95, 0.3);
    sparkle(out, t, W.day - LEAD + 0.1, B[0] + 1.6, 0.6, B[2] - 1.95, 0.3);
    bubbles(out, t, B[0] + 0.9, 0.12, B[2] - 1.2, 0.5, 4);
  }
  // ---------------- Oregon ----------------
  if (id === 17) {
    const x = walkX(t, FAM_W), moving = t > FAM_W.t0 && t < FAM_W.t1, ph = moving ? q(((t - FAM_W.t0) * 1.7) % 1, 30) : 0;
    const R = OREGON;
    front(cam, out, DA, [R[0] + x - 0.62, 0, FAM_W.z - 0.25], { mode: moving ? "stroll" : "stand", phase: ph, expr: "smile", blink: lidAt(t, 6), facing: 1 });
    front(cam, out, JT, [R[0] + x, 0, FAM_W.z], { mode: moving ? "stroll" : "stand", phase: (ph + 0.5) % 1, expr: after(W.oregon) ? "smile_closed" : "hopeful", blink: jb, facing: 1, look: 0.5 });
    front(cam, out, MO, [R[0] + x + 0.62, 0, FAM_W.z - 0.25], { mode: moving ? "stroll" : "stand", phase: (ph + 0.25) % 1, expr: "tender", blink: lidAt(t, 7), facing: 1 });
  }
  // ---------------- the diner ----------------
  if (id === 18) {
    const D = DINER, k = scrub(t, 12);
    front(cam, out, JT, add(D, [SINK[0], 0, -1.75]), { mode: "stand", expr: after(W.dennys) ? "smile" : "neutral", blink: jb, hold: { kind: "plate", k } }, 1, false);
    bubbles(out, t, D[0] + SINK[0] - 0.25, 1.02, D[2] - 1.2, 0.42, 5);
    bubbles(out, t, D[0] + SINK[0] + 0.3, 1.05, D[2] - 1.25, 0.32, 6);
  }
  if (id >= 22 && id <= 24) {
    const D = DINER, bx = D[0] + BOOTH[0], bz = D[2] + BOOTH[2];
    const ch = id === 24 ? q(smooth((t - (W.nvidia2 - LEAD)) / 0.18), 10) : 0;
    const e1: Expr = id === 24 ? "laugh" : after(W.start) ? "grin" : "smile";
    sit(cam, out, P1, [bx - 0.62, SIT_Y, bz], { expr: id === 24 ? "grin" : after(W.company) ? "wonder" : "smile", blink: lidAt(t, 8), facing: 1, cheer: ch || undefined, look: 0.6 });
    sit(cam, out, J, [bx, SIT_Y, bz - 0.05], { expr: e1, blink: jb, cheer: ch || undefined });
    sit(cam, out, P2, [bx + 0.62, SIT_Y, bz], { expr: id === 24 ? "laugh" : "hopeful", blink: lidAt(t, 9), facing: -1, cheer: ch || undefined, look: -0.6 });
    if (id === 22) {
      const k = popK(t, W.start - LEAD), on = smooth((t - W.start) / 0.25);
      if (k > 0) out.fx.push({ key: `bulb${q(on, 4)}`, cw: 300, ch: 400, draw: (p) => fxBulb(p, q(on, 4)), x: bx, y: 2.05 + 0.03 * Math.sin(t * 4), z: bz, w: 0.36 * k, h: 0.48 * k });
    }
    if (id === 23) {
      const k = q(clamp01((t - 40.15) / 0.95), 24), n = add(D, NAPKIN);
      out.fx.push({ key: `napkin${k}`, cw: 500, ch: 500, draw: (p) => fxNapkin(p, k), x: n[0], y: n[1] + 0.004, z: n[2], w: 0.36, h: 0.36, flat: true, rot: 0.08 });
    }
    if (id === 24) {
      burst(out, t, W.nvidia2 - LEAD, bx, 1.6, bz - 0.25, 2.2, "#9bff7a");
      confetti(out, t, W.nvidia2 - LEAD, [bx, 1.2, bz + 0.2], 26, 1.2);
    }
  }
  // ---------------- table tennis ----------------
  if (id === 19) {
    const G = GYM, per = 0.9, ph = ((t - 31.6) / per) % 1;
    // ball: leaves his paddle at ph 0 (z -2.0), bounces near the far side, out of frame near the lens, comes back
    const zs = G[2] - 2.0, ze = G[2] + 2.2, u = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const bz = zs + (ze - zs) * u, by = 0.78 + 0.32 * Math.abs(Math.sin(u * Math.PI * 1.5)) + 0.25 * (1 - u);
    const swing = q(Math.cos(ph * Math.PI * 2), 10);
    front(cam, out, JT, add(G, [0.05, 0, -2.35]), { mode: "stand", expr: after(W.ranked) ? "grin" : "stern", blink: jb, hold: { kind: "paddle", k: swing } });
    out.fx.push({ key: "ball", cw: 100, ch: 100, draw: (p) => fxBall(p), x: G[0] + 0.28 - 0.2 * u, y: by, z: bz, w: 0.06, h: 0.06 });
    const mk = popK(t, W.ranked - LEAD);
    if (mk > 0) out.fx.push({ key: "medal", cw: 300, ch: 450, draw: (p) => fxMedal(p), x: G[0] + 0.02, y: 1.08, z: G[2] - 2.2, w: 0.2 * mk, h: 0.3 * mk, rot: 0.06 * Math.sin(t * 5) });
    burst(out, t, W.ranked - LEAD, G[0], 1.4, G[2] - 2.5, 1.4, "#ffe27a");
  }
  // ---------------- the lab ----------------
  if (id === 20) {
    const L = LAB;
    front(cam, out, JY, add(L, [-0.95, 0, -1.6]), { mode: "stand", expr: after(W.engineering) ? "smile_closed" : "smile", blink: jb, hold: { kind: "books", k: 0 } });
  }
  if (id === 21) {
    const L = LAB;
    const lookAt = after(W.meets);
    front(cam, out, JY, add(L, [-0.38, 0, -1.7]), { mode: "stand", expr: after(W.wife) ? "tender" : "smile", blink: jb, facing: lookAt ? 1 : 0, look: lookAt ? 1 : 0 }, 1, false);
    front(cam, out, LO, add(L, [0.42, 0, -1.72]), { mode: "stand", expr: after(W.wife) ? "smile_closed" : "smile", blink: lidAt(t, 5), facing: lookAt ? -1 : 0, look: lookAt ? -1 : 0 }, 0.97, false);
    const k = popK(t, W.wife - LEAD, 0.25);
    if (k > 0) out.fx.push({ key: "heart", cw: 300, ch: 300, draw: (p) => fxHeart(p), x: L[0] + 0.02, y: 2.0 + 0.04 * Math.sin(t * 5), z: L[2] - 1.6, w: 0.34 * k * (1 + 0.06 * Math.sin(t * 9)), h: 0.34 * k * (1 + 0.06 * Math.sin(t * 9)) });
    sparkle(out, t, W.partner - LEAD, L[0] - 0.35, 2.15, L[2] - 1.6, 0.2);
    sparkle(out, t, W.partner, L[0] + 0.4, 2.2, L[2] - 1.6, 0.16);
  }
  // ---------------- HQ: a million boxes ----------------
  if (id === 29 || id === 30) {
    const H = HQ;
    const ex1: Expr = after(W.million) ? "laugh" : "wonder";
    const ch = q(smooth((t - (W.million - LEAD)) / 0.25), 10);
    if (id === 29) {
      front(cam, out, P1, add(H, [-0.95, 0, -1.25]), { mode: "stand", expr: ex1, blink: lidAt(t, 8), cheer: ch || undefined, look: -0.5 });
      front(cam, out, J, add(H, [0, 0, -0.95]), { mode: "stand", expr: ex1, blink: jb, cheer: ch || undefined });
      front(cam, out, P2, add(H, [0.95, 0, -1.25]), { mode: "stand", expr: ex1, blink: lidAt(t, 9), cheer: ch || undefined, look: 0.5 });
    } else {
      const c2 = q(smooth((t - (W.survives - LEAD)) / 0.2), 10);
      front(cam, out, P1, add(H, [-0.95, 0, -1.6]), { mode: "stand", expr: "laugh", blink: lidAt(t, 8), cheer: 1 });
      front(cam, out, J, add(H, [0, 0, -1.3]), { mode: "stand", expr: after(W.survives) ? "relief_open" : "relief", blink: jb, cheer: c2 || undefined });
      front(cam, out, P2, add(H, [0.95, 0, -1.6]), { mode: "stand", expr: "grin", blink: lidAt(t, 9), cheer: 1 });
      confetti(out, t, W.survives - LEAD, [H[0], 2.2, H[2] - 1.0], 30, 1.6);
      burst(out, t, W.survives - LEAD, H[0], 1.9, H[2] - 1.6, 1.8, "#ffe27a");
    }
  }
  // ---------------- the data centre ----------------
  if (id === 31) {
    const C = DC, k = popK(t, W.gpus - LEAD, 0.3);
    if (k > 0) out.fx.push({ key: `gpu${Math.floor(t * 12) % 6}`, cw: 600, ch: 300, draw: (p) => fxGPU(p, (Math.floor(t * 12) % 6) / 6), x: C[0], y: 1.55 + 0.05 * Math.sin(t * 3), z: C[2] - 5.2, w: 1.3 * k, h: 0.65 * k, rot: 0.05 * Math.sin(t * 2) });
    const b = popK(t, W.ai - LEAD, 0.3), glow = smooth((t - W.ai) / 0.4);
    if (b > 0) out.fx.push({ key: `brain${q(glow, 4)}`, cw: 600, ch: 520, draw: (p) => fxBrain(p, q(glow, 4)), x: C[0], y: 2.35, z: C[2] - 9.5, w: 2.0 * b, h: 1.73 * b });
    burst(out, t, W.ai - LEAD, C[0], 2.35, C[2] - 9.6, 3.4, "#7af0ff");
  }
  if (id === 33) {
    const C = DC, arms = q(smooth((t - (W.powering - 0.1)) / 0.35), 10);
    front(cam, out, J, add(C, [0, 0, -3.6]), { mode: "stand", expr: after(W.revolution) ? "grin" : "smile", blink: jb, cheer: arms || undefined });
    burst(out, t, W.revolution - LEAD, C[0], 1.6, C[2] - 4.4, 3.0, "#7af0ff");
    for (let i = 0; i < 6; i++) sparkle(out, t, W.ai2 + 0.25 * i, C[0] + (hh(i, 7) - 0.5) * 2.2, 1.3 + 1.2 * hh(i, 8), C[2] - 4.6, 0.22 + 0.1 * hh(i, 9), "#c8fbff");
    out.fx.push({ key: "brain1", cw: 600, ch: 520, draw: (p) => fxBrain(p, 1), x: C[0], y: 2.75, z: C[2] - 9.5, w: 2.6, h: 2.25 });
  }
  return out;
};

/** a moth flutters out of the empty cash box (dir +1 up-right, -1 across to the left) */
function moth(out: Stage, t: number, t0: number, from: V3, dir: number) {
  const u = t - t0;
  if (u < 0 || u > 1.6) return;
  const x = from[0] + dir * 0.35 * u + 0.05 * Math.sin(u * 11), y = from[1] + 0.32 * u + 0.04 * Math.sin(u * 17), z = from[2] + 0.12 * u;
  const flap = q(0.5 + 0.5 * Math.sin(u * 50), 4);
  out.fx.push({ key: `moth${flap}`, cw: 300, ch: 200, draw: (p) => fxMoth(p, flap), x, y, z, w: 0.13, h: 0.087, rot: 0.2 * Math.sin(u * 7) });
}
/** rewind / fast-forward badge 1 m in front of the lens, popping in and spinning out */
function rewindIcon(out: Stage, id: number, t: number, dir: number, t0: number) {
  const f = Math.round(t * FPS), c = camAt(id, f);
  const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(d[0], d[1], d[2]) || 1;
  const u = t - t0, k = popK(t, t0, 0.18) * (u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.25) : 1);
  if (k <= 0.01) return;
  const dist = n * 0.9; // at the focus depth, so the lens blur leaves it sharp
  out.fx.push({ key: `rw${dir}`, cw: 500, ch: 500, draw: (p) => fxRewind(p, dir), x: c.pos[0] + (d[0] / n) * dist, y: c.pos[1] + (d[1] / n) * dist, z: c.pos[2] + (d[2] / n) * dist, w: 0.4 * dist * k, h: 0.4 * dist * k, soft: true });
}
export { FPS };
