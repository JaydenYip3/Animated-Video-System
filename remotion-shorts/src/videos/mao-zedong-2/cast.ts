// The cast of "mao-zedong-2" as lit flat cards in the 3D world (bridge-template machinery: a canvas pool keyed by
// drawing, yaw-only billboards shaded by cardShade(), soft contact blobs, unlit effect cards). All on the NOINK layer.
// stage(id, t, cam) lists everything with a face in shot `id` at time t (pure function).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, INK, SKINS } from "./toon";
import { FPS, W, LEAD, GATE, CAMP, HILLS, SNOW, TRENCH, NIGHT, V3, add, smooth, clamp01, maoX, MAO_W, hillX, HILL_W, hillH, snowH, passX, PASS_V } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import type { LightName } from "./lights";

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

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind(tint?: THREE.Color) {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = this.mesh.material === this.soft ? 2 : 0;
      if (tint) { this.mat.color.copy(tint); this.soft.color.copy(tint); }
    }
  }
}

// ---------------- placements ----------------
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; yaw?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- outfits ----------------
const HAIR = "#1f1b1d";
const REVO = (v: number): Outfit => ({ jacket: ["#7d7258", "#746b55", "#857a5e", "#6f6a58"][v % 4], pants: "#4b4a44", boots: INK, hat: "army", cap: "#6a6250",
  badge: null, rifle: true, belt: "#b5a582", buttons: "#c9b98a", skin: SKINS[[0, 1, 2, 1][v % 4]], moustache: v % 4 === 3 ? "#2a201a" : undefined });
const MAO_SCHOLAR: Outfit = { jacket: "#465263", pants: "#34343a", boots: "#3a2e28", hat: "hair", hair: HAIR, buttons: "#2c2c30", skin: "#f5d6b4" };
const MAO_PRIVATE: Outfit = { ...REVO(0), skin: "#f5d6b4" };
const MAO_GREY: Outfit = { jacket: "#6f7268", pants: "#5d6058", boots: "#2f2a26", hat: "hair", hair: HAIR, buttons: "#3c3c38", skin: "#f5d6b4" };
const RED = (v: number): Outfit => ({ jacket: ["#6c7468", "#646d62", "#737a6c", "#5f675d"][v % 4], pants: "#4f554c", boots: "#3a322b", hat: "army", cap: "#646c60",
  badge: "star", rifle: v % 3 !== 2, belt: "#8a7a5a", buttons: "#3c3c38", skin: SKINS[[0, 1, 2, 1][v % 4]] });
const NAT: Outfit = { jacket: "#56677d", pants: "#46536a", boots: INK, hat: "army", cap: "#4b5a6e", badge: "sun", rifle: true, belt: "#b8a888", buttons: "#c9b98a", skin: SKINS[1] };
const PEASANT = (v: number): Outfit => ({ jacket: ["#3d4a66", "#6b5a42", "#8a6a48", "#4a4a52", "#5a6650"][v % 5], pants: ["#3a3a40", "#4a4036", "#383a44"][v % 3],
  boots: "#5a4a3a", hat: v % 4 === 3 ? "hair" : "straw", hair: HAIR, rifle: v % 2 === 0, belt: null, buttons: "#2c2c30", skin: SKINS[[1, 2, 0, 3, 1][v % 5]] });
const VOLUNTEER = (v: number): Outfit => ({ jacket: ["#7d7a64", "#74715c", "#86826a"][v % 3], pants: "#5c5a4a", boots: "#3a322b", hat: "fur", cap: "#6a6656",
  rifle: true, belt: "#6a5a40", buttons: "#3c3c38", skin: SKINS[v % 3] });
const CIVIL = (v: number): Outfit => ({ jacket: ["#3f4f6b", "#6d6458", "#4a5560", "#7a5a44", "#5b6b58", "#3a3e48"][v % 6], pants: ["#33363e", "#4a4038"][v % 2],
  boots: "#3a2e28", hat: v % 3 === 1 ? "army" : "hair", cap: "#5b6458", badge: null, hair: HAIR, buttons: "#2c2c30", skin: SKINS[[1, 0, 2, 1, 3, 0][v % 6]] });

