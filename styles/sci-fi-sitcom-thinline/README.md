# Sci-Fi Sitcom Thin Line

A style template for code-drawn explainer videos. It is the version of the sci-fi sitcom style that follows the
reference frames (`style_creator/references/rick_and_morty_images/`) most closely. It was built in
`style_creator/styles/` and now lives on its own at `/root/code/videos/styles/sci-fi-sitcom-thinline`.

This folder is portable. It carries its own build and render tools (`tools/`, `lib/`), so you can copy it anywhere
and build, render and add videos with nothing else. It does not depend on `style_creator`, nor on its
`styles/sci-fi-sitcom/` and `styles/sci-fi-sitcom-uncanny/` folders. The reference images are not included; the rules read from them are in the table below.

Read this file first if you are picking the style up in a new session.

## Video format: vertical by default, horizontal on request

Every video is built in one of two formats, set by `"format"` in its `config.json`:

| `format` | Frame (logical units) | Rendered at `--scale 1.5` |
|---|---|---|
| `"vertical"` (the default, also used when the key is missing) | 720 x 1280, 9:16 | 1080 x 1920 |
| `"horizontal"` | 1280 x 720, 16:9 | 1920 x 1080 |

Make videos vertical unless the user asks for horizontal. The format is set per video; an example does not take the
style's. To build one video in the other format without editing its config, add `--format horizontal` (or
`--format vertical`) to the build command, then render as usual:

```
node tools/build.mjs examples/teleporter --format horizontal
node tools/render.mjs video examples/teleporter/preview.html examples/teleporter/teleporter-horizontal.mp4 --scale 1.5
node tools/build.mjs examples/teleporter          # back to the format in config.json
```

The build writes the frame size into the source's `const FW = .., FH = ..;` line, and the source derives
`VERT = FH > FW`. Scenes lay out from these three and never from literal 1280 or 720:

- The frame centre is `FW / 2, FH / 2`. `camApply` and `toS` already use it.
- A vertical frame stacks things top to bottom (title in three short lines, labels above and below the subject, a readout
  under the action). A horizontal frame sets them side by side.
- A camera scale of 1 shows `FW x FH` world units. Vertical is only 720 wide, so two people and a prop sit near scale 0.8
  (full figures) and one subject near 1.2 to 1.5. Horizontal fits the same two-shot at scale 1 (waist-up at 1.75).
- A vertical frame sees more wall above and more floor below, so a set must be drawn taller than 720.
- Where the two layouts need different numbers, write `VERT ? vertical : horizontal`. The reference explainer and
  `examples/teleporter` both run in either format and show the pattern. A new video only has to work in its own format;
  add the other layout when the user asks for it.

`"size": [w, h]` in a config sets an unusual frame directly and wins over `format`.

Claude Code sessions opened in `/root/code/videos` also get a project skill, `.claude/skills/sci-fi-sitcom-thinline/SKILL.md`,
which holds the working steps and points back here for the details. If the workflow or the hard rules change, update both.

## What is in this folder

| File | What it is |
|---|---|
| `template.txt` | The deliverable: the full prompt document (wrapper, style card, kits, reference source). Built, do not edit by hand. |
| `card.txt` | The style card (Name, Family, Look, Motion, How it explains). One line per field. Edit this when the look changes. |
| `sci-fi-sitcom-thinline.js` | The reference style source: every helper, the people, the kitchen set, and the reference explainer. |
| `config.json` | Id, name, fonts, the reference topic and the `format`, read by `tools/build.mjs`. |
| `preview.html` | Built player for the reference explainer (scrub, sound, hero still). |
| `explainer.mp4` | The reference explainer, "How does a microwave heat food?" (14 s, vertical 1080x1920). |
| `explainer-horizontal.mp4` | The same explainer built with `--format horizontal` (1920x1080). |
| `examples/teleporter/` | A second video in the style, "How would a teleporter work?" (10 s): a wide full-figure staging on another set. `teleporter.mp4` is vertical, `teleporter-horizontal.mp4` is horizontal. |
| `examples/vic-sheet/` | The character sheet for Vic, the recurring lead. Not a video. Its config sets `"format": "horizontal"`. |
| `characters/vic.png` | The rendered sheet: two full-body poses, three views, six expressions. |
| `tools/build.mjs`, `tools/render.mjs` | The build and render scripts (copies of `style_creator/tools/`). |
| `lib/` | The shared harness and sound kits plus `template1.txt`, the wrapper the template is built from. Do not edit. |

## Commands

Run from inside this folder. Set `TMPDIR` to a scratch folder first.

