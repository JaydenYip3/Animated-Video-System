---
name: sci-fi-sitcom-thinline
description: How to make, edit and render code-drawn explainer videos in the "Sci-Fi Sitcom Thin Line" cartoon style (thin even ink, flat colour, big-eyed people) kept in /root/code/videos/styles/sci-fi-sitcom-thinline, including the recurring lead character Vic (bald, tall lined forehead, hat, goatee). Use this skill whenever the user asks for a new video, animation, scene, short or explainer in this style, mentions "thin line", "sci-fi sitcom", "the rick and morty style", "the cartoon style" or Vic / "the main character", wants a new character, set, prop, pose or expression for it, wants to change how the style looks, or wants its template, stills or mp4 rebuilt or rendered. Use it even when the user only says "make another animation about X" in this repo without naming the style.
---

# Sci-Fi Sitcom Thin Line

A 2D canvas cartoon style for short explainer videos. The whole style is one folder at the repo root:

```
/root/code/videos/styles/sci-fi-sitcom-thinline
```

The folder is self-contained (own build and render tools, no npm install). Its `README.md` is the full reference:
rules table, helper cheat sheet, the people `P` and pose `o` fields, and the recurring characters. This skill tells
you how to work in the folder; the README tells you what every helper does. Read the README before writing code,
because the helper names and options are not guessable.

## Format: vertical unless the user asks for horizontal

Each video's `config.json` has `"format"`: `"vertical"` (720x1280 logical, renders 1080x1920; the default) or
`"horizontal"` (1280x720 logical, renders 1920x1080). Make new videos vertical unless the user asks for horizontal.
If the user wants an existing video in the other format, build it with `--format horizontal` (or `--format vertical`)
and render to a second file such as `<name>-horizontal.mp4`. The reference explainer and `examples/teleporter` already
work in both. A scene written for one format does not fit the other by itself: it needs its own layout behind `VERT`
(README, "Video format"). Tell the user that in one line before starting, because it is more work than a switch.

## Pick the task

| The user wants | Do this |
|---|---|
| A new video or scene | Add an example folder (next section). Do not edit the style source for one video. |
| A change to the look (line, people, type, colour) | Edit `sci-fi-sitcom-thinline.js`, then `card.txt` and `README.md` to match, then rebuild and re-render everything (see "Changing the style"). |
| A change to Vic or a new recurring character | Edit `CHARACTERS` in `sci-fi-sitcom-thinline.js`, refresh the sheet (see "Recurring characters"). |
| The prompt document for another AI | Hand over `template.txt`. Rebuild it first if the source or card changed. |
| Only a render | Run the render commands on the existing `preview.html`. |

## Commands

Run from inside the style folder. Set `TMPDIR` to a scratch folder first, because the renderer writes a browser
profile there.

```
node tools/build.mjs .                                  # template.txt + preview.html for the style
node tools/build.mjs examples/<name>                    # preview.html for one example
node tools/build.mjs examples/<name> --format horizontal   # the same video in the other format, for one build
node tools/render.mjs stills <preview.html> <outDir> 1.0,4.3,9.0 --scale 1.5
node tools/render.mjs check  <preview.html>             # determinism + frame time
node tools/render.mjs video  <preview.html> <out.mp4> --scale 1.5      # 1080x1920 (or 1920x1080 horizontal) with sound
```

Stills are named with two decimals (`t4.30.png`). Needs Node 22+, Chrome or Chromium (set `CHROME=/path` if it is
not found), ffmpeg for video, and internet for the Fredoka font.

## Making a new video

1. Copy `examples/teleporter/` to `examples/<name>/` and rename `teleporter.js` to `<name>.js`.
2. In `config.json` set `id`, `name`, `file`, `topic` and `format`. Keep `"base": "../.."` and `"previewOnly": true`.
3. Write the scenes in `<name>.js`. Read `examples/teleporter/teleporter.js` first: it shows the full pattern
   (timeline `TL`, cast, set, scenes, labels, `registerStyle`, sound). The build puts every helper from the style
   source in scope and wraps your file in its own block, so your own `TL`, `CAST` or `header` do not clash.
4. Build, render stills at the key beats, and look at them. Fix what reads wrong before rendering video.
5. Run `check`. It must print `determinism: ok`.
6. Render the mp4 next to the example (`examples/<name>/<name>.mp4`).

The file ends with one registration. Minimal shape:

```js
registerStyle({
  id: '<config id>', name: '<config name>', category: 'TV Cartoon Looks',
  description: '...', motion: '...',
  fonts: ['700 64px "Fredoka"', '600 30px "Fredoka"'],
  duration: 5, frameT: 2, readsPixels: false,
  draw(ctx, W, H_, t) { scene(ctx, W, H_, t); finish(ctx, W, H_, t); },          // hero still
  explainerDuration: TL.D, explainerNote: 'one paragraph on how the video explains its topic',
  explainer(ctx, W, H_, t) { /* pick the scene for t, draw it */ finish(ctx, W, H_, t); },
  explainerSound(k) { /* schedule sounds on the same TL times */ },
});
```

