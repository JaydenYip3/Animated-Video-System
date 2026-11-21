# Handoff: building custom art-style templates for code-drawn explainers

## Goal
I'm Jayden. I want to create my own **art-style templates** in the same format as three examples I have (attach them with this brief: "Flat-Vector Science" (2D canvas), "Tech Glow Explainer" (2D canvas), "Low-Poly" (3D three.js)).

I will feed you example art styles (screenshots, video stills, descriptions). For each one, you write the whole template end to end, render it, check it and hand it back. I don't care about the story/topic in the templates, only about the art style and how it's made.

My preferences: concise explanations, no em dashes, no analogies (direct logic only).

## What a template is
A template is a prompt document I give to an AI together with a topic. The AI then builds an animated explainer in that style. Every template has the same sections:

| Section | Content | Changes per style? |
|---|---|---|
| 1. Opening line | "I want an animated explainer made in the "<Name>" visual style (<Family>)..." | Name and family only |
| 2. Instruction blocks | MY CONTENT, STORYBOARD FIRST, WHAT TO BUILD, HOW TO STAY IN THE STYLE, STRUCTURE / FLOW BETWEEN BEATS, SOUND, render-to-MP4 note | Copy word for word from the matching example (2D or 3D). Only change the Google Fonts line, plus canvas size and kit names if switching 2D/3D |
| 3. Style card | 2D: Name, Family, Look, Motion, How it explains. 3D: Name, Family, Use, Look, Motion, Light, Materials, Camera, Finish, Good for | Written fresh |
| 4. Kits | 2D: H helper library (lib/harness.js) + SOUND kit (lib/sound.js). 3D: STAGE kit (lib/stage.js) + SOUND kit | Copied unchanged |
| 5. Reference style source | The actual style code | Written fresh. This is the real work |

Key insight: every instruction in the wrapper says "reuse the reference's functions / do it the way the reference does". So making a template = writing a reference that demonstrates every rule in the wrapper. If the reference is missing something, the AI using the template has nothing to copy.

Note: none of these use Remotion. 2D = plain HTML canvas + Web Audio. 3D = three.js 0.187.0 core (no addons) + Web Audio.

## Formats: vertical and horizontal
Every template must support both formats. One reference source runs in either; there are not two copies.

| Format | 2D frame (logical units) | 2D render | 3D render |
|---|---|---|---|
| `vertical` (9:16, the default) | 720 x 1280 | 1080 x 1920 | 1080 x 1920 |
| `horizontal` (16:9) | 1280 x 720 | 1920 x 1080 | 1920 x 1080 |

- The format is a build setting (`"format"` in `config.json`, or `--format vertical|horizontal` on the build command). The build writes the frame size into the source.
- The source reads the frame size from `FW`, `FH` and `VERT = FH > FW`. No literal 1280 or 720 in layout code. The frame centre is `FW / 2, FH / 2`.
- Vertical stacks things top to bottom (title in short lines, labels above and below the subject, readout under the action). Horizontal sets them side by side.
- Where the two layouts need different numbers, write `VERT ? vertical : horizontal`.
- Backgrounds and sets must cover both frames: taller than 720 for vertical, wider than 720 for horizontal.
- Camera framing is set per format. A vertical frame is narrower, so the same group of subjects needs a smaller camera scale (2D) or a longer distance / different fov (3D).
- Sound panning uses the subject's on-screen x in the current format.
- The wrapper's canvas-size lines and the style card name both formats.
- Working example: `/root/code/videos/styles/sci-fi-sitcom-thinline` (its README section "Video format", its source, and `examples/teleporter`).

