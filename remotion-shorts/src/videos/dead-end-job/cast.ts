// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, JUSTIN, SISTER, FRIEND, DETECTIVE, RECRUITER, CLOWN,
  monsterTall, monsterBlob, fxBill, fxCash, fxRules, fxClock, fxQ, fxEyes, fxGiant, fxGlow, fxBurst, fxPuff, fxCrate, townsfolk,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, easeOut, W, SWY, ROOM, OFFICE, CLINIC, AG_DOOR, HOUSE_DOOR, J2, CLOWN_W, JFOL_W, MILK_W, LAST_W, walkX, giantRise,
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
const SWAPS: Record<number, number[]> = { 1: [W.crushed], 3: [W.fifty], 7: [W.midnight], 8: [W.never], 9: [W.two] };
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
const CONTACT: Record<string, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], dusk: [0.24, 0.2, 0.33], night: [0.2, 0.21, 0.33], lamp: [0.22, 0.2, 0.33], neon: [0.2, 0.16, 0.3], store: [0.26, 0.3, 0.34], red: [0.22, 0.12, 0.2] };
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
const J: Who = { i: 1, o: JUSTIN, okey: "justin" };
const SIS: Who = { i: 2, o: SISTER, okey: "sister" };
const FR: Who = { i: 3, o: { ...FRIEND, jacket: "#a8d8e8", pants: "#a8d8e8" }, okey: "friend" };
const DET: Who = { i: 4, o: DETECTIVE, okey: "detective" };
const REC: Who = { i: 5, o: RECRUITER, okey: "recruiter" };
const CLO: Who = { i: 6, o: CLOWN, okey: "clown" };
const REC_S = 1.12; // the recruiter is tall