The canvas is a logical `FW` x `FH`: 720x1280 vertical or 1280x720 horizontal. Lay out from `FW`, `FH` and `VERT`
(`FH > FW`), never from literal 1280 or 720. `finish()` is the last call of every frame.

## Rules that keep it in style

Each rule has a reason. If a case is not covered, decide from the reason.

- **Every frame is a pure function of `t`.** Use `H.rng(seed)` and `NZ` for variation, never `Math.random`, `Date`
  or timers. The renderer scrubs frames out of order, so any hidden state makes frames differ between passes and
  `check` fails.
- **Characters and props read time through `twos(t)`; camera, wipes and type use `t`.** The 12 drawings a second
  on people against a smooth camera is the look's motion signature.
- **Set outline widths with `ink(x, w)` or `iw(x, w)`, never `x.lineWidth = n`.** Ink is measured in screen pixels
  so a close-up and a wide shot carry the same thin line. A raw width gets scaled by the camera and breaks that.
- **No cel shadows and no gradients; nothing shaded on people.** Depth is a separate darker plane.
- **No clean geometric curves on people.** No `arc()` circles or ellipses for heads, hair or eyes. The user
  rejected mathematically round heads twice. Heads come from hand-placed control loops in `FACES`, and
  `quirks()` makes each face slightly uneven on purpose. To add a head shape, add a `FACES` entry with its own
  `pts` loop.
- **People carry the action and are framed large.** Two-shot: people scale near 1.75. Horizontal: camera scale 1,
  feet below the frame. Vertical: camera scale near 0.8, full figures on the floor, and the set drawn taller than
  720 because the frame sees more wall and floor. Wide shot: people scale 1. Act pose to pose: hold a pose, snap to the next, at most one in-between.
- **Characters are original designs.** Do not copy a character, logo, prop or setting from an existing show, even
  when the user describes a look by naming one. Build that type of person as a new design and say so.
- **Labels stay in screen space** and land on world points through `toS(camera, point)`.

Two things that commonly go wrong:

- `reach` targets are in the person's own units, `[(wx - feetX) / scale, (wy - feetY) / scale]`. A target closer
  to the shoulder than the arm's length folds the arm. Move the target out, or use `arms` angles for a plain point.
  Add `elbow: [-1, -1]` when a hand presses or holds something in front of the body.
- Helper names share one scope with your scene file. If the build reports a duplicate declaration, rename yours.

## Recurring characters

Characters used across videos are defined once in `CHARACTERS` in `sci-fi-sitcom-thinline.js`, above the
`// ================= EXPLAINER SCENES` marker, and are in scope in every example.

`CHARACTERS.vic` is the series lead: bald, very tall lined forehead, dark flat-crowned hat, round dark glasses,
brown goatee, heavy lids and stern brows at rest, dark zip jacket, khaki trousers. His sheet is
`characters/vic.png` (two full-body poses, three views, six expressions). Look at it before posing him.

```js
person(x, feetX, feetY, scale, CHARACTERS.vic, { t, dir: 0.6, mouth: 'open', arms: [null, [1.5, 1.85]], hands: ['relax', 'point'] });
```

- Use him unchanged in videos. A series lead has to look the same every time, so do not restyle him in a scene
  file and do not change his `seed` (the seed fixes his uneven eyes, head tilt and jaw).
- His expressions come from the pose only: `mouth`, `brows`, `lid`, `wide`, `look`, `sweat`. The sheet shows the
  tested combinations (stern, pleased, talking, shocked, worried, tense).
- To change him, edit `CHARACTERS`, then refresh the sheet:

```
node tools/build.mjs examples/vic-sheet
node tools/render.mjs stills examples/vic-sheet/preview.html <outDir> 1.0 --scale 1.5   # copy t1.00.png to characters/vic.png
```

- For another recurring character, add a `CHARACTERS` entry and copy `examples/vic-sheet/` for its sheet. A
  one-off character belongs in the video's own `CAST`.

## Changing the style

The source, the card and the README describe the same thing three times, and `template.txt` is built from the
first two. When the look changes:

1. Edit `sci-fi-sitcom-thinline.js`.
2. Update the matching sentence in `card.txt` (one line per field, describing what is in the code, no mood words)
   and the matching row in `README.md`.
3. Rebuild the style and every example, look at stills from each, run `check` on each.
4. Re-render every mp4 whose frames changed. Compare a still before and after if you are unsure.

`lib/` and the kits inside `template.txt` are fixed. Do not edit them.

## Finishing

Before reporting: stills looked at, `check` passes, the mp4 exists and its duration matches `TL.D`. Then tell the
user where the files are and what you decided on their behalf (staging, cast, any departure from what they asked).
The user prefers short, plain explanations without em dashes or analogies.
