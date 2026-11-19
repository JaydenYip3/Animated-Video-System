// "Dead-End Job" world: a neon-lit night street (agency, convenience store, a creepy house, a poster wall, a clinic,
// street lamps, a far skyline) + three sealed interiors far off the street (Justin's room, the agency office, the
// clinic room). update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, quad, V, lam, Kit } from "./build";
import { ctex, rng, rep, planksHD, brick } from "./paint";
import { Pen, fxPoster, fxBoard } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, SWY, FRONT, AG_DOOR, HOUSE_DOOR, POSTER, LAMPS_X, ROOM, OFFICE, CLINIC, BOARD, W, LEAD, smooth, clamp01,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
type Win = { x: number; y: number; w: number; h: number; lit: number; warm: boolean; who: number };
const PX = 64; // texels per metre on facades
/** night facade: wall (+ optional brick courses), dark windows with frames; a second canvas holds only the lit panes */
const facade = (key: string, wm: number, hm: number, wall: string, o: { brick?: boolean; shop?: boolean; litP?: number; seed?: number; frame?: string }) => {
  const r = rng(o.seed ?? key.length * 7 + 3);
  const wins: Win[] = [];
  const y0 = o.shop ? 3.6 : 1.1, cols = Math.max(1, Math.floor((wm - 1.0) / 2.3));
  for (let fy = y0; fy + 1.5 < hm - 0.5; fy += 3.0)
    for (let c = 0; c < cols; c++) {
      const x = (wm - cols * 2.3) / 2 + c * 2.3 + 0.6;
      wins.push({ x, y: fy, w: 1.1, h: 1.55, lit: r() < (o.litP ?? 0.35) ? 0.6 + 0.4 * r() : 0, warm: r() < 0.7, who: r() });
    }
  const Wd = Math.min(2048, Math.round(wm * PX)), Hd = Math.min(2048, Math.round(hm * PX)), sx = Wd / wm, sy = Hd / hm;
  const R = (x: number, y: number, w: number, h: number): [number, number, number, number] => [x * sx, Hd - (y + h) * sy, w * sx, h * sy];
  const wallT = ctex(key + "W", Wd, Hd, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, Wd, Hd);
    if (o.brick) {
      const bh = 0.2 * sy, bw = 0.45 * sx;
      for (let row = 0; row * bh < Hd; row++) for (let i = -1; i * bw < Wd; i++) {
        const v = 0.86 + 0.2 * r();
        g.fillStyle = `rgba(${v > 1 ? 255 : 0},${v > 1 ? 240 : 0},${v > 1 ? 230 : 0},${Math.abs(v - 1) * 0.6})`;
        g.fillRect(i * bw + (row % 2) * bw / 2 + 1, row * bh + 1, bw - 3, bh - 3);
      }
      g.fillStyle = "rgba(20,10,30,0.18)";
      for (let row = 0; row * bh < Hd; row++) g.fillRect(0, row * bh, Wd, 2);
    } else for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + 0.04 * r()})`; g.fillRect(r() * Wd, r() * Hd, 6 + 30 * r(), 4 + 20 * r()); }
    // grime toward the ground, a cornice line
    const gr = g.createLinearGradient(0, Hd, 0, Hd - 2.5 * sy); gr.addColorStop(0, "rgba(10,5,20,0.35)"); gr.addColorStop(1, "rgba(10,5,20,0)");
    g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0.25 * sy, Wd, 0.18 * sy);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(0, 0.43 * sy, Wd, 0.06 * sy);
    for (const w of wins) {
      const [x, y, ww, hh] = R(w.x - 0.08, w.y - 0.12, w.w + 0.16, w.h + 0.2);
      g.fillStyle = o.frame ?? "#c9c2d6"; g.fillRect(x, y, ww, hh);
      const [x2, y2, w2, h2] = R(w.x, w.y, w.w, w.h);
      g.fillStyle = "#171427"; g.fillRect(x2, y2, w2, h2);
      g.fillStyle = "rgba(120,130,190,0.18)"; g.fillRect(x2, y2, w2 * 0.45, h2);
      g.fillStyle = o.frame ?? "#c9c2d6"; g.fillRect(x2 + w2 / 2 - 3, y2, 6, h2); g.fillRect(x2, y2 + h2 * 0.45, w2, 5);
      g.fillStyle = "#2a2438"; g.fillRect(x - 4, y + hh, ww + 8, 0.08 * sy); // sill shadow
    }
  });
  const litT = ctex(key + "L", Wd, Hd, (g) => {
    g.clearRect(0, 0, Wd, Hd);
    for (const w of wins) if (w.lit) {
      const [x, y, ww, hh] = R(w.x, w.y, w.w, w.h);
      const c = w.warm ? [255, 196, 120] : [150, 210, 255];
      const gr = g.createLinearGradient(0, y, 0, y + hh);
      gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.75 * w.lit})`); gr.addColorStop(1, `rgba(${c[0] * 0.7},${c[1] * 0.6},${c[2] * 0.5},${0.9 * w.lit})`);
      g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      // curtains / a watching silhouette in some windows
      if (w.who < 0.25) { g.fillStyle = "rgba(0,0,0,0.85)"; g.beginPath(); g.ellipse(x + ww * 0.5, y + hh * 0.45, ww * 0.14, hh * 0.13, 0, 0, 7); g.fill(); g.fillRect(x + ww * 0.3, y + hh * 0.56, ww * 0.4, hh * 0.5); }
      else if (w.who < 0.6) { g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x, y, ww * 0.22, hh); g.fillRect(x + ww * 0.78, y, ww * 0.22, hh); }
      g.fillStyle = "rgba(0,0,0,0.9)"; g.fillRect(x + ww / 2 - 3, y, 6, hh); g.fillRect(x, y + hh * 0.45, ww, 5);
    }
  });
  wallT.wrapS = wallT.wrapT = THREE.ClampToEdgeWrapping; litT.wrapS = litT.wrapT = THREE.ClampToEdgeWrapping;
  return { wallT, litT };
};
const asphalt = () => ctex("dejAsphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#4b4858"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) { const v = 50 + 50 * r(); g.fillStyle = `rgba(${v},${v},${v + 14},0.35)`; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
  for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(20,18,30,0.5)"; g.lineWidth = 3; g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
});
const paving = () => ctex("dejPaving", 512, 512, (g, r) => {
  g.fillStyle = "#77738a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 0.9 + 0.2 * r(); g.fillStyle = `rgba(${150 * v},${146 * v},${170 * v},1)`; g.fillRect(i * 128 + 3, j * 128 + 3, 122, 122); }
});
const lineTex = () => ctex("dejLine", 256, 64, (g) => { g.clearRect(0, 0, 256, 64); g.fillStyle = "#e8c84a"; g.fillRect(0, 22, 150, 20); });
const glowTex = () => ctex("dejGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const poolTex = () => ctex("dejPool", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const discTex = () => ctex("dejMoon", 128, 128, (g) => {
  g.fillStyle = "rgba(255,255,255,1)"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  g.fillStyle = "rgba(180,180,200,0.5)"; for (const [x, y, rr] of [[44, 50, 12], [80, 76, 9], [70, 40, 6]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
});
/** the agency's neon eye: state 0 off .. 3 wide open */
const eyeTex = (state: number) => ctex("dejEye" + state, 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = "#1a1024"; g.beginPath(); g.roundRect(8, 8, 496, 240, 40); g.fill();
  g.lineCap = "round";
  const tube = (col: string, w: number, path: () => void) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); path(); g.stroke(); };
  const open = [0.0, 0.08, 0.5, 1][state];
  const lid = () => { g.moveTo(70, 128); g.quadraticCurveTo(256, 128 - 150 * open, 442, 128); g.moveTo(70, 128); g.quadraticCurveTo(256, 128 + 150 * open, 442, 128); };
  if (state === 0) { tube("#3a2a48", 16, lid); return; }
  tube("rgba(255,80,220,0.35)", 40, lid); tube("#ff6ae6", 16, lid); tube("#ffd8f8", 6, lid);
  if (open > 0.3) {
    g.fillStyle = "rgba(90,240,255,0.35)"; g.beginPath(); g.arc(256, 128, 58 * open, 0, 7); g.fill();
    g.strokeStyle = "#5af0ff"; g.lineWidth = 14; g.beginPath(); g.arc(256, 128, 46 * open, 0, 7); g.stroke();
    g.fillStyle = "#e8fdff"; g.beginPath(); g.arc(256, 128, 16 * open, 0, 7); g.fill();
  }
});
const storeSign = () => ctex("dejStoreSign", 1024, 96, (g) => {
  g.fillStyle = "#14261f"; g.fillRect(0, 0, 1024, 96);
  g.lineCap = "round";
  const tube = (col: string, w: number, f: () => void) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); f(); g.stroke(); };
  for (const [c, w] of [["rgba(80,255,170,0.35)", 22], ["#5dffb0", 8], ["#e0fff0", 3]] as const) {
    tube(c, w, () => { g.moveTo(30, 18); g.lineTo(994, 18); g.moveTo(30, 78); g.lineTo(994, 78); });
  }
  // a coffee cup, a star and a crescent moon: "open all night" without words
  for (const [c, w] of [["rgba(255,210,90,0.35)", 20], ["#ffd25a", 7], ["#fff4d0", 3]] as const) {
    tube(c, w, () => { g.rect(440, 30, 46, 40); g.moveTo(486, 40); g.arc(496, 50, 10, -1.6, 1.6); });
    tube(c, w, () => { for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI * 4) / 5, rr = i % 2 ? 0 : 26; void rr; g.lineTo(580 + 26 * Math.cos(a), 50 + 26 * Math.sin(a)); } });
    tube(c, w, () => { g.arc(370, 50, 24, 0.9, 5.4); g.arc(382, 46, 18, 5.0, 1.3, true); });
  }
});
const crossTex = () => ctex("dejCross", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (const [c, w] of [["rgba(80,255,140,0.35)", 30], ["#58ff98", 12], ["#e8fff0", 4]] as const) {
    g.strokeStyle = c; g.lineWidth = w; g.lineJoin = "round"; g.beginPath();
    g.moveTo(98, 40); g.lineTo(158, 40); g.lineTo(158, 98); g.lineTo(216, 98); g.lineTo(216, 158); g.lineTo(158, 158); g.lineTo(158, 216); g.lineTo(98, 216);
    g.lineTo(98, 158); g.lineTo(40, 158); g.lineTo(40, 98); g.lineTo(98, 98); g.closePath(); g.stroke();
  }
});
const neonShape = (key: string, col: string, draw: (g: CanvasRenderingContext2D) => void) => ctex("dejNeon" + key, 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineCap = "round"; g.lineJoin = "round";
  for (const [c, w] of [[col + "55", 26], [col, 10], ["#ffffff", 3]] as const) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); draw(g); g.stroke(); }
});
const doorGlowTex = (key: string, a: string, b: string) => ctex(key, 128, 256, (g) => {
  const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
});
const doorTex = (key: string, col: string) => ctex(key, 128, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 6; g.strokeRect(18, 20, 92, 90); g.strokeRect(18, 130, 92, 104);
  g.fillStyle = "#d8c070"; g.beginPath(); g.arc(104, 130, 6, 0, 7); g.fill();
});
const productTex = () => ctex("dejProducts", 512, 512, (g, r) => {
  g.fillStyle = "#e8eef0"; g.fillRect(0, 0, 512, 512);
  const cols = ["#e2453c", "#f2b33a", "#3f8fd8", "#5fbf5a", "#c25ac9", "#f07a3a", "#3fc2b8"];
  for (let row = 0; row < 4; row++) {
    const y = row * 128;
    g.fillStyle = "#b9c2c8"; g.fillRect(0, y + 112, 512, 16);
    for (let x = 6; x < 506;) { const w = 18 + 30 * r(), h = 40 + 60 * r(); g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y + 112 - h, w, h); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 3, y + 112 - h + 6, w - 6, 6); x += w + 3; }
  }
});
const tilesTex = (key: string, a: string, b: string, n = 8) => ctex(key, 512, 512, (g) => {
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect((i * 512) / n, (j * 512) / n, 512 / n, 512 / n); }
  g.strokeStyle = "rgba(0,0,0,0.15)"; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo((i * 512) / n, 0); g.lineTo((i * 512) / n, 512); g.moveTo(0, (i * 512) / n); g.lineTo(512, (i * 512) / n); g.stroke(); }
});
const wallpaper = () => ctex("dejWallpaper", 512, 512, (g) => {
  g.fillStyle = "#6f8f8a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"; g.fillRect(i * 64, 0, 64, 512); }
  g.fillStyle = "rgba(60,40,30,0.12)"; g.beginPath(); g.ellipse(300, 120, 60, 40, 0.3, 0, 7); g.fill(); // a damp stain
});
const officeWall = () => ctex("dejOffice", 512, 512, (g) => {
  g.fillStyle = "#4a3866"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)"; g.fillRect(i * 32, 0, 32, 512); }
  g.fillStyle = "#2b2140"; g.fillRect(0, 400, 512, 112);
});
const cityTex = () => ctex("dejCity", 256, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#0c0a26"); gr.addColorStop(1, "#3a2a5a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9; i++) {
    const x = i * 30 - 10 + r() * 10, h = 60 + r() * 140; g.fillStyle = "#14102a"; g.fillRect(x, 256 - h, 28, h);
    for (let k = 0; k < 14; k++) if (r() < 0.35) { g.fillStyle = r() < 0.7 ? "#ffd27a" : "#8ad8ff"; g.fillRect(x + 4 + (k % 3) * 8, 256 - h + 8 + Math.floor(k / 3) * 14, 4, 6); }
  }
  g.strokeStyle = "#2a2238"; g.lineWidth = 12; g.strokeRect(0, 0, 256, 256); g.fillStyle = "#2a2238"; g.fillRect(122, 0, 12, 256); g.fillRect(0, 122, 256, 12);
});
const curtainTex = () => ctex("dejCurtain", 256, 256, (g) => {
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#9fd0c8" : "#86bab2"; g.fillRect(i * 16, 0, 16, 256); }
});

