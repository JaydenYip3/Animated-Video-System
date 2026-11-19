// "The Lighthouse Keeper" world: open sea (the template's water shader), a rocky islet (heightfield with painted vertex
// colours + inked boulders), a whitewashed tower with a red band, gallery, glazed lantern room, domed roof and a
// rotating lamp beam, the keeper's cottage with a real lit doorway, a rowboat, stars, clouds and the cast.
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { ctex, rng, stoneHD, roofHD, waterNear, waterFar, cloudHD, beam, brick, rep } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { FPS, SHOTS, camAt, ShotDef, GROUND, TOWER, TOWER_H, GY, LAMP, DOOR, TOWN, CHAIR, WIN_X, lampOn, beamAngle, beamOnTown, smooth, clamp01 } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- islet heightfield ----------------
const IC: [number, number] = [0.5, -1.5]; // islet centre (x, z)
const BEACH_X = 3.0;
const beachW = (x: number, z: number) => Math.exp(-(((x - BEACH_X) / 3.0) ** 2)) * smooth((z - 6) / 5);
const noise2 = (x: number, z: number) =>
  0.5 * Math.sin(x * 0.37 + 1.3) * Math.cos(z * 0.41 - 0.7) + 0.3 * Math.sin(x * 0.93 - z * 0.77 + 2.1) + 0.2 * Math.sin(x * 1.9 + z * 1.6);
const rimR = (a: number) => 17 + 2.2 * Math.sin(3 * a + 1) + 1.4 * Math.sin(5 * a + 2) + 0.8 * Math.sin(9 * a);
/** islet surface height at (x, z) (sea level 0) */
export const groundY = (x: number, z: number) => {
  const dx = x - IC[0], dz = z - IC[1], r = Math.hypot(dx, dz), a = Math.atan2(dz, dx), R = rimR(a);
  const t = smooth((r - (R - 2)) / 9);
  const crag = noise2(x, z) * 1.3 * Math.sin(Math.PI * clamp01(t)) ;
  const rock = GROUND * (1 - t) + -2.6 * t + crag + (r < R - 2 ? 0.12 * noise2(x * 2, z * 2) : 0);
  // the cove: a smooth shingle ramp from the plateau (z 9) down into the sea (z 26)
  const bw = beachW(x, z);
  const ramp = GROUND - (GROUND + 0.8) * smooth((z - 9.5) / 16.5) ** 0.9;
  const y = rock + (ramp - rock) * bw;
  return Math.max(-3, y);
};
const ROCK = new THREE.Color("#6c645c"), ROCK2 = new THREE.Color("#857b70"), WET = new THREE.Color("#3e3a3c"), TURF = new THREE.Color("#6a7a46"),
  TURF2 = new THREE.Color("#7d8a50"), SHINGLE = new THREE.Color("#8a8288"), SHINGLE2 = new THREE.Color("#746c74"), PATH = new THREE.Color("#9c8f7a");
const isletGeo = () => {
  const N = 220, S = 64, g = new THREE.PlaneGeometry(S * 2, S * 2, N, N);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + IC[0], z = p.getZ(i) + IC[1], y = groundY(x, z);
    p.setXYZ(i, x, y, z);
  }
  const n = g.attributes.normal as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, h = 1.2, nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    nv.set(groundY(x - h, z) - groundY(x + h, z), 2 * h, groundY(x, z - h) - groundY(x, z + h)).normalize();
    n.setXYZ(i, nv.x, nv.y, nv.z);
    uv.setXY(i, (x + 0.6 * y * Math.sign(x - IC[0])) / (2 * S), (z + 0.6 * y * Math.sign(z - IC[1])) / (2 * S));
  }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), up = n.getY(i), k = 0.5 + 0.5 * noise2(x * 3.1, z * 2.7);
    c.copy(ROCK).lerp(ROCK2, k);
    if (up > 0.86 && y > GROUND - 0.6) c.copy(TURF).lerp(TURF2, k);
    // path from the cove up to the door
    const pd = Math.abs(x - (BEACH_X + (DOOR[0] - BEACH_X) * clamp01((10 - z) / 6))) ;
    if (y > GROUND - 0.4 && z > 3.6 && z < 11 && pd < 0.9) c.copy(PATH).lerp(TURF, 0.15 * k);
    const bw = beachW(x, z);
    if (bw > 0.02) c.lerp(new THREE.Color().copy(SHINGLE).lerp(SHINGLE2, k), clamp01(bw * 1.6) * (y < GROUND - 0.3 ? 1 : 0.4));
    if (y < 0.5) c.lerp(WET, clamp01((0.5 - y) / 1.2) * 0.8);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
};
/** a smooth craggy boulder: displaced icosphere (smooth normals, so the ink draws its silhouette, not every facet) */
const boulderGeo = (seed: number) => {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position as THREE.BufferAttribute, r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6], v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const d = 1 + 0.18 * Math.sin(v.x * 3 + ph[0]) * Math.cos(v.z * 2.6 + ph[1]) + 0.1 * Math.sin(v.y * 5 + ph[2]) - 0.25 * Math.max(0, -v.y);
    p.setXYZ(i, v.x * d, v.y * d * 0.72, v.z * d);
  }
  g.computeVertexNormals();
  return g;
};

