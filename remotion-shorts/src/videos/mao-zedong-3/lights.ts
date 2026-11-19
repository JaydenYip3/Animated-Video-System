// Light presets of "mao-zedong-3" (bridge-template fields, re-tuned for a muted documentary palette: ochre haze,
// charcoal shade, desaturated sky). The sun is CAMERA-RELATIVE and frozen per shot (world.ts): az = degrees from the
// shot camera's forward axis (0 = backlight, +90 = screen right, 180 = behind camera), el = elevation.
// lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
type C3 = [number, number, number];
export type LightName = "day" | "map" | "golden" | "dusk" | "snow" | "night";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; charGain: number;
  blob: C3; actorShadow: boolean;
  fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
};
const DAY: LightPreset = {
  az: 75, el: 45,
  lit: [1.5, 1.42, 1.26], shade: [0.34, 0.32, 0.37], lift: [0.05, 0.05, 0.08], lambert: 0.35, sideK: 0.84, term: 0.2,
  charTint: [1.0, 0.95, 0.9], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.9, 0.94], charGain: 1.0,
  blob: [0.62, 0.58, 0.58], actorShadow: false,
  fog: "#d8cdb6", fogNear: 30, fogFar: 320, sunDisc: "#000000",
  sunCol: "#fff3e0", sunI: 2.8, sky: "#e6dccb", ground: "#9a8468", hemiI: 0.55,
  bias: -0.00025, normalBias: 0.015,
};
export const LIGHTS: Record<LightName, LightPreset> = {
  day: DAY,
  // the map top is a painted canvas: lit close to 1 so its colours land on screen as painted
  map: { ...DAY, az: 120, el: 50, fog: "#2b2826", fogNear: 400, fogFar: 3000, lit: [1.1, 1.06, 0.98], shade: [0.56, 0.54, 0.6], lift: [0.02, 0.02, 0.04] },
  golden: {
    ...DAY, az: 20, el: 9,
    lit: [1.5, 0.82, 0.42], shade: [0.2, 0.18, 0.28], lift: [0.05, 0.05, 0.12], term: 0.08,
    charTint: [1.0, 0.82, 0.62], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.86, 0.8, 0.92],
    actorShadow: true, fog: "#e6b88a", fogNear: 50, fogFar: 420, sunDisc: "#ffcf9e", sunCol: "#ffb36b", sunI: 5.0,
    bias: -0.0006, normalBias: 0.03,
  },
  dusk: {
    ...DAY, az: 40, el: 14,
    lit: [1.35, 0.95, 0.62], shade: [0.2, 0.2, 0.28], lift: [0.05, 0.05, 0.1], term: 0.12,
    charTint: [1.0, 0.86, 0.72], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.22, sideTint: [0.86, 0.82, 0.92], charGain: 0.95,
    actorShadow: true, fog: "#b99a82", fogNear: 25, fogFar: 260, sunDisc: "#ffbf8a", sunCol: "#ffb07a", sunI: 4.0,
    bias: -0.0006, normalBias: 0.03,
  },
  snow: {
    ...DAY, az: 60, el: 30,
    lit: [1.22, 1.24, 1.3], shade: [0.62, 0.66, 0.8], lift: [0.04, 0.05, 0.09], term: 0.3,
    charTint: [0.9, 0.93, 1.0], charShade: 0.92, charGrad: 0.05, bodyGrad: 0.15, sideTint: [0.9, 0.92, 1.0], charGain: 0.97,
    fog: "#d5d9dd", fogNear: 12, fogFar: 150,
  },
  night: {
    ...DAY, az: 70, el: 35,
    lit: [0.5, 0.6, 0.92], shade: [0.16, 0.18, 0.32], lift: [0.04, 0.05, 0.1], term: 0.25,
    charTint: [0.62, 0.7, 1.0], charShade: 0.85, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.8, 0.85, 1.0], charGain: 0.62,
    fog: "#27324a", fogNear: 10, fogFar: 120,
  },
};

/** world-only look per light: sky stops by elevation (degrees), cloud palette, bounce, world saturation */
export type WorldLook = { sky: { c: string[]; e: number[] }; bounce: C3; sat: number; cloud: { lit: string; mid: string; shade: string } };
export const LOOK: Record<LightName, WorldLook> = {
  day: { sky: { c: ["#ddd2bc", "#cfc9bb", "#aab4b9", "#8ea2b0", "#6f8aa0"], e: [0, 3, 9, 18, 45] }, bounce: [0, 0, 0], sat: 0.82,
    cloud: { lit: "#f4efe4", mid: "#dcd8cf", shade: "#bdbdc2" } },
  map: { sky: { c: ["#2b2826", "#2b2826", "#2b2826", "#2b2826", "#2b2826"], e: [0, 3, 9, 18, 45] }, bounce: [0, 0, 0], sat: 0.85,
    cloud: { lit: "#f4efe4", mid: "#dcd8cf", shade: "#bdbdc2" } },
  golden: { sky: { c: ["#f2be82", "#e8a979", "#cf917a", "#a87f84", "#6e6178"], e: [0, 4, 10, 20, 45] }, bounce: [0.04, 0.02, 0], sat: 0.9,
    cloud: { lit: "#ffd2a8", mid: "#e8a08f", shade: "#9c88ad" } },
  dusk: { sky: { c: ["#d9a27a", "#b98a78", "#8a7a80", "#626a7e", "#454f66"], e: [0, 4, 10, 20, 45] }, bounce: [0.03, 0.015, 0], sat: 0.8,
    cloud: { lit: "#e8b08e", mid: "#a8848a", shade: "#6c6a80" } },
  snow: { sky: { c: ["#d5d9dd", "#c9ced4", "#b4bcc6", "#9ea9b6", "#8592a3"], e: [0, 4, 10, 20, 45] }, bounce: [0, 0, 0], sat: 0.8,
    cloud: { lit: "#eef0f2", mid: "#d6dade", shade: "#b6bcc6" } },
  night: { sky: { c: ["#2a3650", "#223047", "#1a2740", "#131e34", "#0c1426"], e: [0, 4, 10, 20, 45] }, bounce: [0, 0, 0], sat: 0.8,
    cloud: { lit: "#46526e", mid: "#36415a", shade: "#283149" } },
};
