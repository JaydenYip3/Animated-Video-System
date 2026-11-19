// The whole film as one three.js scene of "mao-zedong-2" (bridge-template light rig, sky shader, two-tone materials,
// ink-friendly geometry): the palace gate, the barracks yard, the Jinggang hills, the snow pass, the trench, the
// Korean night and the relief map, each 1000 m apart. update(id, f, camera) poses everything for shot `id` at frame
// f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, hipRoof, cyl, quad } from "./build";
import { ctex, rep, rng, stoneHD, roofHD, cloudHD } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset, LightName } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, camAt, V3, GATE, CAMP, HILLS, SNOW, TRENCH, NIGHT, MAP, MAP_BB, geo, LAND_H, hillH, snowH, smooth, clamp01, W,
  routeK, routeAt, ringR, RUIJIN, JINGGANG, NANJING, YANAN, BEIJING, TAIPEI, MANCHURIA, LL,
} from "./story";
import { CW, CH, LANDS, paintMap } from "./mappaint";

// ---------------- painted textures ----------------
const speckle = (key: string, base: string, dots: [string, number][], size = 512, n = 2600, rmax = 5) => ctex(key, size, size, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    const [c, a] = dots[i % dots.length];
    g.globalAlpha = a * (0.5 + 0.5 * r()); g.fillStyle = c;
    g.beginPath(); g.ellipse(r() * size, r() * size, 1 + r() * rmax, 1 + r() * rmax * 0.7, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
});
const plaster = (key: string, base: string) => speckle(key, base, [["#000000", 0.05], ["#ffffff", 0.05]], 512, 1800, 6);
const dirtTex = () => speckle("dirt", "#a38c69", [["#7d6a4e", 0.25], ["#c4ad86", 0.25], ["#5e4f3c", 0.18]], 512, 3200, 4);
const grassTex = () => ctex("mgrass", 512, 512, (g, r) => {
  g.fillStyle = "#7c8a58"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, c = ["#6a7a4a", "#8e9a62", "#74824f", "#9a9a66"][i % 4];
    g.strokeStyle = c; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 6 - r() * 10); g.stroke();
  }
});
const snowTex = () => speckle("snowT", "#eef1f4", [["#c9d3e0", 0.35], ["#ffffff", 0.5], ["#b6c2d2", 0.18]], 512, 2200, 7);
const hallTex = () => ctex("hall", 512, 256, (g) => {
  g.fillStyle = "#93372b"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#5e211a"; g.lineWidth = 6;
  for (let x = 32; x < 512; x += 64) { g.strokeRect(x - 22, 40, 44, 150); for (let y = 52; y < 190; y += 16) { g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.stroke(); } }
});
const beamTex = () => ctex("beamband", 512, 64, (g) => {
  g.fillStyle = "#3f6a66"; g.fillRect(0, 0, 512, 64);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "#c9a54a"; g.fillRect(x + 4, 10, 8, 44); g.fillStyle = "#2c4b49"; g.fillRect(x + 22, 18, 30, 28); g.fillStyle = "#9cb0a0"; g.fillRect(x + 28, 26, 18, 12); }
});
const tableTex = () => ctex("table", 1024, 1024, (g, r) => {
  g.fillStyle = "#2c2725"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 128) {
    g.fillStyle = "#211d1b"; g.fillRect(0, y, 1024, 4);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "70,60,55" : "20,17,16"},0.5)`; g.lineWidth = 2; const yy = y + 8 + r() * 112; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(300, yy + (r() - 0.5) * 12, 700, yy + (r() - 0.5) * 12, 1024, yy); g.stroke(); }
  }
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#5f5a5c"], [150, 120, 70, "#706a6b"], [170, 165, 55, "#5f5a5c"], [120, 100, 50, "#7d7778"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});
const dotTex = () => ctex("snowdot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
// flags
const star = (g: CanvasRenderingContext2D, x: number, y: number, R: number, rot = 0, col = "#f2c94c") => {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? R * 0.4 : R, a = rot - Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  g.closePath(); g.fillStyle = col; g.fill();
};
const FLAGS = {
  dragon: () => ctex("fl_dragon", 480, 320, (g) => {
    g.fillStyle = "#d8b246"; g.fillRect(0, 0, 480, 320);
    g.strokeStyle = "#2f4f86"; g.lineWidth = 26; g.lineCap = "round"; g.beginPath(); g.moveTo(400, 250);
    g.bezierCurveTo(330, 120, 250, 300, 180, 170); g.bezierCurveTo(130, 80, 90, 160, 120, 210); g.stroke();
    g.fillStyle = "#2f4f86"; g.beginPath(); g.ellipse(120, 205, 34, 24, -0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b5352a"; g.beginPath(); g.arc(70, 80, 26, 0, Math.PI * 2); g.fill();
  }),
  prc: () => ctex("fl_prc", 480, 320, (g) => {
    g.fillStyle = "#c0332a"; g.fillRect(0, 0, 480, 320);
    star(g, 80, 80, 48);
    for (const [x, y] of [[160, 32], [192, 64], [192, 112], [160, 144]]) star(g, x, y, 16, Math.atan2(80 - y, 80 - x) + Math.PI / 2);
  }),
  red: () => ctex("fl_red", 300, 200, (g) => { g.fillStyle = "#c0332a"; g.fillRect(0, 0, 300, 200); star(g, 78, 70, 44); }),
  roc: () => ctex("fl_roc", 300, 200, (g) => {
    g.fillStyle = "#c0332a"; g.fillRect(0, 0, 300, 200); g.fillStyle = "#26408a"; g.fillRect(0, 0, 150, 100);
    g.fillStyle = "#ffffff"; star(g, 75, 50, 34, 0, "#ffffff"); star(g, 75, 50, 34, Math.PI / 5, "#ffffff");
    g.fillStyle = "#26408a"; g.beginPath(); g.arc(75, 50, 17, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(75, 50, 13, 0, Math.PI * 2); g.fill();
  }),
  japan: () => ctex("fl_jp", 300, 200, (g) => { g.fillStyle = "#f2efe6"; g.fillRect(0, 0, 300, 200); g.fillStyle = "#c0332a"; g.beginPath(); g.arc(150, 100, 56, 0, Math.PI * 2); g.fill(); }),
  us: () => ctex("fl_us", 300, 200, (g) => {
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#f2efe6" : "#b23a32"; g.fillRect(0, (i * 200) / 7, 300, 200 / 7 + 1); }
    g.fillStyle = "#2c3f75"; g.fillRect(0, 0, 130, 115);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) star(g, 14 + c * 25, 15 + r * 27, 7, 0, "#f2efe6");
  }),
};
const flagMat = (t: THREE.Texture) => { const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, color: 0xdedede }); return m; };

// ---------------- geometry helpers ----------------
/** height-field patch from x0..x1, z0..z1 (relative to `o`), uv tiled every `tile` metres */
const terrain = (o: V3, x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, h: (x: number, z: number) => number, tile: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2;
    p.setXYZ(i, o[0] + x, o[1] + h(x, z), o[2] + z); uv.setXY(i, x / tile, z / tile);
  }
  g.computeVertexNormals();
  return g;
};
const flatQuad = (o: V3, x0: number, x1: number, z0: number, z1: number, tile: number, y = 0) =>
  quad(V(o[0] + x0, y, o[2] + z1), V(o[0] + x1, y, o[2] + z1), V(o[0] + x1, y, o[2] + z0), V(o[0] + x0, y, o[2] + z0), (x1 - x0) / tile, (z1 - z0) / tile);
const coneAt = (x: number, y: number, z: number, r: number, h: number, seg = 7, rot = 0) => {
  const g = new THREE.ConeGeometry(r, h, seg); g.rotateY(rot); g.translate(x, y + h / 2, z); return g;
};
const ballAt = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
  const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz); g.translate(x, y, z); return g;
};

type Pin = { g: THREE.Group; flag: THREE.Mesh };
type Cloth = { m: THREE.Mesh; w: number; h: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#d8cdb6", 30, 320);
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private cloudMaps: Partial<Record<LightName, THREE.Texture[]>> = {};
  private gateFlag: Cloth; private gateFlagMats: { dragon: THREE.Material; prc: THREE.Material };
  private mapCanvas: HTMLCanvasElement; private mapTex: THREE.CanvasTexture; private mapT = -1;
  private pins: Record<string, Pin> = {};
  private blocks: THREE.Group[] = [];
  private snow: THREE.Points; private snowBase: Float32Array; private snowMat: THREE.PointsMaterial;
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; top: V3; k: number }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky + light ----
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
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.scale.set(w, w / 2, 1); m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push(m); R.add(m);
    }

    const b = new Batch();
    this.buildGate(b);
    this.buildCamp(b);
    this.buildHills(b);
    this.buildSnow(b);
    this.buildTrench(b);
    this.buildNight(b);
    b.build(R);

    // gate flag (cloth, waved per frame)
    this.gateFlagMats = { dragon: flagMat(FLAGS.dragon()), prc: flagMat(FLAGS.prc()) };
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4, 16, 1), this.gateFlagMats.dragon);
    fm.layers.set(NOINK); fm.frustumCulled = false; fm.castShadow = true; R.add(fm);
    this.gateFlag = { m: fm, w: 3.6, h: 2.4 };

    // the map
    this.mapCanvas = document.createElement("canvas"); this.mapCanvas.width = CW; this.mapCanvas.height = CH;
    this.mapTex = new THREE.CanvasTexture(this.mapCanvas);
    this.mapTex.colorSpace = THREE.SRGBColorSpace; this.mapTex.anisotropy = 16;
    this.buildMap();

    // falling snow (shots 6 and 12): points in a box around the camera
    const N = 5000; this.snowBase = new Float32Array(N * 4);
    const rr = rng(77);
    for (let i = 0; i < N; i++) { this.snowBase[i * 4] = rr(); this.snowBase[i * 4 + 1] = rr(); this.snowBase[i * 4 + 2] = rr(); this.snowBase[i * 4 + 3] = rr(); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.snowMat = new THREE.PointsMaterial({ size: 0.055, map: dotTex(), transparent: true, depthWrite: false, color: 0xffffff, fog: true });
    this.snow = new THREE.Points(sg, this.snowMat); this.snow.frustumCulled = false; this.snow.layers.set(NOINK); this.snow.renderOrder = 3;
    R.add(this.snow);
    // smoke columns behind the trench
    const smT = smokeTex();
    for (const [top, n] of [[[TRENCH[0] - 26, 2, TRENCH[2] - 60], 8], [[TRENCH[0] + 34, 2, TRENCH[2] - 85], 8]] as const)
      for (let k = 0; k < n; k++) {
        const mat = new THREE.MeshLambertMaterial({ map: smT, transparent: true, depthWrite: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK);
        this.smoke.push({ m, mat, top: top as unknown as V3, k: k / n }); R.add(m);
      }
  }

  // ---------------- places ----------------
  private buildGate(b: Batch) {
    const o = GATE, X = (x: number) => o[0] + x, Z = (z: number) => o[2] + z;
    const pave = lam("pave", () => ({ map: rep(stoneHD("paveHD", ["#bfb39c", "#b5aa94", "#c8bca6", "#ada28c"], "#8f846f"), 1, 1) }));
    const red = lam("gateRed", () => ({ map: plaster("redPlaster", "#9a3a2c") }));
    const dark = lam("gateDark", () => ({ color: "#2a2422" }));
    const marble = lam("marble", () => ({ map: plaster("marbleP", "#e3ddd0") }));
    const stone = lam("gateStone", () => ({ map: plaster("gateStoneP", "#a59d90") }));
    const gold = lam("goldRoof", () => ({ map: roofHD("#c9a043") }));
    const hall = lam("hallM", () => ({ map: hallTex() }));
    const band = lam("bandM", () => ({ map: beamTex() }));
    const col = lam("colRed", () => ({ color: "#a33a2c" }));
    const leaf = lam("leafDark", () => ({ map: plaster("leafP", "#5f6e4a") }));
    const bark = lam("bark", () => ({ color: "#5a4636" }));
    const grey = lam("greyWall", () => ({ map: plaster("greyP", "#8e8a82") }));
    const greyRoof = lam("greyRoof", () => ({ map: roofHD("#5d5b58") }));
    b.add(flatQuad(o, -220, 220, -60, 220, 4), pave);
    // wall with five gateways: front layer in pieces, back block, dark recesses, painted arch tops
    const ops: [number, number, number][] = [[-15, 3.0, 4.6], [-7.5, 3.4, 5.2], [0, 4.2, 6.2], [7.5, 3.4, 5.2], [15, 3.0, 4.6]];
    let x = -34;
    for (const [cx, w, h] of ops) {
      b.add(boxGeo(V(X(x), 0, Z(-21.2)), V(X(cx - w / 2), 9, Z(-20)), 3), red);
      b.add(boxGeo(V(X(cx - w / 2), h, Z(-21.2)), V(X(cx + w / 2), 9, Z(-20)), 3), red);
      b.add(boxGeo(V(X(cx - w / 2), 0, Z(-21.3)), V(X(cx + w / 2), h, Z(-21.15))), dark);
      const arch = new THREE.CircleGeometry(w / 2, 24, 0, Math.PI); arch.translate(X(cx), h - 0.01, Z(-19.985));
      b.add(arch, dark);
      x = cx + w / 2;
    }
    b.add(boxGeo(V(X(x), 0, Z(-21.2)), V(X(34), 9, Z(-20)), 3), red);
    b.add(boxGeo(V(X(-34), 0, Z(-34)), V(X(34), 9, Z(-21.2)), 3), red);
    b.add(boxGeo(V(X(-34.3), 0, Z(-20.4)), V(X(34.3), 0.7, Z(-19.7)), 2), stone);
    b.add(boxGeo(V(X(-34.2), 8.8, Z(-20.25)), V(X(34.2), 9.05, Z(-19.85)), 2), stone);
    // marble balustrade on top
    b.add(boxGeo(V(X(-34), 9, Z(-20.25)), V(X(34), 9.95, Z(-20.0)), 2), marble);
    for (let px = -33.6; px <= 33.7; px += 1.6) b.add(boxGeo(V(X(px - 0.12), 9.95, Z(-20.3)), V(X(px + 0.12), 10.25, Z(-19.95))), marble);
    // the hall: columns, lattice walls, bracket band, two roofs
    b.add(boxGeo(V(X(-19.5), 9, Z(-31)), V(X(19.5), 9.35, Z(-21.9)), 2), marble);
    b.add(boxGeo(V(X(-18.2), 9.35, Z(-29.6)), V(X(18.2), 14.2, Z(-23.3)), 0), hall);
    for (let cx = -17.5; cx <= 17.6; cx += 3.5) b.add(cyl(X(cx), 9.35, Z(-22.6), 0.36, 4.9, 14), col);
    b.add(boxGeo(V(X(-18.9), 13.6, Z(-23.2)), V(X(18.9), 14.4, Z(-22.2)), 0), band);
    b.add(hipRoof(X(0), Z(-26.3), 37.8, 7.6, 14.35, 1.5, 2.3, 2), gold);
    b.add(boxGeo(V(X(-15.6), 14.6, Z(-28.6)), V(X(15.6), 17.1, Z(-24.1)), 0), hall);
    b.add(boxGeo(V(X(-16.0), 16.5, Z(-24.1)), V(X(16.0), 17.15, Z(-23.6)), 0), band);
    b.add(hipRoof(X(0), Z(-26.35), 31.4, 4.6, 17.1, 4.2, 2.6, 2), gold);
    for (const s of [-1, 1]) b.add(boxGeo(V(X(s * 13.2 - 0.35), 21.0, Z(-26.6)), V(X(s * 13.2 + 0.35), 22.0, Z(-26.1))), gold);
    // marble huabiao columns, the flagpole
    for (const s of [-1, 1]) {
      b.add(cyl(X(s * 9.5), 0, Z(-13.5), 0.42, 8.2, 12), marble);
      b.add(boxGeo(V(X(s * 9.5 - 0.9), 6.9, Z(-13.6)), V(X(s * 9.5 + 0.9), 7.2, Z(-13.4))), marble);
      b.add(cyl(X(s * 9.5), 8.2, Z(-13.5), 0.62, 0.35, 12), marble);
      b.add(boxGeo(V(X(s * 9.5 - 0.9), 0, Z(-14.4)), V(X(s * 9.5 + 0.9), 0.6, Z(-12.6))), marble);
    }
    b.add(cyl(X(10), 0, Z(-6), 0.09, 17, 10), lam("pole", () => ({ color: "#d8d2c4" })));
    b.add(cyl(X(10), 0, Z(-6), 0.45, 0.5, 14), marble);
    // tree rows and low grey halls on both sides of the square
    for (const s of [-1, 1]) {
      for (let k = 0; k < 9; k++) {
        const tx = s * (40 + (k % 2) * 3), tz = -16 + k * 6;
        b.add(cyl(X(tx), 0, Z(tz), 0.25, 2.6, 8), bark);
        b.add(ballAt(X(tx), 4.2, Z(tz), 2.4, 2.2, 2.4), leaf);
      }
      b.add(boxGeo(V(X(s * 52 - 6), 0, Z(-20)), V(X(s * 52 + 6), 5, Z(40)), 3), grey);
      b.add(hipRoof(X(s * 52), Z(10), 12, 60, 5, 2.4, 1, 2), greyRoof);
    }
  }

  private buildCamp(b: Batch) {
    const o = CAMP, X = (x: number) => o[0] + x, Z = (z: number) => o[2] + z;
    const dirt = lam("dirtM", () => ({ map: dirtTex() }));
    const brick = lam("campBrick", () => ({ map: rep(stoneHD("campStone", ["#9a958c", "#8f8a82", "#a39e94", "#88837b"], "#6f6a63"), 1, 1) }));
    const roof = lam("campRoof", () => ({ map: roofHD("#55534f") }));
    const dark = lam("gateDark", () => ({ color: "#2a2422" }));
    const wood = lam("campWood", () => ({ color: "#6e4f36" }));
    const wall = lam("campWall", () => ({ map: plaster("campWallP", "#b9ad94") }));
    const leaf = lam("leafDark", () => ({ map: plaster("leafP", "#5f6e4a") }));
    const bark = lam("bark", () => ({ color: "#5a4636" }));
    b.add(flatQuad(o, -120, 120, -120, 120, 3), dirt);
    b.add(boxGeo(V(X(-13), 0, Z(-10)), V(X(13), 3.7, Z(-5.2)), 2), brick);
    b.add(hipRoof(X(0), Z(-7.6), 26, 4.8, 3.7, 2.0, 0.9, 2), roof);
    for (let wx = -11; wx <= 11.1; wx += 2.75) {
      if (Math.abs(wx) < 1) { b.add(boxGeo(V(X(-0.75), 0, Z(-5.25)), V(X(0.75), 2.6, Z(-5.05))), dark); b.add(boxGeo(V(X(-0.95), 2.6, Z(-5.25)), V(X(0.95), 2.8, Z(-4.95))), wood); continue; }
      b.add(boxGeo(V(X(wx - 0.55), 1.25, Z(-5.25)), V(X(wx + 0.55), 2.45, Z(-5.08))), dark);
      b.add(boxGeo(V(X(wx - 0.65), 1.12, Z(-5.2)), V(X(wx + 0.65), 1.25, Z(-4.98))), wood);
    }
    for (const s of [-1, 1]) {
      b.add(boxGeo(V(X(s * 15 - 0.3), 0, Z(-12)), V(X(s * 15 + 0.3), 2.6, Z(16)), 2), wall);
      b.add(cyl(X(s * 10.5), 0, Z(4 - s), 0.22, 2.4, 8), bark);
      b.add(ballAt(X(s * 10.5), 3.6, Z(4 - s), 1.9, 1.8, 1.9), leaf);
    }
    b.add(boxGeo(V(X(-15), 0, Z(-14)), V(X(15), 2.6, Z(-13.4)), 2), wall);
    // a rifle rack by the door
    b.add(boxGeo(V(X(3.6), 0.9, Z(-5.0)), V(X(5.6), 1.0, Z(-4.8))), wood);
    for (let k = 0; k < 6; k++) b.add(boxGeo(V(X(3.75 + k * 0.33), 0, Z(-4.95)), V(X(3.8 + k * 0.33), 1.6, Z(-4.9))), dark);
  }

  private buildHills(b: Batch) {
    const o = HILLS;
    const grass = lam("mgrassM", () => ({ map: grassTex() }));
    const far = lam("farHill", () => ({ color: "#6f7d62" }));
    const pine = lam("pine", () => ({ color: "#4b5e44" }));
    const bark = lam("bark", () => ({ color: "#5a4636" }));
    b.add(terrain(o, -90, 90, -90, 30, 180, 120, hillH, 3), grass);
    const r = rng(11);
    for (let i = 0; i < 18; i++) {
      const x = -140 + i * 17 + r() * 8, z = -60 - r() * 90, h = 22 + r() * 40;
      b.add(coneAt(o[0] + x, -2, o[2] + z, h * (0.9 + r() * 0.5), h, 7, r() * 3), far);
    }
    for (let i = 0; i < 70; i++) {
      const x = (r() - 0.5) * 70, z = -7.5 - r() * 40;
      if (Math.abs(x) < 7 && z > -11) continue;
      const y = hillH(x, z), s = 0.7 + r() * 0.7;
      b.add(cyl(o[0] + x, y, o[2] + z, 0.09 * s, 0.8 * s, 6), bark);
      b.add(coneAt(o[0] + x, y + 0.6 * s, o[2] + z, 0.75 * s, 1.6 * s, 7), pine);
      b.add(coneAt(o[0] + x, y + 1.4 * s, o[2] + z, 0.55 * s, 1.2 * s, 7), pine);
    }
    for (const [x, z] of [[-5.2, 1.5], [4.6, 0.8], [-3.6, 3.2]]) {
      const y = hillH(x, z);
      b.add(cyl(o[0] + x, y, o[2] + z, 0.1, 0.9, 6), bark);
      b.add(coneAt(o[0] + x, y + 0.7, o[2] + z, 0.8, 1.7, 7), pine);
      b.add(coneAt(o[0] + x, y + 1.6, o[2] + z, 0.58, 1.3, 7), pine);
    }
  }

  private buildSnow(b: Batch) {
    const o = SNOW;
    const snow = lam("snowM", () => ({ map: snowTex() }));
    const rock = lam("rockSnow", () => ({ map: speckle("rockS", "#d8dde3", [["#7d838c", 0.5], ["#a3a9b1", 0.4]], 512, 900, 14) }));
    const rockD = lam("rockDark", () => ({ color: "#6a6e74" }));
    b.add(terrain(o, -80, 80, -120, 30, 160, 150, snowH, 4), snow);
    const r = rng(23);
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, d = 14 + r() * 50, along = 20 + r() * 110;
      const x = along * 0.45 + side * d, z = -along * 0.89 + side * d * 0.4, h = 18 + r() * 38;
      b.add(coneAt(o[0] + x, snowH(x, z) - 3, o[2] + z, h * (0.75 + r() * 0.35), h, 6, r() * 3), rock);
    }
    for (let i = 0; i < 26; i++) {
      const s = r() * 40, side = r() < 0.5 ? -1 : 1, l = 2.6 + r() * 5;
      const x = s * 0.45 + side * l * 0.89, z = -s * 0.89 + side * l * 0.45;
      b.add(ballAt(o[0] + x, snowH(x, z) + 0.1, o[2] + z, 0.5 + r() * 0.6, 0.3 + r() * 0.4, 0.5 + r() * 0.5), rockD);
    }
  }

  private buildTrench(b: Batch) {
    const o = TRENCH, X = (x: number) => o[0] + x, Z = (z: number) => o[2] + z;
    const mud = lam("mud", () => ({ map: speckle("mudT", "#7a6650", [["#5a4a3a", 0.3], ["#9a8466", 0.25]], 512, 3000, 5) }));
    const bag = lam("bag", () => ({ map: speckle("bagT", "#b8a57e", [["#8f7d5a", 0.3], ["#d4c39a", 0.3]], 256, 600, 4) }));
    const bark = lam("deadBark", () => ({ color: "#4a3c33" }));
    const post = lam("campWood", () => ({ color: "#6e4f36" }));
    b.add(flatQuad(o, -150, 150, -200, 60, 3), mud);
    for (let row = 0; row < 4; row++) for (let k = -9; k <= 9; k++) {
      const x = k * 0.62 + (row % 2) * 0.31, y = 0.15 + row * 0.27, z = 0.1 - row * 0.04;
      b.add(ballAt(X(x), y, Z(z), 0.34, 0.15, 0.24), bag);
    }
    const r = rng(5);
    for (let i = 0; i < 9; i++) {
      const x = -30 + i * 7.5 + r() * 3, z = -18 - r() * 40, h = 3 + r() * 4;
      b.add(cyl(X(x), 0, Z(z), 0.14, h, 6), bark);
      const br = new THREE.CylinderGeometry(0.05, 0.07, 1.6, 5); br.rotateZ(0.8 * (r() < 0.5 ? -1 : 1)); br.translate(X(x) + 0.4, h * 0.7, Z(z)); b.add(br, bark);
    }
    for (let i = 0; i < 12; i++) b.add(cyl(X(-7 + i * 1.3), 0, Z(-3.5 - (i % 2) * 0.2), 0.04, 0.9, 5), post);
  }

  private buildNight(b: Batch) {
    const o = NIGHT;
    const snow = lam("snowM", () => ({ map: snowTex() }));
    const pine = lam("pineNight", () => ({ color: "#3d4a40" }));
    const far = lam("farNight", () => ({ color: "#c9d0d8" }));
    b.add(terrain(o, -80, 80, -120, 40, 120, 100, (x, z) => 0.08 * Math.sin(x * 0.6) * Math.cos(z * 0.5) + 0.02 * Math.sin(x * 3.1 + z * 2.3) + 0.004 * Math.max(0, -z - 10) ** 1.5, 4), snow);
    const r = rng(41);
    for (let i = 0; i < 14; i++) {
      const x = -40 + i * 6 + r() * 3, z = -26 - r() * 14;
      b.add(coneAt(o[0] + x, 0, o[2] + z, 1.4, 4.5 + r() * 2, 7), pine);
    }
    for (let i = 0; i < 9; i++) b.add(coneAt(o[0] - 120 + i * 30, -2, o[2] - 90 - r() * 40, 30, 20 + r() * 16, 6, r()), far);
    // footprints leading away from the cap
    for (let k = 0; k < 14; k++) {
      const fp = new THREE.CircleGeometry(0.06, 10); fp.scale(1, 1.6, 1); fp.rotateX(-Math.PI / 2);
      fp.translate(o[0] - 0.4 - k * 0.38 + (k % 2) * 0.1, 0.03, o[2] - 0.6 - k * 0.5);
      b.add(fp, lam("printM", () => ({ color: "#aeb8c6" })));
    }
  }

  private buildMap() {
    const R = this.root;
    const tableM = lam("tableM", () => ({ map: rep(tableTex(), 8, 8) }));
    const edge = lam("mapEdge", () => ({ color: "#d9cfb8" }));
    const [x0, , z0] = geo(MAP_BB.lon0, MAP_BB.lat1), [x1, , z1] = geo(MAP_BB.lon1, MAP_BB.lat0);
    const tb = new Batch();
    tb.add(quad(V(MAP[0] - 300, -0.3, MAP[2] + 300), V(MAP[0] + 300, -0.3, MAP[2] + 300), V(MAP[0] + 300, -0.3, MAP[2] - 300), V(MAP[0] - 300, -0.3, MAP[2] - 300)), tableM);
    tb.add(boxGeo(V(x0, -0.3, z0), V(x1, -0.02, z1)), edge);
    tb.build(R);
    // the board top and the raised land share the painted canvas (planar uv over the board)
    const top = twoTone(new THREE.MeshLambertMaterial({ map: this.mapTex }));
    const side = lam("landSide", () => ({ color: "#a8956c" }));
    const uvOf = (g: THREE.BufferGeometry) => {
      const p = g.attributes.position as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - x0) / (x1 - x0); uv[i * 2 + 1] = (z1 - p.getZ(i)) / (z1 - z0); }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      return g;
    };
    const board = uvOf(quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, 0, z0), V(x0, 0, z0)).translate(0, -0.02, 0));
    const bm = new THREE.Mesh(board, top); bm.receiveShadow = true; R.add(bm);
    for (const L of LANDS) for (const ring of L.rings) {
      if (ring.length < 3) continue;
      const shape = new THREE.Shape(ring.map(([lo, la]) => { const g = geo(lo, la); return new THREE.Vector2(g[0], g[2]); }));
      const h = L.china ? LAND_H : LAND_H * 0.7;
      const eg = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
      eg.rotateX(Math.PI / 2); eg.translate(0, h - 0.02, 0);
      uvOf(eg);
      const m = new THREE.Mesh(eg, [top, side]); m.castShadow = true; m.receiveShadow = true; R.add(m);
    }
    // relief: low faceted mountains in the west and the south-west, off the Long March line
    const mtn = lam("mapMtn", () => ({ color: "#b9a27a" })), cap = lam("mapCap", () => ({ color: "#ece6d8" }));
    const mb = new Batch(), r = rng(99);
    let n = 0;
    for (let i = 0; i < 400 && n < 90; i++) {
      const lo = 79 + r() * 25, la = 27.5 + r() * 9.5;
      const near = Math.min(...Array.from({ length: 40 }, (_, k) => { const p = routeAt(k / 39); return Math.hypot(p[0] - lo, p[1] - la); }));
      if (near < 1.1) continue;
      const big = lo < 98, h = (big ? 0.45 + r() * 0.75 : 0.3 + r() * 0.35), rad = h * (1.1 + r() * 0.5);
      const p = geo(lo, la, LAND_H);
      mb.add(coneAt(p[0], p[1] - 0.02, p[2], rad, h, 6, r() * 3), mtn);
      if (h > 0.8) mb.add(coneAt(p[0], p[1] - 0.02 + h * 0.62, p[2], rad * 0.38, h * 0.38, 6, 0), cap);
      n++;
    }
    for (let i = 0; i < 9; i++) { // the Jinggang hills
      const p = geo(JINGGANG[0] + (r() - 0.5) * 1.6, JINGGANG[1] + (r() - 0.5) * 1.2, LAND_H);
      mb.add(coneAt(p[0], p[1] - 0.02, p[2], 0.32, 0.26 + r() * 0.12, 6, r() * 3), mtn);
    }
    mb.build(R);
    // flag pins
    const pinTex: Record<string, THREE.Texture> = { red: FLAGS.red(), roc: FLAGS.roc(), japan: FLAGS.japan(), us: FLAGS.us(), red2: FLAGS.red(), jp2: FLAGS.japan(), prc: FLAGS.prc(), red3: FLAGS.red() };
    const poleM = lam("pinPole", () => ({ color: "#3a3330" })), baseM = lam("pinBase", () => ({ color: "#2f2a28" }));
    for (const [k, t] of Object.entries(pinTex)) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 8).translate(0, 0.75, 0), poleM);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 14).translate(0, 0.05, 0), baseM);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6).translate(0.45, 1.18, 0), flagMat(t));
      flag.layers.set(NOINK);
      for (const m of [pole, base]) { m.castShadow = true; g.add(m); }
      flag.castShadow = true; g.add(flag);
      g.visible = false; R.add(g);
      this.pins[k] = { g, flag };
    }
    // the 1934 blockhouse ring
    const bh = lam("blockhouse", () => ({ color: "#56677f" })), bhr = lam("blockRoof", () => ({ color: "#33405a" }));
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(boxGeo(V(-0.2, 0, -0.2), V(0.2, 0.42, 0.2)), bh);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4).rotateY(Math.PI / 4).translate(0, 0.53, 0), bhr);
      for (const m of [body, roof]) { m.castShadow = true; g.add(m); }
      g.visible = false; R.add(g); this.blocks.push(g);
    }
  }

  // ---------------- per-frame ----------------
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

  private poseGateFlag(id: number, t: number) {
    const fl = this.gateFlag, m = fl.m, show = id === 1 || id === 10 || id === 14;
    m.visible = show;
    if (!show) return;
    m.material = id === 1 ? this.gateFlagMats.dragon : this.gateFlagMats.prc;
    const pole: V3 = [GATE[0] + 10, 0, GATE[2] - 6];
    let top = 16.6, droop = 0, fall = 0;
    if (id === 1 && t > W.fell - 0.1) { const u = t - (W.fell - 0.1); fall = Math.min(1, u / 0.62); top = 16.6 - 15.4 * fall * fall; droop = fall; }
    if (id === 10) top = 2.6 + 14.0 * smooth((t - (W.four + 0.05)) / 1.15);
    m.position.set(pole[0] + 0.1, top - fl.h / 2, pole[2]);
    m.rotation.set(0, 0.35, id === 1 ? -0.9 * droop : 0);
    const p = m.geometry.attributes.position as THREE.BufferAttribute;
    const wind = 1 - 0.7 * droop;
    for (let i = 0; i < p.count; i++) {
      const u = (i % 17) / 16, y = i < 17 ? fl.h / 2 : -fl.h / 2;
      p.setXYZ(i, u * fl.w, y - 0.12 * u * u * (1 - wind) * fl.h + 0.05 * u * Math.sin(t * 4 - u * 3), 0.3 * u * wind * Math.sin(t * 5.2 - u * 5));
    }
    p.needsUpdate = true;
  }

  private poseMap(id: number, t: number, map: boolean) {
    for (const p of Object.values(this.pins)) p.g.visible = false;
    for (const g of this.blocks) g.visible = false;
    if (!map) return;
    const q = Math.round(t * FPS);
    if (q !== this.mapT) { paintMap(this.mapCanvas.getContext("2d")!, t); this.mapTex.needsUpdate = true; this.mapT = q; }
    const pop = (t0: number) => { const u = clamp01((t - t0) / 0.3); return u <= 0 ? 0 : u < 1 ? Math.sin(u * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) * (1 + 0.15 * Math.sin(u * Math.PI)) : 1; };
    const place = (k: string, ll: LL, s: number, sway = 0) => {
      const p = this.pins[k]; if (s <= 0.01) return;
      const g = geo(ll[0], ll[1], LAND_H - 0.02);
      p.g.visible = true; p.g.position.set(...g); p.g.scale.setScalar(s); p.g.rotation.set(0, -0.35 + 0.08 * Math.sin(t * 2 + sway), 0);
    };
    const mv = (a: LL, b: LL, k: number): LL => [a[0] + (b[0] - a[0]) * smooth(k), a[1] + (b[1] - a[1]) * smooth(k)];
    // Communist red flag: Jinggang -> Ruijin -> the head of the march -> Yan'an -> Beijing
    if (t > W.communists - 0.1) {
      let ll: LL = JINGGANG;
      if (t > 15) ll = RUIJIN;
      if (t >= W.broke) ll = routeAt(routeK(t));
      if (t > 37) ll = mv(YANAN, BEIJING, (t - 39.6) / 1.3);
      if (t > 43) ll = BEIJING;
      place("red", ll, (t < 15 ? pop(W.communists - 0.1) : 1) * (t > 43 ? 0 : 1));
    }
    if (t > 43) place("prc", BEIJING, 1);
    // Nationalist flag: Nanjing, to Taiwan at the end of the civil war
    if (t > W.nationalists - 0.1 && t < 47.5) place("roc", mv(NANJING, TAIPEI, (t - 40.0) / 1.0), t < 15 ? pop(W.nationalists - 0.1) : 1);
    // Japan: Manchuria (occupied since 1931), Beijing on the invasion; gone with the surrender
    if (t > 28 && t < 39) {
      const gone = 1 - smooth((t - (W.surrendered - 0.05)) / 0.35);
      place("japan", MANCHURIA, gone);
      place("jp2", [118.0, 38.6], pop(W.invaded - 0.05) * gone);
    }
    // Korea 1950
    if (t > 43 && t < 48) {
      place("red2", mv([124.4, 40.3], [126.3, 38.4], (t - (W.troops + 0.3)) / 0.9), pop(W.troops - 0.1));
      place("us", mv([129.0, 35.2], [127.6, 37.0], (t - (W.united + 0.1)) / 0.8), pop(W.united - 0.2));
    }
    // the blockhouse ring
    if (t > 16.4 && t < 26) {
      const rr = ringR(t);
      this.blocks.forEach((g, i) => {
        const a = (i / this.blocks.length) * Math.PI * 2;
        const ll: LL = [RUIJIN[0] - 0.4 + (rr * Math.cos(a)) / 0.84, RUIJIN[1] + 0.3 + rr * Math.sin(a)];
        const p = geo(ll[0], ll[1], LAND_H - 0.02), s = pop(W.nationalist - 0.15 + 0.025 * i);
        if (s <= 0.01) return;
        g.visible = true; g.position.set(...p); g.scale.setScalar(s * 1.1);
        const west = Math.abs(Math.atan2(Math.sin(a - Math.PI * 1.05), Math.cos(a - Math.PI * 1.05))) < 0.45;
        g.rotation.set(0, a, west ? -1.35 * smooth((t - (W.broke - 0.05)) / 0.25) : 0);
      });
    }
  }

  private poseSnow(id: number, t: number, cam: THREE.PerspectiveCamera) {
    const on = id === 6 || id === 12;
    this.snow.visible = on;
    if (!on) return;
    const p = this.snow.geometry.attributes.position as THREE.BufferAttribute, B = this.snowBase;
    const fw = new THREE.Vector3(); cam.getWorldDirection(fw);
    const cx = cam.position.x + fw.x * 7, cy = cam.position.y + 1, cz = cam.position.z + fw.z * 7;
    const S = 16, Hh = 10, heavy = id === 6;
    const wind = heavy ? 1.6 : 0.35, fall = heavy ? 1.3 : 0.6;
    this.snowMat.size = heavy ? 0.06 : 0.045;
    this.snowMat.color.set(id === 12 ? "#b8c6e0" : "#ffffff");
    for (let i = 0; i < p.count; i++) {
      const sp = 0.7 + 0.6 * B[i * 4 + 3];
      const wrap = (v: number, n: number) => ((v % n) + n) % n;
      const x = wrap(B[i * 4] * S + wind * sp * t + 0.3 * Math.sin(t * 1.3 + i), S) - S / 2;
      const y = wrap(B[i * 4 + 1] * Hh - fall * sp * t, Hh) - Hh / 2;
      const z = wrap(B[i * 4 + 2] * S + 0.4 * Math.sin(t * 0.9 + i * 0.37), S) - S / 2;
      p.setXYZ(i, cx + x, cy + y, cz + z);
    }
    p.needsUpdate = true;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.map ? 0.5 : 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden" || s.light === "dusk") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = 1.03 * L.charGain;
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const cl = s.light === "day" || s.light === "golden" || s.light === "dusk";
    if (cl && !this.cloudMaps[s.light]) this.cloudMaps[s.light] = [0, 1, 2, 3].map((k) => cloudHD(k + 10, K.cloud));
    this.clouds.forEach((m, i) => {
      m.visible = cl;
      if (!cl) return;
      const a = (i / 8) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      m.position.set(cam.position.x + Math.cos(a) * d, 110 + (i % 4) * 40, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light]![i % 4];
      (m.material as THREE.MeshBasicMaterial).color.setScalar(s.light === "dusk" ? 0.9 : 1.05);
    });
    // ---- props ----
    this.poseGateFlag(id, t);
    this.poseMap(id, t, !!s.map);
    this.poseSnow(id, t, cam);
    const smokeOn = id === 8;
    for (const sm of this.smoke) {
      sm.m.visible = smokeOn;
      if (!smokeOn) continue;
      const u = (t * 0.07 + sm.k) % 1, sz = 6 + u * 16;
      sm.m.position.set(sm.top[0] + u * 14, sm.top[1] + u * 26 + u * u * 6, sm.top[2]);
      sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.8 * (1 - u) ** 1.2;
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir }, s.light);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 2.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    const fxTint = new THREE.Color(1, 1, 1);
    if (s.light === "night") fxTint.setRGB(0.55, 0.62, 0.85); else if (s.light === "dusk") fxTint.setRGB(1.0, 0.86, 0.74); else if (s.light === "golden") fxTint.setRGB(1.0, 0.85, 0.68);
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind(fxTint);
    return focus;
  }
}