## Reference source requirements (each maps to a wrapper instruction)
- Runs in both formats (see "Formats" above): laid out from `FW`, `FH` and `VERT`, with every requirement below met in each format.
- Separate reusable, clearly named functions: background/surface, 2 to 5 core shape functions, arrow/connector that draws on with progress 0..1, label/pill, text treatment.
- One finish pass run at the end of every frame (2D: `finish()`; 3D: `render` settings + optional `S.addFilter`).
- Every frame is a pure function of t. No Math.random, Date, timers or state carried between frames. Use `H.rng(seed)` / `H.makeNoise(seed)` (2D) or `K.rng` / `K.hash` / `K.noise` (3D). Caching static textures is fine. In 3D, `update(t)` is called many times per frame (accumulation for motion blur/DOF), so it must set the whole scene from t alone.
- Text sizes in 2D logical units, both formats (1280x720 and 720x1280): headlines >= 44px, story labels >= 28px, key numbers >= 64px. In vertical, break long lines so they fit 720 wide instead of shrinking the text. 3D renders 1920x1080 or 1080x1920; keep words large and on screen long enough.
- Demonstrates: arrows drawing on, labels landing on what they label, an emphasis move on a key number, at least one continuous transformation between beats, at least one full scene change done in the medium's own way, a takeaway held ~1 s.
- One timeline object (examples use `TL`, `X`, `T`) read by both picture and sound.
- Sound score (`explainerSound(k)` in 2D, `sound(k)` in 3D) using the SOUND kit: custom helpers built on `k.tone` / `k.noise` in a medium-true palette, a quiet bed, the biggest hit on the key number, a resolving sound at the end, counters tick at most ~12/s.
- 2D: a still `draw()` hero frame plus `explainer(ctx, W, H_, t)`, registered with `registerStyle({ id, name, category, description, motion, fonts, duration, frameT, readsPixels, draw, explainerDuration, explainerNote, explainer, explainerSound })`.
- 3D: `registerStyle({ id, name, family, look, motion, light, materials, camera, post, explains, topic, duration, fonts, render: {...}, build(S) -> { update(t), overlay? }, sound(k) })`.
- The reference tells some short explainer topic (12 to 15 s, 2D; 7 to 12 s, 3D) so beats and transitions are shown, not just a still.

## How the example styles are built

### 2D layers (Flat-Vector vs Tech Glow)
1. Surface: Flat-Vector `sky()` = 3-stop gradient, huge radial nebula glows, cached parallax stars that twinkle via sin(t). Tech Glow `background()` = gradient, drifting radial glows, perspective floor grid (lines from a vanishing point, horizontals at y = horizon + 230/d), drifting particles.
2. Form: Flat-Vector `ball()` = gradient circle + two shadow "crescents" + one rim highlight. Crescent = clip to circle, fill rect + offset circle with 'evenodd'. Tech Glow `tile()` = dark rounded rect, two clipped radial inner glows in opposite corners, 1.5px gradient border, faint inner border, gradient line icon.
3. Light: radial gradient to transparent with `globalCompositeOperation = 'lighter'`. White center = hot (Tech Glow `glowDot`), colored center = soft (Flat-Vector `glow`).
4. Lines: dotted round arrows via `setLineDash([0.01, lw * 1.9])` + round caps (Flat-Vector). Neon = wide faint additive halo stroke + thin gradient stroke on top (Tech Glow `connector`), light pulses running along sampled curves (`pulseOn`). Draw-on via dash length or sampled-point substrokes.
5. Type: Flat-Vector = Nunito 900 with dark offset "long shadow". Tech Glow = Space Grotesk 700 with gradient fill, uppercase letter-spaced "eyebrow" labels with a glowing dot, word-by-word rise (`revealLine`).
6. Finish: Flat-Vector `finish()` = cached mottle texture (12%) + fine grain tile (9%) shifted every 1/24 s, both 'overlay' blend. Tech Glow `bloom()` = downsample to 320x180, contrast(2.6) filter, two blurs, add back with 'lighter', then `H.vignette`.
7. Motion: back-ease overshoot pop-ins (Flat-Vector bouncier, s = 1.5), idle bob/twinkle/sway, decaying flash `exp(-(t - t0) * k)`.
8. Scene changes: Flat-Vector = foreground planet sweeps across as a wipe, glow whiteout dive. Tech Glow = one continuous camera: push through with speed streaks, horizontal pan, pull back.
9. Sound palettes: Flat-Vector = marimba plucks, cute boops, airy whooshes, warm pad. Tech Glow = glassy blips, sine glides, digital ticks, minor pad resolving to major.