// ---------------- life ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: LightName = "day";
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = fo.seed ?? so.seed ?? ((who.i * 5 + 3) % 7) + 1;
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return { key, x, y, z, scale, mirror, draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)), size: [w, h, k] };
};

/** contact pool (+ a soft tail away from the sun by day) under a standing card */
const CONTACT: [number, number, number] = [0.22, 0.21, 0.3];
const TAIL: [number, number, number] = [0.45, 0.45, 0.58];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day" || LNAME === "snow") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k * (LNAME === "snow" ? 0.6 : 1));
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT, k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- effects drawn here ----------------
/** soft snow / dust puff on a 300 x 300 canvas, t 0..1 */
const puff = (p: Pen, t: number, col: [number, number, number]) => {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4, d = 30 + 75 * t, r = (46 + 22 * (i % 2)) * (1 - 0.45 * t);
    p.ell(150 + d * Math.cos(a), 160 + d * 0.6 * Math.sin(a), r, r * 0.85, `rgba(${col[0]},${col[1]},${col[2]},${(0.9 * (1 - t) ** 1.3).toFixed(3)})`, 0);
  }
};
/** jagged crack (the truce breaking), drawn on a 200 x 600 canvas, k = growth 0..1 */
const crack = (p: Pen, k: number) => {
  const pts: [number, number][] = [[100, 10], [80, 90], [125, 170], [72, 260], [118, 350], [86, 430], [110, 520], [96, 590]];
  const n = Math.max(2, Math.round(pts.length * k));
  p.stroke(pts.slice(0, n), 26, INK);
  p.stroke(pts.slice(0, n), 9, "#d9c39a");
};
/** a winter fur cap lying in the snow, 400 x 300 canvas (seen from the side) */
const capInSnow = (p: Pen) => {
  p.ell(200, 210, 150, 62, "#6a6656", 9);           // crown
  p.ell(200, 236, 176, 34, "#575344", 9);           // fur band
  p.ell(92, 250, 46, 26, "#5e5a4b", 8, 0, 360, 25); // ear flap
  p.ell(200, 196, 30, 14, "#7d7966", 0);
  const g = p.g; g.fillStyle = "#e8edf3";             // snow lying on the cap
  g.beginPath(); g.ellipse(214, 162, 92, 20, -0.05, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(300, 214, 40, 12, 0.2, 0, Math.PI * 2); g.fill();
};
const flagBit = (p: Pen, col: string) => { // small hand flag for the 1949 / final crowds, 200 x 300
  p.stroke([[40, 290], [40, 20]], 10, "#5a4030");
  p.poly([[44, 22], [190, 30], [186, 120], [44, 112]], col, 8);
  const star: [number, number][] = [];
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 9 : 22, b = (k * 36 - 90) * Math.PI / 180; star.push([82 + r * Math.cos(b), 60 + r * Math.sin(b)]); }
  p.poly(star, "#f2c94c", 0);
};

// ---------------- shots ----------------
const SNOWWHITE: [number, number, number] = [240, 243, 247];
const DUST: [number, number, number] = [214, 196, 160];

/** shot 1: the 1911 column marching across the square in front of the gate */
const gate1911 = (cam: CamInfo, t: number, out: Stage) => {
  for (let i = 0; i < 11; i++) {
    const x = -12.5 + i * -1.25 + 1.35 * t + (hh(i) - 0.5) * 0.15, z = 8.6 + (i % 2) * 0.9;
    const v = (i * 3) % 4, who: Who = { i, o: REVO(v), okey: `r${v}` };
    const phase = q(((1.35 * t) / 1.5 + hh(i, 4) * 0.1) % 1, 60);
    const expr: Expr = t > W.fell - LEAD && i % 2 === 0 ? "grin" : i % 3 === 0 ? "stern" : "neutral";
    const p = person(cam, who, GATE[0] + x, 0, GATE[2] + z, { side: true, mirror: false }, {}, { mode: "march", phase, expr, stride: 0.9, blink: lidAt(t, i) });
    out.places.push(p); blob(out, GATE[0] + x, 0, GATE[2] + z);
  }
};

