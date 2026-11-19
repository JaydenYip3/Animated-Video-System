// "The Lighthouse Keeper" world: open sea (the template's water shader), a rocky islet (heightfield with painted vertex
// colours + inked boulders), a whitewashed tower with a red band, gallery, glazed lantern room, domed roof and a
// rotating lamp beam, the keeper's cottage with a real lit doorway, a rowboat, stars, clouds and the cast.
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { ctex, rng, stoneHD, roofHD, waterNear, waterFar, cloudHD, beam, brick, rep } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, V3, GROUND, TOWER, TOWER_H, GY, LAMP, DOOR, lampOn, beamAngle, boatAt, W, LEAD, smooth, clamp01 } from "./story";

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
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});
/** warm interior seen through the door: lamplit back wall, a dresser, a chair */
const roomTex = () => ctex("lhRoom", 512, 512, (g) => {
  const gr = g.createRadialGradient(256, 200, 20, 256, 260, 380);
  gr.addColorStop(0, "#fff0c8"); gr.addColorStop(0.5, "#f2b866"); gr.addColorStop(1, "#a8582c");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(110,55,30,0.55)"; g.fillRect(40, 300, 150, 212); g.fillRect(340, 360, 20, 152); g.fillRect(420, 360, 20, 152); g.fillRect(330, 340, 120, 24);
  g.fillStyle = "rgba(255,250,230,0.8)"; g.beginPath(); g.arc(256, 150, 26, 0, Math.PI * 2); g.fill();
});
const windowTex = () => ctex("lhWin", 128, 128, (g) => {
  g.fillStyle = "#ffd690"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#3a2a26"; g.fillRect(58, 0, 12, 128); g.fillRect(0, 58, 128, 12);
  g.strokeStyle = "#3a2a26"; g.lineWidth = 14; g.strokeRect(0, 0, 128, 128);
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

const LIGHT_KEYS = ["dusk", "night", "lamp"] as const;
type LK = (typeof LIGHT_KEYS)[number];

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<LK, THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private stars: THREE.Points;
  private lampCore: THREE.Mesh; private lampGlow: THREE.Sprite; private glass: THREE.MeshBasicMaterial;
  private beams: THREE.Mesh[] = []; private beamMat: THREE.MeshBasicMaterial; private beamPivot = new THREE.Group();
  private winMat: THREE.MeshBasicMaterial; private roomMat: THREE.MeshBasicMaterial; private doorLeaf = new THREE.Group();
  private doorGlow: THREE.Sprite; private doorPool: THREE.Mesh;
  private boat = new THREE.Group();
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; k: number }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

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
    // stars (night): points on the upper sky, fading toward the horizon
    {
      const r = rng(5), n = 900, pos = new Float32Array(n * 3), cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, el = Math.asin(0.08 + 0.92 * r() ** 0.7), d = 1000;
        pos.set([Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d], i * 3);
        const b = (0.35 + 0.9 * r() ** 3) * Math.min(1, (el - 0.06) * 4);
        cols.set([b, b, b * 1.1], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }));
      this.stars.layers.set(NOINK); this.stars.frustumCulled = false; this.stars.renderOrder = -0.8;
      R.add(this.stars);
    }
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
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
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.dusk[i % 4], transparent: true, depthWrite: false, fog: false }));
      const w = 160 + (i % 4) * 40;
      m.position.set(Math.cos(a) * d, 40 + (i % 4) * 28, Math.sin(a) * d); m.scale.set(w, w / 2.4, 1);
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
          g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(x + ox - rx * 0.25, y + oy - ry * 0.3, rx * 0.4, ry * 0.3, 0, 0, Math.PI * 2); g.fill();
        }
      }
    });
    const rockM = twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, map: rep(pebbles, 36, 36) }));
    const islet = new THREE.Mesh(isletGeo(), rockM); islet.receiveShadow = true; islet.castShadow = true; R.add(islet);
    const bm = [lam("lhRockA", () => ({ color: "#736a62" })), lam("lhRockB", () => ({ color: "#5f5853" })), lam("lhRockC", () => ({ color: "#81786c" }))];
    const rays = sightLines(), r = rng(31);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, R0 = rimR(a) + 2 + r() * 9, x = IC[0] + Math.cos(a) * R0, z = IC[1] + Math.sin(a) * R0;
      if (beachW(x, z) > 0.15 || (z > 18 && Math.abs(x - BEACH_X) < 9)) continue;
      const s = 0.8 + r() * (R0 > rimR(a) + 7 ? 2.2 : 3.2), y = Math.max(-0.6, groundY(x, z)) + s * 0.25, c = V(x, y, z);
      if (blocks(rays, c, s)) continue;
      b.add(boulderGeo(i + 3), bm[i % 3], new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r() * 6), V(s * (1 + r() * 0.5), s, s)));
    }
    // offshore rocks (the empty horizon needs a few)
    for (const [x, z, s] of [[-60, -40, 4], [70, -90, 6], [-110, 30, 5], [45, 85, 3]] as const)
      b.add(boulderGeo(x + z), bm[1], new THREE.Matrix4().compose(V(x, s * 0.2, z), new THREE.Quaternion(), V(s * 1.4, s, s)));

    // ---- tower ----
    const tw = lam("lhTower", () => ({ map: rep(whiteStone(), 3, 4) }));
    const band = lam("lhBand", () => ({ color: "#b8463c" }));
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#2e3138", specular: "#6a6a6a", shininess: 40 }), 0.15);
    const dome = lam("lhDome", () => ({ color: "#8c3a30" }));
    const [tx, ty, tz] = TOWER, rB = 3.3, rT = 2.45;
    const radAt = (h: number) => rB + (rT - rB) * (h / TOWER_H);
    const lathe = (h0: number, h1: number) => new THREE.LatheGeometry([new THREE.Vector2(radAt(h0), h0), new THREE.Vector2(radAt(h1), h1)], 40);
    const at = new THREE.Matrix4().makeTranslation(tx, ty, tz);
    b.add(lathe(-2.5, 10.2), tw, at); b.add(lathe(10.2, 13.0), band, at); b.add(lathe(13.0, TOWER_H), tw, at);
    // plinth ring + tower door + small windows (dark slits)
    b.add(new THREE.CylinderGeometry(rB + 0.35, rB + 0.45, 0.6, 40), lam("lhPlinth", () => ({ map: stoneHD("copeHD") })), new THREE.Matrix4().makeTranslation(tx, ty + 0.3, tz));
    const slit = lam("lhSlit", () => ({ color: "#2a2630" }));
    for (const [h, a] of [[5, 0.4], [9, 2.2], [14.6, 0.9], [7, -2.2]] as const) {
      const rr = radAt(h) + 0.02, g = new THREE.PlaneGeometry(0.45, 0.9);
      b.add(g, slit, new THREE.Matrix4().makeRotationY(Math.PI / 2 - a).setPosition(tx + Math.cos(a) * rr, ty + h, tz + Math.sin(a) * rr));
    }
    // gallery: deck, corbel ring, railing posts + two rails
    b.add(new THREE.CylinderGeometry(3.45, 2.9, 0.35, 40), lam("lhDeck", () => ({ color: "#d9d2c4" })), new THREE.Matrix4().makeTranslation(tx, GY - 0.17, tz));
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      b.add(boxGeo(V(-0.035, 0, -0.035), V(0.035, 1.05, 0.035)), iron, new THREE.Matrix4().makeTranslation(tx + Math.cos(a) * 3.3, GY, tz + Math.sin(a) * 3.3));
    }
    for (const h of [0.55, 1.05]) b.add(new THREE.TorusGeometry(3.3, 0.04, 6, 64).rotateX(Math.PI / 2), iron, new THREE.Matrix4().makeTranslation(tx, GY + h, tz));
    // lantern room: base wall, glazing (own material, glows when lit), astragals, roof dome, ball vent + rod
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
    this.glass = new THREE.MeshBasicMaterial({ color: new THREE.Color("#1d2440"), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const glassM = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 2.3, 10, 1, true), this.glass);
    glassM.position.set(tx, GY + 1.85, tz); glassM.layers.set(NOINK); glassM.renderOrder = 2; R.add(glassM);
    this.lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 6, 3), fog: false }));
    this.lampCore.position.set(...LAMP); this.lampCore.layers.set(NOINK); R.add(this.lampCore);
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(3, 2.1, 1.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    this.lampGlow.position.set(...LAMP); this.lampGlow.scale.setScalar(6); this.lampGlow.layers.set(NOINK); this.lampGlow.renderOrder = 6; R.add(this.lampGlow);
    // the beam: two opposite soft cones from the lamp, turning
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(1.9, 1.35, 0.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (const s of [1, -1]) {
      const L = 140, g = new THREE.ConeGeometry(14, L, 24, 1, true); // apex at +y
      g.translate(0, -L / 2, 0); g.rotateZ(s * Math.PI / 2); // apex at the origin, opening along +-x
      const m = new THREE.Mesh(g, this.beamMat); m.layers.set(NOINK); m.renderOrder = 7; m.frustumCulled = false;
      this.beams.push(m); this.beamPivot.add(m);
    }
    this.beamPivot.position.set(...LAMP); R.add(this.beamPivot);

    // ---- keeper's cottage: whitewashed stone, slate roof, chimney; a real doorway into a lamplit room ----
    const cw = lam("lhCottage", () => ({ map: rep(whiteStone(), 2, 1.2) })), slate = lam("lhSlate", () => ({ map: roofHD("#5d6472", true), side: THREE.DoubleSide }));
    const X0 = 3.6, X1 = 11.6, Z0 = -1.8, Z1 = DOOR[2], H = 3.1, y0 = GROUND - 0.6, dx0 = DOOR[0] - 0.55, dx1 = DOOR[0] + 0.55, dh = 2.05;
    b.add(boxGeo(V(X0, y0, Z0), V(X1, GROUND + H, Z0 + 0.4), 2), cw);            // back wall
    b.add(boxGeo(V(X0, y0, Z0), V(X0 + 0.4, GROUND + H, Z1), 2), cw);            // left wall
    b.add(boxGeo(V(X1 - 0.4, y0, Z0), V(X1, GROUND + H, Z1), 2), cw);            // right wall
    b.add(boxGeo(V(X0, y0, Z1 - 0.4), V(dx0, GROUND + H, Z1), 2), cw);           // front, left of the door
    b.add(boxGeo(V(dx1, y0, Z1 - 0.4), V(X1, GROUND + H, Z1), 2), cw);           // front, right of the door
    b.add(boxGeo(V(dx0, GROUND + dh, Z1 - 0.4), V(dx1, GROUND + H, Z1), 2), cw); // lintel
    b.add(boxGeo(V(X0, GROUND - 0.05, Z0), V(X1, GROUND + 0.02, Z1), 2), lam("lhFloor", () => ({ color: "#6e4a32" }))); // floor
    b.add(boxGeo(V(dx0 - 0.1, GROUND - 0.12, Z1), V(dx1 + 0.1, GROUND + 0.08, Z1 + 0.45), 2), lam("lhStep", () => ({ map: stoneHD("copeHD") }))); // step
    // gable roof, ridge along x
    const rh = 1.9, o = 0.35, zm = (Z0 + Z1) / 2;
    const quadP = (a: THREE.Vector3, bb: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u: number, v: number) => {
      const g = new THREE.BufferGeometry(); const n = bb.clone().sub(a).cross(d.clone().sub(a)).normalize();
      g.setAttribute("position", new THREE.Float32BufferAttribute([a, bb, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([n.x, n.y, n.z]).flat(), 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2)); return g;
    };
    const Y = GROUND + H;
    b.add(quadP(V(X0 - o, Y - 0.2, Z1 + o), V(X1 + o, Y - 0.2, Z1 + o), V(X1 + o, Y + rh, zm), V(X0 - o, Y + rh, zm), 3, 1.2), slate);
    b.add(quadP(V(X1 + o, Y - 0.2, Z0 - o), V(X0 - o, Y - 0.2, Z0 - o), V(X0 - o, Y + rh, zm), V(X1 + o, Y + rh, zm), 3, 1.2), slate);
    for (const [xx, s] of [[X0, -1], [X1, 1]] as const) {
      const g = new THREE.BufferGeometry(), pts = s < 0 ? [V(xx, Y, Z0), V(xx, Y, Z1), V(xx, Y + rh, zm)] : [V(xx, Y, Z1), V(xx, Y, Z0), V(xx, Y + rh, zm)];
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3)); g.computeVertexNormals();
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); b.add(g, cw);
    }
    b.add(boxGeo(V(10.2, Y, -0.9), V(10.9, Y + rh + 0.9, -0.2), 2), lam("lhChim", () => ({ map: rep(brick(), 1, 1) })));
    // windows (emissive at night) and the room behind the door
    this.winMat = new THREE.MeshBasicMaterial({ map: windowTex(), color: new THREE.Color(1, 1, 1) });
    for (const x of [5.2, 9.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), this.winMat); w.position.set(x, GROUND + 1.55, Z1 + 0.01); w.layers.set(NOINK); R.add(w); }
    this.roomMat = new THREE.MeshBasicMaterial({ map: roomTex(), color: new THREE.Color(1, 1, 1) });
    const room = new THREE.Mesh(new THREE.PlaneGeometry(7.2, H), this.roomMat); room.position.set((X0 + X1) / 2, GROUND + H / 2, Z0 + 0.42); room.layers.set(NOINK); R.add(room);
    for (const xx of [X0 + 0.42, X1 - 0.42]) { // side walls inside, lamplit
      const m = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, H), this.roomMat); m.rotation.y = xx < 7 ? Math.PI / 2 : -Math.PI / 2;
      m.position.set(xx, GROUND + H / 2, zm); m.layers.set(NOINK); R.add(m);
    }
    const leaf = new THREE.Mesh(boxGeo(V(0, 0, -0.06), V(1.1, dh - 0.03, 0)), lam("lhDoor", () => ({ map: rep(beam(), 1, 2) })));
    leaf.castShadow = true; this.doorLeaf.add(leaf); this.doorLeaf.position.set(dx0, GROUND, Z1 - 0.2); R.add(this.doorLeaf);
    this.doorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.2, 0.75, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.doorGlow.position.set(DOOR[0], GROUND + 1.1, Z1 - 0.9); this.doorGlow.scale.set(2.6, 3.0, 1); this.doorGlow.layers.set(NOINK); this.doorGlow.renderOrder = 6; R.add(this.doorGlow);
    // warm light pool spilling from the doorway onto the step and the path (additive, fades with distance)
    const poolTex = ctex("lhPool", 256, 256, (g) => {
      const gr = g.createRadialGradient(128, 0, 10, 128, 0, 250);
      gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.3)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(90, 0); g.lineTo(166, 0); g.lineTo(256, 256); g.lineTo(0, 256); g.closePath(); g.fill();
    });
    this.doorPool = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 7.0), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(0.36, 0.2, 0.07),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.doorPool.rotation.x = -Math.PI / 2; this.doorPool.position.set(DOOR[0], GROUND + 0.1, Z1 + 3.5); this.doorPool.layers.set(NOINK); this.doorPool.renderOrder = 0.2; // before blobs + cards
    R.add(this.doorPool);
    // chimney smoke
    const st = smokeTex();
    for (let k = 0; k < 6; k++) {
      const mat = new THREE.MeshLambertMaterial({ map: st, transparent: true, depthWrite: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK);
      this.smoke.push({ m, mat, k: k / 6 }); R.add(m);
    }
    b.build(R);

    // ---- the rowboat ----
    const wood = lam("lhBoat", () => ({ color: "#9a6440" })), woodIn = lam("lhBoatIn", () => ({ color: "#6e4630", side: THREE.DoubleSide })), trim = lam("lhBoatTrim", () => ({ color: "#3e5f7a" }));
    const hull = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hull.scale(0.78, 0.5, 1.7);
    const hm = new THREE.Mesh(hull, wood); hm.position.y = 0.42; const hin = new THREE.Mesh(hull.clone().scale(0.94, 0.94, 0.96), woodIn); hin.position.y = 0.44;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40).rotateX(Math.PI / 2).scale(0.78, 1, 1.7), trim); rim.position.y = 0.42;
    const seat = new THREE.Mesh(boxGeo(V(-0.72, 0.18, -0.16), V(0.72, 0.24, 0.16)), woodIn); seat.position.z = -0.25;
    const oar = (s: number) => { const m = new THREE.Mesh(boxGeo(V(-0.03, -0.02, -1.3), V(0.03, 0.02, 1.3)), wood); m.position.set(s * 0.55, 0.47, 0.1); m.rotation.y = s * 0.12; return m; };
    void oar; // drifting: the oars are gone
    for (const m of [hm, hin, rim, seat]) { m.castShadow = false; m.receiveShadow = false; this.boat.add(m); }
    R.add(this.boat);
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
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = s.light === "night" ? 0.8 : s.light === "lamp" ? 0.95 : 1.0;
    // ---- sky, fog, sun / moon, stars, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position); this.stars.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const dark = s.light !== "dusk";
    this.stars.visible = dark;
    (this.stars.material as THREE.PointsMaterial).opacity = 0.9;
    // dusk: the setting sun low on the horizon (fixed in the west, -x); night: a small moon high in the east
    const disc = s.light === "dusk" ? V(-0.92, 0.06, -0.38).normalize() : V(0.55, 0.3, -0.72).normalize();
    this.sunDisc.visible = this.sunHalo.visible = s.light !== "lamp" || true;
    this.sunDisc.position.copy(cam.position).addScaledVector(disc, 900);
    this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(s.light === "dusk" ? 2.2 : 1.4)));
    (this.sunDisc.material as THREE.SpriteMaterial).color.copy(s.light === "dusk" ? new THREE.Color(5.5, 3.4, 1.9) : new THREE.Color(1.6, 1.65, 1.8));
    this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(s.light === "dusk" ? 22 : 9)));
    (this.sunHalo.material as THREE.SpriteMaterial).color.set(s.light === "dusk" ? L.sunDisc : "#5a6890").multiplyScalar(s.light === "dusk" ? 1.2 : 0.6);
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- sea ----
    const Wu = this.WU, wc = K.water;
    untone(wc.near, Wu.wNearC.value); untone(wc.mid, Wu.wMidC.value); untone(wc.far, Wu.wFarC.value);
    untone(wc.crest, Wu.wCrest.value); untone(wc.trough, Wu.wTrough.value); untone(wc.glint, Wu.wGlint.value);
    Wu.wShade.value.set(...wc.shade); Wu.wTime.value = t;
    // ---- lamp, beam, windows, door ----
    const on = lampOn(id, t);
    this.lampCore.visible = on > 0.02; this.lampGlow.visible = on > 0.02;
    (this.lampCore.material as THREE.MeshBasicMaterial).color.setRGB(8 * on, 6 * on, 3 * on);
    (this.lampGlow.material as THREE.SpriteMaterial).opacity = on;
    this.glass.color.set("#1d2440").lerp(new THREE.Color(1.25, 0.9, 0.45), on);
    this.beamPivot.visible = on > 0.05;
    this.beamPivot.rotation.y = beamAngle(t);
    this.beamMat.opacity = (s.light === "dusk" ? 0.3 : 0.55) * on;
    const winK = s.light === "dusk" ? 1.3 : 2.2;
    this.winMat.color.setRGB(winK, winK * 0.85, winK * 0.6);
    const roomK = s.light === "dusk" ? 1.0 : 1.6;
    this.roomMat.color.setRGB(roomK, roomK * 0.92, roomK * 0.8);
    // the door stands open from the doorway scene on (the keeper has opened it to her)
    this.doorLeaf.rotation.y = id >= 5 ? 1.6 : 0; // opens inward
    this.doorGlow.visible = id >= 5;
    this.doorPool.visible = id >= 5;
    for (const sm of this.smoke) {
      const u = (t * 0.09 + sm.k) % 1, sz = 1.2 + u * 4;
      sm.m.position.set(10.55 - u * 7, GROUND + 5.9 + u * 7 + u * u * 2, -0.55 + u * 2);
      sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.55 * (1 - u) ** 1.2;
    }
    // ---- boat ----
    const bt = boatAt(t);
    this.boat.position.set(...bt.p); this.boat.rotation.set(0, bt.yaw, bt.roll);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
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
void W; void LEAD;
