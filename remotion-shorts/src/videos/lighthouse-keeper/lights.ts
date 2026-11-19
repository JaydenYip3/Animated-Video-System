// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export type LightName = "day" | "golden" | "dusk" | "night" | "lamp";
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // dusk: sun just under the horizon behind the islet; low warm key, violet-blue shade (never brown), peach horizon
  dusk: {
    az: 20, el: 6,
    lit: [1.25, 0.72, 0.42], shade: [0.16, 0.16, 0.32], lift: [0.05, 0.06, 0.16], lambert: 0.35, sideK: 0.82, term: 0.08,
    charTint: [1.0, 0.82, 0.68], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.8, 0.95],
    blob: [0.72, 0.72, 0.9], actorShadow: true,
    top: "#3b3f78", hor: "#f2a37e", skyCurve: [0.05, 0.6, 1.0], fog: "#b88a9a", fogNear: 60, fogFar: 700, sunDisc: "#ffb68a",
    sunCol: "#ff9a6a", sunI: 4.0, sky: "#a88aa8", ground: "#4a4060", hemiI: 0.45,
    bias: -0.0006, normalBias: 0.03,
  },
  // night: moonlight key, cool blue-white; deep indigo shade; the lamp, windows and door are emissive (bloom)
  night: {
    az: 60, el: 28,
    lit: [0.62, 0.74, 1.08], shade: [0.1, 0.11, 0.24], lift: [0.03, 0.04, 0.12], lambert: 0.35, sideK: 0.84, term: 0.15,
    charTint: [0.8, 0.86, 1.0], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.85, 0.88, 1.0],
    blob: [0.6, 0.62, 0.8], actorShadow: false,
    top: "#0b1233", hor: "#33406e", skyCurve: [0.0, 0.5, 0.6], fog: "#2a3560", fogNear: 50, fogFar: 600, sunDisc: "#e8eeff",
    sunCol: "#c9d6ff", sunI: 1.6, sky: "#33406e", ground: "#14182a", hemiI: 0.3,
    bias: -0.0004, normalBias: 0.02,
  },
  // lamp: the same night, but the key is the warm lamplight pouring out of the open cottage door
  lamp: {
    az: 150, el: 12,
    lit: [0.95, 0.6, 0.32], shade: [0.08, 0.09, 0.22], lift: [0.03, 0.04, 0.12], lambert: 0.55, sideK: 0.84, term: 0.12,
    charTint: [1.0, 0.84, 0.66], charShade: 0.8, charGrad: 0.12, bodyGrad: 0.26, sideTint: [0.8, 0.82, 1.0],
    blob: [0.6, 0.6, 0.8], actorShadow: false,
    top: "#0b1233", hor: "#33406e", skyCurve: [0.0, 0.5, 0.6], fog: "#2a3560", fogNear: 50, fogFar: 600, sunDisc: "#000000",
    sunCol: "#ffb066", sunI: 3.0, sky: "#33406e", ground: "#14182a", hemiI: 0.3,
    bias: -0.0005, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  dusk: {
    sky: { c: ["#f5a47c", "#e8907e", "#b77a92", "#6e5d8e", "#2f3570"], e: [0, 4, 10, 22, 50] },
    water: { near: "#1c2a55", mid: "#2f3f70", far: "#c58b8f", crest: "#e0a18e", trough: "#121d40", glint: "#ffd0a8", shade: [0.42, 0.44, 0.7] },
    cloud: { lit: "#ffc29e", mid: "#d98f95", shade: "#7d6a9e" },
    bounce: [0.03, 0.015, 0.02],
    sat: 1.05,
  },
  night: {
    sky: { c: ["#3a4677", "#2c376a", "#1d275a", "#131c48", "#0a1033"], e: [0, 4, 10, 22, 50] },
    water: { near: "#0d1532", mid: "#16214a", far: "#2d3a68", crest: "#5d6fa8", trough: "#070c22", glint: "#c9d6ff", shade: [0.5, 0.55, 0.8] },
    cloud: { lit: "#6d7aa8", mid: "#4b5688", shade: "#2c3460" },
    bounce: [0, 0, 0],
    sat: 0.95,
  },
  lamp: {
    sky: { c: ["#3a4677", "#2c376a", "#1d275a", "#131c48", "#0a1033"], e: [0, 4, 10, 22, 50] },
    water: { near: "#0d1532", mid: "#16214a", far: "#2d3a68", crest: "#5d6fa8", trough: "#070c22", glint: "#ffd7a0", shade: [0.5, 0.55, 0.8] },
    cloud: { lit: "#6d7aa8", mid: "#4b5688", shade: "#2c3460" },
    bounce: [0.03, 0.015, 0.0],
    sat: 1.0,
  },
};