/** shot 2: the recruits' line; young Mao walks in and becomes a private */
const camp = (cam: CamInfo, t: number, out: Stage) => {
  const X = (x: number) => CAMP[0] + x, Z = (z: number) => CAMP[2] + z;
  for (let i = 0; i < 6; i++) {
    const x = -3.4 + i * 1.02, z = -1.0 + (hh(i, 3) - 0.5) * 0.12;
    const v = i % 4, look = t > W.mao - LEAD && t < W.private + 0.6 ? 1 : 0;
    const expr: Expr = t > W.private - LEAD && i === 5 ? "smile_closed" : i % 2 ? "neutral" : "stern";
    out.places.push(person(cam, { i: i + 10, o: REVO(v), okey: `r${v}` }, X(x), 0, Z(z), { side: false, mirror: false }, { mode: "stand", expr, look, blink: lidAt(t, i + 10) }, {}));
    blob(out, X(x), 0, Z(z));
  }
  const mx = maoX(t), walking = t > MAO_W.t0 && t < MAO_W.t1 - 0.05;
  const priv = t >= W.private - LEAD;
  const o = priv ? MAO_PRIVATE : MAO_SCHOLAR;
  if (walking) {
    const phase = q(((t - MAO_W.t0) * 1.1) % 1, 60);
    out.places.push(person(cam, { i: 1, o, okey: "maoS" }, X(mx), 0, Z(-0.95), { side: true, mirror: true }, { seed: 4 }, { mode: "march", phase, expr: "neutral", stride: 0.85, stomp: 0.6, seed: 4, blink: lidAt(t, 1) }, 1.05));
  } else {
    const expr: Expr = priv ? "stern" : "neutral";
    out.places.push(person(cam, { i: 1, o, okey: priv ? "maoP" : "maoS" }, X(mx), 0, Z(-0.95), { side: false, mirror: false }, { mode: "stand", expr, seed: 4, facing: 0, blink: lidAt(t, 1) }, {}, 1.05));
  }
  blob(out, X(mx), 0, Z(-0.95), 1.05);
  if (t >= W.private - LEAD && t < W.private + 0.3) {
    const u = (t - (W.private - LEAD)) / (0.3 + LEAD);
    out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30), "#f3e3b0"), x: X(mx), y: 2.25, z: Z(-0.9), w: 0.9, h: 0.9 });
  }
};

/** shot 4: Mao on the hill path; the peasant army rises from behind the ridge */
const hills = (cam: CamInfo, t: number, out: Stage) => {
  const X = (x: number) => HILLS[0] + x, Z = (z: number) => HILLS[2] + z;
  const mx = hillX(t), walking = t > HILL_W.t0 && t < HILL_W.t1 - 0.05, mz = -1.6, my = hillH(mx, mz);
  if (walking) {
    const phase = q(((t - HILL_W.t0) * 1.2) % 1, 60);
    out.places.push(person(cam, { i: 2, o: MAO_GREY, okey: "maoG" }, X(mx), my, Z(mz), { side: true, mirror: false }, { seed: 4 }, { mode: "march", phase, expr: "stern", stride: 0.8, stomp: 0.6, seed: 4, blink: lidAt(t, 2) }, 1.05));
  } else {
    out.places.push(person(cam, { i: 2, o: MAO_GREY, okey: "maoG" }, X(mx), my, Z(mz), { side: false, mirror: false }, { mode: "stand", expr: t > W.peasant ? "smile_closed" : "stern", seed: 4, facing: -1, blink: lidAt(t, 2) }, {}, 1.05));
  }
  blob(out, X(mx), my, Z(mz), 1.05);
  for (let i = 0; i < 13; i++) {
    const x = -5.6 + i * 0.95 + (hh(i, 1) - 0.5) * 0.4, z = -6.3 - (i % 3) * 0.9 - hh(i, 2) * 0.4;
    if (Math.abs(x - 0.2) < 0.7 && z > -7) continue;
    const t0 = W.peasant - 0.12 + 0.05 * ((i * 5) % 13);
    const rise = smooth((t - t0) / 0.32), y = hillH(x, z) - 2.1 * (1 - rise);
    if (rise <= 0) continue;
    const v = i % 5, expr: Expr = (["stern", "neutral", "smile_closed", "stern", "grin"] as Expr[])[i % 5];
    out.places.push(person(cam, { i: i + 30, o: PEASANT(v), okey: `p${v}` }, X(x), y, Z(z), { side: false, mirror: false }, { mode: "stand", expr, blink: lidAt(t, i + 30), facing: (i % 3) - 1 as -1 | 0 | 1 }, {}));
  }
};