const stand = (cam: CamInfo, who: Who, at: V3, fo: FrontOpts, so: SideOpts, dirX: number, dirZ: number, front: boolean, scale = 1, shadow = true, mirror?: boolean) => (out: Stage) => {
  const view = front ? { side: false, mirror: !!mirror } : viewOf(cam, at[0], at[2], dirX, dirZ);
  const pl = person(cam, who, at[0], at[1], at[2], { side: !front, mirror: view.mirror }, fo, so, scale);
  if (front && mirror) pl.mirror = true;
  out.places.push(pl);
  if (shadow) blob(out, at[0], at[1], at[2], scale);
};
/** a custom-drawn creature card (600 x 1000 design, soles at 975) */
const creature = (cam: CamInfo, out: Stage, key: string, draw: (p: Pen, light: number) => void, at: V3, scale = 1, shadow = true) => {
  const d = cam.pos.distanceTo(tmp.set(at[0], at[1] + 1.2, at[2])) / scale;
  const [w, h, k] = tier(d), light = light2D(cam, false);
  out.places.push({ key: `C|${key}|${q(light)}`, x: at[0], y: at[1], z: at[2], scale, draw: (p) => draw(p, light), size: [w, h, k] });
  if (shadow) blob(out, at[0], at[1], at[2], scale * 1.3);
};
/** walk parameters: position + phase for a walk segment (stride as a multiple of 0.8 m) */
const walk = (t: number, w: { x0: number; x1: number; t0: number; t1: number }, stride = 0.6) => {
  const v = Math.abs(w.x1 - w.x0) / (w.t1 - w.t0), moving = t > w.t0 && t < w.t1;
  return { x: walkX(t, w), moving, phase: moving ? q(((t - w.t0) * v / (1.6 * stride)) % 1, 30) : 0 };
};
const along = (t: number, a: V3, b: V3, t0: number, t1: number): V3 => {
  const u = clamp01((t - t0) / (t1 - t0));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
};
const bill = (out: Stage, i: number, x: number, y: number, z: number, s = 1, rot = 0, flat = false) =>
  out.fx.push({ key: `bill${i % 6}`, cw: 300, ch: 200, draw: (p) => fxBill(p, i % 6), x, y, z, w: 0.28 * s, h: 0.19 * s, rot, flat });
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
const R0 = ROOM, O0 = OFFICE, C0 = CLINIC;
const at = (o: V3, d: V3): V3 => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const jb = lidAt(t, 1, SWAPS[id]), ob = lidAt(t, 5, SWAPS[id]), cb = lidAt(t, 6), mb = lidAt(t, 7);
  const afterW = (w: number) => t > w - LEAD;
  if (id === 1) {
    // Justin at his table under a growing pile of bills; an avalanche on "crushed"
    const expr: Expr = afterW(W.crushed) ? (afterW(W.debt + 0.6) ? "worried" : "pained") : "worried";
    stand(cam, J, at(R0, [0, 0.36, -1.25]), { mode: "sit", expr, blink: jb, headTilt: afterW(W.crushed) ? 7 : 0, tilt: afterW(W.crushed) ? 4 : 0 }, {}, 0, 1, true, 1, false)(out);
    const pile = Math.min(34, 5 + Math.floor(t * 3) + (afterW(W.crushed) ? 18 : 0));
    for (let i = 0; i < pile; i++) {
      const a = hh(i, 3) * 6.28, r = 0.08 + 0.42 * hh(i, 4);
      bill(out, i, R0[0] + Math.cos(a) * r * 1.4, 0.775 + 0.004 * i, R0[2] - 0.58 + Math.sin(a) * r * 0.55, 1.1, hh(i, 5) * 6, true);
    }
    // falling bills: a slow drizzle, then a storm after "crushed"
    const n = 26;
    for (let i = 0; i < n; i++) {
      const storm = i >= 10, t0 = storm ? W.crushed - LEAD - 0.1 + (i - 10) * 0.05 : i * 0.2, dur = storm ? 0.55 : 0.9;
      const u = (t - t0) / dur;
      if (u < 0 || u >= 1) continue;
      const x = R0[0] + (i % 2 ? 1 : -1) * (0.38 + 0.45 * hh(i, 7)), z = R0[2] - 0.5 + (hh(i, 8) - 0.5) * 0.6;
      bill(out, i, x + 0.08 * Math.sin(u * 9 + i), 2.7 - 1.9 * u * u, z, 1.1, Math.sin(u * 7 + i) * 0.9);
    }
  }
  if (id === 2) {
    const wk = walk(t, J2);
    const front = false, stop = t > J2.t1;
    const expr: Expr = afterW(W.offer) ? "hopeful" : afterW(W.strange) ? "wonder" : "neutral";
    if (!stop) stand(cam, J, [wk.x, SWY, J2.z], {}, { mode: wk.moving ? "march" : "stand", phase: wk.phase, stomp: 0.4, stride: 0.6, expr, blink: jb }, 1, 0, front)(out);
    else stand(cam, J, [J2.x1, SWY, J2.z], { expr, blink: jb, mode: "stand", facing: 1, look: 1 }, {}, 0, -1, true)(out);
    if (t > W.offer + 0.25) stand(cam, REC, [AG_DOOR[0], SWY, AG_DOOR[2] + 0.18], { mode: "stand", expr: "creep", blink: ob, wave: q(0.5 + 0.5 * Math.sin((t - W.offer) * 7), 10) }, {}, 0, 1, true, REC_S, false)(out);
  }
  if (id === 3) {
    const expr: Expr = afterW(W.wage + 0.3) ? "grin" : afterW(W.fifty) ? "shock" : "neutral";
    stand(cam, J, at(O0, [-1.1, 0, 0.3]), {}, { mode: "stand", expr, blink: jb }, 1, 0, false)(out);
    stand(cam, REC, at(O0, [0.4, 0, -1.25]), { mode: "stand", expr: "creep", blink: ob, invite: afterW(W.part) ? q(smooth((t - W.part) / 0.5), 20) : undefined, facing: -1 }, {}, 0, 1, true, REC_S, false, true)(out);
    if (afterW(W.fifty)) {
      const u = easeOut((t - (W.fifty - LEAD)) / 0.25), pop = 1 + 0.25 * Math.exp(-(t - W.fifty) * 8);
      out.fx.push({ key: "cash", cw: 400, ch: 300, draw: (p) => fxCash(p), x: O0[0] - 0.05, y: 0.86 + 0.16 * u * pop, z: O0[2] - 0.35, w: 0.44 * u * pop, h: 0.33 * u * pop });
      burst(out, t, W.fifty - LEAD, O0[0] - 0.05, 1.05, O0[2] - 0.4, 0.9, "#9bff7a");
      for (let i = 0; i < 8; i++) {
        const u2 = (t - (W.fifty - LEAD) - i * 0.06) / 1.2;
        if (u2 < 0 || u2 >= 1) continue;
        bill(out, i, O0[0] - 0.05 + (hh(i, 2) - 0.5) * 1.6 * u2, 1.0 + 1.1 * Math.sin(u2 * 2.6), O0[2] - 0.3 + (hh(i, 3) - 0.5) * 0.4, 0.9, u2 * 6 + i);
      }
    }
  }
  if (id === 4) {
    stand(cam, REC, at(O0, [0.4, 0, -1.25]), { mode: "stand", expr: afterW(W.catch) ? "creep" : "sly", blink: ob, headTilt: afterW(W.catch) ? -5 : 0, facing: -1 }, {}, 0, 1, true, REC_S, false, true)(out);
  }
  if (id === 5) {
    const k = smooth((t - (W.breaking - LEAD)) / 0.12);
    const bob = 0.01 * Math.sin(t * 2.2), stamp = 1 + 0.12 * Math.exp(-Math.max(0, t - W.breaking) * 10) * (k > 0 ? 1 : 0);
    stand(cam, REC, at(O0, [0.4, 0, -1.25]), { mode: "stand", expr: "creep", blink: ob, facing: -1 }, {}, 0, 1, true, REC_S, false, true)(out);
    out.fx.push({ key: `rules${q(k, 6)}`, cw: 700, ch: 1000, draw: (p) => fxRules(p, q(k, 6)), x: O0[0], y: 1.12 + bob, z: O0[2] - 0.25, w: 0.5 * stamp, h: 0.714 * stamp, rot: 0.03 });
    burst(out, t, W.life - LEAD, O0[0] + 0.12, 0.92, O0[2] - 0.3, 0.5, "#ff3a3a");
  }
  if (id === 6) {
    const p = along(t, [-12.6, SWY, -5.3], [-8.1, SWY, -8.3], 23.0, 25.6), p2 = along(t, [-8.1, SWY, -8.3], [-7.4, 0, -10.6], 25.6, 26.4);
    const pos = t < 25.6 ? p : p2, moving = t < 26.4;
    stand(cam, J, pos, {}, { mode: moving ? "march" : "stand", phase: q(((t - 23) * 1.3) % 1, 30), stomp: 0.4, stride: 0.6, expr: "neutral", blink: jb }, t < 25.6 ? 1.5 : 0.3, t < 25.6 ? -1 : -1, false)(out);
  }
  if (id === 7) {
    const expr: Expr = afterW(W.midnight) ? "shock" : afterW(W.monsters) ? "nervous" : "neutral";
    stand(cam, J, [-3.0, 0, -17.1], { mode: "stand", expr, blink: jb, look: afterW(W.monsters) ? -1 : 0, facing: afterW(W.monsters) ? -1 : 0 }, {}, 0, 1, true)(out);
    const sec = Math.min(60, 54 + (t - 26) * (6 / (W.midnight - LEAD - 26)));
    out.fx.push({ key: `clock${Math.floor(sec)}`, cw: 300, ch: 300, draw: (p) => fxClock(p, Math.floor(sec)), x: -3.0, y: 2.75, z: -19.6, w: 0.55, h: 0.55 });
    const t1 = W.monsters - 0.45;
    if (t > t1) {
      const pa = along(t, [-5.0, 0, -11.6], [-3.75, 0, -14.8], t1, t1 + 1.9), mv = t < t1 + 1.9;
      const ph = mv ? q(((t - t1) * 1.1) % 1, 20) : 0;
      creature(cam, out, `tall${ph}|${mb >= 1 ? 1 : 0}`, (p, l) => monsterTall(p, ph, mb, l), pa, 1.25);
    }
    const t2 = W.monsters + 0.5;
    if (t > t2) {
      const pb = along(t, [-0.9, 0, -11.4], [-2.55, 0, -15.0], t2, t2 + 1.6), mv = t < t2 + 1.6;
      const ph = mv ? q(((t - t2) * 1.4) % 1, 20) : 0;
      creature(cam, out, `blob${ph}|${mb >= 1 ? 1 : 0}`, (p, l) => monsterBlob(p, ph, mb, l), pb, 0.85);
    }
  }
  if (id === 8) {
    const c = walk(t, CLOWN_W, 0.55), j = walk(t, JFOL_W, 0.55);
    const turned = afterW(W.never);
    if (!turned) stand(cam, CLO, [c.x, SWY, CLOWN_W.z], {}, { mode: c.moving ? "march" : "stand", phase: c.phase, stomp: 0.7, stride: 0.55, expr: "smile", blink: cb }, 1, 0, false, 1.05)(out);
    else stand(cam, CLO, [CLOWN_W.x1, SWY, CLOWN_W.z], { mode: "stand", expr: "creep", blink: cb, headTilt: q(10 * smooth((t - W.never) / 0.4), 10), facing: -1, wave: afterW(W.sight) ? q(0.5 + 0.5 * Math.sin((t - W.sight) * 8), 10) : undefined }, {}, 0, 1, true, 1.05)(out);
    const jexpr: Expr = turned ? "shock" : "nervous";
    stand(cam, J, [j.x, SWY, JFOL_W.z], {}, { mode: j.moving ? "march" : "stand", phase: j.phase, stomp: 0.3, stride: 0.55, expr: jexpr, blink: jb }, 1, 0, false)(out);
  }
  if (id === 9) {
    const m = walk(t, MILK_W, 0.55);
    const expr: Expr = afterW(W.two + 0.7) ? "grin" : afterW(W.two) ? "shock" : "neutral";
    stand(cam, J, [m.x, SWY, MILK_W.z], { mode: m.moving ? "stroll" : "stand", phase: m.phase, expr, blink: jb, prop: "crate" }, {}, -1, 0, true)(out);
    if (afterW(W.two)) {
      const u = easeOut((t - (W.two - LEAD)) / 0.3), pop = 1 + 0.3 * Math.exp(-(t - W.two) * 7);
      for (let i = 0; i < 2; i++) out.fx.push({ key: "cash", cw: 400, ch: 300, draw: (p) => fxCash(p), x: m.x - 0.05, y: 2.1 + 0.26 * i + 0.1 * u, z: MILK_W.z + 0.05 * i, w: 0.5 * u * pop, h: 0.375 * u * pop, rot: 0.1 - 0.2 * i });
      burst(out, t, W.two - LEAD, m.x, 2.3, MILK_W.z - 0.1, 1.6, "#9bff7a");
      for (let i = 0; i < 12; i++) {
        const u2 = (t - (W.two - LEAD) - i * 0.07) / 1.6;
        if (u2 < 0 || u2 >= 1) continue;
        bill(out, i, m.x + (hh(i, 2) - 0.5) * 2.2 * u2, 2.4 + 0.8 * Math.sin(u2 * 2) - 1.6 * u2 * u2, MILK_W.z + (hh(i, 3) - 0.5) * 0.8, 1.2, u2 * 7 + i);
      }
    }
  }
  if (id === 10) {
    stand(cam, J, [15.6, SWY, -6.3], {}, { mode: "stand", expr: afterW(W.reasons) ? "nervous" : "neutral", blink: jb }, -0.5, -1, false)(out);
    out.fx.push({ key: "crate", cw: 300, ch: 260, draw: (p) => fxCrate(p), x: 16.35, y: SWY + 0.17, z: -6.15, w: 0.42, h: 0.36 });
    const open = smooth((t - (W.reasons - LEAD)) / 0.25) * (1 - smooth((t - 42.9) / 0.15) * 0.0);
    const blinkE = Math.abs(t - 42.3) < 0.06 ? 0.1 : 1;
    if (open > 0.02) out.fx.push({ key: `eyes${q(open * blinkE, 8)}`, cw: 400, ch: 200, draw: (p) => fxEyes(p, q(open * blinkE, 8)), x: HOUSE_DOOR[0] + 0.3, y: HOUSE_DOOR[1] + 1.6, z: HOUSE_DOOR[2] + 0.06, w: 0.34, h: 0.17 });
  }
  if (id === 11) {
    const u = smooth((t - 43.5) / 3.9);
    stand(cam, J, [0, 0, -2.6], { mode: "stand", expr: "worried", blink: jb, look: Math.sin(t * 1.5) }, {}, 0, 1, true)(out);
    const ring: [number, V3, V3][] = [[0, [-5.2, 0, -5.0], [-2.6, 0, -3.6]], [1, [4.8, 0, -3.6], [2.4, 0, -2.6]], [2, [2.6, 0, -7.4], [1.4, 0, -4.9]], [3, [-2.4, 0, -7.6], [-1.3, 0, -5.2]]];
    for (const [k, a, b] of ring) {
      const p: V3 = [a[0] + (b[0] - a[0]) * u, 0, a[2] + (b[2] - a[2]) * u];
      const ph = q((t * 0.9 + k * 0.3) % 1, 16);
      if (k === 0) creature(cam, out, `tall${ph}|0`, (pp, l) => monsterTall(pp, ph, 0, l), p, 1.25);
      if (k === 1) creature(cam, out, `blob${ph}|0`, (pp, l) => monsterBlob(pp, ph, 0, l), p, 0.85);
      if (k === 2) stand(cam, CLO, p, { mode: "stand", expr: "creep", blink: cb, headTilt: 8, facing: -1 }, {}, 0, 1, true, 1.05)(out);
      if (k === 3) stand(cam, REC, p, { mode: "stand", expr: "creep", blink: ob, facing: 1 }, {}, 0, 1, true, REC_S)(out);
    }
  }
  if (id === 12) {
    stand(cam, REC, [AG_DOOR[0] + 0.15, SWY, AG_DOOR[2] + 0.2], { mode: "stand", expr: "creep", blink: ob, invite: q(smooth((t - 47.5) / 0.5), 20), facing: 1 }, {}, 0, 1, true, REC_S, false)(out);
    const sp = along(t, [-23.9, SWY, -5.7], [-25.5, SWY, -7.75], 47.45, W.pulled + 0.35);
    if (t < W.pulled + 0.35) stand(cam, SIS, sp, {}, { mode: "march", phase: q(((t - 47.45) * 1.5) % 1, 30), stomp: 0.4, stride: 0.5, expr: "hopeful", blink: lidAt(t, 2) }, -0.6, -1, false, 0.95)(out);
    else puff(out, t, W.pulled + 0.35, -25.6, 1.0, -7.6, 1.3);
    stand(cam, J, [-27.9, SWY, -5.6], { mode: "stand", expr: afterW(W.pulled) ? "shock" : "worried", blink: jb, facing: 1, look: 1 }, {}, 0, 1, true)(out);
  }
  if (id === 13) {
    if (t < W.missing - LEAD) stand(cam, FR, at(C0, [0.25, 0, -0.95]), { mode: "stand", expr: "nervous", blink: lidAt(t, 3), look: 0.5 }, {}, 0, 1, true)(out);
    puff(out, t, W.missing - LEAD, C0[0] + 0.25, 1.0, C0[2] - 0.9, 1.6);
  }
  if (id === 14) {
    stand(cam, DET, [-21.8, SWY, -5.8], { mode: "stand", expr: afterW(W.questions) ? "stern" : "sly", blink: lidAt(t, 4), prop: "pad", look: afterW(W.agency2) ? -1 : 0, facing: afterW(W.agency2) ? -1 : 0 }, {}, 0, 1, true)(out);
    qmark(out, t, W.questions - LEAD, -21.45, 2.35, -5.7, 1.0);
    qmark(out, t, W.questions + 0.25, -22.15, 2.6, -5.8, 0.8, "#ff6ae6");
    qmark(out, t, W.agency2 - LEAD, -21.1, 2.75, -5.7, 0.7, "#5af0ff");
  }
  if (id === 15) {
    const expr: Expr = afterW(W.truth) ? "shock" : afterW(W.digs) ? "wonder" : "neutral";
    stand(cam, J, at(R0, [1.5, 0, -0.15]), {}, { mode: "stand", expr, blink: jb }, 1, 0, false)(out);
  }
  if (id === 16) {
    const rise = giantRise(t), open = smooth((t - (W.traps - LEAD)) / 0.3), maw = smooth((t - (W.feed - LEAD)) / 0.5);
    const gy = -4 + 17 * rise, breath = 1 + 0.015 * Math.sin(t * 2.4);
    out.fx.push({ key: `giant${q(open, 6)}|${q(maw, 8)}`, cw: 1000, ch: 1000, draw: (p) => fxGiant(p, q(open, 6), q(maw, 8)), x: -26, y: gy, z: -20, w: 24 * breath, h: 24 * breath });
    // bills sucked up into the maw (the debt that feeds it)
    const mouth: V3 = [-26, gy - 0.1 * 24, -19.5];
    for (let i = 0; i < 30; i++) {
      const per = 2.6, u = ((t - 64.6 + i * (per / 30)) % per) / per;
      if (t < 65.2) continue;
      const a = i * 2.4 + u * 5, r = (1 - u) * (5 + 4 * hh(i, 1));
      const base: V3 = [-26 + Math.cos(a) * r, 0.5 + (mouth[1] - 0.5) * u * u, -6 + (mouth[2] + 6) * u + Math.sin(a) * r * 0.4];
      bill(out, i, base[0], base[1], base[2], 1.6 + 2 * u, u * 9 + i);
    }
    // little people on the street looking up
    for (const [k, x, z] of [[0, -31, -5.2], [1, -21.5, -5.6], [2, -19.4, -4.9]] as const)
      stand(cam, { i: 10 + k, o: townsfolk(k), okey: "tf" + k }, [x, SWY, z], { mode: "stand", expr: "shock", blink: lidAt(t, 10 + k), facing: 0 }, {}, 0, 1, true)(out);
    stand(cam, J, [-24.4, SWY, -4.7], { mode: "stand", expr: "shock", blink: jb, facing: -1 }, {}, 0, 1, true)(out);
  }
  if (id === 17) {
    stand(cam, J, [28.4, SWY, -6.5], {}, { mode: "stand", expr: afterW(W.tied) ? "shock" : "worried", blink: jb }, -0.2, -1, false)(out);
  }
  if (id === 18) {
    const wk = walk(t, LAST_W, 0.55);
    stand(cam, J, [wk.x, SWY, LAST_W.z], {}, { mode: wk.moving ? "march" : "stand", phase: wk.phase, stomp: 0.6, stride: 0.55, expr: afterW(W.survive) ? "stern" : "worried", blink: jb }, 1, 0, false)(out);
    stand(cam, REC, [AG_DOOR[0] + 0.1, SWY, AG_DOOR[2] + 0.2], { mode: "stand", expr: "creep", blink: ob, invite: 1, facing: -1 }, {}, 0, 1, true, REC_S, false, true)(out);
  }
  if (id === 19) {
    const expr: Expr = afterW(W.job) ? "shock" : afterW(W.quit) ? "hopeful" : "worried";
    stand(cam, J, [-26.0, SWY, -6.9], { mode: "stand", expr, blink: jb, look: afterW(W.job) ? 1 : 0 }, {}, 0, 1, true)(out);
    if (afterW(W.job - 0.25)) {
      const u = smooth((t - (W.job - 0.25)) / 0.3);
      stand(cam, REC, [-25.45 - 0.0 * u, SWY, -7.45], { mode: "stand", expr: "creep", blink: ob, facing: -1, headTilt: -8 * u, wave: q(0.3 * u, 10) }, {}, 0, 1, true, REC_S * (0.9 + 0.1 * u), false, true)(out);
    }
  }
  return out;
};
export { FPS };
