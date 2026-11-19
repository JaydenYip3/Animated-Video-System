// "airbnb-obama-os" world: one golden exterior (a city plaza with a giant growth-chart sculpture and a hazy skyline) +
// one sealed interior far off (the cramped 2008 apartment: couch, coffee table, air mattress, pizza boxes, a wall
// calendar, cereal boxes). update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
// All generic: no logos, no brand art, no real people.
import * as THREE from "three";
import { Batch, boxGeo, quad, V, lam, Kit, prop } from "./build";
import { ctex, rng, rep, planksHD, stoneHD, cloudHD, CLOUD_DAY, CLOUD_GOLD } from "./paint";
import { Pen, fxYear, cerealFront, cerealSide } from "./toon";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, W, smooth, clamp01, add, V3, CITY, APT, INSIDE_X, ROOM, TABLE_TOP, TABLE, HERO, BOX, CAL,
  STACK, stackT, soldT, COUNT0, COUNT1, easeOut, LEAD,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
const glowTex = () => ctex("abGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** warm wallpaper: faint vertical stripes + scuffs, a darker lower band */
const wallpaper = () => ctex("abWall", 512, 512, (g, r) => {
  g.fillStyle = "#ecd6a2"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) { g.fillStyle = "rgba(190,140,70,0.16)"; g.fillRect(x, 0, 10, 512); }
  for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(80,50,20,${0.02 + 0.03 * r()})`; g.fillRect(r() * 512, r() * 512, 8 + 26 * r(), 5 + 12 * r()); }
  g.fillStyle = "#c98f5a"; g.fillRect(0, 400, 512, 112);
  g.fillStyle = "#a8703f"; g.fillRect(0, 392, 512, 12);
});
const ceilTex = () => ctex("abCeil", 256, 256, (g, r) => {
  g.fillStyle = "#efe8da"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,100,70,${0.03 * r()})`; g.fillRect(r() * 256, r() * 256, 20, 10); }
});
/** city view through the apartment window */
const cityWindow = () => ctex("abWinCity", 320, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#5a90da"); gr.addColorStop(1, "#c6dcf2");
  g.fillStyle = gr; g.fillRect(0, 0, 320, 256);
  const bs: [number, number, number, string][] = [[0, 60, 120, "#8a9ab8"], [55, 50, 170, "#a8b4cc"], [100, 70, 90, "#7a88a8"], [165, 45, 200, "#98a6c2"], [205, 60, 130, "#8494b4"], [262, 58, 160, "#a0aec8"]];
  for (const [x, w, h, c] of bs) { g.fillStyle = c; g.fillRect(x, 256 - h, w, h); g.fillStyle = "rgba(255,250,220,0.55)"; for (let yy = 256 - h + 12; yy < 250; yy += 18) for (let xx = x + 8; xx < x + w - 8; xx += 14) g.fillRect(xx, yy, 6, 8); }
  g.strokeStyle = "#f0ece2"; g.lineWidth = 16; g.strokeRect(0, 0, 320, 256); g.lineWidth = 9; g.beginPath(); g.moveTo(160, 0); g.lineTo(160, 256); g.stroke();
});
/** a tower facade: window grid on a wall colour, per-floor bands */
const towerTex = (key: string, wall: string, glass: string, cols: number, rows: number) => ctex(key, 256, 512, (g, r) => {
  g.fillStyle = wall; g.fillRect(0, 0, 256, 512);
  const cw = 256 / cols, rh = 512 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const lit = r() < 0.18;
    g.fillStyle = lit ? "#ffe2a0" : glass; g.fillRect(i * cw + cw * 0.18, j * rh + rh * 0.2, cw * 0.64, rh * 0.6);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(i * cw + cw * 0.18, j * rh + rh * 0.2, cw * 0.2, rh * 0.6);
  }
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let j = 0; j < rows; j++) g.fillRect(0, j * rh, 256, 3);
});
const pizzaTex = () => ctex("abPizza", 256, 256, (g) => {
  g.fillStyle = "#e8d2a8"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#b8955e"; g.lineWidth = 6; g.strokeRect(8, 8, 240, 240);
  g.fillStyle = "#d8433a"; g.beginPath(); g.arc(128, 128, 54, 0, 7); g.fill();
  g.fillStyle = "#e8d2a8"; g.beginPath(); g.arc(128, 128, 36, 0, 7); g.fill();
});
const mattressTex = () => ctex("abMattress", 512, 512, (g) => {
  g.fillStyle = "#4f8ad8"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(255,255,255,0.18)"; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 26, 512);
});
const paveTex = () => stoneHD("abPave", ["#d8cdbb", "#cfc2ae", "#e2d8c8", "#c6b8a4"], "#9c8e7c");