/** shot 6: the column on the snow pass; most of it never arrives */
const snowPass = (cam: CamInfo, t: number, out: Stage) => {
  const N = 26, X = (x: number) => SNOW[0] + x, Z = (z: number) => SNOW[2] + z;
  for (let i = 0; i < N; i++) {
    // dropouts: about two thirds of the column, from "Most" to "finished"
    const drops = i % 3 !== 0;
    const tDrop = W.most + 0.15 + 2.5 * hh(i, 21);
    const stopT = drops ? Math.min(t, tDrop) : t;
    const x = passX(stopT) - i * 1.45 + (hh(i) - 0.5) * 0.3, z = (hh(i, 2) - 0.5) * 0.5, y = snowH(x, z);
    const gone = drops && t > tDrop + 0.22;
    if (drops && t > tDrop - 0.05 && t < tDrop + 0.7) {
      const u = (t - (tDrop - 0.05)) / 0.75;
      out.fx.push({ key: `puff${q(u, 30)}`, cw: 300, ch: 300, draw: (p) => puff(p, q(u, 30), SNOWWHITE), x: X(x), y: y + 0.9, z: Z(z + 0.25), w: 2.0, h: 2.0, soft: true });
    }
    if (gone) continue;
    const v = i % 4, o = i % 4 === 3 ? PEASANT(i % 5) : RED(v);
    const phase = q(((stopT - 25) * PASS_V / 0.75 + hh(i, 4)) % 1, 60);
    const walking = !drops || t < tDrop;
    const expr: Expr = (["pained", "neutral", "stern", "pained"] as Expr[])[i % 4];
    out.places.push(person(cam, { i: i + 50, o, okey: `sn${i % 4 === 3 ? "p" + (i % 5) : "r" + v}` }, X(x), y, Z(z), { side: true, mirror: false }, {},
      { mode: walking ? "march" : "stand", phase, expr, stride: 0.7, stomp: 0.55, blink: lidAt(t, i + 50) }));
    blob(out, X(x), y, Z(z), 1, 0.7);
  }
};

/** shot 8: two rivals behind the same sandbags */
const trench = (cam: CamInfo, t: number, out: Stage) => {
  const X = (x: number) => TRENCH[0] + x, Z = (z: number) => TRENCH[2] + z;
  const close = smooth((t - (W.side - 0.2)) / 0.6), apart = smooth((t - (W.held - LEAD)) / 0.35);
  const sep = 0.78 - 0.28 * close + 0.42 * apart;
  const glance = t > W.but - LEAD;
  for (const s of [-1, 1]) {
    const isRed = s < 0;
    const expr: Expr = t > W.held - LEAD ? "stern" : glance ? "nervous" : t > W.side ? "neutral" : "stern";
    const look = glance ? -s : 0;
    out.places.push(person(cam, { i: isRed ? 70 : 71, o: isRed ? RED(0) : NAT, okey: isRed ? "tR" : "tN" }, X(s * sep), 0, Z(-0.75),
      { side: false, mirror: false }, { mode: "stand", expr, look, facing: (glance ? -s : 0) as -1 | 0 | 1, seed: isRed ? 3 : 6, blink: lidAt(t, isRed ? 70 : 71) }, {}));
  }
  if (t > W.held - LEAD - 0.05) {
    const k = smooth((t - (W.held - LEAD - 0.05)) / 0.25);
    out.fx.push({ key: `crack${q(k, 20)}`, cw: 200, ch: 600, draw: (p) => crack(p, q(k, 20)), x: X(0), y: 1.0, z: Z(0.55), w: 0.3, h: 0.9 });
  }
};

