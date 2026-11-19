// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing. Characters are yaw-only billboards shaded by cardShade() (scene tint,
// bright floor, side gradient toward the sun, painted crescent in the drawing); standing ones get a soft multiply
// contact blob. Effects are unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never
// outlines their quads. Staging per shot of "nvidia-jensen-huang" at the bottom.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts,
  fxQ, fxBurst, fxPuff, fxMoth, fxBubbles, fxSparkle, fxConfetti, fxCard, fxWallet, fxTag, fxBanknote, fxArrow, fxCoin,
  FOUNDER_A, FOUNDER_B, FOUNDER_C,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, easeOut, W, add, APT, CITY, SEATS, STANDS, CARDS, WALLET, HERO, BOX, TABLE, COUNT0, COUNT1, camAt,
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
const SWAPS: Record<number, number[]> = { 2: [W.broke], 4: [W.sell], 8: [W.survives] };
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
const FA: Who = { i: 1, o: FOUNDER_A, okey: "fa" };
const FB: Who = { i: 2, o: FOUNDER_B, okey: "fb" };
const FC: Who = { i: 3, o: FOUNDER_C, okey: "fc" };
const CREW = [FA, FB, FC];

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
  const A = APT;
  const bl = (k: number) => blinkOf(t, k + 1, id);
  // ---------------- on the couch (1-3) ----------------
  if (id <= 3) {
    const ex: Expr[] = id === 1 ? ["worried", "nervous", "worried"]
      : id === 2 ? (after(W.broke) ? ["shock", "pained", "shock"] : ["nervous", "worried", "nervous"])
      : (after(W.cards) ? ["pained", "shock", "pained"] : ["worried", "nervous", "worried"]);
    const looks = id === 2 ? [0.7, 0, -0.7] : id === 3 ? [0.3, 0, -0.3] : [0.2, 0, -0.2];
    CREW.forEach((who, k) => sit(cam, out, who, add(A, SEATS[k]), { expr: ex[k], blink: bl(k), look: looks[k], headTilt: id === 2 && after(W.broke) ? (k - 1) * 5 : 0 }));
    if (id === 2) {
      const w = add(A, WALLET), k = popK(t, 1.32, 0.25);
      if (k > 0) out.fx.push({ key: "wallet", cw: 400, ch: 300, draw: (p) => fxWallet(p), x: w[0], y: w[1], z: w[2], w: 0.3 * k, h: 0.225 * k, rot: 0.05 * Math.sin(t * 3) });
      moth(out, t, W.broke - 0.08, [w[0], w[1] + 0.05, w[2] + 0.02], 1);
      puff(out, t, W.broke - LEAD, w[0], w[1] + 0.08, w[2] + 0.02, 0.35);
    }
    if (id === 3) {
      const cols = ["#3f6fd8", "#d8a83a", "#8a96aa"], hits = [W.maxing, W.out, W.cards], rots = [0.22, -0.12, 0.3];
      CARDS.forEach((c, k) => {
        const m = q(smooth((t - (hits[k] - LEAD)) / 0.12), 8), p0 = add(A, c);
        out.fx.push({ key: `card${k}_${m}`, cw: 500, ch: 320, draw: (p) => fxCard(p, cols[k], m), x: p0[0], y: p0[1] + 0.004 + 0.002 * k, z: p0[2], w: 0.21, h: 0.134, flat: true, rot: rots[k] });
        burst(out, t, hits[k] - LEAD, p0[0], p0[1] + 0.08, p0[2], 0.32, "#ff6a5a");
      });
    }
  }
  // ---------------- standing behind the table (4-8) ----------------
  if (id >= 4 && id <= 8) {
    const ex: Expr[] = id === 4 ? (after(W.cereal) ? ["grin", "smile_closed", "grin"] : ["hopeful", "smile", "hopeful"])
      : id === 5 ? ["wonder", "grin", "wonder"]
      : id === 6 ? ["grin", "smile", "sly"]
      : id === 7 ? (t > COUNT1 - 0.1 ? ["laugh", "relief_open", "laugh"] : ["wonder", "wonder", "wonder"])
      : (after(W.survives) ? ["laugh", "relief_open", "grin"] : ["grin", "relief", "grin"]);
    CREW.forEach((who, k) => {
      const p = add(A, STANDS[k]);
      const cheerK = id === 7 ? q(smooth((t - (COUNT1 - 0.15)) / 0.22), 10) : id === 8 ? q(0.75 + 0.25 * smooth((t - (W.survives - LEAD)) / 0.2) - 0.08 * Math.abs(Math.sin(t * 9 + k)), 10)
        : id === 4 && k !== 1 ? q(smooth((t - (W.sell - LEAD)) / 0.25) * 0.55, 10) : 0;
      const hold = k === 1 && (id === 4 || id === 6) ? { kind: "cereal" as const, k: id === 4 ? q(0.4 * smooth((t - (W.cereal - LEAD)) / 0.25), 10) : 0.15 } : undefined;
      front(cam, out, who, p, { mode: "stand", expr: ex[k], blink: bl(k), hold, cheer: hold ? undefined : cheerK || undefined, look: k === 1 ? 0 : (k === 0 ? 0.5 : -0.5) }, 1, true);
    });
    const h = add(A, HERO);
    if (id === 4) {
      sparkle(out, t, W.cereal - LEAD, A[0] - 0.12, 1.42, A[2] - 1.95, 0.22);
      puff(out, t, W.sell - 0.15, A[0] - 0.3, TABLE[1] + 0.12, A[2] - 1.5, 0.6);
    }
    if (id === 5) {
      sparkle(out, t, W.os - LEAD, h[0] + 0.15, h[1] + 0.3, h[2] + 0.05, 0.12);
      sparkle(out, t, W.os, h[0] - 0.15, h[1] + 0.2, h[2] + 0.05, 0.09);
      sparkle(out, t, W.obama - 0.05, h[0] + 0.16, h[1] + 0.08, h[2] + 0.05, 0.07);
    }
    if ((id === 6 || id === 7) && t < W.they2 + 0.25) {
      const k = popK(t, W.forty - LEAD, 0.14);
      if (k > 0) out.fx.push({ key: "tag40", cw: 420, ch: 260, draw: (p) => fxTag(p, "$40"), x: h[0] + 0.04, y: h[1] + BOX.h * 0.72, z: h[2] + BOX.d / 2 + 0.03, w: 0.19 * k, h: 0.118 * k, rot: -0.28 + 0.4 * (1 - Math.min(1, k)) });
      if (id === 6) { burst(out, t, W.forty - LEAD, h[0] + 0.04, h[1] + BOX.h * 0.72, h[2] + 0.06, 0.36, "#ffe27a"); sparkle(out, t, W.box - LEAD, h[0] - 0.13, h[1] + 0.3, h[2] + 0.06, 0.1); }
    }
    if (id === 7 || id === 8) {
      // banknotes raining from the ceiling as the counter runs
      for (let i = 0; i < 26; i++) {
        const t0 = COUNT0 - 0.35 + 0.05 * i, u = t - t0;
        if (u < 0) continue;
        const x = A[0] - 1.25 + 1.9 * hh(i, 2), z = A[2] - 2.25 + 1.3 * hh(i, 3), y = 2.5 - 1.25 * u;
        const floor = hh(i, 4) < 0.5 ? TABLE[1] + 0.02 : 0.02;
        if (y < floor + 0.04) { if (i % 3 === 0) out.fx.push({ key: `note${i % 3}`, cw: 300, ch: 150, draw: (p) => fxBanknote(p, i % 3), x, y: floor + 0.004 * (i % 5), z, w: 0.17, h: 0.085, flat: true, rot: i }); continue; }
        out.fx.push({ key: `note${i % 3}`, cw: 300, ch: 150, draw: (p) => fxBanknote(p, i % 3), x: x + 0.12 * Math.sin(u * 4 + i), y, z, w: 0.17, h: 0.085, rot: 0.6 * Math.sin(u * 5 + i) });
      }
    }
    if (id === 7) burst(out, t, COUNT1 - 0.15, A[0] - 0.3, 1.9, A[2] - 2.1, 1.4, "#9bff7a");
    if (id === 8) {
      confetti(out, t, W.survives - LEAD, [A[0] - 0.3, 1.5, A[2] - 1.7], 30, 1.2);
      burst(out, t, W.survives - LEAD, A[0] - 0.3, 1.6, A[2] - 2.2, 1.6, "#ffe27a");
    }
  }
  // ---------------- the city (9) ----------------
  if (id === 9) {
    const C = CITY;
    const ex: Expr[] = after(W.billions) ? ["laugh", "relief_open", "laugh"] : after(W.today) ? ["smile", "smile_closed", "smile"] : ["smile", "smile", "smile"];
    const pos: V3[] = [[-0.85, 0, -1.4], [0, 0, -1.15], [0.85, 0, -1.4]];
    CREW.forEach((who, k) => {
      const ch = q(smooth((t - (W.billions - LEAD - 0.05 * k)) / 0.22), 10);
      front(cam, out, who, add(C, pos[k]), { mode: "stand", expr: ex[k], blink: bl(k), cheer: ch || undefined, look: k === 1 ? 0 : (k === 0 ? 0.5 : -0.5) });
    });
    const ak = q(easeOut((t - (W.worth - 0.45)) / 0.85), 30);
    if (ak > 0) out.fx.push({ key: `arrow${ak}`, cw: 800, ch: 800, draw: (p) => fxArrow(p, ak), x: C[0] + 0.1, y: 3.5, z: C[2] - 4.3, w: 5.6, h: 5.6 });
    burst(out, t, W.billions - LEAD, C[0] + 2.2, 5.9, C[2] - 4.3, 3.2, "#ffe27a");
    confetti(out, t, W.billions - LEAD, [C[0], 2.4, C[2] - 1.0], 34, 1.8);
    for (let i = 0; i < 7; i++) {
      const t0 = W.billions + 0.1 + 0.12 * i, u = t - t0;
      if (u < 0 || u > 2.5) continue;
      const k = popK(t, t0, 0.2);
      out.fx.push({ key: "coin", cw: 200, ch: 200, draw: (p) => fxCoin(p), x: C[0] - 2.6 + 5.2 * hh(i, 11), y: 1.2 + 4.0 * hh(i, 12) + 0.3 * u, z: C[2] - 3.2, w: 0.42 * k, h: 0.42 * k, rot: 0.3 * Math.sin(u * 4 + i) });
    }
    for (let i = 0; i < 5; i++) sparkle(out, t, W.billions + 0.2 * i, C[0] - 2.4 + 4.8 * hh(i, 7), 2.0 + 4.0 * hh(i, 8), C[2] - 4.0, 0.5 + 0.3 * hh(i, 9));
  }
  return out;
};

/** a moth flutters out of the empty wallet (dir +1 up-right, -1 up-left) */
function moth(out: Stage, t: number, t0: number, from: V3, dir: number) {
  const u = t - t0;
  if (u < 0 || u > 1.6) return;
  const x = from[0] + dir * 0.3 * u + 0.05 * Math.sin(u * 11), y = from[1] + 0.32 * u + 0.04 * Math.sin(u * 17), z = from[2] + 0.12 * u;
  const flap = q(0.5 + 0.5 * Math.sin(u * 50), 4);
  out.fx.push({ key: `moth${flap}`, cw: 300, ch: 200, draw: (p) => fxMoth(p, flap), x, y, z, w: 0.13, h: 0.087, rot: 0.2 * Math.sin(u * 7) });
}
void bodySide; void fxQ; void fxBubbles; void camAt; void clamp01; void qmark; void bubbles; void scrub;
export { FPS };