const LKEYS = ["day", "indoor", "lamp", "night", "golden"] as const;
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
  private lampGlow!: THREE.Sprite;
  private hero!: THREE.Mesh;
  private stack: THREE.Mesh[] = [];
  private cash: THREE.Mesh[] = [];
  private bars: { m: THREE.Mesh; h: number; t: number }[] = [];
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
  private room(b: Batch, c: V3, X0: number, X1: number, Z0: number, Z1: number, H: number, wall: THREE.Material, floor: THREE.Material, ceil: THREE.Material, skirt = "#6a4328") {
    const x0 = c[0] + X0, x1 = c[0] + X1, z0 = c[2] + Z0, z1 = c[2] + Z1, u = (X1 - X0) / 2.5, v = (Z1 - Z0) / 2.5, hv = 1;
    b.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, H, z0), V(x0, H, z0), u, hv), wall);
    b.add(quad(V(x1, 0, z1), V(x0, 0, z1), V(x0, H, z1), V(x1, H, z1), u, hv), wall);
    b.add(quad(V(x0, 0, z1), V(x0, 0, z0), V(x0, H, z0), V(x0, H, z1), v, hv), wall);
    b.add(quad(V(x1, 0, z0), V(x1, 0, z1), V(x1, H, z1), V(x1, H, z0), v, hv), wall);
    b.add(quad(V(x0, 0.001, z1), V(x1, 0.001, z1), V(x1, 0.001, z0), V(x0, 0.001, z0), u, v), floor);
    b.add(quad(V(x0, H, z0), V(x1, H, z0), V(x1, H, z1), V(x0, H, z1), u, v), ceil);
    const sk = lam("abSkirt" + skirt, () => ({ color: skirt }));
    b.add(boxGeo(V(x0, 0, z0), V(x1, 0.1, z0 + 0.03)), sk);
    b.add(boxGeo(V(x0, 0, z0), V(x0 + 0.03, 0.1, z1)), sk);
    b.add(boxGeo(V(x1 - 0.03, 0, z0), V(x1, 0.1, z1)), sk);
  }
  /** a ceiling light (emissive) */
  private panel(x: number, y: number, z: number, w = 0.7, d = 0.7) {
    const p = this.plane(null, w, d, V(x, y - 0.01, z), 0, new THREE.Color(2.4, 2.3, 2.0));
    p.mesh.rotation.x = Math.PI / 2; this.panels.push(p.m);
  }
  /** one cereal box mesh (base at y = 0, front +z) */
  private cerealMats?: THREE.Material[];
  private cereal() {
    if (!this.cerealMats) {
      const front = lam("abBoxFront", () => ({ map: ctex("abBoxFrontT", 512, 724, (g) => cerealFront(g, 512, 724)) }));
      const side = lam("abBoxSide", () => ({ map: ctex("abBoxSideT", 128, 724, (g) => cerealSide(g, 128, 724)) }));
      const top = lam("abBoxTop", () => ({ color: "#1f3a7a" }));
      this.cerealMats = [side, side, top, top, front, front];
    }
    const geo = new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d); geo.translate(0, BOX.h / 2, 0);
    const m = new THREE.Mesh(geo, this.cerealMats);
    m.castShadow = true; m.receiveShadow = true;
    this.root.add(m);
    return m;
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
    // clouds: camera-relative sprites (infinitely far), golden palette
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + ((i - 4) / 9) * 2.2, el = THREE.MathUtils.degToRad(6 + 10 * ((i * 37) % 10) / 10);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(i % 4, CLOUD_GOLD), fog: false, depthWrite: false, transparent: true }));
      s.renderOrder = -0.5; s.frustumCulled = false; s.layers.set(NOINK); R.add(s);
      this.clouds.push({ s, dir: V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), size: 150 + 80 * ((i * 53) % 7) / 7 });
    }
    void CLOUD_DAY;
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);

    const b = new Batch();
    this.buildCity(b); this.buildApt(b);
    b.build(R);
  }

  // ======================= the city (golden) =======================
  private buildCity(b: Batch) {
    const [cx, , cz] = CITY;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), lam("abGround", () => ({ color: "#9a9a8a" })));
    ground.position.set(cx, -0.01, cz); ground.receiveShadow = true; this.root.add(ground);
    b.add(boxGeo(V(cx - 14, 0, cz - 12), V(cx + 14, 0.02, cz + 14)), lam("abPave", () => ({ map: rep(paveTex(), 7, 6.5) })));
    // the growth-chart sculpture: a plinth + five bars that rise on "Today ... worth billions"
    b.add(boxGeo(V(cx - 2.75, 0, cz - 5.6), V(cx + 2.75, 0.3, cz - 4.4)), lam("abPlinth", () => ({ color: "#efe6d2" })));
    const H = [1.1, 1.9, 2.9, 4.2, 6.0], cols = ["#5fbf5a", "#4fb25a", "#3fa65a", "#2f9a5a", "#e8b44a"];
    H.forEach((h, i) => {
      const geo = new THREE.BoxGeometry(0.72, 1, 0.72); geo.translate(0, 0.5, 0);
      const m = new THREE.Mesh(geo, lam("abBar" + i, () => ({ color: cols[i] })));
      m.position.set(cx - 2.0 + i * 1.0, 0.3, cz - 5.0); m.castShadow = true; m.receiveShadow = true;
      this.root.add(m); this.bars.push({ m, h, t: W.today - 0.15 + i * 0.42 });
    });
    // planters + trees around the plaza
    for (const [x, z, h] of [[-6.5, -3, 4.6], [6.8, -3.5, 5.0], [-9, 3, 5.2], [9.5, 2.5, 4.8], [-12, -9, 6], [12, -9, 6]] as const) prop(b, {}, "tree_oak", cx + x, 0, cz + z, h);
    // the skyline: towers in rings, taller toward the back, a gap behind the chart for the sun
    const r = rng(41);
    const palette: [string, string][] = [["#e8dcc6", "#5a7aa0"], ["#c8d4e2", "#4a6a92"], ["#e6c8a8", "#6a7a9a"], ["#d8d0e0", "#56709a"], ["#f0e2c8", "#5f86b0"], ["#b8c8d8", "#3f5f88"]];
    let k = 0;
    for (let ring = 0; ring < 4; ring++) {
      const zc = -48 - ring * 40, n = 9 + ring * 3;
      for (let i = 0; i < n; i++) {
        const x = -110 + (220 * (i + 0.5 * r())) / n, z = zc - 14 * r();
        if (Math.abs(x) < 9 && ring < 2) continue;
        const w = 9 + 10 * r(), d = 9 + 10 * r(), h = 10 + ring * 12 + 22 * r() + (Math.abs(x) < 40 ? 10 * r() : 0);
        const [wall, glass] = palette[k % palette.length];
        const m = lam(`abTower${k % 12}`, () => ({ map: rep(towerTex(`abTowerT${k % 12}`, wall, glass, 5, 10), Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 16))) }));
        b.add(boxGeo(V(cx + x - w / 2, 0, cz + z - d / 2), V(cx + x + w / 2, h, cz + z + d / 2)), m);
        b.add(boxGeo(V(cx + x - w / 2 - 0.4, h, cz + z - d / 2 - 0.4), V(cx + x + w / 2 + 0.4, h + 1.0, cz + z + d / 2 + 0.4)), lam("abCap", () => ({ color: "#8a8478" })));
        if (r() < 0.3) b.add(boxGeo(V(cx + x - 0.2, h + 1, cz + z - 0.2), V(cx + x + 0.2, h + 7, cz + z + 0.2)), lam("abMast", () => ({ color: "#6a6460" })));
        k++;
      }
    }
    // two big hero towers flanking the chart
    for (const [x, z, w, h, i] of [[-26, -42, 16, 120, 1], [30, -50, 18, 140, 4]] as const) {
      const [wall, glass] = palette[i];
      b.add(boxGeo(V(cx + x - w / 2, 0, cz + z - w / 2), V(cx + x + w / 2, h, cz + z + w / 2)), lam(`abHero${i}`, () => ({ map: rep(towerTex(`abHeroT${i}`, wall, glass, 6, 12), 2, 8) })));
      b.add(boxGeo(V(cx + x - 1, h, cz + z - 1), V(cx + x + 1, h + 14, cz + z + 1)), lam("abMast", () => ({ color: "#6a6460" })));
    }
  }

  // ======================= the 2008 apartment =======================
  private buildApt(b: Batch) {
    const A = APT, [ax, , az] = A, Rm = ROOM;
    this.room(b, A, Rm.x0, Rm.x1, Rm.z0, Rm.z1, Rm.h, lam("abWallM", () => ({ map: rep(wallpaper(), 1, 1) })),
      lam("abFloor", () => ({ map: rep(planksHD(), 2.5, 2.5) })), lam("abCeilM", () => ({ map: rep(ceilTex(), 4, 4) })));
    this.panel(ax - 0.3, Rm.h, az - 1.4);
    // couch against the back wall
    const couch = lam("abCouch", () => ({ color: "#8a9a4a" })), cush = lam("abCush", () => ({ color: "#a2b058" })), wood = lam("abWood", () => ({ color: "#9a6a3e" }));
    const cx0 = ax - 1.45, cx1 = ax + 0.85, cz0 = az - 3.15, cz1 = az - 2.2;
    b.add(boxGeo(V(cx0, 0.08, cz0), V(cx1, 0.3, cz1)), couch);
    b.add(boxGeo(V(cx0, 0.08, cz0), V(cx1, 0.98, cz0 + 0.28)), couch);
    for (const x of [cx0, cx1 - 0.2]) b.add(boxGeo(V(x, 0.08, cz0), V(x + 0.2, 0.64, cz1)), couch);
    for (let i = 0; i < 3; i++) b.add(boxGeo(V(cx0 + 0.22 + i * 0.63, 0.3, cz0 + 0.28), V(cx0 + 0.82 + i * 0.63, 0.43, cz1 - 0.02)), cush);
    for (const [x, z] of [[cx0 + 0.05, cz0 + 0.05], [cx1 - 0.1, cz0 + 0.05], [cx0 + 0.05, cz1 - 0.1], [cx1 - 0.1, cz1 - 0.1]]) b.add(boxGeo(V(x, 0, z), V(x + 0.06, 0.08, z + 0.06)), wood);
    // a patch on the couch arm (it has seen things)
    b.add(boxGeo(V(cx0 - 0.005, 0.32, cz0 + 0.5), V(cx0 + 0.001, 0.5, cz0 + 0.72)), lam("abPatch", () => ({ color: "#c8743a" })));
    // coffee table
    const [tx, , tz] = add(A, TABLE);
    b.add(boxGeo(V(tx - 0.68, TABLE_TOP - 0.04, tz - 0.32), V(tx + 0.68, TABLE_TOP, tz + 0.32)), lam("abTableTop", () => ({ color: "#b07a48" })));
    for (const [x, z] of [[-0.62, -0.26], [0.58, -0.26], [-0.62, 0.22], [0.58, 0.22]]) b.add(boxGeo(V(tx + x, 0, tz + z), V(tx + x + 0.05, TABLE_TOP - 0.04, tz + z + 0.05)), wood);
    // instant noodle cups + a mug on the table edge
    for (const [x, z, c] of [[0.5, -0.18, "#f0ece2"], [0.56, 0.08, "#f0ece2"]] as const) {
      b.add(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 14), lam("abCup" + c, () => ({ color: c })), new THREE.Matrix4().makeTranslation(tx + x, TABLE_TOP + 0.05, tz + z));
      b.add(new THREE.CylinderGeometry(0.051, 0.051, 0.025, 14), lam("abCupBand", () => ({ color: "#d8433a" })), new THREE.Matrix4().makeTranslation(tx + x, TABLE_TOP + 0.07, tz + z));
    }
    // air mattress on the floor (right), with a pillow
    b.add(boxGeo(V(ax + 1.05, 0, az - 1.7), V(ax + 2.45, 0.24, az + 0.3)), lam("abMat", () => ({ map: rep(mattressTex(), 1, 1) })));
    b.add(boxGeo(V(ax + 1.3, 0.24, az - 1.6), V(ax + 2.2, 0.36, az - 1.2)), lam("abPillow", () => ({ color: "#f4f2ea" })));
    b.add(boxGeo(V(ax + 1.1, 0.24, az - 1.1), V(ax + 2.4, 0.3, az + 0.2)), lam("abBlanket", () => ({ color: "#d8564a" })));
    // pizza box tower (left corner) + a laptop-free desk crate
    for (let i = 0; i < 5; i++) b.add(boxGeo(V(ax - 2.45 + 0.02 * (i % 2), i * 0.05, az - 2.4), V(ax - 1.95 + 0.02 * (i % 2), i * 0.05 + 0.045, az - 1.9)), lam("abPizzaSide", () => ({ color: "#d8c098" })));
    b.add(quad(V(ax - 2.45, 0.251, az - 1.9), V(ax - 1.95, 0.251, az - 1.9), V(ax - 1.95, 0.251, az - 2.4), V(ax - 2.45, 0.251, az - 2.4)), lam("abPizzaTop", () => ({ map: pizzaTex() })));
    // floor lamp right of the couch
    const metal = lam("abLampM", () => ({ color: "#3a3a42" }));
    b.add(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), metal, new THREE.Matrix4().makeTranslation(ax + 2.15, 0.75, az - 2.85));
    b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), metal, new THREE.Matrix4().makeTranslation(ax + 2.15, 0.015, az - 2.85));
    b.add(new THREE.CylinderGeometry(0.15, 0.22, 0.26, 16, 1, true), lam("abShade", () => ({ color: "#f2d89a", side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(ax + 2.15, 1.55, az - 2.85));
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.3, 1.0, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.lampGlow.position.set(ax + 2.15, 1.5, az - 2.85); this.lampGlow.scale.setScalar(0.8); this.lampGlow.layers.set(NOINK); this.root.add(this.lampGlow);
    // window (left wall) with the city outside, the calendar (back wall), a poster-free corkboard
    this.plane(cityWindow(), 1.3, 1.05, V(ax + Rm.x0 + 0.02, 1.5, az - 1.0), Math.PI / 2, new THREE.Color(1.1, 1.1, 1.1));
    b.add(boxGeo(V(ax + Rm.x0, 0.94, az - 1.7), V(ax + Rm.x0 + 0.12, 0.98, az - 0.3)), lam("abSill", () => ({ color: "#f0ece2" })));
    const cal = this.plane(ctex("abCal", 400, 480, (g) => { const p = new Pen(g); fxYear(p, "2008"); }), 0.5, 0.6, V(ax + CAL[0], CAL[1], az + CAL[2]), 0, new THREE.Color(0.96, 0.94, 0.9));
    cal.m.transparent = false;
    b.add(boxGeo(V(ax - 1.9, 1.3, az - 3.19), V(ax - 1.1, 1.85, az - 3.16)), lam("abCork", () => ({ color: "#c89a62" })));
    for (const [x, y, c] of [[-1.75, 1.7, "#f4f0a0"], [-1.45, 1.55, "#a0d8f4"], [-1.25, 1.72, "#f4b8c8"], [-1.6, 1.42, "#ffffff"]] as const)
      b.add(boxGeo(V(ax + x, y - 0.07, az - 3.16), V(ax + x + 0.13, y + 0.07, az - 3.15)), lam("abNote" + c, () => ({ color: c })));
    // the hero box + the stack (posed per frame)
    this.hero = this.cereal();
    for (let i = 0; i < STACK.length; i++) this.stack.push(this.cereal());
    // cash bundles (appear on the table as the money comes in)
    const cashM = lam("abCash", () => ({ color: "#6fbf5a" })), band = lam("abBand", () => ({ color: "#f2e6b8" }));
    const bg = new THREE.BoxGeometry(0.2, 0.05, 0.1), bandG = new THREE.BoxGeometry(0.04, 0.052, 0.102);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(bg, cashM), bd = new THREE.Mesh(bandG, band);
      m.add(bd); m.castShadow = true; this.root.add(m); this.cash.push(m);
    }
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
    CARD_K.uGain.value = 1.0;
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = inside ? 40 : L.fogNear; this.fog.far = inside ? 400 : L.fogFar;
    scene.fog = this.fog; scene.background = null;
    for (const cl of this.clouds) {
      cl.s.visible = !inside;
      cl.s.position.copy(cam.position).addScaledVector(cl.dir, 900);
      cl.s.scale.set(cl.size, cl.size * 0.5, 1);
    }
    for (const p of this.panels) p.color.setScalar(2.2);
    this.lampGlow.visible = inside;
    // ---- the apartment props ----
    const A = APT;
    // hero box: appears with the stack ("sell"), wobbles on "O's" and on the tag slap, flies off with the sale
    const heroIn = id >= 4 && id <= 7;
    const heroLand = W.sell - 0.18;
    this.hero.visible = heroIn && t > heroLand - 0.3;
    if (this.hero.visible) {
      const u = clamp01((t - (heroLand - 0.3)) / 0.3), drop = 1.4 * (1 - u * u);
      const hop = (t0: number, a: number) => (t > t0 && t < t0 + 0.3 ? a * Math.sin(((t - t0) / 0.3) * Math.PI) : 0);
      const sold = W.they2 + 0.25, su2 = clamp01((t - sold) / 0.45);
      const yaw = id === 5 ? 0.32 * (1 - smooth((t - W.obama + 0.1) / 0.5)) : id === 6 ? 0.0 : 0.05;
      const tilt = id === 6 ? -0.08 * Math.exp(-Math.max(0, t - (W.forty - LEAD)) * 7) * (t > W.forty - LEAD ? 1 : 0) : 0;
      this.hero.position.set(A[0] + HERO[0] - 1.2 * su2 * su2, A[1] + HERO[1] + drop + hop(W.os - LEAD, 0.05) + hop(W.box - LEAD, 0.03) + 2.4 * su2 * (1 - su2 * 0.4), A[2] + HERO[2] + 0.3 * su2);
      this.hero.rotation.set(0, yaw + 5 * su2 * su2, tilt + 2 * su2 * su2);
      this.hero.visible = su2 < 1;
    }
    this.stack.forEach((m, i) => {
      const [x, y, z, yaw] = STACK[i];
      const t0 = stackT(i), u = clamp01((t - (t0 - 0.28)) / 0.28);
      const show = (id >= 4 && id <= 7) && t > t0 - 0.28;
      const ts = soldT(i), us = clamp01((t - ts) / 0.5);
      m.visible = show && us < 1;
      if (!m.visible) return;
      const drop = 1.6 * (1 - u * u), side = x > -0.3 ? 1 : -1;
      m.position.set(A[0] + x + side * 2.2 * us * us, A[1] + y + drop + 3.2 * us * (1 - 0.3 * us), A[2] + z + 0.6 * us);
      m.rotation.set(0.6 * us * us, yaw + side * 4 * us * us, side * 1.5 * us);
    });
    const nCash = id === 7 ? Math.floor(12 * easeOut((t - COUNT0) / (COUNT1 - COUNT0 + 0.2))) : id === 8 ? 12 : 0;
    this.cash.forEach((m, i) => {
      m.visible = i < nCash;
      if (!m.visible) return;
      const col = i % 4, row = Math.floor(i / 4) % 3;
      const lay = i < 8 ? 0 : 1;
      m.position.set(A[0] + TABLE[0] - 0.33 + col * 0.22 + (lay ? 0.11 : 0), TABLE_TOP + 0.025 + lay * 0.05, A[2] + TABLE[2] - 0.1 + (row % 2) * 0.12 + (lay ? 0.06 : 0));
      m.rotation.set(0, (i * 0.37) % 0.3 - 0.15, 0);
    });
    // ---- the growth chart ----
    for (const bar of this.bars) {
      const u = id === 9 ? easeOut((t - bar.t) / 0.5) : 0, over = id === 9 && t > bar.t + 0.5 ? 1 + 0.06 * Math.exp(-(t - bar.t - 0.5) * 8) : 1;
      const h = Math.max(0.02, bar.h * u * over);
      bar.m.scale.set(1, h, 1); bar.m.visible = h > 0.03;
    }
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
void LKEYS; void ({} as LK); void clamp01; void CITY;