/** shots 10 and 14: crowds in the square, the end: Mao at the rostrum */
const crowd = (cam: CamInfo, t: number, out: Stage, golden: boolean) => {
  const cheer = golden ? true : t > W.won - LEAD;
  for (let i = 0; i < 34; i++) {
    const row = i % 4, x = -9 + ((i * 7) % 34) * 0.55 + (hh(i, 1) - 0.5) * 0.4, z = 6.5 + row * 1.15 + hh(i, 2) * 0.5;
    const v = i % 6, wave = cheer && i % 3 !== 1 ? q(Math.sin(t * 7 + i * 1.7), 20) : undefined;
    const expr: Expr = cheer ? (["grin", "smile", "laugh", "smile_closed"] as Expr[])[i % 4] : (["neutral", "smile_closed"] as Expr[])[i % 2];
    out.places.push(person(cam, { i: i + 100, o: CIVIL(v), okey: `c${v}` }, GATE[0] + x, 0, GATE[2] + z, { side: false, mirror: false },
      { mode: "stand", expr, wave, blink: lidAt(t, i + 100), facing: ((i % 3) - 1) as -1 | 0 | 1 }, {}));
    blob(out, GATE[0] + x, 0, GATE[2] + z);
    if (i % 4 === 0 && cheer) out.fx.push({ key: "flagbit", cw: 200, ch: 300, draw: (p) => flagBit(p, "#b23a2c"), x: GATE[0] + x + 0.32, y: 1.75 + 0.05 * Math.sin(t * 6 + i), z: GATE[2] + z, w: 0.36, h: 0.54, rot: 0.15 * Math.sin(t * 5 + i) });
  }
};
const rostrum = (cam: CamInfo, t: number, out: Stage) => {
  out.places.push(person(cam, { i: 3, o: MAO_GREY, okey: "maoR" }, GATE[0], 9.0, GATE[2] - 21.3, { side: false, mirror: false },
    { mode: "stand", expr: "neutral", seed: 4, blink: lidAt(t, 3) }, {}, 1.05));
  for (const [x, i] of [[-1.3, 0], [1.25, 1], [-2.4, 2], [2.35, 3]] as const)
    out.places.push(person(cam, { i: 90 + i, o: CIVIL(i + 2), okey: `rc${i}` }, GATE[0] + x, 9.0, GATE[2] - 21.7 - 0.2 * (i % 2), { side: false, mirror: false },
      { mode: "stand", expr: "neutral", blink: lidAt(t, 90 + i), facing: (x < 0 ? 1 : -1) as -1 | 1 }, {}));
};

/** shot 12: a cap in the night snow; far away a column walks on */
const night = (cam: CamInfo, t: number, out: Stage) => {
  const X = (x: number) => NIGHT[0] + x, Z = (z: number) => NIGHT[2] + z;
  out.fx.push({ key: "capsnow", cw: 400, ch: 300, draw: capInSnow, x: X(0), y: 0.1, z: Z(0), w: 0.5, h: 0.375, yaw: 0.25 });
  for (let i = 0; i < 9; i++) {
    const x = -10 + i * 1.6 + 0.55 * (t - 47.4), z = -16 - (i % 2) * 0.6;
    const phase = q((t * 0.8 + hh(i, 4)) % 1, 60);
    out.places.push(person(cam, { i: i + 120, o: VOLUNTEER(i % 3), okey: `v${i % 3}` }, X(x), 0, Z(z), { side: true, mirror: false }, {},
      { mode: "march", phase, expr: "neutral", stride: 0.7, stomp: 0.55 }));
  }
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo, light: LightName): Stage => {
  const out: Stage = { places: [], fx: [] };
  LNAME = light; SUN.copy(cam.sun).normalize();
  switch (id) {
    case 1: gate1911(cam, t, out); break;
    case 2: camp(cam, t, out); break;
    case 4: hills(cam, t, out); break;
    case 6: snowPass(cam, t, out); break;
    case 8: trench(cam, t, out); break;
    case 10: crowd(cam, t, out, false); break;
    case 12: night(cam, t, out); break;
    case 14: crowd(cam, t, out, true); rostrum(cam, t, out); break;
  }
  return out;
};
export { add, DUST };
export type { V3 };