```
node tools/build.mjs .                       # template.txt + preview.html (add --format horizontal for the other format)
node tools/build.mjs examples/teleporter     # the example's preview.html
node tools/render.mjs stills <preview.html> <outDir> 1.0,4.3,12.5 [--scale 2] [--hero]
node tools/render.mjs check  <preview.html>                             # determinism + frame time
node tools/render.mjs video  <preview.html> <out.mp4> --scale 1.5       # 1080x1920 vertical, 1920x1080 horizontal
```

Stills are named with two decimals (`t4.30.png`). After any change: build, look at stills, run `check`, re-render the mp4.

What the machine needs:

- Node 22 or newer (no npm install).
- Chrome or Chromium for `render.mjs`. It is found on `PATH` or in the usual install places; otherwise set `CHROME=/path/to/chrome`.
- ffmpeg on `PATH` for `render.mjs video`.
- Internet when a preview opens, to load the Fredoka font from Google Fonts.

`tools/` and `lib/` started as copies of `style_creator/tools/` and `style_creator/lib/` (plus `template1.txt`). This
folder's `tools/build.mjs` is now ahead of that copy: it has the `format` setting and needs the `const FW, FH` line in the
source. Do not overwrite it from `style_creator`, and do not copy it back there without adding that line to the other styles.

## What the references show, and the rule that follows

| In the references | Rule in this style | Where |
|---|---|---|
| A thin, even, near-black line, the same weight in close-ups and wide shots | Ink is measured in screen pixels: 2 on characters and props, 1.5 on sets, 1.2 on details. Never tapered. | `iw()`, `ink()`, `LW` |
| Fully flat colour, no cel shadows, no gradients | `cel()` has no shadow. Depth is a separate darker plane (side face, underside, wall band). | `cel()`, `dark()` |
| People in every frame, large, usually waist-up | People carry the action and are framed large: heads about a third of the frame height in a horizontal waist-up two-shot, about a fifth of the frame width in a vertical full-figure two-shot. | `person()`, scenes |
| Big heads, huge white eyes that touch, tiny scribbly pupils | Eye radius is 19 on a head 100 wide; the two eyes overlap by a hair; pupils are 12% scribble blots. | `eye()`, `pupilPath()`, `headDraw()` |
| Heads are drawn by hand: flat runs joined by soft corners, sides that do not match, never a clean circle or ellipse. A child's head is a ball with a broad chin; adult heads are narrower and about 1.5 times as tall as wide, with the eyes high and a long lower face | Each face is a hand-placed control loop (`FACES[face].pts`) rounded by corner cutting and nudged per `P.seed`. Do not replace it with an ellipse or `arc()`. Hair and ears read the drawn outline through `radial()` and `rim()`. | `FACES`, `skull()` |
| Faces are slightly wrong on purpose: eyes that do not match, heads that sit crooked | `quirks(P)` fixes one set per person from `P.seed`: one eye larger and higher, lumpy eye rims, unequal pupils with one drifting outward, the smaller eye blinking one drawing late, a tilted head, the chin off centre, one fuller cheek, one lower ear, a slanted off-centre mouth. `ODD` sets the strength for everyone (0 clean, 1 default, 2 strong); `P.odd` overrides it for one person. | `ODD`, `quirks()`, `oddEye()` |
| Tube limbs, sloping shoulders, plain clothes with almost no folds, five digits | One or two short fold lines per garment; four fingers and a thumb. | `arm()`, `handParts()`, `torsoDetail()` |
| Adults and children share a head size; adults have a much bigger body | `P.tall` scales the body (1 child, 1.45 adult); `P.head` scales the head separately. | `person()` |
| Painted sets with thin lines that overshoot at corners | `panel()` inks four separate strokes past each corner. | `panel()` |
| Speckled grain inside shadow areas only | `speckle()` is clipped to shadow planes; the rest stays clean. | `speckle()`, `kitchen()` |
| Glow only from bulbs, screens, lit interiors | `glow()` is used for light sources and energy only. | `glow()` |
| Rounded bold sign lettering | Fredoka 700 with a thin outline and a short hard drop. | `letters()`, `sign()` |

