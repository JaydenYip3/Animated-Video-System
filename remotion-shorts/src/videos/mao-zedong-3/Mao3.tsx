// "mao-zedong-3" (bridge-template look, built on the unfinished mao-zedong-2 world): a 55 s narrated cartoon biography.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (bridge look):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade], MSAA 4.
// Every pixel-sized parameter is specified at 1080x1920 and scaled with the output size.
// Place changes crossfade by stacking a second canvas for the fade frames. A small 2D overlay (Years.tsx) stamps the
// years on a timeline (numbers only, no words).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, gradeFor } from "./grade";
import { TOTAL, FLASHES, FADE_OUT, SHOTS, layersAt, dofAt } from "./story";
import { Years } from "./Years";

export const MAO3_FRAMES = TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; years: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, years: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

/** one World per canvas; the delayRender handle waits for the first frame's textures */
const useReady = () => {
  const [ok, setOk] = useState(false);
  const [handle] = useState(() => delayRender("mao-zedong-3 world"));
  useEffect(() => { const id = requestAnimationFrame(() => { setOk(true); continueRender(handle); }); return () => cancelAnimationFrame(id); }, [handle]);
  return ok;
};

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
  useEffect(() => () => { (fx.ink as unknown as { dispose?: () => void }).dispose?.(); }, [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const MaoZedong3Short: React.FC = () => {
  const f = useCurrentFrame();
  const ready = useReady();
  const on = useMemo(toggles, []);
  if (!ready) return null;
  const fa = FLASHES.find((a) => f >= a && f < a + 4);
  const flash = fa !== undefined ? [0.9, 0.65, 0.4, 0.18][f - fa] : 0;
  return (
    <AbsoluteFill style={{ background: "#14120f" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff8ea", opacity: flash }} />}
      {on.years && <Years />}
      {f > TOTAL - FADE_OUT && <AbsoluteFill style={{ background: "#000000", opacity: Math.min(1, (f - (TOTAL - FADE_OUT)) / (FADE_OUT - 6)) }} />}
    </AbsoluteFill>
  );
};