const LIGHT_KEYS = ["night", "lamp", "neon", "store", "red"] as const;
type LK = (typeof LIGHT_KEYS)[number];
const posterKey = (k: number) => Math.round(clamp01(k) * 6);
const boardKey = (k: number) => Math.round(clamp01(k) * 9);

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#262248", 25, 230);
  private moon: THREE.Sprite; private moonHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private stars: THREE.Points;
  private litMats: THREE.MeshBasicMaterial[] = [];
  private eyeMats: THREE.MeshBasicMaterial[] = [];
  private agLeaf = new THREE.Group(); private agGlow: THREE.MeshBasicMaterial;
  private houseLeaf = new THREE.Group();
  private storeGlow: THREE.Mesh;
  private posterMat: THREE.MeshBasicMaterial; private boardMat: THREE.MeshBasicMaterial;
  private lampPools: THREE.MeshBasicMaterial[] = []; private lampHeads: THREE.Sprite[] = [];
  private neonMats: { m: THREE.MeshBasicMaterial; base: THREE.Color; seed: number }[] = [];
  private ivBag = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  /** self-lit plane (signs, glows, windows): NOINK layer */
  private plane(map: THREE.Texture | null, w: number, h: number, pos: THREE.Vector3, rotY = 0, col = new THREE.Color(1, 1, 1), additive = false) {
    const m = new THREE.MeshBasicMaterial({ map, color: col, transparent: additive || !!map, depthWrite: !additive, side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, alphaTest: additive ? 0 : 0.02, fog: !additive });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.copy(pos); mesh.rotation.y = rotY; mesh.layers.set(NOINK);
    this.root.add(mesh);
    return { mesh, m };
  }

  /** a street building: plain box + a painted facade quad + the lit-pane overlay. face = +1 (front at z0 facing +z) or -1 */
  private building(b: Batch, x0: number, x1: number, z0: number, depth: number, h: number, wall: string, o: Parameters<typeof facade>[4] & { key: string }, face = 1) {
    const { wallT, litT } = facade(o.key, x1 - x0, h, wall, o);
    const wm = lam("dejF" + o.key, () => ({ map: wallT }));
    const plain = lam("dejP" + wall, () => ({ color: wall }));
    const zb = z0 - face * depth, zf = z0 - face * 0.02;
    b.add(boxGeo(V(x0, 0, Math.min(zb, zf)), V(x1, h, Math.max(zb, zf))), plain);
    if (face > 0) b.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, h, z0), V(x0, h, z0)), wm);
    else b.add(quad(V(x1, 0, z0), V(x0, 0, z0), V(x0, h, z0), V(x1, h, z0)), wm);
    // parapet + cornice
    const cm = lam("dejCorn" + wall, () => ({ color: new THREE.Color(wall).multiplyScalar(0.8).getStyle() }));
    b.add(boxGeo(V(x0 - 0.1, h, Math.min(zb, z0 + face * 0.25)), V(x1 + 0.1, h + 0.5, Math.max(zb, z0 + face * 0.25))), cm);
    const lit = this.plane(litT, x1 - x0, h, V((x0 + x1) / 2, h / 2, z0 + face * 0.015), face > 0 ? 0 : Math.PI, new THREE.Color(1.5, 1.35, 1.15), true);
    this.litMats.push(lit.m);
  }

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky, stars, moon ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    {
      const r = rng(5), n = 900, pos = new Float32Array(n * 3), cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, el = Math.asin(0.1 + 0.9 * r() ** 0.7), d = 1000;
        pos.set([Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d], i * 3);
        const bb = (0.35 + 0.9 * r() ** 3) * Math.min(1, (el - 0.08) * 4);
        cols.set([bb, bb, bb * 1.1], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true, opacity: 0.8 }));
      this.stars.layers.set(NOINK); this.stars.frustumCulled = false; this.stars.renderOrder = -0.8;
      R.add(this.stars);
    }
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(1.7, 1.7, 1.8), fog: false, depthWrite: false, transparent: true }));
    this.moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color("#5a5890"), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.moon.renderOrder = -0.5; this.moonHalo.renderOrder = -0.4;
    for (const m of [this.moon, this.moonHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);

    const b = new Batch();
    // ---- street: road, kerbs, sidewalks ----
    const road = new THREE.Mesh(new THREE.PlaneGeometry(260, 8).rotateX(-Math.PI / 2), lam("dejRoad", () => ({ map: rep(asphalt(), 26, 0.8) })));
    road.receiveShadow = true; R.add(road);
    const lines = this.plane(rep(lineTex(), 65, 1), 260, 0.16, V(0, 0.01, 0), 0);
    lines.mesh.rotation.x = -Math.PI / 2; lines.m.color.setRGB(0.7, 0.62, 0.35); lines.m.fog = true;
    const pave = lam("dejPave", () => ({ map: rep(paving(), 130, 2) })), kerb = lam("dejKerb", () => ({ color: "#8e8aa0" }));
    b.add(boxGeo(V(-130, 0, -24), V(130, SWY, -4)), pave);
    b.add(boxGeo(V(-130, 0, 4), V(130, SWY, 24)), pave);
    b.add(boxGeo(V(-130, 0, -4.2), V(130, SWY + 0.01, -4)), kerb);
    b.add(boxGeo(V(-130, 0, 4), V(130, SWY + 0.01, 4.2)), kerb);

    // ---- far side buildings (fronts at z = FRONT, facing the street) ----
    const F = FRONT;
    this.building(b, -58, -46, F, 12, 13, "#7a5a58", { key: "b1", brick: true, litP: 0.4, seed: 11 });
    this.building(b, -46, -34, F, 12, 12, "#8a6a5a", { key: "apt", brick: true, litP: 0.45, seed: 12, frame: "#d8cdb8" });
    this.building(b, -34, -30, F, 12, 10, "#5e6a80", { key: "b2", litP: 0.3, seed: 13 });
    // the agency: dark violet, narrow, its door + neon eye
    this.building(b, -30, -22, F, 8, 9, "#4b3c6c", { key: "agency", brick: true, litP: 0.0, seed: 14, frame: "#2b2140", shop: true });
    this.building(b, -22, -12, F, 12, 10.5, "#6a6578", { key: "b3", litP: 0.35, seed: 15 });
    // convenience store: hollow box with a glass front (x -12..4, z -20..-8)
    this.building(b, 4, 10, F, 12, 7, "#7a6a88", { key: "b4", litP: 0.3, seed: 16 });
    this.building(b, 10, 20, F, 10, 8.5, "#5c6470", { key: "house", litP: 0.12, seed: 17, frame: "#8a8a8a" });
    // poster wall: low brick wall with a building behind
    b.add(boxGeo(V(20, 0, F - 1), V(34, 4.2, F)), lam("dejWallB", () => ({ map: rep(brick(), 6, 2) })));
    b.add(quad(V(20, 0, F + 0.001), V(34, 0, F + 0.001), V(34, 4.2, F + 0.001), V(20, 4.2, F + 0.001), 6, 2), lam("dejWallB", () => ({ map: rep(brick(), 6, 2) })));
    this.building(b, 20, 34, F - 6, 10, 14, "#5a5470", { key: "b5", litP: 0.4, seed: 18 });
    this.building(b, 34, 48, F, 12, 7.5, "#d6dce0", { key: "clinic", litP: 0.5, seed: 19, frame: "#9fb0b8" });
    this.building(b, 48, 60, F, 12, 11, "#7a5a68", { key: "b6", brick: true, litP: 0.35, seed: 20 });
    this.building(b, 60, 76, F, 12, 9, "#5e6a80", { key: "b7", litP: 0.3, seed: 21 });
    this.building(b, -76, -58, F, 12, 10, "#5a6070", { key: "b8", litP: 0.3, seed: 22 });
    // near side (fronts at z = 10.5 facing -z)
    let x = -76, k = 0;
    while (x < 76) {
      const w = [10, 14, 12, 9][k % 4], h = [9, 12, 7.5, 11][k % 4], col = ["#5a5470", "#6a5a58", "#4e5a6c", "#6e6a80"][k % 4];
      this.building(b, x, x + w, 10.5, 10, h, col, { key: "n" + k, brick: k % 2 === 0, litP: 0.35, seed: 40 + k }, -1);
      x += w; k++;
    }
    // far skyline (cheap boxes with lit panes) behind the street
    for (let i = 0; i < 14; i++) {
      const x0 = -90 + i * 13, h = 18 + ((i * 37) % 17);
      this.building(b, x0, x0 + 11, -38 - (i % 3) * 6, 10, h, "#3a3654", { key: "sky" + i, litP: 0.25, seed: 60 + i });
    }

    // ---- the agency door (recessed glow behind a door leaf on a hinge) + neon eye + violet window glow ----
    const [ax, , az] = AG_DOOR;
    this.agGlow = this.plane(doorGlowTex("dejAgGlow", "#ff4a6a", "#5a1a6a"), 1.3, 2.45, V(ax, SWY + 1.225, az + 0.01)).m;
    this.agGlow.color.setRGB(1.6, 1.2, 1.4);
    b.add(boxGeo(V(ax - 0.85, 0, az), V(ax - 0.65, SWY + 2.65, az + 0.12)), lam("dejAgFrame", () => ({ color: "#2b2140" })));
    b.add(boxGeo(V(ax + 0.65, 0, az), V(ax + 0.85, SWY + 2.65, az + 0.12)), lam("dejAgFrame", () => ({ color: "#2b2140" })));
    b.add(boxGeo(V(ax - 0.85, SWY + 2.45, az), V(ax + 0.85, SWY + 2.65, az + 0.12)), lam("dejAgFrame", () => ({ color: "#2b2140" })));
    const leaf = new THREE.Mesh(boxGeo(V(0, 0, 0), V(1.3, 2.45, 0.06)), lam("dejAgDoor", () => ({ map: doorTex("dejAgDoorT", "#3a2a50") })));
    leaf.castShadow = true; this.agLeaf.add(leaf); this.agLeaf.position.set(ax - 0.65, SWY, az + 0.02); R.add(this.agLeaf);
    for (const [ex, ey, ew] of [[ax, 3.75, 2.6]] as const) {
      const e = this.plane(eyeTex(3), ew, ew / 2, V(ex, ey, az + 0.06), 0, new THREE.Color(2.2, 2.2, 2.2));
      this.eyeMats.push(e.m);
    }
    for (const wx of [-28.4, -23.6]) {
      const w = this.plane(doorGlowTex("dejAgWin", "#c04aff", "#3a1050"), 1.6, 1.4, V(wx, 1.6, az + 0.02), 0, new THREE.Color(1.1, 0.9, 1.3));
      void w;
    }
    // the eye in the office (back wall)
    const oe = this.plane(eyeTex(3), 1.8, 0.9, V(OFFICE[0] + 0.4, 2.35, OFFICE[2] - 2.97), 0, new THREE.Color(2.0, 2.0, 2.0));
    this.eyeMats.push(oe.m);

    // ---- neon signs on other buildings ----
    const neon = (key: string, col: string, draw: (g: CanvasRenderingContext2D) => void, x: number, y: number, s: number, seed: number, z = FRONT + 0.05, rotY = 0) => {
      const n = this.plane(neonShape(key, col, draw), s, s, V(x, y, z), rotY, new THREE.Color(2, 2, 2));
      this.neonMats.push({ m: n.m, base: new THREE.Color(2, 2, 2), seed });
    };
    neon("heart", "#ff5a9a", (g) => { g.moveTo(128, 200); g.bezierCurveTo(20, 120, 50, 30, 128, 80); g.bezierCurveTo(206, 30, 236, 120, 128, 200); }, -40, 4.2, 1.6, 1);
    neon("arrow", "#5af0ff", (g) => { g.moveTo(40, 128); g.lineTo(200, 128); g.moveTo(150, 80); g.lineTo(206, 128); g.lineTo(150, 176); }, -17, 3.6, 1.5, 2);
    neon("moon", "#ffd25a", (g) => { g.arc(128, 128, 80, 0.9, 5.4); g.arc(150, 112, 62, 5.0, 1.3, true); }, 7, 4.4, 1.5, 3);
    neon("cup", "#ff8a3a", (g) => { g.rect(70, 90, 90, 90); g.moveTo(160, 110); g.arc(180, 135, 22, -1.6, 1.6); }, 54, 3.6, 1.5, 4);
    neon("star", "#c46aff", (g) => { for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i * Math.PI * 4) / 5; g.lineTo(128 + 90 * Math.cos(a), 128 + 90 * Math.sin(a)); } }, -52, 4.0, 1.6, 5);
    neon("star2", "#5af0ff", (g) => { for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i * Math.PI * 4) / 5; g.lineTo(128 + 90 * Math.cos(a), 128 + 90 * Math.sin(a)); } }, -20, 4.5, 1.4, 6, 10.45, Math.PI);
    neon("heart2", "#ff5a9a", (g) => { g.moveTo(128, 200); g.bezierCurveTo(20, 120, 50, 30, 128, 80); g.bezierCurveTo(206, 30, 236, 120, 128, 200); }, 30, 4.0, 1.5, 7, 10.45, Math.PI);
    const cross = this.plane(crossTex(), 1.6, 1.6, V(41, 5.2, FRONT + 0.05), 0, new THREE.Color(2, 2, 2));
    this.neonMats.push({ m: cross.m, base: new THREE.Color(2, 2, 2), seed: 8 });

    // ---- convenience store (x -12..4, z -20..-8): hollow, glass front ----
    {
      const X0 = -12, X1 = 4, Z0 = -20, Z1 = FRONT, H = 4.6, IH = 3.4;
      const outer = lam("dejStoreOut", () => ({ color: "#5d7a72" }));
      const wallIn = lam("dejStoreIn", () => ({ color: "#d6e6dc" })), floorM = lam("dejStoreFloor", () => ({ map: rep(tilesTex("dejStoreTile", "#e8ece6", "#b8c4c0"), 8, 6) }));
      const ceil = lam("dejStoreCeil", () => ({ color: "#c8d2d0" }));
      b.add(boxGeo(V(X0, 0, Z0), V(X1, H, Z0 + 0.3)), outer);           // back wall
      b.add(boxGeo(V(X0, 0, Z0), V(X0 + 0.3, H, Z1)), outer);           // left
      b.add(boxGeo(V(X1 - 0.3, 0, Z0), V(X1, H, Z1)), outer);           // right
      b.add(boxGeo(V(X0, IH, Z1 - 0.3), V(X1, H, Z1)), outer);          // header over the glass
      b.add(boxGeo(V(X0, H - 0.1, Z0), V(X1, H, Z1)), outer);           // roof
      b.add(boxGeo(V(X0, 0, Z1 - 0.3), V(X1, 0.5, Z1)), outer);          // low wall under the glass
      // inside faces
      b.add(quad(V(X0 + 0.3, 0, Z0 + 0.31), V(X1 - 0.3, 0, Z0 + 0.31), V(X1 - 0.3, IH, Z0 + 0.31), V(X0 + 0.3, IH, Z0 + 0.31), 1, 1), lam("dejStoreBack", () => ({ map: rep(productTex(), 4, 1) })));
      b.add(quad(V(X0 + 0.31, 0, Z1), V(X0 + 0.31, 0, Z0), V(X0 + 0.31, IH, Z0), V(X0 + 0.31, IH, Z1)), wallIn);
      b.add(quad(V(X1 - 0.31, 0, Z0), V(X1 - 0.31, 0, Z1), V(X1 - 0.31, IH, Z1), V(X1 - 0.31, IH, Z0)), wallIn);
      b.add(quad(V(X0, IH, Z0), V(X1, IH, Z0), V(X1, IH, Z1), V(X0, IH, Z1)).rotateX(0), ceil);
      b.add(boxGeo(V(X0 + 0.3, 0, Z0 + 0.3), V(X1 - 0.3, 0.02, Z1)), floorM);
      // mullions + the door frame
      for (const mx of [-11.7, -9.0, -7.0, -3.0, 0.5, 3.7]) b.add(boxGeo(V(mx - 0.08, 0.5, Z1 - 0.15), V(mx + 0.08, IH, Z1)), lam("dejMull", () => ({ color: "#2e3a38" })));
      b.add(boxGeo(V(-11.8, 2.6, Z1 - 0.15), V(3.8, 2.7, Z1)), lam("dejMull", () => ({ color: "#2e3a38" })));
      // shelves (island rows) + the counter + a register
      const shelfM = lam("dejShelf", () => ({ map: rep(productTex(), 2, 1) }));
      for (const sz of [-12.2, -14.6]) b.add(boxGeo(V(-11.2, 0, sz - 0.4), V(-7.8, 1.7, sz + 0.4)), shelfM);
            b.add(boxGeo(V(-5.2, 0, -16.6), V(-0.8, 1.05, -15.6)), lam("dejCounter", () => ({ color: "#c84a4a" })));
      b.add(boxGeo(V(-5.3, 1.05, -16.7), V(-0.7, 1.12, -15.5)), lam("dejCounterTop", () => ({ color: "#e8e2d4" })));
      b.add(boxGeo(V(-2.2, 1.12, -16.4), V(-1.4, 1.5, -15.9)), lam("dejRegister", () => ({ color: "#3a3d47" })));
      // fluorescent panels
      for (const pz of [-10.5, -14, -17.5]) for (const px of [-8, -3, 1.5]) {
        const p = this.plane(null, 1.4, 0.35, V(px, IH - 0.02, pz), 0, new THREE.Color(2.6, 3.0, 2.8));
        p.mesh.rotation.x = Math.PI / 2;
      }
      // seen from the street, the store glows: an additive fill just inside the glass (hidden inside the store)
      this.storeGlow = this.plane(glowTex(), 17, 4.6, V(-4, 1.8, Z1 - 0.4), 0, new THREE.Color(0.55, 0.75, 0.65), true).mesh;
      const sign = this.plane(storeSign(), 15.4, 0.9, V(-4, 4.0, Z1 + 0.05), 0, new THREE.Color(2, 2, 2));
      this.neonMats.push({ m: sign.m, base: new THREE.Color(2, 2, 2), seed: 9 });
      // ground pool of light in front of the glass
      const pool = this.plane(poolTex(), 18, 7, V(-4, SWY + 0.02, Z1 + 3), 0, new THREE.Color(0.3, 0.42, 0.36), true);
      pool.mesh.rotation.x = -Math.PI / 2;
    }

    // ---- the creepy house door (milk delivery): stoop, dark gap, door leaf ----
    {
      const [hx, hy, hz] = HOUSE_DOOR;
      const stone = lam("dejStoop", () => ({ color: "#8a8494" }));
      b.add(boxGeo(V(hx - 1.2, 0, hz), V(hx + 1.2, hy, hz + 0.9)), stone);
      b.add(boxGeo(V(hx - 1.2, 0, hz + 0.9), V(hx + 1.2, hy * 0.5, hz + 1.3)), stone);
      this.plane(null, 1.15, 2.25, V(hx, hy + 1.125, hz + 0.005), 0, new THREE.Color(0.0, 0.0, 0.01));
      const fr = lam("dejHFrame", () => ({ color: "#3a3440" }));
      b.add(boxGeo(V(hx - 0.75, hy, hz), V(hx - 0.58, hy + 2.45, hz + 0.1)), fr);
      b.add(boxGeo(V(hx + 0.58, hy, hz), V(hx + 0.75, hy + 2.45, hz + 0.1)), fr);
      b.add(boxGeo(V(hx - 0.75, hy + 2.27, hz), V(hx + 0.75, hy + 2.45, hz + 0.1)), fr);
      const hl = new THREE.Mesh(boxGeo(V(0, 0, 0), V(1.16, 2.27, 0.06)), lam("dejHDoor", () => ({ map: doorTex("dejHDoorT", "#5a3a2a") })));
      hl.castShadow = true; this.houseLeaf.add(hl); this.houseLeaf.position.set(hx - 0.58, hy, hz + 0.02); R.add(this.houseLeaf);
      // a dim porch bulb
      const bulb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.4, 1.0, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      bulb.position.set(hx + 1.0, hy + 2.6, hz + 0.25); bulb.scale.setScalar(0.9); bulb.layers.set(NOINK); R.add(bulb);
    }

    // ---- the poster (canvas texture, redrawn when the stamp grows) ----
    this.posterMat = this.plane(this.posterTex(0), 0.9, 1.2, V(...POSTER), 0, new THREE.Color(0.95, 0.92, 0.95)).m;
    this.posterMat.transparent = false; this.posterMat.alphaTest = 0;
    for (const [px, py, s, c] of [[25.2, 1.8, 0.7, "#c84a6a"], [31.0, 2.0, 0.8, "#4a8ac8"], [33.0, 1.3, 0.6, "#e8c84a"]] as const) {
      const p = this.plane(ctex("dejFlyer" + c, 64, 80, (g) => { g.fillStyle = "#efe8d2"; g.fillRect(0, 0, 64, 80); g.fillStyle = c; g.fillRect(6, 6, 52, 30); g.fillStyle = "#8a8494"; for (let i = 0; i < 4; i++) g.fillRect(8, 44 + i * 8, 40 - 6 * i, 4); }),
        s * 0.8, s, V(px, py, FRONT + 0.02), 0, new THREE.Color(0.75, 0.72, 0.8));
      p.m.transparent = false;
    }

    // ---- street lamps on the far kerb ----
    const poleM = lam("dejPole", () => ({ color: "#3a3848" }));
    for (const lx of LAMPS_X) {
      b.add(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 10), poleM, new THREE.Matrix4().makeTranslation(lx, 2.6, -4.6));
      b.add(boxGeo(V(-0.05, 0, -0.05), V(0.05, 0.08, 1.2)), poleM, new THREE.Matrix4().makeTranslation(lx, 5.1, -4.6));
      b.add(new THREE.CylinderGeometry(0.12, 0.32, 0.25, 12), poleM, new THREE.Matrix4().makeTranslation(lx, 5.05, -3.5));
      const head = this.plane(null, 0.42, 0.42, V(lx, 4.9, -3.5), 0, new THREE.Color(5, 4.2, 2.8));
      head.mesh.rotation.x = Math.PI / 2;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.6, 1.2, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.position.set(lx, 4.85, -3.5); glow.scale.setScalar(2.6); glow.layers.set(NOINK); glow.renderOrder = 6; R.add(glow); this.lampHeads.push(glow);
      const pool = this.plane(poolTex(), 9, 9, V(lx, SWY + 0.025, -3.6), 0, new THREE.Color(0.42, 0.32, 0.18), true);
      pool.mesh.rotation.x = -Math.PI / 2; pool.mesh.renderOrder = 0.2;
      this.lampPools.push(pool.m);
    }

    // ---- Justin's room (ROOM): wallpaper, plank floor, a night window, the table, the desk lamp, the clue board ----
    {
      const [rx, , rz] = ROOM, X0 = rx - 3, X1 = rx + 3, Z0 = rz - 2.5, Z1 = rz + 2.6, H = 2.8;
      this.room(b, X0, X1, Z0, Z1, H, lam("dejWp", () => ({ map: rep(wallpaper(), 3, 1) })), lam("dejFloorR", () => ({ map: rep(planksHD(), 2, 2) })), lam("dejCeilR", () => ({ color: "#bfb6a4" })));
      this.plane(cityTex(), 1.3, 1.1, V(rx + 1.1, 1.75, Z0 + 0.02), 0, new THREE.Color(1.1, 1.1, 1.2));
      const wood = lam("dejTable", () => ({ color: "#8a5a3c" }));
      b.add(boxGeo(V(rx - 0.85, 0.7, rz - 1.05), V(rx + 0.85, 0.76, rz - 0.15)), wood);
      for (const [lx, lz] of [[-0.78, -0.98], [0.78, -0.98], [-0.78, -0.22], [0.78, -0.22]]) b.add(boxGeo(V(rx + lx - 0.04, 0, rz + lz - 0.04), V(rx + lx + 0.04, 0.7, rz + lz + 0.04)), wood);
      b.add(boxGeo(V(rx - 2.9, 0, rz - 2.4), V(rx - 1.6, 1.9, rz - 1.9)), lam("dejShelfR", () => ({ color: "#6a4a3a" })));
      // the desk lamp
      b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), poleM, new THREE.Matrix4().makeTranslation(rx - 0.6, 0.96, rz - 0.85));
      b.add(new THREE.ConeGeometry(0.14, 0.16, 12, 1, true), lam("dejShade", () => ({ color: "#d8a84a", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(rx - 0.6, 1.18, rz - 0.85));
      const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.4, 1.0, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      lg.position.set(rx - 0.6, 1.08, rz - 0.85); lg.scale.setScalar(1.0); lg.layers.set(NOINK); R.add(lg);
      const tp = this.plane(poolTex(), 1.8, 1.4, V(rx, 0.77, rz - 0.6), 0, new THREE.Color(0.35, 0.25, 0.1), true);
      tp.mesh.rotation.x = -Math.PI / 2;
      this.boardMat = this.plane(this.boardTex(0), 1.9, 1.44, V(...BOARD), -Math.PI / 2, new THREE.Color(0.95, 0.9, 0.85)).m;
      this.boardMat.transparent = false; this.boardMat.alphaTest = 0;
    }
    // ---- the agency office (OFFICE): violet walls, a desk, the eye on the back wall ----
    {
      const [ox, , oz] = OFFICE;
      this.room(b, ox - 3.5, ox + 3.5, oz - 3, oz + 4.3, 3.2, lam("dejOfficeW", () => ({ map: rep(officeWall(), 3, 1) })), lam("dejOfficeF", () => ({ map: rep(tilesTex("dejOfTile", "#2a2236", "#3e3450", 8), 4, 4) })), lam("dejOfficeC", () => ({ color: "#2a2236" })));
      const desk = lam("dejDesk", () => ({ color: "#3a2418" })), top = lam("dejDeskTop", () => ({ color: "#5a3a26" }));
      b.add(boxGeo(V(ox - 1.1, 0, oz - 0.9), V(ox + 1.2, 0.8, oz + 0.05)), desk);
      b.add(boxGeo(V(ox - 1.2, 0.8, oz - 1.0), V(ox + 1.3, 0.86, oz + 0.15)), top);
      b.add(boxGeo(V(ox + 0.85, 0.86, oz - 0.7), V(ox + 1.1, 1.02, oz - 0.3)), lam("dejInk", () => ({ color: "#20182a" })));
      // pink neon strip along the ceiling edges
      for (const [px, pz, w, ry] of [[ox, oz - 2.95, 6.8, 0], [ox - 3.45, oz + 0.6, 7, Math.PI / 2], [ox + 3.45, oz + 0.6, 7, -Math.PI / 2]] as const) {
        const s = this.plane(null, w, 0.06, V(px, 3.0, pz), ry, new THREE.Color(3.0, 0.9, 2.6));
        void s;
      }
      // tall cabinets + a strange plant
      b.add(boxGeo(V(ox - 3.4, 0, oz - 2.9), V(ox - 2.2, 2.3, oz - 2.3)), lam("dejCab", () => ({ color: "#3a3048" })));
      b.add(boxGeo(V(ox + 2.3, 0, oz - 2.9), V(ox + 3.4, 2.3, oz - 2.3)), lam("dejCab", () => ({ color: "#3a3048" })));
    }
    // ---- the clinic room (CLINIC): mint tiles, a bed, an IV stand, a curtain ----
    {
      const [cx, , cz] = CLINIC;
      this.room(b, cx - 3, cx + 3, cz - 3, cz + 3.2, 3.0, lam("dejClinW", () => ({ map: rep(tilesTex("dejClTile", "#cfe8e0", "#bcdcd2", 16), 3, 1.5) })), lam("dejClinF", () => ({ map: rep(tilesTex("dejClFl", "#9aa8b0", "#8a98a2", 8), 3, 3) })), lam("dejClinC", () => ({ color: "#dfe8e6" })));
      const frame = lam("dejBedF", () => ({ color: "#b8c4cc" })), sheet = lam("dejSheet", () => ({ color: "#f2f4f6" })), blanket = lam("dejBlanket", () => ({ color: "#7ab0d8" }));
      b.add(boxGeo(V(cx - 0.4, 0.35, cz - 2.4), V(cx + 1.8, 0.55, cz - 1.4)), frame);
      b.add(boxGeo(V(cx - 0.38, 0.55, cz - 2.38), V(cx + 1.78, 0.68, cz - 1.42)), sheet);
      b.add(boxGeo(V(cx + 0.3, 0.68, cz - 2.39), V(cx + 1.79, 0.74, cz - 1.41)), blanket);
      b.add(boxGeo(V(cx - 0.36, 0.68, cz - 2.2), V(cx + 0.05, 0.8, cz - 1.6)), sheet);
      for (const lx of [-0.35, 1.75]) for (const lz of [-2.35, -1.45]) b.add(boxGeo(V(cx + lx - 0.03, 0, cz + lz - 0.03), V(cx + lx + 0.03, 0.35, cz + lz + 0.03)), frame);
      b.add(boxGeo(V(cx - 0.45, 0.35, cz - 2.4), V(cx - 0.4, 1.2, cz - 1.4)), frame);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 8), poleM); pole.position.y = 0.95;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12), poleM); base.position.y = 0.02;
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.05), lam("dejBag", () => ({ color: "#e8f0d8" }))); bag.position.set(0.12, 1.7, 0);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 4), lam("dejTube", () => ({ color: "#c8d8e8" }))); tube.position.set(0.16, 1.1, 0);
      for (const m of [pole, base, bag, tube]) { m.castShadow = true; this.ivBag.add(m); }
      this.ivBag.position.set(cx + 2.05, 0, cz - 1.25); R.add(this.ivBag);
      const cur = this.plane(curtainTex(), 1.6, 2.4, V(cx - 1.6, 1.25, cz - 1.9), Math.PI / 2 - 0.25, new THREE.Color(0.8, 0.85, 0.85));
      cur.m.transparent = false;
      for (const px of [cx - 1, cx + 1]) { const p = this.plane(null, 1.4, 0.4, V(px, 2.98, cz - 0.5), 0, new THREE.Color(2.6, 3.0, 2.8)); p.mesh.rotation.x = Math.PI / 2; }
      b.add(boxGeo(V(cx + 2.4, 0, cz - 2.9), V(cx + 2.95, 1.0, cz - 2.3)), lam("dejCartC", () => ({ color: "#a8b8c0" })));
    }
    b.build(R);
  }

  /** a sealed box room (inward faces only) */
  private room(b: Batch, X0: number, X1: number, Z0: number, Z1: number, H: number, wall: THREE.Material, floor: THREE.Material, ceil: THREE.Material) {
    const u = (X1 - X0) / 2, v = (Z1 - Z0) / 2;
    b.add(quad(V(X0, 0, Z0), V(X1, 0, Z0), V(X1, H, Z0), V(X0, H, Z0), u, 1), wall);   // back (faces +z)
    b.add(quad(V(X1, 0, Z1), V(X0, 0, Z1), V(X0, H, Z1), V(X1, H, Z1), u, 1), wall);   // front (faces -z)
    b.add(quad(V(X0, 0, Z1), V(X0, 0, Z0), V(X0, H, Z0), V(X0, H, Z1), v, 1), wall);   // left (faces +x)
    b.add(quad(V(X1, 0, Z0), V(X1, 0, Z1), V(X1, H, Z1), V(X1, H, Z0), v, 1), wall);   // right (faces -x)
    b.add(quad(V(X0, 0.001, Z1), V(X1, 0.001, Z1), V(X1, 0.001, Z0), V(X0, 0.001, Z0), 1, 1), floor);
    b.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1), 1, 1), ceil);
    // skirting
    b.add(boxGeo(V(X0, 0, Z0), V(X1, 0.12, Z0 + 0.03)), lam("dejSkirt", () => ({ color: "#3a2a24" })));
  }
  private posterTex(k: number) {
    const q = posterKey(k);
    return ctex("dejPoster" + q, 600, 800, (g) => { const p = new Pen(g); fxPoster(p, q / 6); });
  }
  private boardTex(k: number) {
    const q = boardKey(k);
    return ctex("dejBoard" + q, 1000, 760, (g) => { const p = new Pen(g); fxBoard(p, q / 9); });
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 8, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    // interiors: no moon shadow through the ceiling
    const inside = cam.position.x > 250;
    this.sun.castShadow = !inside;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = s.light === "night" ? 0.85 : s.light === "red" ? 0.9 : 0.95;
    // ---- sky, fog, moon, stars ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position); this.stars.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = inside ? 40 : L.fogNear; this.fog.far = inside ? 400 : L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const md = V(-0.35, 0.42, -0.84).normalize();
    this.moon.position.copy(cam.position).addScaledVector(md, 900);
    this.moon.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(s.light === "red" ? 3.2 : 2.2)));
    (this.moon.material as THREE.SpriteMaterial).color.copy(s.light === "red" ? new THREE.Color(2.4, 0.8, 0.6) : new THREE.Color(1.7, 1.7, 1.8));
    this.moonHalo.position.copy(this.moon.position); this.moonHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(12)));
    (this.moonHalo.material as THREE.SpriteMaterial).color.set(s.light === "red" ? "#7a2030" : "#4a4878");
    // ---- neon: flicker, the agency eye state, doors ----
    for (const n of this.neonMats) {
      const fl = Math.sin(t * 37 + n.seed * 11) > 0.97 || (n.seed === 9 && id === 7 && Math.sin(t * 13) > 0.9) ? 0.35 : 1;
      n.m.color.copy(n.base).multiplyScalar(fl);
    }
    let eye = 3;
    if (id === 2) { // wakes on "strange": flicker, then opens
      const u = t - (W.strange - LEAD);
      eye = u < 0 ? 0 : u < 0.25 ? (Math.floor(u * 30) % 2 ? 0 : 2) : u < 0.6 ? 2 : 3;
    }
    if (id === 19) { // blinks shut at the end, then goes dark
      const u = t - 83.85;
      eye = u < 0 ? 3 : u < 0.12 ? 2 : u < 0.24 ? 1 : 0;
    }
    if (id === 16 || id === 18) eye = Math.sin(t * 23) > 0.92 ? 2 : 3;
    for (const m of this.eyeMats) { m.map = eyeTex(eye); m.color.setScalar(s.light === "red" ? 2.4 : 2.0); }
    const agOpen = id === 2 ? smooth((t - (W.offer - 0.1)) / 0.6) : id === 12 || id === 18 || id === 19 || id === 16 ? 1 : id === 14 ? 0.15 : 0;
    this.agLeaf.rotation.y = -1.5 * agOpen;
    this.agGlow.color.setRGB(1.0 + 1.2 * agOpen, 0.6 + 0.6 * agOpen, 0.9 + 0.6 * agOpen);
    if (s.light === "red") this.agGlow.color.setRGB(2.6, 0.7, 0.8);
    const crack = id === 10 ? smooth((t - (W.reasons - 0.7)) / 0.5) * 0.45 : 0;
    this.houseLeaf.rotation.y = -crack;
    this.storeGlow.visible = s.light !== "store";
    // lit panes a touch dimmer in red (the city holds its breath)
    for (const m of this.litMats) { if (s.light === "red") m.color.setRGB(1.3, 0.75, 0.75); else m.color.setRGB(1.5, 1.35, 1.15); }
    for (const m of this.lampPools) { if (s.light === "red") m.color.setRGB(0.4, 0.12, 0.1); else m.color.setRGB(0.42, 0.32, 0.18); }
    // ---- poster stamp + clue board strings ----
    if (id === 17) this.posterMat.map = this.posterTex(smooth((t - (W.tied - LEAD)) / 0.3));
    else this.posterMat.map = this.posterTex(0);
    if (id === 15) this.boardMat.map = this.boardTex(clamp01((t - (W.deeper - 0.2)) / (W.truth - W.deeper)));
    else this.boardMat.map = this.boardTex(id > 15 ? 1 : 0);
    // the IV bag sways after the friend vanishes
    this.ivBag.rotation.z = id === 13 && t > W.missing ? 0.06 * Math.exp(-(t - W.missing) * 1.2) * Math.sin((t - W.missing) * 6) : 0;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
void LIGHT_KEYS; void ({} as LK);