Not taken from the references: the characters themselves. The cast here (`CAST.ravi`, `CAST.pip`, and the
teleporter's `gus` and `doc`) are original designs. Keep it that way: no spiky pale-blue hair with a lab coat,
no brown-haired boy in a yellow T-shirt, no logos, no portal. Change hair, colours and clothes freely.

## Recurring characters

Characters used in more than one video are defined once, in `CHARACTERS` in the style source (just above the
`// ================= EXPLAINER SCENES` marker). Every example has them in scope:

```js
person(x, feetX, feetY, scale, CHARACTERS.vic, { t, dir: 0.6, mouth: 'open', arms: [null, [1.5, 1.85]], hands: ['relax', 'point'] });
```

| Character | Who | Fixed features |
|---|---|---|
| `CHARACTERS.vic` | The lead of the series | Bald, very tall lined forehead (`face: 'high'`, `wrinkles`), flat-crowned dark hat (`hat: 'flat'`), round dark glasses, brown goatee (`beard: 'goatee'`), heavy lids and stern brows at rest (`lid`, `brows`), dark zip jacket, khaki trousers. Adult height (`tall: 1.42`). |

Rules for a recurring character:

- Do not redefine or restyle him inside a video. To change him, edit `CHARACTERS` and re-render `characters/vic.png`.
- Keep his `seed`. It fixes his uneven eyes, head tilt and jaw, so changing it changes his face.
- Poses and expressions come from the pose `o` only. His sheet shows the tested ones: stern, pleased, talking, shocked, worried, tense.
- Vic is an original design. Do not give him a name, catchphrase, prop or setting taken from an existing show.

To refresh the sheet after a change:

```
node tools/build.mjs examples/vic-sheet
node tools/render.mjs stills examples/vic-sheet/preview.html <outDir> 1.0 --scale 1.5    # then copy t1.00.png to characters/vic.png
```

To add another recurring character, add an entry to `CHARACTERS` and copy `examples/vic-sheet/` for its sheet.

## Making a new video in this style

Copy `examples/teleporter/` to `examples/<name>/` and edit:

1. `config.json`: set `id`, `name`, `file`, `topic`. Keep `"base": "../.."` and `"previewOnly": true`. Leave `"format": "vertical"`
   unless the user asked for a horizontal video.
2. `<name>.js`: your scenes. The build puts every helper from the style source in scope (everything above the
   `// ================= EXPLAINER SCENES` marker) and wraps your file in an inner block, so you can declare your
   own `TL`, `CAST`, `header` and so on without clashes. End with a `registerStyle({ ... explainer, explainerSound })`.
3. Build, check stills, run `check`, render.

Rules every scene must keep:

- Every frame is a pure function of `t`. Use `H.rng(seed)` and `NZ` (noise); never `Math.random`, `Date` or timers.
- Characters and props read time through `twos(t)`. Camera moves, wipes and type use `t` directly.
- Set ink widths with `ink(x, w)` or `iw(x, w)`. Do not write `x.lineWidth = n` for an outline.
- No cel shadows on anything. No shading at all on people.
- Lay out from `FW`, `FH` and `VERT`, not from 1280 and 720 (see "Video format").
- Draw people at `PS * k`, with `k` near 1.75 for a two-shot. Horizontal: camera scale 1, feet below the frame. Vertical:
  camera scale near 0.8, full figures standing on the floor. For a wide shot use `k` 1.
- Reach targets are in the person's own units: `[(wx - feetX) / scale, (wy - feetY) / scale]`.
- Keep labels in screen space and land them on world points through `toS(camera, point)`.

## Helper cheat sheet

Timing: `seg(t, a, b)`, `eo`, `eio`, `ei`, `back(u, s)` (overshoot), `twos(t)`.

Shapes (cached, faintly irregular): `RR(x, y, w, h, r, amp)`, `OV(cx, cy, rx, ry, amp)`, `PG(name, () => points, amp)`,
`shape(key, make, closed, amp)`. Animate with the canvas transform; never change a cached shape's size per frame.

Drawing:

- `cel(x, shape, fill, { lw, inner, tone })`: flat fill, clipped inner detail, thin outline.
- `union(x, [[shape, fill, opts], ...])`: several shapes inked as one silhouette.
- `panel(x, X, Y, w, h, fill)`: set rectangle with overshooting corner strokes.
- `inkLines(x, key, segments, lw, alpha)`: cached open lines (grout, seams, ticks).
- `line(x, points, w, { col, prog })`: one even line, optionally drawn on.
- `speckle(x, path, alpha)`: grain inside a shadow plane.
- `glow(x, cx, cy, r, colour, alpha)`: light sources only.
- `arrow(x, points, prog, { w, fill, wave })`: flat arrow, optional squiggle.
- `letters(x, text, cx, cy, px, { fill, colors, align })`, `lettersWidth(x, text, px)`.
- `sign(x, cx, cy, text, px, { u, bg, fg, tilt })`, `callout(x, t, t0, text, at, target, { bg, tilt, a })`.
- `bang(x, cx, cy, rx, ry, k, { n, rot, fill })`: impact burst.
- `iris(x, cx, cy, r, t, { fill, see, inside })`: the scene-change wipe.
- `finish(x, W, H, t)`: last call of every frame (light grain).
- Camera: `camApply(x, { x, y, s })`, `toS(camera, [wx, wy])`.

Eyes: `eye(x, cx, cy, r, { look, blink, wide, lid, lidTilt, skin, pr, seed, happy })`, `blinkAt(t, phase)`.

Props you can reuse: `mug`, `steam`, `water` (molecule creature), `thermo`, `microwave`, `kitchen`.

## People

`person(x, feetX, feetY, scale, P, o)` draws one figure; `personArm(...)` redraws one arm over a prop;
`headAt(P)` gives the head centre, hair top and radius in the person's own units.

A person `P`:

| Field | Values |
|---|---|
| `seed` | any number; fixes the figure's small irregularities |
| `tall` | body scale: 1 child, 1.2 to 1.45 adult |
| `head` | head scale, default 1 |
| `face` | head outline: `'round'` (child's ball), `'long'` (adult capsule), `'oval'` (narrow chin), `'narrow'` (tall, tapered, squared chin), `'high'` (adult capsule with a very tall forehead). Sizes and the outline points are in `FACES`; add a face by adding an entry with its own `pts` loop. |
| `skin`, `shirt`, `pants`, `shoes`, `sole`, `hairCol` | flat colours |
| `hair` | `'curls'`, `'puff'`, `'part'`, `'long'`, `'bald'` |
| `tee` | true: T-shirt. false: coveralls with long sleeves, collar and zip |
| `collar` | polo collar on a T-shirt |
| `glasses`, `goggles`, `bags`, `freckles` | optional face details |
| `wrinkles` | three forehead lines |
| `beard`, `beardCol` | `'goatee'`: moustache joined to a chin beard, bare skin around the lips |
| `hat`, `hatCol`, `hatBand`, `hatTilt` | `'flat'`: flat-crowned short-brimmed hat fitted to the head as drawn |
| `lid`, `brows` | the lids and brows this person wears at rest; a pose's `lid` or `brows` overrides them |
| `w`, `arm` | width and arm-length scale |
| `odd` | how far this person is pushed off symmetric: 0 clean, 1 default, 2 strong (default is the global `ODD`) |

A pose `o`:

| Field | Meaning |
|---|---|
| `t`, `ph` | time and a phase offset (sway, blink) |
| `dir` | head turn, -1 to 1 |
| `weight` | -1 or 1: the leg that takes the weight |
| `arms` | `[[upper, fore], [upper, fore]]` in radians from hanging, + is outward; null relaxes |
| `reach` | `[leftTarget, rightTarget]`: the hand goes to the point |
| `elbow` | `[-1 or 1, -1 or 1]`: -1 bends the elbow down (pressing, holding, carrying) |
| `hands` | `'relax'`, `'open'`, `'point'`, `'grip'` per hand |
| `look`, `lid`, `lidTilt`, `wide`, `shut`, `brows` | eyes and brows (`brows` + worried, - angry) |
| `mouth` | `'flat'`, `'smile'`, `'frown'`, `'wavy'`, `'grin'`, `'grimace'`, `'open'` |
| `sweat`, `legs`, `armFront` | sweat drop; hide legs; skip an arm so `personArm` can draw it later |

Acting is pose to pose on twos: switch `o` between a few held poses, with at most one in-between.

## How this differs from the other two sci-fi sitcom folders

| | `sci-fi-sitcom` / `-uncanny` | `sci-fi-sitcom-thinline` (this one) |
|---|---|---|
| Line | 3px, wobbly, warm brown-black, tapered folds | 2px on screen at any zoom, even, near-black |
| Shading | one hard cel shadow per prop | none; darker side planes |
| People | built per the earlier written spec (regular or skinny) | proportions and face taken from the reference frames |
| Reference video | no people; a mug with a face; swirl portal | two people in a two-shot; plain mug; iris wipe |
| Type | Luckiest Guy, heavy outline | Fredoka 700, thin outline |
| Code | shared source plus `people.js` per build | one self-contained source file |

## Open ideas

- More hair and clothing types (a long coat, a dress, a beard).
- Sets in three-quarter perspective, as in the living-room and diner references.
- Night or mood lighting: a colour wash over the set with glow pools from lamps.
