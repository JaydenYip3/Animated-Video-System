// "nvidia-jensen-huang" world: four daylight exteriors on one big lawn (a Taiwan street with red lanterns, the grand
// Kentucky school, an Oregon pine road with a little house, the office building with its box mountain) + six sealed
// interiors far off (the 1996 office, the school bathroom, the diner, a gym with a table-tennis table, a lab, the data
// centre). update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
// All generic: no logos, no brand art, no readable text.
import * as THREE from "three";
import { Batch, boxGeo, quad, tri, V, lam, Kit, house, prop } from "./build";
import { ctex, rng, rep, planksHD, brick, cobbleHD, grassHD, stoneHD, cloudHD, CLOUD_DAY } from "./paint";
import { Pen, fxCalendar, fxScreen } from "./toon";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, W, LEAD, smooth, clamp01, add, V3, TOWN, SCHOOL, OREGON, HQ, OFFICE, BATH, DINER, GYM, LAB, DC, INSIDE_X,
  DESK_TOP, CASHBOX, MONITOR, CAL, CLOCK, COWORKERS, TOILETS_X, TOILET_Z, SINK, BOOTH, TT, pileK,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
const glowTex = () => ctex("njGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const tilesTex = (key: string, a: string, b: string, n = 8, line = "rgba(0,0,0,0.15)") => ctex(key, 512, 512, (g) => {
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect((i * 512) / n, (j * 512) / n, 512 / n, 512 / n); }
  g.strokeStyle = line; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo((i * 512) / n, 0); g.lineTo((i * 512) / n, 512); g.moveTo(0, (i * 512) / n); g.lineTo(512, (i * 512) / n); g.stroke(); }
});
/** wall with a lower panel (wainscot) and a stripe */
const wallTex = (key: string, top: string, low: string, stripe: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = top; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + 0.02 * r()})`; g.fillRect(r() * 512, r() * 512, 10 + 30 * r(), 6 + 16 * r()); }
  g.fillStyle = low; g.fillRect(0, 330, 512, 182);
  g.fillStyle = stripe; g.fillRect(0, 318, 512, 16);
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let x = 0; x < 512; x += 64) g.fillRect(x, 340, 3, 172);
});
const carpet = () => ctex("njCarpet", 512, 512, (g, r) => {
  g.fillStyle = "#6c7890"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) { const v = 90 + 40 * r(); g.fillStyle = `rgba(${v},${v + 8},${v + 30},0.35)`; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const ceilTiles = () => ctex("njCeil", 256, 256, (g) => {
  g.fillStyle = "#e6e2d8"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#b8b2a4"; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
});
/** daylight window: sky + a few clouds + a tree top, with a frame and cross bars */
const windowTex = (key: string, trees = true) => ctex(key, 256, 200, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#4f8cdb"); gr.addColorStop(1, "#b8d0ec");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 200);
  g.fillStyle = "#fbf8f1"; for (const [x, y, s] of [[60, 50, 1], [180, 80, 0.8]]) { g.beginPath(); g.ellipse(x, y, 34 * s, 14 * s, 0, 0, 7); g.ellipse(x + 20 * s, y - 8 * s, 22 * s, 14 * s, 0, 0, 7); g.fill(); }
  if (trees) { g.fillStyle = "#5aa83c"; for (const [x, r] of [[40, 50], [120, 40], [210, 55]]) { g.beginPath(); g.arc(x, 200, r, 0, 7); g.fill(); } }
  g.strokeStyle = "#f0ece2"; g.lineWidth = 14; g.strokeRect(0, 0, 256, 200); g.lineWidth = 8; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 200); g.moveTo(0, 100); g.lineTo(256, 100); g.stroke();
});
const nightWindowTex = () => ctex("njWinNight", 256, 200, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#0b1233"); gr.addColorStop(1, "#2c376a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 200);
  g.fillStyle = "#ffd27a"; for (let i = 0; i < 14; i++) g.fillRect(20 + ((i * 53) % 220), 120 + ((i * 31) % 60), 6, 8);
  g.fillStyle = "#e8eeff"; g.beginPath(); g.arc(190, 50, 16, 0, 7); g.fill();
  g.strokeStyle = "#5a5662"; g.lineWidth = 14; g.strokeRect(0, 0, 256, 200); g.lineWidth = 8; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 200); g.moveTo(0, 100); g.lineTo(256, 100); g.stroke();
});
const whiteboard = () => ctex("njWhiteboard", 512, 320, (g) => {
  g.fillStyle = "#f4f6f4"; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "#9aa0a8"; g.lineWidth = 14; g.strokeRect(0, 0, 512, 320);
  g.lineCap = "round"; g.lineWidth = 6;
  g.strokeStyle = "#2a5ac8"; g.strokeRect(60, 70, 110, 110); g.strokeRect(90, 100, 50, 50);
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(75 + i * 20, 70); g.lineTo(75 + i * 20, 50); g.moveTo(75 + i * 20, 180); g.lineTo(75 + i * 20, 200); g.stroke(); }
  g.strokeStyle = "#d8343a"; g.beginPath(); g.moveTo(200, 125); g.lineTo(290, 125); g.lineTo(275, 110); g.moveTo(290, 125); g.lineTo(275, 140); g.stroke();
  g.strokeStyle = "#2a9a4a"; g.beginPath(); g.moveTo(320, 220); g.lineTo(360, 160); g.lineTo(400, 190); g.lineTo(450, 90); g.stroke();
  g.strokeStyle = "#2a2a30"; g.beginPath(); g.moveTo(320, 240); g.lineTo(470, 240); g.moveTo(320, 240); g.lineTo(320, 80); g.stroke();
});
const chalkboard = () => ctex("njChalk", 1024, 440, (g) => {
  g.fillStyle = "#2d4a3a"; g.fillRect(0, 0, 1024, 440);
  g.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 40; i++) g.fillRect(i * 26, 0, 12, 440);
  g.strokeStyle = "#8a6a44"; g.lineWidth = 24; g.strokeRect(0, 0, 1024, 440);
  g.strokeStyle = "rgba(240,240,230,0.85)"; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round";
  // a resistor, a capacitor, a battery, wires: a little circuit
  g.beginPath(); g.moveTo(80, 120); g.lineTo(180, 120);
  for (let i = 0; i < 6; i++) g.lineTo(195 + i * 16, i % 2 ? 100 : 140);
  g.lineTo(300, 120); g.lineTo(400, 120); g.lineTo(400, 180); g.moveTo(370, 180); g.lineTo(430, 180); g.moveTo(370, 200); g.lineTo(430, 200);
  g.moveTo(400, 200); g.lineTo(400, 300); g.lineTo(80, 300); g.lineTo(80, 230); g.moveTo(50, 230); g.lineTo(110, 230); g.moveTo(65, 210); g.lineTo(95, 210); g.moveTo(80, 210); g.lineTo(80, 120); g.stroke();
  // a transistor
  g.beginPath(); g.arc(600, 200, 60, 0, 7); g.moveTo(580, 160); g.lineTo(580, 240); g.moveTo(520, 200); g.lineTo(580, 200); g.moveTo(580, 180); g.lineTo(630, 140); g.lineTo(630, 100); g.moveTo(580, 220); g.lineTo(630, 260); g.lineTo(630, 300); g.stroke();
  // a sine wave and an arrow
  g.beginPath(); for (let x = 0; x <= 260; x += 4) g.lineTo(720 + x, 150 + 50 * Math.sin(x / 26)); g.stroke();
  g.beginPath(); g.moveTo(720, 320); g.lineTo(960, 320); g.lineTo(935, 300); g.moveTo(960, 320); g.lineTo(935, 340); g.stroke();
  g.strokeStyle = "rgba(255,230,140,0.85)"; g.beginPath(); g.arc(860, 320, 30, 0, 7); g.stroke();
});
const ttTex = () => ctex("njTT", 256, 512, (g) => {
  g.fillStyle = "#2b6e9a"; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = "#f4f4f0"; g.lineWidth = 10; g.strokeRect(5, 5, 246, 502); g.lineWidth = 4; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 512); g.stroke();
});
const netTex = () => ctex("njNet", 256, 32, (g) => {
  g.clearRect(0, 0, 256, 32); g.strokeStyle = "rgba(30,30,40,0.85)"; g.lineWidth = 2;
  for (let x = 0; x < 256; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 32); g.stroke(); }
  for (let y = 0; y < 32; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.fillStyle = "#f4f4f0"; g.fillRect(0, 0, 256, 5);
});
const pennants = () => ctex("njPennants", 1024, 128, (g) => {
  g.clearRect(0, 0, 1024, 128);
  const cols = ["#e2453c", "#f2b33a", "#3f8fd8", "#5fbf5a", "#c25ac9"];
  g.strokeStyle = "#3a3440"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 12); g.quadraticCurveTo(512, 40, 1024, 12); g.stroke();
  for (let i = 0; i < 16; i++) { const x = 20 + i * 63, y = 14 + 26 * Math.sin((i / 15) * Math.PI) * 0.9; g.fillStyle = cols[i % 5]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 46, y + 2); g.lineTo(x + 22, y + 90); g.closePath(); g.fill(); g.stroke(); }
});
const scopeTex = () => ctex("njScope", 256, 192, (g) => {
  g.fillStyle = "#0e2a1e"; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = "rgba(120,255,160,0.25)"; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 192); g.stroke(); }
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); }
  g.strokeStyle = "#7aff9a"; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= 256; x += 4) g.lineTo(x, 96 + 50 * Math.sin(x / 20)); g.stroke();
});
/** server rack face: unit rows with LED dots + vents (wall colour) */
const rackTex = () => ctex("njRack", 256, 1024, (g, r) => {
  g.fillStyle = "#1c2228"; g.fillRect(0, 0, 256, 1024);
  for (let y = 16; y < 1010; y += 44) {
    g.fillStyle = "#2a323a"; g.fillRect(12, y, 232, 38);
    g.fillStyle = "#151a1f"; for (let x = 70; x < 230; x += 10) g.fillRect(x, y + 8, 5, 22);
  }
  g.strokeStyle = "#0a0d10"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 1016);
  void r;
});
/** the LED overlay for the racks (additive, pulses) */
const ledTex = (seed: number) => ctex("njLed" + seed, 256, 1024, (g) => {
  const r = rng(seed);
  g.clearRect(0, 0, 256, 1024);
  for (let y = 16; y < 1010; y += 44) {
    for (let i = 0; i < 4; i++) if (r() < 0.8) { const c = r() < 0.65 ? "#4dff8a" : r() < 0.5 ? "#5ad8ff" : "#ffd25a"; g.fillStyle = c; g.fillRect(20 + i * 11, y + 14, 7, 7); }
    if (r() < 0.5) { g.fillStyle = "rgba(90,220,255,0.55)"; g.fillRect(70, y + 32, 160 * r(), 3); }
  }
});
const dcFloor = () => ctex("njDcFloor", 512, 512, (g) => {
  g.fillStyle = "#1e262c"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#0e1418"; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  g.fillStyle = "#2a343c"; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 9; k++) g.fillRect(i * 128 + 20 + (k % 3) * 34, j * 128 + 20 + Math.floor(k / 3) * 34, 18, 18);
});
/** a retail box with a generic graphics-card picture (no logo, no text) */
const boxArt = () => ctex("njBoxArt", 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "#2a2f36"); gr.addColorStop(1, "#14171b");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#5ad070"; g.fillRect(0, 196, 256, 22); g.fillRect(0, 30, 18, 140);
  g.fillStyle = "#3a4048"; g.fillRect(50, 70, 170, 96);
  for (const cx of [100, 175]) { g.fillStyle = "#1a1d22"; g.beginPath(); g.arc(cx, 118, 32, 0, 7); g.fill(); g.strokeStyle = "#5ad070"; g.lineWidth = 5; g.beginPath(); g.arc(cx, 118, 10, 0, 7); g.stroke(); }
  g.strokeStyle = "#0a0b0d"; g.lineWidth = 10; g.strokeRect(0, 0, 256, 256);
});
const officeFacade = () => ctex("njHqFacade", 1024, 512, (g) => {
  g.fillStyle = "#e6dcc6"; g.fillRect(0, 0, 1024, 512);
  for (const y0 of [70, 250]) {
    g.fillStyle = "#3a6a9a"; g.fillRect(30, y0, 964, 120);
    g.fillStyle = "rgba(255,255,255,0.22)"; for (let x = 30; x < 994; x += 120) g.fillRect(x + 10, y0 + 8, 40, 104);
    g.fillStyle = "#c8bea8"; for (let x = 30; x <= 994; x += 60) g.fillRect(x - 3, y0, 6, 120);
    g.fillStyle = "#b8ae98"; g.fillRect(20, y0 + 120, 984, 14);
  }
  g.fillStyle = "#2a4a6a"; g.fillRect(452, 400, 120, 112); g.fillStyle = "#c8bea8"; g.fillRect(509, 400, 6, 112);
});
const schoolFacade = () => ctex("njSchool", 2048, 680, (g) => {
  // 24 m x 8 m brick front: windows at x = +-2, +-4.6, +-7, +-10 m (two rows), the door in the middle (x 0)
  const sx = 2048 / 24, sy = 680 / 8, X = (m: number) => (m + 12) * sx, Y = (m: number) => 680 - m * sy;
  g.fillStyle = "#b8604a"; g.fillRect(0, 0, 2048, 680);
  const r = rng(7);
  for (let row = 0; row < 40; row++) for (let i = -1; i < 60; i++) {
    const v = 0.88 + 0.2 * r(); g.fillStyle = `rgba(${v > 1 ? 255 : 40},${v > 1 ? 220 : 20},${v > 1 ? 200 : 10},${Math.abs(v - 1) * 0.5})`;
    g.fillRect(i * 36 + (row % 2) * 18 + 1, row * 17 + 1, 33, 14);
  }
  g.fillStyle = "rgba(60,20,10,0.25)"; for (let row = 0; row < 40; row++) g.fillRect(0, row * 17, 2048, 2);
  g.fillStyle = "#efe6d2"; g.fillRect(0, Y(4.0), 2048, 14); g.fillRect(0, Y(0.6), 2048, 18);
  for (const xm of [-10, -7, -4.6, -2, 2, 4.6, 7, 10]) for (const yb of [1.3, 4.4]) {
    g.fillStyle = "#efe6d2"; g.fillRect(X(xm - 0.68), Y(yb + 2.15), (1.36) * sx, (2.3) * sy);
    g.fillStyle = "#2a3e66"; g.fillRect(X(xm - 0.52), Y(yb + 2.0), 1.04 * sx, 2.0 * sy);
    g.fillStyle = "rgba(160,200,255,0.35)"; g.fillRect(X(xm - 0.52), Y(yb + 2.0), 0.4 * sx, 2.0 * sy);
    g.fillStyle = "#efe6d2"; g.fillRect(X(xm - 0.03), Y(yb + 2.0), 0.06 * sx, 2.0 * sy); g.fillRect(X(xm - 0.52), Y(yb + 1.05), 1.04 * sx, 0.06 * sy);
  }
  g.fillStyle = "#efe6d2"; g.fillRect(X(-0.85), Y(3.4), 1.7 * sx, 3.4 * sy);
  g.fillStyle = "#5a3a2a"; g.fillRect(X(-0.7), Y(3.2), 1.4 * sx, 3.2 * sy);
  g.fillStyle = "#3a2418"; g.fillRect(X(-0.02), Y(3.2), 0.04 * sx, 3.2 * sy);
  g.fillStyle = "#d8b04a"; g.fillRect(X(-0.2), Y(1.6), 0.1 * sx, 0.1 * sy); g.fillRect(X(0.1), Y(1.6), 0.1 * sx, 0.1 * sy);
});
const asphalt = () => ctex("njAsphalt", 512, 512, (g, r) => {
  g.fillStyle = "#6a6872"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) { const v = 80 + 50 * r(); g.fillStyle = `rgba(${v},${v},${v + 8},0.35)`; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const lotLines = () => ctex("njLot", 512, 128, (g) => { g.clearRect(0, 0, 512, 128); g.fillStyle = "#f4f0e2"; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 10, 128); });
const lanternTex = () => ctex("njLantern", 128, 160, (g) => {
  g.clearRect(0, 0, 128, 160);
  g.fillStyle = "#e23a32"; g.beginPath(); g.ellipse(64, 84, 54, 60, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(120,10,10,0.6)"; g.lineWidth = 4; for (const k of [-0.6, -0.2, 0.2, 0.6]) { g.beginPath(); g.ellipse(64, 84, 54 * Math.abs(k) + 2, 60, 0, 0, 7); g.stroke(); }
  g.fillStyle = "#f2c83a"; g.fillRect(40, 18, 48, 14); g.fillRect(40, 138, 48, 14);
  g.strokeStyle = "#241726"; g.lineWidth = 6; g.beginPath(); g.ellipse(64, 84, 54, 60, 0, 0, 7); g.stroke();
});

const LKEYS = ["day", "indoor", "lamp", "night", "dc"] as const;
type LK = (typeof LKEYS)[number];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#b8d0ec", 25, 300);
  private clouds: { s: THREE.Sprite; dir: THREE.Vector3; size: number }[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private panels: THREE.MeshBasicMaterial[] = [];
  private lampGlow: THREE.Sprite;
  private screenMat: THREE.MeshBasicMaterial;
  private calMat: THREE.MeshBasicMaterial;
  private winDay: THREE.Mesh; private winNight: THREE.Mesh;
  private lid = new THREE.Group();
  private plates: THREE.Mesh[] = [];
  private boxes: THREE.InstancedMesh; private slots: { p: THREE.Vector3; t: number; rot: number }[] = [];
  private leds: THREE.MeshBasicMaterial[] = [];
  private dcStrips: THREE.MeshBasicMaterial[] = [];
  private lanterns: THREE.Sprite[] = [];
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
  /** a sealed box room (inward faces only) */
  private room(b: Batch, c: V3, X0: number, X1: number, Z0: number, Z1: number, H: number, wall: THREE.Material, floor: THREE.Material, ceil: THREE.Material, skirt = "#3a2a24") {
    const x0 = c[0] + X0, x1 = c[0] + X1, z0 = c[2] + Z0, z1 = c[2] + Z1, u = (X1 - X0) / 3, v = (Z1 - Z0) / 3, hv = H / 3;
    b.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, H, z0), V(x0, H, z0), u, hv), wall);
    b.add(quad(V(x1, 0, z1), V(x0, 0, z1), V(x0, H, z1), V(x1, H, z1), u, hv), wall);
    b.add(quad(V(x0, 0, z1), V(x0, 0, z0), V(x0, H, z0), V(x0, H, z1), v, hv), wall);
    b.add(quad(V(x1, 0, z0), V(x1, 0, z1), V(x1, H, z1), V(x1, H, z0), v, hv), wall);
    b.add(quad(V(x0, 0.001, z1), V(x1, 0.001, z1), V(x1, 0.001, z0), V(x0, 0.001, z0), u, v), floor);
    b.add(quad(V(x0, H, z0), V(x1, H, z0), V(x1, H, z1), V(x0, H, z1), u, v), ceil);
    const sk = lam("njSkirt" + skirt, () => ({ color: skirt }));
    b.add(boxGeo(V(x0, 0, z0), V(x1, 0.1, z0 + 0.03)), sk);
    b.add(boxGeo(V(x0, 0, z0), V(x0 + 0.03, 0.1, z1)), sk);
    b.add(boxGeo(V(x1 - 0.03, 0, z0), V(x1, 0.1, z1)), sk);
  }
  /** a ceiling light panel (emissive, dims with the light preset) */
  private panel(x: number, y: number, z: number, w = 1.2, d = 0.4) {
    const p = this.plane(null, w, d, V(x, y - 0.01, z), 0, new THREE.Color(2.4, 2.4, 2.2));
    p.mesh.rotation.x = Math.PI / 2; this.panels.push(p.m);
  }
  private desk(b: Batch, x: number, z: number, w = 1.5, d = 0.8, col = "#a87a52") {
    const top = lam("njDeskTop" + col, () => ({ color: col })), side = lam("njDeskSide", () => ({ color: "#7a5a3c" }));
    b.add(boxGeo(V(x - w / 2, DESK_TOP - 0.04, z - d / 2), V(x + w / 2, DESK_TOP, z + d / 2)), top);
    b.add(boxGeo(V(x - w / 2 + 0.02, 0, z - d / 2 + 0.05), V(x - w / 2 + 0.06, DESK_TOP - 0.04, z + d / 2 - 0.05)), side);
    b.add(boxGeo(V(x + w / 2 - 0.06, 0, z - d / 2 + 0.05), V(x + w / 2 - 0.02, DESK_TOP - 0.04, z + d / 2 - 0.05)), side);
    b.add(boxGeo(V(x - w / 2 + 0.06, 0.35, z + d / 2 - 0.06), V(x + w / 2 - 0.06, DESK_TOP - 0.04, z + d / 2 - 0.03)), side); // modesty panel (faces the lens)
  }
  /** beige CRT monitor (screen faces +z), screen material optional */
  private crt(b: Batch, x: number, y: number, z: number, screen?: THREE.MeshBasicMaterial) {
    const beige = lam("njCrt", () => ({ color: "#d8d0bc" })), dark = lam("njCrtBack", () => ({ color: "#b8ae98" }));
    b.add(boxGeo(V(x - 0.22, y + 0.06, z - 0.2), V(x + 0.22, y + 0.44, z + 0.2)), beige);
    b.add(boxGeo(V(x - 0.16, y + 0.1, z - 0.42), V(x + 0.16, y + 0.4, z - 0.2)), dark);
    b.add(boxGeo(V(x - 0.12, y, z - 0.12), V(x + 0.12, y + 0.06, z + 0.12)), dark);
    b.add(boxGeo(V(x - 0.24, y - 0.0, z + 0.22), V(x + 0.24, y + 0.025, z + 0.38)), lam("njKeyb", () => ({ color: "#cfc6b0" })));
    const scr = screen ?? new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.42, 0.55) });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.27), scr);
    m.position.set(x, y + 0.25, z + 0.205); m.layers.set(NOINK); this.root.add(m);
  }

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky ----
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
    // clouds: camera-relative sprites (infinitely far), day only
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3 * Math.sin(i * 3.1), el = THREE.MathUtils.degToRad(7 + 9 * ((i * 37) % 10) / 10);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(i % 4, CLOUD_DAY), fog: false, depthWrite: false, transparent: true }));
      s.renderOrder = -0.5; s.frustumCulled = false; s.layers.set(NOINK); R.add(s);
      this.clouds.push({ s, dir: V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), size: 160 + 80 * ((i * 53) % 7) / 7 });
    }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);

    const b = new Batch();
    // ---- the lawn under every exterior ----
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), lam("njLawn", () => ({ map: rep(grassHD(), 300, 300) })));
    lawn.receiveShadow = true; R.add(lawn);
    this.buildTown(b); this.buildSchool(b); this.buildOregon(b); this.buildHQ(b);
    this.buildOffice(b); this.buildBath(b); this.buildDiner(b); this.buildGym(b); this.buildLab(b); this.buildDC(b);
    b.build(R);
  }

  // ======================= exteriors =======================
  private buildTown(b: Batch) {
    const [cx, , cz] = TOWN;
    b.add(boxGeo(V(cx - 40, 0, cz - 7.2), V(cx + 40, 0.02, cz + 6)), lam("njPlaza", () => ({ map: rep(cobbleHD(), 40, 6.6) })));
    let si = 0;
    for (const [x, w, h] of [[-15.5, 6.5, 6.2], [-8.6, 6.8, 8.4], [-1.7, 6.5, 7.0], [5.2, 6.8, 9.8], [12.2, 6.6, 7.0], [19, 6.5, 8.4]] as const) {
      house(b, cx + x, cz - 10.4, 0, w, 6, h, si++, 0);
    }
    for (const [x, z, h] of [[-5.2, -6.3, 4.6], [8.7, -6.4, 5.2], [-12, -5.8, 4.2], [16, -5.2, 4.8]] as const) prop(b, {}, "tree_oak", cx + x, 0, cz + z, h);
    // a string of red lanterns between two poles
    const pole = lam("njPole", () => ({ color: "#5a3a2a" }));
    for (const x of [-4.2, 4.6]) b.add(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 10), pole, new THREE.Matrix4().makeTranslation(cx + x, 2.1, cz - 5.6));
    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7, x = -4.2 + 8.8 * u, y = 3.95 - 0.55 * Math.sin(u * Math.PI);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lanternTex(), color: new THREE.Color(1.15, 1.05, 1.0), transparent: true, alphaTest: 0.3 }));
      s.position.set(cx + x, y - 0.25, cz - 5.6); s.scale.set(0.5, 0.62, 1); s.layers.set(NOINK); this.root.add(s); this.lanterns.push(s);
    }
    // the string itself
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(V(cx - 4.2 + 8.8 * u, 4.0 - 0.6 * Math.sin(u * Math.PI), cz - 5.6)); }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 5), lam("njString", () => ({ color: "#2a2228" })));
  }
  private buildSchool(b: Batch) {
    const [cx, , cz] = SCHOOL, F = cz - 10; // front plane of the main block
    b.add(boxGeo(V(cx - 0.9, 0, F + 0.5), V(cx + 0.9, 0.03, cz + 6)), lam("njPath", () => ({ map: rep(stoneHD("njPathStone"), 1, 8) })));
    const brickM = lam("njSchoolBrick", () => ({ map: rep(brick(), 3, 2) })), trim = lam("njTrim", () => ({ color: "#efe6d2" }));
    b.add(boxGeo(V(cx - 12, 0, F - 8), V(cx + 12, 8, F)), brickM);
    b.add(quad(V(cx - 12, 0, F + 0.01), V(cx + 12, 0, F + 0.01), V(cx + 12, 8, F + 0.01), V(cx - 12, 8, F + 0.01)), lam("njSchoolF", () => ({ map: schoolFacade() })));
    b.add(boxGeo(V(cx - 12.2, 7.6, F - 8.2), V(cx + 12.2, 8.3, F + 0.25)), trim);
    // hipped roof (two slopes) + the tower
    const roofM = lam("njSchoolRoof", () => ({ color: "#4a4f5c" }));
    b.add(quad(V(cx - 12.2, 8.3, F + 0.25), V(cx + 12.2, 8.3, F + 0.25), V(cx + 11, 10.6, F - 4), V(cx - 11, 10.6, F - 4)), roofM);
    b.add(tri(V(cx - 12.2, 8.3, F + 0.25), V(cx - 11, 10.6, F - 4), V(cx - 12.2, 8.3, F - 8.2)), roofM);
    b.add(tri(V(cx + 12.2, 8.3, F + 0.25), V(cx + 12.2, 8.3, F - 8.2), V(cx + 11, 10.6, F - 4)), roofM);
    b.add(boxGeo(V(cx - 1.6, 8, F - 5.5), V(cx + 1.6, 12.6, F - 2.3)), brickM);
    b.add(boxGeo(V(cx - 1.8, 12.4, F - 5.7), V(cx + 1.8, 12.8, F - 2.1)), trim);
    for (const [x, z] of [[-1.4, -2.5], [1.4, -2.5], [-1.4, -5.3], [1.4, -5.3]]) b.add(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8), trim, new THREE.Matrix4().makeTranslation(cx + x, 13.6, F + z));
    b.add(new THREE.ConeGeometry(2.3, 2.6, 4).rotateY(Math.PI / 4), roofM, new THREE.Matrix4().makeTranslation(cx, 15.7, F - 3.9));
    b.add(new THREE.SphereGeometry(0.42, 14, 10), lam("njBell", () => ({ color: "#d8b04a" })), new THREE.Matrix4().makeTranslation(cx, 13.5, F - 3.9));
    // portico: steps, four columns, entablature, pediment
    for (let i = 0; i < 3; i++) b.add(boxGeo(V(cx - 4.4 + i * 0.15, 0, F + 1.9 - i * 0.45), V(cx + 4.4 - i * 0.15, 0.17 * (i + 1), F + 0.01)), lam("njSteps", () => ({ map: rep(stoneHD("njStepStone"), 3, 1) })));
    for (const x of [-3, -1, 1, 3]) {
      b.add(new THREE.CylinderGeometry(0.27, 0.32, 6.0, 16), trim, new THREE.Matrix4().makeTranslation(cx + x, 0.51 + 3.0, F + 1.0));
      b.add(boxGeo(V(cx + x - 0.42, 0.51, F + 0.58), V(cx + x + 0.42, 0.75, F + 1.42)), trim);
    }
    b.add(boxGeo(V(cx - 3.8, 6.5, F + 0.2), V(cx + 3.8, 7.2, F + 1.5)), trim);
    b.add(tri(V(cx - 4.0, 7.2, F + 1.5), V(cx + 4.0, 7.2, F + 1.5), V(cx, 8.9, F + 1.5)), lam("njPed", () => ({ color: "#f4ecd8" })));
    b.add(quad(V(cx - 4.0, 7.2, F + 1.5), V(cx, 8.9, F + 1.5), V(cx, 8.9, F + 0.2), V(cx - 4.0, 7.2, F + 0.2)), roofM);
    b.add(quad(V(cx, 8.9, F + 1.5), V(cx + 4.0, 7.2, F + 1.5), V(cx + 4.0, 7.2, F + 0.2), V(cx, 8.9, F + 0.2)), roofM);
    // trees and hedges along the lawn
    for (const [x, z, h, k] of [[-7, -4.5, 6.5, "tree_oak"], [7.5, -4.8, 7, "tree_oak"], [-13, -1, 7.5, "tree_fat"], [13.5, -1.5, 7, "tree_fat"], [-18, -6, 8, "tree_oak"], [18, -6, 8, "tree_oak"]] as const)
      prop(b, {}, k, cx + x, 0, cz + z, h);
    for (const x of [-6, -3, 3, 6]) prop(b, {}, "plant_bushLarge", cx + x, 0, F + 2.6, 1.1);
    // a low iron fence across the front with a gap for the path
    const iron = lam("njIron", () => ({ color: "#2a2a32" }));
    for (let x = -14; x <= 14; x += 0.5) if (Math.abs(x) > 1.2) b.add(boxGeo(V(cx + x - 0.025, 0, cz + 5.5), V(cx + x + 0.025, 1.0, cz + 5.55)), iron);
    for (const y of [0.25, 0.9]) for (const s of [-1, 1]) b.add(boxGeo(V(cx + (s < 0 ? -14 : 1.2), y, cz + 5.5), V(cx + (s < 0 ? -1.2 : 14), y + 0.05, cz + 5.56)), iron);
  }
  private buildOregon(b: Batch) {
    const [cx, , cz] = OREGON;
    b.add(boxGeo(V(cx - 60, 0, cz + 1.6), V(cx + 60, 0.02, cz + 5.6)), lam("njRoad", () => ({ map: rep(asphalt(), 30, 1) })));
    house(b, cx + 4.2, cz - 6.0, 0, 7, 6, 3.4, 4, 0);
    house(b, cx - 9.5, cz - 8.5, 0, 6.5, 6, 3.2, 1, 0);
    // pines everywhere: the backdrop, the flanks
    const r = rng(11);
    for (let i = 0; i < 46; i++) {
      const x = -34 + 68 * r(), z = -40 + 32 * r(), h = 9 + 9 * r();
      if (Math.abs(x - 4.2) < 5 && z > -12) continue;
      if (Math.abs(x + 9.5) < 4.5 && z > -14) continue;
      prop(b, {}, "tree_cone", cx + x, 0, cz + z, h);
    }
    for (const [x, z, h] of [[-9.5, -1.5, 11], [-14, 1.0, 13], [11.5, -1.0, 12], [16, 1.5, 14], [-19, 3.5, 12], [21, 0.8, 11]] as const) prop(b, {}, "tree_cone", cx + x, 0, cz + z, h);
    // a far snowy mountain
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(110, 85, 7), lam("njMtn", () => ({ color: "#6a7fa8" })));
    mtn.position.set(cx + 60, 42, cz - 260); this.root.add(mtn);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(36, 28, 7), lam("njSnow", () => ({ color: "#f4f6fa" })));
    cap.position.set(cx + 60, 71, cz - 260 + 0.5); this.root.add(cap);
    // the family car
    const car = lam("njCar", () => ({ color: "#3f8fd8" })), glass = lam("njGlass", () => ({ color: "#bfe0f0" })), tyre = lam("njTyre", () => ({ color: "#222226" }));
    const X = cx + 5.0, Z = cz + 0.2;
    b.add(boxGeo(V(X - 2.1, 0.35, Z - 0.85), V(X + 2.1, 1.0, Z + 0.85)), car);
    b.add(boxGeo(V(X - 1.2, 1.0, Z - 0.78), V(X + 0.9, 1.6, Z + 0.78)), glass);
    b.add(boxGeo(V(X - 1.25, 1.58, Z - 0.8), V(X + 0.95, 1.66, Z + 0.8)), car);
    for (const [x, z] of [[-1.35, -0.85], [1.35, -0.85], [-1.35, 0.85], [1.35, 0.85]]) b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16).rotateX(Math.PI / 2), tyre, new THREE.Matrix4().makeTranslation(X + x, 0.36, Z + z));
    // mailbox + fence by the house
    b.add(boxGeo(V(cx + 1.0, 0, cz - 1.4), V(cx + 1.08, 1.1, cz - 1.32)), lam("njPost", () => ({ color: "#7a5a3c" })));
    b.add(boxGeo(V(cx + 0.85, 1.1, cz - 1.55), V(cx + 1.25, 1.35, cz - 1.15)), lam("njMail", () => ({ color: "#d8343a" })));
  }
  private buildHQ(b: Batch) {
    const [cx, , cz] = HQ;
    b.add(boxGeo(V(cx - 30, 0, cz - 16), V(cx + 30, 0.02, cz + 14)), lam("njLotA", () => ({ map: rep(asphalt(), 15, 7.5) })));
    const lines = this.plane(rep(lotLines(), 8, 1), 32, 3, V(cx, 0.03, cz + 10), 0); lines.mesh.rotation.x = -Math.PI / 2; lines.m.fog = true;
    b.add(boxGeo(V(cx - 14, 0, cz - 26), V(cx + 14, 9, cz - 16)), lam("njHqWall", () => ({ color: "#e0d6c0" })));
    b.add(quad(V(cx - 14, 0, cz - 15.99), V(cx + 14, 0, cz - 15.99), V(cx + 14, 9, cz - 15.99), V(cx - 14, 9, cz - 15.99)), lam("njHqF", () => ({ map: officeFacade() })));
    b.add(boxGeo(V(cx - 14.2, 9, cz - 26.2), V(cx + 14.2, 9.5, cz - 15.8)), lam("njHqRoof", () => ({ color: "#9a9284" })));
    for (const [x, z, h] of [[-18, -10, 7], [18, -9, 7.5], [-22, 2, 6.5], [22, 3, 7], [-26, -16, 8], [26, -17, 8]] as const) prop(b, {}, "tree_oak", cx + x, 0, cz + z, h);
    for (const x of [-10, -6, 6, 10]) prop(b, {}, "plant_bushLarge", cx + x, 0, cz - 15.2, 1.0);
    // the box mountain: slots in a stepped pyramid behind the founders; each box lands at its own time
    const BW = 0.62, BH = 0.42, BD = 0.46;
    const slots: { p: THREE.Vector3; t: number; rot: number }[] = [];
    let layer = 0;
    for (let nx = 13, nz = 7; nx > 0 && nz > 0; nx -= 1, nz -= 1, layer++) {
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x = cx + (i - (nx - 1) / 2) * BW * 1.02, z = cz - 6.2 + (j - (nz - 1) / 2) * BD * 1.04, y = BH / 2 + layer * BH;
        slots.push({ p: V(x, y, z), t: 0, rot: 0 });
      }
      if (layer > 9) break;
    }
    // landing order: bottom layers first, inside each layer at random; times spread over pileK's 0..1
    const r = rng(23);
    slots.forEach((s, i) => { s.t = i / slots.length + 0.04 * (r() - 0.5); s.rot = (r() - 0.5) * 0.3; });
    this.slots = slots;
    const geo = new THREE.BoxGeometry(BW, BH, BD);
    this.boxes = new THREE.InstancedMesh(geo, lam("njBox", () => ({ map: boxArt() })), slots.length);
    this.boxes.castShadow = true; this.boxes.receiveShadow = true; this.boxes.frustumCulled = false;
    this.root.add(this.boxes);
  }

  // ======================= interiors =======================
  private buildOffice(b: Batch) {
    const O = OFFICE, [ox, , oz] = O;
    this.room(b, O, -3.5, 3.5, -5.5, 4.0, 3.0, lam("njOfficeW", () => ({ map: rep(wallTex("njOfficeWT", "#e8dcc0", "#b8a888", "#8a6a4a"), 1, 1) })),
      lam("njOfficeF", () => ({ map: rep(carpet(), 4, 4) })), lam("njOfficeC", () => ({ map: rep(ceilTiles(), 7, 9) })));
    for (const z of [-4.2, -1.6, 1.2]) for (const x of [-1.6, 1.6]) this.panel(ox + x, 3.0, oz + z);
    // Jensen's desk + the coworkers' desks
    this.desk(b, ox, oz - 4.05, 1.7, 0.8, "#b08458");
    COWORKERS.forEach((c) => { if (c.sit) { this.desk(b, ox + c.at[0], oz + c.at[2] + 0.6, 1.3, 0.7); this.crt(b, ox + c.at[0] - 0.3, DESK_TOP, oz + c.at[2] + 0.55); } });
    // Jensen's monitor (its screen changes per shot)
    this.screenMat = new THREE.MeshBasicMaterial({ map: ctex("njScr0", 400, 300, (g) => { const p = new Pen(g); fxScreen(p, -1); }) });
    this.crt(b, ox + MONITOR[0], DESK_TOP, oz + MONITOR[2], this.screenMat);
    // the cash box: green-grey tin, lid hinged at the back
    const tin = lam("njTin", () => ({ color: "#5a7a6a" })), tinIn = lam("njTinIn", () => ({ color: "#2a302c" }));
    const [bx, , bz] = add(O, CASHBOX);
    for (const [a, c] of [[V(bx - 0.16, DESK_TOP, bz + 0.09), V(bx + 0.16, DESK_TOP + 0.11, bz + 0.11)], [V(bx - 0.16, DESK_TOP, bz - 0.11), V(bx + 0.16, DESK_TOP + 0.11, bz - 0.09)],
      [V(bx - 0.16, DESK_TOP, bz - 0.11), V(bx - 0.14, DESK_TOP + 0.11, bz + 0.11)], [V(bx + 0.14, DESK_TOP, bz - 0.11), V(bx + 0.16, DESK_TOP + 0.11, bz + 0.11)]] as const) b.add(boxGeo(a, c), tin);
    b.add(quad(V(bx - 0.14, DESK_TOP + 0.012, bz + 0.09), V(bx + 0.14, DESK_TOP + 0.012, bz + 0.09), V(bx + 0.14, DESK_TOP + 0.012, bz - 0.09), V(bx - 0.14, DESK_TOP + 0.012, bz - 0.09)), tinIn);
    const lidM = new THREE.Mesh(boxGeo(V(-0.165, 0, 0), V(0.165, 0.035, 0.23)), tin);
    lidM.castShadow = true; this.lid.add(lidM); this.lid.position.set(bx, DESK_TOP + 0.11, bz - 0.115); this.root.add(this.lid);
    // a mug, a pencil cup, papers
    b.add(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), lam("njMug", () => ({ color: "#d8434a" })), new THREE.Matrix4().makeTranslation(ox + 0.72, DESK_TOP + 0.05, oz - 4.2));
    b.add(boxGeo(V(ox - 0.05, DESK_TOP, oz - 4.3), V(ox + 0.25, DESK_TOP + 0.012, oz - 4.08)), lam("njPaper", () => ({ color: "#f4f2ea" })));
    // the desk lamp (lamp-lit shots)
    const metal = lam("njLampM", () => ({ color: "#2f5a4a" }));
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), metal, new THREE.Matrix4().makeTranslation(ox + 0.78, DESK_TOP + 0.21, oz - 4.3));
    b.add(new THREE.ConeGeometry(0.11, 0.13, 14, 1, true), lam("njLampShade", () => ({ color: "#2f7a5a", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(ox + 0.7, DESK_TOP + 0.43, oz - 4.25));
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.5, 1.1, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.lampGlow.position.set(ox + 0.7, DESK_TOP + 0.36, oz - 4.25); this.lampGlow.scale.setScalar(0.9); this.lampGlow.layers.set(NOINK); this.root.add(this.lampGlow);
    // back wall: window (day / night versions), calendar, clock; left wall whiteboard
    this.winDay = this.plane(windowTex("njWinOffice"), 1.5, 1.15, V(ox - 1.7, 1.75, oz - 5.48), 0, new THREE.Color(1.15, 1.15, 1.15)).mesh;
    this.winNight = this.plane(nightWindowTex(), 1.5, 1.15, V(ox - 1.7, 1.75, oz - 5.48), 0, new THREE.Color(1.0, 1.0, 1.0)).mesh;
    b.add(boxGeo(V(ox - 2.5, 1.12, oz - 5.5), V(ox - 0.9, 1.18, oz - 5.38)), lam("njSill", () => ({ color: "#f0ece2" })));
    this.calMat = this.plane(this.calTex(0), 0.5, 0.6, V(ox + CAL[0], CAL[1], oz + CAL[2]), 0, new THREE.Color(0.95, 0.93, 0.9)).m;
    this.calMat.transparent = false;
    const clk = this.plane(ctex("njClock", 256, 256, (g) => {
      g.fillStyle = "#f7f1e1"; g.strokeStyle = "#221f2e"; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.stroke();
      g.lineCap = "round"; for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = 8; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 96 * Math.cos(a), 128 + 96 * Math.sin(a)); g.stroke(); }
      g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 62); g.stroke(); g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(178, 150); g.stroke();
    }), 0.42, 0.42, V(ox + CLOCK[0], CLOCK[1], oz + CLOCK[2]), 0, new THREE.Color(0.95, 0.93, 0.9));
    void clk;
    this.plane(whiteboard(), 1.8, 1.1, V(ox - 3.48, 1.6, oz - 3.0), Math.PI / 2, new THREE.Color(0.95, 0.95, 0.95));
    // water cooler + a potted plant + a filing cabinet
    b.add(boxGeo(V(ox + 3.0, 0, oz - 0.8), V(ox + 3.4, 1.0, oz - 0.4)), lam("njCooler", () => ({ color: "#e8e4dc" })));
    b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 16), lam("njWater", () => ({ color: "#7ac8f0" })), new THREE.Matrix4().makeTranslation(ox + 3.2, 1.21, oz - 0.6));
    b.add(boxGeo(V(ox - 3.45, 0, oz - 5.4), V(ox - 2.85, 1.3, oz - 4.8)), lam("njCabinet", () => ({ color: "#8a929a" })));
    b.add(new THREE.CylinderGeometry(0.2, 0.16, 0.35, 14), lam("njPot", () => ({ color: "#b8684a" })), new THREE.Matrix4().makeTranslation(ox + 2.9, 0.175, oz - 5.0));
    prop(b, {}, "plant_bushLarge", ox + 2.9, 0.3, oz - 5.0, 0.9);
    // a stack of boxes in a corner (the product that does not sell yet)
    for (let i = 0; i < 3; i++) b.add(boxGeo(V(ox + 2.6, i * 0.42, oz + 2.2), V(ox + 3.2, (i + 1) * 0.42 - 0.01, oz + 2.68)), lam("njBoxS", () => ({ map: boxArt() })));
  }
  private calTex(n: number) { return ctex("njCal" + n, 400, 480, (g) => { const p = new Pen(g); fxCalendar(p, n); }); }
  private buildBath(b: Batch) {
    const B = BATH, [bx, , bz] = B;
    this.room(b, B, -3, 3, -2.5, 3, 2.8, lam("njBathW", () => ({ map: rep(wallTex("njBathWT", "#e8f0f0", "#bfe0e8", "#3f8fb5"), 1, 1) })),
      lam("njBathF", () => ({ map: rep(tilesTex("njBathFT", "#e8ece6", "#8aa8b8", 8), 3, 3) })), lam("njBathC", () => ({ color: "#e6eae6" })), "#3f6f8a");
    for (const x of [-1.6, 1.6]) this.panel(bx + x, 2.8, bz - 0.5, 1.0, 0.35);
    const white = lam("njPorcelain", () => ({ color: "#f6f8fa" })), seat = lam("njSeat", () => ({ color: "#e8ece8" })), pipe = lam("njPipe", () => ({ color: "#a8b0b8" }));
    for (const x of TOILETS_X) {
      const X = bx + x, Z = bz + TOILET_Z;
      b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 20), white, new THREE.Matrix4().makeTranslation(X, 0.2, Z + 0.08));
      b.add(new THREE.TorusGeometry(0.17, 0.035, 8, 20).rotateX(Math.PI / 2), seat, new THREE.Matrix4().makeTranslation(X, 0.42, Z + 0.08));
      b.add(new THREE.CircleGeometry(0.15, 20).rotateX(-Math.PI / 2), lam("njBowlWater", () => ({ color: "#9ad0e8" })), new THREE.Matrix4().makeTranslation(X, 0.36, Z + 0.08));
      b.add(boxGeo(V(X - 0.22, 0.42, bz - 2.48), V(X + 0.22, 0.82, bz - 2.26)), white);
      b.add(boxGeo(V(X - 0.24, 0.82, bz - 2.49), V(X + 0.24, 0.86, bz - 2.24)), white);
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), pipe, new THREE.Matrix4().makeTranslation(X + 0.3, 1.65, bz - 2.45));
    }
    // low dividers between the toilets (behind the kid's spot), sinks + mirrors on the left wall, a frosted window
    for (const x of [-0.8, 0.8]) b.add(boxGeo(V(bx + x - 0.02, 0.15, bz - 2.5), V(bx + x + 0.02, 1.6, bz - 2.0)), lam("njDivider", () => ({ color: "#5ab0c8" })));
    for (const z of [-0.6, 0.9]) {
      b.add(boxGeo(V(bx - 3.0, 0.78, bz + z - 0.3), V(bx - 2.55, 0.9, bz + z + 0.3)), white);
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 8), white, new THREE.Matrix4().makeTranslation(bx - 2.78, 0.39, bz + z));
      const mir = this.plane(ctex("njMirror", 128, 160, (g) => { const gr = g.createLinearGradient(0, 0, 128, 160); gr.addColorStop(0, "#d8eef4"); gr.addColorStop(1, "#9ac0cc"); g.fillStyle = gr; g.fillRect(0, 0, 128, 160); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(20, 10, 18, 140); g.strokeStyle = "#8a929a"; g.lineWidth = 10; g.strokeRect(0, 0, 128, 160); }),
        0.55, 0.7, V(bx - 2.98, 1.45, bz + z), Math.PI / 2, new THREE.Color(1, 1, 1));
      void mir;
    }
    this.plane(windowTex("njWinBath", false), 0.9, 0.5, V(bx + 2.98, 2.2, bz - 0.4), -Math.PI / 2, new THREE.Color(1.25, 1.25, 1.25));
    // mop bucket
    b.add(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 16), lam("njBucket", () => ({ color: "#f2c83a" })), new THREE.Matrix4().makeTranslation(bx + 0.55, 0.17, bz - 0.45));
    b.add(new THREE.CircleGeometry(0.18, 16).rotateX(-Math.PI / 2), lam("njSuds", () => ({ color: "#d8eef8" })), new THREE.Matrix4().makeTranslation(bx + 0.55, 0.3, bz - 0.45));
  }
  private buildDiner(b: Batch) {
    const D = DINER, [dx, , dz] = D;
    this.room(b, D, -4, 4, -3, 4, 3.0, lam("njDinerW", () => ({ map: rep(wallTex("njDinerWT", "#f4e8c8", "#c83a3a", "#d8dee4"), 1, 1) })),
      lam("njDinerF", () => ({ map: rep(tilesTex("njDinerFT", "#f4f2ea", "#2a2a30", 8, "rgba(0,0,0,0.05)"), 4, 3.5) })), lam("njDinerC", () => ({ color: "#efe6d2" })), "#8a2a2a");
    for (const x of [-2, 2]) for (const z of [-1.4, 1.6]) this.panel(dx + x, 3.0, dz + z, 0.9, 0.35);
    // the kitchen sink counter (teen Jensen behind it, facing the lens)
    const steel = lam("njSteel", () => ({ color: "#b8c0c8" })), steelTop = lam("njSteelTop", () => ({ color: "#d8dee4" }));
    const sx = dx + SINK[0];
    b.add(boxGeo(V(sx - 0.95, 0, dz - 1.4), V(sx + 0.95, 0.9, dz - 0.82)), steel);
    b.add(boxGeo(V(sx - 0.98, 0.9, dz - 1.43), V(sx + 0.98, 0.95, dz - 0.8)), steelTop);
    b.add(quad(V(sx - 0.45, 0.952, dz - 0.95), V(sx + 0.15, 0.952, dz - 0.95), V(sx + 0.15, 0.952, dz - 1.3), V(sx - 0.45, 0.952, dz - 1.3)), lam("njSinkIn", () => ({ color: "#5a6a7a" })));
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), steelTop, new THREE.Matrix4().makeTranslation(sx - 0.15, 1.12, dz - 1.36));
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8).rotateX(Math.PI / 2), steelTop, new THREE.Matrix4().makeTranslation(sx - 0.15, 1.28, dz - 1.26));
    // the plate stack (grows while he washes)
    const plateG = new THREE.CylinderGeometry(0.13, 0.11, 0.025, 20), plateM = lam("njPlate", () => ({ color: "#f6f8fa" }));
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(plateG, plateM); m.position.set(sx + 0.62, 0.965 + i * 0.027, dz - 1.08); m.castShadow = true; m.visible = false; this.root.add(m); this.plates.push(m); }
    // kitchen back wall: shelves with pots, a pass-through window glow
    b.add(boxGeo(V(dx - 3.9, 1.6, dz - 3.0), V(dx - 0.6, 1.65, dz - 2.7)), steel);
    for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.16, 0.14, 0.2, 14), lam("njPotS", () => ({ color: "#8a929a" })), new THREE.Matrix4().makeTranslation(dx - 3.4 + i * 0.75, 1.75, dz - 2.85));
    for (let i = 0; i < 6; i++) b.add(boxGeo(V(dx - 3.6 + i * 0.5, 2.05, dz - 2.98), V(dx - 3.35 + i * 0.5, 2.3, dz - 2.9)), lam("njTile" + (i % 2), () => ({ color: i % 2 ? "#f2c83a" : "#3f8fd8" })));
    // the booth: high red back, seat, table, mugs, plates, a back-wall window
    const red = lam("njBooth", () => ({ color: "#c8343a" })), chrome = lam("njChrome", () => ({ color: "#d8dee4" }));
    const bx2 = dx + BOOTH[0], bz2 = dz + BOOTH[2];
    b.add(boxGeo(V(bx2 - 1.05, 0, bz2 - 0.5), V(bx2 + 1.05, 1.2, bz2 - 0.25)), red);
    b.add(boxGeo(V(bx2 - 1.05, 0, bz2 - 0.25), V(bx2 + 1.05, 0.44, bz2 + 0.15)), red);
    b.add(boxGeo(V(bx2 - 1.08, 1.2, bz2 - 0.52), V(bx2 + 1.08, 1.25, bz2 - 0.23)), chrome);
    b.add(boxGeo(V(bx2 - 0.9, 0.73, bz2 + 0.25), V(bx2 + 0.9, 0.77, bz2 + 1.1)), lam("njTableTop", () => ({ color: "#f0e6cc" })));
    b.add(boxGeo(V(bx2 - 0.92, 0.7, bz2 + 0.23), V(bx2 + 0.92, 0.73, bz2 + 1.12)), chrome);
    b.add(new THREE.CylinderGeometry(0.06, 0.12, 0.7, 12), chrome, new THREE.Matrix4().makeTranslation(bx2, 0.35, bz2 + 0.68));
    const mug = lam("njMugW", () => ({ color: "#f4f2ea" })), coffee = lam("njCoffee", () => ({ color: "#4a2a1a" }));
    for (const [x, z] of [[-0.6, 0.45], [0.62, 0.48], [0.1, 0.95]] as const) {
      b.add(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), mug, new THREE.Matrix4().makeTranslation(bx2 + x, 0.82, bz2 + z));
      b.add(new THREE.CircleGeometry(0.04, 12).rotateX(-Math.PI / 2), coffee, new THREE.Matrix4().makeTranslation(bx2 + x, 0.871, bz2 + z));
    }
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), lam("njKetchup", () => ({ color: "#d8262a" })), new THREE.Matrix4().makeTranslation(bx2 + 0.75, 0.86, bz2 + 0.9));
    b.add(new THREE.CylinderGeometry(0.11, 0.1, 0.02, 18), plateM, new THREE.Matrix4().makeTranslation(bx2 - 0.45, 0.78, bz2 + 0.75));
    this.plane(windowTex("njWinDiner"), 2.0, 1.1, V(bx2, 1.95, dz - 2.98), 0, new THREE.Color(1.2, 1.2, 1.2));
    // a jukebox-ish glow and stools along a side counter
    for (let i = 0; i < 4; i++) {
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), red, new THREE.Matrix4().makeTranslation(dx - 0.6 + i * 0.7, 0.75, dz + 2.6));
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), chrome, new THREE.Matrix4().makeTranslation(dx - 0.6 + i * 0.7, 0.36, dz + 2.6));
    }
  }
  private buildGym(b: Batch) {
    const G = GYM, [gx, , gz] = G;
    this.room(b, G, -5, 5, -5, 5, 4.2, lam("njGymW", () => ({ map: rep(wallTex("njGymWT", "#dfe6ee", "#3f6fb5", "#f2c83a"), 1, 1) })),
      lam("njGymF", () => ({ map: rep(planksHD(), 3, 3) })), lam("njGymC", () => ({ color: "#d8dce2" })), "#2a3a5a");
    for (const x of [-2, 2]) for (const z of [-3, 0, 3]) this.panel(gx + x, 4.2, gz + z, 1.2, 0.4);
    const [tx, , tz] = add(G, TT);
    b.add(boxGeo(V(tx - 0.76, 0.72, tz - 1.37), V(tx + 0.76, 0.76, tz + 1.37)), lam("njTTtop", () => ({ map: ttTex() })));
    for (const [x, z] of [[-0.6, -1.1], [0.6, -1.1], [-0.6, 1.1], [0.6, 1.1]]) b.add(boxGeo(V(tx + x - 0.03, 0, tz + z - 0.03), V(tx + x + 0.03, 0.72, tz + z + 0.03)), lam("njTTleg", () => ({ color: "#2a2a30" })));
    const net = this.plane(netTex(), 1.8, 0.16, V(tx, 0.84, tz), 0, new THREE.Color(1, 1, 1)); net.m.alphaTest = 0.3;
    for (const s of [-1, 1]) b.add(boxGeo(V(tx + s * 0.9 - 0.02, 0.74, tz - 0.02), V(tx + s * 0.9 + 0.02, 0.93, tz + 0.02)), lam("njTTpost", () => ({ color: "#2a2a30" })));
    this.plane(pennants(), 9.6, 1.2, V(gx, 3.5, gz - 4.95), 0, new THREE.Color(1, 1, 1));
    this.plane(windowTex("njWinGym"), 2.4, 1.2, V(gx - 3.0, 2.6, gz - 4.97), 0, new THREE.Color(1.2, 1.2, 1.2));
    this.plane(windowTex("njWinGym"), 2.4, 1.2, V(gx + 3.0, 2.6, gz - 4.97), 0, new THREE.Color(1.2, 1.2, 1.2));
    // bleacher benches along the side
    for (let i = 0; i < 3; i++) b.add(boxGeo(V(gx - 4.9, 0, gz - 4 + i * 0.01), V(gx - 4.0 + i * -0.3, 0.4 + i * 0.4, gz + 4)), lam("njBench", () => ({ color: "#c89a5a" })));
  }
  private buildLab(b: Batch) {
    const L = LAB, [lx, , lz] = L;
    this.room(b, L, -4, 4, -3, 3.5, 3.0, lam("njLabW", () => ({ map: rep(wallTex("njLabWT", "#e4ecee", "#8aa8b0", "#3f6f8a"), 1, 1) })),
      lam("njLabF", () => ({ map: rep(tilesTex("njLabFT", "#d8dcd6", "#c4c8c2", 8), 4, 3) })), lam("njLabC", () => ({ color: "#e6eae6" })), "#3f5a6a");
    for (const x of [-1.8, 1.8]) for (const z of [-1.2, 1.6]) this.panel(lx + x, 3.0, lz + z, 1.2, 0.35);
    this.plane(chalkboard(), 3.4, 1.46, V(lx - 0.1, 1.75, lz - 2.97), 0, new THREE.Color(1, 1, 1));
    b.add(boxGeo(V(lx - 1.8, 0.98, lz - 3.0), V(lx + 1.6, 1.03, lz - 2.88)), lam("njChalkTray", () => ({ color: "#8a6a44" })));
    // the lab bench + gear
    const top = lam("njBenchTop", () => ({ color: "#2a2a30" })), body = lam("njBenchBody", () => ({ color: "#c8b48a" }));
    b.add(boxGeo(V(lx - 1.5, 0, lz - 1.3), V(lx + 1.5, 0.88, lz - 0.62)), body);
    b.add(boxGeo(V(lx - 1.55, 0.88, lz - 1.33), V(lx + 1.55, 0.93, lz - 0.58)), top);
    const glass = lam("njBeaker", () => ({ color: "#d8f0f4" }));
    for (const [x, h, c] of [[-1.15, 0.22, "#5ad070"], [-0.95, 0.16, "#3f8fd8"], [1.15, 0.2, "#e2453c"], [0.95, 0.14, "#f2c83a"]] as const) {
      b.add(new THREE.CylinderGeometry(0.06, 0.06, h, 14), glass, new THREE.Matrix4().makeTranslation(lx + x, 0.93 + h / 2, lz - 0.85));
      b.add(new THREE.CylinderGeometry(0.055, 0.055, h * 0.55, 14), lam("njLiquid" + c, () => ({ color: c })), new THREE.Matrix4().makeTranslation(lx + x, 0.93 + h * 0.28, lz - 0.85));
    }
    // oscilloscope with a glowing green wave
    b.add(boxGeo(V(lx - 0.25, 0.93, lz - 1.28), V(lx + 0.25, 1.25, lz - 0.98)), lam("njScopeBox", () => ({ color: "#8a929a" })));
    this.plane(scopeTex(), 0.3, 0.22, V(lx - 0.05, 1.09, lz - 0.975), 0, new THREE.Color(1.4, 1.4, 1.4));
    b.add(boxGeo(V(lx + 0.35, 0.93, lz - 0.95), V(lx + 0.75, 0.95, lz - 0.7)), lam("njBread", () => ({ color: "#f4f2ea" })));
    // shelves with books on the right wall
    for (let s = 0; s < 3; s++) {
      b.add(boxGeo(V(lx + 3.6, 0.6 + s * 0.6, lz - 2.2), V(lx + 4.0, 0.63 + s * 0.6, lz + 0.2)), lam("njShelf", () => ({ color: "#8a5a3c" })));
      for (let k = 0; k < 9; k++) b.add(boxGeo(V(lx + 3.65, 0.63 + s * 0.6, lz - 2.1 + k * 0.25), V(lx + 3.95, 0.63 + s * 0.6 + 0.3 + 0.08 * ((k * 7) % 3), lz - 1.92 + k * 0.25)), lam("njBook" + (k % 4), () => ({ color: ["#3f6fb5", "#c84a3a", "#e8b42e", "#4a9a5a"][k % 4] })));
    }
    this.plane(windowTex("njWinLab"), 1.4, 1.1, V(lx - 3.97, 1.8, lz - 0.6), Math.PI / 2, new THREE.Color(1.2, 1.2, 1.2));
  }
  private buildDC(b: Batch) {
    const C = DC, [cx, , cz] = C;
    this.room(b, C, -2.6, 2.6, -14, 4, 3.4, lam("njDcW", () => ({ color: "#1a2228" })), lam("njDcF", () => ({ map: rep(dcFloor(), 2, 8) })), lam("njDcC", () => ({ color: "#141a1f" })), "#0a0d10");
    const rackM = lam("njRackM", () => ({ map: rackTex() })), rackSide = lam("njRackS", () => ({ color: "#20272e" }));
    for (const s of [-1, 1]) {
      for (let k = 0; k < 24; k++) {
        const z0 = cz + 2.6 - k * 0.66, z1 = z0 - 0.62;
        const xIn = cx + s * 1.0, xOut = cx + s * 2.0;
        b.add(boxGeo(V(Math.min(xIn, xOut), 0, z1), V(Math.max(xIn, xOut), 2.5, z0)), rackSide);
        if (s < 0) b.add(quad(V(xIn + 0.002, 0, z0), V(xIn + 0.002, 0, z1), V(xIn + 0.002, 2.5, z1), V(xIn + 0.002, 2.5, z0)), rackM);
        else b.add(quad(V(xIn - 0.002, 0, z1), V(xIn - 0.002, 0, z0), V(xIn - 0.002, 2.5, z0), V(xIn - 0.002, 2.5, z1)), rackM);
        const led = this.plane(ledTex(k * 2 + (s > 0 ? 1 : 0)), 0.62, 2.5, V(xIn - s * 0.006, 1.25, (z0 + z1) / 2), s < 0 ? Math.PI / 2 : -Math.PI / 2, new THREE.Color(1.6, 1.6, 1.6), true);
        this.leds.push(led.m);
      }
    }
    // glowing floor strips along the aisle + ceiling light bars + cable trays
    for (const s of [-1, 1]) {
      const st = this.plane(null, 0.06, 16.5, V(cx + s * 0.92, 0.012, cz - 5.5), 0, new THREE.Color(0.3, 2.2, 2.6));
      st.mesh.rotation.x = -Math.PI / 2; this.dcStrips.push(st.m);
      const cb = this.plane(null, 0.05, 16.5, V(cx + s * 0.5, 3.38, cz - 5.5), 0, new THREE.Color(0.6, 2.2, 2.4));
      cb.mesh.rotation.x = Math.PI / 2; this.dcStrips.push(cb.m);
      b.add(boxGeo(V(cx + s * 1.5 - 0.25, 2.85, cz - 14), V(cx + s * 1.5 + 0.25, 2.92, cz + 4)), lam("njTray", () => ({ color: "#3a444c" })));
    }
    // the far end: a glowing wall panel
    const end = this.plane(ctex("njDcEnd", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "#9af6ff"); gr.addColorStop(1, "#0d3a44"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }), 4.6, 3.0, V(cx, 1.6, cz - 13.95), 0, new THREE.Color(1.3, 1.3, 1.3));
    this.dcStrips.push(end.m);
  }

  private shotSun(id: number, s: ShotDef, el0: number, az0: number) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? az0), el = THREE.MathUtils.degToRad(s.sunEl ?? el0);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  private scrTex(k: number) { const kk = k < 0 ? -1 : k < 0.5 ? 0.2 : 1; return ctex("njScr" + kk, 400, 300, (g) => { const p = new Pen(g); fxScreen(p, kk); }); }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const inside = cam.position.x > INSIDE_X;
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L.el, L.az);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 8, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.sun.castShadow = !inside;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = s.light === "night" ? 0.85 : s.light === "dc" ? 0.92 : 1.0;
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    const dcLight = s.light === "dc";
    this.fog.near = inside && !dcLight ? 40 : L.fogNear; this.fog.far = inside && !dcLight ? 400 : L.fogFar;
    scene.fog = this.fog; scene.background = null;
    for (const cl of this.clouds) {
      cl.s.visible = !inside;
      cl.s.position.copy(cam.position).addScaledVector(cl.dir, 900);
      cl.s.scale.set(cl.size, cl.size * 0.5, 1);
    }
    // ---- office state ----
    const dark = s.light === "night", lampLit = s.light === "lamp";
    for (const p of this.panels) p.color.setScalar(dark || lampLit ? 0.0 : 2.4);
    this.lampGlow.visible = lampLit;
    this.winDay.visible = !(dark || lampLit); this.winNight.visible = dark || lampLit;
    let scr = dark ? -1 : lampLit ? -1 : 0.2;
    if (id === 28) scr = t < 47.85 ? -1 : t < W.works - LEAD ? 0.2 : 1;
    this.screenMat.map = this.scrTex(scr);
    const lidOpen = id === 2 ? smooth((t - (W.cash - 0.35)) / 0.25) : id === 26 ? smooth((t - (W.money - 0.4)) / 0.25) : id >= 27 && id <= 28 ? 1 : 0;
    this.lid.rotation.x = -1.9 * lidOpen;
    this.calMat.map = this.calTex(id >= 25 ? 28 : 6);
    // ---- the diner plates ----
    const nPlates = id === 18 ? Math.min(18, 3 + Math.floor((t - 29.9) * 6)) : 5;
    this.plates.forEach((m, i) => { m.visible = i < nPlates; });
    // ---- the box mountain ----
    const pk = id === 29 || id === 30 ? pileK(t) : id > 30 ? 1 : 0, dummy = this.m4, q = new THREE.Quaternion(), sc3 = new THREE.Vector3();
    this.boxes.visible = pk > 0 && !inside;
    if (this.boxes.visible) {
      this.slots.forEach((sl, i) => {
        const fallT = 0.32, land = sl.t; // in pile-time units (0..1 = 3.6 s)
        const u = (pk - land) * 3.6 / fallT; // 0 at start of fall (fallT before landing) .. 1 at landing
        if (u < 0) { sc3.set(0, 0, 0); dummy.compose(sl.p, q, sc3); this.boxes.setMatrixAt(i, dummy); return; }
        const k = Math.min(1, u), drop = 5 * (1 - k * k);
        const bounce = u > 1 && u < 1.4 ? 0.06 * Math.sin((u - 1) * Math.PI / 0.4) : 0;
        q.setFromAxisAngle(V(0, 1, 0), sl.rot + (1 - k) * 2.0);
        sc3.set(1, 1, 1);
        dummy.compose(V(sl.p.x, sl.p.y + drop + bounce, sl.p.z), q, sc3);
        this.boxes.setMatrixAt(i, dummy);
      });
      this.boxes.instanceMatrix.needsUpdate = true;
    }
    // ---- data centre glow (brightens on "AI") ----
    const boost = id === 31 ? 1 + 0.9 * smooth((t - (W.ai - LEAD)) / 0.3) : id === 33 ? 1.7 : 1;
    this.leds.forEach((m, i) => { const fl = 0.8 + 0.2 * Math.sin(t * (3 + (i % 5)) + i); m.color.setScalar(1.5 * boost * fl); });
    for (const m of this.dcStrips) m.color.setRGB(0.3 * boost, 1.9 * boost, 2.3 * boost);
    // ---- lanterns sway ----
    this.lanterns.forEach((l, i) => { (l.material as THREE.SpriteMaterial).rotation = 0.08 * Math.sin(t * 1.6 + i); });
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
void LKEYS; void ({} as LK); void clamp01;