Fun fact: both 2D examples tell the same story ("How does AI learn?": hook, 1,000,000 examples, guess/check/adjust with "dog?" then "cat", accuracy 61% to 97%, "More examples -> better guesses"). Holding the story fixed isolates the style.

### 3D layers (Low-Poly, uses the STAGE kit)
STAGE kit gives: accumulation rendering (N sub-renders averaged: motion blur, AA, true DOF, soft area shadows), HDR bloom, tone mapping (filmic / neutral / agx / linear), grade (saturation, contrast, lift, exposure), vignette, grain, chromatic aberration, 2D overlay, `S.addFilter(glsl)` full-screen post filters, `K.env` code-built environment, `K.sun`, `K.spot`, `K.skyLight` (sky occlusion), `K.mirrorFloor`, `K.textPlane`, `K.roundedBox`, `K.roundedRect`, `K.tube`, `K.place` (instancing), `K.look` / `K.focus` (camera + aperture), `K.track` / `K.path` (keyframes, continuous camera), `K.spring`, easing.

Low-Poly layers:
1. Geometry treatment: `jitter()` (hash-offset shared vertices), `facet()` (non-indexed, one flat normal and one color per triangle, stores centroid `aCen`), `tone()` (per-facet small HSL nudge by hash), `merge()`, ground from `scatter()` (quadtree, denser near action) + `triangulate()` (Delaunay) + hand-written `height(x, z)`.
2. Material: one `faceted()` MeshStandardMaterial (vertexColors, flatShading, roughness 0.9) extended via `onBeforeCompile`: `wave` (vertex heave), `unfold` (each triangle rotates on a hinge edge from a birth time, facet-by-facet growth), `tint` (per-facet color GLSL), `glow` (self-emissive share). Shared `clock` uniform; custom depth material so shadows follow.
3. Light: `K.env` sky gradient + round sun panel, low warm `K.sun` with soft 2.2, cool `K.skyLight` fill, `THREE.Fog` in haze color, custom sky shader.
4. Camera: fov 30 long lens, `K.focus` aperture ~0.06 for tilt-shift miniature look, one continuous `K.path` crane move.
5. Finish: `render: { samples: 64, shutter: 0.4, tone: 'neutral', bloom: 0.35, bloomThreshold: 1.25, vignette: 0.22, grain: 0.014, fov: 30 }`. No filter pass.
6. Motion: `K.spring` pops, shader unfold, idle drift/heave, instanced props.
7. Family is "Filters over 3D": other 3D styles likely use `S.addFilter` (toon, posterize, halftone, painterly, dither).

## Workflow per style
1. Study my examples. Decide palette (5 to 10 hex), shape treatment, texture/finish, motion feel, scene-change method, sound palette. 2D or 3D, whichever fits.
2. Write the style card first (specific, describing what's in the code, not mood words).
3. Build the core functions and finish pass; check on a single still until it matches.
4. Write the 12 to 15 s reference explainer (any simple topic) using only those functions, including every item in the requirements list. Lay it out for both formats from the start.
5. Write the sound score from the same timeline.
6. Self-check in both formats: same t gives same frame (scrub random times), text sizes, nothing clipped or off frame, finish on every frame, no Math.random, no literal frame sizes.
7. Render frames and an MP4 in each format (headless Chrome: load page, `window.seek(i/30)` per frame, capture canvas, pipe to ffmpeg; audio via `SOUND.renderOffline(...)`, mux in). Look at frames from both and fix framing, lighting, legibility.
8. Assemble the template file: copied wrapper (matching 2D or 3D example), new style card, copied kits, new reference source.
9. Deliver: the template file, a playable HTML preview, and two MP4s (vertical and horizontal).
10. I test the template on a new topic with another AI; I report drift; you tighten the reference or card.

Constraints: match the style of my examples (palette, texture, motion), don't copy specific characters, logos or artwork from them. Expect 1 to 2 feedback rounds per style.