// ---------------- painted textures ----------------
const whiteStone = () => stoneHD("lhWhite", ["#ece6da", "#e4ddd0", "#f1ece2", "#ddd5c6"], "#b9b0a2");
const beamTex = () => ctex("lhBeam", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); // v = 0 at the far end .. 1 at the lamp
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
});
const glowTex = () => ctex("lhGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** every lens position looking at its subject (used to keep boulders out of the frame centre) */
type Ray = { o: THREE.Vector3; d: THREE.Vector3; len: number };
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a; f < s.b; f += 4) {
    const c = camAt(s.id, f), o = V(...c.pos), d = V(...c.look).sub(o), len = d.length();
    out.push({ o, d: d.normalize(), len });
  }
  return out;
};
const blocks = (rays: Ray[], c: THREE.Vector3, rad: number) => rays.some(({ o, d, len }) => {
  const t = THREE.MathUtils.clamp(c.clone().sub(o).dot(d), 0, len);
  return o.clone().addScaledVector(d, t).distanceTo(c) < rad + 0.6;
});

const softTex = () => ctex("ghFog", 256, 128, (g) => {
  const gr = g.createRadialGradient(128, 64, 4, 128, 64, 126);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.45, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.setTransform(1, 0, 0, 0.5, 0, 32); g.fillStyle = gr; g.fillRect(0, -64, 256, 256);
});
/** an old cobweb across the window's upper corner: radial threads + sagging spiral, drawn pale */
const webTex = () => ctex("ghWeb", 512, 512, (g) => {
  g.strokeStyle = "rgba(235,240,255,0.85)"; g.lineWidth = 2;
  const cx = 0, cy = 0, n = 9;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 520, cy + Math.sin(a) * 520); g.stroke(); }
  g.lineWidth = 1.4;
  for (let k = 1; k < 9; k++) {
    const R = k * 52; g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI / 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
      if (i === 0) g.moveTo(x, y); else { const am = ((i - 0.5) / n) * Math.PI / 2, s = R * 0.9; g.quadraticCurveTo(Math.cos(am) * s, Math.sin(am) * s, x, y); }
    }
    g.stroke();
  }
  // a torn strand hanging down
  g.beginPath(); g.moveTo(300, 120); g.quadraticCurveTo(330, 300, 310, 470); g.stroke();
});
const glassTex = () => ctex("ghGlass", 256, 256, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(90,90,100,${0.08 + r() * 0.18})`; g.beginPath(); g.arc(r() * 256, r() * 256, 2 + r() * 10, 0, 6.3); g.fill(); } // grime
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(80,80,90,0)"); gr.addColorStop(1, "rgba(80,80,90,0.35)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

const LIGHT_KEYS = ["ghost", "room"] as const;
type LK = (typeof LIGHT_KEYS)[number];
const FLOOR = GROUND + 0.15;
// back wall window (in the cottage's back wall, z = Z0 .. Z0 + 0.4)
const Z0 = -1.8, WX0 = WIN_X - 0.6, WX1 = WIN_X + 0.6, WY0 = FLOOR + 1.0, WY1 = FLOOR + 2.3;

export class World {
  root = new THREE.Group();
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private cloudMaps: Record<LK, THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private stars: THREE.Points;
  private lampCore: THREE.Mesh; private lampGlow: THREE.Sprite; private glass: THREE.MeshBasicMaterial;
  private beamMat: THREE.MeshBasicMaterial; private beamPivot = new THREE.Group();
  private fogBanks: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; x: number; z: number; y: number; w: number; v: number; o: number }[] = [];
  private winGlass: THREE.MeshBasicMaterial; private shaftMat: THREE.MeshBasicMaterial; private dust: THREE.Points; private dustSeed: Float32Array;
  private chair = new THREE.Group();
  private townGlow: THREE.Sprite; private townWin: THREE.MeshBasicMaterial; private townRefl: THREE.MeshBasicMaterial;

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
    {
      const r = rng(5), n = 700, pos = new Float32Array(n * 3), cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, el = Math.asin(0.12 + 0.88 * r() ** 0.7), d = 1000;
        pos.set([Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d], i * 3);
        const b = (0.2 + 0.6 * r() ** 3) * Math.min(1, (el - 0.1) * 3);
        cols.set([b, b, b * 1.1], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }));
      this.stars.layers.set(NOINK); this.stars.frustumCulled = false; this.stars.renderOrder = -0.8;
      R.add(this.stars);
    }
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(1.05, 1.1, 1.25), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = Object.fromEntries(LIGHT_KEYS.map((k) => [k, [0, 1, 2, 3].map((i) => cloudHD(i + 4, LOOK[k].cloud))])) as unknown as Record<LK, THREE.Texture[]>;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3, d = 640 + (i % 3) * 70;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.ghost[i % 4], transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
      const w = 200 + (i % 4) * 50;
      m.position.set(Math.cos(a) * d, 30 + (i % 4) * 22, Math.sin(a) * d); m.scale.set(w, w / 2.6, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- sea ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), waterM);
    sea.receiveShadow = true; R.add(sea);

    // ---- islet ----
    const b = new Batch();
    const pebbles = ctex("lhPebbles", 1024, 1024, (g, r) => {
      g.fillStyle = "#f2efe9"; g.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 1400; i++) {
        const x = r() * 1024, y = r() * 1024, rx = 6 + r() * 16, ry = rx * (0.55 + r() * 0.35), k = 200 + Math.floor(r() * 50);
        for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
          g.fillStyle = `rgb(${k},${k - 4},${k - 10})`; g.strokeStyle = "rgba(60,50,50,0.45)"; g.lineWidth = 2.2;
          g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, r() * 3, 0, Math.PI * 2); g.fill(); g.stroke();
        }
      }
    });
    const rockM = twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, map: rep(pebbles, 36, 36) }));
    const islet = new THREE.Mesh(isletGeo(), rockM); islet.receiveShadow = true; islet.castShadow = true; R.add(islet);
    const bm = [lam("lhRockA", () => ({ color: "#736a62" })), lam("lhRockB", () => ({ color: "#5f5853" })), lam("lhRockC", () => ({ color: "#81786c" }))];
    const rays = sightLines(), r = rng(31);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, R0 = rimR(a) + 2 + r() * 9, x = IC[0] + Math.cos(a) * R0, z = IC[1] + Math.sin(a) * R0;
      if (beachW(x, z) > 0.15) continue;
      const s = 0.8 + r() * (R0 > rimR(a) + 7 ? 2.2 : 3.2), y = Math.max(-0.6, groundY(x, z)) + s * 0.25, c = V(x, y, z);
      if (blocks(rays, c, s)) continue;
      b.add(boulderGeo(i + 3), bm[i % 3], new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r() * 6), V(s * (1 + r() * 0.5), s, s)));
    }
    for (const [x, z, s] of [[-60, -40, 4], [70, -90, 6], [-110, 30, 5], [45, 85, 3], [60, 20, 3.5]] as const)
      b.add(boulderGeo(x + z), bm[1], new THREE.Matrix4().compose(V(x, s * 0.2, z), new THREE.Quaternion(), V(s * 1.4, s, s)));

    // ---- tower ----
    const tw = lam("lhTower", () => ({ map: rep(whiteStone(), 3, 4) }));
    const band = lam("lhBand", () => ({ color: "#8e3c36" }));
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#2e3138", specular: "#6a6a6a", shininess: 40 }), 0.15);
    const dome = lam("lhDome", () => ({ color: "#6e3530" }));
    const [tx, ty, tz] = TOWER, rB = 3.3, rT = 2.45;
    const radAt = (h: number) => rB + (rT - rB) * (h / TOWER_H);
    const lathe = (h0: number, h1: number) => new THREE.LatheGeometry([new THREE.Vector2(radAt(h0), h0), new THREE.Vector2(radAt(h1), h1)], 40);
    const at = new THREE.Matrix4().makeTranslation(tx, ty, tz);
    b.add(lathe(-2.5, 10.2), tw, at); b.add(lathe(10.2, 13.0), band, at); b.add(lathe(13.0, TOWER_H), tw, at);
    b.add(new THREE.CylinderGeometry(rB + 0.35, rB + 0.45, 0.6, 40), lam("lhPlinth", () => ({ map: stoneHD("copeHD") })), new THREE.Matrix4().makeTranslation(tx, ty + 0.3, tz));
    const slit = lam("lhSlit", () => ({ color: "#1c1a22" }));
    for (const [h, a] of [[5, 0.4], [9, 2.2], [14.6, 0.9], [7, -2.2], [12, 1.5]] as const) {
      const rr = radAt(h) + 0.02, g = new THREE.PlaneGeometry(0.45, 0.9);
      b.add(g, slit, new THREE.Matrix4().makeRotationY(Math.PI / 2 - a).setPosition(tx + Math.cos(a) * rr, ty + h, tz + Math.sin(a) * rr));
    }
    b.add(new THREE.CylinderGeometry(3.45, 2.9, 0.35, 40), lam("lhDeck", () => ({ color: "#bdb6aa" })), new THREE.Matrix4().makeTranslation(tx, GY - 0.17, tz));
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      b.add(boxGeo(V(-0.035, 0, -0.035), V(0.035, 1.05, 0.035)), iron, new THREE.Matrix4().makeTranslation(tx + Math.cos(a) * 3.3, GY, tz + Math.sin(a) * 3.3));
    }
    for (const h of [0.55, 1.05]) b.add(new THREE.TorusGeometry(3.3, 0.04, 6, 64).rotateX(Math.PI / 2), iron, new THREE.Matrix4().makeTranslation(tx, GY + h, tz));
    b.add(new THREE.CylinderGeometry(2.05, 2.05, 0.7, 20), tw, new THREE.Matrix4().makeTranslation(tx, GY + 0.35, tz));
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      b.add(boxGeo(V(-0.05, 0, -0.05), V(0.05, 2.3, 0.05)), iron, new THREE.Matrix4().makeTranslation(tx + Math.cos(a) * 2.02, GY + 0.7, tz + Math.sin(a) * 2.02));
    }
    b.add(new THREE.TorusGeometry(2.03, 0.06, 6, 40).rotateX(Math.PI / 2), iron, new THREE.Matrix4().makeTranslation(tx, GY + 1.85, tz));
    b.add(new THREE.CylinderGeometry(2.25, 2.25, 0.18, 30), iron, new THREE.Matrix4().makeTranslation(tx, GY + 3.05, tz));
    b.add(new THREE.SphereGeometry(2.2, 30, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1), dome, new THREE.Matrix4().makeTranslation(tx, GY + 3.1, tz));
    b.add(new THREE.SphereGeometry(0.32, 16, 10), dome, new THREE.Matrix4().makeTranslation(tx, GY + 4.75, tz));
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6), iron, new THREE.Matrix4().makeTranslation(tx, GY + 5.6, tz));
    this.glass = new THREE.MeshBasicMaterial({ color: new THREE.Color("#10142a"), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const glassM = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 2.3, 10, 1, true), this.glass);
    glassM.position.set(tx, GY + 1.85, tz); glassM.layers.set(NOINK); glassM.renderOrder = 2; R.add(glassM);
    this.lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 6, 3), fog: false }));
    this.lampCore.position.set(...LAMP); this.lampCore.layers.set(NOINK); R.add(this.lampCore);
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(3, 2.3, 1.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    this.lampGlow.position.set(...LAMP); this.lampGlow.scale.setScalar(7); this.lampGlow.layers.set(NOINK); this.lampGlow.renderOrder = 6; R.add(this.lampGlow);
    // one long soft beam from the lamp (apex at the lamp, opening along +x of the pivot)
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(1.6, 1.35, 0.85), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false });
    {
      // two crossed soft fans (horizontal + vertical): a cone's far rim reads as a disc when seen from behind
      const L = 340, Wd = 26;
      const fan = ctex("ghFan", 512, 128, (g) => {
        const im = g.createImageData(512, 128);
        for (let x = 0; x < 512; x++) for (let y = 0; y < 128; y++) {
          const d = x / 511, half = 0.012 + 0.988 * d, a = Math.abs(y - 63.5) / 64 / half;
          const along = Math.pow(1 - d, 1.4) * Math.min(1, x / 6 + 0.2);
          const al = a > 1 ? 0 : Math.exp(-a * a * 3.2) * along;
          const i = (y * 512 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * al);
        }
        g.putImageData(im, 0, 0);
      });
      this.beamMat.map = fan;
      for (const rx of [0, Math.PI / 2]) {
        const g = new THREE.PlaneGeometry(L, 2 * Wd); g.translate(L / 2, 0, 0); g.rotateX(rx === 0 ? Math.PI / 2 : 0);
        const m = new THREE.Mesh(g, this.beamMat); m.layers.set(NOINK); m.renderOrder = 7; m.frustumCulled = false;
        this.beamPivot.add(m);
      }
    }
    this.beamPivot.position.set(...LAMP); R.add(this.beamPivot);

    // ---- the keeper's cottage (dark: nobody lives here) with a real back window into the empty room ----
    const cw = lam("lhCottage", () => ({ map: rep(whiteStone(), 2, 1.2) })), slate = lam("lhSlate", () => ({ map: roofHD("#4d5260", true), side: THREE.DoubleSide }));
    const X0 = 3.6, X1 = 11.6, Z1 = DOOR[2], H = 3.1, y0 = GROUND - 0.6, dx0 = DOOR[0] - 0.55, dx1 = DOOR[0] + 0.55, dh = 2.05;
    const TOP = GROUND + H;
    // back wall split around the window opening
    b.add(boxGeo(V(X0, y0, Z0), V(WX0, TOP, Z0 + 0.4), 2), cw);
    b.add(boxGeo(V(WX1, y0, Z0), V(X1, TOP, Z0 + 0.4), 2), cw);
    b.add(boxGeo(V(WX0, y0, Z0), V(WX1, WY0, Z0 + 0.4), 2), cw);
    b.add(boxGeo(V(WX0, WY1, Z0), V(WX1, TOP, Z0 + 0.4), 2), cw);
    b.add(boxGeo(V(X0, y0, Z0), V(X0 + 0.4, TOP, Z1), 2), cw);
    b.add(boxGeo(V(X1 - 0.4, y0, Z0), V(X1, TOP, Z1), 2), cw);
    b.add(boxGeo(V(X0, y0, Z1 - 0.4), V(dx0, TOP, Z1), 2), cw);
    b.add(boxGeo(V(dx1, y0, Z1 - 0.4), V(X1, TOP, Z1), 2), cw);
    b.add(boxGeo(V(dx0, GROUND + dh, Z1 - 0.4), V(dx1, TOP, Z1), 2), cw);
    const floorTex = ctex("ghFloor", 512, 512, (g, r) => {
      g.fillStyle = "#5c5048"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(${70 + r() * 20},${60 + r() * 15},${52 + r() * 10},0.7)`; g.fillRect(0, i * 64 + 2, 512, 60); g.fillStyle = "rgba(20,15,15,0.8)"; g.fillRect(0, i * 64, 512, 3); }
      for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(170,165,160,${r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 1 + r() * 2); } // dust
    });
    b.add(boxGeo(V(X0, GROUND - 0.05, Z0), V(X1, FLOOR, Z1), 2), lam("ghFloorM", () => ({ map: rep(floorTex, 1, 1) })));
    // window: frame + cross bars in the opening, sill
    const wood = lam("ghWood", () => ({ color: "#4a3a30" }));
    const zf = Z0 + 0.2;
    b.add(boxGeo(V(WIN_X - 0.04, WY0, zf - 0.04), V(WIN_X + 0.04, WY1, zf + 0.04)), wood);
    b.add(boxGeo(V(WX0, (WY0 + WY1) / 2 - 0.04, zf - 0.04), V(WX1, (WY0 + WY1) / 2 + 0.04, zf + 0.04)), wood);
    b.add(boxGeo(V(WX0 - 0.1, WY0 - 0.08, Z0 + 0.3), V(WX1 + 0.1, WY0, Z0 + 0.62)), wood);
    // gable roof
    const rh = 1.9, o = 0.35, zm = (Z0 + Z1) / 2;
    const quadP = (a: THREE.Vector3, bb: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u: number, v: number) => {
      const g = new THREE.BufferGeometry(); const n = bb.clone().sub(a).cross(d.clone().sub(a)).normalize();
      g.setAttribute("position", new THREE.Float32BufferAttribute([a, bb, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([n.x, n.y, n.z]).flat(), 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2)); return g;
    };
    b.add(quadP(V(X0 - o, TOP - 0.2, Z1 + o), V(X1 + o, TOP - 0.2, Z1 + o), V(X1 + o, TOP + rh, zm), V(X0 - o, TOP + rh, zm), 3, 1.2), slate);
    b.add(quadP(V(X1 + o, TOP - 0.2, Z0 - o), V(X0 - o, TOP - 0.2, Z0 - o), V(X0 - o, TOP + rh, zm), V(X1 + o, TOP + rh, zm), 3, 1.2), slate);
    for (const [xx, s] of [[X0, -1], [X1, 1]] as const) {
      const g = new THREE.BufferGeometry(), pts = s < 0 ? [V(xx, TOP, Z0), V(xx, TOP, Z1), V(xx, TOP + rh, zm)] : [V(xx, TOP, Z1), V(xx, TOP, Z0), V(xx, TOP + rh, zm)];
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3)); g.computeVertexNormals();
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); b.add(g, cw);
    }
    // ceiling beams (seen from inside)
    for (const z of [-0.4, 1.0, 2.3]) b.add(boxGeo(V(X0, TOP - 0.25, z - 0.1), V(X1, TOP - 0.05, z + 0.1)), wood);
    b.add(boxGeo(V(10.2, TOP, -0.9), V(10.9, TOP + rh + 0.9, -0.2), 2), lam("lhChim", () => ({ map: rep(brick(), 1, 1) })));
    // front windows: dark, unlit panes; a shut door
    const dark = new THREE.MeshBasicMaterial({ color: new THREE.Color("#0b0d16") });
    for (const x of [5.2, 9.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), dark); w.position.set(x, GROUND + 1.55, Z1 + 0.01); w.layers.set(NOINK); R.add(w); }
    b.add(boxGeo(V(dx0, GROUND, Z1 - 0.26), V(dx1, GROUND + dh - 0.03, Z1 - 0.2)), lam("lhDoor", () => ({ map: rep(beam(), 1, 2) })));
    b.add(boxGeo(V(dx0 - 0.1, GROUND - 0.12, Z1), V(dx1 + 0.1, GROUND + 0.08, Z1 + 0.45), 2), lam("lhStep", () => ({ map: stoneHD("copeHD") })));

    // ---- inside: the empty rocking chair, a little table with his cap and a cold oil lamp ----
    const chairM = lam("ghChair", () => ({ color: "#6a4e3a" })), clothM = lam("ghCloth", () => ({ color: "#3e4458" }));
    const cb = new Batch();
    const leg = (x: number, z: number, h: number) => cb.add(boxGeo(V(x - 0.025, 0.08, z - 0.025), V(x + 0.025, h, z + 0.025)), chairM);
    for (const [x, z] of [[-0.23, -0.2], [0.23, -0.2], [-0.23, 0.22], [0.23, 0.22]] as const) leg(x, z, 0.45);
    cb.add(boxGeo(V(-0.26, 0.43, -0.24), V(0.26, 0.48, 0.26)), chairM);                        // seat
    for (const s of [-1, 1]) {
      cb.add(boxGeo(V(s * 0.23 - 0.025, 0.45, 0.22), V(s * 0.23 + 0.025, 1.12, 0.27)), chairM);   // back posts
      cb.add(boxGeo(V(s * 0.25 - 0.025, 0.68, -0.22), V(s * 0.25 + 0.025, 0.72, 0.25)), chairM);  // arms
      cb.add(boxGeo(V(s * 0.25 - 0.02, 0.46, -0.2), V(s * 0.25 + 0.02, 0.7, -0.16)), chairM);
      // rocker: a flat arc under each side
      const rk = new THREE.TorusGeometry(1.1, 0.025, 4, 24, 0.62).rotateZ(-Math.PI / 2 - 0.31).rotateY(Math.PI / 2);
      cb.add(rk, chairM, new THREE.Matrix4().makeTranslation(s * 0.23, 1.15, 0.02));
    }
    cb.add(boxGeo(V(-0.23, 1.06, 0.22), V(0.23, 1.14, 0.27)), chairM);                           // top rail
    for (let k = 0; k < 5; k++) { const x = -0.16 + k * 0.08; cb.add(boxGeo(V(x - 0.012, 0.48, 0.235), V(x + 0.012, 1.06, 0.255)), chairM); }
    cb.add(boxGeo(V(-0.24, 0.48, -0.2), V(0.22, 0.52, 0.2)), clothM);                            // a flat old cushion
    cb.build(this.chair);
    this.chair.position.set(CHAIR[0], FLOOR, CHAIR[2]); this.chair.rotation.y = Math.PI + 0.55; // faces the window, turned toward the lens
    R.add(this.chair);
    const tb = new Batch();
    const TX = 9.55, TZ = -0.35;
    tb.add(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20), wood, new THREE.Matrix4().makeTranslation(TX, FLOOR + 0.7, TZ));
    tb.add(new THREE.CylinderGeometry(0.035, 0.05, 0.7, 8), wood, new THREE.Matrix4().makeTranslation(TX, FLOOR + 0.35, TZ));
    tb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), wood, new THREE.Matrix4().makeTranslation(TX, FLOOR + 0.015, TZ));
    // the keeper's peaked cap (navy crown + black peak), left where he put it down
    tb.add(new THREE.CylinderGeometry(0.13, 0.11, 0.08, 18), lam("ghCap", () => ({ color: "#283048" })), new THREE.Matrix4().makeTranslation(TX - 0.08, FLOOR + 0.76, TZ + 0.08));
    tb.add(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 18, 1, false, 0, Math.PI), lam("ghPeak", () => ({ color: "#14161c" })), new THREE.Matrix4().makeRotationY(1.2).setPosition(TX - 0.08, FLOOR + 0.73, TZ + 0.12));
    // cold oil lamp: brass base + clear chimney
    tb.add(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 14), lam("ghBrass", () => ({ color: "#8a7444" })), new THREE.Matrix4().makeTranslation(TX + 0.12, FLOOR + 0.78, TZ - 0.06));
    tb.add(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 14), lam("ghChimney", () => ({ color: "#7d8796" })), new THREE.Matrix4().makeTranslation(TX + 0.12, FLOOR + 0.94, TZ - 0.06));
    tb.build(R);
    // grimy window glass (moonlit night outside), brightens when the lighthouse beam sweeps past
    this.winGlass = new THREE.MeshBasicMaterial({ map: glassTex(), color: new THREE.Color("#55618a"), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    const wg = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), this.winGlass);
    wg.position.set(WIN_X, (WY0 + WY1) / 2, zf + 0.05); wg.layers.set(NOINK); wg.renderOrder = 3; R.add(wg);
    const web = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: webTex(), color: new THREE.Color(0.55, 0.6, 0.75), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    web.position.set(WX0 + 0.27, WY1 - 0.27, zf + 0.12); web.rotation.z = 0; web.scale.y = -1; web.layers.set(NOINK); web.renderOrder = 4; R.add(web);
    // the moonlight shaft from the window to the floor (soft additive volume)
    {
      const d = new THREE.Vector3(...(SHOTS[1].sunDir ?? [0, 0.5, -0.86])).normalize().negate();
      const proj = (x: number, y: number) => { const k = (y - FLOOR) / -d.y; return V(x + d.x * k, FLOOR + 0.01, zf + d.z * k); };
      const c = [V(WX0, WY0, zf), V(WX1, WY0, zf), V(WX1, WY1, zf), V(WX0, WY1, zf)], p = [proj(WX0, WY0), proj(WX1, WY0), proj(WX1, WY1), proj(WX0, WY1)];
      const pos: number[] = [], uv: number[] = [];
      const side = (a: THREE.Vector3, bb: THREE.Vector3, pa: THREE.Vector3, pb: THREE.Vector3) => {
        for (const [q, v] of [[a, 0], [bb, 0], [pb, 1], [a, 0], [pb, 1], [pa, 1]] as const) { pos.push(q.x, q.y, q.z); uv.push(0.5, v); }
      };
      side(c[0], c[1], p[0], p[1]); side(c[1], c[2], p[1], p[2]); side(c[2], c[3], p[2], p[3]); side(c[3], c[0], p[3], p[0]);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const fade = ctex("ghShaft", 4, 128, (gg) => { const gr = gg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0.25)"); gg.fillStyle = gr; gg.fillRect(0, 0, 4, 128); });
      fade.flipY = false;
      this.shaftMat = new THREE.MeshBasicMaterial({ map: fade, color: new THREE.Color(0.07, 0.085, 0.13), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const shaft = new THREE.Mesh(g, this.shaftMat); shaft.layers.set(NOINK); shaft.renderOrder = 5; R.add(shaft);
      // dust motes drifting in the shaft
      const n = 220, rr = rng(77); this.dustSeed = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) this.dustSeed.set([rr(), rr(), rr(), rr()], i * 4);
      const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTex(), size: 0.022, color: new THREE.Color(1.0, 1.05, 1.25), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      this.dust.layers.set(NOINK); this.dust.frustumCulled = false; this.dust.renderOrder = 6; R.add(this.dust);
      (this.dust.userData as { d: THREE.Vector3 }).d = d;
    }
    b.build(R);

    // ---- the far shore across the bay: dark hills, a quay of small houses with lit windows, a church ----
    {
      const N = 160, M = 30, g = new THREE.PlaneGeometry(1600, 300, N, M).rotateX(-Math.PI / 2);
      const p = g.attributes.position as THREE.BufferAttribute, rr = rng(9);
      const hill = (x: number, z: number) => {
        const d = -(z + 312); // metres inland from the waterline
        const base = d < 0 ? d * 0.4 : 2.2 + d * 0.12 + Math.max(0, d - 30) * 0.22;
        return base + (d > 10 ? 6 * Math.sin(x * 0.011 + 1.2) + 4 * Math.sin(x * 0.027) + 2 * Math.sin(x * 0.07) : 0);
      };
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + TOWN[0], z = p.getZ(i) - 430; p.setXYZ(i, x, hill(x, z), z); }
      g.computeVertexNormals();
      R.add(Object.assign(new THREE.Mesh(g, lam("ghShore", () => ({ color: "#3a3e3c" }))), { receiveShadow: false }));
      const tb2 = new Batch(), walls = [lam("ghTownA", () => ({ color: "#8a8478" })), lam("ghTownB", () => ({ color: "#6e6a64" })), lam("ghTownC", () => ({ color: "#9a8c78" }))];
      const roofM = lam("ghTownRoof", () => ({ color: "#3a3438" }));
      const winPos: number[] = [];
      for (let i = 0; i < 46; i++) {
        const row = i < 26 ? 0 : i < 38 ? 1 : 2;
        const x = TOWN[0] + (row === 0 ? -95 + i * 7.4 : row === 1 ? -60 + (i - 26) * 10 : -35 + (i - 38) * 11) + (rr() - 0.5) * 2.5;
        const z = -316 - row * 13 - rr() * 3, w = 5 + rr() * 2.5, d = 6, h = 5 + rr() * 3 + (row === 0 ? 0 : 1), y = hill(x, z) - 0.5;
        tb2.add(boxGeo(V(x - w / 2, y, z - d / 2), V(x + w / 2, y + h, z + d / 2)), walls[i % 3]);
        const gab = new THREE.BufferGeometry(), a = V(x - w / 2 - 0.3, y + h, z + d / 2 + 0.3), b2 = V(x + w / 2 + 0.3, y + h, z + d / 2 + 0.3), c2 = V(x, y + h + 2.6, z + d / 2 + 0.3);
        const a2 = V(x - w / 2 - 0.3, y + h, z - d / 2 - 0.3), bb2 = V(x + w / 2 + 0.3, y + h, z - d / 2 - 0.3), cc2 = V(x, y + h + 2.6, z - d / 2 - 0.3);
        gab.setAttribute("position", new THREE.Float32BufferAttribute([a, b2, c2, a, c2, cc2, a, cc2, a2, b2, bb2, cc2, b2, cc2, c2, bb2, a2, cc2].flatMap((q) => [q.x, q.y, q.z]), 3));
        gab.computeVertexNormals(); tb2.add(gab, roofM);
        // 1-3 lit windows on the bay-facing front
        const nw = 1 + Math.floor(rr() * 3);
        for (let k = 0; k < nw; k++) if (rr() < 0.8) winPos.push(x - w / 2 + (k + 0.5) * (w / nw), y + 1.6 + (rr() < 0.5 ? 0 : 2.6), z + d / 2 + 0.05);
      }
      // church: nave + tower + spire
      const cx = TOWN[0] + 18, cz = -342, cy = hill(cx, cz) - 0.5;
      tb2.add(boxGeo(V(cx - 5, cy, cz - 9), V(cx + 5, cy + 9, cz + 6)), walls[0]);
      tb2.add(boxGeo(V(cx - 2.5, cy, cz + 6), V(cx + 2.5, cy + 17, cz + 11)), walls[0]);
      tb2.add(new THREE.ConeGeometry(3.4, 10, 4).rotateY(Math.PI / 4), roofM, new THREE.Matrix4().makeTranslation(cx, cy + 22, cz + 8.5));
      winPos.push(cx, cy + 12, cz + 11.1);
      tb2.build(R, false);
      // window lights: tiny emissive quads (unfogged: they glow through the haze)
      const wq = new THREE.PlaneGeometry(1.1, 1.3), wl = new THREE.InstancedMesh(wq, (this.townWin = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.8), fog: false })), winPos.length / 3);
      for (let i = 0; i < winPos.length / 3; i++) wl.setMatrixAt(i, new THREE.Matrix4().makeTranslation(winPos[i * 3], winPos[i * 3 + 1], winPos[i * 3 + 2]));
      wl.layers.set(NOINK); wl.frustumCulled = false; R.add(wl);
      // their wobbly reflections on the bay
      const reflTex = ctex("ghRefl", 32, 256, (gg, r3) => { for (let y = 0; y < 256; y += 4) { const a = (1 - y / 256) * (0.3 + r3() * 0.7); gg.fillStyle = `rgba(255,255,255,${a})`; const w = 6 + r3() * 18; gg.fillRect(16 - w / 2, y, w, 3); } });
      this.townRefl = new THREE.MeshBasicMaterial({ map: reflTex, color: new THREE.Color(0.9, 0.55, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      for (let i = 0; i < winPos.length / 3; i += 2) {
        if (winPos[i * 3 + 2] < -320) continue;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 26).rotateX(-Math.PI / 2), this.townRefl);
        m.position.set(winPos[i * 3], 0.05, -312 + 13); m.layers.set(NOINK); m.renderOrder = 1; R.add(m);
      }
      // where the beam lands on the town
      this.townGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.4, 1.15, 0.75), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
      this.townGlow.position.set(TOWN[0], 10, -322); this.townGlow.scale.set(120, 45, 1); this.townGlow.layers.set(NOINK); this.townGlow.renderOrder = 6; R.add(this.townGlow);
    }

    // ---- low sea fog banks ----
    {
      const st = softTex(), rr = rng(12);
      for (let i = 0; i < 26; i++) {
        const a = rr() * Math.PI * 2, d = 25 + rr() * 230, x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
        const mat = new THREE.MeshBasicMaterial({ map: st, color: new THREE.Color(0.3, 0.34, 0.46), transparent: true, opacity: 0.3 + rr() * 0.25, depthWrite: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK); m.renderOrder = 4;
        this.fogBanks.push({ m, mat, x, z, y: 1.5 + rr() * 5, w: 50 + rr() * 90, v: 0.4 + rr() * 0.8, o: mat.opacity }); R.add(m);
      }
    }
  }

  private shotSun(s: ShotDef) { return new THREE.Vector3(...(s.sunDir ?? [0.5, 0.5, -0.7])).normalize(); }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = id === 2 ? 0.05 : 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(s);
    const sweep = id === 2 ? Math.exp(-(((t - 7.7) / 0.35) ** 2)) : 0; // the beam passing the back window
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = id === 2 ? 9 : THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 60);
    const fc = id === 2 ? V(8, FLOOR, 0.5) : focus;
    this.sun.position.copy(fc).addScaledVector(sunDir, 220); this.sun.target.position.copy(fc);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    const lit = L.lit.map((v, i) => v * (1 + sweep * [1.6, 1.2, 0.5][i])) as [number, number, number];
    TONE.uLitCol.value.set(...lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, moon, stars, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position); this.stars.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    (this.stars.material as THREE.PointsMaterial).opacity = 0.7;
    // a small hazy moon, high behind the tower in shot 1, off-frame elsewhere
    const disc = V(-0.35, 0.42, -0.84).normalize();
    this.sunDisc.position.copy(cam.position).addScaledVector(disc, 900);
    this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(0.8)));
    this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(10)));
    (this.sunHalo.material as THREE.SpriteMaterial).color.set("#45507a");
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps.ghost[i % 4];
    }
    for (const fb of this.fogBanks) {
      fb.m.position.set(fb.x + t * fb.v, fb.y, fb.z);
      fb.m.lookAt(cam.position.x, fb.y, cam.position.z);
      fb.m.scale.set(fb.w, fb.w * 0.16, 1);
      fb.mat.opacity = fb.o;
    }
    // ---- sea ----
    const Wu = this.WU, wc = K.water;
    untone(wc.near, Wu.wNearC.value); untone(wc.mid, Wu.wMidC.value); untone(wc.far, Wu.wFarC.value);
    untone(wc.crest, Wu.wCrest.value); untone(wc.trough, Wu.wTrough.value); untone(wc.glint, Wu.wGlint.value);
    Wu.wShade.value.set(...wc.shade); Wu.wTime.value = t * 0.6;
    // ---- lamp + beam ----
    const on = lampOn(id, t);
    this.lampCore.visible = on > 0.02; this.lampGlow.visible = on > 0.02;
    (this.lampCore.material as THREE.MeshBasicMaterial).color.setRGB(8 * on, 6.5 * on, 3.8 * on);
    (this.lampGlow.material as THREE.SpriteMaterial).opacity = on;
    this.glass.color.set("#10142a").lerp(new THREE.Color(1.2, 0.95, 0.6), on);
    this.beamPivot.visible = on > 0.05 && id !== 2;
    this.beamPivot.rotation.y = beamAngle(id, t);
    const onTown = id === 3 ? beamOnTown(t) : 0;
    this.beamMat.opacity = (0.55 + 0.2 * onTown) * on;
    this.townGlow.visible = id === 3; (this.townGlow.material as THREE.SpriteMaterial).opacity = 0.3 * onTown;
    this.townWin.color.setRGB(3.2, 2.0, 0.8); this.townRefl.opacity = 0.55;
    // ---- room ----
    this.winGlass.color.set("#3c4566").lerp(new THREE.Color(2.2, 1.8, 1.1), sweep);
    this.shaftMat.color.setRGB(0.022 + 0.06 * sweep, 0.027 + 0.05 * sweep, 0.042 + 0.025 * sweep);
    // the empty chair rocks, very slightly, by itself
    this.chair.rotation.x = id === 2 ? 0.045 * Math.sin((t - 6.2) * 2.1) * smooth((t - 6.0) / 1.2) : 0;
    {
      const d = (this.dust.userData as { d: THREE.Vector3 }).d, p = this.dust.geometry.attributes.position as THREE.BufferAttribute, sd = this.dustSeed, zf = Z0 + 0.2;
      for (let i = 0; i < p.count; i++) {
        const [a, bq, cq, dq] = [sd[i * 4], sd[i * 4 + 1], sd[i * 4 + 2], sd[i * 4 + 3]];
        const x0 = WX0 + a * (WX1 - WX0), y0 = WY0 + bq * (WY1 - WY0), k = 0.3 + cq * ((y0 - FLOOR) / -d.y - 0.4);
        p.setXYZ(i, x0 + d.x * k + 0.05 * Math.sin(t * 0.7 + dq * 30), y0 + d.y * k + 0.04 * Math.sin(t * 0.5 + dq * 17) - 0.02 * t * (0.5 + dq), zf + d.z * k + 0.05 * Math.cos(t * 0.6 + dq * 11));
      }
      p.needsUpdate = true;
      this.dust.visible = id === 2;
    }
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.25 * wTime, 0.12 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
// keep imported helpers referenced (tree-shaking friendly, avoids unused-import lint noise)

